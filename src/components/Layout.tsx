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
  ChevronLeft,
  Bell,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { DmtcLogo } from './DmtcLogo';

export const Layout: React.FC<{ children: React.ReactNode; activeTab: string; setActiveTab: (tab: string) => void }> = ({ children, activeTab, setActiveTab }) => {
  const { profile } = useAuth();
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
  const isBusSupervisor = profile?.role === 'bus_supervisor' || profile?.role === 'inspector' || profile?.role === 'supervisor' || profile?.role === 'operator';
  const isReadOnly = profile?.role === 'readonly';

  const menuItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, desc: 'مؤشرات الأداء وبوابة الردود', iconBg: 'bg-blue-50 dark:bg-blue-900/40 text-primary' },
  ];

  // Bus Supervisor has access ONLY to the Dashboard (الصفحة الرئيسية فقط)
  if (!isBusSupervisor) {
    // Both Super Admin and Read-only can view Fleet and Monitoring (read-only mode)
    menuItems.push({ id: 'fleet', label: 'أسطول الحافلات', icon: Bus, desc: 'حالة الأسطول والتشغيل', iconBg: 'bg-sky-50 dark:bg-sky-900/40 text-sky-600' });
    menuItems.push({ id: 'monitoring', label: 'الرقابة والمتابعة', icon: ShieldCheck, desc: 'توزيع السائقين والمواقع', iconBg: 'bg-cyan-50 dark:bg-cyan-900/40 text-cyan-600' });

    // ONLY Super Admin can view Company Drivers, Salaries, and Admin Panel
    // Read-only is strictly forbidden from: سائقين الشركة - سلم الرواتب - إدارة النظام
    if (isSuperAdmin) {
      menuItems.push({ id: 'drivers', label: 'سائقين الشركة', icon: UserCheck, desc: 'سجل وتصنيف وردود السائقين', iconBg: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600' });
      menuItems.push({ id: 'salaries', label: 'سلم الرواتب', icon: CircleDollarSign, desc: 'مسيرات الرواتب والمستحقات', iconBg: 'bg-purple-50 dark:bg-purple-900/40 text-purple-600' });
      menuItems.push({ id: 'admin', label: 'إدارة النظام', icon: Settings, desc: 'المستخدمين والصلاحيات', iconBg: 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' });
    }
  }

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-background text-text-main font-sans flex flex-col md:flex-row rtl selection:bg-blue-500/20 selection:text-blue-900" dir="rtl">
      {/* Mobile Header (Malwarebytes Clean Style) */}
      <header className="md:hidden flex items-center justify-between p-3.5 bg-surface text-text-main border-b border-border sticky top-0 z-50 shadow-xs backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <DmtcLogo size="sm" variant="horizontal" />
        </div>
        <div className="flex items-center gap-1.5">
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-text-muted active:scale-95 cursor-pointer"
            aria-label="تبديل المظهر"
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5 text-amber-400" />}
          </button>
          <button 
            onClick={() => setIsSidebarOpen(true)} 
            className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-text-main cursor-pointer"
          >
            <Menu className="w-5 h-5 text-primary" />
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
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar (Clean Soft-Neumorphic Malwarebytes Style) */}
      <aside className={`
        fixed md:sticky top-0 right-0 h-screen w-64 bg-surface text-text-main border-l border-border z-[70] transition-all duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0 shadow-2xl' : 'translate-x-[100%]'} md:translate-x-0
        flex flex-col justify-between shadow-xs
      `}>
        {/* Brand Header with DMTC Logo */}
        <div className="p-4 border-b border-border/80 flex flex-col items-center relative bg-gradient-to-b from-blue-50/40 to-transparent dark:from-slate-800/20">
          <DmtcLogo size="lg" variant="full" showBadge={true} />

          <button 
            onClick={() => setIsSidebarOpen(false)} 
            className="md:hidden absolute top-3.5 left-3.5 p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-text-muted transition-colors cursor-pointer"
          >
            <X className="w-4.5 h-4.5" />
          </button>
        </div>

        {/* Navigation Items (Malwarebytes Rounded Tab Style) */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-2 overflow-y-auto custom-scrollbar">
          <div className="px-3 pb-1">
            <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">أقسام المنصة</span>
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
                  relative flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 group cursor-pointer
                  ${isActive 
                    ? 'bg-blue-50 dark:bg-blue-950/50 text-primary border border-blue-200/80 dark:border-blue-800 shadow-2xs font-black' 
                    : 'text-text-muted hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-text-main font-bold border border-transparent'}
                `}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl transition-all ${
                    isActive 
                      ? 'bg-primary text-white shadow-sm shadow-blue-500/30' 
                      : `${item.iconBg} group-hover:scale-105`
                  }`}>
                    <item.icon className="w-4 h-4" />
                  </div>
                  <div className="text-right">
                    <span className="text-xs block leading-tight">{item.label}</span>
                    <span className={`text-[10px] block transition-opacity mt-0.5 ${
                      isActive ? 'text-primary/80 font-bold' : 'text-text-muted/70 group-hover:text-text-muted font-normal'
                    }`}>
                      {item.desc}
                    </span>
                  </div>
                </div>
                {isActive && (
                  <ChevronLeft className="w-4 h-4 text-primary shrink-0" />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        <div className="p-3 border-t border-border bg-slate-50/60 dark:bg-slate-900/50">
          <div className="p-2.5 bg-surface dark:bg-slate-800/80 rounded-2xl border border-border flex items-center gap-2.5 shadow-2xs">
             <div className="w-10 h-10 rounded-xl overflow-hidden bg-blue-50 dark:bg-blue-950 flex items-center justify-center border border-blue-200/80 dark:border-blue-800 shrink-0 text-primary font-black text-sm shadow-2xs">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  profile?.displayName?.charAt(0) || 'U'
                )}
             </div>
             <div className="flex flex-col min-w-0 flex-1 text-right">
                <span className="font-black text-xs text-text-main truncate leading-tight">{profile?.displayName || 'المستخدم'}</span>
                <span className="text-[10px] text-text-muted font-bold tracking-tight flex items-center gap-1 mt-0.5">
                  {profile?.role === 'admin' ? (
                    <span className="text-primary font-black flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-primary rounded-full" />
                      مدير النظام
                    </span>
                  ) : (profile?.role === 'bus_supervisor' || profile?.role === 'inspector' || profile?.role === 'supervisor' || profile?.role === 'operator') ? (
                    <span className="text-purple-600 dark:text-purple-400 font-bold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                      مشرف نقل الحافلات
                    </span>
                  ) : (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-bold">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                      وضع قراءة فقط
                    </span>
                  )}
                </span>
             </div>
             <button 
                onClick={handleLogout}
                className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all shrink-0 cursor-pointer"
                title="تسجيل الخروج"
                aria-label="تسجيل الخروج"
              >
                <LogOut className="w-4 h-4" />
              </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area (Malwarebytes Soft Icy-Sky Field) */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden h-screen">
        {/* Top bar for desktop (Malwarebytes Clean Style) */}
        <header className="hidden md:flex h-16 bg-surface/90 backdrop-blur-md border-b border-border items-center justify-between px-8 shrink-0 shadow-2xs z-30">
          <div className="flex items-center gap-6 flex-1">
             <div className="flex flex-col text-right">
                <h2 className="text-sm font-black text-text-main tracking-tight flex items-center gap-2">
                  <span className="text-primary font-black">{menuItems.find(i => i.id === activeTab)?.label || 'الرئيسية'}</span>
                  <span className="text-xs font-normal text-slate-300">/</span>
                  <span className="text-xs font-bold text-text-muted">{menuItems.find(i => i.id === activeTab)?.desc || ''}</span>
                </h2>
             </div>
             
             {/* Live Saudi Date display */}
             <div className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 bg-blue-50/60 dark:bg-slate-800/60 rounded-xl border border-blue-100/80 dark:border-slate-700 text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs">
                <Calendar className="w-3.5 h-3.5 text-primary" />
                <span>{todayFormatted}</span>
             </div>
          </div>

          <div className="flex items-center gap-4">
             {/* Status Notification Bell */}
             <div className="p-2 bg-blue-50/50 dark:bg-slate-800/50 rounded-xl border border-blue-100/80 dark:border-slate-700 text-primary relative">
               <Bell className="w-4 h-4" />
               <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white" />
             </div>

             {/* Theme Switcher Button */}
             <button 
                onClick={toggleTheme}
                className="p-2 bg-blue-50/50 dark:bg-slate-800/50 hover:bg-blue-100/70 dark:hover:bg-slate-700 rounded-xl transition-all text-text-muted hover:text-text-main border border-blue-100/80 dark:border-slate-700 cursor-pointer shadow-2xs active:scale-95"
                title={theme === 'light' ? 'التبديل إلى الوضع الليلي' : 'التبديل إلى الوضع النهاري'}
              >
                {theme === 'light' ? (
                  <Moon className="w-4 h-4 text-slate-700" />
                ) : (
                  <Sun className="w-4 h-4 text-amber-400" />
                )}
              </button>

             {/* Profile and Role Indicator */}
             <div className="flex items-center gap-3 pr-3 border-r border-border">
               {profile?.role === 'admin' ? (
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800 text-primary text-[10px] font-black rounded-full shadow-2xs">
                   <span className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                   مدير النظام
                 </span>
               ) : (profile?.role === 'bus_supervisor' || profile?.role === 'inspector' || profile?.role === 'supervisor' || profile?.role === 'operator') ? (
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-50 dark:bg-purple-950/40 border border-purple-200/80 dark:border-purple-800 text-purple-700 dark:text-purple-400 text-[10px] font-black rounded-full shadow-2xs">
                   <span className="w-1.5 h-1.5 bg-purple-500 rounded-full" />
                   مشرف نقل الحافلات
                 </span>
               ) : (
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800 text-amber-700 dark:text-amber-400 text-[10px] font-black rounded-full shadow-2xs">
                   <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                   وضع القراءة فقط
                 </span>
               )}

               <div className="text-right flex flex-col">
                  <span className="font-black text-xs leading-tight text-text-main">{profile?.displayName || 'المستخدم'}</span>
                  <span className="text-[10px] text-text-muted font-bold">{profile?.email || 'مشرف العمليات'}</span>
               </div>
               
               <div className="w-9 h-9 rounded-xl bg-blue-100 dark:bg-blue-950/50 flex items-center justify-center text-primary font-black border border-blue-200/80 dark:border-blue-800/40 overflow-hidden shadow-2xs">
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
