import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bus as BusIcon, 
  MapPin, 
  Hash, 
  User, 
  CheckCircle2, 
  AlertCircle, 
  Send, 
  RotateCcw, 
  Sparkles,
  ExternalLink,
  ShieldAlert,
  ArrowRight,
  ShieldCheck,
  Lock,
  LogOut,
  UserCheck
} from 'lucide-react';
import { collection, addDoc, getDocs, doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { onAuthStateChanged, signInWithPopup, GoogleAuthProvider, signOut } from 'firebase/auth';
import { db, auth } from '../lib/firebase';
import { useLogo } from '../lib/LogoContext';
import { syncResponseToGoogleSheet } from '../lib/googleSheetService';
import type { CompanyDriver, DriverResponseType, AppUser, Bus } from '../types';

const ADMIN_EMAILS = ['ahmad.abduljalil.sy@gmail.com', 'ahmad.abduljalilmunawwara@gmail.com'];

const RESPONSE_OPTIONS: {
  type: DriverResponseType;
  label: string;
  description: string;
  color: string;
  bgLight: string;
  borderColor: string;
  activeRing: string;
}[] = [
  {
    type: 'محايل عسير',
    label: 'محايل عسير',
    description: 'ردود ومسار منطقة محايل عسير والمنطقة الجنوبية',
    color: '#059669',
    bgLight: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    borderColor: 'border-emerald-500/30 hover:border-emerald-500',
    activeRing: 'ring-2 ring-emerald-500 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500'
  },
  {
    type: 'ينبع',
    label: 'ينبع',
    description: 'ردود ومسار محافظة ينبع والساحل الغربي',
    color: '#0284c7',
    bgLight: 'bg-sky-500/10 text-sky-700 dark:text-sky-400',
    borderColor: 'border-sky-500/30 hover:border-sky-500',
    activeRing: 'ring-2 ring-sky-500 bg-sky-50 dark:bg-sky-950/40 border-sky-500'
  },
  {
    type: 'القصيم',
    label: 'القصيم',
    description: 'ردود ومسار منطقة القصيم وبريدة وعنيزة',
    color: '#d97706',
    bgLight: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    borderColor: 'border-amber-500/30 hover:border-amber-500',
    activeRing: 'ring-2 ring-amber-500 bg-amber-50 dark:bg-amber-950/40 border-amber-500'
  },
  {
    type: 'الرياض',
    label: 'الرياض',
    description: 'ردود ومسار العاصمة والمنطقة الوسطى',
    color: '#7c3aed',
    bgLight: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
    borderColor: 'border-purple-500/30 hover:border-purple-500',
    activeRing: 'ring-2 ring-purple-500 bg-purple-50 dark:bg-purple-950/40 border-purple-500'
  },
  {
    type: 'الترددية',
    label: 'الترددية',
    description: 'ردود ومسار حافلات النقل الترددي والمحطات المتتابعة',
    color: '#0d9488',
    bgLight: 'bg-teal-500/10 text-teal-700 dark:text-teal-400',
    borderColor: 'border-teal-500/30 hover:border-teal-500',
    activeRing: 'ring-2 ring-teal-500 bg-teal-50 dark:bg-teal-950/40 border-teal-500'
  }
];

export interface PublicDriverResponsePageProps {
  onBackToDashboard?: () => void;
}

export const PublicDriverResponsePage: React.FC<PublicDriverResponsePageProps> = ({ onBackToDashboard }) => {
  const { logoURL } = useLogo();
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userProfile, setUserProfile] = useState<AppUser | null>(null);
  const [authChecking, setAuthChecking] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [loginError, setLoginError] = useState<string | null>(null);

  const [drivers, setDrivers] = useState<CompanyDriver[]>([]);
  const [loadingDrivers, setLoadingDrivers] = useState(true);
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loadingBuses, setLoadingBuses] = useState(true);
  const [googleSheetWebhookUrl, setGoogleSheetWebhookUrl] = useState<string>('');
  
  // Form State
  const [serialInput, setSerialInput] = useState<string>('');
  const [busNumber, setBusNumber] = useState<string>('');
  const [selectedResponse, setSelectedResponse] = useState<DriverResponseType>('محايل عسير');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submittedData, setSubmittedData] = useState<{
    driverName: string;
    serialNumber: number;
    busNumber: string;
    responseType: string;
    date: string;
    recordedBy: string;
    recordedByRole: string;
  } | null>(null);

  // 1. Auth Listener: Check who is viewing this page
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        try {
          const userSnap = await getDoc(doc(db, 'users', user.uid));
          if (userSnap.exists()) {
            setUserProfile({ uid: user.uid, ...userSnap.data() } as AppUser);
          } else {
            // New user registration
            const isSuper = ADMIN_EMAILS.includes(user.email || '');
            const newUserData: any = {
              uid: user.uid,
              email: user.email || '',
              displayName: user.displayName || '',
              photoURL: user.photoURL || '',
              role: isSuper ? 'admin' : 'pending',
              approved: isSuper,
              createdAt: serverTimestamp()
            };
            await setDoc(doc(db, 'users', user.uid), newUserData, { merge: true });
            setUserProfile(newUserData);
          }
        } catch (e) {
          console.error('Error fetching user profile for driver response:', e);
        }
      } else {
        setUserProfile(null);
      }
      setAuthChecking(false);
    });

    return () => unsub();
  }, []);

  // 2. Authorization determination (مشرف نقل الحافلات ومدير النظام فقط، ويمنع وضع قراءة فقط)
  const isAuthorized = useMemo(() => {
    if (!currentUser) return false;
    if (ADMIN_EMAILS.includes(currentUser.email || '')) return true;
    if (!userProfile?.approved) return false;
    const role = userProfile.role;
    // Strict check: readonly users are forbidden from driver response registration
    if (role === 'readonly') return false;
    if (['admin', 'bus_supervisor', 'supervisor', 'operator', 'inspector'].includes(role)) return true;
    return Boolean(userProfile.canSubmitDriverResponses);
  }, [currentUser, userProfile]);

  const roleArabicTitle = useMemo(() => {
    if (!currentUser) return '';
    if (ADMIN_EMAILS.includes(currentUser.email || '')) return 'مدير النظام';
    if (!userProfile) return 'موظف';
    switch (userProfile.role) {
      case 'admin':
        return 'مدير النظام';
      case 'bus_supervisor':
      case 'supervisor':
      case 'operator':
      case 'inspector':
        return 'مشرف نقل الحافلات';
      case 'readonly':
        return 'وضع قراءة فقط';
      default:
        return userProfile.canSubmitDriverResponses ? 'مشرف نقل الحافلات' : 'قيد المراجعة';
    }
  }, [currentUser, userProfile]);

  // 3. Load drivers, fleet buses & app settings from Firestore
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      try {
        setLoadingDrivers(true);
        setLoadingBuses(true);
        
        // Fetch drivers
        const driversSnap = await getDocs(collection(db, 'company_drivers'));
        if (!isMounted) return;
        const loaded: CompanyDriver[] = [];
        driversSnap.forEach(d => {
          loaded.push({ id: d.id, ...d.data() } as CompanyDriver);
        });
        setDrivers(loaded);

        // Fetch fleet buses
        try {
          const busesSnap = await getDocs(collection(db, 'buses'));
          if (isMounted) {
            const loadedBuses: Bus[] = [];
            busesSnap.forEach(b => {
              loadedBuses.push({ id: b.id, ...b.data() } as Bus);
            });
            setBuses(loadedBuses);
          }
        } catch (bErr) {
          console.error('Error loading buses for response portal:', bErr);
        } finally {
          if (isMounted) setLoadingBuses(false);
        }

        // Fetch app settings
        try {
          const appSnap = await getDoc(doc(db, 'settings', 'app'));
          if (appSnap.exists() && isMounted) {
            const data = appSnap.data();
            if (data.googleSheetWebhookUrl) {
              setGoogleSheetWebhookUrl(data.googleSheetWebhookUrl);
            }
          }
        } catch {
          // ignore
        }
      } catch (err) {
        console.error('Error loading drivers for response portal:', err);
      } finally {
        if (isMounted) setLoadingDrivers(false);
      }
    }
    loadData();

    // Check URL parameters for pre-filling (e.g. ?serial=1&bus=205)
    const params = new URLSearchParams(window.location.search);
    const initialSerial = params.get('serial') || params.get('s');
    const initialBus = params.get('bus') || params.get('b');
    const initialResp = params.get('type') || params.get('dest');

    if (initialSerial) setSerialInput(initialSerial);
    if (initialBus) setBusNumber(initialBus);
    if (initialResp && ['محايل عسير', 'ينبع', 'القصيم', 'الرياض', 'الترددية'].includes(initialResp)) {
      setSelectedResponse(initialResp as DriverResponseType);
    }

    return () => { isMounted = false; };
  }, []);

  const handleGoogleSignIn = async () => {
    try {
      setIsSigningIn(true);
      setLoginError(null);
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithPopup(auth, provider);
    } catch (err: any) {
      console.error('Google Sign-in failed:', err);
      setLoginError(err?.message || 'تعذر تسجيل الدخول بواسطة Google. يرجى المحاولة مجدداً.');
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUserProfile(null);
      setCurrentUser(null);
    } catch (e) {
      console.error('Sign-out error:', e);
    }
  };

  // Helper to normalize bus numbers for comparison (converts Arabic digits, trims)
  const normalizeBusNum = (val: string) => {
    if (!val) return '';
    return val
      .toString()
      .trim()
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[^\w\d\u0600-\u06FF]/g, '')
      .toLowerCase();
  };

  // Check if entered bus exists in the fleet
  const matchedFleetBus = useMemo(() => {
    const trimmed = busNumber.trim();
    if (!trimmed || buses.length === 0) return null;
    const normalized = normalizeBusNum(trimmed);
    return buses.find(b => {
      const opNorm = normalizeBusNum(b.operationalNumber);
      const plateNorm = normalizeBusNum(b.plateNumber);
      return (opNorm && opNorm === normalized) || (plateNorm && plateNorm === normalized);
    }) || null;
  }, [busNumber, buses]);

  const isBusInvalid = Boolean(busNumber.trim() && buses.length > 0 && !matchedFleetBus);

  // Find matched driver based on entered serialNumber
  const matchedDriver = useMemo(() => {
    const sNum = parseInt(serialInput.trim(), 10);
    if (isNaN(sNum) || sNum <= 0) return null;
    return drivers.find(d => d.serialNumber === sNum) || null;
  }, [serialInput, drivers]);

  // When matched driver changes and busNumber is empty, prefill with driver's busNumber
  useEffect(() => {
    if (matchedDriver && !busNumber && matchedDriver.busNumber) {
      setBusNumber(matchedDriver.busNumber);
    }
  }, [matchedDriver]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthorized) {
      setError('غير مصرح لك بتسجيل الردود. هذه الصفحة مخصصة فقط للأشخاص المعتمدين من الإدارة.');
      return;
    }

    const sNum = parseInt(serialInput.trim(), 10);
    if (isNaN(sNum) || sNum <= 0) {
      setError('يرجى إدخال الرقم المتسلسل للسائق بشكل صحيح (مثال: 1)');
      return;
    }

    if (!matchedDriver) {
      setError(`لم يتم العثور على سائق مسجل بالرقم المتسلسل (#${sNum}). يرجى التأكد من الرقم.`);
      return;
    }

    if (!busNumber.trim()) {
      setError('يرجى إدخال رقم الحافلة');
      return;
    }

    // Strict Fleet Bus Validation: Bus number MUST be in the fleet
    if (buses.length > 0 && !matchedFleetBus) {
      setError(`تنبيه: رقم الحافلة (${busNumber.trim()}) غير مسجل ضمن حافلات الأسطول المعتمدة. يجب أن يكون رقم الحافلة تابعاً لأسطول الشركة لتسجيل الرد.`);
      return;
    }

    if (!selectedResponse) {
      setError('يرجى اختيار نوع الرد أو الوجهة');
      return;
    }

    try {
      setSubmitting(true);
      const nowFormatted = new Date().toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });

      const recordedByName = currentUser?.displayName || currentUser?.email || 'موظف تشغيل';

      const responsePayload = {
        driverId: matchedDriver.id,
        driverSerialNumber: sNum,
        driverName: matchedDriver.fullName,
        busNumber: busNumber.trim(),
        responseType: selectedResponse,
        notes: notes.trim() || '',
        createdDate: nowFormatted,
        createdAt: serverTimestamp(),
        createdBy: `${roleArabicTitle}: ${recordedByName}`,
        recordedBy: recordedByName,
        recordedByRole: roleArabicTitle,
        recordedByUid: currentUser?.uid || ''
      };

      // 1. Save to Firestore driver_responses
      await addDoc(collection(db, 'driver_responses'), responsePayload);

      // 2. Sync to Google Sheet if Webhook is configured
      if (googleSheetWebhookUrl) {
        syncResponseToGoogleSheet(googleSheetWebhookUrl, {
          driverSerialNumber: sNum,
          driverName: matchedDriver.fullName,
          busNumber: busNumber.trim(),
          responseType: selectedResponse,
          notes: notes.trim(),
          createdDate: nowFormatted
        }).catch(e => console.warn('Background Google Sheet sync warning:', e));
      }

      // 3. Show Success Receipt Screen
      setSubmittedData({
        driverName: matchedDriver.fullName,
        serialNumber: sNum,
        busNumber: busNumber.trim(),
        responseType: selectedResponse,
        date: nowFormatted,
        recordedBy: recordedByName,
        recordedByRole: roleArabicTitle
      });

    } catch (err: any) {
      console.error('Failed to submit driver response:', err);
      setError(err?.message || 'حدث خطأ أثناء إرسال الرد. يرجى التحقق من اتصالك والمحاولة مرة أخرى.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetForm = () => {
    setSubmittedData(null);
    setSerialInput('');
    setBusNumber('');
    setSelectedResponse('محايل عسير');
    setNotes('');
    setError(null);
  };

  const handleGoToAdmin = () => {
    try {
      const url = new URL(window.location.href);
      url.searchParams.delete('action');
      url.searchParams.delete('mode');
      url.searchParams.delete('view');
      url.searchParams.delete('page');
      url.hash = '';
      window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
    } catch {
      // ignore
    }
    if (onBackToDashboard) {
      onBackToDashboard();
    } else {
      window.location.href = window.location.pathname;
    }
  };

  // Loading state
  if (authChecking) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 text-center" dir="rtl">
        <div className="space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-white p-1 border border-border shadow-md mx-auto flex items-center justify-center animate-pulse">
            <img src={logoURL} alt="Logo" className="w-full h-full object-contain" />
          </div>
          <p className="text-sm font-black text-slate-700 dark:text-slate-300">
            جاري التحقق من صلاحية الوصول...
          </p>
        </div>
      </div>
    );
  }

  // 🔒 SCREEN 1: Not Authenticated Gate
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between" dir="rtl">
        <header className="p-4 border-b border-border bg-surface/80 backdrop-blur-md">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white p-1 border border-border shadow-xs flex items-center justify-center overflow-hidden">
                <img src={logoURL} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xs font-black">بوابة تسجيل ردود ومسارات السائقين</h1>
                <p className="text-[10px] text-text-muted">نظام إدارة وتشغيل الأسطول</p>
              </div>
            </div>
            <button
              onClick={handleGoToAdmin}
              className="text-xs text-text-muted hover:text-primary flex items-center gap-1 cursor-pointer"
            >
              <span>الرئيسية</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 flex items-center justify-center flex-1">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface border border-border rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6"
          >
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
              <Lock className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-100 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 inline-block">
                تسجيل الدخول للكوادر المصرح لها
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                نموذج تسجيل رد وحركة السائق
              </h2>
              <p className="text-xs text-text-muted leading-relaxed">
                هذه الواجهة مخصصة ومحصورة فقط للكوادر المخولة والمحددة من قبل إدارة الشركة:
              </p>
            </div>

            {/* Authorized Roles Badges */}
            <div className="grid grid-cols-2 gap-2 text-xs font-black">
              <div className="p-2.5 bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 rounded-xl flex items-center gap-1.5 justify-center">
                <UserCheck className="w-4 h-4 text-sky-600" />
                <span>موظف تشغيل</span>
              </div>
              <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-1.5 justify-center">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>مراقب</span>
              </div>
              <div className="p-2.5 bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border border-purple-200 dark:border-purple-800 rounded-xl flex items-center gap-1.5 justify-center">
                <BusIcon className="w-4 h-4 text-purple-600" />
                <span>مشرف نقل الحافلات</span>
              </div>
              <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-800 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl flex items-center gap-1.5 justify-center">
                <Lock className="w-4 h-4 text-indigo-600" />
                <span>مدير النظام</span>
              </div>
            </div>

            {loginError && (
              <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs font-bold">
                {loginError}
              </div>
            )}

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={isSigningIn}
              className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-black text-xs rounded-2xl transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isSigningIn ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>جاري تسجيل الدخول...</span>
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>تسجيل الدخول عبر Google للتحقق من الصلاحية</span>
                </>
              )}
            </button>
          </motion.div>
        </main>

        <footer className="text-center py-3 text-[11px] text-text-muted border-t border-border">
          نظام إدارة الحافلات والسائقين &copy; {new Date().getFullYear()}
        </footer>
      </div>
    );
  }

  // 🚫 SCREEN 2: Authenticated but Not Authorized Gate
  if (!isAuthorized) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between" dir="rtl">
        <header className="p-4 border-b border-border bg-surface/80 backdrop-blur-md">
          <div className="max-w-md mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white p-1 border border-border shadow-xs flex items-center justify-center overflow-hidden">
                <img src={logoURL} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h1 className="text-xs font-black">بوابة تسجيل ردود ومسارات السائقين</h1>
                <p className="text-[10px] text-text-muted">التحقق من الصلاحيات</p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="text-xs text-rose-600 hover:text-rose-700 flex items-center gap-1 cursor-pointer font-bold"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>خروج</span>
            </button>
          </div>
        </header>

        <main className="p-4 sm:p-6 flex items-center justify-center flex-1">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="w-full max-w-md bg-surface border border-rose-200 dark:border-rose-900/50 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-5"
          >
            <div className="w-16 h-16 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <ShieldAlert className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-black text-slate-900 dark:text-white">
                عذراً، هذا الحساب غير مصرح له بتسجيل الردود
              </h2>
              <p className="text-xs text-text-muted leading-relaxed">
                حسابك الحالي <strong className="text-slate-800 dark:text-slate-200 font-mono">({currentUser.email})</strong> مسجل بصفة ({roleArabicTitle})، ولكن لم يتم منحه صلاحية تسجيل ردود السائقين بعد.
              </p>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900 rounded-xl text-[11px] text-amber-900 dark:text-amber-300 font-bold leading-relaxed text-right">
                تنبيه: هذه الصفحة محصورة فقط بمشرف نقل الحافلات ومدير النظام، ويمنع وضع القراءة فقط من الدخول أو تسجيل الردود.
              </div>
            </div>

            <div className="flex flex-col gap-2.5 pt-2">
              <button
                type="button"
                onClick={handleGoogleSignIn}
                className="w-full py-3 px-4 bg-primary hover:bg-primary-hover text-white font-black text-xs rounded-xl transition-all shadow-md cursor-pointer"
              >
                تسجيل الدخول بحساب معتمد آخر
              </button>
              <button
                type="button"
                onClick={handleGoToAdmin}
                className="w-full py-2.5 px-4 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                العودة إلى لوحة التحكم
              </button>
            </div>
          </motion.div>
        </main>
      </div>
    );
  }

  // ✅ SCREEN 3: Authorized Form
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col" dir="rtl">
      {/* Top Navigation Bar with verified officer identity */}
      <header className="bg-surface/90 backdrop-blur-md border-b border-border sticky top-0 z-30 px-4 py-3 shadow-xs">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white p-1 border border-border shadow-xs flex items-center justify-center overflow-hidden">
              <img src={logoURL} alt="Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-sm font-black text-slate-900 dark:text-white leading-tight">
                بوابة تسجيل ردود ومسارات السائقين
              </h1>
              <p className="text-[11px] text-text-muted">
                نظام إدارة وتشغيل الأسطول
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Authorized Employee Badge */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-xs">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <span className="font-black text-emerald-900 dark:text-emerald-300">{currentUser.displayName || currentUser.email}</span>
              <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 rounded font-bold">{roleArabicTitle}</span>
            </div>

            <button 
              type="button"
              onClick={handleGoToAdmin}
              className="text-xs text-text-muted hover:text-primary flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
              title="الانتقال إلى لوحة التحكم الرئيسية"
            >
              <span>لوحة التحكم</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>

            <button 
              type="button"
              onClick={handleLogout}
              className="p-1.5 text-text-muted hover:text-rose-600 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
              title="تسجيل الخروج"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {submittedData ? (
            /* Success Receipt Screen */
            <motion.div
              key="success-screen"
              initial={{ opacity: 0, scale: 0.94 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.94 }}
              className="bg-surface border border-emerald-500/30 rounded-3xl p-6 sm:p-8 shadow-xl text-center space-y-6"
            >
              <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-2xl font-black text-slate-900 dark:text-white">
                  تم استلام ردك بنجاح!
                </h2>
                <p className="text-sm text-text-muted mt-1">
                  تم حفظ بيانات الحركة والرد وتثبيتها تلقائياً في النظام
                </p>
              </div>

              {/* Receipt Details Card */}
              <div className="bg-slate-50 dark:bg-slate-900/60 border border-border rounded-2xl p-5 text-right space-y-3">
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs text-text-muted">اسم السائق:</span>
                  <span className="text-sm font-black text-slate-900 dark:text-white">{submittedData.driverName}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs text-text-muted">الرقم المتسلسل:</span>
                  <span className="text-sm font-bold text-primary">#{submittedData.serialNumber}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs text-text-muted">رقم الحافلة:</span>
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{submittedData.busNumber}</span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs text-text-muted">نوع الرد / الوجهة:</span>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20">
                    <MapPin className="w-3.5 h-3.5" />
                    <span>{submittedData.responseType}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between border-b border-border/60 pb-2.5">
                  <span className="text-xs text-text-muted">المسؤول عن التسجيل:</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    {submittedData.recordedBy} ({submittedData.recordedByRole})
                  </span>
                </div>
                <div className="flex items-center justify-between pt-1">
                  <span className="text-xs text-text-muted">تاريخ ووقت التسجيل:</span>
                  <span className="text-xs font-medium text-text-muted">{submittedData.date}</span>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleResetForm}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-primary text-white rounded-xl font-bold hover:bg-primary-hover transition-all shadow-md cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>تسجيل رد سائق آخر</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoToAdmin}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-surface border border-border text-slate-800 dark:text-slate-200 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-800 transition-all cursor-pointer"
                >
                  <ArrowRight className="w-4 h-4" />
                  <span>العودة للموقع ورؤية الرد</span>
                </button>
              </div>
            </motion.div>
          ) : (
            /* Driver Response Form */
            <motion.div
              key="response-form"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="bg-surface border border-border rounded-3xl p-5 sm:p-7 shadow-lg space-y-6"
            >
              {/* Officer In Charge Header Banner */}
              <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-800 dark:text-emerald-300 block font-bold">
                      تم التحقق • المسؤول المصرح له بالإدخال:
                    </span>
                    <span className="text-xs font-black text-slate-900 dark:text-white">
                      {currentUser?.displayName || currentUser?.email}
                    </span>
                  </div>
                </div>
                <span className="text-[11px] font-black px-2.5 py-1 bg-emerald-600 text-white rounded-xl">
                  {roleArabicTitle}
                </span>
              </div>

              {/* Header inside card */}
              <div className="text-center space-y-1.5 border-b border-border/60 pb-4">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-primary/10 text-primary mb-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>تسجيل رد مباشر وسريع</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
                  نموذج تسجيل رد وحركة السائق
                </h2>
                <p className="text-xs sm:text-sm text-text-muted">
                  اكتب رقمك المتسلسل المسجل بالشركة ورقم الحافلة وحدد وجهة الرد
                </p>
              </div>

              {/* Error Banner */}
              {error && (
                <div className="flex items-start gap-2.5 p-3.5 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 rounded-2xl text-xs">
                  <AlertCircle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                  <div className="font-semibold leading-relaxed">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-5">
                {/* 1. Driver Serial Number Input */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                    الرقم المتسلسل للسائق <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      min="1"
                      placeholder="اكتب رقمك المتسلسل هنا (مثال: 1 أو 2 أو 15...)"
                      value={serialInput}
                      onChange={(e) => setSerialInput(e.target.value)}
                      className="w-full pl-4 pr-11 py-3 text-base bg-slate-50 dark:bg-slate-900 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl font-bold transition-all outline-hidden text-right"
                      required
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                      <Hash className="w-5 h-5" />
                    </div>
                  </div>

                  {/* Driver Match Feedback */}
                  {loadingDrivers ? (
                    <p className="text-[11px] text-text-muted animate-pulse">
                      جاري فحص قائمة السائقين...
                    </p>
                  ) : matchedDriver ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center justify-between p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-900 dark:text-emerald-200"
                    >
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                        <div>
                          <p className="text-xs font-black">
                            أهلاً بك: {matchedDriver.fullName}
                          </p>
                          <p className="text-[10px] text-emerald-700 dark:text-emerald-300">
                            النوع: {matchedDriver.driverType} | الحالة: {matchedDriver.status || 'نشط'}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-black px-2 py-0.5 bg-emerald-200 dark:bg-emerald-900/60 rounded-md">
                        #{matchedDriver.serialNumber}
                      </span>
                    </motion.div>
                  ) : serialInput.trim() !== '' ? (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-800 rounded-xl text-amber-900 dark:text-amber-200 text-xs"
                    >
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>لم يتم العثور على سائق بالرقم (#{serialInput}). يرجى التأكد من رقمك المتسلسل.</span>
                    </motion.div>
                  ) : (
                    <p className="text-[11px] text-text-muted">
                      ملاحظة: بمجرد كتابة رقمك المتسلسل سيظهر اسمك وحافلتك تلقائياً.
                    </p>
                  )}
                </div>

                {/* 2. Bus Number Input */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                      رقم الحافلة <span className="text-rose-500">*</span>
                    </label>
                    <span className="text-[11px] text-text-muted">
                      يجب أن تكون من ضمن حافلات الأسطول
                    </span>
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      list="public-fleet-buses"
                      placeholder="اكتب رقم الحافلة (مثال: 104 أو 25)"
                      value={busNumber}
                      onChange={(e) => setBusNumber(e.target.value)}
                      className={`w-full pl-4 pr-11 py-3 text-base bg-slate-50 dark:bg-slate-900 border rounded-2xl font-bold transition-all outline-hidden text-right ${
                        isBusInvalid
                          ? 'border-rose-500 ring-2 ring-rose-500/20 text-rose-700 dark:text-rose-300'
                          : matchedFleetBus
                          ? 'border-emerald-500 ring-1 ring-emerald-500/20 text-emerald-800 dark:text-emerald-300'
                          : 'border-border focus:border-primary focus:ring-2 focus:ring-primary/20'
                      }`}
                      required
                    />
                    <div className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                      <BusIcon className="w-5 h-5" />
                    </div>
                    <datalist id="public-fleet-buses">
                      {buses.map(b => (
                        <option key={b.id} value={b.operationalNumber}>
                          حافلة #{b.operationalNumber} - لوحة: {b.plateNumber} ({b.category || 'أسطول'})
                        </option>
                      ))}
                    </datalist>
                  </div>

                  {/* Real-time Fleet Validation Alert */}
                  {isBusInvalid && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl text-rose-800 dark:text-rose-200 text-xs flex items-center gap-2 font-bold"
                    >
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span>
                        تنبيه: رقم الحافلة ({busNumber}) غير مسجل في حافلات الأسطول! لا يقبل النظام تسجيل الرد إلا لحافلة معتمدة من الأسطول.
                      </span>
                    </motion.div>
                  )}

                  {/* Verified Fleet Bus Badge */}
                  {matchedFleetBus && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-2.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span className="truncate">
                          حافلة معتمدة في الأسطول: <strong className="font-mono font-bold">#{matchedFleetBus.operationalNumber}</strong> (لوحة: {matchedFleetBus.plateNumber} • {matchedFleetBus.category || 'أسطول'})
                        </span>
                      </div>
                    </motion.div>
                  )}

                  {/* Fleet Quick Selector and Chips */}
                  {buses.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <div className="flex items-center gap-2 text-xs text-text-muted">
                        <span className="text-[10px] font-bold shrink-0">أو اختر من الأسطول:</span>
                        <select
                          value=""
                          onChange={(e) => {
                            if (e.target.value) setBusNumber(e.target.value);
                          }}
                          className="text-xs py-1 px-2.5 bg-background border border-border rounded-lg outline-none font-medium cursor-pointer text-slate-800 dark:text-slate-200 max-w-[240px] truncate"
                        >
                          <option value="">-- اختر حافلة من الأسطول ({buses.length}) --</option>
                          {buses.map(b => (
                            <option key={b.id} value={b.operationalNumber}>
                              حافلة #{b.operationalNumber} - {b.plateNumber}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                        <span className="text-[10px] text-text-muted shrink-0 font-bold">سريع:</span>
                        {buses.slice(0, 10).map(b => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => setBusNumber(b.operationalNumber)}
                            className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg border shrink-0 transition-colors cursor-pointer ${
                              busNumber === b.operationalNumber
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'bg-background hover:bg-slate-100 dark:hover:bg-slate-800 border-border text-text-muted'
                            }`}
                          >
                            #{b.operationalNumber}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* 3. Response Type Selection (Destination) */}
                <div className="space-y-2">
                  <label className="block text-xs font-black text-slate-800 dark:text-slate-200">
                    نوع الرد / الوجهة <span className="text-rose-500">*</span>
                  </label>
                    <div className="grid grid-cols-2 gap-2.5">
                      {RESPONSE_OPTIONS.map((opt) => {
                        const isSelected = selectedResponse === opt.type;
                        return (
                          <button
                            key={opt.type}
                            type="button"
                            onClick={() => setSelectedResponse(opt.type)}
                            className={`p-3.5 rounded-2xl border text-right transition-all flex flex-col justify-between cursor-pointer ${
                              opt.type === 'الترددية' ? 'col-span-2' : ''
                            } ${
                              isSelected 
                                ? opt.activeRing 
                                : `bg-slate-50 dark:bg-slate-900/60 ${opt.borderColor} text-slate-800 dark:text-slate-200`
                            }`}
                          >
                          <div className="flex items-center justify-between w-full mb-1">
                            <span className="text-sm font-black">{opt.label}</span>
                            <div 
                              className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                isSelected ? 'border-primary bg-primary' : 'border-slate-400'
                              }`}
                            >
                              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                            </div>
                          </div>
                          <span className="text-[11px] text-text-muted leading-tight">
                            {opt.description}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Notes (Optional) */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                    ملاحظات إضافية (اختياري)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="أي ملاحظات إضافية حول الرحلة أو الحافلة أو مسار الرد..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    className="w-full p-3 text-xs bg-slate-50 dark:bg-slate-900 border border-border focus:border-primary focus:ring-2 focus:ring-primary/20 rounded-2xl transition-all outline-hidden text-right resize-none"
                  />
                </div>

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !matchedDriver || !busNumber.trim() || isBusInvalid}
                  className="w-full py-3.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-sm rounded-2xl transition-all shadow-md shadow-emerald-600/20 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
                >
                  {submitting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      <span>جاري إرسال الرد وتثبيته...</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4" />
                      <span>إرسال الرد وتأكيد الاستلام</span>
                    </>
                  )}
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Footer */}
      <footer className="text-center py-4 border-t border-border text-[11px] text-text-muted">
        جميع الحقوق محفوظة &copy; {new Date().getFullYear()} — نظام إدارة الحافلات والسائقين
      </footer>
    </div>
  );
};
