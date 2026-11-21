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
  ListFilter,
  Printer,
  GraduationCap,
  RotateCcw,
  Lock,
  ChevronDown,
  MoreHorizontal,
  ArrowUpDown,
  Table2
} from 'lucide-react';
import type { CompanyDriver, DriverType, DriverStatus, DriverResponse, Worker } from '../types';
import { resolveDriverType, getDriverClassification, isDriverActiveInMonitoring, isDriverEndedInMonitoring, getMatchingActiveMonitoringWorker, getMatchingWorkerByIqama } from '../lib/driverUtils';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { CompanyDriverDetailsModal } from './CompanyDriverDetailsModal';
import { DriverResponseLinkModal } from './DriverResponseLinkModal';
import { DriverCardPrintModal } from './DriverCardPrintModal';
import { downloadCompanyDriversTemplate, exportDriverResponsesToExcel } from '../lib/excelService';
import { CompanyDriversSkeleton, useDelayedLoading } from './Skeleton';
import { EmptyState } from './EmptyState';
import { AnimatedNumber } from './AnimatedNumber';
import { useToast } from './ToastContext';

interface CompanyDriversListProps {
  drivers: CompanyDriver[];
  workers?: Worker[];
  isAdmin: boolean;
  isLoading?: boolean;
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
  onSyncWithMonitoring?: () => Promise<void> | void;
}

export const CompanyDriversList: React.FC<CompanyDriversListProps> = ({
  drivers,
  workers = [],
  isAdmin,
  isLoading = false,
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
  onExport,
  onSyncWithMonitoring
}) => {
  const showSkeleton = useDelayedLoading(isLoading, 200);
  const { showToast } = useToast();
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
  const [isPrintCardModalOpen, setIsPrintCardModalOpen] = useState(false);
  const [cardModalInitialDriver, setCardModalInitialDriver] = useState<CompanyDriver | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'compact'>('compact');
  const [sortBy, setSortBy] = useState<'default' | 'name_asc' | 'name_desc' | 'expiry_asc'>('default');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isMoreMenuOpen, setIsMoreMenuOpen] = useState(false);
  const [openActionMenuId, setOpenActionMenuId] = useState<string | null>(null);
  const [isSyncingMonitoring, setIsSyncingMonitoring] = useState(false);
  const itemsPerPage = 36;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const moreMenuRef = useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target as Node)) {
        setIsMoreMenuOpen(false);
      }
      const target = event.target as HTMLElement;
      if (!target.closest('[data-driver-action-menu]')) {
        setOpenActionMenuId(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

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
    ids?: string[];
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
    if (fieldKey.startsWith('iqama')) {
      showToast({ message: 'تم نسخ رقم الإقامة' });
    }
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

  // Metrics (يستثنى منها تماماً أي سائق مصنف خروج نهائي)
  const stats = useMemo(() => {
    const isFinal = (d: CompanyDriver) => d.driverClassification === 'خروج نهائي' || d.status === 'خروج نهائي' || d.status === 'مستبعد';
    const operationalDrivers = drivers.filter(d => !isFinal(d) && getDriverClassification(d, workers) !== 'خروج نهائي');
    const total = operationalDrivers.length;
    // Driver Type: Iqama -> 'مقيم', Border -> 'موسمي'
    const resident = operationalDrivers.filter(d => resolveDriverType(d) === 'مقيم').length;
    const seasonal = operationalDrivers.filter(d => resolveDriverType(d) === 'موسمي').length;
    const temporary = operationalDrivers.filter(d => resolveDriverType(d) === 'مؤقت').length;
    
    // Status metrics (default to 'نشط' if not explicitly set)
    const active = operationalDrivers.filter(d => !d.status || d.status === 'نشط').length;
    const onLeave = operationalDrivers.filter(d => d.status === 'في إجازة').length;
    const finalExit = drivers.filter(d => isFinal(d)).length;

    // Driver Classification: نقل عمال / النقل المدرسي / عمرة / النقل الدولي سوريا / النقل الدولي اليمن
    const laborTransport = operationalDrivers.filter(d => getDriverClassification(d, workers) === 'نقل عمال').length;
    const schoolTransport = operationalDrivers.filter(d => getDriverClassification(d, workers) === 'النقل المدرسي').length;
    const umrah = operationalDrivers.filter(d => getDriverClassification(d, workers) === 'عمرة').length;
    const intlSyria = operationalDrivers.filter(d => getDriverClassification(d, workers) === 'النقل الدولي سوريا').length;
    const intlYemen = operationalDrivers.filter(d => getDriverClassification(d, workers) === 'النقل الدولي اليمن').length;

    // Active in Monitoring count (الرقابة والمتابعة - غير منتهي عمله)
    const activeInMonitoring = operationalDrivers.filter(d => isDriverActiveInMonitoring(d, workers)).length;

    const uniqueNationalities = Array.from(new Set(operationalDrivers.map(d => d.nationality).filter(Boolean))).length;

    return { total, resident, temporary, seasonal, active, onLeave, finalExit, excluded: finalExit, laborTransport, schoolTransport, umrah, intlSyria, intlYemen, activeInMonitoring, uniqueNationalities };
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

      const isDriverFinal = driver.driverClassification === 'خروج نهائي' || driver.status === 'خروج نهائي' || driver.status === 'مستبعد';
      const matchesType = selectedType === 'all' || effectiveType === selectedType;
      const driverCurrentStatus = isDriverFinal ? 'خروج نهائي' : (driver.status || 'نشط');
      const matchesStatus = selectedStatus === 'all' || 
        (selectedStatus === 'خروج نهائي' ? isDriverFinal : driverCurrentStatus === selectedStatus);
      const matchesNationality = !selectedNationality || driver.nationality === selectedNationality;
      const matchesClassification = !selectedClassification || 
        (selectedClassification === 'خروج نهائي' ? isDriverFinal : classification === selectedClassification);

      return matchesSearch && matchesType && matchesStatus && matchesNationality && matchesClassification;
    });
  }, [drivers, workers, searchTerm, selectedType, selectedStatus, selectedNationality, selectedClassification]);

  // Filtered stats for live driver count display
  const filteredStats = useMemo(() => {
    let resident = 0;
    let seasonal = 0;
    let temporary = 0;
    let active = 0;
    let finalExitCount = 0;

    filteredDrivers.forEach(d => {
      const isFinalExit = getDriverClassification(d, workers) === 'خروج نهائي';
      if (isFinalExit) {
        finalExitCount++;
        return;
      }

      const type = resolveDriverType(d);
      if (type === 'مقيم') resident++;
      else if (type === 'موسمي') seasonal++;
      else temporary++;

      if (!d.status || d.status === 'نشط') active++;
    });

    const isFiltered = Boolean(
      selectedStatus !== 'all' || 
      selectedNationality || 
      selectedType !== 'all' || 
      selectedClassification || 
      searchTerm.trim()
    );

    const operationalCount = selectedClassification === 'خروج نهائي'
      ? finalExitCount
      : filteredDrivers.filter(d => getDriverClassification(d, workers) !== 'خروج نهائي').length;

    const baseTotal = stats.total > 0 ? stats.total : 1;
    const percentage = Math.round((operationalCount / baseTotal) * 100);

    return {
      count: operationalCount,
      resident,
      seasonal,
      temporary,
      active,
      isFiltered,
      percentage: Math.min(percentage, 100)
    };
  }, [filteredDrivers, stats.total, workers, selectedStatus, selectedNationality, selectedType, selectedClassification, searchTerm]);

  // Helper to get iqama/contract expiry date and urgency
  const getDriverExpiryInfo = React.useCallback((driver: CompanyDriver) => {
    const matchedWorker = getMatchingWorkerByIqama(driver, workers);
    const rawDate = String((driver as any).iqamaExpiryDate || (driver as any).endDate || matchedWorker?.endDate || '').trim();
    if (!rawDate) {
      return { dateStr: '', daysRemaining: null as number | null, urgency: 'none' as const };
    }
    const parsed = new Date(rawDate);
    if (isNaN(parsed.getTime())) {
      return { dateStr: rawDate, daysRemaining: null as number | null, urgency: 'none' as const };
    }
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
  }, [workers]);

  // Sorted drivers
  const sortedDrivers = useMemo(() => {
    if (sortBy === 'default') return filteredDrivers;
    const list = [...filteredDrivers];
    if (sortBy === 'name_asc') {
      list.sort((a, b) => (a.fullName || '').localeCompare(b.fullName || '', 'ar'));
    } else if (sortBy === 'name_desc') {
      list.sort((a, b) => (b.fullName || '').localeCompare(a.fullName || '', 'ar'));
    } else if (sortBy === 'expiry_asc') {
      list.sort((a, b) => {
        const expA = getDriverExpiryInfo(a);
        const expB = getDriverExpiryInfo(b);
        if (expA.daysRemaining === null && expB.daysRemaining === null) return 0;
        if (expA.daysRemaining === null) return 1;
        if (expB.daysRemaining === null) return -1;
        return expA.daysRemaining - expB.daysRemaining;
      });
    }
    return list;
  }, [filteredDrivers, sortBy, getDriverExpiryInfo]);

  // Reset page when filtering or sorting
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedType, selectedStatus, selectedNationality, selectedClassification, sortBy]);

  const totalPages = Math.ceil(sortedDrivers.length / itemsPerPage);

  const paginatedDrivers = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedDrivers.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedDrivers, currentPage]);

  const isAllPageSelected = paginatedDrivers.length > 0 && paginatedDrivers.every(d => selectedIds.includes(d.id));

  const toggleSelectDriver = (id: string) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]);
  };

  const toggleSelectPage = () => {
    const pageIds = paginatedDrivers.map(d => d.id);
    if (isAllPageSelected) {
      setSelectedIds(prev => prev.filter(id => !pageIds.includes(id)));
    } else {
      setSelectedIds(prev => Array.from(new Set([...prev, ...pageIds])));
    }
  };

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
      case 'خروج نهائي':
      case 'مستبعد':
        return {
          label: 'خروج نهائي',
          icon: <Lock className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" />,
          color: '#f43f5e',
          className: 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800',
          dotColor: 'bg-rose-500',
          accentBorder: 'border-rose-500'
        };
    }
  };

  if (showSkeleton) {
    return <CompanyDriversSkeleton />;
  }

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

        {/* Global Actions: Only "إضافة سائق" visible + "المزيد" dropdown */}
        <div className="flex flex-wrap items-center gap-2 relative">
          {/* Hidden file input kept mounted for import action inside More menu */}
          {isAdmin && onImport && (
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={onImport} 
              className="hidden" 
              accept=".xlsx, .xls, .csv" 
            />
          )}

          {/* More Actions Dropdown */}
          <div className="relative" ref={moreMenuRef}>
            <button
              type="button"
              onClick={() => setIsMoreMenuOpen(prev => !prev)}
              className="flex items-center gap-2 px-3.5 py-2 bg-surface border border-border text-slate-900 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors shadow-xs cursor-pointer"
            >
              <span>المزيد</span>
              <ChevronDown className={`w-4 h-4 text-text-muted transition-transform duration-150 ${isMoreMenuOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
              {isMoreMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.14 }}
                  className="absolute left-0 md:left-0 mt-2 w-64 bg-surface border border-border rounded-2xl shadow-xl z-50 p-1.5 flex flex-col gap-1"
                >
                  {isAdmin && onImport && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-right cursor-pointer"
                    >
                      <Upload className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>استيراد Excel</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      onExport(sortedDrivers);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-right cursor-pointer"
                  >
                    <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>تصدير Excel</span>
                  </button>

                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        downloadCompanyDriversTemplate();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-right cursor-pointer"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-primary shrink-0" />
                      <span>تحميل النموذج</span>
                    </button>
                  )}

                  <div className="my-0.5 border-t border-border/60" />

                  {onOpenDriverResponse && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsMoreMenuOpen(false);
                        onOpenDriverResponse();
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-right cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>رد سريع</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      exportDriverResponsesToExcel(driverResponses, 'ردود_وحركات_السائقين.xlsx', drivers);
                    }}
                    className="w-full flex items-center justify-between px-3 py-2 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors text-right cursor-pointer"
                  >
                    <span className="flex items-center gap-2.5">
                      <Download className="w-4 h-4 text-emerald-600 shrink-0" />
                      <span>تصدير الردود Excel</span>
                    </span>
                    {driverResponses.length > 0 && (
                      <span className="px-1.5 py-0.2 bg-emerald-600 text-white text-[10px] rounded-full font-mono font-bold">
                        {driverResponses.length}
                      </span>
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      if (onOpenPublicResponsePage) {
                        onOpenPublicResponsePage();
                      } else {
                        window.location.search = '?action=driver-response';
                      }
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 rounded-xl transition-colors text-right cursor-pointer"
                  >
                    <Navigation className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>رابط التسجيل وتسجيل الرد</span>
                  </button>

                  <div className="my-0.5 border-t border-border/60" />

                  <button
                    type="button"
                    onClick={() => {
                      setIsMoreMenuOpen(false);
                      setCardModalInitialDriver(null);
                      setIsPrintCardModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 rounded-xl transition-colors text-right cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-indigo-600 shrink-0" />
                    <span>طباعة بطاقة السائق</span>
                  </button>

                  {isAdmin && onSyncWithMonitoring && (
                    <button
                      type="button"
                      disabled={isSyncingMonitoring}
                      onClick={async () => {
                        setIsMoreMenuOpen(false);
                        try {
                          setIsSyncingMonitoring(true);
                          await onSyncWithMonitoring();
                        } finally {
                          setIsSyncingMonitoring(false);
                        }
                      }}
                      className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-bold text-teal-700 dark:text-teal-300 hover:bg-teal-50 dark:hover:bg-teal-950/40 rounded-xl transition-colors text-right cursor-pointer disabled:opacity-50"
                    >
                      <RefreshCw className={`w-4 h-4 text-teal-600 shrink-0 ${isSyncingMonitoring ? 'animate-spin' : ''}`} />
                      <span>{isSyncingMonitoring ? 'جارٍ التحديث...' : 'تحديث من الرقابة والمتابعة'}</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {isAdmin && onAdd && (
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all shadow-sm shadow-primary/20 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة سائق</span>
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
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            <AnimatedNumber value={stats.total} />
          </div>
          <span className="text-[10px] text-text-muted mt-1 block leading-tight">
            {stats.finalExit > 0
              ? `يشمل النشط والإجازة فقط • يستثني ${stats.finalExit} خروج نهائي (الإجمالي ${drivers.length})`
              : `يشمل النشطين وفي إجازة (${drivers.length} مسجل)`}
          </span>
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
          <div className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
            <AnimatedNumber value={stats.active} />
          </div>
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
          <div className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">
            <AnimatedNumber value={stats.onLeave} />
          </div>
          <span className="text-[10px] text-text-muted mt-1 block">إجازة دورية / سنوية</span>
        </div>

        <div 
          onClick={() => setSelectedStatus(selectedStatus === 'خروج نهائي' ? 'all' : 'خروج نهائي')}
          className={`p-3.5 bg-surface rounded-2xl border transition-all cursor-pointer ${
            selectedStatus === 'خروج نهائي' 
              ? 'border-rose-500 ring-2 ring-rose-500/20 shadow-md' 
              : 'border-border hover:border-slate-300 dark:hover:border-slate-700 shadow-xs'
          }`}
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400">خروج نهائي</span>
            <div className="w-7 h-7 rounded-lg bg-rose-50 dark:bg-rose-900/30 text-rose-600 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
            <AnimatedNumber value={stats.finalExit} />
          </div>
          <span className="text-[10px] text-text-muted mt-1 block">سجلات مقفلة</span>
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
          <div className="text-xl font-black text-slate-900 dark:text-white font-mono">
            <AnimatedNumber value={stats.resident} />
          </div>
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
          <div className="text-xl font-black text-purple-600 dark:text-purple-400 font-mono">
            <AnimatedNumber value={stats.temporary + stats.seasonal} />
          </div>
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

            {/* Sort Dropdown */}
            <div className="relative flex items-center shrink-0">
              <ArrowUpDown className="w-3.5 h-3.5 text-text-muted absolute right-2.5 pointer-events-none" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="pr-8 pl-3 py-2 bg-background border border-border focus:border-primary rounded-lg outline-none text-xs font-bold text-text-main shadow-2xs cursor-pointer"
                title="فرز السائقين"
              >
                <option value="default">فرز: الافتراضي</option>
                <option value="name_asc">الاسم (أ - ي)</option>
                <option value="name_desc">الاسم (ي - أ)</option>
                <option value="expiry_asc">أقرب انتهاء إقامة</option>
              </select>
            </div>

            {/* View Mode Toggle (Compact Table / Grid) */}
            <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 border border-border rounded-lg p-0.5 shrink-0 shadow-2xs">
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`px-2.5 py-1.5 rounded-md transition-all cursor-pointer flex items-center gap-1.5 text-xs ${
                  viewMode === 'compact' 
                    ? 'bg-surface text-primary shadow-xs font-black border border-border/80' 
                    : 'text-text-muted hover:text-slate-900 dark:hover:text-white'
                }`}
                title="عرض جدول مدمج"
              >
                <Table2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">مدمج</span>
              </button>
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
                    { id: 'all', label: 'كافة الحالات', count: stats.total },
                    { id: 'نشط', label: 'نشط', count: stats.active, colorClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300' },
                    { id: 'في إجازة', label: 'في إجازة', count: stats.onLeave, colorClass: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-300' },
                    { id: 'خروج نهائي', label: 'خروج نهائي', count: stats.finalExit, colorClass: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-300' },
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

              {/* Dropdowns & Driver Count Tab & Reset */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-end">
                {/* 1. تصفية حسب الجنسية */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted mr-1">تصفية حسب الجنسية</label>
                  <select 
                    value={selectedNationality}
                    onChange={(e) => setSelectedNationality(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-sm shadow-sm font-medium"
                  >
                    <option value="">كافة الجنسيات</option>
                    {nationalities.map(n => <option key={n} value={n}>{n}</option>)}
                  </select>
                </div>

                {/* 2. تصنيف السائق (نوع العمل) */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted mr-1">تصنيف السائق (نوع العمل)</label>
                  <select 
                    value={selectedClassification}
                    onChange={(e) => setSelectedClassification(e.target.value)}
                    className="w-full p-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-sm shadow-sm font-medium"
                  >
                    <option value="">كافة التصنيفات (النشطة)</option>
                    <option value="نقل عمال">🚌 نقل عمال ({stats.laborTransport})</option>
                    <option value="النقل المدرسي">🏫 النقل المدرسي ({stats.schoolTransport})</option>
                    <option value="عمرة">🕌 عمرة ({stats.umrah})</option>
                    <option value="النقل الدولي سوريا">🌍 النقل الدولي سوريا ({stats.intlSyria})</option>
                    <option value="النقل الدولي اليمن">🌍 النقل الدولي اليمن ({stats.intlYemen})</option>
                    <option value="خروج نهائي">🚫 خروج نهائي ({stats.finalExit})</option>
                  </select>
                </div>

                {/* 3. تبويب عدد السائقين عند الفلترة */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] font-bold text-text-muted mr-1">
                    <span className="flex items-center gap-1">
                      <Users className="w-3.5 h-3.5 text-primary" />
                      <span>عدد السائقين (المطابقين):</span>
                    </span>
                    {filteredStats.isFiltered && (
                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/50 px-1.5 py-0.2 rounded-full border border-emerald-200 dark:border-emerald-800">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        مفلتر ({filteredStats.percentage}%)
                      </span>
                    )}
                  </div>
                  <div 
                    className={`h-[38px] px-3 rounded-lg border flex items-center justify-between transition-all ${
                      filteredStats.isFiltered
                        ? 'bg-primary/5 dark:bg-primary/15 border-primary/50 ring-1 ring-primary/20 shadow-xs'
                        : 'bg-background border-border shadow-xs'
                    }`}
                  >
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-xl font-black text-primary font-mono leading-none">
                        {filteredStats.count}
                      </span>
                      <span className="text-[11px] text-text-muted font-bold">
                        من {drivers.length}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        مقيم: {filteredStats.resident}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold">
                        موسمي: {filteredStats.seasonal}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 4. زر إعادة ضبط الفلاتر أو مؤشر الحالة */}
                <div className="space-y-1">
                  <div className="text-[11px] font-bold text-text-muted mr-1 invisible">
                    إجراء
                  </div>
                  {filteredStats.isFiltered ? (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedStatus('all');
                        setSelectedNationality('');
                        setSelectedType('all');
                        setSelectedClassification('');
                        setSearchTerm('');
                      }}
                      className="h-[38px] w-full px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-xs active:scale-[0.98]"
                      title="إلغاء التصفية وإظهار كافة السائقين"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>إعادة ضبط جميع الفلاتر</span>
                    </button>
                  ) : (
                    <div className="h-[38px] px-3 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-border rounded-lg flex items-center justify-center gap-1.5 text-xs text-text-muted font-medium">
                      <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      <span>كامل الأسطول ظاهر ({drivers.length})</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bulk Selection Bar */}
      <AnimatePresence>
        {selectedIds.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="bg-primary/5 dark:bg-primary/15 border border-primary/30 rounded-2xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 shadow-xs"
          >
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5 text-xs font-black text-primary">
                <CheckCircle2 className="w-4 h-4" />
                <span>تم تحديد {selectedIds.length} سائق</span>
              </span>
              {selectedIds.length < sortedDrivers.length && (
                <button
                  type="button"
                  onClick={() => setSelectedIds(sortedDrivers.map(d => d.id))}
                  className="text-[11px] font-bold text-primary hover:underline cursor-pointer"
                >
                  تحديد الكل ({sortedDrivers.length})
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onExport(drivers.filter(d => selectedIds.includes(d.id)))}
                className="px-3 py-1.5 bg-surface border border-border hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-text-main flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-600" />
                <span>تصدير المحدد</span>
              </button>
              {isAdmin && onDelete && (
                <button
                  type="button"
                  onClick={() => setDeleteModal({
                    isOpen: true,
                    id: null,
                    ids: selectedIds,
                    name: `${selectedIds.length} سائق`,
                    isAll: false
                  })}
                  className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>حذف المحدد</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setSelectedIds([])}
                className="px-2.5 py-1.5 text-xs font-bold text-text-muted hover:text-text-main cursor-pointer"
              >
                إلغاء التحديد
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Drivers Table (Compact Default) or Grid Cards */}
      {paginatedDrivers.length > 0 ? (
        viewMode === 'compact' ? (
          <div className="bg-surface rounded-2xl border border-border shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right border-collapse">
                <thead>
                  <tr className="bg-slate-50/90 dark:bg-slate-900/60 border-b border-border text-[11px] font-black text-text-muted">
                    <th className="py-3 px-3 w-10 text-center">
                      <input
                        type="checkbox"
                        checked={isAllPageSelected}
                        onChange={toggleSelectPage}
                        className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                        title="تحديد الكل في هذه الصفحة"
                      />
                    </th>
                    <th className="py-3 px-3 whitespace-nowrap">الاسم</th>
                    <th className="py-3 px-3 whitespace-nowrap">المسار</th>
                    <th className="py-3 px-3 whitespace-nowrap">الجنسية</th>
                    <th className="py-3 px-3 whitespace-nowrap">الجوال</th>
                    <th className="py-3 px-3 whitespace-nowrap">رقم الإقامة</th>
                    <th className="py-3 px-3 whitespace-nowrap">تاريخ انتهاء الإقامة</th>
                    <th className="py-3 px-3 whitespace-nowrap">الحافلة</th>
                    <th className="py-3 px-3 whitespace-nowrap">الحالة</th>
                    <th className="py-3 px-3 whitespace-nowrap text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60 text-xs">
                  {paginatedDrivers.map((driver) => {
                    const effectiveType = resolveDriverType(driver);
                    const statusBadge = getStatusBadge(driver.status);
                    const classification = getDriverClassification(driver, workers);
                    const isFinalExit = classification === 'خروج نهائي' || driver.status === 'خروج نهائي' || driver.status === 'مستبعد';
                    const cleanPhone = cleanSaudiPhone(driver.mobileNumber);
                    const expiryInfo = getDriverExpiryInfo(driver);
                    const driverRespList = driverResponses.filter(
                      r => r.driverId === driver.id || (driver.serialNumber && r.driverSerialNumber === driver.serialNumber)
                    );
                    const latestResp = driverRespList.length > 0 ? driverRespList[0] : null;
                    const hasIqama = Boolean(driver.iqamaNumber && driver.iqamaNumber.trim());
                    const hasBorder = Boolean(driver.borderNumber && driver.borderNumber.trim());
                    const primaryIdValue = hasIqama
                      ? driver.iqamaNumber.trim()
                      : (hasBorder ? driver.borderNumber.trim() : '');
                    const isSeasonalWithoutBorder = effectiveType === 'موسمي' && !hasBorder;
                    const isSelected = selectedIds.includes(driver.id);

                    // Exception-only status badges (hide نشط and مقيم)
                    const showStatusException = isFinalExit || driver.status === 'في إجازة';
                    const showTypeException = effectiveType === 'موسمي' || effectiveType === 'مؤقت';

                    return (
                      <tr
                        key={driver.id}
                        onClick={() => setSelectedDriverForDetails(driver)}
                        className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors cursor-pointer ${
                          isSelected ? 'bg-primary/5 dark:bg-primary/10' : ''
                        }`}
                      >
                        {/* 1. Multi-select Checkbox */}
                        <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleSelectDriver(driver.id)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary"
                          />
                        </td>

                        {/* 2. الاسم */}
                        <td className="py-2.5 px-3">
                          <div className="font-black text-slate-900 dark:text-white leading-snug min-w-[160px]">
                            {driver.fullName}
                          </div>
                          {isFinalExit && (driver.finalExitReason || driver.statusReason) && (
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold block mt-0.5">
                              السبب: {driver.finalExitReason || driver.statusReason}
                            </span>
                          )}
                        </td>

                        {/* 3. المسار */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <div className="flex flex-col items-start gap-0.5">
                            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[10px] font-bold ${
                              classification === 'خروج نهائي'
                                ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800'
                                : classification === 'عمرة'
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                : classification === 'النقل الدولي سوريا'
                                ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                                : classification === 'النقل الدولي اليمن'
                                ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                                : classification === 'النقل المدرسي'
                                ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                            }`}>
                              <span>{classification}</span>
                            </span>
                            {latestResp && (
                              <span className="text-[10px] text-primary font-bold">
                                آخر حركة: {latestResp.responseType}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* 4. الجنسية */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-slate-700 dark:text-slate-300 font-bold">
                          {driver.nationality || '—'}
                        </td>

                        {/* 5. الجوال */}
                        <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {driver.mobileNumber && driver.mobileNumber.trim() ? (
                            <div className="flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 dark:text-white" dir="ltr">
                                {driver.mobileNumber}
                              </span>
                              {cleanPhone && (
                                <a
                                  href={`https://wa.me/${cleanPhone}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="p-0.5 text-emerald-600 hover:text-emerald-700"
                                  title="واتساب"
                                >
                                  <MessageCircle className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <a
                                href={`tel:${driver.mobileNumber}`}
                                className="p-0.5 text-emerald-600 hover:text-emerald-700"
                                title="اتصال"
                              >
                                <PhoneCall className="w-3.5 h-3.5" />
                              </a>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-amber-600 dark:text-amber-400 font-black text-[11px]">غير مسجل</span>
                              {isAdmin && onEdit && !isFinalExit && (
                                <button
                                  type="button"
                                  onClick={() => onEdit(driver)}
                                  className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md text-[10px] font-black cursor-pointer"
                                >
                                  أضف
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 6. رقم الإقامة (أو رقم الحدود عند الموسمية) */}
                        <td className="py-2.5 px-3 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {primaryIdValue && !isSeasonalWithoutBorder ? (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="font-mono font-bold text-slate-900 dark:text-white">
                                {primaryIdValue}
                              </span>
                              {!hasIqama && hasBorder && (
                                <span className="text-[9px] px-1 py-0.2 rounded bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 font-bold">
                                  حدود
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => copyToClipboard(primaryIdValue, hasIqama ? `iqama-${driver.id}` : `id-${driver.id}`)}
                                className="text-text-muted hover:text-primary p-0.5 cursor-pointer"
                                title="نسخ الرقم"
                              >
                                {copiedField === (hasIqama ? `iqama-${driver.id}` : `id-${driver.id}`) ? (
                                  <Check className="w-3 h-3 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center gap-1.5">
                              <span className="text-amber-600 dark:text-amber-400 font-black text-[11px]">غير مسجل</span>
                              {isAdmin && onEdit && !isFinalExit && (
                                <button
                                  type="button"
                                  onClick={() => onEdit(driver)}
                                  className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded-md text-[10px] font-black cursor-pointer"
                                >
                                  أضف
                                </button>
                              )}
                            </div>
                          )}
                        </td>

                        {/* 7. تاريخ انتهاء الإقامة (برتقالي/أحمر عند القرب) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {expiryInfo.dateStr ? (
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono text-[11px] font-bold border ${
                                expiryInfo.urgency === 'expired' || expiryInfo.urgency === 'critical'
                                  ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                                  : expiryInfo.urgency === 'soon'
                                  ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                                  : 'bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-300 border-border'
                              }`}
                              title={
                                expiryInfo.daysRemaining !== null
                                  ? expiryInfo.daysRemaining < 0
                                    ? `منتهي منذ ${Math.abs(expiryInfo.daysRemaining)} يوم`
                                    : `متبقي ${expiryInfo.daysRemaining} يوم`
                                  : undefined
                              }
                            >
                              <span>{expiryInfo.dateStr}</span>
                              {expiryInfo.daysRemaining !== null && expiryInfo.daysRemaining < 0 && (
                                <span className="text-[9px] font-sans">(منتهي)</span>
                              )}
                              {expiryInfo.daysRemaining !== null && expiryInfo.daysRemaining >= 0 && expiryInfo.daysRemaining <= 60 && (
                                <span className="text-[9px] font-sans">({expiryInfo.daysRemaining}ي)</span>
                              )}
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>

                        {/* 8. الحافلة */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {driver.busNumber ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border border-border font-mono font-bold text-[11px]">
                              <Bus className="w-3 h-3 text-sky-600" />
                              <span>{driver.busNumber}</span>
                            </span>
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>

                        {/* 9. الحالة (استثناء فقط: موسمي، إجازة، خروج نهائي) */}
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          {showStatusException || showTypeException ? (
                            <div className="flex flex-wrap items-center gap-1">
                              {showTypeException && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${getTypeBadge(effectiveType).className}`}>
                                  <span>{getTypeBadge(effectiveType).label}</span>
                                </span>
                              )}
                              {showStatusException && (
                                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${statusBadge.className}`}>
                                  <span>{statusBadge.label}</span>
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-300 dark:text-slate-600">—</span>
                          )}
                        </td>

                        {/* 10. إجراءات: عرض التفاصيل + رد + قائمة ⋯ */}
                        <td className="py-2.5 px-3 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="inline-flex items-center justify-center gap-1.5 relative">
                            <button
                              type="button"
                              onClick={() => setSelectedDriverForDetails(driver)}
                              className="px-2.5 py-1 bg-primary/10 hover:bg-primary text-primary hover:text-white rounded-lg text-[11px] font-black transition-colors cursor-pointer"
                            >
                              عرض التفاصيل
                            </button>

                            {isFinalExit ? (
                              <span
                                className="px-2 py-1 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-lg text-[11px] font-bold inline-flex items-center gap-1 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                                title="لا يمكن تسجيل رد لسائق مصنف خروج نهائي"
                              >
                                <Lock className="w-3 h-3" />
                                <span>مقفل</span>
                              </span>
                            ) : onOpenDriverResponse && (
                              <button
                                type="button"
                                onClick={() => onOpenDriverResponse(driver)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-600 text-emerald-700 hover:text-white border border-emerald-200 dark:border-emerald-800 rounded-lg text-[11px] font-black transition-colors cursor-pointer"
                              >
                                رد
                              </button>
                            )}

                            <div className="relative" data-driver-action-menu>
                              <button
                                type="button"
                                onClick={() => setOpenActionMenuId(openActionMenuId === driver.id ? null : driver.id)}
                                className="p-1.5 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 border border-border rounded-lg transition-colors cursor-pointer"
                                title="خيارات إضافية"
                              >
                                <MoreHorizontal className="w-3.5 h-3.5" />
                              </button>

                              {openActionMenuId === driver.id && (
                                <div className="absolute left-0 mt-1 w-40 bg-surface border border-border rounded-xl shadow-xl z-40 p-1 flex flex-col gap-0.5 text-right">
                                  {isAdmin && onEdit && (
                                    isFinalExit ? (
                                      <span className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold text-slate-400 cursor-not-allowed">
                                        <Lock className="w-3.5 h-3.5" />
                                        <span>مقفل للتعديل</span>
                                      </span>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setOpenActionMenuId(null);
                                          onEdit(driver);
                                        }}
                                        className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                      >
                                        <Edit className="w-3.5 h-3.5 text-primary" />
                                        <span>تعديل</span>
                                      </button>
                                    )
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setOpenActionMenuId(null);
                                      setCardModalInitialDriver(driver);
                                      setIsPrintCardModalOpen(true);
                                    }}
                                    className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                  >
                                    <Printer className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>طباعة بطاقة</span>
                                  </button>

                                  {isAdmin && onDelete && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setOpenActionMenuId(null);
                                        setDeleteModal({
                                          isOpen: true,
                                          id: driver.id,
                                          name: driver.fullName,
                                          isAll: false
                                        });
                                      }}
                                      className="flex items-center gap-2 px-2.5 py-1.5 text-[11px] font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>حذف</span>
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            <AnimatePresence mode="popLayout">
              {paginatedDrivers.map((driver, index) => {
                const effectiveType = resolveDriverType(driver);
                const badge = getTypeBadge(effectiveType);
                const statusBadge = getStatusBadge(driver.status);
                const inMonitoringWorker = getMatchingActiveMonitoringWorker(driver, workers);
                const inMonitoring = Boolean(inMonitoringWorker);
                const isEndedInMonitoring = isDriverEndedInMonitoring(driver, workers);
                const classification = getDriverClassification(driver, workers);
                const isFinalExit = classification === 'خروج نهائي' || driver.status === 'خروج نهائي' || driver.status === 'مستبعد';
                const cleanPhone = cleanSaudiPhone(driver.mobileNumber);
                const expiryInfo = getDriverExpiryInfo(driver);
                const driverRespList = driverResponses.filter(
                  r => r.driverId === driver.id || (driver.serialNumber && r.driverSerialNumber === driver.serialNumber)
                );
                const latestResp = driverRespList.length > 0 ? driverRespList[0] : null;
                const isSelected = selectedIds.includes(driver.id);

                // Primary ID to display: Iqama if مقيم or available, Border if موسمي
                const primaryIdLabel = (effectiveType === 'موسمي') ? 'رقم الحدود' : 'رقم الإقامة';
                const primaryIdValue = (effectiveType === 'موسمي')
                  ? (driver.borderNumber || '').trim()
                  : ((driver.iqamaNumber || driver.borderNumber || '').trim());

                const showTypeException = effectiveType === 'موسمي' || effectiveType === 'مؤقت';
                const showStatusException = isFinalExit || driver.status === 'في إجازة';

                return (
                  <motion.div
                    key={driver.id}
                    layout
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96 }}
                    transition={{ duration: 0.15, delay: Math.min(index * 0.012, 0.2) }}
                    onClick={() => setSelectedDriverForDetails(driver)}
                    className={`group bg-surface rounded-2xl border transition-all duration-200 flex flex-col justify-between relative cursor-pointer p-3.5 gap-2.5 shadow-xs hover:shadow-lg ${
                      isSelected ? 'ring-2 ring-primary/40' : ''
                    }`}
                    style={{
                      borderColor: `${statusBadge.color}35`,
                      borderTopWidth: '3.5px',
                      borderTopColor: statusBadge.color
                    }}
                  >
                    {/* Top Bar: Checkbox + Exception-only Type/Status Badges */}
                    <div className="flex items-center justify-between gap-1.5 min-h-[22px]">
                      <div className="flex items-center gap-1.5 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectDriver(driver.id)}
                          className="w-4 h-4 rounded border-border text-primary focus:ring-primary cursor-pointer accent-primary shrink-0"
                        />
                        {showTypeException && (
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 ${badge.className}`}>
                            {badge.icon}
                            <span>{badge.label}</span>
                          </span>
                        )}
                      </div>

                      {showStatusException && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold border shrink-0 shadow-2xs ${statusBadge.className}`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dotColor}`} />
                          <span>{statusBadge.label}</span>
                        </span>
                      )}
                    </div>

                    {/* Driver Name Section */}
                    <div className="pt-0.5">
                      <h3 
                        className="text-sm sm:text-base font-black text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-snug break-words"
                        title={driver.fullName}
                      >
                        {driver.fullName}
                      </h3>

                      {/* Operational Tags (Classification, Monitoring, Bus, Nationality, Expiry) */}
                      <div className="flex flex-wrap items-center gap-1 mt-1.5 text-[10px]">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border font-bold ${
                          classification === 'خروج نهائي'
                            ? 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border-rose-300 dark:border-rose-800 shadow-2xs'
                            : classification === 'عمرة'
                            ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                            : classification === 'النقل الدولي سوريا'
                            ? 'bg-teal-50 dark:bg-teal-950/40 text-teal-800 dark:text-teal-300 border-teal-200 dark:border-teal-800'
                            : classification === 'النقل الدولي اليمن'
                            ? 'bg-purple-50 dark:bg-purple-950/40 text-purple-800 dark:text-purple-300 border-purple-200 dark:border-purple-800'
                            : classification === 'النقل المدرسي'
                            ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-900 dark:text-amber-200 border-amber-300 dark:border-amber-700 shadow-2xs'
                            : 'bg-blue-50 dark:bg-blue-950/40 text-blue-800 dark:text-blue-300 border-blue-200 dark:border-blue-800'
                        }`}>
                          {classification === 'خروج نهائي' ? (
                            <Lock className="w-2.5 h-2.5 text-rose-600" />
                          ) : classification === 'النقل المدرسي' ? (
                            <GraduationCap className="w-2.5 h-2.5 text-amber-700 dark:text-amber-300" />
                          ) : (
                            <Briefcase className="w-2.5 h-2.5" />
                          )}
                          <span>{classification}</span>
                        </span>

                        {classification === 'خروج نهائي' && (driver.finalExitReason || driver.statusReason) && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-rose-100/80 dark:bg-rose-900/50 text-rose-900 dark:text-rose-200 border border-rose-300 dark:border-rose-800 font-bold" title={`سبب الخروج: ${driver.finalExitReason || driver.statusReason}`}>
                            <span>السبب: {driver.finalExitReason || driver.statusReason}</span>
                          </span>
                        )}

                        {inMonitoring && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800 font-bold" title="نشط حالياً بنظام الرقابة والمتابعة وعمليات نقل العمال">
                            <span className="w-1.5 h-1.5 rounded-full bg-cyan-500 animate-ping" />
                            <span>بالرقابة</span>
                          </span>
                        )}

                        {isEndedInMonitoring && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border border-amber-300/60 font-bold" title="انتهى عمل السائق في الرقابة والمتابعة وصُنّف تلقائياً عمرة">
                            <Clock className="w-2.5 h-2.5 text-amber-600" />
                            <span>منتهي بالرقابة</span>
                          </span>
                        )}

                        {driver.busNumber && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-border font-mono font-bold">
                            <Bus className="w-2.5 h-2.5 text-sky-600" />
                            <span>{driver.busNumber}</span>
                          </span>
                        )}

                        {driver.nationality && (
                          <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 font-medium">
                            <Globe className="w-2.5 h-2.5" />
                            <span>{driver.nationality}</span>
                          </span>
                        )}

                        {expiryInfo.dateStr && (
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md border font-mono font-bold ${
                            expiryInfo.urgency === 'expired' || expiryInfo.urgency === 'critical'
                              ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800'
                              : expiryInfo.urgency === 'soon'
                              ? 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-border'
                          }`}>
                            <Calendar className="w-2.5 h-2.5" />
                            <span>{expiryInfo.dateStr}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Compact Info Row: Official ID + Mobile Phone */}
                    <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-border/50 text-[11px]">
                      {/* ID Container */}
                      <div className="p-1.5 px-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-border/70 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[10px] text-text-muted">
                          <span className="flex items-center gap-1 font-bold">
                            <IdCard className="w-3 h-3 text-primary" />
                            <span>{primaryIdLabel}</span>
                          </span>
                          {primaryIdValue && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                copyToClipboard(
                                  primaryIdValue,
                                  primaryIdLabel === 'رقم الإقامة' && Boolean(driver.iqamaNumber?.trim())
                                    ? `iqama-${driver.id}`
                                    : `id-${driver.id}`
                                );
                              }}
                              className="text-text-muted hover:text-primary transition-colors p-0.5 cursor-pointer"
                              title="نسخ الرقم"
                            >
                              {copiedField === (primaryIdLabel === 'رقم الإقامة' && Boolean(driver.iqamaNumber?.trim()) ? `iqama-${driver.id}` : `id-${driver.id}`) ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                          )}
                        </div>
                        {primaryIdValue ? (
                          <div className="text-xs font-mono font-black text-slate-900 dark:text-white truncate mt-0.5" title={primaryIdValue}>
                            {primaryIdValue}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">غير مسجل</span>
                            {isAdmin && onEdit && !isFinalExit && (
                              <button
                                type="button"
                                onClick={() => onEdit(driver)}
                                className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded text-[10px] font-black cursor-pointer"
                              >
                                أضف
                              </button>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Mobile Container */}
                      <div className="p-1.5 px-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/40 border border-border/70 flex flex-col justify-between">
                        <div className="flex items-center justify-between text-[10px] text-text-muted">
                          <span className="flex items-center gap-1 font-bold">
                            <Phone className="w-3 h-3 text-emerald-600" />
                            <span>الجوال</span>
                          </span>
                          {driver.mobileNumber && driver.mobileNumber.trim() && (
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
                        {driver.mobileNumber && driver.mobileNumber.trim() ? (
                          <div className="text-xs font-mono font-black text-slate-900 dark:text-white truncate mt-0.5" dir="ltr" title={driver.mobileNumber}>
                            {driver.mobileNumber}
                          </div>
                        ) : (
                          <div className="flex items-center justify-between gap-1 mt-0.5" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[11px] font-black text-amber-600 dark:text-amber-400">غير مسجل</span>
                            {isAdmin && onEdit && !isFinalExit && (
                              <button
                                type="button"
                                onClick={() => onEdit(driver)}
                                className="px-1.5 py-0.5 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-700 rounded text-[10px] font-black cursor-pointer"
                              >
                                أضف
                              </button>
                            )}
                          </div>
                        )}
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

                    {/* Card Footer: عرض التفاصيل + رد + قائمة ⋯ */}
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

                      {isFinalExit ? (
                        <span 
                          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-400 rounded-xl text-xs font-bold flex items-center gap-1 cursor-not-allowed border border-slate-200 dark:border-slate-700"
                          title="لا يمكن تسجيل رد لسائق مصنف خروج نهائي"
                        >
                          <Lock className="w-3.5 h-3.5" />
                          <span>مقفل</span>
                        </span>
                      ) : onOpenDriverResponse && (
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

                      <div className="relative" data-driver-action-menu onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setOpenActionMenuId(openActionMenuId === driver.id ? null : driver.id)}
                          className="p-1.5 bg-surface hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 border border-border rounded-xl transition-all cursor-pointer active:scale-95"
                          title="المزيد من الإجراءات"
                        >
                          <MoreHorizontal className="w-4 h-4" />
                        </button>

                        {openActionMenuId === driver.id && (
                          <div className="absolute left-0 bottom-full mb-1.5 w-40 bg-surface border border-border rounded-xl shadow-xl z-40 p-1 flex flex-col gap-0.5 text-right">
                            {isAdmin && onEdit && (
                              isFinalExit ? (
                                <span className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-slate-400 cursor-not-allowed">
                                  <Lock className="w-3.5 h-3.5" />
                                  <span>مقفل للتعديل</span>
                                </span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionMenuId(null);
                                    onEdit(driver);
                                  }}
                                  className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                                >
                                  <Edit className="w-3.5 h-3.5 text-primary" />
                                  <span>تعديل</span>
                                </button>
                              )
                            )}

                            <button
                              type="button"
                              onClick={() => {
                                setOpenActionMenuId(null);
                                setCardModalInitialDriver(driver);
                                setIsPrintCardModalOpen(true);
                              }}
                              className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-slate-800 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                            >
                              <Printer className="w-3.5 h-3.5 text-indigo-600" />
                              <span>طباعة بطاقة</span>
                            </button>

                            {isAdmin && onDelete && (
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenActionMenuId(null);
                                  setDeleteModal({
                                    isOpen: true,
                                    id: driver.id,
                                    name: driver.fullName,
                                    isAll: false
                                  });
                                }}
                                className="flex items-center gap-2 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>حذف</span>
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )
      ) : (
        /* Empty State */
        drivers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="ابدأ بإضافة أول سائق"
            description="أضف سائقي الشركة يدوياً أو استورد بياناتهم من ملف Excel."
            actionLabel={isAdmin && onAdd ? 'إضافة سائق' : undefined}
            onAction={isAdmin ? onAdd : undefined}
            secondaryActionLabel={isAdmin && onImport ? 'استيراد من Excel' : undefined}
            onSecondaryAction={isAdmin && onImport ? () => fileInputRef.current?.click() : undefined}
          />
        ) : (
          <EmptyState
            icon={Search}
            title="لا يوجد سائقون مطابقون"
            description="جرّب تغيير الفلاتر أو كلمة البحث."
            actionLabel="مسح الفلاتر"
            onAction={() => {
              setSearchTerm('');
              setSelectedType('all');
              setSelectedStatus('all');
              setSelectedNationality('');
              setSelectedClassification('');
              setSortBy('default');
            }}
          />
        )
      )}

      {/* Pagination (if applicable) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between border-t border-border pt-4 px-2">
          <span className="text-xs text-text-muted">
            عرض {paginatedDrivers.length} من أصل {sortedDrivers.length} سائق
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
            setSelectedIds([]);
          } else if (deleteModal.ids && deleteModal.ids.length > 0 && onDelete) {
            for (const targetId of deleteModal.ids) {
              await onDelete(targetId);
            }
            setSelectedIds([]);
          } else if (deleteModal.id && onDelete) {
            await onDelete(deleteModal.id);
            setSelectedIds(prev => prev.filter(id => id !== deleteModal.id));
          }
          setDeleteModal({ isOpen: false, id: null, isAll: false });
        }}
        title={
          deleteModal.isAll 
            ? "حذف جميع سائقي الشركة" 
            : (deleteModal.ids && deleteModal.ids.length > 0) 
              ? "حذف السائقين المحددين" 
              : "حذف بيانات السائق"
        }
        message={
          deleteModal.isAll 
            ? "تحذير: هل أنت متأكد من حذف جميع بيانات سائقي الشركة؟ لا يمكن التراجع عن هذا الإجراء." 
            : (deleteModal.ids && deleteModal.ids.length > 0)
              ? `هل أنت متأكد من رغبتك في حذف (${deleteModal.ids.length}) سائقاً من النظام نهائياً؟`
              : `هل أنت متأكد من رغبتك في حذف السائق (${deleteModal.name}) نهائياً من النظام؟`
        }
      />

      {/* Driver Details Modal - بطاقة السائق المتكاملة متضمنة خيارات نشط / في إجازة / مستبعد وتبويب ردود السائق */}
      <CompanyDriverDetailsModal 
        driver={activeDetailDriver}
        workers={workers}
        isOpen={!!activeDetailDriver}
        isLoading={isLoading}
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
        onPrintCard={(d) => {
          setCardModalInitialDriver(d);
          setIsPrintCardModalOpen(true);
        }}
      />

      {/* Driver Response Link & Google Sheets Integration Modal */}
      <DriverResponseLinkModal 
        isOpen={isResponseLinkModalOpen}
        onClose={() => setIsResponseLinkModalOpen(false)}
        driverResponses={driverResponses}
        drivers={drivers}
        onOpenPublicPageDirectly={onOpenPublicResponsePage}
      />

      {/* Driver Card Print Modal (Single or 6 Cards Batch with QR & Barcode) */}
      <DriverCardPrintModal 
        isOpen={isPrintCardModalOpen}
        onClose={() => {
          setIsPrintCardModalOpen(false);
          setCardModalInitialDriver(null);
        }}
        drivers={drivers}
        workers={workers}
        initialSelectedDriver={cardModalInitialDriver}
      />
    </div>
  );
};
