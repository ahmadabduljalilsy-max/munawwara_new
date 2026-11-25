import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Bus, 
  Settings, 
  LogOut, 
  X, 
  ShieldCheck,
  CircleDollarSign,
  Sun,
  Moon,
  Calendar,
  Sparkles,
  ChevronLeft,
  Bell,
  UserCheck,
  FileText,
  ChevronsLeft,
  ChevronsRight,
  MoreHorizontal
} from 'lucide-react';
import { useAuth } from '../lib/AuthContext';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { DmtcLogo } from './DmtcLogo';
import { EmptyState } from './EmptyState';

export interface LayoutAlertItem {
  id: string;
  title: string;
  subtitle?: string;
}

export const Layout: React.FC<{
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  alerts?: LayoutAlertItem[];
}> = ({ children, activeTab, setActiveTab, alerts = [] }) => {
  const { profile } = useAuth();
  const [isSidebarExpanded, setIsSidebarExpanded] = useState<boolean>(() => {
    try {
      return localStorage.getItem('sidebarExpanded') === 'true';
    } catch {
      return false;
    }
  });
  const [isMoreDrawerOpen, setIsMoreDrawerOpen] = useState(false);
  const [isAlertsOpen, setIsAlertsOpen] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{ label: string; top: number; left: number } | null>(null);
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

  const toggleSidebarExpanded = () => {
    setIsSidebarExpanded(prev => {
      const next = !prev;
      try {
        localStorage.setItem('sidebarExpanded', String(next));
      } catch {}
      return next;
    });
    setHoveredItem(null);
  };

  const isSuperAdmin = profile?.role === 'admin';
  const isBusSupervisor = profile?.role === 'bus_supervisor' || profile?.role === 'inspector' || profile?.role === 'supervisor' || profile?.role === 'operator';
  const isReadOnly = profile?.role === 'readonly';

  const menuItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard, desc: 'مؤشرات الأداء وبوابة الردود', iconBg: 'bg-blue-50 dark:bg-blue-900/40 text-primary' },
  ];

  // Bus Supervisor has access ONLY to the Dashboard (الصفحة الرئيسية فقط)
  if (!isBusSupervisor) {
    // Fleet management and Monitoring
    menuItems.push({ id: 'fleet', label: 'أسطول الحافلات', icon: Bus, desc: 'حالة الأسطول والتشغيل', iconBg: 'bg-sky-50 dark:bg-sky-900/40 text-sky-600' });
    menuItems.push({ id: 'monitoring', label: 'الرقابة والمتابعة', icon: ShieldCheck, desc: 'توزيع السائقين والمواقع', iconBg: 'bg-cyan-50 dark:bg-cyan-900/40 text-cyan-600' });

    // ONLY Super Admin can view Company Drivers, Salaries, and Admin Panel
    // Read-only is strictly forbidden from: سائقين الشركة - سلم الرواتب - إدارة النظام
    if (isSuperAdmin) {
      menuItems.push({ id: 'drivers', label: 'سائقين الشركة', icon: UserCheck, desc: 'سجل وتصنيف وردود السائقين', iconBg: 'bg-emerald-50 dark:bg-emerald-900/40 text-emerald-600' });
      menuItems.push({ id: 'reports', label: 'التقارير التشغيلية', icon: FileText, desc: 'تصدير تقرير Word (مدير النظام فقط)', iconBg: 'bg-teal-50 dark:bg-teal-900/40 text-teal-600' });
      menuItems.push({ id: 'salaries', label: 'سلم الرواتب', icon: CircleDollarSign, desc: 'مسيرات الرواتب والمستحقات', iconBg: 'bg-purple-50 dark:bg-purple-900/40 text-purple-600' });
      menuItems.push({ id: 'admin', label: 'إدارة النظام', icon: Settings, desc: 'المستخدمين والصلاحيات', iconBg: 'bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600' });
    }
  }

  const handleLogout = () => {
    signOut(auth);
  };

  const mobilePrimaryDefs = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    ...(menuItems.some(i => i.id === 'fleet') ? [{ id: 'fleet', label: 'الأسطول', icon: Bus }] : []),
    ...(menuItems.some(i => i.id === 'drivers')
      ? [{ id: 'drivers', label: 'السائقون', icon: UserCheck }]
      : menuItems.some(i => i.id === 'monitoring')
      ? [{ id: 'monitoring', label: 'الرقابة', icon: ShieldCheck }]
      : [])
  ];
  const mobilePrimaryIds = mobilePrimaryDefs.map(i => i.id);
  const mobileDrawerItems = menuItems.filter(i => !mobilePrimaryIds.includes(i.id));
  const isMoreActive = mobileDrawerItems.some(i => i.id === activeTab);

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
            className="p-2 hover:bg-blue-50 dark:hover:bg-slate-800 rounded-xl transition-colors text-text-muted active:scale-95 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            aria-label="تبديل المظهر"
          >
            {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5 text-amber-400" />}
          </button>
        </div>
      </header>

      {/* Desktop Sidebar (64px Icon Rail by default, expandable and saved in localStorage; hidden on mobile <768px) */}
      <aside className={`
        hidden md:flex sticky top-0 start-0 h-screen shrink-0 bg-surface text-text-main border-e border-border z-[70] transition-all duration-300 ease-in-out
        ${isSidebarExpanded ? 'w-64' : 'w-16'}
        flex-col justify-between shadow-xs
      `}>
        {/* Brand Header with DMTC Logo + Expand/Collapse Button */}
        {isSidebarExpanded ? (
          <div className="p-4 border-b border-border/80 flex flex-col items-center relative bg-gradient-to-b from-blue-50/40 to-transparent dark:from-slate-800/20">
            <DmtcLogo size="lg" variant="full" showBadge={true} />

            <button
              type="button"
              onClick={toggleSidebarExpanded}
              title="تصغير القائمة الجانبية"
              aria-label="تصغير القائمة الجانبية"
              className="absolute top-3 end-3 p-1.5 bg-surface/80 hover:bg-blue-50 dark:hover:bg-slate-800 text-text-muted hover:text-primary border border-border rounded-xl transition-colors cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronsRight className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <div className="py-3 px-1.5 border-b border-border/80 flex flex-col items-center gap-2 bg-gradient-to-b from-blue-50/40 to-transparent dark:from-slate-800/20">
            <div className="w-10 h-10 flex items-center justify-center overflow-hidden">
              <DmtcLogo size="xs" className="[&>div]:w-10 [&>div]:h-10" />
            </div>
            <button
              type="button"
              onClick={toggleSidebarExpanded}
              title="توسيع القائمة الجانبية"
              aria-label="توسيع القائمة الجانبية"
              className="w-9 h-8 flex items-center justify-center bg-blue-50/60 dark:bg-slate-800/60 hover:bg-blue-100/80 dark:hover:bg-slate-700 text-text-muted hover:text-primary border border-border rounded-xl transition-colors cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Navigation Items */}
        <nav className={`flex-1 flex flex-col gap-2 overflow-y-auto custom-scrollbar ${isSidebarExpanded ? 'px-3 py-4' : 'px-1.5 py-3 items-center'}`}>
          {isSidebarExpanded && (
            <div className="px-3 pb-1">
              <span className="text-[10px] font-black uppercase tracking-wider text-text-muted">أقسام المنصة</span>
            </div>
          )}
          {menuItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setHoveredItem(null);
                }}
                onMouseEnter={(e) => {
                  if (!isSidebarExpanded) {
                    const rect = e.currentTarget.getBoundingClientRect();
                    setHoveredItem({
                      label: item.label,
                      top: rect.top + rect.height / 2,
                      left: rect.left - 8
                    });
                  }
                }}
                onMouseLeave={() => {
                  if (!isSidebarExpanded) setHoveredItem(null);
                }}
                aria-label={item.label}
                className={
                  isSidebarExpanded
                    ? `relative flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all duration-200 group cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-primary border border-blue-200/80 dark:border-blue-800 shadow-2xs font-black'
                          : 'text-text-muted hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-text-main font-bold border border-transparent'
                      }`
                    : `relative w-11 h-11 flex items-center justify-center rounded-2xl transition-all duration-200 group cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-primary border border-blue-200/80 dark:border-blue-800 shadow-2xs'
                          : 'text-text-muted hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-text-main border border-transparent'
                      }`
                }
              >
                {isSidebarExpanded ? (
                  <>
                    <div className="flex items-center gap-3">
                      <div className={`p-2 rounded-xl transition-all ${
                        isActive
                          ? 'bg-blue-100/80 dark:bg-blue-900/60 text-primary'
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
                  </>
                ) : (
                  <item.icon className={`w-5 h-5 transition-transform group-hover:scale-105 ${isActive ? 'text-primary' : ''}`} />
                )}
              </button>
            );
          })}
        </nav>

        {/* User Card & Logout */}
        {isSidebarExpanded ? (
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
                  className="p-2 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all shrink-0 cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  title="تسجيل الخروج"
                  aria-label="تسجيل الخروج"
                >
                  <LogOut className="w-4 h-4" />
                </button>
            </div>
          </div>
        ) : (
          <div className="py-3 px-1.5 border-t border-border bg-slate-50/60 dark:bg-slate-900/50 flex flex-col items-center gap-2">
            <div
              className="w-9 h-9 rounded-xl overflow-hidden bg-blue-50 dark:bg-blue-950 flex items-center justify-center border border-blue-200/80 dark:border-blue-800 text-primary font-black text-xs shadow-2xs"
              title={profile?.displayName || 'المستخدم'}
            >
              {profile?.photoURL ? (
                <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
              ) : (
                profile?.displayName?.charAt(0) || 'U'
              )}
            </div>
            <button
              type="button"
              onClick={handleLogout}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredItem({
                  label: 'تسجيل الخروج',
                  top: rect.top + rect.height / 2,
                  left: rect.left - 8
                });
              }}
              onMouseLeave={() => setHoveredItem(null)}
              className="w-10 h-10 flex items-center justify-center text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-all cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </aside>

      {/* Collapsed Sidebar Hover Tooltip (Desktop) */}
      {!isSidebarExpanded && hoveredItem && (
        <div
          className="hidden md:block fixed z-[90] px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-slate-800 text-white text-xs font-bold shadow-lg pointer-events-none whitespace-nowrap border border-slate-700/60"
          style={{
            top: `${hoveredItem.top}px`,
            left: `${hoveredItem.left}px`,
            transform: 'translate(-100%, -50%)'
          }}
        >
          {hoveredItem.label}
        </div>
      )}

      {/* Main Content Area (Malwarebytes Soft Icy-Sky Field) */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden h-screen">
        {/* Top bar for desktop (Malwarebytes Clean Style) */}
        <header className="hidden md:flex h-16 bg-surface/90 backdrop-blur-md border-b border-border items-center justify-between px-4 md:px-6 shrink-0 shadow-2xs z-30">
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
             <div className="relative">
               <button
                 type="button"
                 onClick={() => setIsAlertsOpen(prev => !prev)}
                 className="p-2 bg-blue-50/50 dark:bg-slate-800/50 hover:bg-blue-100/70 dark:hover:bg-slate-700 rounded-xl border border-blue-100/80 dark:border-slate-700 text-primary relative cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                 aria-label="التنبيهات"
                 title="التنبيهات"
               >
                 <Bell className="w-4 h-4" />
                 <span className={`absolute top-1.5 start-1.5 w-2 h-2 rounded-full ring-2 ring-white ${alerts.length > 0 ? 'bg-amber-500' : 'bg-emerald-500'}`} />
               </button>

               {isAlertsOpen && (
                 <div className="absolute end-0 mt-2 w-80 bg-surface border border-border rounded-2xl shadow-xl z-50 overflow-hidden" dir="rtl">
                   <div className="px-4 py-3 border-b border-border flex items-center justify-between">
                     <span className="text-xs font-black text-text-main">التنبيهات ({alerts.length})</span>
                     <button
                       type="button"
                       onClick={() => setIsAlertsOpen(false)}
                       className="p-1 text-text-muted hover:text-text-main rounded-lg cursor-pointer"
                     >
                       <X className="w-3.5 h-3.5" />
                     </button>
                   </div>
                   <div className="p-3 max-h-72 overflow-y-auto">
                     {alerts.length === 0 ? (
                       <EmptyState
                         icon={Bell}
                         title="لا توجد تنبيهات اليوم"
                         description="كل السجلات والعقود تسير بشكل منتظم."
                         variant="positive"
                       />
                     ) : (
                       <div className="space-y-2">
                         {alerts.map(a => (
                           <div key={a.id} className="p-2.5 rounded-xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/70 dark:border-amber-800/50 text-right">
                             <div className="text-xs font-bold text-text-main truncate">{a.title}</div>
                             {a.subtitle && <div className="text-[11px] text-amber-700 dark:text-amber-300 mt-0.5">{a.subtitle}</div>}
                           </div>
                         ))}
                       </div>
                     )}
                   </div>
                 </div>
               )}
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
             <div className="flex items-center gap-3 ps-3 border-s border-border">
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
        <div className="flex-1 px-4 py-5 md:px-6 md:py-6 overflow-y-auto w-full custom-scrollbar">
          <div className="w-full h-full pb-20 md:pb-10">
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation Bar (<768px) */}
      <nav
        aria-label="التنقل السفلي"
        className="md:hidden fixed bottom-0 inset-x-0 z-50 bg-surface/95 backdrop-blur-md border-t border-border shadow-lg px-2 py-1.5"
      >
        <div className="flex items-center gap-1">
          {mobilePrimaryDefs.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => {
                  setActiveTab(item.id);
                  setIsMoreDrawerOpen(false);
                }}
                className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-2xl transition-all cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                  isActive
                    ? 'bg-blue-50 dark:bg-blue-950/60 text-primary font-black'
                    : 'text-text-muted hover:text-text-main font-bold'
                }`}
              >
                <item.icon className={`w-5 h-5 ${isActive ? 'text-primary' : ''}`} />
                <span className="text-[10px] leading-none truncate max-w-full">{item.label}</span>
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => setIsMoreDrawerOpen(prev => !prev)}
            className={`flex-1 flex flex-col items-center justify-center gap-1 py-1.5 px-1 rounded-2xl transition-all cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
              isMoreDrawerOpen || isMoreActive
                ? 'bg-blue-50 dark:bg-blue-950/60 text-primary font-black'
                : 'text-text-muted hover:text-text-main font-bold'
            }`}
          >
            <MoreHorizontal className={`w-5 h-5 ${isMoreDrawerOpen || isMoreActive ? 'text-primary' : ''}`} />
            <span className="text-[10px] leading-none">المزيد</span>
          </button>
        </div>
      </nav>

      {/* Mobile "المزيد" Drawer */}
      <AnimatePresence>
        {isMoreDrawerOpen && (
          <div className="md:hidden fixed inset-0 z-[80] flex flex-col justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMoreDrawerOpen(false)}
              className="fixed inset-0 bg-slate-900/45 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 28, stiffness: 300 }}
              className="relative z-10 bg-surface border-t border-border rounded-t-3xl shadow-2xl p-4 pb-6 max-h-[80vh] overflow-y-auto"
              dir="rtl"
            >
              <div className="w-10 h-1 bg-slate-300 dark:bg-slate-700 rounded-full mx-auto mb-3" />

              <div className="flex items-center justify-between pb-3 border-b border-border/80 mb-3">
                <span className="text-xs font-black text-text-main">باقي الأقسام</span>
                <button
                  type="button"
                  onClick={() => setIsMoreDrawerOpen(false)}
                  className="p-1.5 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-text-muted cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label="إغلاق"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {mobileDrawerItems.length > 0 && (
                <div className="flex flex-col gap-2 mb-4">
                  {mobileDrawerItems.map((item) => {
                    const isActive = activeTab === item.id;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setActiveTab(item.id);
                          setIsMoreDrawerOpen(false);
                        }}
                        className={`flex items-center justify-between px-3.5 py-3 rounded-2xl transition-all cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary ${
                          isActive
                            ? 'bg-blue-50 dark:bg-blue-950/60 text-primary border border-blue-200/80 dark:border-blue-800 font-black'
                            : 'text-text-muted hover:bg-slate-50 dark:hover:bg-slate-800/60 hover:text-text-main font-bold border border-transparent'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-2 rounded-xl ${
                            isActive
                              ? 'bg-blue-100/80 dark:bg-blue-900/60 text-primary'
                              : item.iconBg
                          }`}>
                            <item.icon className="w-4 h-4" />
                          </div>
                          <div className="text-right">
                            <span className="text-xs block leading-tight">{item.label}</span>
                            <span className={`text-[10px] block mt-0.5 ${
                              isActive ? 'text-primary/80 font-bold' : 'text-text-muted/70 font-normal'
                            }`}>
                              {item.desc}
                            </span>
                          </div>
                        </div>
                        {isActive && <ChevronLeft className="w-4 h-4 text-primary shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Mobile User Card & Logout inside Drawer */}
              <div className="pt-3 border-t border-border">
                <div className="p-2.5 bg-slate-50 dark:bg-slate-800/70 rounded-2xl border border-border flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl overflow-hidden bg-blue-50 dark:bg-blue-950 flex items-center justify-center border border-blue-200/80 dark:border-blue-800 shrink-0 text-primary font-black text-sm">
                    {profile?.photoURL ? (
                      <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                    ) : (
                      profile?.displayName?.charAt(0) || 'U'
                    )}
                  </div>
                  <div className="flex flex-col min-w-0 flex-1 text-right">
                    <span className="font-black text-xs text-text-main truncate leading-tight">{profile?.displayName || 'المستخدم'}</span>
                    <span className="text-[10px] text-text-muted font-bold mt-0.5">
                      {profile?.role === 'admin'
                        ? 'مدير النظام'
                        : (profile?.role === 'bus_supervisor' || profile?.role === 'inspector' || profile?.role === 'supervisor' || profile?.role === 'operator')
                        ? 'مشرف نقل الحافلات'
                        : 'وضع قراءة فقط'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl transition-colors cursor-pointer outline-none focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>خروج</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
