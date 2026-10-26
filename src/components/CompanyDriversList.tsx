import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Plus, 
  Upload, 
  Download, 
  FileSpreadsheet,
  Edit, 
  Trash2, 
  Phone, 
  Globe, 
  X, 
  Copy, 
  Check, 
  Users, 
  IdCard, 
  ShieldCheck, 
  UserCheck, 
  Clock, 
  Sparkles,
  PhoneCall,
  Bus,
  MapPin,
  Activity,
  UserX,
  Calendar,
  CheckCircle2,
  RefreshCw,
  Navigation,
  Hash,
  ExternalLink,
  Link2,
  Briefcase
} from 'lucide-react';
import type { CompanyDriver, DriverType, DriverStatus, DriverResponse, Worker } from '../types';
import { resolveDriverType, getDriverClassification, isDriverActiveInMonitoring, getMatchingActiveMonitoringWorker } from '../lib/driverUtils';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { CompanyDriverDetailsModal } from './CompanyDriverDetailsModal';
import { DriverResponseLinkModal } from './DriverResponseLinkModal';
import { downloadCompanyDriversTemplate, exportDriverResponsesToExcel } from '../lib/excelService';

interface CompanyDriversListProps {
  drivers: CompanyDriver[];
  workers?: Worker[];
  isAdmin: boolean;
  onAdd?: () => void;
  onEdit?: (driver: CompanyDriver) => void;
  onDelete?: (id: string) => void;
  onDeleteAll?: () => void;
  onStatusChange?: (driverId: string, newStatus: DriverStatus, reason?: string) => Promise<void>;
  driverResponses?: DriverResponse[];
  onOpenDriverResponse?: (driver?: CompanyDriver) => void;
  onOpenPublicResponsePage?: () => void;
  onDeleteDriverResponse?: (responseId: string) => Promise<void>;
  onImport?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: (data: CompanyDriver[]) => void;
}

export const CompanyDriversList: React.FC<CompanyDriversListProps> = ({
  drivers,
  workers = [],
  isAdmin,
  onAdd,
  onEdit,
  onDelete,
  onDeleteAll,
  onStatusChange,
  driverResponses = [],
  onOpenDriverResponse,
  onOpenPublicResponsePage,
  onDeleteDriverResponse,
  onImport,
  onExport
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedNationality, setSelectedNationality] = useState<string>('');
  const [selectedClassification, setSelectedClassification] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [copiedResponseLink, setCopiedResponseLink] = useState(false);
  const [isResponseLinkModalOpen, setIsResponseLinkModalOpen] = useState(false);
  const [updatingDriverId, setUpdatingDriverId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedDriverForDetails, setSelectedDriverForDetails] = useState<CompanyDriver | null>(null);
  const itemsPerPage = 36;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCopyResponseLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?action=driver-response`;
    navigator.clipboard.writeText(link);
    setCopiedResponseLink(true);
    setTimeout(() => setCopiedResponseLink(false), 2000);
  };

  // Keep selected driver synced with live driver state from props
  const activeDetailDriver = useMemo(() => {
    if (!selectedDriverForDetails) return null;
    return drivers.find(d => d.id === selectedDriverForDetails.id) || selectedDriverForDetails;
  }, [drivers, selectedDriverForDetails]);

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
    name?: string;
    isAll: boolean;
  }>({
    isOpen: false,
    id: null,
    isAll: false
  });

  const copyToClipboard = (text: string, fieldKey: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedField(fieldKey);
    setTimeout(() => {
      setCopiedField(null);
    }, 1800);
  };

  const handleQuickStatusChange = async (driverId: string, newStatus: DriverStatus) => {
    if (!onStatusChange) return;
    try {
      setUpdatingDriverId(`${driverId}-${newStatus}`);
      await onStatusChange(driverId, newStatus);
    } catch (err) {
      console.error('Failed to update driver status:', err);
    } finally {
      setUpdatingDriverId(null);
    }
  };

  const formatArabicDate = (dateVal?: any) => {
    if (!dateVal) return null;
    try {
      if (dateVal?.toDate && typeof dateVal.toDate === 'function') {
        return dateVal.toDate().toLocaleDateString('ar-SA', {
          year: 'numeric',
          month: 'short',
          day: 'numeric'
        });
      }
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return String(dateVal);
      return d.toLocaleDateString('ar-SA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return String(dateVal);
    }
  };

  // Metrics
  const stats = useMemo(() => {
    const total = drivers.length;
    // Driver Type: Iqama -> 'مقيم', Border -> 'موسمي'
    const resident = drivers.filter(d => resolveDriverType(d) === 'مقيم').length;
    const seasonal = drivers.filter(d => resolveDriverType(d) === 'موسمي').length;
    const temporary = drivers.filter(d => resolveDriverType(d) === 'مؤقت').length;
    
    // Status metrics (default to 'نشط' if not explicitly set)
    const active = drivers.filter(d => !d.status || d.status === 'نشط').length;
    const onLeave = drivers.filter(d => d.status === 'في إجازة').length;
    const excluded = drivers.filter(d => d.status === 'مستبعد').length;

    // Driver Classification: نقل عمال / عمرة (auto 'نقل عمال' if active in monitoring)
    const laborTransport = drivers.filter(d => getDriverClassification(d, workers) === 'نقل عمال').length;
    const umrah = drivers.filter(d => getDriverClassification(d, workers) === 'عمرة').length;

    // Active in Monitoring count (الرقابة والمتابعة - غير منتهي عمله)
    const activeInMonitoring = drivers.filter(d => isDriverActiveInMonitoring(d, workers)).length;

    const uniqueNationalities = Array.from(new Set(drivers.map(d => d.nationality).filter(Boolean))).length;

    return { total, resident, temporary, seasonal, active, onLeave, excluded, laborTransport, umrah, activeInMonitoring, uniqueNationalities };
  }, [drivers, workers]);

  const nationalities = useMemo(() => {
    return Array.from(new Set(drivers.map(d => d.nationality).filter(Boolean))).sort();
  }, [drivers]);

  // Filtered drivers
  const filteredDrivers = useMemo(() => {
    return drivers.filter(driver => {
      const classification = getDriverClassification(driver, workers);
      const effectiveType = resolveDriverType(driver);
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch = !search || (
        (driver.fullName || '').toLowerCase().includes(search) ||
        (driver.nationality || '').toLowerCase().includes(search) ||
        (driver.iqamaNumber || '').toLowerCase().includes(search) ||
        (driver.borderNumber || '').toLowerCase().includes(search) ||
        (driver.mobileNumber || '').toLowerCase().includes(search) ||
        classification.toLowerCase().includes(search) ||
        (driver.busNumber || '').toLowerCase().includes(search) ||
        (driver.statusReason || '').toLowerCase().includes(search) ||
        (driver.notes || '').toLowerCase().includes(search) ||
        String(driver.serialNumber || '').includes(search) ||
        `#${driver.serialNumber || ''}`.includes(search)
      );

      const matchesType = selectedType === 'all' || effectiveType === selectedType;
      const driverCurrentStatus = driver.status || 'نشط';
      const matchesStatus = selectedStatus === 'all' || driverCurrentStatus === selectedStatus;
      const matchesNationality = !selectedNationality || driver.nationality === selectedNationality;
      const matchesClassification = !selectedClassification || classification === selectedClassification;

      return matchesSearch && matchesType && matchesStatus && matchesNationality && matchesClassification;
    });
  }, [drivers, workers, searchTerm, selectedType, selectedStatus, selectedNationality, selectedClassification]);

  // Reset page when filtering
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType, selectedStatus, selectedNationality, selectedClassification]);

  const totalPages = Math.ceil(filteredDrivers.length / itemsPerPage);

  const paginatedDrivers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredDrivers.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredDrivers, currentPage]);

  const getTypeBadge = (type: DriverType) => {
    switch (type) {
      case 'مقيم':
        return {
          label: 'مقيم',
          icon: <UserCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          color: '#10b981',
          className: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
        };
      case 'مؤقت':
        return {
          label: 'مؤقت',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          color: '#f59e0b',
          className: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
        };
      case 'موسمي':
        return {
          label: 'موسمي',
          icon: <Sparkles className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />,
          color: '#8b5cf6',
          className: 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
        };
      default:
        return {
          label: type || 'غير محدد',
          icon: <Users className="w-3.5 h-3.5 text-slate-500" />,
          color: '#64748b',
          className: 'bg-slate-50 text-slate-700 border-slate-200'
        };
    }
  };

  const getStatusBadge = (status?: DriverStatus) => {
    const s = status || 'نشط';
    switch (s) {
      case 'نشط':
        return {
          label: 'نشط',
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />,
          color: '#10b981',
          className: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800',
          dotColor: 'bg-emerald-500',
          accentBorder: 'border-emerald-500'
        };
      case 'في إجازة':
        return {
          label: 'في إجازة',
          icon: <Clock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />,
          color: '#f59e0b',
          className: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800',
          dotColor: 'bg-amber-500',
          accentBorder: 'border-amber-500'
        };
      case 'مستبعد':
        return {
          label: 'مستبعد',
          icon: <UserX className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
          color: '#f43f5e',
          className: 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          dotColor: 'bg-rose-500',
          accentBorder: 'border-rose-500'
        };
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header & Stat Cards */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
              إدارة الكوادر البشرية
            </span>
            <span className="text-xs text-text-muted">خاص بإدارة الشركة</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <span>سائقين الشركة</span>
            <span className="text-xs font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-800 text-text-muted rounded-full">
              {drivers.length} سائق
            </span>
          </h1>
          <p className="text-xs text-text-muted mt-1">
            سجل وتصنيف سائقي الشركة المعتمدين (مقيمين، مؤقتين، وموسميين) مع بيانات الهوية والتواصل
          </p>
        </div>

        {/* Global Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Direct Public Link Button (Enter link directly without login / popup blockers) */}
          <button 
            type="button"
            onClick={() => {
              if (onOpenPublicResponsePage) {
                onOpenPublicResponsePage();
              } else {
                window.location.search = '?action=driver-response';
              }
            }}
            className="flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl text-xs font-black transition-all shadow-sm shadow-emerald-600/20 cursor-pointer"
            title="الدخول على الرابط المباشر الآن وتسجيل بيانات الرد"
          >
            <Navigation className="w-4 h-4" />
            <span>الدخول على الرابط وتسجيل الرد</span>
          </button>

          {/* 2. Export Driver Responses to Excel directly */}
          <button 
            type="button"
            onClick={() => exportDriverResponsesToExcel(driverResponses, 'ردود_وحركات_السائقين.xlsx', drivers)}
            className="flex items-center gap-2 px-3.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 rounded-xl text-xs font-black transition-colors shadow-xs cursor-pointer"
            title="تصدير ردود وحركات السائقين إلى Excel (يتضمن رقم الإقامة ورقم الحدود)"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير الردود Excel</span>
            {driverResponses.length > 0 && (
              <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[10px] rounded-full font-mono font-bold">
                {driverResponses.length}
              </span>
            )}
          </button>

          {/* 3. Internal Quick Admin Response Modal */}
          {onOpenDriverResponse && (
            <button 
              onClick={() => onOpenDriverResponse()}
              className="flex items-center gap-1.5 px-3 py-2 bg-surface border border-border text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="تسجيل رد سريع من داخل لوحة التحكم"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-600" />
              <span>رد سريع</span>
            </button>
          )}

          {isAdmin && onImport && (
            <button 
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-2 px-3.5 py-2 bg-surface border border-border text-slate-900 dark:text-white rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              title="استيراد سائقين من ملف Excel"
            >
              <Upload className="w-4 h-4 text-blue-600" />
              <span>استيراد Excel</span>
              <input 
                type="file" 
                ref={fileInputRef} 
                onChange={onImport} 
                className="hidden" 
                accept=".xlsx, .xls, .csv" 
              />
            </button>
          )}

          <button 
            onClick={() => onExport(filteredDrivers)}
            className="flex items-center gap-2 px-3.5 py-2 bg-surface border border-border text-slate-900 dark:text-white rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
            title="تصدير السائقين الحاليين إلى Excel"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          {isAdmin && (
            <button 
              onClick={() => downloadCompanyDriversTemplate()}
              className="flex items-center gap-2 px-3 py-2 bg-surface border border-border text-text-muted hover:text-slate-900 dark:hover:text-white rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
              title="تحميل نموذج Excel فارغ لتعبئة بيانات السائقين"
            >
              <FileSpreadsheet className="w-4 h-4 text-primary" />
              <span className="hidden sm:inline">تحميل النموذج</span>
            </button>
          )}

          {isAdmin && onAdd && (
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all shadow-sm shadow-primary/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سائق جديد</span>
            </button>
          )}
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div 
          onClick={() => { setSelectedType('all'); setSelectedStatus('all'); }}
          className={`p-3.5 bg-surface rounded-2xl border transition-all cursor-pointer ${
            selectedType === 'all' && selectedStatus === 'all'
              ? 'border-primary ring-2 ring-primary/20 shadow-md' 
              : 'border-border hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-text-muted">إجمالي السائقين</span>
            <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{stats.total}</div>
          <span className="text-[10px] text-text-muted mt-1 block">كافة الكوادر المسجلة</span>
        </div>

        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'نشط' ? 'all' : 'نشط')}
          className={`p-3.5 bg-surface rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === 'نشط' 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
              : 'border-border hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400">سائق نشط</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{stats.active}</div>
          <span className="text-[10px] text-text-muted mt-1 block">جاهز ومتاح للعمل</span>
        </div>

        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'في إجازة' ? 'all' : 'في إجازة')}
          className={`p-3.5 bg-surface rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === 'في إجازة' 
              ? 'border-amber-500 ring-2 ring-amber-500/20 shadow-md' 
              : 'border-border hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400">في إجازة</span>
            <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/30 text-amber-600 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{stats.onLeave}</div>
          <span className="text-[10px] text-text-muted mt-1 block">إجازة دورية / سنوية</span>
        </div>

        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'مستبعد' ? 'all' : 'مستبعد')}
          className={`p-3.5 bg-surface rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === 'مستبعد' 
              ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-md' 
              : 'border-border hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">مستبعد</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
              <UserX className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">{stats.excluded}</div>
          <span className="text-[10px] text-text-muted mt-1 block">موقوف أو مستبعد</span>
        </div>

        <div 
          onClick={() => setSelectedType(selectedType === 'مقيم' ? 'all' : 'مقيم')}
          className={`p-3.5 bg-surface rounded-2xl border transition-all cursor-pointer ${
            selectedType === 'مقيم' 
              ? 'border-emerald-500 ring-2 ring-emerald-500/20 shadow-md' 
              : 'border-border hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">سائق مقيم</span>
            <div className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center">
              <UserCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">{stats.resident}</div>
          <span className="text-[10px] text-text-muted mt-1 block">إقامة نظامية دائمة</span>
        </div>

        <div 
          onClick={() => { setSelectedType('all'); setSelectedStatus('all'); }}
          className="p-3.5 bg-surface rounded-2xl border border-border shadow-xs cursor-pointer hover:border-slate-300 dark:hover:border-slate-700 transition-all"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-text-muted">مؤقت / موسمي</span>
            <div className="w-7 h-7 rounded-lg bg-purple-50 dark:bg-purple-900/30 text-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">{stats.temporary + stats.seasonal}</div>
          <span className="text-[10px] text-text-muted mt-1 block">عقود ومواسم ({stats.temporary} + {stats.seasonal})</span>
        </div>
      </div>

      {/* Search & Filter Bar (Matching FleetList) */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 group">
              <Search className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors w-4 h-4 ${searchTerm ? 'text-primary' : 'text-text-muted'}`} />
              <input 
                type="text" 
                placeholder="ابحث بالاسم، رقم الإقامة، رقم الحدود، تصنيف السائق (نقل عمال/عمرة)، الحافلة، الجنسية، أو الموبايل..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pr-10 pl-4 py-2.5 bg-background border border-border focus:border-primary rounded-lg outline-none transition-all text-sm font-medium shadow-sm"
              />
              {searchTerm && (
                <button 
                  onClick={() => setSearchTerm('')}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-red-500 transition-colors p-1"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-lg transition-all border flex items-center gap-2 cursor-pointer ${
                showFilters 
                  ? 'bg-primary text-white border-primary shadow-sm' 
                  : (selectedStatus !== 'all' || selectedType !== 'all' || selectedNationality || selectedClassification)
                    ? 'bg-primary/10 text-primary border-primary/30 font-bold'
                    : 'bg-surface text-text-muted border-border hover:bg-background'
              }`}
            >
              <Filter className="w-5 h-5" />
              <span className="text-xs font-bold hidden md:block">الفلاتر المتقدمة</span>
              {(selectedStatus !== 'all' || selectedType !== 'all' || selectedNationality || selectedClassification) && (
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              )}
            </button>
          </div>
          
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-black text-text-muted/60 uppercase tracking-tighter">مجال البحث:</span>
            <div className="flex flex-wrap gap-1.5">
              {['الاسم الثلاثي', 'الرقم المتسلسل', 'الحالة', 'رقم الإقامة', 'رقم الحدود', 'تصنيف السائق (نقل عمال / عمرة)', 'رقم الحافلة', 'الجنسية', 'رقم الموبايل'].map((field) => (
                <span 
                  key={field}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
                    searchTerm ? 'bg-primary/5 text-primary border-primary/20 font-black' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 font-bold'
                  }`}
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Advanced Filter Drawer - تظهر فقط عند الضغط على خيار الفلاتر المتقدمة */}
        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border pt-3 space-y-3"
            >
              {/* Quick Filter Section: Status + Classification (داخل الفلاتر المتقدمة) */}
              <div className="p-3 bg-slate-50/70 dark:bg-slate-900/40 rounded-xl border border-border/80 space-y-2.5">
                {/* Status Quick Filter Pills */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  <span className="text-xs font-bold text-text-muted shrink-0 ml-1 flex items-center gap-1">
                    <Activity className="w-3.5 h-3.5 text-primary" />
                    <span>الحالة:</span>
                  </span>
                  {[
                    { id: 'all', label: 'كافة الحالات', count: drivers.length },
                    { id: 'نشط', label: 'نشط', count: stats.active, colorClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300' },
                    { id: 'في إجازة', label: 'في إجازة', count: stats.onLeave, colorClass: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300' },
                    { id: 'مستبعد', label: 'مستبعد', count: stats.excluded, colorClass: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-300' },
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedStatus(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        selectedStatus === tab.id
                          ? 'bg-primary text-white border-primary shadow-xs'
                          : 'bg-background text-text-muted border-border hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedStatus === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200/60 dark:bg-slate-800 text-text-muted'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>

                {/* Driver Type Quick Filter Pills: مقيم (إقامة) / موسمي (حدود) */}
                <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-1 border-t border-border/40">
                  <span className="text-xs font-bold text-text-muted shrink-0 ml-1 flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-slate-500" />
                    <span>نوع السائق:</span>
                  </span>
                  {[
                    { id: 'all', label: 'الكل', count: drivers.length },
                    { id: 'مقيم', label: 'مقيم (رقم إقامة)', count: stats.resident },
                    { id: 'موسمي', label: 'موسمي (رقم حدود)', count: stats.seasonal },
                    ...(stats.temporary > 0 ? [{ id: 'مؤقت', label: 'مؤقت', count: stats.temporary }] : [])
                  ].map(tab => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setSelectedType(tab.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border flex items-center gap-1.5 shrink-0 cursor-pointer ${
                        selectedType === tab.id
                          ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 border-slate-900 dark:border-slate-100 shadow-xs'
                          : 'bg-background text-text-muted border-border hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                        selectedType === tab.id ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-200/60 dark:bg-slate-800 text-text-muted'
                      }`}>
                        {tab.count}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Dropdowns & Reset */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted mr-1">تصفية حسب الجنسية</label>
                  <select 
                    value={selectedNationality}
                    onChange={(e) => setSelectedNationality(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-sm shadow-sm"
                  >
                    <option value="">كافة الجنسيات</option>
                    {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted mr-1">تصنيف السائق (نوع العمل)</label>
                  <select 
                    value={selectedClassification}
                    onChange={(e) => setSelectedClassification(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-sm shadow-sm"
                  >
                    <option value="">كافة التصنيفات (نقل عمال / عمرة)</option>
                    <option value="نقل عمال">🚌 نقل عمال ({stats.laborTransport})</option>
                    <option value="عمرة">🕌 عمرة ({stats.umrah})</option>
                  </select>
                </div>
                {(selectedStatus !== 'all' || selectedNationality || selectedType !== 'all' || selectedClassification || searchTerm) && (
                  <div className="col-span-1 md:col-span-2 lg:col-span-2 flex items-end justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus('all');
                        setSelectedNationality('');
                        setSelectedType('all');
                        setSelectedClassification('');
                        setSearchTerm('');
                      }}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-text-muted hover:text-slate-900 dark:hover:text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                    >
                      إعادة ضبط جميع الفلاتر
                    </button>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Drivers Cards Grid (Styled to match Fleet list cards) */}
      {paginatedDrivers.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <AnimatePresence mode="popLayout">
            {paginatedDrivers.map((driver, index) => {
              const effectiveType = resolveDriverType(driver);
              const badge = getTypeBadge(effectiveType);
              const statusBadge = getStatusBadge(driver.status);
              const inMonitoringWorker = getMatchingActiveMonitoringWorker(driver, workers);
              const inMonitoring = Boolean(inMonitoringWorker);
              const classification = getDriverClassification(driver, workers);
              return (
                <motion.div
                  key={driver.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.18, delay: Math.min(index * 0.02, 0.3) }}
                  onClick={() => setSelectedDriverForDetails(driver)}
                  className="group bg-surface rounded-2xl border border-border shadow-sm hover:shadow-xl hover:border-primary/40 transition-all overflow-hidden flex flex-col relative cursor-pointer"
                  style={{
                    borderColor: `${statusBadge.color}35`,
                    boxShadow: `0 0 15px -4px ${statusBadge.color}15, 0 4px 6px -4px ${statusBadge.color}10`
                  }}
                >
                  {/* Top Color Strip based on Status */}
                  <div 
                    className="h-1.5 w-full absolute top-0 left-0" 
                    style={{ backgroundColor: statusBadge.color }}
                  />

                  {/* Card Header */}
                  <div className="p-4 bg-gradient-to-br from-primary/[0.03] to-transparent border-b border-border/50">
                    <div className="flex justify-between items-start mb-2.5">
                      <div className="flex flex-col flex-1 min-w-0 pr-1">
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[11px] font-mono font-black px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shadow-2xs">
                            #{driver.serialNumber || 1}
                          </span>
                          <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                            السائق
                          </span>
                        </div>
                        <h3 
                          className="text-base font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-snug tracking-tight truncate"
                          title={driver.fullName}
                        >
                          {driver.fullName}
                        </h3>
                      </div>

                      <div className="flex flex-col items-end gap-1.5 shrink-0">
                        {/* Status Badge */}
                        <span className={`
                          inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border tracking-tight shadow-xs
                          ${statusBadge.className}
                        `}>
                          {statusBadge.icon}
                          <span>{statusBadge.label}</span>
                        </span>

                        {/* Classification Badge (مقيم / موسمي) */}
                        <span className={`
                          inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border tracking-tight
                          ${badge.className}
                        `}>
                          {badge.icon}
                          <span>{badge.label}</span>
                        </span>
                      </div>
                    </div>

                    {/* Tags */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {/* Driver Classification (نقل عمال / عمرة) Tag */}
                      <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border shadow-xs ${
                        classification === 'عمرة'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : inMonitoring
                            ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700'
                            : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                      }`}>
                        <Briefcase className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold">
                          {classification === 'عمرة' ? 'عمرة' : (inMonitoring ? 'نقل عمال (بالرقابة)' : 'نقل عمال')}
                        </span>
                      </div>

                      {driver.busNumber && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-lg shadow-xs">
                          <Bus className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                          <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 font-mono">
                            حافلة #{driver.busNumber}
                          </span>
                        </div>
                      )}
                      {driver.nationality && (
                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF9F6] dark:bg-background border border-border rounded-lg shadow-xs">
                          <Globe className="w-3.5 h-3.5 text-primary" />
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white">
                            {driver.nationality}
                          </span>
                        </div>
                      )}
                      {/* Driver responses count tag if any */}
                      {(() => {
                        const count = driverResponses.filter(r => r.driverId === driver.id || (driver.serialNumber && r.driverSerialNumber === driver.serialNumber)).length;
                        return count > 0 ? (
                          <div className="flex items-center gap-1 px-2 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-xs">
                            <Navigation className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300 font-mono">
                              {count} {count === 1 ? 'رد' : count === 2 ? 'ردان' : 'ردود'}
                            </span>
                          </div>
                        ) : null;
                      })()}
                    </div>
                  </div>

                  {/* Card Body */}
                  <div className="p-4 flex-1 space-y-3">
                    <div className="grid grid-cols-2 gap-2.5">
                      {/* Iqama Number */}
                      <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/40 border border-border/70 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <IdCard className="w-3 h-3 text-primary" />
                            <span>رقم الإقامة</span>
                          </span>
                          {driver.iqamaNumber && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(driver.iqamaNumber || '', `iqama-${driver.id}`);
                              }}
                              className="text-text-muted hover:text-primary transition-colors p-0.5 cursor-pointer"
                              title="نسخ رقم الإقامة"
                            >
                              {copiedField === `iqama-${driver.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                          {driver.iqamaNumber || '—'}
                        </div>
                      </div>

                      {/* Border Number */}
                      <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/40 border border-border/70 rounded-xl space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                            <span>رقم الحدود</span>
                          </span>
                          {driver.borderNumber && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(driver.borderNumber || '', `border-${driver.id}`);
                              }}
                              className="text-text-muted hover:text-primary transition-colors p-0.5 cursor-pointer"
                              title="نسخ رقم الحدود"
                            >
                              {copiedField === `border-${driver.id}` ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        <div className="text-xs font-mono font-bold text-slate-900 dark:text-white truncate">
                          {driver.borderNumber || '—'}
                        </div>
                      </div>
                    </div>

                    {/* Mobile Number Row */}
                    <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/40 border border-border/70 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 flex items-center justify-center shrink-0">
                          <Phone className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <span className="text-[10px] font-bold text-text-muted block">رقم الموبايل</span>
                          <span className="text-xs font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                            {driver.mobileNumber || 'غير مسجل'}
                          </span>
                        </div>
                      </div>

                      {driver.mobileNumber && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(driver.mobileNumber || '', `phone-${driver.id}`);
                            }}
                            className="p-1.5 hover:bg-white dark:hover:bg-slate-700 text-text-muted hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                            title="نسخ رقم الموبايل"
                          >
                            {copiedField === `phone-${driver.id}` ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                          <a 
                            href={`tel:${driver.mobileNumber}`}
                            onClick={(e) => e.stopPropagation()}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors shadow-xs"
                            title="اتصال مباشر"
                          >
                            <PhoneCall className="w-3.5 h-3.5" />
                          </a>
                        </div>
                      )}
                    </div>

                    {/* Driver Classification & Bus Info Row (replaced workplace) */}
                    <div className="p-2.5 bg-slate-50/70 dark:bg-slate-800/40 border border-border/70 rounded-xl space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                          <Briefcase className="w-3 h-3 text-primary shrink-0" />
                          <span>تصنيف السائق:</span>
                        </span>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-black border ${
                            classification === 'عمرة'
                              ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-700'
                              : inMonitoring
                                ? 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-300 dark:border-cyan-700'
                                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-300 dark:border-emerald-700'
                          }`}>
                            <span>{classification === 'عمرة' ? '🕌 عمرة' : '🚌 نقل عمال'}</span>
                          </span>
                          {inMonitoring && (
                            <span className="text-[9px] font-bold bg-cyan-100 dark:bg-cyan-950/50 text-cyan-800 dark:text-cyan-200 px-1.5 py-0.5 rounded border border-cyan-300 dark:border-cyan-700" title="نشط حالياً في الرقابة والمتابعة">
                              نشط بالرقابة
                            </span>
                          )}
                        </div>
                      </div>
                      {driver.busNumber && (
                        <div className="flex items-center justify-between pt-1.5 border-t border-border/40">
                          <span className="text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                            <Bus className="w-3 h-3 text-sky-600 shrink-0" />
                            <span>الحافلة المخصصة:</span>
                          </span>
                          <span className="text-xs font-mono font-bold text-sky-700 dark:text-sky-400">
                            #{driver.busNumber}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Notes (if available) */}
                    {driver.notes && (
                      <div className="text-[11px] text-text-muted bg-primary/[0.03] p-2 rounded-lg border border-primary/10 line-clamp-2">
                        <span className="font-bold text-slate-700 dark:text-slate-300 ml-1">ملاحظة:</span>
                        {driver.notes}
                      </div>
                    )}
                  </div>

                  {/* Card Footer Actions */}
                  <div className="p-3 bg-slate-50/60 dark:bg-slate-900/40 border-t border-border/50 mt-auto flex items-center justify-between gap-1.5">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDriverForDetails(driver);
                      }}
                      className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-primary/10 hover:bg-primary text-primary hover:text-white border border-primary/20 rounded-xl transition-all text-xs font-black shadow-xs cursor-pointer"
                      title="الدخول لبطاقة السائق وعرض خيارات نشط / في إجازة / مستبعد وسجل الردود"
                    >
                      <IdCard className="w-3.5 h-3.5" />
                      <span>بطاقة السائق</span>
                    </button>

                    {onOpenDriverResponse && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDriverResponse(driver);
                        }}
                        className="px-2.5 py-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-600 hover:text-white rounded-xl transition-all text-xs font-bold shadow-xs cursor-pointer flex items-center gap-1 shrink-0"
                        title="تسجيل رد وحركة لهذا السائق"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">رد</span>
                      </button>
                    )}

                    {isAdmin && onEdit && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(driver);
                        }}
                        className="p-2 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary border border-border hover:border-primary/30 rounded-xl transition-all text-xs font-bold shadow-xs cursor-pointer"
                        title="تعديل بيانات السائق"
                      >
                        <Edit className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {isAdmin && onDelete && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({
                            isOpen: true,
                            id: driver.id,
                            name: driver.fullName,
                            isAll: false
                          });
                        }}
                        className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer"
                        title="حذف السائق"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      ) : (
        /* Empty State */
        <div className="bg-surface rounded-2xl border border-dashed border-border p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 rounded-2xl flex items-center justify-center shadow-xs">
            <Users className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">
            {drivers.length === 0 ? 'لا يوجد سائقين مسجلين بعد' : 'لا توجد نتائج مطابقة لبحثك'}
          </h3>
          <p className="text-xs text-text-muted max-w-md mx-auto mb-6">
            {drivers.length === 0 
              ? 'يمكنك البدء بإضافة سائقي الشركة يدويًا أو استيرادهم مباشرة من ملف Excel.' 
              : 'جرب تغيير كلمات البحث أو إعادة ضبط خيارات التصفية لعرض السائقين.'}
          </p>
          <div className="flex items-center justify-center gap-3">
            {drivers.length === 0 && isAdmin ? (
              <>
                {onAdd && (
                  <button 
                    onClick={onAdd}
                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all shadow-sm shadow-primary/20 cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>إضافة سائق جديد</span>
                  </button>
                )}
                {onImport && (
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2.5 bg-surface border border-border text-slate-900 dark:text-white rounded-xl text-xs font-bold hover:bg-slate-50 transition-colors shadow-xs cursor-pointer"
                  >
                    <Upload className="w-4 h-4 text-blue-600" />
                    <span>استيراد من Excel</span>
                  </button>
                )}
              </>
            ) : (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedType('all');
                  setSelectedNationality('');
                }}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-900 dark:text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
              >
                مسح معايير البحث
              </button>
            )}
          </div>
        </div>
      )}

      {/* Pagination (if applicable) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 px-2">
          <span className="text-xs text-text-muted">
            عرض {paginatedDrivers.length} من أصل {filteredDrivers.length} سائق
          </span>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-bold text-text-main disabled:opacity-40 disabled:cursor-not-allowed hover:bg-background cursor-pointer"
            >
              السابق
            </button>
            <span className="text-xs font-bold px-3 py-1.5 bg-primary/10 text-primary rounded-lg font-mono">
              {currentPage} / {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1.5 bg-surface border border-border rounded-lg text-xs font-bold text-text-main disabled:opacity-40 disabled:cursor-not-allowed hover:bg-background cursor-pointer"
            >
              التالي
            </button>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <DeleteConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null, isAll: false })}
        onConfirm={async () => {
          if (deleteModal.isAll && onDeleteAll) {
            await onDeleteAll();
          } else if (deleteModal.id && onDelete) {
            await onDelete(deleteModal.id);
          }
          setDeleteModal({ isOpen: false, id: null, isAll: false });
        }}
        title={deleteModal.isAll ? "حذف جميع سائقي الشركة" : "حذف بيانات السائق"}
        message={deleteModal.isAll 
          ? "تحذير: هل أنت متأكد من حذف جميع بيانات سائقي الشركة؟ لا يمكن التراجع عن هذا الإجراء." 
          : `هل أنت متأكد من رغبتك في حذف السائق (${deleteModal.name}) نهائياً من النظام؟`
        }
      />

      {/* Driver Details Modal - بطاقة السائق المتكاملة متضمنة خيارات نشط / في إجازة / مستبعد وتبويب ردود السائق */}
      <CompanyDriverDetailsModal 
        driver={activeDetailDriver}
        workers={workers}
        isOpen={!!activeDetailDriver}
        isAdmin={isAdmin}
        onClose={() => setSelectedDriverForDetails(null)}
        onEdit={onEdit}
        onDelete={(d) => setDeleteModal({ 
          isOpen: true, 
          id: d.id, 
          name: d.fullName, 
          isAll: false 
        })}
        onStatusChange={onStatusChange}
        driverResponses={driverResponses}
        onAddResponse={(d) => {
          if (onOpenDriverResponse) {
            onOpenDriverResponse(d);
          }
        }}
        onDeleteResponse={onDeleteDriverResponse}
      />

      {/* Driver Response Link & Google Sheets Integration Modal */}
      <DriverResponseLinkModal 
        isOpen={isResponseLinkModalOpen}
        onClose={() => setIsResponseLinkModalOpen(false)}
        driverResponses={driverResponses}
        drivers={drivers}
        onOpenPublicPageDirectly={onOpenPublicResponsePage}
      />
    </div>
  );
};
