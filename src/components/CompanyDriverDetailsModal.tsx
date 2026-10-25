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
  Download
} from 'lucide-react';
import type { CompanyDriver, DriverType, DriverStatus, DriverResponse, DriverResponseType } from '../types';
import { copyDriverResponsesToGoogleSheetsClipboard, exportDriverResponsesToExcel } from '../lib/excelService';

interface CompanyDriverDetailsModalProps {
  driver: CompanyDriver | null;
  isOpen: boolean;
  isAdmin: boolean;
  onClose: () => void;
  onEdit?: (driver: CompanyDriver) => void;
  onDelete?: (driver: CompanyDriver) => void;
  onStatusChange?: (driverId: string, newStatus: DriverStatus, reason?: string) => Promise<void>;
  driverResponses?: DriverResponse[];
  onAddResponse?: (driver: CompanyDriver) => void;
  onDeleteResponse?: (responseId: string) => Promise<void>;
}

export const CompanyDriverDetailsModal: React.FC<CompanyDriverDetailsModalProps> = ({
  driver,
  isOpen,
  isAdmin,
  onClose,
  onEdit,
  onDelete,
  onStatusChange,
  driverResponses = [],
  onAddResponse,
  onDeleteResponse
}) => {
  const [activeTab, setActiveTab] = useState<'info' | 'responses'>('info');
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [statusReason, setStatusReason] = useState('');
  const [showReasonInput, setShowReasonInput] = useState(false);
  const [pendingStatus, setPendingStatus] = useState<DriverStatus | null>(null);
  const [deletingResponseId, setDeletingResponseId] = useState<string | null>(null);

  // Sync reason with current driver data when opened
  React.useEffect(() => {
    if (driver) {
      setStatusReason(driver.statusReason || '');
      setShowReasonInput(false);
      setPendingStatus(null);
      setActiveTab('info');
    }
  }, [driver]);

  if (!driver || !isOpen) return null;

  // Filter responses specific to this driver
  const myResponses = driverResponses.filter(r => 
    r.driverId === driver.id || 
    (driver.serialNumber && r.driverSerialNumber === driver.serialNumber)
  );

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
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
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return String(dateVal);
    }
  };

  const handleSelectStatus = async (newStatus: DriverStatus) => {
    if (!onStatusChange || !isAdmin) return;
    const currentStatus = driver.status || 'نشط';
    if (newStatus === currentStatus && !showReasonInput) return;

    if (newStatus !== 'نشط' && !showReasonInput && pendingStatus !== newStatus) {
      setPendingStatus(newStatus);
      setShowReasonInput(true);
      return;
    }

    try {
      setIsUpdatingStatus(true);
      await onStatusChange(driver.id, newStatus, statusReason.trim() || undefined);
      setShowReasonInput(false);
      setPendingStatus(null);
    } catch (err) {
      console.error('Error updating driver status:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleConfirmStatusWithReason = async () => {
    if (!pendingStatus || !onStatusChange) return;
    try {
      setIsUpdatingStatus(true);
      await onStatusChange(driver.id, pendingStatus, statusReason.trim() || undefined);
      setShowReasonInput(false);
      setPendingStatus(null);
    } catch (err) {
      console.error('Error updating driver status with reason:', err);
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const handleDeleteResponse = async (responseId: string) => {
    if (!onDeleteResponse) return;
    const confirm = window.confirm('هل أنت متأكد من حذف هذا الرد من سجل السائق؟');
    if (!confirm) return;

    try {
      setDeletingResponseId(responseId);
      await onDeleteResponse(responseId);
    } catch (err) {
      console.error('Error deleting driver response:', err);
    } finally {
      setDeletingResponseId(null);
    }
  };

  const currentStatus: DriverStatus = driver.status || 'نشط';

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

  const typeBadge = getTypeBadge(driver.driverType);

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
      status: 'مستبعد',
      title: 'مستبعد',
      description: 'مستبعد أو موقوف عن تشغيل حافلات الشركة',
      icon: <UserX className="w-5 h-5 text-rose-600 dark:text-rose-400" />,
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
                  </div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white tracking-tight leading-snug">
                    {driver.fullName}
                  </h2>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-2 text-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer shrink-0"
                title="إغلاق البطاقة"
              >
                <X className="w-5 h-5" />
              </button>
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
              <div className="space-y-6">
                {/* DRIVER STATUS OPTIONS SECTION (خيارات حالة السائق) */}
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-slate-50/70 dark:bg-slate-900/40 space-y-3.5 shadow-xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border/70 pb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <Activity className="w-4 h-4" />
                      </div>
                      <div>
                        <h3 className="text-sm font-black text-slate-900 dark:text-white">
                          خيارات حالة السائق
                        </h3>
                        <p className="text-[11px] text-text-muted font-medium">
                          تحديد الحالة التشغيلية للسائق (نشط / في إجازة / مستبعد) مع حفظ التوقيت آلياً
                        </p>
                      </div>
                    </div>

                    {/* Last Update Date Display */}
                    {driver.statusUpdatedAt && (
                      <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-slate-800 border border-border rounded-xl text-[11px] font-bold text-slate-700 dark:text-slate-300 shadow-2xs self-start sm:self-auto">
                        <Calendar className="w-3.5 h-3.5 text-primary shrink-0" />
                        <span className="text-text-muted font-normal">آخر تحديث للحالة:</span>
                        <span className="font-mono text-slate-900 dark:text-white">
                          {formatArabicDateTime(driver.statusUpdatedAt)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* The 3 Interactive Status Options Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                    {statusOptions.map((opt) => {
                      const isCurrent = currentStatus === opt.status;
                      const isPending = pendingStatus === opt.status;
                      const isSelected = isCurrent || isPending;

                      return (
                        <button
                          key={opt.status}
                          type="button"
                          disabled={!isAdmin || isUpdatingStatus}
                          onClick={() => handleSelectStatus(opt.status)}
                          className={`relative p-3.5 rounded-xl border text-right transition-all flex flex-col justify-between gap-2.5 cursor-pointer disabled:cursor-default ${
                            isSelected 
                              ? opt.activeBorder
                              : 'bg-white dark:bg-slate-800/80 border-border hover:border-slate-300 dark:hover:border-slate-700 hover:shadow-xs'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${isSelected ? 'bg-white dark:bg-slate-800 shadow-2xs' : 'bg-slate-100 dark:bg-slate-700'}`}>
                                {opt.icon}
                              </span>
                              <span className="text-sm font-black text-slate-900 dark:text-white">
                                {opt.title}
                              </span>
                            </div>

                            {isCurrent && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-600 text-white shadow-2xs">
                                <Check className="w-3 h-3" />
                                <span>الحالية</span>
                              </span>
                            )}
                            {!isCurrent && isPending && (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500 text-white shadow-2xs">
                                قيد الاختيار
                              </span>
                            )}
                          </div>

                          <p className="text-[11px] text-text-muted leading-relaxed">
                            {opt.description}
                          </p>

                          <div className="pt-1.5 border-t border-border/40 flex items-center justify-between">
                            <span className="text-[10px] text-text-muted">
                              {isCurrent ? 'الحالة المعتمدة حالياً' : 'انقر للتعيين'}
                            </span>
                            {isUpdatingStatus && isSelected && (
                              <RefreshCw className="w-3.5 h-3.5 text-primary animate-spin" />
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {/* Optional Reason / Notes Input Drawer for 'في إجازة' / 'مستبعد' */}
                  <AnimatePresence>
                    {showReasonInput && pendingStatus && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="pt-3 border-t border-border/80 space-y-2.5 overflow-hidden"
                      >
                        <div className="flex items-center justify-between">
                          <label className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span>سبب تغيير الحالة إلى ({pendingStatus}):</span>
                            <span className="text-[10px] text-text-muted font-normal">(اختياري)</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => { setShowReasonInput(false); setPendingStatus(null); }}
                            className="text-[11px] text-text-muted hover:text-slate-900 dark:hover:text-white"
                          >
                            إلغاء التغيير
                          </button>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="اكتب سبب الحالة (مثال: إجازة سنوية، انتهاء عقد، مخالفة...)"
                            value={statusReason}
                            onChange={(e) => setStatusReason(e.target.value)}
                            className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-border focus:border-primary rounded-xl text-xs outline-none shadow-2xs"
                          />
                          <button
                            type="button"
                            disabled={isUpdatingStatus}
                            onClick={handleConfirmStatusWithReason}
                            className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs shrink-0 cursor-pointer disabled:opacity-50"
                          >
                            {isUpdatingStatus ? 'جاري الحفظ...' : 'تأكيد الحفظ'}
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Existing Status Reason Display if present */}
                  {driver.statusReason && !showReasonInput && (
                    <div className="p-2.5 bg-white dark:bg-slate-800 border border-border/80 rounded-xl flex items-center gap-2 text-xs">
                      <span className="font-bold text-slate-700 dark:text-slate-300 shrink-0">سبب الحالة المسجل:</span>
                      <span className="text-text-muted">{driver.statusReason}</span>
                    </div>
                  )}
                </div>

                {/* Identity & Legal Data Card */}
                <div className="p-4 sm:p-5 rounded-2xl border border-border bg-surface space-y-4 shadow-xs">
                  <h3 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2 border-b border-border/70 pb-3">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>البيانات النظامية والتكليف</span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Serial Number */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-border rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                        <Hash className="w-3.5 h-3.5 text-primary" />
                        <span>الرقم المتسلسل للسائق</span>
                      </span>
                      <div className="text-base font-mono font-black text-primary">
                        #{driver.serialNumber || 1}
                      </div>
                    </div>

                    {/* Workplace */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-border rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-red-500" />
                        <span>مكان العمل</span>
                      </span>
                      <div className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {driver.workplace || 'غير محدد'}
                      </div>
                    </div>

                    {/* Assigned Bus Number */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-border rounded-xl space-y-1">
                      <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                        <BusIcon className="w-3.5 h-3.5 text-sky-600" />
                        <span>الحافلة المخصصة</span>
                      </span>
                      <div className="text-sm font-mono font-black text-sky-700 dark:text-sky-300">
                        {driver.busNumber ? `#${driver.busNumber}` : 'غير مخصص لحافلة حالياً'}
                      </div>
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
                        {driver.iqamaNumber && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(driver.iqamaNumber, 'iqama')}
                            className="text-text-muted hover:text-slate-900 dark:hover:text-white p-1"
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
                      <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                        {driver.iqamaNumber || 'غير مسجل'}
                      </div>
                    </div>

                    {/* Border Number */}
                    <div className="p-3 bg-slate-50/80 dark:bg-slate-800/50 border border-border rounded-xl space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-text-muted flex items-center gap-1">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                          <span>رقم الحدود</span>
                        </span>
                        {driver.borderNumber && (
                          <button
                            type="button"
                            onClick={() => copyToClipboard(driver.borderNumber, 'border')}
                            className="text-text-muted hover:text-slate-900 dark:hover:text-white p-1"
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
                      <div className="text-sm font-mono font-bold text-slate-900 dark:text-white">
                        {driver.borderNumber || 'غير مسجل'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Mobile Contact Box */}
                <div className="p-4 bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/80 dark:border-emerald-900/50 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs shrink-0">
                      <Phone className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
                        رقم الموبايل والتواصل
                      </span>
                      <span className="text-sm font-mono font-black text-slate-900 dark:text-white" dir="ltr">
                        {driver.mobileNumber || 'غير مسجل'}
                      </span>
                    </div>
                  </div>

                  {driver.mobileNumber && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => copyToClipboard(driver.mobileNumber || '', 'phone-modal')}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 border border-border text-text-muted hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="نسخ رقم الموبايل"
                      >
                        {copiedField === 'phone-modal' ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>نسخ</span>
                      </button>

                      <a
                        href={`https://wa.me/${driver.mobileNumber.replace(/[^0-9]/g, '')}`}
                        target="_blank"
                        rel="noreferrer"
                        className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                        title="محادثة واتساب"
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>واتساب</span>
                      </a>

                      <a
                        href={`tel:${driver.mobileNumber}`}
                        className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-xs"
                        title="اتصال مباشر"
                      >
                        <PhoneCall className="w-3.5 h-3.5" />
                        <span>اتصال</span>
                      </a>
                    </div>
                  )}
                </div>

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
                          onClick={() => exportDriverResponsesToExcel(myResponses, `ردود_السائق_${driver.fullName.replace(/\s+/g, '_')}.xlsx`, [driver])}
                          className="p-1.5 bg-surface border border-border hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-text-muted hover:text-slate-900 transition-colors cursor-pointer"
                          title="تصدير ردود هذا السائق إلى ملف Excel"
                        >
                          <Download className="w-4 h-4 text-emerald-600" />
                        </button>
                      </>
                    )}
                    {onAddResponse && (
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
                  <div className="text-center py-12 px-4 rounded-2xl border border-dashed border-border bg-slate-50/50 dark:bg-slate-900/20">
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary mx-auto flex items-center justify-center mb-3">
                      <Navigation className="w-6 h-6" />
                    </div>
                    <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1">
                      لا توجد ردود مسجلة لهذا السائق حتى الآن
                    </h4>
                    <p className="text-xs text-text-muted max-w-sm mx-auto mb-4">
                      يمكنك تسجيل رد السائق وتحديد المسار (محايل عسير - ينبع - القصيم - الرياض) ورقم الحافلة لتظهر هنا تلقائياً.
                    </p>
                    {onAddResponse && (
                      <button
                        type="button"
                        onClick={() => onAddResponse(driver)}
                        className="px-4 py-2 bg-primary hover:bg-primary-hover text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span>تسجيل أول رد الآن</span>
                      </button>
                    )}
                  </div>
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
                                onClick={() => handleDeleteResponse(res.id)}
                                className="text-text-muted hover:text-red-500 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="حذف هذا الرد"
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

          {/* Modal Footer Actions */}
          <div className="p-4 sm:p-5 border-t border-border bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap items-center justify-between gap-3 shrink-0">
            <div className="flex items-center gap-2">
              {isAdmin && onEdit && (
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
              )}

              {isAdmin && onDelete && (
                <button
                  onClick={() => {
                    onClose();
                    onDelete(driver);
                  }}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>حذف السائق</span>
                </button>
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
      </div>
    </AnimatePresence>
  );
};
