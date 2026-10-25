import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Sparkles, 
  CheckCircle2, 
  ShieldCheck, 
  Building2, 
  Bus as BusIcon, 
  Users, 
  Gauge, 
  ArrowLeft,
  X,
  Award
} from 'lucide-react';
import { useLogo } from '../lib/LogoContext';

interface WelcomeAnnouncementModalProps {
  forceOpen?: boolean;
  onClose?: () => void;
}

const STORAGE_KEY = 'operations_system_welcome_announcement_seen_v2';

export const WelcomeAnnouncementModal: React.FC<WelcomeAnnouncementModalProps> = ({
  forceOpen = false,
  onClose
}) => {
  const { logoURL } = useLogo();
  const [isOpen, setIsOpen] = useState(false);

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
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 overflow-y-auto" dir="rtl">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={handleDismiss}
          className="fixed inset-0 bg-slate-950/75 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ type: 'spring', damping: 25, stiffness: 300 }}
          className="relative w-full max-w-xl bg-surface border border-border/80 rounded-3xl shadow-2xl overflow-hidden flex flex-col z-10 my-auto text-slate-800 dark:text-slate-100"
        >
          {/* Top Decorative Banner */}
          <div className="relative h-28 bg-gradient-to-r from-emerald-600 via-teal-600 to-primary p-6 flex items-center justify-between overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.25),transparent_70%)]" />
            
            {/* Background geometric accents */}
            <div className="absolute -left-6 -bottom-6 w-28 h-28 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-amber-400/20 blur-xl pointer-events-none" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md border border-white/30 text-white flex items-center justify-center shadow-lg">
                <Building2 className="w-7 h-7 text-white" />
              </div>
              <div className="text-white">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-md text-amber-200 text-[11px] font-bold border border-white/20 mb-1">
                  <Sparkles className="w-3 h-3 text-amber-300" />
                  <span>منظومة مكتب التشغيل المعتمدة</span>
                </div>
                <h3 className="text-lg font-black tracking-tight text-white drop-shadow-sm">
                  مرحباً بكم في منظومة التشغيل
                </h3>
              </div>
            </div>

            <button
              onClick={handleDismiss}
              className="relative z-10 p-2 text-white/80 hover:text-white hover:bg-white/20 rounded-xl transition-colors cursor-pointer"
              title="إغلاق"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Modal Body */}
          <div className="p-6 sm:p-7 space-y-6">
            {/* Official Message Quote Card */}
            <div className="relative p-5 sm:p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-teal-500/5 to-primary/10 border-2 border-emerald-500/30 dark:border-emerald-500/40 shadow-inner">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-md">
                  <Award className="w-5 h-5" />
                </div>
                <div className="space-y-2">
                  <div className="text-[11px] font-black text-emerald-700 dark:text-emerald-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                    <span>بيان الإدارة ومكتب التشغيل</span>
                  </div>
                  {/* The exact text requested by user */}
                  <p className="text-sm sm:text-base font-bold leading-relaxed text-slate-800 dark:text-slate-100 select-text">
                    "بفضل الله وتوفيقه وبإشراف مباشر من مدير التشغيل الاستاذ عبد الحميد سالمة تم تصميم هذه المنظومة لتكون شاملة لعمليات مكتب التشغيل، وتهدف إلى تنظيم الأعمال، وتسهيل متابعة السائقين والمركبات، ورفع كفاءة الأداء ودقة المتابعة."
                  </p>
                </div>
              </div>
            </div>

            {/* Strategic Pillars */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-3.5 rounded-xl bg-background border border-border flex items-start gap-2.5 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">تنظيم الأعمال</div>
                  <div className="text-[11px] text-text-muted mt-0.5">إدارة مركزية لجميع العمليات والردود اليومية</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border flex items-start gap-2.5 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center shrink-0">
                  <BusIcon className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">متابعة السائقين والمركبات</div>
                  <div className="text-[11px] text-text-muted mt-0.5">تحقق دقيق من حافلات الأسطول والسائقين</div>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-background border border-border flex items-start gap-2.5 shadow-xs">
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                  <Gauge className="w-4 h-4" />
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">رفع كفاءة الأداء</div>
                  <div className="text-[11px] text-text-muted mt-0.5">دقة المتابعة وسرعة الإنجاز والتقارير</div>
                </div>
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-border">
              <div className="text-xs text-text-muted flex items-center gap-1.5 font-bold">
                <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>إشراف مباشر: أ. عبد الحميد سالمة (مدير التشغيل)</span>
              </div>

              <button
                type="button"
                onClick={handleDismiss}
                className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/20 hover:shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95"
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
