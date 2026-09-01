import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Bus, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  CircleDollarSign,
  Sun,
  Moon,
  Calendar,
  Sparkles,
  ChevronLeft
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { useLogo } from '../lib/LogoContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';

export const Layout: React.FC<{ children: React.ReactNode; activeTab: string; setActiveTab: (tab: string) => void }> = ({ children, activeTab, setActiveTab }) => {
  const { user, profile } = useAuth();
  const { logoURL } = useLogo();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [theme, setTheme] = useState(() => localStorage.getItem('theme') || 'light');

  const todayFormatted = React.useMemo(() => {
    try {
      return new Intl.DateTimeFormat('ar-SA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }).format(new Date());
    } catch (e) {
      return new Date().toLocaleDateString('ar-SA');
    }
  }, []);

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const isSuperAdmin = profile?.role === 'admin';
  const isOperator = profile?.role === 'supervisor';
  const isReadOnly = !isSuperAdmin && !isOperator;

  // Read-only role sees ONLY Dashboard, Fleet, Monitoring.
  // Operator (Supervisor) sees Dashboard, Fleet, Monitoring, Salaries.
  // Admin sees Dashboard, Fleet, Monitoring, Salaries, Admin.
  const menuItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, desc: 'لوحة المؤشرات والتحليلات', iconColor: 'text-emerald-400', activeBg: 'bg-emerald-600' },
    { id: 'fleet', label: 'أسطول الشركة', icon: Bus, desc: 'سجل الحافلات والجاهزية', iconColor: 'text-sky-400', activeBg: 'bg-sky-600' },
    { id: 'monitoring', label: 'الرقابة والمتابعة', icon: ShieldCheck, desc: 'توزيع العمال والمواقع', iconColor: 'text-amber-400', activeBg: 'bg-amber-600' },
  ];

  if (isSuperAdmin || isOperator) {
    menuItems.push({ id: 'salaries', label: 'الرواتب', icon: CircleDollarSign, desc: 'مسيرات الرواتب والمستحقات', iconColor: 'text-purple-400', activeBg: 'bg-purple-600' });
  }

  if (isSuperAdmin) {
    menuItems.push({ id: 'admin', label: 'الإدارة', icon: Settings, desc: 'الصلاحيات وإعدادات النظام', iconColor: 'text-rose-400', activeBg: 'bg-rose-600' });
  }

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-background text-text-main font-sans flex flex-col md:flex-row rtl selection:bg-emerald-500/20 selection:text-emerald-900" dir="rtl">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-3.5 bg-[#0F172A] text-white border-b border-slate-800 sticky top-0 z-50 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1 border border-white/20 shadow-sm">
            <img src={logoURL} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-sm text-white leading-tight flex items-center gap-1.5">
              <span>درة المنورة</span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            </span>
            <span className="text-[10px] text-slate-400 font-normal">مكتب نقل العمال</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-slate-300 active:scale-95 cursor-pointer"
            aria-label="تبديل المظهر"
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5 text-amber-400" />}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 hover:bg-slate-800 rounded-xl transition-colors text-white cursor-pointer"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Sidebar Overlay */}
      <AnimatePresence>
        {isSidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsSidebarOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Dark Sidebar */}
      <aside className={`
        fixed md:sticky top-0 right-0 h-screen w-64 bg-[#0F172A] text-slate-200 border-l border-slate-800/80 z-[70] transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-[100%]'} md:translate-x-0
        flex flex-col justify-between
      `}>
        {/* Brand Header */}
        <div className="p-4 pb-5 border-b border-slate-800/80 flex flex-col items-center relative">
          <div className="relative group mb-3">
            <div className="w-16 h-16 bg-white p-2 rounded-2xl flex items-center justify-center shadow-lg border border-white/20 group-hover:scale-105 transition-transform duration-300">
              <img 
                src={logoURL} 
                alt="Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="absolute -bottom-1 -left-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </span>
          </div>

          <h1 className="font-bold text-base text-white leading-tight text-center tracking-tight">شركة درة المنورة</h1>
          <p className="text-[11px] text-slate-400 font-normal mt-0.5 text-center">لنقل الحجاج والمعتمرين</p>
          
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-800/60 text-[10px] font-semibold text-emerald-400">
            <Sparkles className="w-3 h-3 text-amber-400" />
            <span>مكتب نقل العمال والتشغيل</span>
          </div>

          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden absolute top-3.5 left-3.5 p-1.5 hover:bg-slate-800 rounded-xl text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1.5 overflow-y-auto custom-scrollbar">
          <div className="px-3 pb-2">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">القائمة الرئيسية</span>
          </div>
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  setActiveTab(item.id);
                  setIsSidebarOpen(false);
                }}
                className={`
                  relative flex items-center justify-between px-3.5 py-3 rounded-xl transition-all duration-200 group cursor-pointer
                  ${isActive 
                    ? `${item.activeBg || 'bg-emerald-600'} text-white shadow-lg shadow-black/20 font-bold` 
                    : 'text-slate-300 hover:bg-slate-800/80 hover:text-white font-medium'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-1.5 rounded-lg transition-colors ${
                    isActive 
                      ? 'bg-white/20 text-white' 
                      : `bg-slate-800/90 ${item.iconColor} group-hover:bg-slate-700`
                  }`}>
                    <item.icon className="w-4.5 h-4.5" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs block leading-tight">{item.label}</span>
                    <span className={`text-[10px] block transition-opacity ${
                      isActive ? 'text-white/90 font-normal' : 'text-slate-400 group-hover:text-slate-300 font-normal'
                    }`}>
                      {item.desc}
                    </span>
                  </div>
                </div>
                {isActive && (
                  <ChevronLeft className="w-3.5 h-3.5 text-white/90 shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/50">
          <div className="p-2.5 bg-slate-800/70 rounded-xl border border-slate-700/60 flex items-center gap-2.5">
             <div className="w-9 h-9 rounded-xl overflow-hidden bg-emerald-950 flex items-center justify-center border border-emerald-700/40 shrink-0 text-emerald-400 font-bold text-sm">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.displayName?.charAt(0) || 'U'
                )}
             </div>
             <div className="flex flex-col min-w-0 flex-1 text-right">
                <span className="font-semibold text-xs text-white truncate leading-tight">{profile?.displayName || 'مستخدم'}</span>
                 <span className="text-[10px] text-slate-400 font-normal tracking-tight flex items-center gap-1 mt-0.5">
                  {profile?.role === 'admin' ? (
                    <span className="text-emerald-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full" />
                      مدير النظام
                    </span>
                  ) : profile?.role === 'supervisor' ? (
                    <span className="text-sky-400 font-medium flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-sky-400 rounded-full" />
                      موظف تشغيل
                    </span>
                  ) : (
                    <span className="text-amber-400 flex items-center gap-1 font-medium">
                      <span className="w-1.5 h-1.5 bg-amber-400 rounded-full animate-pulse" />
                      وضع قراءة فقط
                    </span>
                  )}
                </span>
             </div>
             <button 
                onClick={handleLogout}
                className="p-2 text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-lg transition-all shrink-0 cursor-pointer"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Warm Subtle Pearl-Beige Panel) */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#FDFCFB] dark:bg-background overflow-hidden h-screen">
        {/* Top bar for desktop */}
        <header className="hidden md:flex h-16 bg-white/90 dark:bg-surface/90 backdrop-blur-md border-b border-[#E8E5DF] dark:border-border items-center justify-between px-8 shrink-0 shadow-xs z-30">
          <div className="flex items-center gap-6 flex-1">
             <div className="flex flex-col text-right">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-text-main tracking-tight flex items-center gap-2">
                  <span className="text-emerald-800 dark:text-emerald-400 font-bold">{menuItems.find(i => i.id === activeTab)?.label || 'الرئيسية'}</span>
                  <span className="text-xs font-normal text-slate-400">/</span>
                  <span className="text-xs font-normal text-slate-500 dark:text-text-muted">{menuItems.find(i => i.id === activeTab)?.desc || ''}</span>
                </h2>
             </div>
             
             {/* Live Saudi Date display */}
             <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF9F6] dark:bg-background rounded-xl border border-[#E8E5DF] dark:border-border text-[11px] font-normal text-slate-600 dark:text-text-muted">
                <Calendar className="w-3.5 h-3.5 text-emerald-700 dark:text-emerald-400" />
                <span>{todayFormatted}</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Theme Switcher Button */}
             <button 
                onClick={toggleTheme}
                className="p-2.5 bg-[#FAF9F6] dark:bg-background hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all text-slate-600 dark:text-text-muted hover:text-slate-900 border border-[#E8E5DF] dark:border-border cursor-pointer shadow-xs active:scale-95"
                title={theme === 'light' ? 'التبديل إلى الوضع الليلي' : 'التبديل إلى الوضع النهاري'}
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-slate-700" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>

             {/* Profile and Role Indicator */}
             <div className="flex items-center gap-3 pr-3 border-r border-[#E8E5DF] dark:border-border">
               {profile?.role === 'admin' ? (
                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900 text-emerald-700 dark:text-emerald-400 text-[10px] font-semibold rounded-lg shadow-xs">
                   <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                   مدير النظام
                 </span>
               ) : profile?.role === 'supervisor' ? (
                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-900 text-sky-700 dark:text-sky-400 text-[10px] font-semibold rounded-lg shadow-xs">
                   <span className="w-1.5 h-1.5 bg-sky-500 rounded-full" />
                   موظف تشغيل
                 </span>
               ) : (
                 <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-[10px] font-semibold rounded-lg shadow-xs">
                   <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                   وضع القراءة فقط
                 </span>
               )}

               <div className="text-right flex flex-col">
                  <span className="font-semibold text-xs leading-tight text-slate-900 dark:text-text-main">{profile?.displayName || 'المستخدم'}</span>
                  <span className="text-[10px] text-slate-500 dark:text-text-muted font-normal">{profile?.email || 'مشرف العمليات'}</span>
               </div>
               
               <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-800 dark:text-emerald-400 font-bold border border-emerald-200 dark:border-emerald-800/40 overflow-hidden shadow-xs">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.displayName?.charAt(0) || 'U'
                  )}
               </div>
             </div>
          </div>
        </header>

        {/* Content Container */}
        <div className="flex-1 p-5 md:p-7 lg:p-8 overflow-y-auto w-full custom-scrollbar">
          <div className="max-w-7xl mx-auto h-full pb-10">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
