import React, {
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback
} from 'react';
import { createPortal } from 'react-dom';
import { motion } from 'motion/react';
import {
  X,
  Printer,
  FileDown,
  Search,
  Check,
  IdCard,
  Layers,
  QrCode,
  AlertTriangle,
  ChevronRight,
  ChevronLeft,
  RotateCw,
  Info
} from 'lucide-react';
import QRCode from 'qrcode';
import type { CompanyDriver, Worker } from '../types';
import { resolveDriverType, getDriverClassification } from '../lib/driverUtils';
import { useLogo, DEFAULT_LOGO } from '../lib/LogoContext';

interface DriverCardPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: CompanyDriver[];
  workers?: Worker[];
  initialSelectedDriver?: CompanyDriver | null;
}

const CARDS_PER_PAGE = 8;
const A4_WIDTH_PX = 793.700787; // 210mm at 96dpi
const A4_HEIGHT_PX = 1122.519685; // 297mm at 96dpi
const NAME_START_PT = 10;
const NAME_MIN_PT = 7.5;
const NAME_STEP_PT = 0.5;

interface FieldFontSizes {
  iqama: number;
  nationality: number;
  bus: number;
}

const DEFAULT_FIELD_SIZES: FieldFontSizes = {
  iqama: 8,
  nationality: 8,
  bus: 8
};

const chunkDrivers = (list: CompanyDriver[], size: number): CompanyDriver[][] => {
  if (list.length === 0) return [];
  const chunks: CompanyDriver[][] = [];
  for (let i = 0; i < list.length; i += size) {
    chunks.push(list.slice(i, i + size));
  }
  return chunks;
};

const nextAnimationFrame = (): Promise<void> =>
  new Promise(resolve => requestAnimationFrame(() => resolve()));

const getClassificationBadgeStyle = (classification: string): React.CSSProperties => {
  switch (classification) {
    case 'النقل المدرسي':
      return {
        backgroundColor: '#FEF9C3',
        color: '#1A1A1A',
        border: '0.3mm solid #854D0E'
      };
    case 'عمرة':
      return {
        backgroundColor: '#FEF3C7',
        color: '#1A1A1A',
        border: '0.3mm solid #92400E'
      };
    case 'النقل الدولي سوريا':
      return {
        backgroundColor: '#ECFDF5',
        color: '#1A1A1A',
        border: '0.3mm solid #065F46'
      };
    case 'النقل الدولي اليمن':
      return {
        backgroundColor: '#F3E8FF',
        color: '#1A1A1A',
        border: '0.3mm solid #6B21A8'
      };
    case 'خروج نهائي':
      return {
        backgroundColor: '#FEE2E2',
        color: '#1A1A1A',
        border: '0.3mm solid #991B1B'
      };
    case 'نقل عمال':
    default:
      return {
        backgroundColor: '#EFF6FF',
        color: '#1A1A1A',
        border: '0.3mm solid #1E40AF'
      };
  }
};

const getStatusBadgeStyle = (effType: string): React.CSSProperties => {
  if (effType === 'مقيم') {
    return {
      backgroundColor: '#DCFCE7',
      color: '#14532D',
      border: '0.3mm solid #15803D'
    };
  }
  return {
    backgroundColor: '#F3E8FF',
    color: '#3B0764',
    border: '0.3mm solid #6B21A8'
  };
};

const CropMarks: React.FC = () => {
  const markColor = '#9CA3AF';
  const offset = '-2.8mm';
  const length = '2.2mm';
  const thickness = '0.25mm';

  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 1
      }}
    >
      {/* Top-Left */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          left: offset,
          width: length,
          height: thickness,
          backgroundColor: markColor
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: offset,
          left: 0,
          width: thickness,
          height: length,
          backgroundColor: markColor
        }}
      />

      {/* Top-Right */}
      <span
        style={{
          position: 'absolute',
          top: 0,
          right: offset,
          width: length,
          height: thickness,
          backgroundColor: markColor
        }}
      />
      <span
        style={{
          position: 'absolute',
          top: offset,
          right: 0,
          width: thickness,
          height: length,
          backgroundColor: markColor
        }}
      />

      {/* Bottom-Left */}
      <span
        style={{
          position: 'absolute',
          bottom: 0,
          left: offset,
          width: length,
          height: thickness,
          backgroundColor: markColor
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: offset,
          left: 0,
          width: thickness,
          height: length,
          backgroundColor: markColor
        }}
      />

      {/* Bottom-Right */}
      <span
        style={{
          position: 'absolute',
          bottom: 0,
          right: offset,
          width: length,
          height: thickness,
          backgroundColor: markColor
        }}
      />
      <span
        style={{
          position: 'absolute',
          bottom: offset,
          right: 0,
          width: thickness,
          height: length,
          backgroundColor: markColor
        }}
      />
    </div>
  );
};

const countVisualLines = (el: HTMLElement, lineHeightPx: number): number => {
  try {
    const range = document.createRange();
    range.selectNodeContents(el);
    const rects = Array.from<DOMRect>(range.getClientRects()).filter(
      r => r.width > 0.5 && r.height > 0.5
    );
    if (rects.length === 0) return 1;
    const lineTops: number[] = [];
    rects.forEach(r => {
      if (!lineTops.some(t => Math.abs(t - r.top) < lineHeightPx * 0.45)) {
        lineTops.push(r.top);
      }
    });
    return Math.max(1, lineTops.length);
  } catch {
    return 1;
  }
};

interface DriverIdCardProps {
  driver: CompanyDriver;
  workers: Worker[];
  qrUrl?: string;
  activeLogo: string;
  showPreviewWarnings?: boolean;
  recheckTick?: number;
  forceNamePt?: number;
  forceFieldSizes?: FieldFontSizes;
  onNamePtDetected?: (driverId: string, pt: number) => void;
  onFieldSizesDetected?: (driverId: string, sizes: FieldFontSizes) => void;
  onOverflowDetected?: (driverId: string, issues: string[]) => void;
}

const DriverIdCard: React.FC<DriverIdCardProps> = ({
  driver,
  workers,
  qrUrl,
  activeLogo,
  showPreviewWarnings = false,
  recheckTick = 0,
  forceNamePt,
  forceFieldSizes,
  onNamePtDetected,
  onFieldSizesDetected,
  onOverflowDetected
}) => {
  const effType = resolveDriverType(driver);
  const classif = getDriverClassification(driver, workers);
  const serialStr = driver.serialNumber ? String(driver.serialNumber).padStart(3, '0') : '001';
  const iqamaOrBorder = (driver.iqamaNumber || driver.borderNumber || '').trim() || '—';
  const nationalityVal = (driver.nationality || '').trim() || '—';
  const busVal = driver.busNumber && driver.busNumber.trim() ? `#${driver.busNumber.trim()}` : '—';
  const classifVal = (classif || '').trim() || '—';

  const [measuredNamePt, setMeasuredNamePt] = useState<number>(NAME_START_PT);
  const [measuredFieldSizes, setMeasuredFieldSizes] =
    useState<FieldFontSizes>(DEFAULT_FIELD_SIZES);
  const [overflowIssues, setOverflowIssues] = useState<string[]>([]);

  const cardRef = useRef<HTMLDivElement>(null);
  const companyNameRef = useRef<HTMLSpanElement>(null);
  const nameVisibleRef = useRef<HTMLDivElement>(null);
  const iqamaValueRef = useRef<HTMLSpanElement>(null);
  const nationalityValueRef = useRef<HTMLSpanElement>(null);
  const busValueRef = useRef<HTMLSpanElement>(null);

  const activeNamePt = forceNamePt !== undefined ? forceNamePt : measuredNamePt;
  const fieldSizes = forceFieldSizes || measuredFieldSizes;

  // Reset sizing when content or manual recheck changes
  useEffect(() => {
    if (!showPreviewWarnings) return;
    setMeasuredNamePt(NAME_START_PT);
    setMeasuredFieldSizes(DEFAULT_FIELD_SIZES);
    setOverflowIssues([]);
  }, [
    showPreviewWarnings,
    recheckTick,
    driver.id,
    driver.fullName,
    iqamaOrBorder,
    nationalityVal,
    busVal,
    classifVal
  ]);

  // Step-by-step post-font-ready measurement on actual rendered preview elements
  useEffect(() => {
    if (!showPreviewWarnings) return;
    let cancelled = false;

    const runCheck = async () => {
      try {
        if (typeof document !== 'undefined' && document.fonts?.ready) {
          await document.fonts.ready;
        }
      } catch {
        // ignore
      }
      await nextAnimationFrame();
      await nextAnimationFrame();
      if (cancelled) return;

      const nameEl = nameVisibleRef.current;
      let steppedDownName = false;

      // 1. Step down driver name from 10pt -> 7.5pt by 0.5pt until it fits <= 2 lines
      if (nameEl && nameEl.clientWidth > 0 && nameEl.clientHeight > 0) {
        const lineHeightPx =
          parseFloat(getComputedStyle(nameEl).lineHeight) || (measuredNamePt * (96 / 72) * 1.6);
        const visualLines = countVisualLines(nameEl, lineHeightPx);

        if (visualLines > 2 && measuredNamePt > NAME_MIN_PT) {
          steppedDownName = true;
          setMeasuredNamePt(prev => Math.max(NAME_MIN_PT, Number((prev - NAME_STEP_PT).toFixed(1))));
        }
      }

      // 2. Step down data fields (8pt -> 6.5pt) if wider than cell
      const nextFieldSizes: FieldFontSizes = { ...measuredFieldSizes };
      let fieldsChanged = false;
      const checkAndShrinkField = (
        el: HTMLSpanElement | null,
        key: keyof FieldFontSizes
      ) => {
        if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
        if (nextFieldSizes[key] > 6.5 && el.scrollWidth > el.clientWidth + 1) {
          nextFieldSizes[key] = 6.5;
          fieldsChanged = true;
        }
      };

      checkAndShrinkField(iqamaValueRef.current, 'iqama');
      checkAndShrinkField(nationalityValueRef.current, 'nationality');
      checkAndShrinkField(busValueRef.current, 'bus');

      if (fieldsChanged) {
        setMeasuredFieldSizes(nextFieldSizes);
      }

      // Wait for next render if font size stepped down
      if (steppedDownName || fieldsChanged) return;

      // 3. Final verification: check scrollHeight > clientHeight on text elements and card bounds
      const issues: string[] = [];

      const checkVerticalOverflow = (el: HTMLElement | null, label: string) => {
        if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
        if (el.scrollHeight > el.clientHeight + 1) {
          issues.push(label);
        }
      };

      if (nameEl && nameEl.clientWidth > 0 && nameEl.clientHeight > 0) {
        const lineHeightPx =
          parseFloat(getComputedStyle(nameEl).lineHeight) || (measuredNamePt * (96 / 72) * 1.6);
        const visualLines = countVisualLines(nameEl, lineHeightPx);
        if (visualLines > 2 || nameEl.scrollHeight > nameEl.clientHeight + 1) {
          issues.push('الاسم');
        }
      }

      checkVerticalOverflow(companyNameRef.current, 'اسم الشركة');

      const checkFieldOverflow = (
        el: HTMLSpanElement | null,
        size: number,
        label: string
      ) => {
        if (!el || el.clientWidth === 0 || el.clientHeight === 0) return;
        if (
          (size <= 6.5 && el.scrollWidth > el.clientWidth + 1) ||
          el.scrollHeight > el.clientHeight + 1
        ) {
          issues.push(label);
        }
      };

      checkFieldOverflow(iqamaValueRef.current, measuredFieldSizes.iqama, 'رقم الإقامة');
      checkFieldOverflow(nationalityValueRef.current, measuredFieldSizes.nationality, 'الجنسية');
      checkFieldOverflow(busValueRef.current, measuredFieldSizes.bus, 'الحافلة');

      const cardEl = cardRef.current;
      if (
        cardEl &&
        cardEl.clientWidth > 0 &&
        cardEl.clientHeight > 0 &&
        cardEl.scrollHeight > cardEl.clientHeight + 1 &&
        issues.length === 0
      ) {
        issues.push('تجاوز حدود البطاقة');
      }

      setOverflowIssues(prev => {
        const same =
          prev.length === issues.length && prev.every((item, idx) => item === issues[idx]);
        return same ? prev : issues;
      });
    };

    runCheck();
    return () => {
      cancelled = true;
    };
  }, [
    showPreviewWarnings,
    recheckTick,
    driver.id,
    driver.fullName,
    iqamaOrBorder,
    nationalityVal,
    busVal,
    classifVal,
    measuredNamePt,
    measuredFieldSizes
  ]);

  useEffect(() => {
    if (!showPreviewWarnings) return;
    onNamePtDetected?.(driver.id, measuredNamePt);
  }, [showPreviewWarnings, driver.id, measuredNamePt, onNamePtDetected]);

  useEffect(() => {
    if (!showPreviewWarnings) return;
    onFieldSizesDetected?.(driver.id, measuredFieldSizes);
  }, [showPreviewWarnings, driver.id, measuredFieldSizes, onFieldSizesDetected]);

  useEffect(() => {
    if (!showPreviewWarnings) return;
    onOverflowDetected?.(driver.id, overflowIssues);
  }, [showPreviewWarnings, driver.id, overflowIssues, onOverflowDetected]);

  const statusBadgeStyle = getStatusBadgeStyle(effType);
  const classifBadgeStyle = getClassificationBadgeStyle(classifVal);

  return (
    <div
      ref={cardRef}
      className="driver-id-badge"
      dir="rtl"
      style={{
        width: '85mm',
        minWidth: '85mm',
        maxWidth: '85mm',
        height: '55mm',
        minHeight: '55mm',
        maxHeight: '55mm',
        position: 'relative',
        backgroundColor: '#FFFFFF',
        color: '#1A1A1A',
        border:
          showPreviewWarnings && overflowIssues.length > 0
            ? '0.45mm solid #DC2626'
            : '0.3mm solid #94A3B8',
        borderRadius: '2mm',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        boxSizing: 'border-box',
        direction: 'rtl',
        textAlign: 'start',
        fontFamily: 'inherit',
        letterSpacing: 'normal',
        wordSpacing: 'normal',
        userSelect: 'none',
        breakInside: 'avoid',
        pageBreakInside: 'avoid',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}
    >
      {/* 1. Header: min-height 12mm, overflow: visible */}
      <div
        style={{
          minHeight: '12mm',
          flexShrink: 0,
          overflow: 'visible',
          backgroundColor: '#0F274A',
          borderBottom: '0.45mm solid #F59E0B',
          padding: '0.6mm 2.5mm',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '2mm',
          boxSizing: 'border-box',
          direction: 'rtl'
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '1.8mm',
            minWidth: 0,
            overflow: 'visible'
          }}
        >
          <div
            style={{
              width: '7mm',
              height: '7mm',
              minWidth: '7mm',
              minHeight: '7mm',
              backgroundColor: '#FFFFFF',
              borderRadius: '1.2mm',
              padding: '0.4mm',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
              flexShrink: 0
            }}
          >
            <img
              src={activeLogo}
              alt="شعار درة المنورة"
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'contain',
                display: 'block'
              }}
            />
          </div>
          <span
            ref={companyNameRef}
            style={{
              fontSize: '9pt',
              fontWeight: 600,
              color: '#FFFFFF',
              lineHeight: 1.6,
              whiteSpace: 'nowrap',
              overflow: 'visible',
              textAlign: 'start',
              letterSpacing: 'normal',
              wordSpacing: 'normal'
            }}
          >
            شركة درة المنورة للنقليات
          </span>
        </div>

        <span
          style={{
            backgroundColor: '#F59E0B',
            color: '#1A1A1A',
            fontSize: '6.5pt',
            fontWeight: 600,
            lineHeight: 1.6,
            paddingBlock: '0.3mm',
            paddingInline: '2mm',
            borderRadius: '1mm',
            border: '0.3mm solid #D97706',
            whiteSpace: 'nowrap',
            overflow: 'visible',
            flexShrink: 0,
            marginInlineEnd: '0.5mm',
            letterSpacing: 'normal',
            wordSpacing: 'normal'
          }}
        >
          بطاقة سائق معتمد
        </span>
      </div>

      {/* 2. Body: ~37mm flexible area */}
      <div
        style={{
          flex: 1,
          minHeight: 0,
          overflow: 'visible',
          display: 'flex',
          flexDirection: 'row',
          direction: 'rtl',
          backgroundColor: '#FFFFFF',
          boxSizing: 'border-box'
        }}
      >
        {/* Data Column (Right in RTL): 5mm badges + 9mm name + 3x5.5mm rows + >=2mm safe bottom margin */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            overflow: 'visible',
            paddingTop: '1.2mm',
            paddingBottom: '2.2mm',
            paddingInlineStart: '2.5mm',
            paddingInlineEnd: '2mm',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            textAlign: 'start',
            direction: 'rtl',
            boxSizing: 'border-box'
          }}
        >
          {/* Badges row (minHeight: 5mm, overflow: visible) */}
          <div
            style={{
              minHeight: '5mm',
              overflow: 'visible',
              display: 'flex',
              flexDirection: 'row',
              alignItems: 'center',
              gap: '1.4mm',
              boxSizing: 'border-box'
            }}
          >
            <span
              style={{
                ...statusBadgeStyle,
                fontSize: '6.5pt',
                fontWeight: 600,
                lineHeight: 1.6,
                paddingBlock: '0.3mm',
                paddingInline: '1.6mm',
                borderRadius: '0.8mm',
                whiteSpace: 'nowrap',
                overflow: 'visible',
                flexShrink: 0,
                letterSpacing: 'normal',
                wordSpacing: 'normal'
              }}
            >
              {effType}
            </span>

            <span
              style={{
                ...classifBadgeStyle,
                fontSize: '6.5pt',
                fontWeight: 600,
                lineHeight: 1.6,
                paddingBlock: '0.3mm',
                paddingInline: '1.6mm',
                borderRadius: '0.8mm',
                whiteSpace: 'nowrap',
                overflow: 'visible',
                flexShrink: 0,
                letterSpacing: 'normal',
                wordSpacing: 'normal'
              }}
            >
              {classifVal}
            </span>
          </div>

          {/* Driver Name: minHeight 9mm, max 2 lines, auto-steps 10pt -> 7.5pt by 0.5pt, NO -webkit-line-clamp */}
          <div
            ref={nameVisibleRef}
            style={{
              minHeight: '9mm',
              fontSize: `${activeNamePt}pt`,
              fontWeight: 600,
              lineHeight: 1.6,
              paddingBlock: '0.3mm',
              color: '#1A1A1A',
              textAlign: 'start',
              overflow: 'visible',
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              letterSpacing: 'normal',
              wordSpacing: 'normal'
            }}
          >
            {driver.fullName || '—'}
          </div>

          {/* 3 Fixed Data Rows (5.5mm each, overflow: visible, alignItems: baseline) */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '0.3mm',
              overflow: 'visible'
            }}
          >
            {/* 1. رقم الإقامة */}
            <div
              style={{
                minHeight: '5.5mm',
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '1.5mm'
              }}
            >
              <span
                style={{
                  fontSize: '6.5pt',
                  fontWeight: 400,
                  color: '#52667A',
                  lineHeight: 1.6,
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  flexShrink: 0,
                  letterSpacing: 'normal',
                  wordSpacing: 'normal'
                }}
              >
                رقم الإقامة
              </span>
              <span
                ref={iqamaValueRef}
                style={{
                  direction: 'ltr',
                  unicodeBidi: 'isolate',
                  fontSize: `${fieldSizes.iqama}pt`,
                  fontWeight: 600,
                  color: '#1A1A1A',
                  lineHeight: 1.6,
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  minWidth: 0,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: 'normal',
                  wordSpacing: 'normal'
                }}
              >
                {iqamaOrBorder}
              </span>
            </div>

            {/* 2. الجنسية */}
            <div
              style={{
                minHeight: '5.5mm',
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '1.5mm'
              }}
            >
              <span
                style={{
                  fontSize: '6.5pt',
                  fontWeight: 400,
                  color: '#52667A',
                  lineHeight: 1.6,
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  flexShrink: 0,
                  letterSpacing: 'normal',
                  wordSpacing: 'normal'
                }}
              >
                الجنسية
              </span>
              <span
                ref={nationalityValueRef}
                style={{
                  fontSize: `${fieldSizes.nationality}pt`,
                  fontWeight: 600,
                  color: '#1A1A1A',
                  lineHeight: 1.6,
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  minWidth: 0,
                  textAlign: 'start',
                  letterSpacing: 'normal',
                  wordSpacing: 'normal'
                }}
              >
                {nationalityVal}
              </span>
            </div>

            {/* 3. الحافلة */}
            <div
              style={{
                minHeight: '5.5mm',
                overflow: 'visible',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'baseline',
                justifyContent: 'space-between',
                gap: '1.5mm'
              }}
            >
              <span
                style={{
                  fontSize: '6.5pt',
                  fontWeight: 400,
                  color: '#52667A',
                  lineHeight: 1.6,
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  flexShrink: 0,
                  letterSpacing: 'normal',
                  wordSpacing: 'normal'
                }}
              >
                الحافلة
              </span>
              <span
                ref={busValueRef}
                style={{
                  direction: 'ltr',
                  unicodeBidi: 'isolate',
                  fontSize: `${fieldSizes.bus}pt`,
                  fontWeight: 600,
                  color: '#1A1A1A',
                  lineHeight: 1.6,
                  whiteSpace: 'nowrap',
                  overflow: 'visible',
                  minWidth: 0,
                  fontVariantNumeric: 'tabular-nums',
                  letterSpacing: 'normal',
                  wordSpacing: 'normal'
                }}
              >
                {busVal}
              </span>
            </div>
          </div>
        </div>

        {/* QR Column (Left in RTL, fixed 26mm width) */}
        <div
          style={{
            width: '26mm',
            minWidth: '26mm',
            maxWidth: '26mm',
            flexShrink: 0,
            overflow: 'visible',
            borderInlineStart: '0.25mm solid #CBD5E1',
            padding: '1mm 1mm 1.5mm 1mm',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '0.3mm',
            backgroundColor: '#FFFFFF',
            boxSizing: 'border-box'
          }}
        >
          {/* 22mm x 22mm QR inside 1.5mm white quiet margin */}
          <div
            style={{
              width: '22mm',
              height: '22mm',
              padding: '1.5mm',
              boxSizing: 'content-box',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}
          >
            {qrUrl ? (
              <img
                src={qrUrl}
                alt={`رمز تحقق ${driver.fullName}`}
                style={{
                  width: '22mm',
                  height: '22mm',
                  display: 'block',
                  objectFit: 'contain'
                }}
              />
            ) : (
              <div
                style={{
                  width: '22mm',
                  height: '22mm',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  border: '0.25mm solid #CBD5E1'
                }}
              >
                <QrCode style={{ width: '9mm', height: '9mm' }} />
              </div>
            )}
          </div>

          <div
            style={{
              fontSize: '6.5pt',
              fontWeight: 400,
              color: '#52667A',
              lineHeight: 1.6,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'visible',
              letterSpacing: 'normal',
              wordSpacing: 'normal'
            }}
          >
            امسح للتحقق الميداني
          </div>

          <div
            style={{
              direction: 'ltr',
              unicodeBidi: 'isolate',
              fontSize: '6.5pt',
              fontWeight: 600,
              color: '#1A1A1A',
              lineHeight: 1.6,
              textAlign: 'center',
              whiteSpace: 'nowrap',
              overflow: 'visible',
              fontVariantNumeric: 'tabular-nums',
              letterSpacing: 'normal',
              wordSpacing: 'normal'
            }}
          >
            DMTC • #{serialStr}
          </div>
        </div>
      </div>

      {/* 3. Footer: min-height 6mm, overflow: visible */}
      <div
        style={{
          minHeight: '6mm',
          flexShrink: 0,
          overflow: 'visible',
          backgroundColor: '#0F274A',
          borderTop: '0.4mm solid #F59E0B',
          padding: '0.3mm 2.5mm',
          display: 'flex',
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          direction: 'rtl',
          boxSizing: 'border-box'
        }}
      >
        <span
          style={{
            fontSize: '6.5pt',
            fontWeight: 600,
            color: '#FEF08A',
            lineHeight: 1.6,
            whiteSpace: 'nowrap',
            overflow: 'visible',
            letterSpacing: 'normal',
            wordSpacing: 'normal'
          }}
        >
          معتمد من قسم التشغيل والمتابعة
        </span>

        <span
          style={{
            fontSize: '6.5pt',
            fontWeight: 400,
            color: '#FFFFFF',
            lineHeight: 1.6,
            whiteSpace: 'nowrap',
            overflow: 'visible',
            letterSpacing: 'normal',
            wordSpacing: 'normal'
          }}
        >
          موسم 1448 هـ - 2027م
        </span>
      </div>

      {/* Preview-only overflow warning badge */}
      {showPreviewWarnings && overflowIssues.length > 0 && (
        <div
          className="print:hidden"
          style={{
            position: 'absolute',
            top: '1mm',
            left: '1mm',
            backgroundColor: '#DC2626',
            color: '#FFFFFF',
            fontSize: '6.5pt',
            fontWeight: 600,
            lineHeight: 1.6,
            padding: '0.2mm 1.5mm',
            borderRadius: '0.8mm',
            zIndex: 10,
            pointerEvents: 'none'
          }}
        >
          تجاوز نص: {overflowIssues.join('، ')}
        </div>
      )}
    </div>
  );
};

interface A4PrintSheetProps {
  pageDrivers: CompanyDriver[];
  mode: 'single' | 'sheet';
  isLastPage: boolean;
  workers: Worker[];
  qrCodeUrls: Record<string, string>;
  activeLogo: string;
  showPreviewWarnings?: boolean;
  recheckTick?: number;
  namePtMap?: Record<string, number>;
  fieldSizesMap?: Record<string, FieldFontSizes>;
  onNamePtDetected?: (driverId: string, pt: number) => void;
  onFieldSizesDetected?: (driverId: string, sizes: FieldFontSizes) => void;
  onOverflowDetected?: (driverId: string, issues: string[]) => void;
}

const A4PrintSheet: React.FC<A4PrintSheetProps> = ({
  pageDrivers,
  mode,
  isLastPage,
  workers,
  qrCodeUrls,
  activeLogo,
  showPreviewWarnings = false,
  recheckTick = 0,
  namePtMap,
  fieldSizesMap,
  onNamePtDetected,
  onFieldSizesDetected,
  onOverflowDetected
}) => {
  return (
    <div
      className="a4-print-page"
      style={{
        width: '210mm',
        height: '297mm',
        minWidth: '210mm',
        maxWidth: '210mm',
        minHeight: '297mm',
        maxHeight: '297mm',
        backgroundColor: '#FFFFFF',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        overflow: 'hidden',
        pageBreakAfter: isLastPage ? 'auto' : 'always',
        breakAfter: isLastPage ? 'auto' : 'page',
        WebkitPrintColorAdjust: 'exact',
        printColorAdjust: 'exact'
      }}
    >
      {mode === 'single' ? (
        pageDrivers[0] ? (
          <div
            style={{
              position: 'relative',
              width: '85mm',
              height: '55mm',
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
              overflow: 'visible'
            }}
          >
            <CropMarks />
            <DriverIdCard
              driver={pageDrivers[0]}
              workers={workers}
              qrUrl={qrCodeUrls[pageDrivers[0].id]}
              activeLogo={activeLogo}
              showPreviewWarnings={showPreviewWarnings}
              recheckTick={recheckTick}
              forceNamePt={namePtMap?.[pageDrivers[0].id]}
              forceFieldSizes={fieldSizesMap?.[pageDrivers[0].id]}
              onNamePtDetected={onNamePtDetected}
              onFieldSizesDetected={onFieldSizesDetected}
              onOverflowDetected={onOverflowDetected}
            />
          </div>
        ) : null
      ) : (
        <div
          dir="rtl"
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 85mm)',
            gridTemplateRows: 'repeat(4, 55mm)',
            columnGap: '6mm',
            rowGap: '8mm',
            width: '176mm',
            height: '244mm',
            direction: 'rtl',
            boxSizing: 'border-box'
          }}
        >
          {pageDrivers.slice(0, CARDS_PER_PAGE).map(driver => (
            <div
              key={driver.id}
              style={{
                position: 'relative',
                width: '85mm',
                height: '55mm',
                breakInside: 'avoid',
                pageBreakInside: 'avoid',
                overflow: 'visible'
              }}
            >
              <CropMarks />
              <DriverIdCard
                driver={driver}
                workers={workers}
                qrUrl={qrCodeUrls[driver.id]}
                activeLogo={activeLogo}
                showPreviewWarnings={showPreviewWarnings}
                recheckTick={recheckTick}
                forceNamePt={namePtMap?.[driver.id]}
                forceFieldSizes={fieldSizesMap?.[driver.id]}
                onNamePtDetected={onNamePtDetected}
                onFieldSizesDetected={onFieldSizesDetected}
                onOverflowDetected={onOverflowDetected}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const DriverCardPrintModal: React.FC<DriverCardPrintModalProps> = ({
  isOpen,
  onClose,
  drivers = [],
  workers = [],
  initialSelectedDriver = null
}) => {
  const [mode, setMode] = useState<'single' | 'sheet'>(
    initialSelectedDriver ? 'single' : 'sheet'
  );
  const [selectedSerialInput, setSelectedSerialInput] = useState<string>('');
  const [selectedDriverId, setSelectedDriverId] = useState<string>('');
  const [sheetSelectedIds, setSheetSelectedIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClassification, setFilterClassification] = useState<string>('all');
  const [qrCodeUrls, setQrCodeUrls] = useState<Record<string, string>>({});

  const [namePtMap, setNamePtMap] = useState<Record<string, number>>({});
  const [fieldSizesMap, setFieldSizesMap] = useState<Record<string, FieldFontSizes>>({});
  const [overflowWarningsMap, setOverflowWarningsMap] = useState<Record<string, string[]>>({});
  const [recheckTick, setRecheckTick] = useState(0);

  const [previewScale, setPreviewScale] = useState<number>(0.7);
  const [currentPreviewPage, setCurrentPreviewPage] = useState<number>(1);
  const [printTipMessage, setPrintTipMessage] = useState<string | null>(null);

  const previewViewportRef = useRef<HTMLDivElement>(null);
  const pageRefs = useRef<(HTMLDivElement | null)[]>([]);
  const qrUrlsRef = useRef<Record<string, string>>({});
  qrUrlsRef.current = qrCodeUrls;

  const wasOpenRef = useRef(false);
  const sortedDriversRef = useRef<CompanyDriver[]>([]);

  const { logoURL } = useLogo();
  const activeLogo = logoURL || DEFAULT_LOGO;

  const sortedDrivers = useMemo(() => {
    return [...drivers].sort((a, b) => {
      const sA = Number(a.serialNumber) || 0;
      const sB = Number(b.serialNumber) || 0;
      return sA - sB;
    });
  }, [drivers]);
  sortedDriversRef.current = sortedDrivers;

  // Initialize selection only when modal opens
  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setOverflowWarningsMap({});
      setNamePtMap({});
      setFieldSizesMap({});
      setCurrentPreviewPage(1);
      setPrintTipMessage(null);

      const list = sortedDriversRef.current;
      if (initialSelectedDriver) {
        setMode('single');
        setSelectedDriverId(initialSelectedDriver.id);
        setSelectedSerialInput(String(initialSelectedDriver.serialNumber || ''));
        setSheetSelectedIds([initialSelectedDriver.id]);
      } else {
        setMode('sheet');
        if (list.length > 0) {
          const first = list[0];
          setSelectedDriverId(first.id);
          setSelectedSerialInput(String(first.serialNumber || ''));
          setSheetSelectedIds(list.map(d => d.id));
        } else {
          setSheetSelectedIds([]);
        }
      }
    }
    wasOpenRef.current = isOpen;
  }, [isOpen, initialSelectedDriver]);

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

  const currentSingleDriver =
    sortedDrivers.find(d => d.id === selectedDriverId) || sortedDrivers[0];

  const currentSheetDrivers = useMemo(() => {
    const selectedSet = new Set(sheetSelectedIds);
    return sortedDrivers.filter(d => selectedSet.has(d.id));
  }, [sortedDrivers, sheetSelectedIds]);

  const pages = useMemo(() => {
    if (mode === 'single') {
      return currentSingleDriver ? [[currentSingleDriver]] : [];
    }
    return chunkDrivers(currentSheetDrivers, CARDS_PER_PAGE);
  }, [mode, currentSingleDriver, currentSheetDrivers]);

  const totalPages = pages.length;

  useEffect(() => {
    pageRefs.current = pageRefs.current.slice(0, pages.length);
    setCurrentPreviewPage(prev => (pages.length === 0 ? 1 : Math.min(Math.max(1, prev), pages.length)));
  }, [pages.length]);

  // Generate QR codes
  useEffect(() => {
    if (!isOpen) return;
    const driversToEncode =
      mode === 'single'
        ? currentSingleDriver
          ? [currentSingleDriver]
          : []
        : currentSheetDrivers;

    let cancelled = false;
    driversToEncode.forEach(async driver => {
      if (qrUrlsRef.current[driver.id]) return;

      const effType = resolveDriverType(driver);
      const classif = getDriverClassification(driver, workers);
      const isResident = effType === 'مقيم';
      const idLabel = isResident ? 'رقم الإقامة' : 'رقم الحدود';
      const rawId =
        (isResident ? driver.iqamaNumber : driver.borderNumber) ||
        driver.iqamaNumber ||
        driver.borderNumber ||
        '';
      const idVal = rawId || '—';

      const payload = [
        'شركة درة المنورة للنقليات - DMTC',
        `سائق معتمد: ${driver.fullName}`,
        `${idLabel}: ${idVal}`,
        `مسلسل: #${String(driver.serialNumber || '1').padStart(3, '0')} | ${effType} - ${classif}`,
        `الجوال: ${driver.mobileNumber || 'غير مسجل'}`,
        driver.busNumber ? `الحافلة: #${driver.busNumber}` : null,
        'موسم 1448 هـ - 2027م (معتمد رسمياً)'
      ]
        .filter(Boolean)
        .join('\n');

      try {
        const url = await QRCode.toDataURL(payload, {
          width: 360,
          margin: 0,
          color: {
            dark: '#000000',
            light: '#FFFFFF'
          },
          errorCorrectionLevel: 'M'
        });
        if (!cancelled) {
          setQrCodeUrls(prev => (prev[driver.id] ? prev : { ...prev, [driver.id]: url }));
        }
      } catch (err) {
        console.error('Failed to generate QR for driver', driver.id, err);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [isOpen, mode, currentSingleDriver, currentSheetDrivers, workers]);

  // Responsive A4 preview scaling
  useEffect(() => {
    if (!isOpen) return;
    const el = previewViewportRef.current;
    if (!el) return;

    const updateScale = () => {
      const availableW = Math.max(260, el.clientWidth - 32);
      const nextScale = Math.min(0.85, availableW / A4_WIDTH_PX);
      setPreviewScale(nextScale);
    };

    updateScale();
    const observer = new ResizeObserver(updateScale);
    observer.observe(el);
    return () => observer.disconnect();
  }, [isOpen]);

  const filteredList = useMemo(() => {
    return sortedDrivers.filter(d => {
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
  }, [sortedDrivers, searchTerm, filterClassification, workers]);

  const toggleSheetDriver = (id: string) => {
    setSheetSelectedIds(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const selectAllFiltered = () => {
    setSheetSelectedIds(filteredList.map(d => d.id));
  };

  const clearSelection = () => {
    setSheetSelectedIds([]);
  };

  const selectFirstEight = () => {
    setSheetSelectedIds(filteredList.slice(0, CARDS_PER_PAGE).map(d => d.id));
  };

  const handleNamePtDetected = useCallback((driverId: string, pt: number) => {
    setNamePtMap(prev => {
      if (prev[driverId] === pt) return prev;
      return { ...prev, [driverId]: pt };
    });
  }, []);

  const handleFieldSizesDetected = useCallback((driverId: string, sizes: FieldFontSizes) => {
    setFieldSizesMap(prev => {
      const existing = prev[driverId];
      if (
        existing &&
        existing.iqama === sizes.iqama &&
        existing.nationality === sizes.nationality &&
        existing.bus === sizes.bus
      ) {
        return prev;
      }
      return { ...prev, [driverId]: sizes };
    });
  }, []);

  const handleOverflowDetected = useCallback((driverId: string, issues: string[]) => {
    setOverflowWarningsMap(prev => {
      if (issues.length === 0) {
        if (!prev[driverId]) return prev;
        const next = { ...prev };
        delete next[driverId];
        return next;
      }
      const existing = prev[driverId];
      if (
        existing &&
        existing.length === issues.length &&
        existing.every((v, i) => v === issues[i])
      ) {
        return prev;
      }
      return { ...prev, [driverId]: issues };
    });
  }, []);

  const activeDriverIdsSet = useMemo(() => {
    const ids = new Set<string>();
    pages.forEach(page => page.forEach(d => ids.add(d.id)));
    return ids;
  }, [pages]);

  const activeOverflowWarnings = useMemo(() => {
    const list: { driver: CompanyDriver; issues: string[]; pageNumber: number }[] = [];
    pages.forEach((pageDrivers, pIdx) => {
      pageDrivers.forEach(driver => {
        const issues = overflowWarningsMap[driver.id];
        if (issues && issues.length > 0 && activeDriverIdsSet.has(driver.id)) {
          list.push({ driver, issues, pageNumber: pIdx + 1 });
        }
      });
    });
    return list;
  }, [pages, overflowWarningsMap, activeDriverIdsSet]);

  const jumpToPage = (pageNum: number) => {
    if (totalPages === 0) return;
    const target = Math.min(Math.max(1, pageNum), totalPages);
    setCurrentPreviewPage(target);
    pageRefs.current[target - 1]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handlePreviewScroll = () => {
    const container = previewViewportRef.current;
    if (!container || pages.length <= 1) return;
    const containerTop = container.getBoundingClientRect().top;
    let closestIdx = 0;
    let closestDist = Infinity;
    pageRefs.current.forEach((node, idx) => {
      if (!node) return;
      const dist = Math.abs(node.getBoundingClientRect().top - containerTop);
      if (dist < closestDist) {
        closestDist = dist;
        closestIdx = idx;
      }
    });
    setCurrentPreviewPage(closestIdx + 1);
  };

  const triggerVectorPrint = async () => {
    if (pages.length === 0) return;
    setPrintTipMessage(
      'في نافذة الطباعة: Margins = None، Scale = 100، وأزل Headers and footers.'
    );
    await nextAnimationFrame();
    await nextAnimationFrame();
    setTimeout(() => {
      window.print();
    }, 120);
  };

  const handleRecheck = () => {
    setOverflowWarningsMap({});
    setRecheckTick(t => t + 1);
  };

  if (!isOpen) return null;

  return (
    <>
      {/* Dedicated Print Styles + Vector Print Portal */}
      <style>{`
        #driver-cards-print-portal {
          display: none;
        }
        @media print {
          @page {
            size: A4 portrait;
            margin: 0;
          }
          html, body {
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            background-image: none !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          #root {
            display: none !important;
          }
          #driver-cards-print-portal {
            display: block !important;
            position: static !important;
            width: 210mm !important;
            margin: 0 !important;
            padding: 0 !important;
            background: #FFFFFF !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {typeof document !== 'undefined' &&
        createPortal(
          <div id="driver-cards-print-portal" dir="rtl">
            {pages.map((pageDrivers, idx) => (
              <A4PrintSheet
                key={`print-page-${idx}`}
                pageDrivers={pageDrivers}
                mode={mode}
                isLastPage={idx === pages.length - 1}
                workers={workers}
                qrCodeUrls={qrCodeUrls}
                activeLogo={activeLogo}
                showPreviewWarnings={false}
                namePtMap={namePtMap}
                fieldSizesMap={fieldSizesMap}
              />
            ))}
          </div>,
          document.body
        )}

      {/* Modal UI */}
      <div
        className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-[9999] flex items-center justify-center p-3 sm:p-5 overflow-y-auto"
        dir="rtl"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.97, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.97, y: 10 }}
          transition={{ duration: 0.16 }}
          className="bg-surface text-text-main rounded-2xl border border-border shadow-2xl w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden"
          dir="rtl"
        >
          {/* Top Modal Header */}
          <div className="px-5 py-4 border-b border-border flex items-center justify-between gap-4 shrink-0">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-primary-light text-primary flex items-center justify-center shrink-0">
                <Printer className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base sm:text-lg font-bold text-text-main truncate">
                  طباعة بطاقات السائقين المعتمدة
                </h2>
                <p className="text-xs font-semibold text-text-muted truncate mt-0.5">
                  ورق A4 عمودي · 8 بطاقات في الصفحة · مقاس البطاقة 85mm × 55mm
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label="إغلاق"
              className="min-w-[44px] min-h-[44px] inline-flex items-center justify-center rounded-xl text-text-muted hover:text-text-main hover:bg-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Main Workspace */}
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row overflow-hidden">
            {/* Right Sidebar: Driver Selection */}
            <aside className="w-full lg:w-80 shrink-0 border-b lg:border-b-0 lg:border-e border-border bg-background/40 p-4 flex flex-col gap-3 overflow-y-auto max-h-[38vh] lg:max-h-none">
              <div className="grid grid-cols-2 gap-1 p-1 bg-background border border-border rounded-xl">
                <button
                  type="button"
                  onClick={() => setMode('sheet')}
                  className={`min-h-[40px] px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    mode === 'sheet'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  <Layers className="w-4 h-4 shrink-0" />
                  <span>مجمّعة (8/صفحة)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode('single')}
                  className={`min-h-[40px] px-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                    mode === 'single'
                      ? 'bg-primary text-white shadow-2xs'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                >
                  <IdCard className="w-4 h-4 shrink-0" />
                  <span>بطاقة مفردة</span>
                </button>
              </div>

              {mode === 'single' ? (
                <div className="space-y-3">
                  <div>
                    <label className="text-xs font-bold text-text-main block mb-1.5">
                      الرقم التسلسلي للسائق
                    </label>
                    <input
                      type="number"
                      min="1"
                      placeholder="مثال: 1..."
                      value={selectedSerialInput}
                      onChange={e => handleSerialSearch(e.target.value)}
                      className="w-full min-h-[44px] px-3 bg-surface border border-border focus:border-primary rounded-xl outline-none text-sm font-semibold tabular-nums"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-text-muted block mb-1.5">
                      أو اختر السائق من القائمة
                    </label>
                    <select
                      value={selectedDriverId}
                      onChange={e => {
                        setSelectedDriverId(e.target.value);
                        const d = sortedDrivers.find(item => item.id === e.target.value);
                        if (d) setSelectedSerialInput(String(d.serialNumber || ''));
                      }}
                      className="w-full min-h-[44px] px-3 bg-surface border border-border rounded-xl text-xs font-semibold outline-none focus:border-primary"
                    >
                      {sortedDrivers.map(d => (
                        <option key={d.id} value={d.id}>
                          #{d.serialNumber || 1} — {d.fullName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-text-main">تحديد السائقين</span>
                    <span className="font-bold text-primary tabular-nums">
                      {currentSheetDrivers.length} سائق · {totalPages} صفحة
                    </span>
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={selectAllFiltered}
                      className="min-h-[38px] px-2 bg-surface border border-border hover:border-primary text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      تحديد الكل
                    </button>
                    <button
                      type="button"
                      onClick={selectFirstEight}
                      className="min-h-[38px] px-2 bg-surface border border-border hover:border-primary text-xs font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      أول 8
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="min-h-[38px] px-2 bg-surface border border-border hover:border-red-400 text-xs font-bold text-text-muted hover:text-red-600 rounded-xl transition-colors cursor-pointer"
                    >
                      مسح
                    </button>
                  </div>

                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute right-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
                      <input
                        type="text"
                        placeholder="ابحث بالاسم، الرقم، الإقامة..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full min-h-[40px] pr-9 pl-3 bg-surface border border-border focus:border-primary rounded-xl text-xs outline-none"
                      />
                    </div>
                    <select
                      value={filterClassification}
                      onChange={e => setFilterClassification(e.target.value)}
                      className="w-full min-h-[40px] px-3 bg-surface border border-border rounded-xl text-xs font-semibold outline-none"
                    >
                      <option value="all">كل التصنيفات</option>
                      <option value="نقل عمال">نقل عمال</option>
                      <option value="النقل المدرسي">النقل المدرسي</option>
                      <option value="عمرة">عمرة</option>
                      <option value="النقل الدولي سوريا">النقل الدولي سوريا</option>
                      <option value="النقل الدولي اليمن">النقل الدولي اليمن</option>
                    </select>
                  </div>

                  <div className="flex-1 min-h-[160px] overflow-y-auto space-y-1.5 pe-0.5 custom-scrollbar">
                    {filteredList.map(driver => {
                      const isChecked = sheetSelectedIds.includes(driver.id);
                      const driverClass = getDriverClassification(driver, workers);
                      const selectedPos = isChecked
                        ? currentSheetDrivers.findIndex(d => d.id === driver.id) + 1
                        : 0;
                      const cardPageNum =
                        selectedPos > 0 ? Math.floor((selectedPos - 1) / CARDS_PER_PAGE) + 1 : 0;

                      return (
                        <button
                          key={driver.id}
                          type="button"
                          onClick={() => toggleSheetDriver(driver.id)}
                          className={`w-full p-2.5 rounded-xl border text-xs flex items-center justify-between gap-2 text-right transition-colors cursor-pointer ${
                            isChecked
                              ? 'bg-primary-light border-primary/50 text-primary font-bold'
                              : 'bg-surface border-border text-text-main hover:bg-background font-semibold'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span
                              className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                isChecked
                                  ? 'bg-primary border-primary text-white'
                                  : 'border-slate-300 dark:border-slate-600'
                              }`}
                            >
                              {isChecked && <Check className="w-3 h-3" />}
                            </span>
                            <span
                              dir="ltr"
                              className="text-xs font-semibold text-text-muted tabular-nums shrink-0"
                            >
                              #{driver.serialNumber || 1}
                            </span>
                            <span className="truncate">{driver.fullName}</span>
                          </div>
                          <span className="text-xs text-text-muted shrink-0 truncate max-w-[90px]">
                            {cardPageNum > 0 ? `ص${cardPageNum} · ${driverClass}` : driverClass}
                          </span>
                        </button>
                      );
                    })}
                    {filteredList.length === 0 && (
                      <p className="text-center text-xs text-text-muted py-6">
                        لا يوجد سائقون مطابقون للبحث
                      </p>
                    )}
                  </div>
                </>
              )}
            </aside>

            {/* Left Canvas: Print Preview */}
            <div className="flex-1 min-w-0 flex flex-col bg-slate-100 dark:bg-slate-950/60 overflow-hidden">
              {/* Preview Toolbar: Page Counter + "حفظ PDF" + "طباعة" */}
              <div className="px-4 py-3 bg-surface border-b border-border flex flex-wrap items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs sm:text-sm font-bold text-text-main tabular-nums">
                    صفحة {totalPages === 0 ? 0 : currentPreviewPage} من {totalPages}
                  </span>

                  {totalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={currentPreviewPage <= 1}
                        onClick={() => jumpToPage(currentPreviewPage - 1)}
                        aria-label="الصفحة السابقة"
                        className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-border bg-surface text-text-main disabled:opacity-40 hover:bg-background cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={currentPreviewPage >= totalPages}
                        onClick={() => jumpToPage(currentPreviewPage + 1)}
                        aria-label="الصفحة التالية"
                        className="min-w-[36px] min-h-[36px] inline-flex items-center justify-center rounded-lg border border-border bg-surface text-text-main disabled:opacity-40 hover:bg-background cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={totalPages === 0}
                    onClick={triggerVectorPrint}
                    className="min-h-[44px] px-4 inline-flex items-center gap-2 bg-surface hover:bg-background disabled:opacity-45 text-text-main border border-border rounded-xl text-xs font-bold transition-colors cursor-pointer"
                  >
                    <FileDown className="w-4 h-4 text-primary" />
                    <span>حفظ PDF</span>
                  </button>

                  <button
                    type="button"
                    disabled={totalPages === 0}
                    onClick={triggerVectorPrint}
                    className="min-h-[44px] px-5 inline-flex items-center gap-2 bg-primary hover:bg-primary-hover disabled:opacity-45 text-white rounded-xl text-xs font-bold transition-colors shadow-sm cursor-pointer"
                  >
                    <Printer className="w-4 h-4" />
                    <span>طباعة</span>
                  </button>
                </div>
              </div>

              {/* Short Print Settings Guidance Message */}
              {printTipMessage && (
                <div className="mx-4 mt-3 px-3.5 py-2.5 rounded-xl bg-primary-light border border-primary/30 text-primary text-xs font-bold flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-2">
                    <Info className="w-4 h-4 shrink-0" />
                    <span>{printTipMessage}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrintTipMessage(null)}
                    aria-label="إغلاق الرسالة"
                    className="p-1 rounded-lg hover:bg-primary/10 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}

              {/* Overflow Warning Banner (only shown if at least 1 card overflows) */}
              {activeOverflowWarnings.length > 0 && (
                <div className="mx-4 mt-3 p-3 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-300 dark:border-red-800 text-red-900 dark:text-red-200 text-xs space-y-2 shrink-0">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2 font-bold">
                      <AlertTriangle className="w-4 h-4 text-red-600 dark:text-red-400 shrink-0" />
                      <span>
                        نص أطول من المساحة المتاحة في {activeOverflowWarnings.length} بطاقة:
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleRecheck}
                      className="min-h-[34px] px-3 inline-flex items-center gap-1.5 rounded-lg bg-white dark:bg-red-900/50 border border-red-300 dark:border-red-700 text-red-800 dark:text-red-100 text-xs font-bold hover:bg-red-100/70 transition-colors cursor-pointer"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      <span>إعادة الفحص</span>
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {activeOverflowWarnings.map(({ driver, issues, pageNumber }) => (
                      <button
                        key={driver.id}
                        type="button"
                        onClick={() => jumpToPage(pageNumber)}
                        className="px-2.5 py-1 rounded-lg bg-white dark:bg-red-900/40 border border-red-200 dark:border-red-700 text-xs font-semibold hover:underline cursor-pointer"
                      >
                        {driver.fullName} ({issues.join('، ')}) — صفحة {pageNumber}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Scrollable A4 Preview Sheets */}
              <div
                ref={previewViewportRef}
                onScroll={handlePreviewScroll}
                className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col items-center gap-6"
              >
                {pages.length > 0 ? (
                  pages.map((pageDrivers, idx) => (
                    <div
                      key={`preview-page-${idx}`}
                      ref={el => {
                        pageRefs.current[idx] = el;
                      }}
                      className="flex flex-col items-center gap-2 shrink-0"
                    >
                      <span className="text-xs font-semibold text-text-muted tabular-nums">
                        صفحة {idx + 1} من {totalPages}
                      </span>
                      <div
                        dir="ltr"
                        style={{
                          width: `${A4_WIDTH_PX * previewScale}px`,
                          height: `${A4_HEIGHT_PX * previewScale}px`,
                          position: 'relative',
                          overflow: 'hidden',
                          borderRadius: '6px',
                          border: '1px solid #CBD5E1',
                          backgroundColor: '#FFFFFF'
                        }}
                      >
                        <div
                          style={{
                            width: '210mm',
                            height: '297mm',
                            transform: `scale(${previewScale})`,
                            transformOrigin: 'top left'
                          }}
                        >
                          <A4PrintSheet
                            pageDrivers={pageDrivers}
                            mode={mode}
                            isLastPage={idx === pages.length - 1}
                            workers={workers}
                            qrCodeUrls={qrCodeUrls}
                            activeLogo={activeLogo}
                            showPreviewWarnings={true}
                            recheckTick={recheckTick}
                            onNamePtDetected={handleNamePtDetected}
                            onFieldSizesDetected={handleFieldSizesDetected}
                            onOverflowDetected={handleOverflowDetected}
                          />
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="my-auto text-center py-12 px-4">
                    <p className="text-sm font-bold text-text-muted">
                      الرجاء تحديد سائق واحد على الأقل لمعاينة صفحة الطباعة
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
};
