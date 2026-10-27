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
  Briefcase,
  MessageCircle,
  LayoutGrid,
  ListFilter
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
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('grid');
  const itemsPerPage = 36;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const cleanSaudiPhone = (phone?: string) => {
    if (!phone) return '';
    const digits = phone.replace(/[^0-9]/g, '');
    if (digits.startsWith('00966')) return digits.slice(2);
    if (digits.startsWith('966')) return digits;
    if (digits.startsWith('05')) return '966' + digits.slice(1);
    if (digits.startsWith('5')) return '966' + digits;
    return digits;
  };

  const getDriverInitials = (name: string) => {
    if (!name) return 'س';
    const clean = name.replace(/^(السائق|سائق|كابتن|الأستاذ|السيد)\s+/i, '').trim();
    const words = clean.split(/\s+/).filter(Boolean);
    if (words.length >= 2) return `${words[0][0]}${words[1][0]}`;
    return clean.slice(0, 2) || 'س';
  };

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

            {/* View Mode Toggle (Grid / Compact) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-border rounded-lg p-0.5 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                  viewMode === 'grid' 
                    ? 'bg-surface text-primary shadow-xs font-black border border-border/80' 
                    : 'text-text-muted hover:text-slate-900 dark:hover:text-white'
                }`}
                title="عرض شبكي مفصل"
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">شبكي</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                  viewMode === 'compact' 
                    ? 'bg-surface text-primary shadow-xs font-black border border-border/80' 
                    : 'text-text-muted hover:text-slate-900 dark:hover:text-white'
                }`}
                title="عرض بطاقات مدمجة"
              >
                <ListFilter className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">مدمج</span>
              </button>
            </div>
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

      {/* Drivers Cards Grid (Simplified, Compact & Full Name Visible) */}
      {paginatedDrivers.length > 0 ? (
        <div className={
          viewMode === 'compact'
            ? "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5"
            : "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5"
        }>
          <AnimatePresence mode="popLayout">
            {paginatedDrivers.map((driver, index) => {
              const effectiveType = resolveDriverType(driver);
              const badge = getTypeBadge(effectiveType);
              const statusBadge = getStatusBadge(driver.status);
              const inMonitoringWorker = getMatchingActiveMonitoringWorker(driver, workers);
              const inMonitoring = Boolean(inMonitoringWorker);
              const classification = getDriverClassification(driver, workers);
              const cleanPhone = cleanSaudiPhone(driver.mobileNumber);
              const driverRespList = driverResponses.filter(
                r => r.driverId === driver.id || (driver.serialNumber && r.driverSerialNumber === driver.serialNumber)
              );
              const latestResp = driverRespList.length > 0 ? driverRespList[0] : null;

              // Primary ID to display: Iqama if مقيم or available, Border if موسمي
              const primaryIdLabel = (effectiveType === 'موسمي' && driver.borderNumber) ? 'رقم الحدود' : 'رقم الإقامة';
              const primaryIdValue = (effectiveType === 'موسمي' && driver.borderNumber)
                ? driver.borderNumber
                : (driver.iqamaNumber || driver.borderNumber || '—');

              return (
                <motion.div
                  key={driver.id}
                  layout
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.15, delay: Math.min(index * 0.012, 0.2) }}
                  onClick={() => setSelectedDriverForDetails(driver)}
                  className={`group bg-surface rounded-2xl border transition-all duration-200 flex flex-col justify-between relative cursor-pointer overflow-hidden ${
                    viewMode === 'compact' ? 'p-3 gap-2 shadow-2xs hover:shadow-md' : 'p-3.5 gap-2.5 shadow-xs hover:shadow-lg'
                  }`}
                  style={{
                    borderColor: `${statusBadge.color}35`,
                    borderTopWidth: '3.5px',
                    borderTopColor: statusBadge.color
                  }}
                >
                  {/* Top Bar: Serial + Type Badge + Status Badge */}
                  <div className="flex items-center justify-between gap-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-mono font-black px-1.5 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 shrink-0">
                        #{driver.serialNumber || 1}
                      </span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${badge.className}`}>
                        {badge.icon}
                        <span>{badge.label}</span>
                      </span>
                    </div>

                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 shadow-2xs ${statusBadge.className}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor} ${driver.status === 'نشط' || !driver.status ? 'animate-pulse' : ''}`} />
                      <span>{statusBadge.label}</span>
                    </span>
                  </div>

                  {/* Driver Name Section: Full Width, Completely Visible without truncation! */}
                  <div className="pt-0.5">
                    <h3 
                      className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-snug break-words"
                      title={driver.fullName}
                    >
                      {driver.fullName}
                    </h3>

                    {/* Operational Tags (Classification, Monitoring, Bus, Nationality) */}
                    <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px]">
                      {/* Classification Badge (نقل عمال / عمرة) */}
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold ${
                        classification === 'عمرة'
                          ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                          : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                      }`}>
                        <Briefcase className="w-2.5 h-2.5" />
                        <span>{classification === 'عمرة' ? 'عمرة' : 'نقل عمال'}</span>
                      </span>

                      {/* Active in Monitoring Live Ping */}
                      {inMonitoring && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-bold" title="نشط حالياً بنظام الرقابة والمتابعة وعمليات نقل العمال">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                          <span>بالرقابة</span>
                        </span>
                      )}

                      {/* Assigned Bus Number */}
                      {driver.busNumber && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border font-mono font-bold">
                          <Bus className="w-2.5 h-2.5 text-sky-600" />
                          <span>#{driver.busNumber}</span>
                        </span>
                      )}

                      {/* Nationality */}
                      {driver.nationality && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                          <Globe className="w-2.5 h-2.5" />
                          <span>{driver.nationality}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Compact Info Row: Official ID + Mobile Phone with Direct WhatsApp & Call */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/50 text-[11px]">
                    {/* ID Container */}
                    <div className="p-1.5 px-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-border/70 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[10px] text-text-muted">
                        <span className="flex items-center gap-1 font-bold">
                          <IdCard className="w-3 h-3 text-primary" />
                          <span>{primaryIdLabel}</span>
                        </span>
                        {primaryIdValue !== '—' && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              copyToClipboard(primaryIdValue, `id-${driver.id}`);
                            }}
                            className="text-text-muted hover:text-primary transition-colors p-0.5 cursor-pointer"
                            title="نسخ الرقم"
                          >
                            {copiedField === `id-${driver.id}` ? (
                              <Check className="w-3 h-3 text-emerald-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                        )}
                      </div>
                      <div className="text-xs font-mono font-black text-slate-900 dark:text-white truncate mt-0.5" title={primaryIdValue}>
                        {primaryIdValue}
                      </div>
                    </div>

                    {/* Mobile Container */}
                    <div className="p-1.5 px-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-border/70 flex flex-col justify-between">
                      <div className="flex items-center justify-between text-[10px] text-text-muted">
                        <span className="flex items-center gap-1 font-bold">
                          <Phone className="w-3 h-3 text-emerald-600" />
                          <span>الجوال</span>
                        </span>
                        {driver.mobileNumber && (
                          <div className="flex items-center gap-1">
                            {cleanPhone && (
                              <a 
                                href={`https://wa.me/${cleanPhone}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="p-0.5 text-emerald-600 hover:text-emerald-700 transition-colors"
                                title="محادثة واتساب مباشرة"
                              >
                                <MessageCircle className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <a 
                              href={`tel:${driver.mobileNumber}`}
                              onClick={(e) => e.stopPropagation()}
                              className="p-0.5 text-emerald-600 hover:text-emerald-700 transition-colors"
                              title="اتصال هاتفي"
                            >
                              <PhoneCall className="w-3.5 h-3.5" />
                            </a>
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-mono font-black text-slate-900 dark:text-white truncate mt-0.5" dir="ltr" title={driver.mobileNumber || ''}>
                        {driver.mobileNumber || 'غير مسجل'}
                      </div>
                    </div>
                  </div>

                  {/* Secondary Line: Latest registered route if available */}
                  {latestResp && (
                    <div className="px-2 py-1 rounded-lg bg-blue-50/60 dark:bg-blue-950/30 border border-blue-200/60 flex items-center justify-between text-[10px]">
                      <span className="text-text-muted font-bold flex items-center gap-1 truncate">
                        <Navigation className="w-2.5 h-2.5 text-primary shrink-0" />
                        <span className="truncate">آخر حركة: <span className="text-primary font-black">{latestResp.responseType}</span></span>
                      </span>
                      <span className="text-[9px] font-mono font-bold text-primary shrink-0">
                        {driverRespList.length} {driverRespList.length === 1 ? 'رد' : 'ردود'}
                      </span>
                    </div>
                  )}

                  {/* Card Footer: Simple & Clean Actions */}
                  <div className="pt-2 border-t border-border/60 flex items-center justify-between gap-1.5 mt-auto">
                    <button 
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedDriverForDetails(driver);
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-1.5 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-xl transition-all text-xs font-black cursor-pointer active:scale-95 shadow-2xs"
                      title="عرض بطاقة وتفاصيل السائق"
                    >
                      <IdCard className="w-3.5 h-3.5" />
                      <span>عرض التفاصيل</span>
                    </button>

                    {onOpenDriverResponse && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onOpenDriverResponse(driver);
                        }}
                        className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 dark:border-emerald-800 rounded-xl transition-all text-xs font-black cursor-pointer flex items-center gap-1 shrink-0 active:scale-95"
                        title="تسجيل رد أو حركة جديدة"
                      >
                        <Navigation className="w-3.5 h-3.5" />
                        <span>رد</span>
                      </button>
                    )}

                    {isAdmin && onEdit && (
                      <button 
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEdit(driver);
                        }}
                        className="p-1.5 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:text-primary border border-border hover:border-primary/40 rounded-xl transition-all cursor-pointer active:scale-95"
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
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 rounded-xl transition-colors cursor-pointer active:scale-95"
                        title="حذف السائق"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
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
