import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Bus as BusIcon,
  Calendar,
  Copy,
  Check,
  Edit,
  Trash2,
  Clock,
  Building2,
  MapPin,
  Briefcase,
  History
} from 'lucide-react';
import { Worker } from '../types';
import { differenceInDays, parseISO, formatDistanceStrict } from 'date-fns';
import { ar } from 'date-fns/locale';
import { normalizeBusLocation } from '../lib/locationUtils';
import { useQuery } from '@tanstack/react-query';
import { fetchWorkerDetails, queryKeys } from '../lib/firestoreQueries';

interface WorkerDetailsModalProps {
  worker: Worker | null;
  isOpen: boolean;
  onClose: () => void;
  canEdit?: boolean;
  onEdit?: (worker: Worker) => void;
  isAdmin?: boolean;
  onDelete?: (worker: Worker) => void;
}

const formatWorkerName = (name?: string) => {
  if (!name) return '';
  const cleaned = name.replace(/(?:^|\s)أسد(?:\s|$)/g, ' ').trim();
  return cleaned.replace(/[A-Za-z]+/g, (word) =>
    word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()
  );
};

const formatDateUnified = (dateStr?: string) => {
  if (!dateStr) return '';
  const trimmed = String(dateStr).trim();
  if (!trimmed) return '';
  const ymdMatch = trimmed.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
  if (ymdMatch) {
    const [, y, m, d] = ymdMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})$/);
  if (dmyMatch) {
    const [, d, m, y] = dmyMatch;
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    const y = parsed.getFullYear();
    const m = String(parsed.getMonth() + 1).padStart(2, '0');
    const d = String(parsed.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return trimmed;
};

const sanitizeLabel = (val?: string) => {
  return (val || '').replace(/(?:^|\s)أسد(?:\s|$)/g, ' ').trim();
};

export const WorkerDetailsModal: React.FC<WorkerDetailsModalProps> = ({
  worker,
  isOpen,
  onClose,
  canEdit = false,
  onEdit,
  isAdmin = false,
  onDelete
}) => {
  const [copiedField, setCopiedField] = useState<'mobile' | 'iqama' | null>(null);

  const { data: fullWorker } = useQuery({
    queryKey: queryKeys.workerDetail(worker?.id || ''),
    queryFn: () => fetchWorkerDetails(worker!.id),
    enabled: isOpen && Boolean(worker?.id),
    initialData: worker ?? undefined,
  });

  const activeWorker = fullWorker || worker;

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!activeWorker) return null;

  const today = new Date().toISOString().split('T')[0];

  const calculateDays = (start: string, end: string) => {
    try {
      if (!start) return 0;
      const startDate = parseISO(start);
      const endDate = end ? parseISO(end) : parseISO(today);
      const days = differenceInDays(endDate, startDate);
      return days > 0 ? days : 0;
    } catch {
      return 0;
    }
  };

  const calculateFriendlyDuration = (start: string, end: string) => {
    try {
      if (!start) return '';
      const startDate = parseISO(start);
      const endDate = end ? parseISO(end) : parseISO(today);
      return formatDistanceStrict(endDate, startDate, { locale: ar });
    } catch {
      return '';
    }
  };

  const getRemainingDays = (endDate: string) => {
    if (!endDate) return null;
    try {
      const targetDate = parseISO(endDate);
      const todayDate = parseISO(today);
      return differenceInDays(targetDate, todayDate);
    } catch {
      return null;
    }
  };

  const handleCopy = (value: string, field: 'mobile' | 'iqama') => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 1800);
  };

  const daysRemaining = getRemainingDays(activeWorker.endDate || '');
  const isTerminated = daysRemaining !== null && daysRemaining < 0;
  const isExpiringSoon = daysRemaining !== null && daysRemaining >= 0 && daysRemaining <= 30;
  const displayName = formatWorkerName(activeWorker.name);
  const iqamaVal = activeWorker.iqamaNumber || activeWorker.nationalId || '';
  const totalDays = calculateDays(activeWorker.startDate, activeWorker.endDate);
  const friendlyDuration = activeWorker.startDate ? calculateFriendlyDuration(activeWorker.startDate, activeWorker.endDate) : '';
  const categoryValue = sanitizeLabel(activeWorker.clientName);
  const companyValue = sanitizeLabel(activeWorker.recruitmentCompany);
  const workplaceValue = sanitizeLabel(normalizeBusLocation(activeWorker.workplace));
  const previousBusesList = activeWorker.previousBuses
    ? activeWorker.previousBuses.split(/[\s,،\-]+/).map(s => s.trim()).filter(Boolean)
    : [];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end" dir="rtl">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-[1px]"
          />

          {/* Side Drawer */}
          <motion.aside
            initial={{ x: '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: '-100%' }}
            transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="relative mr-auto w-full max-w-lg bg-surface border-r border-border shadow-2xl h-full flex flex-col z-10 text-text-main"
            aria-label="بطاقة العامل"
          >
            {/* Header */}
            <div className="px-6 py-5 border-b border-border flex items-start justify-between gap-4 shrink-0 bg-surface">
              <div className="min-w-0 space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-xl font-bold text-text-main leading-snug">
                    {displayName}
                  </h3>
                  {isTerminated && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-bold bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-800">
                      عقد منتهٍ
                    </span>
                  )}
                  {isExpiringSoon && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-xl text-xs font-bold bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
                      ينتهي خلال {daysRemaining === 0 ? 'اليوم' : `${daysRemaining} يوم`}
                    </span>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-text-muted tabular-nums">
                  {activeWorker.workerNumber && <span>الرقم الوظيفي: {activeWorker.workerNumber}</span>}
                  {activeWorker.workerNumber && iqamaVal && <span aria-hidden="true">·</span>}
                  {iqamaVal && <span>الإقامة: {iqamaVal}</span>}
                </div>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border border-border text-text-muted hover:text-text-main hover:bg-background transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                aria-label="إغلاق"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-background/40">
              {(isTerminated || isExpiringSoon) && (
                <div
                  className={`p-3.5 rounded-2xl border text-xs font-bold flex items-center gap-2.5 ${
                    isTerminated
                      ? 'bg-red-50 dark:bg-red-950/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
                      : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}
                >
                  <Clock className="w-4 h-4 shrink-0" />
                  <span>
                    {isTerminated
                      ? `انتهى العقد منذ ${Math.abs(daysRemaining || 0)} يوم (${formatDateUnified(activeWorker.endDate)})`
                      : `ينتهي العقد خلال ${daysRemaining} يوم (${formatDateUnified(activeWorker.endDate)})`}
                  </span>
                </div>
              )}

              {/* Primary Details Card */}
              <section className="bg-surface border border-border rounded-2xl shadow-xs divide-y divide-border">
                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-text-muted">رقم الجوال</p>
                    <p className="text-sm font-bold text-text-main tabular-nums mt-0.5" dir="ltr">
                      {activeWorker.mobileNumber || '—'}
                    </p>
                  </div>
                  {activeWorker.mobileNumber && (
                    <button
                      type="button"
                      onClick={() => handleCopy(activeWorker.mobileNumber, 'mobile')}
                      className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary-light rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      {copiedField === 'mobile' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedField === 'mobile' ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  )}
                </div>

                <div className="px-4 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold text-text-muted">رقم الإقامة / الهوية</p>
                    <p className="text-sm font-bold text-text-main tabular-nums mt-0.5">
                      {iqamaVal || '—'}
                    </p>
                  </div>
                  {iqamaVal && (
                    <button
                      type="button"
                      onClick={() => handleCopy(iqamaVal, 'iqama')}
                      className="min-h-[44px] px-3 inline-flex items-center gap-1.5 text-xs font-bold text-primary hover:bg-primary-light rounded-xl transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                    >
                      {copiedField === 'iqama' ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedField === 'iqama' ? 'تم النسخ' : 'نسخ'}</span>
                    </button>
                  )}
                </div>

                <div className="px-4 py-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-text-muted">الشركة</p>
                    <p className="text-sm font-bold text-text-main mt-0.5 flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-text-muted shrink-0" />
                      <span>{companyValue || '—'}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-muted">الفئة</p>
                    <p className="text-sm font-bold text-text-main mt-0.5 flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-text-muted shrink-0" />
                      <span>{categoryValue || '—'}</span>
                    </p>
                  </div>
                </div>

                <div className="px-4 py-3 grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-bold text-text-muted">موقع العمل</p>
                    <p className="text-sm font-bold text-text-main mt-0.5 flex items-center gap-1.5">
                      <MapPin className="w-4 h-4 text-text-muted shrink-0" />
                      <span>{workplaceValue || '—'}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-muted">الحافلة الحالية</p>
                    <div className="mt-1">
                      {activeWorker.assignedBusId ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 tabular-nums">
                          <BusIcon className="w-3.5 h-3.5" />
                          <span>حافلة {activeWorker.assignedBusOperationalNumber}</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2.5 py-1 rounded-xl text-xs font-bold bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-300 border border-orange-200 dark:border-orange-800">
                          بدون حافلة
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </section>

              {/* Contract Details */}
              <section className="bg-surface border border-border rounded-2xl shadow-xs p-4 space-y-3">
                <div className="flex items-center gap-2 text-sm font-bold text-text-main">
                  <Calendar className="w-4 h-4 text-primary" />
                  <h4>تفاصيل العقد وفترة العمل</h4>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-1">
                  <div>
                    <p className="text-xs font-bold text-text-muted">تاريخ البدء</p>
                    <p className="text-sm font-bold text-text-main tabular-nums mt-0.5">
                      {formatDateUnified(activeWorker.startDate) || '—'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-text-muted">تاريخ الانتهاء</p>
                    <p className="text-sm font-bold text-text-main tabular-nums mt-0.5">
                      {activeWorker.endDate ? formatDateUnified(activeWorker.endDate) : 'مستمر'}
                    </p>
                  </div>
                  {totalDays > 0 && (
                    <div>
                      <p className="text-xs font-bold text-text-muted">مدة العمل</p>
                      <p className="text-sm font-bold text-text-main tabular-nums mt-0.5">
                        {totalDays} يوم {friendlyDuration ? `(${friendlyDuration})` : ''}
                      </p>
                    </div>
                  )}
                  {activeWorker.basicSalary !== undefined && activeWorker.basicSalary > 0 && (
                    <div>
                      <p className="text-xs font-bold text-text-muted">الراتب الأساسي</p>
                      <p className="text-sm font-bold text-text-main tabular-nums mt-0.5">
                        {activeWorker.basicSalary.toLocaleString()} ريال
                      </p>
                    </div>
                  )}
                </div>
              </section>

              {/* Previous Buses */}
              <section className="bg-surface border border-border rounded-2xl shadow-xs p-4 space-y-2.5">
                <div className="flex items-center gap-2 text-sm font-bold text-text-main">
                  <BusIcon className="w-4 h-4 text-primary" />
                  <h4>الحافلات السابقة</h4>
                </div>
                {previousBusesList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {previousBusesList.map((busNum, idx) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 rounded-xl bg-background border border-border text-xs font-bold text-text-main tabular-nums"
                      >
                        حافلة {busNum}
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">لا توجد حافلات سابقة مسجلة.</p>
                )}
              </section>

              {/* Work History */}
              <section className="bg-surface border border-border rounded-2xl shadow-xs p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-sm font-bold text-text-main">
                    <History className="w-4 h-4 text-primary" />
                    <h4>أرشيف الأعمال السابقة</h4>
                  </div>
                  {activeWorker.workHistory && activeWorker.workHistory.length > 0 && (
                    <span className="text-xs font-bold text-text-muted tabular-nums">
                      {activeWorker.workHistory.length} سجل
                    </span>
                  )}
                </div>

                {activeWorker.workHistory && activeWorker.workHistory.length > 0 ? (
                  <div className="divide-y divide-border">
                    {activeWorker.workHistory.map((item, index) => {
                      const itemDays = item.startDate ? calculateDays(item.startDate, item.endDate) : 0;
                      const projectTitle = sanitizeLabel(item.clientOrProject);
                      return (
                        <div key={item.id || index} className="py-3 first:pt-1 last:pb-1 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-bold text-text-main">
                              {projectTitle || 'مشروع سابق'}
                            </span>
                            {itemDays > 0 && (
                              <span className="text-xs text-text-muted tabular-nums">{itemDays} يوم</span>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-2 text-xs text-text-muted tabular-nums">
                            {item.role && <span>{item.role}</span>}
                            {item.role && item.workplace && <span aria-hidden="true">·</span>}
                            {item.workplace && <span>{item.workplace}</span>}
                            {(item.role || item.workplace) && (item.startDate || item.endDate) && <span aria-hidden="true">·</span>}
                            {(item.startDate || item.endDate) && (
                              <span>
                                {formatDateUnified(item.startDate) || '—'} إلى {item.endDate ? formatDateUnified(item.endDate) : 'مستمر'}
                              </span>
                            )}
                          </div>
                          {item.notes && (
                            <p className="text-xs text-text-muted mt-1">{item.notes}</p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-text-muted">لا توجد أعمال سابقة مسجلة في الملف.</p>
                )}
              </section>

              {/* Notes */}
              {activeWorker.notes && (
                <section className="bg-surface border border-border rounded-2xl shadow-xs p-4 space-y-2">
                  <h4 className="text-sm font-bold text-text-main">ملاحظات</h4>
                  <p className="text-xs text-text-muted leading-relaxed whitespace-pre-line">
                    {activeWorker.notes}
                  </p>
                </section>
              )}
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-border bg-surface flex flex-wrap items-center justify-between gap-2 shrink-0">
              <div className="flex items-center gap-2">
                {canEdit && onEdit && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onEdit(activeWorker);
                    }}
                    className="min-h-[44px] px-4 inline-flex items-center gap-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-colors shadow-sm shadow-primary/20 outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                    <span>تعديل البيانات</span>
                  </button>
                )}
                {isAdmin && onDelete && (
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onDelete(activeWorker);
                    }}
                    className="min-h-[44px] px-4 inline-flex items-center gap-2 bg-surface border border-red-200 dark:border-red-900/60 text-red-700 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>حذف</span>
                  </button>
                )}
              </div>

              <button
                type="button"
                onClick={onClose}
                className="min-h-[44px] px-5 bg-surface border border-border text-text-main hover:bg-background rounded-xl text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-primary cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
};
