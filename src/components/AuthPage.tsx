import React from 'react';
import { motion } from 'motion/react';
import { Bus, ShieldCheck, Activity, Users, MapPin, CheckCircle2 } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { DmtcLogo } from './DmtcLogo';

export const AuthPage: React.FC = () => {
  const { profile, loading: authLoading } = useAuth();
  const [localLoading, setLocalLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const handleSignIn = async () => {
    if (localLoading) return;
    setLocalLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Sign in error:', err);
      if (err.code === 'auth/popup-blocked') {
        setError('تعذر فتح نافذة تسجيل الدخول. يرجى السماح بالنوافذ المنبثقة.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        // User closed the popup, don't show error
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('هذا النطاق غير مصرح به في إعدادات Firebase. يرجى إضافة النطاق الحالي إلى قائمة النطاقات المصرح بها في وحدة تحكم Firebase (Authentication > Settings > Authorized domains).');
      } else {
        setError('حدث خطأ أثناء تسجيل الدخول. يرجى المحاولة مرة أخرى.');
      }
    } finally {
      setLocalLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
        <div className="flex flex-col items-center gap-6">
          <motion.div 
            animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="w-28 h-28 bg-surface p-3 rounded-3xl shadow-xl border border-border flex items-center justify-center"
          >
            <DmtcLogo size="lg" variant="full" />
          </motion.div>
          <div className="text-xl font-black text-primary animate-pulse">جاري تحضير النظام...</div>
        </div>
      </div>
    );
  }

  // If user is logged in but not approved
  if (profile && !profile.approved) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4 font-sans text-right" dir="rtl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="soft-panel p-10 max-w-md w-full text-center relative overflow-hidden shadow-2xl"
        >
          <div className="w-28 h-28 bg-surface p-2 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-md border border-border relative z-10">
            <DmtcLogo size="lg" variant="full" />
          </div>
          <h1 className="text-2xl font-black text-text-main mb-3">الحساب قيد المراجعة</h1>
          <p className="text-text-muted text-sm font-bold leading-relaxed mb-8">
            شكراً لتسجيلك. حسابك حالياً بانتظار الاعتماد من قِبل إدارة التشغيل بشركة درة المنورة للنقليات.
          </p>
          <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center gap-3 text-amber-800 text-xs font-black shadow-2xs">
            <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
            حالة الحساب: {profile.role === 'pending' ? 'بانتظار موافقة الإدارة' : 'غير مفعل'}
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans text-right overflow-hidden" dir="rtl">
      {/* Left side - Login Form (Malwarebytes Clean Soft Panel) */}
      <div className="md:w-1/2 flex items-center justify-center p-6 md:p-14 relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="soft-panel p-8 md:p-12 w-full max-w-md shadow-2xl"
        >
          <div className="mb-8 text-center md:text-right">
            <div className="mb-4 flex justify-center md:justify-start">
              <DmtcLogo size="md" variant="full" />
            </div>
            <h3 className="text-2xl font-black text-text-main mt-2">تسجيل الدخول للمنظومة</h3>
            <p className="text-xs font-bold text-text-muted mt-1">قسم التشغيل والرقابة الميدانية • نقل العمال</p>
          </div>

          <button 
            onClick={handleSignIn}
            disabled={localLoading}
            className={`w-full flex items-center justify-center gap-3 py-3.5 px-6 soft-btn-primary font-black text-sm transition-all duration-300 transform active:scale-98 cursor-pointer
              ${localLoading ? 'opacity-70 cursor-not-allowed' : ''}
            `}
          >
            {localLoading ? (
              <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <div className="bg-white p-1 rounded-md shadow-2xs">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-4 h-4" />
              </div>
            )}
            <span>
              {localLoading ? 'جاري التحقق...' : 'تسجيل الدخول عبر البريد الإلكتروني'}
            </span>
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-600 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="mt-8 p-4 bg-blue-50/60 dark:bg-slate-800/60 rounded-2xl border border-blue-100/80 dark:border-slate-700 flex flex-col gap-2">
             <div className="flex items-center gap-2 text-primary font-black text-xs">
                <ShieldCheck className="w-4 h-4" />
                <span>دخول آمن وموثق - شركة درة المنورة للنقليات</span>
             </div>
             <p className="text-[11px] text-text-muted leading-relaxed font-bold">
               منظومة سحابية مخصصة لفريق الإشراف، المتابعة اللحظية لأسطول الحافلات، وجداول تشغيل الكوادر.
             </p>
          </div>

          <div className="mt-6 text-center text-[11px] text-text-muted font-bold opacity-60">
            © {new Date().getFullYear()} شركة درة المنورة للنقليات DMTC. جميع الحقوق محفوظة.
          </div>
        </motion.div>
      </div>

      {/* Right side - Branding & Feature Cards (Malwarebytes Aesthetic) */}
      <div className="md:flex-1 relative flex flex-col justify-between p-8 lg:p-16 overflow-hidden bg-gradient-to-br from-blue-100/40 via-white to-blue-50/60 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 border-r border-border">
        {/* Soft Radial Ambient Highlight */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-xl">
          <div className="flex items-center gap-5 mb-8">
            <div className="w-24 h-24 shrink-0 flex items-center justify-center">
              <DmtcLogo size="sm" variant="full" />
            </div>
            <div>
              <h2 className="text-3xl lg:text-4xl font-black text-text-main leading-tight">
                شركة درة المنورة للنقليات
              </h2>
              <span className="text-xs font-black text-primary uppercase tracking-widest mt-1 block">
                DURRAT AL-MUNAWWARAH TRANSPORT CO. (DMTC)
              </span>
            </div>
          </div>

          <p className="text-text-muted text-base font-bold leading-relaxed mb-8">
            منظومة رقمية متقدمة مبنية على أحدث معايير المراقبة والتحكم اللحظي، تتيح إدارة شاملة لأسطول الحافلات والكوادر الميدانية ومسيرات الرواتب.
          </p>

          {/* Feature Highlights Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="soft-panel p-4 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-blue-50 text-primary flex items-center justify-center shrink-0">
                <Bus className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h4 className="text-xs font-black text-text-main">إدارة الأسطول</h4>
                <p className="text-[10px] text-text-muted font-bold mt-0.5">جاهزية الحافلات وتوزيعها</p>
              </div>
            </div>

            <div className="soft-panel p-4 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h4 className="text-xs font-black text-text-main">الرقابة والمتابعة</h4>
                <p className="text-[10px] text-text-muted font-bold mt-0.5">سجل السائقين ومواقع العمل</p>
              </div>
            </div>

            <div className="soft-panel p-4 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-purple-50 text-[#4A148C] flex items-center justify-center shrink-0">
                <Activity className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h4 className="text-xs font-black text-text-main">مسيرات الرواتب</h4>
                <p className="text-[10px] text-text-muted font-bold mt-0.5">حساب آلي وجبر الفواصل</p>
              </div>
            </div>

            <div className="soft-panel p-4 flex items-center gap-3.5 shadow-2xs">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <MapPin className="w-5 h-5" />
              </div>
              <div className="text-right">
                <h4 className="text-xs font-black text-text-main">تغطية جغرافية شاملة</h4>
                <p className="text-[10px] text-text-muted font-bold mt-0.5">المدينة • الرياض • مكة</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 mt-10 pt-4 border-t border-border/60">
          <p className="text-text-muted text-xs font-bold">
            قسم التشغيل ونقل العمال • شركة درة المنورة لنقل الحجاج والمعتمرين
          </p>
        </div>
      </div>
    </div>
  );
};
