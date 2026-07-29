import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';
import { getDefaultLogo } from './LogoContext';

const sanitizeColor = (val: string | null | undefined): string => {
  if (!val || typeof val !== 'string') return '';
  if (
    val.includes('oklch') ||
    val.includes('oklab') ||
    val.includes('color-mix') ||
    val.includes('light-dark')
  ) {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillStyle = val;
        const parsed = ctx.fillStyle;
        if (
          parsed &&
          !parsed.includes('oklch') &&
          !parsed.includes('color-mix') &&
          !parsed.includes('oklab')
        ) {
          return parsed;
        }
      }
    } catch {
      // fallback
    }
    return '#111827';
  }
  return val;
};

export const generatePdf = async (elementId: string, filename: string) => {
  const origElement = document.getElementById(elementId);
  if (!origElement) {
    console.error(`PDF element with ID "${elementId}" not found.`);
    return;
  }

  const defaultLogo = getDefaultLogo();

  // Ensure all img elements inside the target container have valid image data
  const imgElements = Array.from(origElement.querySelectorAll('img'));
  await Promise.all(
    imgElements.map((img) => {
      if (!img.src || img.src.includes('/artifact/') || img.src.startsWith('blob:')) {
        if (defaultLogo) img.src = defaultLogo;
      }
      if (img.complete && img.naturalWidth > 0) return Promise.resolve(null);
      return new Promise((resolve) => {
        img.onload = () => resolve(null);
        img.onerror = () => {
          if (defaultLogo) img.src = defaultLogo;
          resolve(null);
        };
        setTimeout(() => resolve(null), 1000);
      });
    })
  );

  try {
    const canvas = await html2canvas(origElement, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#ffffff',
      scrollX: 0,
      scrollY: 0,
      windowWidth: 900,
      onclone: (clonedDoc) => {
        const clonedEl = clonedDoc.getElementById(elementId);
        if (clonedEl) {
          // Isolate clonedEl in clonedDoc.body to guarantee proper layout & coordinates
          clonedDoc.body.innerHTML = '';
          clonedDoc.body.appendChild(clonedEl);

          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '0';
          clonedDoc.body.style.backgroundColor = '#ffffff';
          clonedDoc.body.style.width = '900px';

          clonedEl.style.position = 'relative';
          clonedEl.style.display = 'block';
          clonedEl.style.visibility = 'visible';
          clonedEl.style.opacity = '1';
          clonedEl.style.left = '0';
          clonedEl.style.top = '0';
          clonedEl.style.margin = '0';
          clonedEl.style.transform = 'none';
          clonedEl.style.width = '900px';

          // Clean up style tags in clonedDoc head/body for oklch/color-mix
          const styleEls = Array.from(clonedDoc.querySelectorAll('style'));
          styleEls.forEach((styleTag) => {
            if (styleTag.textContent) {
              styleTag.textContent = styleTag.textContent.replace(
                /(oklch|oklab|color-mix|light-dark)\([^;{}]+?\)/gi,
                (match) => sanitizeColor(match)
              );
            }
          });

          // Match original DOM nodes to cloned nodes and sanitize computed styles
          const origNodes = [origElement, ...Array.from(origElement.querySelectorAll('*'))];
          const clonedNodes = [clonedEl, ...Array.from(clonedEl.querySelectorAll('*'))];

          for (let i = 0; i < origNodes.length && i < clonedNodes.length; i++) {
            const origNode = origNodes[i] as HTMLElement;
            const clonedNode = clonedNodes[i] as HTMLElement;

            if (origNode && clonedNode && origNode.nodeType === 1) {
              try {
                const computed = window.getComputedStyle(origNode);

                const colorProps = ['color', 'backgroundColor', 'borderColor', 'fill', 'stroke'];
                colorProps.forEach((prop) => {
                  const val = computed.getPropertyValue(prop) || (computed as any)[prop];
                  if (val) {
                    const sanitized = sanitizeColor(val);
                    const camelProp = prop.replace(/-([a-z])/g, (_, letter) => letter.toUpperCase());
                    (clonedNode.style as any)[camelProp] = sanitized;
                  }
                });

                const boxShadow = computed.boxShadow;
                if (
                  boxShadow &&
                  (boxShadow.includes('oklch') ||
                    boxShadow.includes('oklab') ||
                    boxShadow.includes('color-mix'))
                ) {
                  clonedNode.style.boxShadow = 'none';
                }
              } catch {
                // ignore computed style read errors
              }
            }
          }
        }
      }
    });

    const imgData = canvas.toDataURL('image/png');
    if (!imgData || imgData.length < 100 || imgData === 'data:,' || !imgData.startsWith('data:image/png')) {
      console.error('Invalid or empty canvas image generated.');
      return;
    }

    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;

    const footerHeight = 20; // 20mm footer space
    const usableHeight = pageHeight - footerHeight; // 277mm usable height
    const totalPages = Math.max(1, Math.ceil(imgHeight / usableHeight));

    const createFooterCanvas = (pageNum: number, totalPagesCount: number): string => {
      const footerCanvas = document.createElement('canvas');
      footerCanvas.width = 1200;
      footerCanvas.height = 114;
      const ctx = footerCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, footerCanvas.width, footerCanvas.height);

        ctx.strokeStyle = '#cbd5e1';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 15);
        ctx.lineTo(1170, 15);
        ctx.stroke();

        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillStyle = '#475569';
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('درة المنورة لنقل الحجاج والمعتمرين - فريق التشغيل', 1170, 65);

        ctx.textAlign = 'left';
        ctx.fillText(`صفحة ${pageNum} من ${totalPagesCount}`, 30, 65);
      }
      return footerCanvas.toDataURL('image/png');
    };

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const yOffset = -(i * usableHeight);
      pdf.addImage(imgData, 'PNG', 0, yOffset, pdfWidth, imgHeight, undefined, 'FAST');

      // Mask footer area
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, usableHeight, pdfWidth, footerHeight, 'F');

      // Draw footer
      const footerImg = createFooterCanvas(i + 1, totalPages);
      pdf.addImage(footerImg, 'PNG', 0, usableHeight, pdfWidth, footerHeight, undefined, 'FAST');
    }

    pdf.save(filename);
  } catch (error) {
    console.error('PDF generation failed:', error);
  }
};
