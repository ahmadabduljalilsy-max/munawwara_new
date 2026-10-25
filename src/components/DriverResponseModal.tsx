import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  MapPin, 
  Bus as BusIcon, 
  User, 
  Hash, 
  Send, 
  CheckCircle2, 
  AlertCircle, 
  Copy, 
  Check, 
  ExternalLink,
  Navigation,
  FileText,
  Calendar,
  Sparkles,
  Search
} from 'lucide-react';
import type { CompanyDriver, DriverResponse, DriverResponseType, Bus } from '../types';

interface DriverResponseModalProps {
  isOpen: boolean;
  onClose: () => void;
  drivers: CompanyDriver[];
  buses?: Bus[];
  prefilledDriver?: CompanyDriver | null;
  onSave: (data: Omit<DriverResponse, 'id'>) => Promise<void>;
}

const RESPONSE_OPTIONS: {
  type: DriverResponseType;
  label: string;
  description: string;
  color: string;
  badgeClass: string;
  activeClass: string;
}[] = [
  {
    type: 'محايل عسير',
    label: 'محايل عسير',
    description: 'خط سير وردود منطقة محايل عسير والجنوب',
    color: '#059669',
    badgeClass: 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
    activeClass: 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-950/50 ring-2 ring-emerald-500/20 text-emerald-950 dark:text-emerald-200'
  },
  {
    type: 'ينبع',
    label: 'ينبع',
    description: 'خط سير وردود محافظة ينبع والساحل الغربي',
    color: '#0284c7',
    badgeClass: 'bg-sky-50 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
    activeClass: 'border-sky-500 bg-sky-50/80 dark:bg-sky-950/50 ring-2 ring-sky-500/20 text-sky-950 dark:text-sky-200'
  },
  {
    type: 'القصيم',
    label: 'القصيم',
    description: 'خط سير وردود منطقة القصيم وبريدة وعنيزة',
    color: '#d97706',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
    activeClass: 'border-amber-500 bg-amber-50/80 dark:bg-amber-950/50 ring-2 ring-amber-500/20 text-amber-950 dark:text-amber-200'
  },
  {
    type: 'الرياض',
    label: 'الرياض',
    description: 'خط سير وردود العاصمة والمنطقة الوسطى',
    color: '#7c3aed',
    badgeClass: 'bg-purple-50 text-purple-800 border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
    activeClass: 'border-purple-500 bg-purple-50/80 dark:bg-purple-950/50 ring-2 ring-purple-500/20 text-purple-950 dark:text-purple-200'
  },
  {
    type: 'الترددية',
    label: 'الترددية',
    description: 'خط سير وردود حافلات النقل الترددي والمحطات المتتابعة',
    color: '#0d9488',
    badgeClass: 'bg-teal-50 text-teal-800 border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
    activeClass: 'border-teal-500 bg-teal-50/80 dark:bg-teal-950/50 ring-2 ring-teal-500/20 text-teal-950 dark:text-teal-200'
  }
];

export const DriverResponseModal: React.FC<DriverResponseModalProps> = ({
  isOpen,
  onClose,
  drivers,
  buses = [],
  prefilledDriver,
  onSave
}) => {
  const [serialInput, setSerialInput] = useState<string>('');
  const [busNumber, setBusNumber] = useState<string>('');
  const [selectedResponse, setSelectedResponse] = useState<DriverResponseType>('محايل عسير');
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  // Helper to normalize bus numbers for comparison (converts Arabic digits, trims)
  const normalizeBusNum = (val: string) => {
    if (!val) return '';
    return val
      .toString()
      .trim()
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[^\w\d\u0600-\u06FF]/g, '')
      .toLowerCase();
  };

  // Check if entered bus exists in the fleet
  const matchedFleetBus = useMemo(() => {
    const trimmed = busNumber.trim();
    if (!trimmed || buses.length === 0) return null;
    const normalized = normalizeBusNum(trimmed);
    return buses.find(b => {
      const opNorm = normalizeBusNum(b.operationalNumber);
      const plateNorm = normalizeBusNum(b.plateNumber);
      return (opNorm && opNorm === normalized) || (plateNorm && plateNorm === normalized);
    }) || null;
  }, [busNumber, buses]);

  const isBusInvalid = Boolean(busNumber.trim() && buses.length > 0 && !matchedFleetBus);

  // Initialize or prefill
  useEffect(() => {
    if (prefilledDriver) {
      setSerialInput(String(prefilledDriver.serialNumber || ''));
      setBusNumber(prefilledDriver.busNumber || '');
    } else {
      setSerialInput('');
      setBusNumber('');
    }
    setSelectedResponse('محايل عسير');
    setNotes('');
    setError(null);
  }, [prefilledDriver, isOpen]);

  // Find matched driver based on entered serialNumber
  const matchedDriver = useMemo(() => {
    const sNum = parseInt(serialInput.trim(), 10);
    if (isNaN(sNum) || sNum <= 0) return null;
    return drivers.find(d => d.serialNumber === sNum) || null;
  }, [serialInput, drivers]);

  // When matched driver changes and busNumber is empty, prefill with driver's busNumber
  useEffect(() => {
    if (matchedDriver && !busNumber && matchedDriver.busNumber) {
      setBusNumber(matchedDriver.busNumber);
    }
  }, [matchedDriver]);

  if (!isOpen) return null;

  const handleCopyDirectLink = () => {
    const directUrl = `${window.location.origin}${window.location.pathname}?action=driver-response`;
    navigator.clipboard.writeText(directUrl);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const sNum = parseInt(serialInput.trim(), 10);
    if (isNaN(sNum) || sNum <= 0) {
      setError('يرجى كتابة الرقم المتسلسل للسائق بشكل صحيح (يبدأ من 1)');
      return;
    }

    if (!matchedDriver) {
      setError(`لم يتم العثور على سائق بالرقم المتسلسل (#${sNum}). يرجى التحقق من الرقم في قائمة السائقين.`);
      return;
    }

    if (!busNumber.trim()) {
      setError('يرجى كتابة رقم الحافلة');
      return;
    }

    // Strict fleet validation: bus must exist in fleet buses
    if (buses.length > 0 && !matchedFleetBus) {
      setError(`تنبيه: رقم الحافلة (${busNumber.trim()}) غير مسجل ضمن حافلات الأسطول المعتمدة. لا يقبل النظام تسجيل الرد إلا لحافلة تابعة للأسطول.`);
      return;
    }

    if (!selectedResponse) {
      setError('يرجى اختيار نوع الرد');
      return;
    }

    try {
      setLoading(true);
      await onSave({
        driverId: matchedDriver.id,
        driverSerialNumber: sNum,
        driverName: matchedDriver.fullName,
        busNumber: busNumber.trim(),
        responseType: selectedResponse,
        notes: notes.trim() || undefined,
        createdDate: new Date().toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit'
        })
      });

      onClose();
    } catch (err: any) {
      console.error('Failed to save driver response:', err);
      setError(err?.message || 'حدث خطأ أثناء حفظ الرد. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 my-auto"
          dir="rtl"
        >
          {/* Header Accent Bar */}
          <div className="h-2 w-full bg-gradient-to-r from-emerald-500 via-sky-500 to-primary shrink-0" />

          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-border bg-gradient-to-br from-primary/[0.04] to-transparent shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0">
                  <Navigation className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                      تسجيل حركة وردود
                    </span>
                    <span className="text-xs text-text-muted">مباشر إلى بطاقة السائق</span>
                  </div>
                  <h2 className="text-xl font-black text-slate-900 dark:text-white">
                    تسجيل رد سائق
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={handleCopyDirectLink}
                  className="px-2.5 py-1.5 bg-background border border-border text-text-muted hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold transition-all flex items-center gap-1 cursor-pointer shadow-2xs"
                  title="نسخ الرابط المباشر لنموذج تسجيل الردود"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-600">تم النسخ</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">نسخ الرابط</span>
                    </>
                  )}
                </button>

                <button
                  onClick={onClose}
                  className="p-2 text-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <p className="text-xs text-text-muted mt-2">
              اكتب الرقم المتسلسل للسائق ورقم الحافلة ونوع الرد ليتم تسجيله وتنزيله تلقائياً في تبويب "ردود السائق" ببطاقة السائق.
            </p>
          </div>

          {/* Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 overflow-y-auto space-y-5 flex-1">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-2xl flex items-center gap-2.5 text-xs font-bold text-rose-700 dark:text-rose-300"
              >
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{error}</span>
              </motion.div>
            )}

            {/* Input 1: Driver Serial Number */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Hash className="w-4 h-4 text-primary" />
                  <span>الرقم المتسلسل للسائق</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-normal text-text-muted">
                  يبدأ من رقم ( 1 )
                </span>
              </label>

              <div className="relative">
                <input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="اكتب الرقم المتسلسل (مثال: 1 أو 2 أو 3...)"
                  value={serialInput}
                  onChange={(e) => setSerialInput(e.target.value)}
                  className="w-full pr-10 pl-4 py-3 bg-background border border-border focus:border-primary rounded-xl outline-none transition-all text-base font-mono font-bold shadow-xs"
                />
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none font-mono font-bold text-sm">
                  #
                </div>
              </div>

              {/* Live Driver Preview Card */}
              {matchedDriver ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.98 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className="p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/70 dark:bg-emerald-950/30 dark:border-emerald-800/60 flex items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-sm shrink-0 shadow-2xs">
                      #{matchedDriver.serialNumber}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-800 dark:text-emerald-300">
                          تم التحقق من السائق:
                        </span>
                        <span className="text-[10px] px-2 py-0.2 rounded-full font-bold bg-white/80 dark:bg-emerald-900/60 text-emerald-900 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-700">
                          {matchedDriver.status || 'نشط'}
                        </span>
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white truncate">
                        {matchedDriver.fullName}
                      </div>
                      <div className="text-[11px] text-text-muted flex items-center gap-2 mt-0.5">
                        <span>الجنسية: {matchedDriver.nationality || 'غير محدد'}</span>
                        {matchedDriver.busNumber && (
                          <span className="text-sky-700 dark:text-sky-300 font-mono font-bold">
                            • حافلة: #{matchedDriver.busNumber}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                </motion.div>
              ) : serialInput.trim() ? (
                <div className="p-3 rounded-xl border border-amber-200 bg-amber-50/60 dark:bg-amber-950/30 text-amber-800 dark:text-amber-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
                  <span>لا يوجد سائق مسجل بهذا الرقم المتسلسل (#{serialInput.trim()}) حالياً.</span>
                </div>
              ) : (
                /* Driver Quick Helper Select */
                <div className="flex items-center gap-2 text-xs text-text-muted pt-0.5">
                  <span>أو اختر السائق مباشرة:</span>
                  <select
                    value=""
                    onChange={(e) => {
                      if (e.target.value) {
                        setSerialInput(e.target.value);
                      }
                    }}
                    className="text-xs py-1 px-2.5 bg-background border border-border rounded-lg outline-none font-medium cursor-pointer text-slate-800 dark:text-slate-200 max-w-[220px] truncate"
                  >
                    <option value="">-- قائمة سائقي الشركة ({drivers.length}) --</option>
                    {drivers.map(d => (
                      <option key={d.id} value={d.serialNumber || ''}>
                        #{d.serialNumber || '?'} - {d.fullName}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Input 2: Bus Number */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <BusIcon className="w-4 h-4 text-sky-600" />
                  <span>رقم الحافلة</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-normal text-text-muted">
                  يجب أن تكون من ضمن حافلات الأسطول
                </span>
              </label>

              <div className="relative">
                <input
                  type="text"
                  required
                  list="fleet-buses-modal"
                  placeholder="اكتب رقم الحافلة (مثال: 104 أو 501)"
                  value={busNumber}
                  onChange={(e) => setBusNumber(e.target.value)}
                  className={`w-full pr-10 pl-4 py-2.5 bg-background border rounded-xl outline-none transition-all text-sm font-mono font-bold shadow-xs ${
                    isBusInvalid 
                      ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-700 dark:text-rose-300' 
                      : matchedFleetBus 
                      ? 'border-emerald-500 ring-1 ring-emerald-500/20 text-emerald-800 dark:text-emerald-300' 
                      : 'border-border focus:border-primary'
                  }`}
                />
                <BusIcon className="absolute right-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted pointer-events-none" />
                <datalist id="fleet-buses-modal">
                  {buses.map(b => (
                    <option key={b.id} value={b.operationalNumber}>
                      حافلة #{b.operationalNumber} - لوحة: {b.plateNumber} ({b.category || 'أسطول'})
                    </option>
                  ))}
                </datalist>
              </div>

              {/* Real-time Fleet Validation Alert */}
              {isBusInvalid && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 rounded-xl border border-rose-200 bg-rose-50/90 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2 font-medium"
                >
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                  <span>
                    تنبيه: رقم الحافلة ({busNumber}) غير مسجل في حافلات الأسطول! لا يقبل النظام تسجيل الرد إلا لحافلة معتمدة من الأسطول.
                  </span>
                </motion.div>
              )}

              {/* Verified Fleet Bus Badge */}
              {matchedFleetBus && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-2.5 rounded-xl border border-emerald-200 bg-emerald-50/80 dark:bg-emerald-950/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="truncate">
                      حافلة معتمدة في الأسطول: <strong className="font-mono font-bold">#{matchedFleetBus.operationalNumber}</strong> (لوحة: {matchedFleetBus.plateNumber} • {matchedFleetBus.category || 'أسطول'})
                    </span>
                  </div>
                </motion.div>
              )}

              {/* Quick buses fleet chips and selector */}
              {buses.length > 0 && (
                <div className="space-y-1.5 pt-0.5">
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span className="text-[10px] font-bold shrink-0">أو اختر من الأسطول:</span>
                    <select
                      value=""
                      onChange={(e) => {
                        if (e.target.value) setBusNumber(e.target.value);
                      }}
                      className="text-xs py-1 px-2.5 bg-background border border-border rounded-lg outline-none font-medium cursor-pointer text-slate-800 dark:text-slate-200 max-w-[240px] truncate"
                    >
                      <option value="">-- اختر حافلة من الأسطول ({buses.length}) --</option>
                      {buses.map(b => (
                        <option key={b.id} value={b.operationalNumber}>
                          حافلة #{b.operationalNumber} - {b.plateNumber}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                    <span className="text-[10px] text-text-muted shrink-0 font-bold">سريع:</span>
                    {buses.slice(0, 10).map(b => (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => setBusNumber(b.operationalNumber)}
                        className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0 transition-colors cursor-pointer ${
                          busNumber === b.operationalNumber
                            ? 'bg-sky-600 text-white border-sky-600'
                            : 'bg-background hover:bg-slate-100 dark:hover:bg-slate-800 border-border text-text-muted'
                        }`}
                      >
                        #{b.operationalNumber}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Input 3: Response Type (Strictly 4 choices) */}
            <div className="space-y-2.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4 text-primary" />
                  <span>نوع الرد</span>
                  <span className="text-rose-500">*</span>
                </span>
                <span className="text-[11px] font-normal text-text-muted">
                  اختر من الردود المعتمدة (5 خيارات)
                </span>
              </label>

              <div className="grid grid-cols-2 gap-2.5">
                {RESPONSE_OPTIONS.map(opt => {
                  const isSelected = selectedResponse === opt.type;
                  return (
                    <button
                      key={opt.type}
                      type="button"
                      onClick={() => setSelectedResponse(opt.type)}
                      className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between gap-2 cursor-pointer ${
                        opt.type === 'الترددية' ? 'col-span-2' : ''
                      } ${
                        isSelected 
                          ? opt.activeClass 
                          : 'bg-background border-border hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-black text-slate-900 dark:text-white">
                          {opt.label}
                        </span>
                        <span 
                          className="w-3 h-3 rounded-full shrink-0" 
                          style={{ backgroundColor: opt.color }} 
                        />
                      </div>
                      <p className="text-[10px] text-text-muted leading-tight">
                        {opt.description}
                      </p>
                      {isSelected && (
                        <div className="flex items-center gap-1 text-[10px] font-black text-primary mt-1">
                          <Check className="w-3.5 h-3.5" />
                          <span>تم الاختيار</span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Input 4: Notes (Optional) */}
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-text-muted" />
                <span>ملاحظات إضافية عن الرد (اختياري)</span>
              </label>
              <textarea
                rows={2}
                placeholder="أية ملاحظات إضافية عن الرحلة، المسار، أو الوقت..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-background border border-border focus:border-primary rounded-xl outline-none transition-all text-xs resize-none"
              />
            </div>

            {/* Direct Link Info Banner */}
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-border rounded-xl flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <ExternalLink className="w-4 h-4 text-primary shrink-0" />
                <span className="text-[11px] text-text-muted truncate">
                  يمكن فتح هذا النموذج مباشرة في أي وقت عبر الرابط الخاص
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyDirectLink}
                className="text-[11px] text-primary font-bold hover:underline shrink-0 flex items-center gap-1"
              >
                {copiedLink ? 'تم نسخ الرابط!' : 'نسخ الرابط المباشر'}
              </button>
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-3 border-t border-border">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 border border-border rounded-xl text-xs font-bold text-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              >
                إلغاء
              </button>

              <button
                type="submit"
                disabled={loading || !matchedDriver || !busNumber.trim() || isBusInvalid}
                className="px-6 py-2.5 bg-primary hover:bg-primary-hover disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-xl text-xs font-bold transition-all shadow-sm shadow-primary/20 flex items-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{loading ? 'جاري التسجيل...' : 'تسجيل الرد وتنزيله في بطاقة السائق'}</span>
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
