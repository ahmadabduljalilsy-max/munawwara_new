import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  LayoutDashboard, 
  Bus, 
  FileText, 
  Settings, 
  LogOut, 
  Menu, 
  X, 
  ShieldCheck,
  CircleDollarSign,
  Search,
  Sun,
  Moon,
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

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const menuItems = [
    { id: 'dashboard', label: 'الرئيسية', icon: LayoutDashboard },
    { id: 'fleet', label: 'أسطول الشركة', icon: Bus },
    { id: 'monitoring', label: 'الرقابة والمتابعة', icon: ShieldCheck },
    { id: 'salaries', label: 'الرواتب', icon: CircleDollarSign },
  ];

  if (profile?.role === 'admin') {
    menuItems.push({ id: 'admin', label: 'الإدارة', icon: ShieldCheck });
  }

  const handleLogout = () => {
    signOut(auth);
  };

  return (
    <div className="min-h-screen bg-background text-text-main font-sans flex flex-col md:flex-row rtl" dir="rtl">
      {/* Mobile Header */}
      <header className="md:hidden flex items-center justify-between p-4 bg-surface border-b border-border sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center p-1 border border-border shadow-sm">
            <img src={logoURL} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-base text-text-main leading-none">درة المنورة</span>
            {profile?.role !== 'admin' && (
              <span className="text-[9px] font-black text-amber-600 dark:text-amber-400 mt-1">وضع القراءة فقط</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button 
            onClick={toggleTheme}
            className="p-2 hover:bg-background rounded-md transition-colors text-text-muted"
          >
            {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </button>
          <button onClick={() => setIsSidebarOpen(true)} className="p-2 hover:bg-background rounded-md transition-colors">
            <Menu className="w-6 h-6" />
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
            className="fixed inset-0 bg-black/30 backdrop-blur-sm z-[60] md:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside className={`
        fixed md:sticky top-0 right-0 h-screen w-60 bg-surface border-l border-border z-[70] transition-transform duration-300 ease-in-out
        ${isSidebarOpen ? 'translate-x-0' : 'translate-x-[100%]'} md:translate-x-0
        flex flex-col shadow-xl md:shadow-none
      `}>
        <div className="p-4 pb-5 border-b border-border flex flex-col items-center">
          <div className="w-16 h-16 bg-surface p-1 rounded-2xl flex items-center justify-center shadow-sm mb-2 border border-border">
            <img 
              src={logoURL} 
              alt="Logo" 
              className="w-full h-full object-contain"
            />
          </div>
          <h1 className="font-bold text-base text-primary leading-tight text-center">درة المنورة</h1>
          <p className="text-[9px] text-text-muted font-bold mt-0.5 text-center px-2">لنقل الحجاج والمعتمرين - مكتب التشغيل</p>
          <p className="text-[9px] text-primary font-black mt-0.5 text-center px-2">مكتب نقل العمال</p>
          <button onClick={() => setIsSidebarOpen(false)} className="md:hidden absolute top-4 left-4 p-1 hover:bg-background rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-0 py-3 flex flex-col gap-0.5 overflow-y-auto">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                setIsSidebarOpen(false);
              }}
              className={`
                relative flex items-center gap-3 px-6 py-3.5 transition-all duration-200 group
                ${activeTab === item.id 
                  ? 'text-primary' 
                  : 'text-text-main hover:bg-slate-50/50'}
              `}
            >
              {activeTab === item.id && (
                <>
                  <motion.div
                    layoutId="activeTabIndicator"
                    className="absolute inset-y-0 right-0 w-1 bg-primary rounded-l-full"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                  <motion.div
                    layoutId="activeTabBackground"
                    className="absolute inset-0 bg-primary/5 -z-10"
                    transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                  />
                </>
              )}
              <item.icon className={`w-4.5 h-4.5 transition-transform duration-200 group-hover:scale-110 ${activeTab === item.id ? 'text-primary' : 'text-text-muted'}`} />
              <span className={`font-bold text-xs transition-all duration-200 ${activeTab === item.id ? 'translate-x-1' : ''}`}>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-2 bg-slate-50 dark:bg-slate-900/50 mx-4 mb-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2 p-1">
             <div className="w-8 h-8 rounded-lg shadow-sm overflow-hidden bg-white dark:bg-slate-800 flex items-center justify-center border border-slate-200 dark:border-slate-700 shrink-0">
                {profile?.photoURL ? (
                  <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-primary font-bold text-sm">
                    {profile?.displayName?.charAt(0) || 'U'}
                  </span>
                )}
             </div>
             <div className="flex flex-col min-w-0 flex-1 text-right">
                <span className="font-bold text-[11px] text-text-main truncate leading-tight">{profile?.displayName || 'مستخدم'}</span>
                <span className="text-[9px] text-text-muted font-bold tracking-tight flex items-center gap-1.5 mt-0.5">
                  {profile?.role === 'admin' ? 'مدير النظام' : (
                    <span className="text-amber-600 dark:text-amber-400 flex items-center gap-1 font-black">
                      <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                      وضع قراءة فقط
                    </span>
                  )}
                </span>
             </div>
             <button 
                onClick={handleLogout}
                className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all shrink-0"
                title="تسجيل الخروج"
              >
                <LogOut className="w-3.5 h-3.5" />
              </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-background overflow-hidden h-screen">
        {/* Top bar for desktop */}
        <header className="hidden md:flex h-14 bg-surface border-b border-border items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-8 flex-1">
             <div className="flex flex-col">
                <h2 className="text-base font-black text-primary tracking-tight">
                  {menuItems.find(i => i.id === activeTab)?.label || 'الرئيسية'}
                </h2>
                <div className="h-0.5 w-1/3 bg-accent rounded-full mt-0.5" />
             </div>
             <div className="relative w-80">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted w-3.5 h-3.5" />
                <input 
                  type="text" 
                  placeholder="بحث سريع..." 
                  className="w-full pr-10 pl-4 py-1.5 text-xs bg-background border border-border rounded-lg outline-none focus:border-primary transition-all shadow-sm"
                />
             </div>
          </div>
          <div className="flex items-center gap-6">
             <button 
                onClick={toggleTheme}
                className="p-2 hover:bg-background rounded-full transition-colors text-text-muted"
                title={theme === 'light' ? 'تبديل للوضع الليلي' : 'تبديل للوضع النهاري'}
              >
                {theme === 'light' ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
              </button>
             <div className="flex items-center gap-4">
               {profile?.role !== 'admin' && (
                 <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-700 dark:text-amber-400 text-[10px] font-black rounded-full shadow-sm ml-2">
                   <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
                   وضع القراءة فقط
                 </span>
               )}
               <div className="text-right flex flex-col">
                  <span className="font-bold text-sm leading-tight">{profile?.displayName}</span>
                  <span className="text-[11px] text-text-muted">{profile?.role === 'admin' ? 'مدير النظام' : 'مستخدم'}</span>
               </div>
               <div className="w-9 h-9 rounded-full bg-background flex items-center justify-center text-text-muted font-bold border border-border overflow-hidden">
                  {profile?.photoURL ? (
                    <img src={profile.photoURL} alt="" className="w-full h-full object-cover" />
                  ) : (
                    profile?.displayName?.charAt(0) || 'U'
                  )}
               </div>
             </div>
          </div>
        </header>

        <div className="flex-1 p-6 lg:p-8 overflow-y-auto w-full">
          <div className="max-w-7xl mx-auto h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
};
