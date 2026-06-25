import { jsPDF } from 'jspdf';
import html2canvas from 'html2canvas';

export const generatePdf = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) return;

  // Make sure it's visible during capture but not to user
  const originalStyle = element.style.display;
  element.style.display = 'block';
  element.style.position = 'fixed';
  element.style.left = '-9999px';
  element.style.top = '0';

  // Backup original getComputedStyle
  const originalGetComputedStyle = window.getComputedStyle;

  // Helper to sanitize unsupported colors (like oklab, oklch, color-mix) for html2canvas
  const sanitizeModernColor = (val: any, propertyName: string): any => {
    if (typeof val === 'string' && (val.includes('oklab') || val.includes('oklch') || val.includes('color-mix'))) {
      const propLower = propertyName.toLowerCase();
      if (propLower.includes('background')) {
        return 'rgba(0, 0, 0, 0)';
      }
      if (propLower.includes('border')) {
        return 'rgb(229, 231, 235)';
      }
      return 'rgb(30, 77, 43)'; // primary green fallback
    }
    return val;
  };

  // Mock getComputedStyle to sanitize modern CSS features that html2canvas fails on
  window.getComputedStyle = function(elt, pseudoElt) {
    const style = originalGetComputedStyle(elt, pseudoElt);
    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'getPropertyValue') {
          return function(propertyName: string) {
            const val = target.getPropertyValue(propertyName);
            return sanitizeModernColor(val, propertyName);
          };
        }
        const val = Reflect.get(target, prop, target);
        if (typeof prop === 'string' && typeof val === 'string') {
          return sanitizeModernColor(val, prop);
        }
        return typeof val === 'function' ? val.bind(target) : val;
      }
    });
  };

  try {
    const canvas = await html2canvas(element, {
      scale: 1.5,
      useCORS: true,
      logging: false,
      windowWidth: element.scrollWidth,
      windowHeight: element.scrollHeight
    });

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgHeight = (canvas.height * pdfWidth) / canvas.width;
    
    // Reserve the bottom 20mm of each page for our beautiful footer
    const footerHeight = 20; 
    const usableHeight = pageHeight - footerHeight; // 277mm
    const totalPages = Math.max(1, Math.ceil(imgHeight / usableHeight));

    // Helper to generate dynamic Arabic footer as high-res canvas image
    const createFooterCanvas = (pageNum: number, totalPagesCount: number): string => {
      const footerCanvas = document.createElement('canvas');
      footerCanvas.width = 1200;
      footerCanvas.height = 114;
      const ctx = footerCanvas.getContext('2d');
      if (ctx) {
        // Clear and set white background
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, footerCanvas.width, footerCanvas.height);
        
        // Draw top thin divider line
        ctx.strokeStyle = '#cbd5e1'; // slate-300
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(30, 15);
        ctx.lineTo(1170, 15);
        ctx.stroke();

        // Right text: Company Name
        ctx.font = 'bold 22px Arial, sans-serif';
        ctx.fillStyle = '#475569'; // slate-600
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        ctx.fillText('درة المنورة لنقل الحجاج والمعتمرين - فريق التشغيل', 1170, 65);

        // Left text: Page X of Y
        ctx.textAlign = 'left';
        ctx.fillText(`صفحة ${pageNum} من ${totalPagesCount}`, 30, 65);
      }
      return footerCanvas.toDataURL('image/png');
    };

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage();
      }
      
      // Draw the main content slice offset upwards by i * usableHeight
      const yOffset = -(i * usableHeight);
      pdf.addImage(imgData, 'PNG', 0, yOffset, pdfWidth, imgHeight, undefined, 'FAST');
      
      // Mask the footer area at the bottom with a solid white rectangle to cover any clipped content
      pdf.setFillColor(255, 255, 255);
      pdf.rect(0, usableHeight, pdfWidth, footerHeight, 'F');
      
      // Generate and draw the footer image
      const footerImg = createFooterCanvas(i + 1, totalPages);
      pdf.addImage(footerImg, 'PNG', 0, usableHeight, pdfWidth, footerHeight, undefined, 'FAST');
    }

    pdf.save(filename);
  } catch (error) {
    console.error("PDF generation failed:", error);
  } finally {
    // Restore original getComputedStyle
    window.getComputedStyle = originalGetComputedStyle;
    element.style.display = originalStyle;
    element.style.position = '';
  }
};
