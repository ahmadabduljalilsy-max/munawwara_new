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
  ExternalLink,
  ClipboardList
} from 'lucide-react';
import { Worker } from '../types';
import { differenceInDays, parseISO } from 'date-fns';

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

  const daysRemaining = worker.endDate ? calculateDays(today, worker.endDate) : -1;
  const isExpiringSoon = daysRemaining <= 7 && daysRemaining >= 0;
  const isTerminated = worker.endDate && new Date(worker.endDate) < new Date(today);

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
            className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden"
            dir="rtl"
          >
            {/* Header */}
            <div className={`p-6 border-b border-border flex items-center justify-between ${isTerminated ? 'bg-red-50/50' : isExpiringSoon ? 'bg-amber-50/50' : 'bg-primary/5'}`}>
              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-sm border ${isTerminated ? 'bg-white text-red-600 border-red-200' : isExpiringSoon ? 'bg-white text-amber-600 border-amber-200' : 'bg-white text-primary border-primary/20'}`}>
                  <User className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-text-main leading-tight">{worker.name}</h3>
                  <p className="text-text-muted text-xs font-bold mt-1">رقم العامل: {worker.workerNumber}</p>
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
            <div className="p-8 space-y-8 max-h-[70vh] overflow-y-auto">
              {/* Primary Info Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-2xl border border-border">
                    <div className="p-2 bg-white rounded-lg border border-border text-primary">
                      <IdCard className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">رقم الإقامة</p>
                      <p className="text-sm font-black text-text-main font-mono">{worker.iqamaNumber}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-2xl border border-border group">
                    <div className="p-2 bg-white rounded-lg border border-border text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-text-muted uppercase">رقم الجوال</p>
                      <p className="text-sm font-black text-text-main">{worker.mobileNumber}</p>
                    </div>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(worker.mobileNumber);
                        alert('تم نسخ الرقم');
                      }}
                      className="p-2 text-primary hover:bg-primary/5 rounded-lg text-xs"
                    >
                      <ClipboardList className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-2xl border border-border">
                    <div className="p-2 bg-white rounded-lg border border-border text-blue-600">
                      <Building2 className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">شركة الاستقدام</p>
                      <p className="text-sm font-black text-text-main">{worker.recruitmentCompany}</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 p-3 bg-background/50 rounded-2xl border border-border">
                    <div className="p-2 bg-white rounded-lg border border-border text-amber-600">
                      <Briefcase className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="text-[10px] font-bold text-text-muted uppercase">مكان العمل</p>
                      <p className="text-sm font-black text-text-main">{worker.workplace}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Status Section */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${isTerminated ? 'bg-red-50 border-red-200' : isExpiringSoon ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${isTerminated ? 'bg-white text-red-600 border-red-200' : isExpiringSoon ? 'bg-white text-amber-600 border-amber-200' : 'bg-white text-emerald-600 border-emerald-200'}`}>
                        <Clock className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-muted uppercase">حالة الدوام</p>
                        <p className={`text-sm font-black ${isTerminated ? 'text-red-700' : isExpiringSoon ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {isTerminated ? 'منتهي' : !worker.endDate ? 'يعمل (نشط)' : isExpiringSoon ? 'تنتهي قريباً' : 'نشط'}
                        </p>
                      </div>
                   </div>
                   <div className={`text-xl font-black ${isTerminated ? 'text-red-600' : isExpiringSoon ? 'text-amber-600' : 'text-emerald-600'}`}>
                      {calculateDays(worker.startDate, worker.endDate)} يوم
                   </div>
                </div>

                <div className={`p-4 rounded-2xl border flex items-center justify-between shadow-sm transition-all ${worker.assignedBusId ? 'bg-primary/5 border-primary/20' : 'bg-slate-50 border-slate-200 opacity-60'}`}>
                   <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl border ${worker.assignedBusId ? 'bg-white text-primary border-primary/20' : 'bg-white text-text-muted border-slate-200'}`}>
                        <BusIcon className="w-5 h-5" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-text-muted uppercase">الحافلة</p>
                        <p className={`text-sm font-black ${worker.assignedBusId ? 'text-primary' : 'text-text-muted italic'}`}>
                          {worker.assignedBusId 
                            ? `${worker.assignedBusOperationalNumber} ${worker.assignedBusPlateNumber ? `[${worker.assignedBusPlateNumber}]` : ''}` 
                            : 'غير مرتبط'}
                        </p>
                      </div>
                   </div>
                   {worker.assignedBusId && (
                     <div className="text-[10px] font-bold text-primary bg-white px-2 py-1 rounded-lg border border-primary/10">
                        رقم تشغيلي
                     </div>
                   )}
                </div>
              </div>

              {/* Timeline Section */}
              <div className="bg-slate-50 rounded-2xl p-6 border border-border">
                <div className="flex items-center gap-2 mb-4">
                  <Calendar className="w-4 h-4 text-text-muted" />
                  <h4 className="text-xs font-black text-text-muted uppercase">الفترة الزمنية</h4>
                </div>
                <div className="flex items-center gap-4 relative">
                  <div className="flex-1 space-y-1">
                    <p className="text-[10px] font-bold text-text-muted uppercase">تاريخ البدء</p>
                    <p className="text-sm font-black text-text-main font-mono">{worker.startDate}</p>
                  </div>
                  <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-border" />
                    <div className="w-px h-8 bg-gradient-to-b from-border to-transparent" />
                  </div>
                  <div className="flex-1 space-y-1 text-left" dir="ltr">
                    <p className="text-[10px] font-bold text-text-muted uppercase text-right">تاريخ الانتهاء</p>
                    <p className={`text-sm font-black font-mono text-right ${!worker.endDate ? 'text-emerald-600' : 'text-text-main'}`}>
                      {worker.endDate || 'يعمل'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Notes Section if exists */}
              {worker.notes && (
                <div className="space-y-2">
                   <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-text-muted" />
                    <h4 className="text-xs font-black text-text-muted uppercase">ملاحظات إضافية</h4>
                  </div>
                  <div className="p-4 bg-background border border-border rounded-2xl text-sm text-text-main leading-relaxed">
                    {worker.notes}
                  </div>
                </div>
              )}
            </div>

            {/* Footer actions */}
            <div className="p-6 border-t border-border bg-background/50 flex justify-end gap-3">
              <button 
                onClick={onClose}
                className="px-6 py-2.5 bg-white border border-border text-text-main rounded-xl text-xs font-black hover:bg-slate-50 transition-all shadow-sm active:scale-95"
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
