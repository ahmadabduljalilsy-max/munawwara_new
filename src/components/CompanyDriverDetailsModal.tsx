import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  IdCard, 
  Phone, 
  ShieldCheck, 
  Clock, 
  Calendar, 
  MapPin, 
  Bus as BusIcon, 
  CheckCircle2, 
  UserX, 
  Activity, 
  Edit, 
  Trash2, 
  Copy, 
  Check, 
  PhoneCall, 
  MessageSquare, 
  Sparkles, 
  Globe, 
  RefreshCw,
  UserCheck,
  AlertCircle,
  Hash,
  Navigation,
  Plus,
  FileText,
  FileSpreadsheet,
  Download,
  Briefcase,
  Printer,
  GraduationCap,
  Lock,
  ChevronDown,
  MoreHorizontal,
  AlertTriangle,
  History,
  Save
} from 'lucide-react';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { CompanyDriver, DriverType, DriverStatus, DriverResponse, DriverResponseType, Worker } from '../types';
import { copyDriverResponsesToGoogleSheetsClipboard } from '../lib/locationUtils';
import { resolveDriverType, getDriverClassification, isDriverActiveInMonitoring, getMatchingActiveMonitoringWorker, getMatchingWorkerByIqama } from '../lib/driverUtils';
import { DriverDetailsSkeleton, useDelayedLoading } from './Skeleton';
import { EmptyState } from './EmptyState';
import { useToast } from './ToastContext';

interface CompanyDriverDetailsModalProps {
  driver: CompanyDriver | null;
  workers?: Worker[];
  isOpen: boolean;
  isLoading?: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onEdit?: (driver: CompanyDriver) => void;
  onDelete?: (driver: CompanyDriver) => void;
  onStatusChange?: (driverId: string, newStatus: DriverStatus, reason?: string) => Promise<void>;
  driverResponses?: DriverResponse[];
  onAddResponse?: (driver: CompanyDriver) => void;
  onDeleteResponse?: (responseId: string) => Promise<void>;
  onPrintCard?: (driver: CompanyDriver) => void;
}

export const CompanyDriverDetailsModal: React.FC<CompanyDriverDetailsModalProps> = ({
  driver,
  workers = [],
  isOpen,
  isLoading = false,
  isAdmin,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  driverResponses = [],
  onAddResponse,
  onDeleteResponse,
  onPrintCard
}) => {
  const { showToast } = useToast();
  const showSkeleton = useDelayedLoading(Boolean(isOpen && isLoading), 200);
  const [activeTab, setActiveTab] = useState<'info' | 'responses'>('info');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [statusDate, setStatusDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [statusModalError, setStatusModalError] = useState<string | null>(null);
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);
  const [isFooterMenuOpen, setIsFooterMenuOpen] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DriverStatus | null>(null);
  const [deletingResponseId, setDeletingResponseId] = useState<string | null>(null);
  const [responseToDelete, setResponseToDelete] = useState<DriverResponse | null>(null);
  const [isEditingExpiry, setIsEditingExpiry] = useState(false);
  const [expiryInput, setExpiryInput] = useState('');
  const [isSavingExpiry, setIsSavingExpiry] = useState(false);
  const [localIqamaExpiry, setLocalIqamaExpiry] = useState<string | null>(null);
  const [localStatusHistory, setLocalStatusHistory] = useState<any[]>([]);

  // Sync state with current driver data when opened
  React.useEffect(() => {
    if (driver) {
      setStatusReason(driver.statusReason || '');
      setStatusDate(new Date().toISOString().split('T')[0]);
      setStatusModalError(null);
      setIsStatusMenuOpen(false);
      setIsFooterMenuOpen(false);
      setPendingStatus(null);
      setResponseToDelete(null);
      setActiveTab('info');
      setIsEditingExpiry(false);
      setLocalIqamaExpiry(null);
      setLocalStatusHistory(Array.isArray((driver as any).statusHistory) ? (driver as any).statusHistory : []);
    }
  }, [driver]);

  if (!isOpen) return null;

  if (showSkeleton || (isLoading && !driver)) {
    if (!showSkeleton) return null;
    return (
      <AnimatePresence>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div onClick={onClose} className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm" />
          <div
            className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 my-auto"
            dir="rtl"
          >
            <DriverDetailsSkeleton />
          </div>
        </div>
      </AnimatePresence>
    );
  }

  if (!driver) return null;

  // Filter responses specific to this driver
  const myResponses = driverResponses.filter(r => 
    r.driverId === driver.id || 
    (driver.serialNumber && r.driverSerialNumber === driver.serialNumber)
  );

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    if (fieldKey === 'iqama') {
      showToast({ message: 'تم نسخ رقم الإقامة' });
    }
    setTimeout(() => {
      setCopiedField(null);
    }, 1800);
  };

  const formatArabicDateTime = (dateVal?: any) => {
    if (!dateVal) return null;
    try {
      const d = (dateVal?.toDate && typeof dateVal.toDate === 'function') 
        ? dateVal.toDate() 
        : new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(dateVal);
    }
  };

  const handleOpenStatusConfirm = (newStatus: DriverStatus) => {
    if (!onStatusChange || !isAdmin) return;
    setIsStatusMenuOpen(false);
    const curStatus: DriverStatus = isDriverFinal ? 'خروج نهائي' : (driver.status || 'نشط');
    if (newStatus === curStatus) return;
    setPendingStatus(newStatus);
    setStatusReason('');
    setStatusDate(new Date().toISOString().split('T')[0]);
    setStatusModalError(null);
  };

  const handleConfirmStatusWithReason = async () => {
    if (!pendingStatus || !onStatusChange) return;
    if (pendingStatus === 'خروج نهائي' && !statusReason.trim()) {
      setStatusModalError('يرجى ذكر سبب الخروج النهائي للسائق (حقل إجباري)');
      return;
    }
    const cleanReason = statusReason.trim();
    const chosenDate = statusDate || new Date().toISOString().split('T')[0];

    try {
      setIsUpdatingStatus(true);
      setStatusModalError(null);
      await onStatusChange(driver.id, pendingStatus, cleanReason || undefined);

      // Record entry into driver's statusHistory in Firestore
      const historyEntry = {
        id: `${Date.now()}`,
        status: pendingStatus,
        previousStatus: currentStatus,
        reason: cleanReason || 'تغيير الحالة',
        date: chosenDate,
        changedAt: new Date().toISOString()
      };
      try {
        const driverRef = doc(db, 'company_drivers', driver.id);
        const extraUpdates: Record<string, any> = {
          statusHistory: arrayUnion(historyEntry),
          statusUpdatedAt: chosenDate ? new Date(`${chosenDate}T12:00:00`).toISOString() : new Date().toISOString()
        };
        if (pendingStatus === 'خروج نهائي') {
          extraUpdates.finalExitDate = chosenDate;
        }
        await updateDoc(driverRef, extraUpdates);
        setLocalStatusHistory(prev => [...prev, historyEntry]);
      } catch (histErr) {
        console.error('Failed to save status history entry:', histErr);
      }

      setPendingStatus(null);
    } catch (err) {
      console.error('Error updating driver status with reason:', err);
      setStatusModalError('حدث خطأ أثناء حفظ تغيير الحالة، يرجى المحاولة مجدداً.');
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleSaveIqamaExpiry = async () => {
    if (!isAdmin) return;
    const trimmed = expiryInput.trim();
    const prevExpiry = localIqamaExpiry !== null
      ? localIqamaExpiry
      : String((driver as any).iqamaExpiryDate || '');
    const driverId = driver.id;
    try {
      setIsSavingExpiry(true);
      await updateDoc(doc(db, 'company_drivers', driverId), {
        iqamaExpiryDate: trimmed
      });
      setLocalIqamaExpiry(trimmed);
      setIsEditingExpiry(false);
      showToast({
        message: 'تم تحديث بيانات السائق',
        onUndo: async () => {
          await updateDoc(doc(db, 'company_drivers', driverId), {
            iqamaExpiryDate: prevExpiry
          });
          setLocalIqamaExpiry(prevExpiry);
        }
      });
    } catch (err) {
      console.error('Failed to save iqama expiry date:', err);
      showToast({
        message: 'تعذّر الحفظ، حاول مرة أخرى',
        variant: 'error',
        onRetry: handleSaveIqamaExpiry
      });
    } finally {
      setIsSavingExpiry(false);
    }
  };

  const handleRequestDeleteResponse = (response: DriverResponse) => {
    if (!onDeleteResponse || !response?.id) return;
    setResponseToDelete(response);
  };

  const handleConfirmDeleteResponse = async () => {
    if (!onDeleteResponse || !responseToDelete) return;
    const responseId = typeof responseToDelete.id === 'string' ? responseToDelete.id.trim() : '';
    if (!responseId) {
      console.error('Invalid driver response ID for deletion:', responseToDelete);
      showToast({
        message: 'تعذّر حذف الرد، حاول مرة أخرى',
        variant: 'error'
      });
      setResponseToDelete(null);
      return;
    }

    try {
      setDeletingResponseId(responseId);
      await onDeleteResponse(responseId);
      setResponseToDelete(null);
    } catch (err) {
      console.error('Error deleting driver response:', err);
      showToast({
        message: 'تعذّر حذف الرد، حاول مرة أخرى',
        variant: 'error'
      });
    } finally {
      setDeletingResponseId(null);
    }
  };

  const isDriverFinal = driver.driverClassification === 'خروج نهائي' || driver.status === 'خروج نهائي' || driver.status === 'مستبعد';
  const currentStatus: DriverStatus = isDriverFinal ? 'خروج نهائي' : (driver.status || 'نشط');

  const getTypeBadge = (type: DriverType) => {
    switch (type) {
      case 'مقيم':
        return {
          label: 'مقيم',
          icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'مؤقت':
        return {
          label: 'مؤقت',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'موسمي':
        return {
          label: 'موسمي',
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
          className: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      default:
        return {
          label: type || 'غير محدد',
          icon: <User className="w-3.5 h-3.5 text-slate-500" />,
          className: 'bg-slate-50 text-slate-700 border-slate-200'
        };
    }
  };

  const effectiveType = resolveDriverType(driver);
  const typeBadge = getTypeBadge(effectiveType);
  const inMonitoringWorker = getMatchingActiveMonitoringWorker(driver, workers);
  const matchedWorkerAny = getMatchingWorkerByIqama(driver, workers);
  const inMonitoring = Boolean(inMonitoringWorker);
  const classification = getDriverClassification(driver, workers);

  const computeExpiryStatus = (rawDate: string) => {
    if (!rawDate) return { dateStr: '', daysRemaining: null as number | null, urgency: 'none' as const };
    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) return { dateStr: rawDate, daysRemaining: null as number | null, urgency: 'none' as const };
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(parsed);
    target.setHours(0, 0, 0, 0);
    const diffDays = Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    let urgency: 'expired' | 'critical' | 'soon' | 'valid' = 'valid';
    if (diffDays < 0) urgency = 'expired';
    else if (diffDays <= 15) urgency = 'critical';
    else if (diffDays <= 60) urgency = 'soon';
    return { dateStr: rawDate, daysRemaining: diffDays, urgency };
  };

  const iqamaExpiryRaw = localIqamaExpiry !== null
    ? localIqamaExpiry
    : String((driver as any).iqamaExpiryDate || (driver as any).endDate || matchedWorkerAny?.endDate || '').trim();
  const licenseExpiryRaw = String((driver as any).licenseExpiryDate || '').trim();
  const iqamaExpiryInfo = computeExpiryStatus(iqamaExpiryRaw);
  const licenseExpiryInfo = computeExpiryStatus(licenseExpiryRaw);
  const hasExpiryAlert =
    iqamaExpiryInfo.urgency === 'expired' ||
    iqamaExpiryInfo.urgency === 'critical' ||
    iqamaExpiryInfo.urgency === 'soon' ||
    licenseExpiryInfo.urgency === 'expired' ||
    licenseExpiryInfo.urgency === 'critical' ||
    licenseExpiryInfo.urgency === 'soon';
  const isCriticalExpiryAlert =
    iqamaExpiryInfo.urgency === 'expired' ||
    iqamaExpiryInfo.urgency === 'critical' ||
    licenseExpiryInfo.urgency === 'expired' ||
    licenseExpiryInfo.urgency === 'critical';
  const cleanPhone = (driver.mobileNumber || '').replace(/[^0-9]/g, '');

  const getResponseBadge = (type: DriverResponseType | string) => {
    switch (type) {
      case 'محايل عسير':
        return {
          label: 'محايل عسير',
          className: 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800',
          dot: 'bg-emerald-500'
        };
      case 'ينبع':
        return {
          label: 'ينبع',
          className: 'bg-sky-50 text-sky-800 border-sky-300 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-800',
          dot: 'bg-sky-500'
        };
      case 'القصيم':
        return {
          label: 'القصيم',
          className: 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-800',
          dot: 'bg-amber-500'
        };
      case 'الرياض':
        return {
          label: 'الرياض',
          className: 'bg-purple-50 text-purple-800 border-purple-300 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800',
          dot: 'bg-purple-500'
        };
      case 'الترددية':
        return {
          label: 'الترددية',
          className: 'bg-teal-50 text-teal-800 border-teal-300 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800',
          dot: 'bg-teal-500'
        };
      default:
        return {
          label: type || 'غير محدد',
          className: 'bg-slate-100 text-slate-800 border-slate-300',
          dot: 'bg-slate-500'
        };
    }
  };

  // Status configuration definitions
  const statusOptions: {
    status: DriverStatus;
    title: string;
    description: string;
    icon: React.ReactNode;
    activeBorder: string;
    activeBg: string;
    activeTextColor: string;
    badgeBg: string;
    color: string;
  }[] = [
    {
      status: 'نشط',
      title: 'نشط',
      description: 'جاهز ومتاح للعمل والتشغيل الميداني',
      icon: <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />,
      activeBorder: 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/80 dark:bg-emerald-950/40',
      activeBg: 'bg-emerald-600 text-white',
      activeTextColor: 'text-emerald-900 dark:text-emerald-200',
      badgeBg: 'bg-emerald-100 text-emerald-800 border-emerald-200',
      color: '#10b981'
    },
    {
      status: 'في إجازة',
      title: 'في إجازة',
      description: 'إجازة سنوية / دورية أو إجازة مرضية مؤقتة',
      icon: <Clock className="w-5 h-5 text-amber-600 dark:text-amber-400" />,
      activeBorder: 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/80 dark:bg-amber-950/40',
      activeBg: 'bg-amber-600 text-white',
      activeTextColor: 'text-amber-900 dark:text-amber-200',
      badgeBg: 'bg-amber-100 text-amber-800 border-amber-200',
      color: '#f59e0b'
    },
    {
      status: 'خروج نهائي',
      title: 'خروج نهائي',
      description: 'خروج نهائي من تشغيل حافلات الشركة وأرشفة السجل',
      icon: <Lock className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
      activeBorder: 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/80 dark:bg-rose-950/40',
      activeBg: 'bg-rose-600 text-white',
      activeTextColor: 'text-rose-900 dark:text-rose-200',
      badgeBg: 'bg-rose-100 text-rose-800 border-rose-200',
      color: '#f43f5e'
    }
  ];

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
        />

        {/* Modal Content */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2 }}
          className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 my-auto"
          dir="rtl"
        >
          {/* Top Status Gradient Bar */}
          <div 
            className="h-2 w-full shrink-0" 
            style={{ 
              backgroundColor: currentStatus === 'نشط' ? '#10b981' : currentStatus === 'في إجازة' ? '#f59e0b' : '#f43f5e' 
            }} 
          />

          {/* Modal Header */}
          <div className="p-5 sm:p-6 border-b border-border bg-gradient-to-br from-primary/[0.04] to-transparent shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3.5">
                <div className="w-13 h-13 rounded-2xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shadow-xs shrink-0">
                  <User className="w-7 h-7" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    {/* Unique Serial Number Badge */}
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-mono font-black text-xs">
                      <Hash className="w-3 h-3" />
                      <span>متسلسل: #{driver.serialNumber || 1}</span>
                    </span>

                    <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-text-muted border border-border">
                      بطاقة السائق المعتمدة
                    </span>
                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${typeBadge.className}`}>
                      {typeBadge.icon}
                      <span>{typeBadge.label}</span>
                    </span>

                    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                      classification === 'خروج نهائي'
                        ? 'bg-rose-100 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800 shadow-2xs'
                        : classification === 'عمرة'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                        : classification === 'النقل الدولي سوريا'
                        ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-300 dark:border-teal-700'
                        : classification === 'النقل الدولي اليمن'
                        ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-300 dark:border-purple-700'
                        : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                    }`}>
                      {classification === 'خروج نهائي' ? (
                        <Lock className="w-3 h-3 text-rose-600" />
                      ) : (
                        <Briefcase className="w-3 h-3" />
                      )}
                      <span>{classification}</span>
                    </span>

                    {inMonitoring && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 dark:bg-cyan-950/60 text-cyan-800 dark:text-cyan-200 border border-cyan-300 dark:border-cyan-700" title="نشط حالياً بالرقابة والمتابعة">
                        <ShieldCheck className="w-3 h-3 text-cyan-600" />
                        <span>بالرقابة ({inMonitoringWorker?.clientName || inMonitoringWorker?.workplace || 'مسجل'})</span>
                      </span>
                    )}

                    {/* Header Interactive Status Badge Dropdown */}
                    <div className="relative">
                      <button
                        type="button"
                        disabled={!isAdmin || !onStatusChange || isUpdatingStatus}
                        onClick={() => isAdmin && onStatusChange && setIsStatusMenuOpen(prev => !prev)}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black border transition-all ${
                          currentStatus === 'نشط'
                            ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                            : currentStatus === 'في إجازة'
                            ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                            : 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-300 dark:border-rose-700'
                        } ${isAdmin && onStatusChange ? 'cursor-pointer hover:shadow-xs' : 'cursor-default'}`}
                        title={isAdmin && onStatusChange ? 'انقر لتغيير حالة السائق' : 'حالة السائق'}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          currentStatus === 'نشط' ? 'bg-emerald-500' : currentStatus === 'في إجازة' ? 'bg-amber-500' : 'bg-rose-500'
                        }`} />
                        <span>{currentStatus}</span>
                        {isAdmin && onStatusChange && <ChevronDown className="w-3 h-3 opacity-80" />}
                      </button>

                      {isStatusMenuOpen && isAdmin && onStatusChange && (
                        <div className="absolute right-0 mt-1.5 w-44 bg-surface border border-border rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5">
                          {statusOptions.map(opt => {
                            const activeOpt = currentStatus === opt.status;
                            return (
                              <button
                                key={opt.status}
                                type="button"
                                onClick={() => handleOpenStatusConfirm(opt.status)}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-bold transition-colors text-right cursor-pointer ${
                                  activeOpt
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800'
                                }`}
                              >
                                <span className="flex items-center gap-2">
                                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: opt.color }} />
                                  <span>{opt.title}</span>
                                </span>
                                {activeOpt && <Check className="w-3.5 h-3.5 text-primary" />}
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {driver.fullName}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {onPrintCard && (
                  <button
                    type="button"
                    onClick={() => onPrintCard(driver)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white dark:bg-indigo-950/40 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 rounded-xl text-xs font-bold transition-all cursor-pointer active:scale-95 shadow-2xs"
                    title="طباعة بطاقة السائق الرسمية"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">طباعة البطاقة</span>
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="p-2 text-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                  title="إغلاق البطاقة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Tabs: بيانات السائق / ردود السائق */}
            <div className="flex items-center gap-2 mt-4 pt-3 border-t border-border/60">
              <button
                type="button"
                onClick={() => setActiveTab('info')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'info'
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-text-muted border border-border'
                }`}
              >
                <IdCard className="w-4 h-4" />
                <span>بيانات السائق</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveTab('responses')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  activeTab === 'responses'
                    ? 'bg-primary text-white shadow-sm shadow-primary/20'
                    : 'bg-background hover:bg-slate-100 dark:hover:bg-slate-800 text-text-muted border border-border'
                }`}
              >
                <Navigation className="w-4 h-4" />
                <span>ردود السائق</span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold font-mono ${
                  activeTab === 'responses' ? 'bg-white/20 text-white' : 'bg-primary/10 text-primary'
                }`}>
                  {myResponses.length}
                </span>
              </button>
            </div>
          </div>

          {/* Modal Scrollable Body */}
          <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
            
            {/* ========================================================= */}
            {/* TAB 1: DRIVER INFO & STATUS SWITCHER                      */}
            {/* ========================================================= */}
            {activeTab === 'info' && (
              <div className="space-y-4">
                {/* Expiry Alert Banner at Top of Card */}
                {hasExpiryAlert && (
                  <div className={`p-3.5 rounded-2xl border-2 flex items-start gap-3 shadow-xs ${
                    isCriticalExpiryAlert
                      ? 'bg-rose-50 dark:bg-rose-950/60 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200'
                      : 'bg-amber-50 dark:bg-amber-950/50 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200'
                  }`}>
                    <AlertTriangle className={`w-5 h-5 shrink-0 mt-0.5 ${isCriticalExpiryAlert ? 'text-rose-600' : 'text-amber-600'}`} />
                    <div className="space-y-1 text-xs">
                      <h4 className="font-black">تنبيه اقتراب / انتهاء صلاحية الوثائق</h4>
                      {(iqamaExpiryInfo.urgency === 'expired' || iqamaExpiryInfo.urgency === 'critical' || iqamaExpiryInfo.urgency === 'soon') && (
                        <p className="font-bold">
                          • الإقامة: {iqamaExpiryInfo.dateStr}{' '}
                          {iqamaExpiryInfo.daysRemaining !== null && (
                            iqamaExpiryInfo.daysRemaining < 0
                              ? `(منتهية منذ ${Math.abs(iqamaExpiryInfo.daysRemaining)} يوم)`
                              : `(متبقي ${iqamaExpiryInfo.daysRemaining} يوم)`
                          )}
                        </p>
                      )}
                      {(licenseExpiryInfo.urgency === 'expired' || licenseExpiryInfo.urgency === 'critical' || licenseExpiryInfo.urgency === 'soon') && (
                        <p className="font-bold">
                          • الرخصة: {licenseExpiryInfo.dateStr}{' '}
                          {licenseExpiryInfo.daysRemaining !== null && (
                            licenseExpiryInfo.daysRemaining < 0
                              ? `(منتهية منذ ${Math.abs(licenseExpiryInfo.daysRemaining)} يوم)`
                              : `(متبقي ${licenseExpiryInfo.daysRemaining} يوم)`
                          )}
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* FINAL EXIT NOTICE BANNER */}
                {classification === 'خروج نهائي' && (
                  <div className="p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/60 border-2 border-rose-300 dark:border-rose-800 flex items-start gap-3 shadow-xs">
                    <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300 flex items-center justify-center shrink-0">
                      <Lock className="w-5 h-5" />
                    </div>
                    <div className="space-y-1">
                      <h4 className="text-sm font-black text-rose-900 dark:text-rose-200">
                        السائق مصنف كـ «خروج نهائي» (سجل مقفل)
                      </h4>
                      <p className="text-xs text-rose-800 dark:text-rose-300 font-bold">
                        سبب الخروج المسجل: <span className="font-semibold underline">{driver.finalExitReason || driver.statusReason || 'غير محدد'}</span>
                      </p>
                      <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium">
                        هذا السائق مستبعد بالكامل من كافة إحصائيات وأعداد المنظومة، وتم قفل حسابه نهائياً لمنع أي تعديل أو تبديل أو تسجيل ردود.
                      </p>
                    </div>
                  </div>
                )}

                {/* Quick Contact & Action Row: الجوال، واتساب، "رد" */}
                <div className="p-3 bg-emerald-50/60 dark:bg-emerald-950/25 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl flex flex-wrap items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Phone className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 block">اتصال سريع</span>
                      {driver.mobileNumber && driver.mobileNumber.trim() ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                            {driver.mobileNumber}
                          </span>
                          <button
                            type="button"
                            onClick={() => copyToClipboard(driver.mobileNumber || '', 'phone-modal')}
                            className="text-text-muted hover:text-slate-900 dark:hover:text-white p-0.5 cursor-pointer"
                            title="نسخ رقم الجوال"
                          >
                            {copiedField === 'phone-modal' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">غير مسجل</span>
                          {isAdmin && onEdit && !isDriverFinal && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onEdit(driver);
                              }}
                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md text-[10px] font-black cursor-pointer"
                            >
                              إضافة
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {driver.mobileNumber && driver.mobileNumber.trim() && (
                      <>
                        <a
                          href={`tel:${driver.mobileNumber}`}
                          className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                          title="اتصال هاتفي"
                        >
                          <PhoneCall className="w-3.5 h-3.5" />
                          <span>الجوال</span>
                        </a>

                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 shadow-xs"
                            title="محادثة واتساب"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                            <span>واتساب</span>
                          </a>
                        )}
                      </>
                    )}

                    {classification === 'خروج نهائي' ? (
                      <span className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold flex items-center gap-1 border border-slate-200 dark:border-slate-700 cursor-not-allowed">
                        <Lock className="w-3.5 h-3.5" />
                        <span>مقفل</span>
                      </span>
                    ) : onAddResponse && (
                      <button
                        type="button"
                        onClick={() => onAddResponse(driver)}
                        className="px-3.5 py-1.5 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-black transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>رد</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Single-line Last Update Display */}
                {(driver.statusUpdatedAt || driver.updatedAt) && (
                  <div className="px-3.5 py-2 bg-slate-50/80 dark:bg-slate-900/40 border border-border rounded-xl flex items-center gap-2 text-[11px] whitespace-nowrap overflow-hidden text-ellipsis">
                    <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                    <span className="text-text-muted font-bold shrink-0">آخر تحديث:</span>
                    <span className="font-mono font-bold text-slate-900 dark:text-white truncate">
                      {formatArabicDateTime(driver.statusUpdatedAt || driver.updatedAt)}
                    </span>
                    {driver.statusReason && (
                      <span className="text-text-muted truncate">• {driver.statusReason}</span>
                    )}
                  </div>
                )}

                {/* Identity & Legal Data Card (No duplicate serial or classification) */}
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface space-y-4 shadow-xs">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-border/70 pb-3">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>البيانات النظامية والتكليف</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Assigned Bus Number */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-border rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                        <BusIcon className="w-3.5 h-3.5 text-sky-600" />
                        <span>الحافلة المخصصة</span>
                      </span>
                      {driver.busNumber && driver.busNumber.trim() ? (
                        <div className="text-sm font-mono font-black text-sky-700 dark:text-sky-300">
                          #{driver.busNumber}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">غير مخصص لحافلة حالياً</span>
                          {isAdmin && onEdit && !isDriverFinal && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onEdit(driver);
                              }}
                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md text-[10px] font-black cursor-pointer shrink-0"
                            >
                              تعيين حافلة
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Nationality */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-border rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                        <Globe className="w-3.5 h-3.5 text-blue-500" />
                        <span>الجنسية</span>
                      </span>
                      <div className="text-sm font-bold text-slate-900 dark:text-white">
                        {driver.nationality || 'غير محدد'}
                      </div>
                    </div>

                    {/* Iqama Number */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-border rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                          <IdCard className="w-3.5 h-3.5 text-slate-500" />
                          <span>رقم الإقامة</span>
                        </span>
                        {driver.iqamaNumber && driver.iqamaNumber.trim() && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(driver.iqamaNumber, 'iqama')}
                            className="text-text-muted hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer"
                            title="نسخ رقم الإقامة"
                          >
                            {copiedField === 'iqama' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      {driver.iqamaNumber && driver.iqamaNumber.trim() ? (
                        <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                          {driver.iqamaNumber}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">غير مسجل</span>
                          {isAdmin && onEdit && !isDriverFinal && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onEdit(driver);
                              }}
                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md text-[10px] font-black cursor-pointer shrink-0"
                            >
                              إضافة
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Iqama Expiry Date (beside Iqama Number) */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-border rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span>تاريخ انتهاء الإقامة</span>
                        </span>
                        {isAdmin && !isDriverFinal && !isEditingExpiry && iqamaExpiryInfo.dateStr && (
                          <button
                            type="button"
                            onClick={() => {
                              setExpiryInput(iqamaExpiryInfo.dateStr);
                              setIsEditingExpiry(true);
                            }}
                            className="text-[10px] font-bold text-primary hover:underline cursor-pointer"
                          >
                            تعديل
                          </button>
                        )}
                      </div>
                      {isEditingExpiry ? (
                        <div className="flex items-center gap-1.5 pt-0.5">
                          <input
                            type="date"
                            value={expiryInput}
                            onChange={(e) => setExpiryInput(e.target.value)}
                            className="flex-1 px-2 py-1 bg-white dark:bg-slate-800 border border-border focus:border-primary rounded-lg text-xs font-mono outline-none"
                          />
                          <button
                            type="button"
                            disabled={isSavingExpiry}
                            onClick={handleSaveIqamaExpiry}
                            className="px-2 py-1 bg-primary text-white rounded-lg text-[10px] font-black flex items-center gap-1 cursor-pointer disabled:opacity-50"
                          >
                            <Save className="w-3 h-3" />
                            <span>حفظ</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setIsEditingExpiry(false)}
                            className="p-1 text-text-muted hover:text-slate-900 cursor-pointer"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : iqamaExpiryInfo.dateStr ? (
                        <div className={`text-sm font-mono font-bold flex items-center gap-1.5 ${
                          iqamaExpiryInfo.urgency === 'expired' || iqamaExpiryInfo.urgency === 'critical'
                            ? 'text-rose-600 dark:text-rose-400'
                            : iqamaExpiryInfo.urgency === 'soon'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-slate-900 dark:text-white'
                        }`}>
                          <span>{iqamaExpiryInfo.dateStr}</span>
                          {iqamaExpiryInfo.daysRemaining !== null && iqamaExpiryInfo.daysRemaining <= 60 && (
                            <span className="text-[10px] font-sans font-bold">
                              ({iqamaExpiryInfo.daysRemaining < 0 ? `منتهي منذ ${Math.abs(iqamaExpiryInfo.daysRemaining)} يوم` : `باقي ${iqamaExpiryInfo.daysRemaining} يوم`})
                            </span>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">غير مسجل</span>
                          {isAdmin && !isDriverFinal && (
                            <button
                              type="button"
                              onClick={() => {
                                setExpiryInput('');
                                setIsEditingExpiry(true);
                              }}
                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md text-[10px] font-black cursor-pointer shrink-0"
                            >
                              إضافة
                            </button>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Border Number */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-border rounded-xl space-y-1 sm:col-span-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          <span>رقم الحدود</span>
                        </span>
                        {driver.borderNumber && driver.borderNumber.trim() && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(driver.borderNumber, 'border')}
                            className="text-text-muted hover:text-slate-900 dark:hover:text-white p-1 cursor-pointer"
                            title="نسخ رقم الحدود"
                          >
                            {copiedField === 'border' ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                      {driver.borderNumber && driver.borderNumber.trim() ? (
                        <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                          {driver.borderNumber}
                        </div>
                      ) : (
                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <span className="text-xs font-black text-amber-600 dark:text-amber-400">غير مسجل</span>
                          {isAdmin && onEdit && !isDriverFinal && (
                            <button
                              type="button"
                              onClick={() => {
                                onClose();
                                onEdit(driver);
                              }}
                              className="px-2 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md text-[10px] font-black cursor-pointer shrink-0"
                            >
                              إضافة
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Status Changes History Log */}
                {localStatusHistory.length > 0 && (
                  <div className="p-4 bg-slate-50/70 dark:bg-slate-900/40 border border-border rounded-2xl space-y-2.5">
                    <h4 className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                      <History className="w-3.5 h-3.5 text-primary" />
                      <span>سجل تغييرات الحالة ({localStatusHistory.length})</span>
                    </h4>
                    <div className="space-y-1.5 max-h-40 overflow-y-auto">
                      {[...localStatusHistory].reverse().map((item, idx) => (
                        <div key={item.id || idx} className="p-2.5 bg-surface border border-border/80 rounded-xl flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                              item.status === 'نشط'
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : item.status === 'في إجازة'
                                ? 'bg-amber-50 text-amber-700 border-amber-200'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}>
                              {item.status}
                            </span>
                            <span className="text-slate-700 dark:text-slate-300 truncate">{item.reason || '—'}</span>
                          </div>
                          <span className="text-[11px] font-mono text-text-muted shrink-0">
                            {item.date || formatArabicDateTime(item.changedAt)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes Section */}
                {driver.notes && (
                  <div className="p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-border rounded-xl space-y-1">
                    <span className="text-[11px] font-bold text-text-muted block">ملاحظات عامة:</span>
                    <p className="text-xs text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-wrap">
                      {driver.notes}
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ========================================================= */}
            {/* TAB 2: DRIVER RESPONSES (ردود السائق)                     */}
            {/* ========================================================= */}
            {activeTab === 'responses' && (
              <div className="space-y-4">
                {/* Header Actions for Tab 2 */}
                <div className="flex items-center justify-between gap-3 p-3.5 bg-slate-50 dark:bg-slate-800/40 border border-border rounded-2xl">
                  <div>
                    <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                      <Navigation className="w-4 h-4 text-primary" />
                      <span>سجل ردود ورحلات السائق</span>
                    </h3>
                    <p className="text-[11px] text-text-muted mt-0.5">
                      إجمالي الردود المسجلة: ({myResponses.length}) رد
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {myResponses.length > 0 && (
                      <>
                        <button
                          type="button"
                          onClick={() => {
                            const ok = copyDriverResponsesToGoogleSheetsClipboard(myResponses);
                            if (ok) alert('تم نسخ ردود السائق بتنسيق أعمدة جاهز للـ Google Sheets! اضغط Ctrl+V للصق.');
                          }}
                          className="px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                          title="نسخ ردود السائق كأعمدة متوافقة مع Google Sheets"
                        >
                          <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600" />
                          <span className="hidden sm:inline">نسخ لـ Sheets</span>
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const { exportDriverResponsesToExcel } = await import('../lib/excelService');
                            exportDriverResponsesToExcel(myResponses, `ردود_السائق_${driver.fullName.replace(/\s+/g, '_')}.xlsx`, [driver]);
                          }}
                          className="p-1.5 bg-surface border border-border hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-text-muted hover:text-slate-900 transition-colors cursor-pointer"
                          title="تصدير ردود هذا السائق إلى ملف Excel"
                        >
                          <Download className="w-4 h-4 text-emerald-600" />
                        </button>
                      </>
                    )}
                    {classification === 'خروج نهائي' ? (
                      <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-slate-200 dark:border-slate-700">
                        <Lock className="w-3.5 h-3.5" />
                        <span>تسجيل الردود مقفل (خروج نهائي)</span>
                      </div>
                    ) : onAddResponse && (
                      <button
                        type="button"
                        onClick={() => onAddResponse(driver)}
                        className="px-3.5 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer shrink-0"
                      >
                        <Plus className="w-4 h-4" />
                        <span>تسجيل رد جديد</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Responses List */}
                {myResponses.length === 0 ? (
                  <EmptyState
                    icon={Navigation}
                    title="لا توجد ردود بعد"
                    description="سجّل أول رد أو رحلة ميدانية لهذا السائق لتظهر هنا."
                    actionLabel={classification !== 'خروج نهائي' && onAddResponse ? 'تسجيل رد' : undefined}
                    onAction={classification !== 'خروج نهائي' && onAddResponse ? () => onAddResponse(driver) : undefined}
                    variant="compact"
                  />
                ) : (
                  <div className="space-y-3">
                    {myResponses.map((res, index) => {
                      const badge = getResponseBadge(res.responseType);
                      const isDeleting = deletingResponseId === res.id;

                      return (
                        <motion.div
                          key={res.id || index}
                          initial={{ opacity: 0, y: 5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-4 rounded-2xl border border-border bg-surface hover:border-slate-300 dark:hover:border-slate-700 transition-all shadow-2xs space-y-2.5"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-center gap-2.5 flex-wrap">
                              {/* Response Type Destination Badge */}
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-black border ${badge.className}`}>
                                <span className={`w-2 h-2 rounded-full ${badge.dot}`} />
                                <span>نوع الرد: {badge.label}</span>
                              </span>

                              {/* Bus Number Badge */}
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-sky-50 dark:bg-sky-950/40 text-sky-800 dark:text-sky-300 border border-sky-200 dark:border-sky-800 text-xs font-mono font-bold">
                                <BusIcon className="w-3.5 h-3.5" />
                                <span>حافلة: #{res.busNumber}</span>
                              </span>
                            </div>

                            {/* Delete response (admin) */}
                            {isAdmin && onDeleteResponse && (
                              <button
                                type="button"
                                disabled={isDeleting}
                                onClick={() => handleRequestDeleteResponse(res)}
                                className="min-w-[44px] min-h-[44px] w-11 h-11 inline-flex items-center justify-center text-text-muted hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                                aria-label="حذف الرد"
                                title="حذف الرد"
                              >
                                {isDeleting ? (
                                  <RefreshCw className="w-4 h-4 animate-spin text-red-500" />
                                ) : (
                                  <Trash2 className="w-4 h-4" />
                                )}
                              </button>
                            )}
                          </div>

                          {/* Notes if any */}
                          {res.notes && (
                            <p className="text-xs text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/40 p-2.5 rounded-xl border border-border/70 leading-relaxed">
                              {res.notes}
                            </p>
                          )}

                          {/* Date & Recorded Info */}
                          <div className="flex items-center justify-between text-[11px] text-text-muted pt-1 border-t border-border/40">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-text-muted" />
                              <span>تاريخ ووقت الرد:</span>
                              <span className="font-mono text-slate-800 dark:text-slate-200 font-bold">
                                {res.createdDate || formatArabicDateTime(res.createdAt) || 'غير محدد'}
                              </span>
                            </div>

                            <div className="flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              <span>سائق #{res.driverSerialNumber}</span>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Modal Footer Actions: تعديل بيانات السائق + إغلاق + قائمة ⋯ لحذف السائق */}
          <div className="p-4 sm:p-5 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              {isAdmin && onEdit && (
                classification === 'خروج نهائي' ? (
                  <div className="flex items-center gap-1.5 px-4 py-2 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-700">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>السجل مقفل (خروج نهائي)</span>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      onClose();
                      onEdit(driver);
                    }}
                    className="flex items-center gap-1.5 px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  >
                    <Edit className="w-4 h-4" />
                    <span>تعديل بيانات السائق</span>
                  </button>
                )
              )}

              {isAdmin && onDelete && (
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setIsFooterMenuOpen(prev => !prev)}
                    className="p-2 bg-white dark:bg-slate-800 border border-border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer"
                    title="المزيد"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>

                  {isFooterMenuOpen && (
                    <div className="absolute right-0 bottom-full mb-1.5 w-44 bg-surface border border-border rounded-xl shadow-xl z-50 p-1 flex flex-col gap-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsFooterMenuOpen(false);
                          onClose();
                          onDelete(driver);
                        }}
                        className="w-full flex items-center gap-2 px-3 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors text-right cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>حذف السائق</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 bg-white dark:bg-slate-800 border border-border text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              إغلاق
            </button>
          </div>
        </motion.div>

        {/* Status Change Confirmation Modal (with Reason & Date) */}
        <AnimatePresence>
          {pendingStatus && (
            <div className="fixed inset-0 z-[70] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !isUpdatingStatus && setPendingStatus(null)}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-md bg-surface border border-border rounded-2xl shadow-2xl p-5 z-10 space-y-4"
                dir="rtl"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                      pendingStatus === 'خروج نهائي'
                        ? 'bg-rose-50 text-rose-600 border border-rose-200'
                        : pendingStatus === 'في إجازة'
                        ? 'bg-amber-50 text-amber-600 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                    }`}>
                      <AlertCircle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-slate-900 dark:text-white">
                        تأكيد تغيير الحالة إلى «{pendingStatus}»
                      </h3>
                      <p className="text-[11px] text-text-muted">السائق: {driver.fullName}</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => setPendingStatus(null)}
                    className="p-1 text-text-muted hover:text-slate-900 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                {pendingStatus === 'خروج نهائي' && (
                  <div className="p-3 bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 rounded-xl text-[11px] text-rose-800 dark:text-rose-200 font-bold leading-relaxed">
                    تنبيه: تصنيف «خروج نهائي» سيقفل السجل ويستبعد السائق من إحصائيات الأسطول والردود اليومية.
                  </div>
                )}

                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1">
                      <span>السبب</span>
                      {pendingStatus === 'خروج نهائي' ? (
                        <span className="text-rose-600 font-black">*</span>
                      ) : (
                        <span className="text-[10px] text-text-muted font-normal">(اختياري)</span>
                      )}
                    </label>
                    <textarea
                      rows={2}
                      placeholder={pendingStatus === 'خروج نهائي' ? 'اكتب سبب الخروج النهائي بالتفصيل...' : 'اكتب سبب تغيير الحالة...'}
                      value={statusReason}
                      onChange={(e) => {
                        setStatusReason(e.target.value);
                        if (statusModalError) setStatusModalError(null);
                      }}
                      className="w-full px-3 py-2 bg-background border border-border focus:border-primary rounded-xl text-xs outline-none resize-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="text-xs font-bold text-slate-900 dark:text-white block">
                      التاريخ
                    </label>
                    <input
                      type="date"
                      value={statusDate}
                      onChange={(e) => setStatusDate(e.target.value)}
                      className="w-full px-3 py-2 bg-background border border-border focus:border-primary rounded-xl text-xs font-mono outline-none"
                    />
                  </div>

                  {statusModalError && (
                    <p className="text-xs font-bold text-rose-600">{statusModalError}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={handleConfirmStatusWithReason}
                    className={`flex-1 py-2.5 rounded-xl text-xs font-black text-white transition-all cursor-pointer disabled:opacity-50 ${
                      pendingStatus === 'خروج نهائي'
                        ? 'bg-rose-600 hover:bg-rose-700'
                        : pendingStatus === 'في إجازة'
                        ? 'bg-amber-600 hover:bg-amber-700'
                        : 'bg-emerald-600 hover:bg-emerald-700'
                    }`}
                  >
                    {isUpdatingStatus ? 'جاري الحفظ...' : 'تأكيد وحفظ'}
                  </button>
                  <button
                    type="button"
                    disabled={isUpdatingStatus}
                    onClick={() => setPendingStatus(null)}
                    className="px-4 py-2.5 bg-background border border-border hover:bg-slate-100 rounded-xl text-xs font-bold text-text-main cursor-pointer"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        {/* Delete Driver Response Confirmation Modal */}
        <AnimatePresence>
          {responseToDelete && (
            <div className="fixed inset-0 z-[80] flex items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => !deletingResponseId && setResponseToDelete(null)}
                className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs"
              />
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                className="relative w-full max-w-sm bg-surface border border-border rounded-2xl shadow-2xl p-5 z-10 space-y-4"
                dir="rtl"
                role="alertdialog"
                aria-modal="true"
                aria-labelledby="delete-response-modal-title"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-50 dark:bg-red-950/40 text-red-600 border border-red-200 dark:border-red-800 flex items-center justify-center shrink-0">
                    <Trash2 className="w-5 h-5" />
                  </div>
                  <div className="flex-1 space-y-1">
                    <h3
                      id="delete-response-modal-title"
                      className="text-sm font-black text-slate-900 dark:text-white leading-snug"
                    >
                      حذف هذا الرد؟ لا يمكن التراجع بعد ذلك.
                    </h3>
                  </div>
                  <button
                    type="button"
                    disabled={Boolean(deletingResponseId)}
                    onClick={() => setResponseToDelete(null)}
                    className="p-1 text-text-muted hover:text-slate-900 dark:hover:text-white rounded-lg cursor-pointer disabled:opacity-50"
                    aria-label="إغلاق"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    disabled={Boolean(deletingResponseId)}
                    onClick={handleConfirmDeleteResponse}
                    className="flex-1 px-4 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-xl text-xs font-black transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {deletingResponseId ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>جارٍ الحذف...</span>
                      </>
                    ) : (
                      <span>حذف</span>
                    )}
                  </button>
                  <button
                    type="button"
                    disabled={Boolean(deletingResponseId)}
                    onClick={() => setResponseToDelete(null)}
                    className="flex-1 px-4 py-2.5 bg-background hover:bg-slate-100 dark:hover:bg-slate-800 border border-border text-slate-700 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer disabled:opacity-50"
                  >
                    إلغاء
                  </button>
                </div>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    </AnimatePresence>
  );
};
