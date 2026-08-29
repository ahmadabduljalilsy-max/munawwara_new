import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  IdCard, 
  Phone, 
  Building2, 
  Calendar, 
  Bus as BusIcon, 
  Briefcase,
  Clock,
  CircleDollarSign,
  ClipboardList,
  History,
  Archive,
  MapPin,
  CheckCircle2,
  CalendarRange
} from 'lucide-react';
import { Worker } from '../types';
import { differenceInDays, parseISO, formatDistanceStrict } from 'date-fns';
import { ar } from 'date-fns/locale';

interface WorkerDetailsModalProps {
  worker: Worker | null;
  isOpen: boolean;
  onClose: () => void;
}

export const WorkerDetailsModal: React.FC<WorkerDetailsModalProps> = ({ worker, isOpen, onClose }) => {
  if (!worker) return null;

  const today = new Date().toISOString().split('T')[0];
  const calculateDays = (start: string, end: string) => {
    try {
      if (!start) return 0;
      const startDate = parseISO(start);
      const endDate = end ? parseISO(end) : parseISO(today);
      const days = differenceInDays(endDate, startDate);
      return days >= 0 ? days : 0;
    } catch (e) {
      return 0;
    }
  };

  const calculateFriendlyDuration = (start: string, end: string) => {
    try {
      if (!start) return '';
      const startDate = parseISO(start);
      const endDate = end ? parseISO(end) : parseISO(today);
      return formatDistanceStrict(endDate, startDate, { locale: ar });
    } catch (e) {
      return '';
    }
  };

  const getRemainingDays = (endDate: string) => {
    if (!endDate) return null;
    try {
      const targetDate = parseISO(endDate);
      const todayDate = parseISO(today);
      return differenceInDays(targetDate, todayDate);
    } catch (e) {
      return null;
    }
  };

  const daysRemaining = getRemainingDays(worker.endDate || '');
  const isExpiringSoon = daysRemaining !== null && daysRemaining <= 7 && daysRemaining >= 0;
  const isTerminated = daysRemaining !== null && daysRemaining < 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-background/80 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-3xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
            dir="rtl"
          >
            {/* Header */}
            <div className={`p-6 border-b border-border flex items-center justify-between shrink-0 ${isTerminated ? 'bg-red-50/50' : isExpiringSoon ? 'bg-amber-50/50' : 'bg-primary/5'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border ${isTerminated ? 'bg-white text-red-600 border-red-200' : isExpiringSoon ? 'bg-white text-amber-600 border-amber-200' : 'bg-white text-primary border-primary/20'}`}>
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-text-main leading-tight">{worker.name}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-text-muted text-xs font-bold">رقم العامل: {worker.workerNumber}</span>
                    {worker.clientName && (
                      <span className="text-[11px] font-black px-2.5 py-0.5 bg-primary/10 text-primary rounded-full">
                        المشروع الحالي: {worker.clientName}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 md:p-8 space-y-7 overflow-y-auto flex-1">
              {/* Primary Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 p-3.5 bg-background/50 rounded-2xl border border-border">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-border text-primary">
                      <IdCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">رقم الإقامة / الهوية</p>
                      <p className="text-sm font-black text-text-main font-mono">
                        {worker.iqamaNumber || worker.nationalId || 'غير مسجل'}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 bg-background/50 rounded-2xl border border-border group">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-border text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-text-muted uppercase">رقم الجوال</p>
                      <p className="text-sm font-black text-text-main font-mono">{worker.mobileNumber}</p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(worker.mobileNumber);
                        alert('تم نسخ الرقم');
                      }}
                      className="p-2 text-primary hover:bg-primary/5 rounded-lg text-xs"
                      title="نسخ الرقم"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                  </div>

                  {worker.basicSalary !== undefined && worker.basicSalary > 0 && (
                    <div className="flex items-center gap-3 p-3.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-200">
                      <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-emerald-200 text-emerald-600">
                        <CircleDollarSign className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-emerald-800 dark:text-emerald-400 uppercase">الراتب الأساسي الشهري</p>
                        <p className="text-sm font-black text-emerald-900 dark:text-emerald-300 font-mono">{worker.basicSalary.toLocaleString()} ريال</p>
                      </div>
                    </div>
                  )}
                </div>

                <div className="space-y-3.5">
                  <div className="flex items-center gap-3 p-3.5 bg-background/50 rounded-2xl border border-border">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-border text-blue-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">شركة الاستقدام / الكفيل</p>
                      <p className="text-sm font-black text-text-main">{worker.recruitmentCompany || 'غير مسجل'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 bg-background/50 rounded-2xl border border-border">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-border text-amber-600">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">مكان وموقع العمل الحالي</p>
                      <p className="text-sm font-black text-text-main">{worker.workplace || 'غير محدد'}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3.5 bg-background/50 rounded-2xl border border-border">
                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg border border-border text-primary">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">العميل / العقد الحالي</p>
                      <p className="text-sm font-black text-text-main">{worker.clientName || 'غير محدد'}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs transition-all ${isTerminated ? 'bg-red-50 border-red-200' : isExpiringSoon ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200'}`}>
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${isTerminated ? 'bg-white text-red-600 border-red-200' : isExpiringSoon ? 'bg-white text-amber-600 border-amber-200' : 'bg-white dark:bg-slate-800 text-emerald-600 border-emerald-200'}`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-muted uppercase">حالة العقد والدوام</p>
                        <p className={`text-sm font-black ${isTerminated ? 'text-red-700' : isExpiringSoon ? 'text-amber-700' : 'text-emerald-700 dark:text-emerald-400'}`}>
                          {isTerminated ? 'منتهي' : !worker.endDate ? 'نشط (على رأس العمل)' : isExpiringSoon ? 'ينتهي قريباً' : 'نشط'}
                        </p>
                      </div>
                   </div>
                   <div className="flex flex-col items-end">
                      <div className={`text-lg font-black font-mono ${isTerminated ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-emerald-600 dark:text-emerald-400'}`}>
                        {calculateDays(worker.startDate, worker.endDate)} يوم
                      </div>
                      <p className="text-[9px] font-bold text-text-muted">المدة الإجمالية</p>
                   </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-xs transition-all ${worker.assignedBusId ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700'}`}>
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${worker.assignedBusId ? 'bg-white dark:bg-slate-800 text-primary border-primary/20' : 'bg-white dark:bg-slate-800 text-text-muted border-slate-200'}`}>
                        <BusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-muted uppercase">الحافلة المرتبطة الحالية</p>
                        <p className={`text-sm font-black ${worker.assignedBusId ? 'text-primary' : 'text-text-muted italic'}`}>
                          {worker.assignedBusId 
                            ? `رقم: ${worker.assignedBusOperationalNumber} ${worker.assignedBusPlateNumber ? `[${worker.assignedBusPlateNumber}]` : ''}` 
                            : 'غير مرتبط بحافلة حالياً'}
                        </p>
                      </div>
                   </div>
                </div>

                {daysRemaining !== null && (
                  <div className={`p-3.5 rounded-xl border flex items-center gap-3 col-span-1 sm:col-span-2 ${isTerminated ? 'bg-red-50 border-red-100 text-red-700' : isExpiringSoon ? 'bg-amber-50 border-amber-100 text-amber-700' : 'bg-emerald-50/50 border-emerald-100 text-emerald-700'}`}>
                    <Clock className="w-4 h-4 shrink-0" />
                    <span className="text-xs font-black">
                      {isTerminated ? (
                        `انتهى العقد منذ ${Math.abs(daysRemaining)} يوم (تاريخ الانتهاء: ${worker.endDate})`
                      ) : isExpiringSoon ? (
                        `ينتهي العقد خلال ${daysRemaining} أيام متبقية`
                      ) : (
                        `متبقي ${daysRemaining} يوم على نهاية العقد`
                      )}
                    </span>
                  </div>
                )}
              </div>

              {/* Current Working Period */}
              <div className="bg-slate-50 dark:bg-slate-800/60 rounded-2xl p-5 border border-border">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-black text-text-main">فترة العمل الحالية</h4>
                  </div>
                  {worker.startDate && (
                    <span className="text-[11px] font-bold text-text-muted">
                      المدة: {calculateFriendlyDuration(worker.startDate, worker.endDate)} ({calculateDays(worker.startDate, worker.endDate)} يوم)
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-4 relative">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-bold text-text-muted uppercase">تاريخ البدء</p>
                    <p className="text-sm font-black text-text-main font-mono">{worker.startDate}</p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="w-2 h-2 rounded-full bg-primary" />
                    <div className="w-px h-6 bg-gradient-to-b from-primary to-emerald-500" />
                  </div>
                  <div className="flex-1 space-y-1 text-left" dir="ltr">
                    <p className="text-[10px] font-bold text-text-muted uppercase text-right">تاريخ الانتهاء</p>
                    <p className={`text-sm font-black font-mono text-right ${!worker.endDate ? 'text-emerald-600' : 'text-text-main'}`}>
                      {worker.endDate || 'مستمر على رأس العمل'}
                    </p>
                  </div>
                </div>
              </div>

              {/* === PREVIOUS WORK HISTORY (أرشيف الأعمال والمشاريع السابقة) === */}
              <div className="p-5 bg-amber-50/60 dark:bg-amber-950/20 border-2 border-amber-200 dark:border-amber-900/50 rounded-2xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center shadow-xs">
                      <History className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-amber-950 dark:text-amber-200">
                        أرشيف الأعمال والمشاريع السابقة ({worker.workHistory?.length || 0})
                      </h4>
                      <p className="text-[11px] text-amber-800/80 dark:text-amber-300/80 font-bold">
                        توثيق الشركات والمشاريع السابقة التي عمل بها العامل (مثل: أمكور، أرامكو...)
                      </p>
                    </div>
                  </div>
                </div>

                {worker.workHistory && worker.workHistory.length > 0 ? (
                  <div className="space-y-3">
                    {worker.workHistory.map((item, index) => {
                      const duration = item.startDate ? calculateFriendlyDuration(item.startDate, item.endDate) : '';
                      const totalDays = item.startDate ? calculateDays(item.startDate, item.endDate) : 0;

                      return (
                        <div 
                          key={item.id || index}
                          className="p-4 bg-white dark:bg-slate-800 rounded-xl border border-amber-200/90 shadow-2xs hover:shadow-sm transition-all"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-700/60">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-black text-sm text-amber-950 dark:text-amber-300">
                                🏢 {item.clientOrProject}
                              </span>
                              {item.role && (
                                <span className="text-[11px] font-bold px-2.5 py-0.5 bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-full">
                                  {item.role}
                                </span>
                              )}
                              {item.workplace && (
                                <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                                  <MapPin className="w-3 h-3 text-amber-600" />
                                  {item.workplace}
                                </span>
                              )}
                            </div>

                            {duration && (
                              <span className="text-[11px] font-black text-amber-800 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-lg border border-amber-200 self-start sm:self-auto font-mono">
                                ⏳ {duration} ({totalDays} يوم)
                              </span>
                            )}
                          </div>

                          <div className="pt-2.5 flex flex-wrap items-center justify-between gap-2 text-xs">
                            <div className="flex items-center gap-2 font-mono font-bold">
                              <CalendarRange className="w-3.5 h-3.5 text-amber-600" />
                              <span className="text-text-muted">الفترة:</span>
                              <span className="text-emerald-700 dark:text-emerald-400 font-black">{item.startDate || 'غير محدد'}</span>
                              <span className="text-slate-400">←</span>
                              <span className="text-red-700 dark:text-red-400 font-black">{item.endDate || 'مستمر'}</span>
                            </div>

                            {item.notes && (
                              <p className="text-[11px] text-text-muted italic bg-slate-50 dark:bg-slate-700/40 px-2.5 py-1 rounded-lg">
                                {item.notes}
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 bg-white/70 dark:bg-slate-800/70 rounded-xl border border-dashed border-amber-300 text-center text-xs text-amber-800 font-bold">
                    لا توجد مشاريع أو أعمال سابقة مؤرشفة في ملف هذا العامل حتى الآن.
                  </div>
                )}
              </div>

              {/* Previous Buses */}
              {worker.previousBuses && (
                <div className="p-4 bg-indigo-50/40 dark:bg-indigo-950/20 rounded-2xl border border-indigo-200 flex items-start gap-3">
                  <BusIcon className="w-5 h-5 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-black text-indigo-950 dark:text-indigo-200">سجل الحافلات السابقة المستلمة</h4>
                    <p className="text-sm font-black text-indigo-900 dark:text-indigo-300 font-mono mt-1">
                      {worker.previousBuses}
                    </p>
                  </div>
                </div>
              )}

              {/* Notes Section if exists */}
              {worker.notes && (
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-text-muted" />
                    <h4 className="text-xs font-black text-text-muted uppercase">ملاحظات وسجل التغييرات الإدارية</h4>
                  </div>
                  <div className="p-4 bg-background border border-border rounded-2xl text-xs text-text-main leading-relaxed whitespace-pre-line font-medium">
                    {worker.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-4 md:p-6 border-t border-border bg-background/50 flex justify-end gap-3 shrink-0">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-white dark:bg-slate-800 border border-border text-text-main rounded-xl text-xs font-black hover:bg-slate-50 transition-all shadow-xs active:scale-95 cursor-pointer"
              >
                إغلاق
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

