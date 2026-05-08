import React from 'react';
import { motion } from 'motion/react';
import { Bus, LogIn, ShieldAlert } from 'lucide-react';
import { signInWithGoogle } from '../lib/firebase';
import { useAuth } from '../lib/AuthContext';
import { useLogo } from '../lib/LogoContext';

export const AuthPage: React.FC = () => {
  const { profile, loading: authLoading } = useAuth();
  const { logoURL } = useLogo();
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
            className="w-24 h-24 bg-white p-2 rounded-3xl shadow-xl border border-border flex items-center justify-center"
          >
            <img 
              src={logoURL} 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
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
          className="bg-surface p-10 rounded-[40px] shadow-2xl border border-border max-w-md w-full text-center relative overflow-hidden"
        >
          <div className="w-24 h-24 bg-white p-2 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl border border-border relative z-10">
            <img 
              src={logoURL} 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="text-2xl font-black text-text-main mb-4">بانتظار الموافقة</h1>
          <p className="text-text-muted text-base font-bold leading-relaxed mb-10">
            شكرًا لتسجيلك! حسابك حاليًا قيد المراجعة من قبل مدير نظام شركة درة المنورة. يرجى التواصل مع الإدارة لتفعيل حسابك.
          </p>
          <div className="p-5 bg-amber-50 rounded-2xl border border-amber-200 flex items-center justify-center gap-3 text-amber-700 text-sm font-black shadow-sm">
            <ShieldAlert className="w-5 h-5" />
            حالة الحساب: {profile.role === 'pending' ? 'بانتظار المراجعة' : 'غير مفعل'}
          </div>
          <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col md:flex-row font-sans text-right overflow-hidden" dir="rtl">
      {/* Left side - Login Form (Section 1) */}
      <div className="md:w-1/2 bg-surface flex items-center justify-center p-8 md:p-16 relative z-10 shadow-2xl">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className="bg-surface p-10 md:p-14 rounded-[32px] shadow-2xl border border-border w-full max-w-md ring-8 ring-background"
        >
          <div className="mb-10 text-center md:text-right">
            <h3 className="text-3xl font-black text-primary mb-3">تسجيل الدخول إلى قسم التشغيل - نقل العمال</h3>
          </div>

          <button 
            onClick={handleSignIn}
            disabled={localLoading}
            className={`group w-full flex items-center justify-center gap-4 py-4 px-6 bg-primary text-white rounded-2xl font-bold transition-all duration-300 transform active:scale-[0.98] shadow-lg shadow-primary/20
              ${localLoading ? 'opacity-70 cursor-not-allowed' : 'hover:bg-accent hover:shadow-xl hover:shadow-accent/30'}
            `}
          >
            {localLoading ? (
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <div className="bg-white p-1.5 rounded-lg shadow-sm group-hover:rotate-12 transition-transform">
                <img src="https://www.google.com/favicon.ico" alt="Google" className="w-5 h-5" />
              </div>
            )}
            <span className="text-lg">
              {localLoading ? 'جاري الدخول...' : 'تسجيل الدخول باستخدام Google'}
            </span>
          </button>

          {error && (
            <div className="mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs font-bold text-center">
              {error}
            </div>
          )}

          <div className="mt-12 p-5 bg-background rounded-2xl border border-border/50 flex flex-col gap-3">
             <div className="flex items-center gap-3 text-text-muted">
                <ShieldAlert className="w-4 h-4 text-accent" />
                <span className="text-[11px] font-bold uppercase tracking-wider">نظام داخلي حصري لشركة درة المنورة</span>
             </div>
             <p className="text-[10px] text-text-muted/60 leading-relaxed font-medium">مخصص فقط لموظفي شركة درة المنورة الحديثة - مكتب التشغيل وقسم نقل العمال.</p>
          </div>

          <div className="mt-8 text-center text-[10px] text-text-muted font-bold opacity-50">
            © {new Date().getFullYear()} جميع الحقوق محفوظة لشركة درة المنورة
          </div>
        </motion.div>
      </div>

      {/* Right side - Branding Identity (Section 2) */}
      <div className="md:flex-1 relative flex flex-col justify-between p-12 lg:p-20 overflow-hidden min-h-[40vh] md:min-h-screen">
        {/* Office Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center"
          style={{ 
            backgroundImage: `url('https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&q=80&w=1200')` 
          }}
        />
        {/* Animated Background Overlay */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/95 via-primary/80 to-accent/30 opacity-90" />
        <div className="absolute top-0 right-0 w-full h-full bg-[radial-gradient(circle_at_top_right,_var(--tw-gradient-stops))] from-accent/40 via-transparent to-transparent blur-3xl opacity-30" />

        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="flex items-center gap-6 mb-20 group"
          >
            <div className="w-24 h-24 bg-surface p-1 rounded-[28px] flex items-center justify-center shadow-2xl ring-4 ring-white/20 transform group-hover:scale-105 transition-transform duration-500 overflow-hidden">
               <img 
                 src={logoURL} 
                 alt="Logo" 
                 className="w-full h-full object-contain"
               />
            </div>
            <div className="flex flex-col text-right">
              <span className="text-white font-black text-3xl tracking-tight leading-tight drop-shadow-md">شركة درة المنورة</span>
              <span className="text-secondary font-black text-sm uppercase tracking-[0.2em] drop-shadow-sm">لنقل الحجاج والمعتمرين</span>
              <span className="text-accent font-black text-xs uppercase tracking-[0.1em] mt-1 drop-shadow-sm">مكتب نقل العمال</span>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="max-w-xl"
          >
            <h2 className="text-5xl lg:text-7xl font-black text-white leading-[1.2] mb-8">
              شركة درة المنورة – <br />
              <span className="text-accent underline decoration-white/20 underline-offset-[12px]">قسم نقل العمال</span>
            </h2>
            <p className="text-white/80 text-xl font-medium leading-relaxed mb-12">
              نظام متكامل لإدارة أسطول الحافلات، تتبع المواقع، وتوليد التقارير الاحترافية.
            </p>
          </motion.div>
        </div>

        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="relative z-10"
        >
           <p className="text-white/60 text-xs font-bold leading-relaxed">
             تم تصميمه بحب من قبل فريق تشغيل درة المنورة - جميع الحقوق محفوظة لشركة درة المنورة
           </p>
        </motion.div>
      </div>
    </div>
  );
};
