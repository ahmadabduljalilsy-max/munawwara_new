import jsPDF from 'jspdf';
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

  const canvas = await html2canvas(element, {
    scale: 2,
    useCORS: true,
    logging: false,
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight
  });

  element.style.display = originalStyle;
  element.style.position = '';

  const imgData = canvas.toDataURL('image/png');
  const pdf = new jsPDF('p', 'mm', 'a4');
  const imgProps = pdf.getImageProperties(imgData);
  const pdfWidth = pdf.internal.pageSize.getWidth();
  const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

  pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
  pdf.save(filename);
};
