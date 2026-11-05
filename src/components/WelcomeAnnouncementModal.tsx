import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Bus as BusIcon, 
  Gauge, 
  ArrowLeft,
  X,
  Award
} from 'lucide-react';

interface WelcomeAnnouncementModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = 'operations_system_welcome_announcement_seen_v2';

export const WelcomeAnnouncementModal: React.FC<WelcomeAnnouncementModalProps> = ({
  forceOpen = false,
  onClose
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const modalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (forceOpen) {
      setIsOpen(true);
      return;
    }

    try {
      const hasSeen = localStorage.getItem(STORAGE_KEY);
      if (!hasSeen) {
        // Show automatically on first visit
        const timer = setTimeout(() => {
          setIsOpen(true);
        }, 600);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      console.warn('LocalStorage error reading welcome modal state:', e);
    }
  }, [forceOpen]);

  const handleDismiss = () => {
    try {
      localStorage.setItem(STORAGE_KEY, 'true');
    } catch (e) {
      console.warn('LocalStorage error setting welcome modal state:', e);
    }
    setIsOpen(false);
    if (onClose) onClose();

    // Return focus gracefully to trigger button if present
    setTimeout(() => {
      const triggerBtn = document.getElementById('open-announcement-btn');
      if (triggerBtn) {
        triggerBtn.focus();
      }
    }, 100);
  };

  // Keyboard accessibility: Escape to dismiss
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleDismiss();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" 
        dir="rtl"
        role="dialog"
        aria-modal="true"
        aria-labelledby="executive-modal-title"
      >
        {/* Backdrop with smooth blur */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-[#07152B]/80 backdrop-blur-md"
        />

        {/* Modal Window — Executive Welcome & Operations Statement Modal */}
        <motion.div
          ref={modalRef}
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
          className="relative w-full max-w-2xl bg-white dark:bg-[#112746] border border-slate-200/90 dark:border-slate-700/80 rounded-[22px] shadow-2xl shadow-[#07152B]/40 overflow-hidden flex flex-col z-10 my-auto text-[#17253C] dark:text-slate-100 max-h-[92vh]"
        >
          {/* Header: Luxury Gradient (Teal #00A88B -> Blue #2563EB -> Navy #07152B) */}
          <div className="relative p-5 sm:p-6 bg-gradient-to-r from-[#00A88B] via-[#1D4ED8] to-[#07152B] flex items-center justify-between overflow-hidden shrink-0">
            {/* Ambient Lighting & Accents */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.22),transparent_70%)] pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-36 h-36 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -right-10 -top-10 w-36 h-36 rounded-full bg-[#E8B44D]/20 blur-xl pointer-events-none" />

            <div className="relative z-10 flex items-center gap-3.5">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/25 text-white flex items-center justify-center shadow-lg shadow-black/10 shrink-0">
                <Building2 className="w-6 h-6 sm:w-7 sm:h-7 text-white" />
              </div>
              <div className="text-white space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-[#E8B44D] text-[11px] font-black border border-white/25">
                  <Sparkles className="w-3 h-3 text-[#E8B44D]" />
                  <span>منظومة مكتب التشغيل المعتمدة</span>
                </div>
                <h3 id="executive-modal-title" className="text-lg sm:text-xl font-black tracking-tight text-white drop-shadow-xs font-cairo">
                  مرحباً بكم في منظومة التشغيل
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="إغلاق النافذة"
              className="relative z-10 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white shrink-0"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body with internal scrolling */}
          <div className="p-5 sm:p-7 space-y-5 overflow-y-auto custom-scrollbar">
            {/* 1. Official Statement Card (بيان إدارة مكتب التشغيل) */}
            <div className="relative p-5 sm:p-6 rounded-2xl bg-[#F2F6FC] dark:bg-[#07152B]/70 border border-[#00A88B]/35 dark:border-[#00A88B]/45 shadow-xs">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#00A88B] text-white flex items-center justify-center shrink-0 shadow-md shadow-[#00A88B]/25">
                  <Award className="w-5 h-5 text-white" />
                </div>
                <div className="space-y-2">
                  <div className="text-xs font-black text-[#00A88B] dark:text-[#10B981] flex items-center gap-1.5 font-cairo">
                    <ShieldCheck className="w-4 h-4 text-[#00A88B] dark:text-[#10B981]" />
                    <span>بيان إدارة مكتب التشغيل</span>
                  </div>
                  {/* The exact official statement text preserved verbatim */}
                  <p className="text-sm sm:text-[15px] font-bold leading-relaxed text-[#17253C] dark:text-slate-100 select-text">
                    "بفضل الله وتوفيقه وبإشراف مباشر من مدير التشغيل الاستاذ عبد الحميد سالمة تم تصميم هذه المنظومة لتكون شاملة لعمليات مكتب التشغيل، وتهدف إلى تنظيم الأعمال، وتسهيل متابعة السائقين والمركبات، ورفع كفاءة الأداء ودقة المتابعة."
                  </p>
                </div>
              </div>
            </div>

            {/* 2. System Objectives Cards (بطاقات أهداف المنظومة الثلاث) */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* البطاقة الأولى: تنظيم الأعمال */}
              <div className="p-4 rounded-xl bg-[#F2F6FC] dark:bg-white/[0.04] border border-slate-200/80 dark:border-slate-800 hover:border-emerald-500/30 transition-all duration-200 flex flex-col justify-between shadow-2xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white font-cairo">تنظيم الأعمال</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal font-medium">
                  إدارة مركزية لجميع العمليات والردود اليومية
                </p>
              </div>

              {/* البطاقة الثانية: متابعة السائقين والمركبات */}
              <div className="p-4 rounded-xl bg-[#F2F6FC] dark:bg-white/[0.04] border border-slate-200/80 dark:border-slate-800 hover:border-sky-500/30 transition-all duration-200 flex flex-col justify-between shadow-2xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-500/15 border border-sky-500/25 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                    <BusIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white font-cairo">متابعة السائقين والمركبات</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal font-medium">
                  تحقق دقيق من حافلات الأسطول والسائقين
                </p>
              </div>

              {/* البطاقة الثالثة: رفع كفاءة الأداء */}
              <div className="p-4 rounded-xl bg-[#F2F6FC] dark:bg-white/[0.04] border border-slate-200/80 dark:border-slate-800 hover:border-amber-500/30 transition-all duration-200 flex flex-col justify-between shadow-2xs">
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-[#E8B44D]/15 border border-[#E8B44D]/25 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                    <Gauge className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-black text-slate-900 dark:text-white font-cairo">رفع كفاءة الأداء</span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-normal font-medium">
                  دقة المتابعة وسرعة الإنجاز والتقارير
                </p>
              </div>
            </div>

            {/* 3. Administrative Signature & Action Button */}
            <div className="pt-3 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-200/80 dark:border-slate-800">
              <div className="text-xs text-slate-700 dark:text-slate-300 flex items-center gap-2 font-black">
                <ShieldCheck className="w-4 h-4 text-[#00A88B] shrink-0" />
                <span>إشراف مباشر: أ. عبد الحميد سالمة (مدير التشغيل)</span>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-[#00A88B] to-[#10B981] hover:from-[#008f75] hover:to-[#059669] text-white font-black text-xs sm:text-sm rounded-xl shadow-lg shadow-[#00A88B]/25 hover:shadow-[#00A88B]/35 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00A88B]"
              >
                <span>دخول المنظومة ومتابعة العمل</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};

