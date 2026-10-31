import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Printer, 
  Download, 
  IdCard, 
  Search, 
  Check, 
  CheckCircle2, 
  Users, 
  Bus, 
  Globe, 
  ShieldCheck, 
  Briefcase, 
  QrCode, 
  Layers, 
  Sparkles,
  ChevronRight,
  ChevronLeft,
  FileText,
  RotateCcw,
  Sliders,
  Palette
} from 'lucide-react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import type { CompanyDriver, Worker } from '../types';
import { resolveDriverType, getDriverClassification } from '../lib/driverUtils';
import { useLogo, DEFAULT_LOGO } from '../lib/LogoContext';
import { DmtcLogo } from './DmtcLogo';

interface DriverCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: CompanyDriver[];
  workers?: Worker[];
  initialSelectedDriver?: CompanyDriver | null;
}

export const DriverCardPrintModal: React.FC<DriverCardPrintModalProps> = ({
  isOpen,
  onClose,
  drivers = [],
  workers = [],
  initialSelectedDriver = null
}) => {
  // Mode: 'single' (1 card) or 'sheet' (up to 6 cards together on A4)
  const [mode, setMode] = useState<'single' | 'sheet'>('single');
  
  // Selection
  const [selectedSerialInput, setSelectedSerialInput] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [sheetSelectedIds, setSheetSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  
  // Color scheme: 'color' (official DMTC colors) vs 'mono' (high-contrast black & white for scanners)
  const [printColorScheme, setPrintColorScheme] = useState<'color' | 'mono'>('color');

  // Generated QR codes map (driverId -> base64 dataUrl)
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});

  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const [isExportingPng, setIsExportingPng] = useState(false);

  const { logoURL } = useLogo();
  const activeLogo = logoURL || DEFAULT_LOGO;

  const printAreaRef = useRef<HTMLDivElement>(null);

  // Sort drivers by serial number ascending
  const sortedDrivers = React.useMemo(() => {
    return [...drivers].sort((a, b) => {
      const sA = Number(a.serialNumber) || 0;
      const sB = Number(b.serialNumber) || 0;
      return sA - sB;
    });
  }, [drivers]);

  // Set initial driver when opening
  useEffect(() => {
    if (isOpen) {
      if (initialSelectedDriver) {
        setSelectedDriverId(initialSelectedDriver.id);
        setSelectedSerialInput(String(initialSelectedDriver.serialNumber || ''));
        setSheetSelectedIds([initialSelectedDriver.id]);
      } else if (sortedDrivers.length > 0) {
        const first = sortedDrivers[0];
        setSelectedDriverId(first.id);
        setSelectedSerialInput(String(first.serialNumber || ''));
        setSheetSelectedIds(sortedDrivers.slice(0, 6).map(d => d.id));
      }
    }
  }, [isOpen, initialSelectedDriver, sortedDrivers]);

  // Handle serial input change & auto select
  const handleSerialSearch = (serialStr: string) => {
    setSelectedSerialInput(serialStr);
    const num = Number(serialStr.trim());
    if (!isNaN(num) && num > 0) {
      const match = sortedDrivers.find(d => Number(d.serialNumber) === num);
      if (match) {
        setSelectedDriverId(match.id);
      }
    }
  };

  // Generate high-resolution QR Codes for drivers
  useEffect(() => {
    if (!isOpen) return;

    const driversToEncode = mode === 'single'
      ? sortedDrivers.filter(d => d.id === selectedDriverId)
      : sortedDrivers.filter(d => sheetSelectedIds.includes(d.id));

    driversToEncode.forEach(async (driver) => {
      const effType = resolveDriverType(driver);
      const classif = getDriverClassification(driver, workers);
      const isResident = effType === 'مقيم';
      const idLabel = isResident ? 'رقم الإقامة' : 'رقم الحدود';
      const rawId = (isResident ? driver.iqamaNumber : driver.borderNumber) || driver.iqamaNumber || driver.borderNumber || '';
      const idVal = rawId || '—';

      // Generate QR Code with pure pitch-black (#000000) for 100% scan rate on all devices & printers
      if (!qrCodeUrls[driver.id]) {
        const payload = [
          `شركة درة المنورة للنقليات - DMTC`,
          `سائق معتمد: ${driver.fullName}`,
          `${idLabel}: ${idVal}`,
          `مسلسل: #${String(driver.serialNumber || '1').padStart(3, '0')} | ${effType} - ${classif}`,
          `الجوال: ${driver.mobileNumber || 'غير مسجل'}`,
          driver.busNumber ? `الحافلة: #${driver.busNumber}` : null,
          `موسم 1448 هـ - 2027م (معتمد رسمياً)`
        ].filter(Boolean).join('\n');

        try {
          const url = await QRCode.toDataURL(payload, {
            width: 320,
            margin: 2,
            color: {
              dark: '#000000', // Pure pitch black for laser/thermal B&W printouts & mobile scanners
              light: '#FFFFFF'
            },
            errorCorrectionLevel: 'M'
          });
          setQrCodeUrls(prev => ({ ...prev, [driver.id]: url }));
        } catch (err) {
          console.error('Failed to generate QR for driver', driver.id, err);
        }
      }
    });
  }, [isOpen, mode, selectedDriverId, sheetSelectedIds, sortedDrivers, workers, qrCodeUrls]);

  // Filtered drivers for search list
  const filteredList = React.useMemo(() => {
    return sortedDrivers.filter(d => {
      const effType = resolveDriverType(d);
      if (filterType !== 'all' && effType !== filterType) return false;
      const classif = getDriverClassification(d, workers);
      if (filterClassification !== 'all' && classif !== filterClassification) return false;
      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase().trim();
      return (
        d.fullName.toLowerCase().includes(term) ||
        classif.toLowerCase().includes(term) ||
        String(d.serialNumber || '').includes(term) ||
        (d.iqamaNumber && d.iqamaNumber.includes(term)) ||
        (d.borderNumber && d.borderNumber.includes(term)) ||
        (d.busNumber && d.busNumber.includes(term)) ||
        (d.nationality && d.nationality.toLowerCase().includes(term))
      );
    });
  }, [sortedDrivers, searchTerm, filterType, filterClassification, workers]);

  // Toggle selection for 6-card sheet
  const toggleSheetDriver = (id: string) => {
    setSheetSelectedIds(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      } else {
        if (prev.length >= 6) {
          alert('يمكنك تحديد 6 بطاقات كحد أقصى للطباعة المجتمعة في ورقة A4 واحدة.');
          return prev;
        }
        return [...prev, id];
      }
    });
  };

  // Quick batch selector (e.g., drivers 1-6, 7-12...)
  const selectBatch = (startIndex: number) => {
    const batch = sortedDrivers.slice(startIndex, startIndex + 6).map(d => d.id);
    setSheetSelectedIds(batch);
  };

  // Direct Browser Print
  const handlePrint = () => {
    window.print();
  };

  // Helper to safely capture the printable cards canvas without Tailwind oklch errors
  const captureCardsCanvas = async (scale = 2): Promise<HTMLCanvasElement | null> => {
    if (!printAreaRef.current) return null;
    const element = printAreaRef.current;

    const sanitizeColorValue = (val: string | null | undefined): string => {
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
        return '#0f172a';
      }
      return val;
    };

    if (document.fonts) {
      try {
        await document.fonts.ready;
      } catch {
        // ignore
      }
    }

    return await html2canvas(element, {
      scale,
      useCORS: true,
      allowTaint: true,
      logging: false,
      backgroundColor: '#FFFFFF',
      windowWidth: 1200,
      onclone: (clonedDoc) => {
        // 1. Isolate the printable cards element in clonedDoc.body
        const clonedEl = clonedDoc.getElementById('printable-driver-cards');
        if (clonedEl) {
          clonedDoc.body.innerHTML = '';
          clonedDoc.body.appendChild(clonedEl);
          clonedDoc.body.style.margin = '0';
          clonedDoc.body.style.padding = '12px';
          clonedDoc.body.style.backgroundColor = '#FFFFFF';
          clonedDoc.body.style.direction = 'ltr';

          clonedEl.style.position = 'relative';
          clonedEl.style.direction = 'ltr';
          clonedEl.style.backgroundColor = '#FFFFFF';
          clonedEl.style.border = 'none';
          clonedEl.style.boxShadow = 'none';
          clonedEl.style.margin = '0 auto';

          if (mode === 'sheet') {
            clonedEl.style.display = 'grid';
            clonedEl.style.gridTemplateColumns = '340px 340px';
            clonedEl.style.justifyContent = 'center';
            clonedEl.style.gap = '14px';
            clonedEl.style.width = '710px';
            clonedEl.style.maxWidth = '710px';
            clonedEl.style.padding = '8px';
          } else {
            clonedEl.style.display = 'flex';
            clonedEl.style.justifyContent = 'center';
            clonedEl.style.alignItems = 'center';
            clonedEl.style.width = '360px';
            clonedEl.style.maxWidth = '360px';
            clonedEl.style.padding = '8px';
          }
        }

        // 2. Inject clean Arabic font & printing styles
        const fontStyle = clonedDoc.createElement('style');
        fontStyle.textContent = `
          @import url('https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800;900&display=swap');
          * {
            box-sizing: border-box !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          body, .driver-id-badge, .driver-id-badge * {
            font-family: 'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif !important;
            font-feature-settings: normal !important;
            letter-spacing: normal !important;
          }
          .driver-id-badge {
            width: 340px !important;
            min-width: 340px !important;
            max-width: 340px !important;
            height: 220px !important;
            min-height: 220px !important;
            max-height: 220px !important;
            box-shadow: none !important;
          }
          .badge-authorized-driver {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 20px !important;
            min-height: 20px !important;
            max-height: 20px !important;
            line-height: 1 !important;
            text-align: center !important;
            padding: 0 10px !important;
            box-sizing: border-box !important;
            overflow: hidden !important;
          }
          .badge-authorized-driver span {
            display: inline-block !important;
            line-height: 1 !important;
            position: relative !important;
            top: -1px !important;
          }
        `;
        clonedDoc.head.appendChild(fontStyle);

        // 3. Remove or sanitize all <style> tags containing oklch definitions from Tailwind v4
        const styleEls = Array.from(clonedDoc.querySelectorAll('style'));
        styleEls.forEach((styleTag) => {
          if (styleTag !== fontStyle && styleTag.textContent && (
            styleTag.textContent.includes('oklch') ||
            styleTag.textContent.includes('oklab') ||
            styleTag.textContent.includes('color-mix') ||
            styleTag.textContent.includes('light-dark')
          )) {
            try {
              styleTag.textContent = styleTag.textContent.replace(
                /(oklch|oklab|color-mix|light-dark)\([^;{}]+?\)/gi,
                (match) => sanitizeColorValue(match)
              );
            } catch {
              styleTag.remove();
            }
          }
        });

        // 4. Remove all external stylesheet link tags in clonedDoc that could contain oklch
        const linkEls = Array.from(clonedDoc.querySelectorAll('link[rel="stylesheet"]'));
        linkEls.forEach(link => {
          try { link.remove(); } catch {}
        });

        // 5. Remove any oklch box-shadows on cloned nodes
        const allCloned = Array.from(clonedDoc.querySelectorAll('*'));
        allCloned.forEach((node) => {
          const htmlEl = node as HTMLElement;
          if (htmlEl.style && htmlEl.style.boxShadow && (
            htmlEl.style.boxShadow.includes('oklch') ||
            htmlEl.style.boxShadow.includes('color-mix') ||
            htmlEl.style.boxShadow.includes('oklab')
          )) {
            htmlEl.style.boxShadow = 'none';
          }
        });
      }
    });
  };

  // Save as High-Res PDF using html2canvas & jspdf with bulletproof oklch sanitization
  const handleExportPdf = async () => {
    try {
      setIsExportingPdf(true);
      const canvas = await captureCardsCanvas(2.2);
      if (!canvas) throw new Error('فشل توليد لوحة البطاقة');

      const imgData = canvas.toDataURL('image/png');
      if (!imgData || imgData.length < 100 || imgData === 'data:,') {
        throw new Error('فشل توليد صورة البطاقة');
      }

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4'
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      if (mode === 'single') {
        // High-Quality ID Badge Presentation on A4 (Exact 85mm x 55mm = 8.5cm x 5.5cm)
        const cardWidthMm = 85;
        const cardHeightMm = 55;
        const xPos = (pdfWidth - cardWidthMm) / 2;
        const yPos = (pdfHeight - cardHeightMm) / 2 - 12;

        // Subtle cutting guide border
        pdf.setDrawColor(203, 213, 225);
        pdf.setLineWidth(0.35);
        pdf.setLineDashPattern([2, 2], 0);
        pdf.rect(xPos - 1.5, yPos - 1.5, cardWidthMm + 3, cardHeightMm + 3);
        pdf.setLineDashPattern([], 0);

        pdf.addImage(imgData, 'PNG', xPos, yPos, cardWidthMm, cardHeightMm);

        // Header caption
        pdf.setFontSize(11);
        pdf.setTextColor(15, 23, 42);
        pdf.text('شركة درة المنورة للنقليات - بطاقة هوية سائق معتمد (8.5 سم × 5.5 سم)', pdfWidth / 2, yPos - 8, { align: 'center' });

        // Footer note
        pdf.setFontSize(8);
        pdf.setTextColor(100, 116, 139);
        pdf.text('مقاس البطاقة المعتمد: 8.5 سم × 5.5 سم • مناسبة لحافظات الهوية القياسية وأجهزة المسح الميداني', pdfWidth / 2, yPos + cardHeightMm + 9, { align: 'center' });
      } else {
        // Sheet mode: 6 cards on A4 (2 columns x 3 rows of 85mm x 55mm = 8.5cm x 5.5cm each)
        const printWidthMm = 176; // 2 cards of 85mm + 6mm gap
        const printHeightMm = (canvas.height * printWidthMm) / canvas.width;
        const xPos = (pdfWidth - printWidthMm) / 2;
        const yPos = Math.max(10, (pdfHeight - printHeightMm) / 2);

        pdf.addImage(imgData, 'PNG', xPos, yPos, printWidthMm, printHeightMm);
      }
      
      const filename = mode === 'single'
        ? `بطاقة_سائق_${sortedDrivers.find(d => d.id === selectedDriverId)?.fullName || 'معتمد'}.pdf`
        : `بطاقات_السائقين_مجموعة_${sheetSelectedIds.length}.pdf`;

      pdf.save(filename);
    } catch (err) {
      console.error('Failed to export PDF:', err);
      alert('حدث خطأ أثناء تصدير ملف PDF، يمكنك استخدام خيار حفظ كصورة PNG أو الطباعة المباشرة.');
    } finally {
      setIsExportingPdf(false);
    }
  };

  // Direct PNG Image Download (Great for WhatsApp / Phone sharing)
  const handleExportPng = async () => {
    try {
      setIsExportingPng(true);
      const canvas = await captureCardsCanvas(2.5);
      if (!canvas) throw new Error('فشل توليد الصورة');

      const imgData = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.href = imgData;
      link.download = mode === 'single'
        ? `بطاقة_سائق_${sortedDrivers.find(d => d.id === selectedDriverId)?.fullName || 'معتمد'}.png`
        : `بطاقات_السائقين_مجموعة_${sheetSelectedIds.length}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Failed to export PNG:', err);
      alert('حدث خطأ أثناء تصدير الصورة.');
    } finally {
      setIsExportingPng(false);
    }
  };

  if (!isOpen) return null;

  // Selected driver for single mode
  const currentSingleDriver = sortedDrivers.find(d => d.id === selectedDriverId) || sortedDrivers[0];

  // Selected drivers for sheet mode (up to 6)
  const currentSheetDrivers = sortedDrivers.filter(d => sheetSelectedIds.includes(d.id));

  // Helper for card classification colors
  const getClassificationCardStyle = (classification: string, isMonoMode: boolean) => {
    if (isMonoMode) {
      return {
        backgroundColor: '#FFFFFF',
        color: '#000000',
        border: '1.5px solid #000000'
      };
    }
    switch (classification) {
      case 'عمرة':
        return {
          backgroundColor: '#FEF3C7',
          color: '#92400E',
          border: '1.5px solid #FDE68A'
        };
      case 'النقل الدولي سوريا':
        return {
          backgroundColor: '#ECFDF5',
          color: '#065F46',
          border: '1.5px solid #A7F3D0'
        };
      case 'النقل الدولي اليمن':
        return {
          backgroundColor: '#FAF5FF',
          color: '#6B21A8',
          border: '1.5px solid #E9D5FF'
        };
      case 'نقل عمال':
      default:
        return {
          backgroundColor: '#EFF6FF',
          color: '#1E40AF',
          border: '1.5px solid #BFDBFE'
        };
    }
  };

  // Render a single driver badge component with explicit RGB/HEX inline styles
  const renderDriverCard = (driver: CompanyDriver, indexNumber?: number) => {
    const effType = resolveDriverType(driver);
    const classif = getDriverClassification(driver, workers);
    const qrUrl = qrCodeUrls[driver.id];
    const isResident = effType === 'مقيم';
    const idLabel = isResident ? 'رقم الإقامة' : 'رقم الحدود';
    const rawId = (isResident ? driver.iqamaNumber : driver.borderNumber) || driver.iqamaNumber || driver.borderNumber || '';
    const idValue = rawId || '—';
    const isMono = printColorScheme === 'mono';
    const classifCardStyle = getClassificationCardStyle(classif, isMono);

    return (
      <div 
        key={driver.id}
        className="driver-id-badge"
        style={{
          width: '340px',
          minWidth: '340px',
          maxWidth: '340px',
          height: '220px',
          minHeight: '220px',
          maxHeight: '220px',
          position: 'relative',
          backgroundColor: '#FFFFFF',
          color: '#0F172A',
          border: isMono ? '2.5px solid #000000' : '2px solid #CBD5E1',
          borderRadius: '14px',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          userSelect: 'none',
          boxSizing: 'border-box',
          boxShadow: isMono ? 'none' : '0 4px 12px rgba(15, 23, 42, 0.08)',
          direction: 'ltr',
          fontFamily: "'Tajawal', -apple-system, BlinkMacSystemFont, 'Segoe UI', Tahoma, Arial, sans-serif"
        }}
      >
        {/* Top Header Strip: DMTC Official Brand Banner (LTR for deterministic flex layout) */}
        <div 
          style={{
            background: isMono 
              ? '#000000' 
              : 'linear-gradient(90deg, #1E293B 0%, #1A237E 50%, #0D47A1 100%)',
            color: '#FFFFFF',
            padding: '4px 10px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: isMono ? '2px solid #000000' : '2px solid #F59E0B',
            boxSizing: 'border-box',
            height: '42px',
            minHeight: '42px',
            maxHeight: '42px',
            width: '100%',
            direction: 'ltr'
          }}
        >
          {/* Left Child: Authorized Driver Badge - Strictly Centered & Non-Spilling */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <div 
              className="badge-authorized-driver"
              style={{
                backgroundColor: isMono ? '#000000' : '#F59E0B',
                color: isMono ? '#FFFFFF' : '#0F172A',
                fontSize: '9.5px',
                fontWeight: 900,
                height: '20px',
                minHeight: '20px',
                maxHeight: '20px',
                paddingLeft: '10px',
                paddingRight: '10px',
                borderRadius: '10px',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                boxSizing: 'border-box',
                border: isMono ? '1.5px solid #FFFFFF' : '1px solid #D97706',
                fontFamily: "'Tajawal', Tahoma, Arial, sans-serif",
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                lineHeight: 1,
                overflow: 'hidden'
              }}
            >
              <span style={{
                display: 'inline-block',
                lineHeight: 1,
                position: 'relative',
                top: '-1px'
              }}>
                بطاقة سائق معتمد
              </span>
            </div>
            <div style={{
              fontSize: '7px',
              color: '#FFFFFF',
              fontWeight: 800,
              fontFamily: 'Arial, monospace',
              letterSpacing: '0.4px',
              marginTop: '1px',
              paddingLeft: '2px',
              lineHeight: 1
            }}>
              AUTHORIZED DRIVER
            </div>
          </div>

          {/* Right Child: Company Title & Official DMTC Logo */}
          <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'center', gap: '6px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: 900,
                color: '#FFFFFF',
                lineHeight: 1.2,
                fontFamily: "'Tajawal', Tahoma, Arial, sans-serif",
                whiteSpace: 'nowrap'
              }}>
                شركة درة المنورة للنقليات
              </div>
              <div style={{
                fontSize: '7px',
                fontWeight: 800,
                color: isMono ? '#FFFFFF' : '#FCD34D',
                lineHeight: 1.1,
                fontFamily: 'Arial, monospace',
                letterSpacing: '0.2px',
                whiteSpace: 'nowrap',
                marginTop: '1px'
              }}>
                DORAT AL MUNAWARAH TRANSPORT
              </div>
            </div>
            <div style={{
              width: '30px',
              height: '30px',
              minWidth: '30px',
              maxWidth: '30px',
              backgroundColor: '#FFFFFF',
              borderRadius: '6px',
              padding: '2px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: isMono ? '1.5px solid #000000' : '1.5px solid rgba(255, 255, 255, 0.5)',
              boxSizing: 'border-box',
              overflow: 'hidden',
              flexShrink: 0
            }}>
              <img 
                src={activeLogo} 
                alt="DMTC Logo" 
                style={{ 
                  width: '26px', 
                  height: '26px', 
                  maxWidth: '26px', 
                  maxHeight: '26px', 
                  objectFit: 'contain', 
                  display: 'block' 
                }} 
              />
            </div>
          </div>
        </div>

        {/* Card Body: Info + QR Code */}
        <div 
          style={{
            padding: '6px 10px',
            flex: 1,
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'stretch',
            justifyContent: 'space-between',
            gap: '10px',
            backgroundColor: '#FFFFFF',
            background: isMono 
              ? '#FFFFFF' 
              : 'linear-gradient(135deg, #FFFFFF 0%, #F8FAFC 60%, #F0F4F8 100%)',
            boxSizing: 'border-box',
            width: '100%',
            direction: 'ltr',
            overflow: 'hidden'
          }}
        >
          {/* Left Column: Dedicated High-Resolution QR Code */}
          <div style={{
            width: '90px',
            minWidth: '90px',
            maxWidth: '90px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            borderRight: isMono ? '1.5px solid #000000' : '1.5px solid #E2E8F0',
            paddingRight: '8px',
            boxSizing: 'border-box',
            flexShrink: 0
          }}>
            {/* High-Resolution QR Code with Pure White Quiet Zone */}
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: '#FFFFFF',
              padding: '3px',
              borderRadius: '7px',
              border: isMono ? '2px solid #000000' : '1.5px solid #0F172A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              overflow: 'hidden',
              boxShadow: isMono ? 'none' : '0 2px 4px rgba(0,0,0,0.06)'
            }}>
              {qrUrl ? (
                <img 
                  src={qrUrl} 
                  alt="Driver QR Code" 
                  style={{ width: '74px', height: '74px', objectFit: 'contain', display: 'block' }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF', color: '#94A3B8' }}>
                  <QrCode style={{ width: '36px', height: '36px' }} />
                </div>
              )}
            </div>

            <div style={{
              fontSize: '8px',
              fontWeight: 900,
              color: isMono ? '#000000' : '#334155',
              textAlign: 'center',
              marginTop: '4px',
              fontFamily: "'Tajawal', Tahoma, sans-serif",
              whiteSpace: 'nowrap'
            }}>
              امسح للتحقق الميداني
            </div>

            <div style={{
              fontSize: '7.5px',
              fontWeight: 900,
              fontFamily: 'monospace',
              color: isMono ? '#000000' : '#0F172A',
              backgroundColor: isMono ? '#FFFFFF' : '#F1F5F9',
              padding: '1px 5px',
              borderRadius: '4px',
              border: isMono ? '1.5px solid #000000' : '1px solid #CBD5E1',
              marginTop: '3px',
              letterSpacing: '0.3px',
              whiteSpace: 'nowrap'
            }}>
              DMTC • #{driver.serialNumber ? String(driver.serialNumber).padStart(3, '0') : '001'}
            </div>
          </div>

          {/* Right Column: Driver Details (RTL, text right, flex 1) */}
          <div style={{
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textAlign: 'right',
            direction: 'rtl',
            boxSizing: 'border-box',
            minWidth: 0,
            overflow: 'hidden'
          }}>
            <div>
              {/* Badges row: Serial, Type, Classification */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '1.5px 5px',
                  backgroundColor: isMono ? '#000000' : '#0F172A',
                  color: isMono ? '#FFFFFF' : '#FBBF24',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                  fontSize: '9.5px',
                  fontWeight: 900,
                  border: isMono ? '1px solid #000000' : '1px solid #334155',
                  display: 'inline-block'
                }}>
                  #{driver.serialNumber ? String(driver.serialNumber).padStart(3, '0') : '001'}
                </span>
                <span style={{
                  padding: '1.5px 6px',
                  borderRadius: '12px',
                  fontSize: '8.5px',
                  fontWeight: 900,
                  border: isMono ? '1.5px solid #000000' : `1.5px solid ${isResident ? '#10B981' : '#A855F7'}`,
                  backgroundColor: isMono ? '#FFFFFF' : (isResident ? '#ECFDF5' : '#FAF5FF'),
                  color: isMono ? '#000000' : (isResident ? '#065F46' : '#6B21A8'),
                  fontFamily: "'Tajawal', Tahoma, sans-serif",
                  display: 'inline-block'
                }}>
                  {effType}
                </span>
                <span style={{
                  padding: '1.5px 5.5px',
                  borderRadius: '4px',
                  fontSize: '8px',
                  fontWeight: 800,
                  backgroundColor: classifCardStyle.backgroundColor,
                  color: classifCardStyle.color,
                  border: classifCardStyle.border,
                  fontFamily: "'Tajawal', Tahoma, sans-serif",
                  display: 'inline-block',
                  whiteSpace: 'nowrap'
                }}>
                  {classif}
                </span>
              </div>

              {/* Driver Full Name */}
              <div style={{
                fontSize: '13.5px',
                lineHeight: '1.25',
                fontWeight: 900,
                color: '#000000',
                fontFamily: "'Tajawal', Tahoma, sans-serif",
                marginBottom: '3px',
                wordBreak: 'break-word',
                textAlign: 'right'
              }}>
                {driver.fullName}
              </div>
            </div>

            {/* Essential Data Grid */}
            <div style={{
              backgroundColor: isMono ? '#FFFFFF' : '#F1F5F9',
              padding: '4px 7px',
              borderRadius: '7px',
              border: isMono ? '1.5px solid #000000' : '1px solid #CBD5E1',
              display: 'flex',
              flexDirection: 'column',
              gap: '2.5px',
              boxSizing: 'border-box'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px' }}>
                <span style={{ fontWeight: 800, color: isMono ? '#000000' : '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <IdCard style={{ width: '11px', height: '11px', color: isMono ? '#000000' : '#0066F6', minWidth: '11px' }} />
                  <span style={{ fontFamily: "'Tajawal', Tahoma, sans-serif" }}>{idLabel}:</span>
                </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 900, color: '#000000', fontSize: '10.5px' }}>
                  {idValue}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px' }}>
                <span style={{ fontWeight: 800, color: isMono ? '#000000' : '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                  <Globe style={{ width: '11px', height: '11px', color: isMono ? '#000000' : '#64748B', minWidth: '11px' }} />
                  <span style={{ fontFamily: "'Tajawal', Tahoma, sans-serif" }}>الجنسية:</span>
                </span>
                <span style={{ fontWeight: 800, color: '#000000', fontFamily: "'Tajawal', Tahoma, sans-serif" }}>
                  {driver.nationality || 'غير محدد'}
                </span>
              </div>

              {driver.busNumber && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '9px' }}>
                  <span style={{ fontWeight: 800, color: isMono ? '#000000' : '#475569', display: 'flex', alignItems: 'center', gap: '3px' }}>
                    <Bus style={{ width: '11px', height: '11px', color: isMono ? '#000000' : '#0284C7', minWidth: '11px' }} />
                    <span style={{ fontFamily: "'Tajawal', Tahoma, sans-serif" }}>الحافلة:</span>
                  </span>
                  <span style={{ fontFamily: 'monospace', fontWeight: 900, color: isMono ? '#000000' : '#0369A1' }}>
                    #{driver.busNumber}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Bottom Footer: Official Seal & Verification Strip */}
        <div 
          style={{
            backgroundColor: isMono ? '#000000' : '#0F172A',
            color: '#FFFFFF',
            padding: '3px 10px',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'space-between',
            fontSize: '7.5px',
            fontWeight: 800,
            borderTop: isMono ? '2px solid #000000' : '2px solid #F59E0B',
            boxSizing: 'border-box',
            height: '22px',
            minHeight: '22px',
            maxHeight: '22px',
            width: '100%',
            direction: 'ltr'
          }}
        >
          <div style={{ color: isMono ? '#FFFFFF' : '#94A3B8', fontFamily: 'monospace', fontWeight: 700 }}>
            موسم 1448 هـ - 2027م
          </div>

          <div style={{
            color: isMono ? '#FFFFFF' : '#FBBF24',
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '4px',
            fontWeight: 900,
            fontFamily: "'Tajawal', Tahoma, sans-serif"
          }}>
            <span>معتمد من قسم التشغيل والمتابعة</span>
            <ShieldCheck style={{ width: '12px', height: '12px', color: isMono ? '#FFFFFF' : '#34D399', minWidth: '12px' }} />
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      {/* Print Specific CSS: ensures ONLY the cards are printed on A4 paper at exact 8.5cm x 5.5cm */}
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #printable-driver-cards,
          #printable-driver-cards * {
            visibility: visible !important;
          }
          #printable-driver-cards {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            padding: ${mode === 'single' ? '25mm 10mm' : '8mm 6mm'} !important;
            margin: 0 !important;
            background: white !important;
            display: ${mode === 'single' ? 'flex' : 'grid'} !important;
            ${mode === 'single' ? 'justify-content: center !important; align-items: center !important;' : 'grid-template-columns: repeat(2, 85mm) !important; justify-content: center !important; gap: 6mm !important;'}
          }
          .driver-id-badge {
            width: 85mm !important;
            min-width: 85mm !important;
            max-width: 85mm !important;
            height: 55mm !important;
            min-height: 55mm !important;
            max-height: 55mm !important;
            page-break-inside: avoid !important;
            break-inside: avoid !important;
            box-shadow: none !important;
            border: 1.5px solid #64748b !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .badge-authorized-driver {
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            height: 20px !important;
            line-height: 1 !important;
            text-align: center !important;
            padding: 0 10px !important;
          }
          .badge-authorized-driver span {
            display: inline-block !important;
            line-height: 1 !important;
            position: relative !important;
            top: -1px !important;
          }
          @page {
            size: A4 portrait;
            margin: 8mm 6mm;
          }
        }
      `}</style>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-surface rounded-3xl border border-border shadow-2xl w-full max-w-5xl max-h-[92vh] flex flex-col overflow-hidden"
        dir="rtl"
      >
        {/* Modal Top Header */}
        <div className="p-4 sm:p-5 border-b border-border bg-gradient-to-r from-blue-50/50 via-indigo-50/30 to-transparent dark:from-slate-800/40 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-600/20 shrink-0">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white leading-tight">
                  طباعة بطاقات السائقين المعتمدة
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300 border border-indigo-200">
                  مقاس معتمد 8.5 × 5.5 سم • رمز QR
                </span>
              </div>
              <p className="text-xs text-text-muted font-bold mt-0.5">
                توليد بطاقة هوية السائق بمقاس 8.5 سم × 5.5 سم مع رمز QR ورقم الإقامة/الحدود وخيار طباعة 6 بطاقات في صفحة A4
              </p>
            </div>
          </div>

          <button 
            type="button"
            onClick={onClose}
            className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-text-muted hover:text-slate-900 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Mode Selector Tabs (Single vs 6 Sheet) */}
        <div className="px-5 pt-3 pb-2 border-b border-border bg-slate-50/50 dark:bg-slate-900/40 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setMode('single')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                mode === 'single'
                  ? 'bg-surface text-primary shadow-xs'
                  : 'text-text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <IdCard className="w-4 h-4" />
              <span>بطاقة مفردة (سائق واحد)</span>
            </button>
            <button
              type="button"
              onClick={() => setMode('sheet')}
              className={`px-4 py-2 rounded-lg text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                mode === 'sheet'
                  ? 'bg-surface text-indigo-600 dark:text-indigo-400 shadow-xs'
                  : 'text-text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Layers className="w-4 h-4" />
              <span>طباعة 6 بطاقات مجتمعة (ورقة A4)</span>
              <span className="px-1.5 py-0.2 bg-indigo-600 text-white rounded-full text-[10px] font-mono">
                {sheetSelectedIds.length}/6
              </span>
            </button>
          </div>

          {/* Print Style / Color Scheme Switcher */}
          <div className="flex items-center bg-slate-200/70 dark:bg-slate-800 p-1 rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => setPrintColorScheme('color')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                printColorScheme === 'color'
                  ? 'bg-surface text-amber-700 dark:text-amber-400 shadow-xs font-black'
                  : 'text-text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
              title="بطاقة ملونة بألوان درة المنورة الرسمية"
            >
              <Palette className="w-3.5 h-3.5" />
              <span>ملون رسمي</span>
            </button>
            <button
              type="button"
              onClick={() => setPrintColorScheme('mono')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                printColorScheme === 'mono'
                  ? 'bg-surface text-slate-950 dark:text-white shadow-xs font-black'
                  : 'text-text-muted hover:text-slate-900 dark:hover:text-white'
              }`}
              title="نمط أبيض وأسود عالي التباين للطابعات العادية وأجهزة المسح"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>أبيض وأسود (عالي التباين للمسح)</span>
            </button>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handlePrint}
              className="px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-emerald-600/20 flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>طباعة الآن ({mode === 'single' ? 'بطاقة واحدة' : `${sheetSelectedIds.length} بطاقات`})</span>
            </button>

            <button
              type="button"
              disabled={isExportingPdf || isExportingPng}
              onClick={handleExportPdf}
              className="px-3.5 py-2 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-border rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-2 cursor-pointer disabled:opacity-50"
              title="تصدير كملف PDF عالي الجودة جاهز للطباعة"
            >
              <Download className="w-4 h-4 text-primary" />
              <span>{isExportingPdf ? 'جاري التصدير...' : 'حفظ PDF'}</span>
            </button>

            <button
              type="button"
              disabled={isExportingPdf || isExportingPng}
              onClick={handleExportPng}
              className="px-3 py-2 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 border border-border rounded-xl text-xs font-bold transition-all shadow-2xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              title="تنزيل كصورة PNG عالية الدقة"
            >
              <FileText className="w-4 h-4 text-emerald-600" />
              <span>{isExportingPng ? 'جاري الحفظ...' : 'حفظ PNG'}</span>
            </button>
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 flex flex-col lg:flex-row gap-5">
          {/* Controls & Selection Sidebar (Left in RTL = Right Column) */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-3.5 bg-slate-50/70 dark:bg-slate-900/50 p-4 rounded-2xl border border-border">
            {mode === 'single' ? (
              <>
                <div>
                  <label className="text-xs font-black text-slate-900 dark:text-white block mb-1.5">
                    اختر السائق بحسب الرقم التسلسلي:
                  </label>
                  <div className="relative">
                    <input 
                      type="number"
                      min="1"
                      placeholder="أدخل الرقم التسلسلي (مثال: 1)..."
                      value={selectedSerialInput}
                      onChange={(e) => handleSerialSearch(e.target.value)}
                      className="w-full pr-3 pl-10 py-2.5 bg-surface border border-border focus:border-primary rounded-xl outline-none text-sm font-mono font-black"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-black text-text-muted">
                      #رقم
                    </span>
                  </div>
                </div>

                {/* Dropdown list by serial & name */}
                <div>
                  <label className="text-xs font-bold text-text-muted block mb-1">
                    أو اختر من القائمة:
                  </label>
                  <select
                    value={selectedDriverId}
                    onChange={(e) => {
                      setSelectedDriverId(e.target.value);
                      const d = sortedDrivers.find(item => item.id === e.target.value);
                      if (d) setSelectedSerialInput(String(d.serialNumber || ''));
                    }}
                    className="w-full p-2.5 bg-surface border border-border rounded-xl text-xs font-bold outline-none focus:border-primary shadow-xs"
                  >
                    {sortedDrivers.map(d => {
                      const cl = getDriverClassification(d, workers);
                      return (
                        <option key={d.id} value={d.id}>
                          #{d.serialNumber || 1} - {d.fullName} ({resolveDriverType(d)} • {cl})
                        </option>
                      );
                    })}
                  </select>
                </div>

                <div className="pt-2 border-t border-border/60">
                  <span className="text-[11px] font-bold text-text-muted block mb-1">
                    بيانات السائق المحدد:
                  </span>
                  {currentSingleDriver && (
                    <div className="p-2.5 bg-surface rounded-xl border border-border text-xs space-y-1">
                      <div className="font-black text-slate-900 dark:text-white text-sm">
                        {currentSingleDriver.fullName}
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center justify-between">
                        <span>الرقم التسلسلي:</span>
                        <span className="font-mono font-black text-primary">#{currentSingleDriver.serialNumber || 1}</span>
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center justify-between">
                        <span>{resolveDriverType(currentSingleDriver) === 'موسمي' ? 'رقم الحدود:' : 'رقم الإقامة:'}</span>
                        <span className="font-mono font-bold">{currentSingleDriver.iqamaNumber || currentSingleDriver.borderNumber || '—'}</span>
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center justify-between">
                        <span>التصنيف:</span>
                        <span className={`font-bold ${
                          getDriverClassification(currentSingleDriver, workers) === 'عمرة'
                            ? 'text-amber-600'
                            : getDriverClassification(currentSingleDriver, workers) === 'النقل الدولي سوريا'
                            ? 'text-teal-600'
                            : getDriverClassification(currentSingleDriver, workers) === 'النقل الدولي اليمن'
                            ? 'text-purple-600'
                            : 'text-blue-600'
                        }`}>
                          {getDriverClassification(currentSingleDriver, workers)}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Sheet Mode Controls (Selecting 6 Drivers) */
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    تحديد السائقين (6 كحد أقصى):
                  </span>
                  <span className="text-xs font-mono font-black px-2 py-0.5 rounded-lg bg-indigo-100 text-indigo-800 dark:bg-indigo-950 dark:text-indigo-300">
                    {sheetSelectedIds.length} / 6
                  </span>
                </div>

                {/* Quick Batch Buttons */}
                <div>
                  <span className="text-[10px] font-bold text-text-muted block mb-1">اختيار مجموعات سريعة:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => selectBatch(0)}
                      className="px-2 py-1.5 bg-surface border border-border hover:border-primary text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                    >
                      #1 إلى #6
                    </button>
                    <button
                      type="button"
                      onClick={() => selectBatch(6)}
                      className="px-2 py-1.5 bg-surface border border-border hover:border-primary text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                    >
                      #7 إلى #12
                    </button>
                    <button
                      type="button"
                      onClick={() => selectBatch(12)}
                      className="px-2 py-1.5 bg-surface border border-border hover:border-primary text-[10px] font-bold rounded-lg transition-colors cursor-pointer text-center"
                    >
                      #13 إلى #18
                    </button>
                  </div>
                </div>

                {/* Search & Filter in list */}
                <div className="space-y-1.5">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted" />
                    <input 
                      type="text"
                      placeholder="ابحث بالاسم، الرقم، أو التصنيف..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pr-8 pl-3 py-2 bg-surface border border-border rounded-xl text-xs outline-none"
                    />
                  </div>
                  <select
                    value={filterClassification}
                    onChange={(e) => setFilterClassification(e.target.value)}
                    className="w-full p-2 bg-surface border border-border rounded-xl text-xs font-bold outline-none shadow-2xs"
                  >
                    <option value="all">كافة التصنيفات (الكل)</option>
                    <option value="نقل عمال">🚌 نقل عمال</option>
                    <option value="عمرة">🕌 عمرة</option>
                    <option value="النقل الدولي سوريا">🌍 النقل الدولي سوريا</option>
                    <option value="النقل الدولي اليمن">🌍 النقل الدولي اليمن</option>
                  </select>
                </div>

                {/* Driver Checkbox List */}
                <div className="flex-1 max-h-[300px] overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar">
                  {filteredList.map(driver => {
                    const isChecked = sheetSelectedIds.includes(driver.id);
                    const driverClass = getDriverClassification(driver, workers);
                    return (
                      <div
                        key={driver.id}
                        onClick={() => toggleSheetDriver(driver.id)}
                        className={`p-2 rounded-xl border text-xs flex items-center justify-between cursor-pointer transition-all ${
                          isChecked 
                            ? 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-400 text-indigo-900 dark:text-indigo-200 font-bold' 
                            : 'bg-surface border-border hover:bg-slate-100/60'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 ${
                            isChecked ? 'bg-indigo-600 border-indigo-600 text-white' : 'border-slate-300'
                          }`}>
                            {isChecked && <Check className="w-3 h-3" />}
                          </span>
                          <span className="font-mono text-[10px] font-black text-text-muted shrink-0">
                            #{driver.serialNumber || 1}
                          </span>
                          <span className="truncate">{driver.fullName}</span>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <span className={`text-[8.5px] px-1.5 py-0.5 rounded font-bold ${
                            driverClass === 'عمرة'
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300'
                              : driverClass === 'النقل الدولي سوريا'
                              ? 'bg-teal-100 text-teal-800 dark:bg-teal-950 dark:text-teal-300'
                              : driverClass === 'النقل الدولي اليمن'
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-950 dark:text-purple-300'
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300'
                          }`}>
                            {driverClass}
                          </span>
                          <span className="text-[10px] text-text-muted">
                            {resolveDriverType(driver)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}

            {/* Print Tips */}
            <div className="mt-auto p-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-[11px] text-amber-800 dark:text-amber-300">
              <span className="font-black block mb-0.5">💡 نصائح الطباعة:</span>
              <ul className="list-disc list-inside space-y-0.5 text-[10px]">
                <li>عند الطباعة، اختر مقاس الورق A4 والاتجاه الرأسي (Portrait).</li>
                <li>تأكد من تفعيل "طباعة رسومات الخلفية" (Background graphics) في خيارات الطابعة.</li>
                <li>رمز QR عالي الدقة والتباين وقابل للمسح الفوري بكاميرا الهاتف وأجهزة التحقق الميداني.</li>
              </ul>
            </div>
          </div>

          {/* Cards Preview Area (Right in RTL = Left Canvas) */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-950/60 p-4 sm:p-6 rounded-2xl border border-border flex flex-col items-center justify-start overflow-y-auto">
            <div className="w-full flex items-center justify-between mb-3 px-1">
              <span className="text-xs font-black text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>معاينة الطباعة المعتمدة {mode === 'sheet' ? '(شبكة 6 بطاقات A4)' : '(بطاقة واحدة)'}</span>
              </span>
              <span className="text-[11px] font-bold text-text-muted bg-surface/80 px-2 py-0.5 rounded-md border border-border">
                المقاس المعتمد: 8.5 سم × 5.5 سم (85mm × 55mm)
              </span>
            </div>

            {/* Print Canvas Container */}
            <div 
              ref={printAreaRef}
              id="printable-driver-cards"
              style={{
                backgroundColor: '#FFFFFF',
                boxSizing: 'border-box'
              }}
              className={
                mode === 'single'
                  ? "w-full max-w-sm flex items-center justify-center p-2 rounded-2xl border border-slate-200"
                  : "w-full max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-white rounded-2xl border border-slate-200"
              }
            >
              {mode === 'single' ? (
                currentSingleDriver ? renderDriverCard(currentSingleDriver) : (
                  <div className="p-8 text-center text-text-muted">لا يوجد سائق محدد</div>
                )
              ) : (
                currentSheetDrivers.length > 0 ? (
                  currentSheetDrivers.map((driver, idx) => renderDriverCard(driver, idx + 1))
                ) : (
                  <div className="col-span-2 p-12 text-center text-text-muted">
                    الرجاء تحديد سائق أو أكثر (حتى 6 سائقين) لمعاينتها وطباعتها مجتمعة
                  </div>
                )
              )}
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
