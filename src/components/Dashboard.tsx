import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Bus, 
  MapPin, 
  Calendar,
  Users,
  ShieldCheck,
  Wrench,
  AlertTriangle,
  Activity,
  CheckCircle2,
  Search,
  ArrowUpDown,
  ChevronDown,
  ChevronUp,
  X,
  Download,
  FileSpreadsheet,
  FileText,
  Loader2,
  PieChart as PieChartIcon,
  BarChart3,
  LayoutGrid,
  Navigation,
  Send,
  Copy,
  Check,
  ExternalLink,
  Link2,
  Shield,
  Award
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  Cell,
  PieChart,
  Pie,
  Legend,
  LabelList
} from 'recharts';
import type { Bus as BusType, Worker as WorkerType, DriverResponse, CompanyDriver } from '../types';
import { exportDashboardStatsToExcel, exportLocationModelStatsToExcel, normalizeBusLocation } from '../lib/excelService';
import { DmtcLogo } from './DmtcLogo';

interface DashboardProps {
  buses: BusType[];
  workers?: WorkerType[];
  profile: any;
  workersCount?: number;
  driverResponses?: DriverResponse[];
  companyDrivers?: CompanyDriver[];
  onOpenResponsePage?: () => void;
  onOpenAnnouncement?: () => void;
}

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#8b5cf6'];

export const Dashboard: React.FC<DashboardProps> = ({ 
  buses, 
  workers = [], 
  profile, 
  workersCount = 0,
  driverResponses = [],
  companyDrivers = [],
  onOpenResponsePage,
  onOpenAnnouncement
}) => {
  const totalBuses = buses.length;
  const [copiedResponseLink, setCopiedResponseLink] = useState(false);
  const [chartTab, setChartTab] = useState<'year' | 'brand'>('year');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  const handleExportExcel = () => {
    exportDashboardStatsToExcel(buses, workers);
    setIsExportModalOpen(false);
  };

  const handleExportLocationModels = (locFilter: string = 'all') => {
    exportLocationModelStatsToExcel(buses, workers, locFilter);
  };

  // Stats by Operational Status (متاحة، صيانة، في الخدمة)
  const assignedBusIds = React.useMemo(() => {
    return new Set(
      workers.map(w => w.assignedBusId).filter(Boolean)
    );
  }, [workers]);

  const opStatusCounts = React.useMemo(() => {
    let available = 0;
    let maintenance = 0;
    let inService = 0;

    buses.forEach(bus => {
      const isUnderMaintenance = bus.technicalStatus === 'تحت الصيانة' || bus.technicalStatus === 'متوقف';
      if (isUnderMaintenance) {
        maintenance++;
      } else if (assignedBusIds.has(bus.id)) {
        inService++;
      } else {
        available++;
      }
    });

    return { available, maintenance, inService };
  }, [buses, assignedBusIds]);

  const opStatusChartData = React.useMemo(() => [
    { name: 'متاحة للتشغيل', value: opStatusCounts.available, color: '#10b981', shortName: 'متاحة', id: 'available' },
    { name: 'في الخدمة', value: opStatusCounts.inService, color: '#6366f1', shortName: 'في الخدمة', id: 'inService' },
    { name: 'تحت الصيانة / متوقفة', value: opStatusCounts.maintenance, color: '#f43f5e', shortName: 'صيانة', id: 'maintenance' },
  ], [opStatusCounts]);

  const [activeStatusKey, setActiveStatusKey] = useState<string | null>(null);

  const statusLocationBreakdown = React.useMemo(() => {
    const breakdown: {
      available: { name: string; count: number }[];
      inService: { name: string; count: number }[];
      maintenance: { name: string; count: number }[];
    } = { available: [], inService: [], maintenance: [] };

    const avMap: { [key: string]: number } = {};
    const isMap: { [key: string]: number } = {};
    const mtMap: { [key: string]: number } = {};

    buses.forEach(bus => {
      const isUnderMaintenance = bus.technicalStatus === 'تحت الصيانة' || bus.technicalStatus === 'متوقف';
      const loc = normalizeBusLocation(bus.location);
      if (isUnderMaintenance) {
        mtMap[loc] = (mtMap[loc] || 0) + 1;
      } else if (assignedBusIds.has(bus.id)) {
        isMap[loc] = (isMap[loc] || 0) + 1;
      } else {
        avMap[loc] = (avMap[loc] || 0) + 1;
      }
    });

    breakdown.available = Object.entries(avMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    breakdown.inService = Object.entries(isMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    breakdown.maintenance = Object.entries(mtMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return breakdown;
  }, [buses, assignedBusIds]);
  
  // Stats by Location
  const locationCounts = React.useMemo(() => {
    return buses.reduce((acc: any, bus) => {
      const loc = normalizeBusLocation(bus.location);
      acc[loc] = (acc[loc] || 0) + 1;
      return acc;
    }, {});
  }, [buses]);

  const locationData = React.useMemo(() => {
    return Object.keys(locationCounts)
      .map(name => ({ name, value: locationCounts[name] }))
      .sort((a, b) => b.value - a.value);
  }, [locationCounts]);

  const topLocation = locationData[0]?.name || 'في الشركة';

  const [locSearch, setLocSearch] = useState('');
  const [locSort, setLocSort] = useState<'value' | 'name'>('value');
  const [locationViewMode, setLocationViewMode] = useState<'grid' | 'barChart' | 'pieChart'>('grid');
  const [technicalStatusViewMode, setTechnicalStatusViewMode] = useState<'donut' | 'bar'>('donut');

  const filteredLocationData = React.useMemo(() => {
    return locationData
      .filter(loc => {
        const displayName = loc.name?.trim() || 'في الشركة';
        return displayName.toLowerCase().includes(locSearch.trim().toLowerCase());
      })
      .sort((a, b) => {
        if (locSort === 'value') {
          return b.value - a.value;
        } else {
          const nameA = a.name?.trim() || 'في الشركة';
          const nameB = b.name?.trim() || 'في الشركة';
          return nameA.localeCompare(nameB, 'ar');
        }
      });
  }, [locationData, locSearch, locSort]);

  const busesInSelectedLocation = React.useMemo(() => {
    if (!selectedLocation) return [];
    const targetLoc = normalizeBusLocation(selectedLocation);
    return buses.filter(b => normalizeBusLocation(b.location) === targetLoc);
  }, [buses, selectedLocation]);

  const uniqueCategories = React.useMemo(() => {
    const cats = new Set(busesInSelectedLocation.map(b => b.category).filter(Boolean));
    return Array.from(cats);
  }, [busesInSelectedLocation]);

  const uniqueStatuses = React.useMemo(() => {
    const stats = new Set(busesInSelectedLocation.map(b => b.technicalStatus).filter(Boolean));
    return Array.from(stats);
  }, [busesInSelectedLocation]);

  const filteredBusesInSelectedLocation = React.useMemo(() => {
    return busesInSelectedLocation.filter(bus => {
      const opNum = (bus.operationalNumber || '').toLowerCase();
      const plateNum = (bus.plateNumber || '').toLowerCase();
      const category = (bus.category || '').toLowerCase();
      const manufacturer = (bus.manufacturer || '').toLowerCase();
      const searchMatch = !modalSearch || 
        opNum.includes(modalSearch.toLowerCase()) || 
        plateNum.includes(modalSearch.toLowerCase()) ||
        category.includes(modalSearch.toLowerCase()) ||
        manufacturer.includes(modalSearch.toLowerCase());
      
      const categoryMatch = !modalCategoryFilter || bus.category === modalCategoryFilter;
      const statusMatch = !modalStatusFilter || bus.technicalStatus === modalStatusFilter;
      
      return searchMatch && categoryMatch && statusMatch;
    });
  }, [busesInSelectedLocation, modalSearch, modalCategoryFilter, modalStatusFilter]);

  // Stats by Status
  const statusCounts = buses.reduce((acc: any, bus) => {
    const status = bus.technicalStatus || 'غير محدد';
    if (status.includes('ممتاز') || status.includes('جديد')) acc.excellent = (acc.excellent || 0) + 1;
    else if (status.includes('جيد')) acc.good = (acc.good || 0) + 1;
    else if (status.includes('صيانة')) acc.maintenance = (acc.maintenance || 0) + 1;
    else if (status.includes('متوقف') || status.includes('عطل')) acc.stopped = (acc.stopped || 0) + 1;
    else acc.other = (acc.other || 0) + 1;
    return acc;
  }, { excellent: 0, good: 0, maintenance: 0, stopped: 0, other: 0 });

  const statusData = [
    { name: 'حالة ممتازة', value: statusCounts.excellent, color: '#059669', icon: CheckCircle2 },
    { name: 'حالة جيدة', value: statusCounts.good, color: '#f59e0b', icon: Activity },
    { name: 'تحت الصيانة', value: statusCounts.maintenance, color: '#ef4444', icon: Wrench },
    { name: 'متوقفة حالياً', value: statusCounts.stopped, color: '#475569', icon: AlertTriangle },
  ].filter(s => s.value > 0);

  // Stats by Model Year
  const modelCounts = buses.reduce((acc: any, bus) => {
    acc[bus.model] = (acc[bus.model] || 0) + 1;
    return acc;
  }, {});
  const modelData = Object.keys(modelCounts)
    .map(year => ({ year, count: modelCounts[year] }))
    .sort((a, b) => Number(a.year) - Number(b.year));

  // Stats by Manufacturer
  const manufacturerData = React.useMemo(() => {
    const counts = buses.reduce((acc: any, bus) => {
      const brand = bus.manufacturer || 'غير محدد';
      acc[brand] = (acc[brand] || 0) + 1;
      return acc;
    }, {});
    
    return Object.keys(counts)
      .map(name => ({ name, count: counts[name] }))
      .sort((a, b) => b.count - a.count);
  }, [buses]);

  // Active and Maintenance Bus counts linked directly to live buses data
  const activeBusesCount = React.useMemo(() => {
    return buses.filter(b => {
      const status = b.technicalStatus || '';
      return !status.includes('صيانة') && !status.includes('متوقف') && !status.includes('عطل');
    }).length;
  }, [buses]);

  const maintenanceBusesCount = React.useMemo(() => {
    return buses.filter(b => {
      const status = b.technicalStatus || '';
      return status.includes('صيانة') || status.includes('متوقف') || status.includes('عطل');
    }).length;
  }, [buses]);

  // Model distribution by location state & logic
  const [modelLocationFilter, setModelLocationFilter] = useState<string>('all');

  const availableLocationsForModels = React.useMemo(() => {
    const locMap: { [key: string]: number } = {};
    buses.forEach(b => {
      const loc = normalizeBusLocation(b.location);
      locMap[loc] = (locMap[loc] || 0) + 1;
    });
    return Object.entries(locMap)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
  }, [buses]);

  const modelsInSelectedLocation = React.useMemo(() => {
    const targetBuses = modelLocationFilter === 'all'
      ? buses
      : buses.filter(b => {
          const loc = normalizeBusLocation(b.location);
          return loc === normalizeBusLocation(modelLocationFilter);
        });

    const modelMap: { [key: string]: number } = {};
    targetBuses.forEach(b => {
      const m = (b.model || '').trim() || 'غير محدد';
      modelMap[m] = (modelMap[m] || 0) + 1;
    });

    const totalInFilter = targetBuses.length;

    const list = Object.entries(modelMap).map(([model, count]) => {
      const percentage = totalInFilter > 0 ? (count / totalInFilter) * 100 : 0;
      const numValue = parseInt(model, 10);
      const isNumeric = !isNaN(numValue) && numValue > 1900;
      const matchingBuses = targetBuses.filter(b => ((b.model || '').trim() || 'غير محدد') === model);
      const categories = Array.from(new Set(matchingBuses.map(b => (b.category || '').trim()).filter(Boolean)));
      return {
        model,
        count,
        percentage,
        isNumeric,
        numValue: isNumeric ? numValue : 0,
        categories
      };
    });

    // Sort: newest years first, or highest count if non-numeric
    list.sort((a, b) => {
      if (a.isNumeric && b.isNumeric) return b.numValue - a.numValue;
      if (a.isNumeric) return -1;
      if (b.isNumeric) return 1;
      return b.count - a.count;
    });

    return {
      total: totalInFilter,
      models: list,
      selectedLocationName: modelLocationFilter === 'all' ? 'جميع المواقع' : normalizeBusLocation(modelLocationFilter)
    };
  }, [buses, modelLocationFilter]);

  // Model and fleet age stats
  const fleetAgeStats = React.useMemo(() => {
    if (buses.length === 0) {
      return { avgAge: 0, mostCommonBrand: 'غير محدد', newest: 'غير محدد', oldest: 'غير محدد', avgYear: 0 };
    }
    
    const currentYear = new Date().getFullYear();
    const years = buses
      .map(b => parseInt(b.model, 10))
      .filter(y => !isNaN(y) && y > 1900 && y <= currentYear + 1);

    const newest = years.length > 0 ? Math.max(...years) : 'غير معروف';
    const oldest = years.length > 0 ? Math.min(...years) : 'غير معروف';
    
    const sumYears = years.reduce((sum, val) => sum + val, 0);
    const avgYear = years.length > 0 ? Math.round(sumYears / years.length) : 0;
    const avgAge = avgYear > 0 ? Math.max(0, currentYear - avgYear) : 0;

    // Brand counts
    const brands: { [key: string]: number } = {};
    buses.forEach(b => {
      const brand = b.manufacturer || 'غير محدد';
      brands[brand] = (brands[brand] || 0) + 1;
    });
    let mostCommonBrand = 'غير محدد';
    let maxBrandCount = 0;
    Object.entries(brands).forEach(([brand, count]) => {
      if (count > maxBrandCount) {
        maxBrandCount = count;
        mostCommonBrand = brand;
      }
    });

    return { avgAge, newest, oldest, mostCommonBrand, avgYear };
  }, [buses]);

  const readinessScore = totalBuses > 0 
    ? Math.round(((totalBuses - maintenanceBusesCount) / totalBuses) * 100) 
    : 100;

  const statsCards = [
    { 
      label: 'إجمالي الحافلات', 
      value: totalBuses, 
      icon: Bus, 
      color: 'text-primary dark:text-sky-400', 
      valueColor: 'text-primary dark:text-sky-300',
      bg: 'bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800/60', 
      trend: 'الأسطول الكلي المسجل',
      trendColor: 'text-primary dark:text-sky-300 bg-blue-50 dark:bg-blue-950/40'
    },
    { 
      label: 'الحافلات الجاهزة للعمل', 
      value: activeBusesCount, 
      icon: CheckCircle2, 
      color: 'text-emerald-600 dark:text-emerald-400', 
      valueColor: 'text-emerald-600 dark:text-emerald-400',
      bg: 'bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50', 
      trend: `جاهزة وتعمل (${totalBuses > 0 ? Math.round((activeBusesCount / totalBuses) * 100) : 0}%)`,
      trendColor: 'text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40'
    },
    { 
      label: 'تحت الصيانة / متوقفة', 
      value: maintenanceBusesCount, 
      icon: Wrench, 
      color: 'text-rose-600 dark:text-rose-400', 
      valueColor: 'text-rose-600 dark:text-rose-400',
      bg: 'bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50', 
      trend: maintenanceBusesCount > 0 ? `تتطلب فحص ومتابعة (${maintenanceBusesCount})` : 'جاهزية كاملة 100%',
      trendColor: 'text-rose-700 dark:text-rose-300 bg-rose-50 dark:bg-rose-950/40'
    },
    { 
      label: 'مواقع العمل النشطة', 
      value: Object.keys(locationCounts).length, 
      icon: MapPin, 
      color: 'text-amber-600 dark:text-amber-400', 
      valueColor: 'text-amber-700 dark:text-amber-400',
      bg: 'bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50', 
      trend: `أبرزها: ${topLocation}`,
      trendColor: 'text-amber-800 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40'
    },
    { 
      label: 'الكوادر والسائقين', 
      value: workersCount || workers.length, 
      icon: Users, 
      color: 'text-[#4A148C] dark:text-purple-400', 
      valueColor: 'text-[#4A148C] dark:text-purple-300',
      bg: 'bg-purple-50 dark:bg-purple-950/50 border border-purple-200 dark:border-purple-800/50', 
      trend: 'الكوادر الميدانية المسجلة',
      trendColor: 'text-purple-800 dark:text-purple-300 bg-purple-50 dark:bg-purple-950/40'
    },
  ];

  const handleCopyResponseLink = () => {
    const link = `${window.location.origin}${window.location.pathname}?action=driver-response`;
    navigator.clipboard.writeText(link);
    setCopiedResponseLink(true);
    setTimeout(() => setCopiedResponseLink(false), 2000);
  };

  // Check if current user is authorized to access driver response registration
  const canAccessDriverResponse = profile?.role !== 'readonly' && (
    profile?.role === 'admin' || 
    profile?.role === 'bus_supervisor' || 
    profile?.role === 'inspector' || 
    profile?.role === 'supervisor' || 
    profile?.role === 'operator' || 
    Boolean(profile?.canSubmitDriverResponses)
  );

  return (
    <div className="space-y-8 pb-12 text-right" dir="rtl">
      {/* 🚀 Driver Response Quick Access (يظهر فقط لمشرف نقل الحافلات ومدير النظام، ويمنع وضع القراءة فقط) */}
      {canAccessDriverResponse && (
      <motion.div
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl px-4 sm:px-5 py-3 shadow-md flex flex-wrap items-center justify-between gap-3"
      >
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
            <Navigation className="w-4 h-4 text-white" />
          </div>
          <span className="text-sm font-black text-white">
            نموذج تسجيل رد وحركة السائق
          </span>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (onOpenResponsePage) {
                onOpenResponsePage();
              } else {
                window.location.search = '?action=driver-response';
              }
            }}
            className="px-4 py-2 bg-white hover:bg-emerald-50 text-emerald-800 rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-2 cursor-pointer active:scale-95"
          >
            <Send className="w-3.5 h-3.5 text-emerald-700" />
            <span>الدخول على الرابط وتسجيل الرد</span>
          </button>

          <button
            type="button"
            onClick={handleCopyResponseLink}
            className="p-2 bg-white/15 hover:bg-white/25 text-white border border-white/25 rounded-xl transition-all cursor-pointer active:scale-95"
            title="نسخ الرابط"
          >
            {copiedResponseLink ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
          </button>
        </div>
      </motion.div>
      )}

      {/* Malwarebytes Style: Operations Hub & Operational Readiness Advisor */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column (8 cols): SECURITY / FLEET OPERATIONS GRID */}
        <div className="lg:col-span-8 flex flex-col gap-4">
          <div className="flex items-center justify-between px-1 flex-wrap gap-2">
            <span className="text-[11px] font-black text-text-muted uppercase tracking-wider flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <span>مركز العمليات والمراقبة اللحظية • درة المنورة</span>
            </span>
            <div className="flex items-center gap-2">
              {onOpenAnnouncement && (
                <button
                  type="button"
                  onClick={onOpenAnnouncement}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 rounded-xl text-[11px] font-black transition-all cursor-pointer shadow-2xs active:scale-95"
                  title="عرض بيان وتوجيهات مدير التشغيل الأستاذ عبد الحميد سالمة"
                >
                  <Award className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>بيان إدارة مكتب التشغيل</span>
                </button>
              )}
              <span className="text-[11px] font-bold text-primary">نظام الفحص والمتابعة المباشر</span>
            </div>
          </div>

          {/* Subcard 1: Fleet Scanner (Icon + Status + Scan Button) */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="soft-panel p-5 flex items-center justify-between gap-4 relative overflow-hidden"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 dark:bg-blue-950/60 border border-blue-200/80 dark:border-blue-800 flex items-center justify-center text-primary shrink-0 shadow-2xs">
                <Activity className="w-6 h-6 animate-pulse" />
              </div>
              <div className="text-right">
                <h4 className="text-sm font-black text-text-main leading-tight">فحص الأسطول والجاهزية الفنية</h4>
                <p className="text-xs text-text-muted font-bold mt-1">
                  آخر فحص شامل: <span className="text-primary font-black">اليوم ({activeBusesCount} حافلة جاهزة للعمل)</span>
                </p>
              </div>
            </div>
            <button 
              onClick={() => setIsExportModalOpen(true)}
              className="soft-btn-primary px-6 py-2.5 text-xs font-black shrink-0 flex items-center gap-2 cursor-pointer shadow-md"
            >
              <span>فحص فوري</span>
            </button>
          </motion.div>

          {/* Subcard 2: Detection & Operational History */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 }}
            className="soft-panel p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-sky-50 dark:bg-sky-950/60 border border-sky-200/80 dark:border-sky-800 flex items-center justify-center text-sky-600 shrink-0 shadow-2xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div className="text-right">
                <h4 className="text-sm font-black text-text-main leading-tight">سجل التشغيل ومواقع العمل</h4>
                <p className="text-xs text-text-muted font-bold mt-1">
                  متابعة {workers.length} سائق وموظف موزعين على {Object.keys(locationCounts).length} موقع عمل
                </p>
              </div>
            </div>
            <span className="text-xs font-black text-sky-700 dark:text-sky-300 bg-sky-50 dark:bg-sky-950/50 px-3 py-1 rounded-full border border-sky-200/60">
              محدث دورياً
            </span>
          </motion.div>

          {/* Subcard 3: Real-Time Fleet Protection / Dispatch */}
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="soft-panel p-5 flex items-center justify-between gap-4"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800 flex items-center justify-center text-emerald-600 shrink-0 shadow-2xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div className="text-right">
                <h4 className="text-sm font-black text-text-main leading-tight">الربط الميداني اللحظي</h4>
                <div className="flex items-center gap-2 mt-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  <span className="text-xs text-emerald-600 font-black">نشط ومباشر</span>
                  <span className="text-xs text-text-muted font-bold">• ربط الحافلات بالسائقين والعملاء</span>
                </div>
              </div>
            </div>
            <span className="text-xs font-black text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200/60">
              100% متزامن
            </span>
          </motion.div>
        </div>

        {/* Right Column (4 cols): TRUSTED ADVISOR (Readiness Score Arc Gauge) */}
        <div className="lg:col-span-4 flex flex-col gap-4">
          <div className="px-1">
            <span className="text-[11px] font-black text-text-muted uppercase tracking-wider">
              مؤشر الجاهزية التشغيلية (TRUSTED ADVISOR)
            </span>
          </div>

          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="soft-panel p-6 flex flex-col items-center justify-between text-center relative overflow-hidden h-full shadow-md"
          >
            {/* Circular Gauge Inspired by Malwarebytes Image 1 */}
            <div className="relative w-48 h-48 my-2 flex items-center justify-center">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 120 120">
                {/* Background Track */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  className="stroke-blue-100/70 dark:stroke-slate-800"
                  strokeWidth="11"
                  fill="transparent"
                  strokeDasharray="301.59"
                  strokeDashoffset="75.4" // ~270 degree arc
                  strokeLinecap="round"
                />
                {/* Gradient Definition */}
                <defs>
                  <linearGradient id="score-arc-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00BCD4" />
                    <stop offset="60%" stopColor="#0066F6" />
                    <stop offset="100%" stopColor="#10B981" />
                  </linearGradient>
                </defs>
                {/* Active Colored Arc */}
                <circle
                  cx="60"
                  cy="60"
                  r="48"
                  stroke="url(#score-arc-grad)"
                  strokeWidth="11"
                  fill="transparent"
                  strokeDasharray="301.59"
                  strokeDashoffset={301.59 - ((readinessScore * 0.75) / 100) * 301.59}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>

              {/* Inside Score Content */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-wider mb-0.5">
                  معدل الجاهزية
                </span>
                <span className="text-4xl font-black font-sans text-text-main tracking-tight">
                  {readinessScore}
                </span>
                <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                  {readinessScore >= 95 ? 'ممتاز (جاهزية قصوى)' : readinessScore >= 80 ? 'جيد جداً' : 'يحتاج صيانة'}
                </span>
              </div>
            </div>

            {/* See details pill button */}
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="mt-2 px-6 py-2 bg-blue-50/80 hover:bg-blue-100/90 text-primary border border-blue-200/80 rounded-full text-xs font-black transition-all cursor-pointer shadow-2xs hover:scale-102 active:scale-98"
            >
              عرض تقرير الجاهزية الشامل
            </button>

            {/* Bottom Info Banner */}
            <div className="mt-5 pt-4 border-t border-border/80 w-full flex flex-col items-center text-center">
              <div className="flex items-center justify-center gap-2 mb-1.5">
                <DmtcLogo size="xs" variant="horizontal" />
              </div>
              <p className="text-[10px] text-text-muted font-bold leading-relaxed">
                موثوقية عالية وتشغيل معتمد لأسطول نقل الحجاج والمعتمرين والكوادر الميدانية.
              </p>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Metrics Summary Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4.5">
        {statsCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="soft-panel p-4.5 flex flex-col justify-between gap-3 relative overflow-hidden group hover:border-primary/50 transition-all shadow-xs"
          >
            <div className="flex justify-between items-start relative z-10">
              <div className="text-right">
                <p className="text-xs font-bold text-text-muted mb-1.5">{card.label}</p>
                <h3 className={`text-3xl font-extrabold ${card.valueColor} leading-none tracking-tight`}>{card.value}</h3>
              </div>
              <div className={`${card.bg} p-2.5 rounded-2xl group-hover:scale-105 transition-transform shadow-2xs`}>
                <card.icon className={`${card.color} w-5 h-5`} />
              </div>
            </div>
            <div className="text-[10px] font-semibold mt-auto pt-2 border-t border-border/40 flex items-center gap-1.5">
               <span className={`px-2 py-0.5 rounded-md truncate font-bold ${card.trendColor}`}>
                 {card.trend}
               </span>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Model Distribution by Location Filter Card */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col justify-between"
        >
          <div>
            <div className="flex flex-col gap-3 mb-5 border-b border-border pb-4">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-black flex items-center gap-2 text-text-main">
                  <Calendar className="w-5 h-5 text-primary" />
                  <span>توزيع الموديلات حسب الموقع</span>
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleExportLocationModels(modelLocationFilter)}
                    className="bg-emerald-600/10 hover:bg-emerald-600 hover:text-white text-emerald-700 dark:text-emerald-400 border border-emerald-600/20 px-2 py-1 rounded-lg text-[10px] font-black flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="تصدير هذا التوزيع فورياً إلى ملف إكسل Excel"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>تصدير Excel</span>
                  </button>
                  <span className="text-[10px] font-black bg-primary/10 text-primary px-2.5 py-1 rounded-full">
                    {modelsInSelectedLocation.total} {modelsInSelectedLocation.total === 1 ? 'حافلة' : modelsInSelectedLocation.total === 2 ? 'حافلتان' : modelsInSelectedLocation.total <= 10 ? 'حافلات' : 'حافلة'}
                  </span>
                </div>
              </div>
              <p className="text-[11px] text-text-muted font-bold">
                اختر الموقع لعرض إحصائية سنوات الصنع والموديلات الخاصة به فورياً:
              </p>
              
              {/* Location Select Filter */}
              <div className="relative mt-1">
                <select
                  value={modelLocationFilter}
                  onChange={(e) => setModelLocationFilter(e.target.value)}
                  className="w-full bg-background border border-border/80 rounded-xl px-3.5 py-2.5 text-xs font-black text-text-main focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all cursor-pointer appearance-none pl-9 pr-9"
                >
                  <option value="all">🌐 جميع المواقع ({totalBuses} حافلة)</option>
                  {availableLocationsForModels.map(loc => (
                    <option key={loc.name} value={loc.name}>
                      📍 {loc.name} ({loc.count} حافلة)
                    </option>
                  ))}
                </select>
                <MapPin className="w-4 h-4 text-primary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <ChevronDown className="w-4 h-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            </div>

            {/* Models Distribution List */}
            <div className="space-y-3 max-h-[290px] overflow-y-auto pr-1 custom-scrollbar">
              {modelsInSelectedLocation.models.map((item, idx) => {
                const colors = ['#059669', '#3b82f6', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4', '#64748b'];
                const itemColor = colors[idx % colors.length];

                return (
                  <div key={item.model} className="p-3 bg-background rounded-xl border border-border/60 hover:border-primary/40 transition-all">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex items-start gap-2">
                        <span className="w-2.5 h-2.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: itemColor }} />
                        <div>
                          <span className="text-xs font-black text-text-main block">
                            {item.isNumeric ? `موديل ${item.model}` : item.model}
                          </span>
                          {item.categories && item.categories.length > 0 && (
                            <span className="inline-block mt-0.5 text-[10px] text-primary/90 font-bold bg-primary/5 border border-primary/15 px-1.5 py-0.2 rounded">
                              النوع: {item.categories.join(' ، ')}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs font-black text-primary bg-primary/10 px-2 py-0.5 rounded-md">
                          {item.count} {item.count === 1 ? 'حافلة' : item.count === 2 ? 'حافلتان' : item.count <= 10 ? 'حافلات' : 'حافلة'}
                        </span>
                        <span className="text-[11px] font-bold text-text-muted">
                          ({item.percentage.toFixed(0)}%)
                        </span>
                      </div>
                    </div>
                    
                    {/* Progress Bar */}
                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-border/40">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 0.6, delay: idx * 0.05 }}
                        className="h-full rounded-full"
                        style={{ backgroundColor: itemColor }}
                      />
                    </div>
                  </div>
                );
              })}

              {modelsInSelectedLocation.models.length === 0 && (
                <div className="flex flex-col items-center justify-center p-8 text-text-muted text-center">
                  <Calendar className="w-10 h-10 mb-2 opacity-40 text-primary" />
                  <p className="text-xs font-black">لا توجد حافلات أو موديلات مسجلة في هذا الموقع</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-5 space-y-3">
            <div className="p-3 bg-primary/[0.03] rounded-xl border border-primary/10">
              <p className="text-[10px] text-primary/80 font-bold leading-relaxed flex items-center gap-1.5">
                <span>💡</span>
                <span>
                  توزيع سنوات الصنع وأنواع الحافلات لموقع: <strong>{modelsInSelectedLocation.selectedLocationName}</strong>
                </span>
              </p>
            </div>

            {/* Dedicated Excel Export Button for Workplace, Bus Types & Models */}
            <div className="pt-2 border-t border-border/60 flex flex-col gap-2">
              <button
                onClick={() => handleExportLocationModels(modelLocationFilter)}
                className="w-full bg-emerald-700 hover:bg-emerald-800 text-white font-extrabold text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-all cursor-pointer hover:shadow-sm active:scale-[0.99]"
                title="تصدير ملف إكسل يوضح مكان العمل وعدد الحافلات مع الموديلات ونوع الحافلة"
              >
                <FileSpreadsheet className="w-4 h-4 shrink-0" />
                <span>
                  تصدير تقرير الموديلات والأنواع والمواقع (Excel)
                </span>
              </button>

              {modelLocationFilter !== 'all' && (
                <button
                  onClick={() => handleExportLocationModels('all')}
                  className="w-full bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold text-[10px] py-1.5 px-2.5 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  title="تصدير كشف شامل لكافة مواقع العمل والموديلات والأنواع في ملف إكسل واحد"
                >
                  <Download className="w-3 h-3 text-slate-500" />
                  <span>تصدير تقرير شامل لكافة المواقع ({availableLocationsForModels.length} موقع)</span>
                </button>
              )}
            </div>
          </div>
        </motion.div>

        {/* Operational Status (متاحة، صيانة، في الخدمة) Donut/Bar Chart */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 bg-surface p-6 rounded-2xl border border-border shadow-xs min-h-[400px] h-auto flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-border pb-4">
             <div className="text-right">
               <h3 className="text-sm font-bold flex items-center gap-2 text-slate-900 dark:text-white">
                 <Activity className="w-4.5 h-4.5 text-emerald-700 dark:text-emerald-400" />
                 <span>توزيع الحافلات حسب حالة التشغيل</span>
               </h3>
               <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">انقر على أي حالة أدناه أو بالرسم البياني لتفصيل توزيع الحافلات في المواقع الميدانية</p>
             </div>
             
             {/* Chart Type Toggle */}
             <div className="flex items-center gap-2">
               <div className="flex bg-[#FAF9F6] dark:bg-background p-1 rounded-xl border border-border">
                 <button
                   onClick={() => setTechnicalStatusViewMode('donut')}
                   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                     technicalStatusViewMode === 'donut'
                       ? 'bg-surface text-primary shadow-xs border border-border'
                       : 'text-text-muted hover:text-text-main'
                   }`}
                   title="عرض دائري مجوف (Donut Chart)"
                 >
                   <PieChartIcon className="w-3.5 h-3.5" />
                   <span>دائري (Pie)</span>
                 </button>
                 <button
                   onClick={() => setTechnicalStatusViewMode('bar')}
                   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                     technicalStatusViewMode === 'bar'
                       ? 'bg-surface text-primary shadow-xs border border-border'
                       : 'text-text-muted hover:text-text-main'
                   }`}
                   title="عرض بياني شريطي (Bar Chart)"
                 >
                   <BarChart3 className="w-3.5 h-3.5" />
                   <span>أعمدة (Bar)</span>
                 </button>
               </div>
             </div>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row items-center md:items-start justify-around gap-6 mt-4">
            {/* The Chart (Pie or Bar) */}
            <div className="relative w-full md:w-1/2 h-[230px] flex-shrink-0 flex items-center justify-center">
              {technicalStatusViewMode === 'donut' ? (
                <>
                  <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={opStatusChartData}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={88}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {opStatusChartData.map((entry, index) => (
                            <Cell 
                              key={`cell-${index}`} 
                              fill={entry.color} 
                              className="outline-none"
                              style={{ 
                                cursor: 'pointer', 
                                filter: activeStatusKey === entry.id ? 'brightness(1.05)' : activeStatusKey ? 'opacity(0.4)' : 'none',
                                transition: 'all 0.2s ease-in-out'
                              }}
                              onClick={() => {
                                setActiveStatusKey(activeStatusKey === entry.id ? null : entry.id);
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          contentStyle={{ 
                            borderRadius: '12px', 
                            border: '1px solid #E8E5DF', 
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                            textAlign: 'right',
                            direction: 'rtl',
                            fontFamily: 'Tajawal, sans-serif'
                          }}
                          itemStyle={{ fontWeight: 700 }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  {/* Central text displaying total number of buses */}
                  <div className="absolute pointer-events-none text-center">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none block">{totalBuses}</span>
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300 mt-1 block">إجمالي الحافلات</span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={opStatusChartData}
                      layout="vertical"
                      margin={{ top: 10, right: 30, left: 10, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          const clickedId = state.activePayload[0].payload.id;
                          setActiveStatusKey(activeStatusKey === clickedId ? null : clickedId);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8E5DF" opacity={0.6} />
                      <XAxis type="number" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} stroke="#334155" />
                      <YAxis 
                        dataKey="shortName" 
                        type="category" 
                        fontSize={11} 
                        fontWeight={700} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="#334155"
                        width={65}
                      />
                      <Tooltip 
                        contentStyle={{ 
                          borderRadius: '12px', 
                          border: '1px solid #E8E5DF', 
                          boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)',
                          textAlign: 'right',
                          direction: 'rtl',
                          fontFamily: 'Tajawal, sans-serif'
                        }}
                        itemStyle={{ fontWeight: 700 }}
                      />
                      <Bar 
                        dataKey="value" 
                        radius={[0, 6, 6, 0]} 
                        barSize={32}
                        className="cursor-pointer"
                      >
                        {opStatusChartData.map((entry, index) => (
                          <Cell 
                            key={`bar-cell-${index}`} 
                            fill={entry.color}
                            style={{
                              opacity: activeStatusKey && activeStatusKey !== entry.id ? 0.4 : 1,
                              transition: 'all 0.2s ease-in-out'
                            }}
                          />
                        ))}
                        <LabelList 
                          dataKey="value" 
                          position="right" 
                          offset={10}
                          style={{ fontSize: 12, fontWeight: 800, fill: '#090D16' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Explanatory Legend / Details Cards */}
            <div className="w-full md:w-1/2 flex flex-col gap-2.5">
              {opStatusChartData.map((item) => {
                const percentage = totalBuses > 0 ? (item.value / totalBuses) * 100 : 0;
                const isSelected = activeStatusKey === item.id;
                const locationsForStatus = statusLocationBreakdown[item.id as 'available' | 'inService' | 'maintenance'] || [];

                return (
                  <div 
                    key={item.name} 
                    onClick={() => setActiveStatusKey(isSelected ? null : item.id)}
                    className={`p-3 bg-[#FAF9F6] dark:bg-background rounded-xl border transition-all cursor-pointer flex flex-col group ${
                      isSelected 
                        ? 'border-emerald-700 ring-2 ring-emerald-700/10 shadow-xs'
                        : activeStatusKey 
                          ? 'border-border/40 opacity-60 hover:opacity-100 hover:border-border'
                          : 'border-border hover:border-primary/40 hover:shadow-xs'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full shrink-0 flex items-center justify-center relative" style={{ backgroundColor: item.color }}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                            {item.name}
                            {isSelected ? (
                              <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                            )}
                          </p>
                          <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">{percentage.toFixed(1)}% من إجمالي الأسطول</p>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <span className="text-base font-extrabold text-slate-900 dark:text-white block leading-none">{item.value}</span>
                        <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 block mt-1">حافلة</span>
                      </div>
                    </div>

                    {/* Expandable Location Breakdown */}
                    {isSelected && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="mt-4 pt-3 border-t border-border/50 text-right space-y-2.5"
                        onClick={(e) => e.stopPropagation()} // Prevent closing card when clicking inside
                      >
                        <div className="flex justify-between items-center text-[10px] font-bold text-text-muted">
                          <span>توزع الفئة في المواقع الفعالة</span>
                          <span>عدد الحافلات ({item.value})</span>
                        </div>
                        <div className="max-h-[160px] overflow-y-auto space-y-2 pr-1 custom-scrollbar" dir="rtl">
                          {locationsForStatus.map((loc, idx) => {
                            const locPercent = item.value > 0 ? (loc.count / item.value) * 100 : 0;
                            return (
                              <div key={loc.name} className="flex flex-col gap-1.5 bg-slate-50/70 p-2 rounded-lg border border-border/35 hover:bg-slate-50 transition-colors">
                                <div className="flex justify-between items-center text-[10px] font-black text-text-main leading-none">
                                  <span className="flex items-center gap-1.5">
                                    <MapPin className="w-3 h-3 text-red-500 shrink-0" />
                                    <span className="truncate max-w-[150px]" title={loc.name}>{loc.name}</span>
                                  </span>
                                  <span className="font-extrabold text-primary shrink-0">{loc.count} حافلة ({locPercent.toFixed(0)}%)</span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <motion.div 
                                    initial={{ width: 0 }}
                                    animate={{ width: `${locPercent}%` }}
                                    transition={{ duration: 0.5, ease: 'easeOut' }}
                                    className="h-full rounded-full" 
                                    style={{ backgroundColor: item.color }} 
                                  />
                                </div>
                              </div>
                            );
                          })}
                          {locationsForStatus.length === 0 && (
                            <p className="text-[10px] text-text-muted text-center py-4">لا توجد حافلات مسجلة في هذا الموقع لهذه الحالة</p>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>

        {/* Model & Manufacturer Distribution */}
        <motion.div 
          initial={{ opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          className="lg:col-span-12 bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col min-h-[480px]"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 border-b border-border pb-4">
             <h3 className="text-base font-black flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                {chartTab === 'year' ? 'تحليل أسطول الحافلات حسب سنة الصنع' : 'تحليل أسطول الحافلات حسب الشركة المصنعة'}
             </h3>
             <div className="flex bg-background p-1 rounded-xl border border-border self-start sm:self-auto">
               <button
                 onClick={() => setChartTab('year')}
                 className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                   chartTab === 'year' 
                     ? 'bg-surface text-primary shadow-sm border border-border/40' 
                     : 'text-text-muted hover:text-text-main'
                 }`}
               >
                 سنة الصنع (الموديل)
               </button>
               <button
                 onClick={() => setChartTab('brand')}
                 className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all ${
                   chartTab === 'brand' 
                     ? 'bg-surface text-primary shadow-sm border border-border/40' 
                     : 'text-text-muted hover:text-text-main'
                 }`}
               >
                 الشركة المصنعة (الماركة)
               </button>
             </div>
          </div>

          {/* Quick Metrics of Fleet Age/Manufacturer */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6 lg:mb-8" dir="rtl">
            <div className="p-3 bg-background rounded-xl border border-border/50 flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-text-muted">متوسط عمر الأسطول</span>
              <span className="text-base lg:text-lg font-black text-primary mt-1">
                {fleetAgeStats.avgAge} سنوات <span className="text-xs text-text-muted font-bold">({fleetAgeStats.avgYear || '—'})</span>
              </span>
            </div>
            <div className="p-3 bg-background rounded-xl border border-border/50 flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-text-muted">الشركة الأكثر انتشاراً</span>
              <span className="text-sm font-black text-indigo-600 mt-1 truncate" title={fleetAgeStats.mostCommonBrand}>
                {fleetAgeStats.mostCommonBrand}
              </span>
            </div>
            <div className="p-3 bg-background rounded-xl border border-border/50 flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-text-muted">أحدث موديل بالأسطول</span>
              <span className="text-base lg:text-lg font-black text-emerald-600 mt-1">
                {fleetAgeStats.newest}
              </span>
            </div>
            <div className="p-2.5 lg:p-3 bg-background rounded-xl border border-border/50 flex flex-col justify-between">
              <span className="text-[10px] font-extrabold text-text-muted">أقدم موديل بالأسطول</span>
              <span className="text-base lg:text-lg font-black text-amber-600 mt-1">
                {fleetAgeStats.oldest}
              </span>
            </div>
          </div>

          <div className="flex-1 min-h-[260px] relative">
            {chartTab === 'year' ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={modelData} margin={{ top: 25, right: 15, left: 15, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis 
                    dataKey="year" 
                    fontSize={11} 
                    fontWeight={800}
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                    stroke="#475569"
                  />
                  <YAxis 
                    fontSize={11} 
                    fontWeight={800}
                    tickLine={false} 
                    axisLine={false}
                    dx={-10}
                    stroke="#475569"
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC', radius: 8 }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #E2E8F0', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      textAlign: 'right',
                      direction: 'rtl'
                    }}
                    itemStyle={{ fontWeight: 800, color: '#10b981' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#059669" 
                    radius={[6, 6, 0, 0]} 
                    barSize={45}
                  >
                    {modelData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                    <LabelList 
                      dataKey="count" 
                      position="top" 
                      offset={10}
                      style={{ fontSize: 11, fontWeight: 900, fill: '#1e293b' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={manufacturerData} margin={{ top: 25, right: 15, left: 15, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                  <XAxis 
                    dataKey="name" 
                    fontSize={11} 
                    fontWeight={800}
                    tickLine={false} 
                    axisLine={false}
                    dy={10}
                    stroke="#475569"
                  />
                  <YAxis 
                    fontSize={11} 
                    fontWeight={800}
                    tickLine={false} 
                    axisLine={false}
                    dx={-10}
                    stroke="#475569"
                  />
                  <Tooltip 
                    cursor={{ fill: '#F8FAFC', radius: 8 }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #E2E8F0', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      textAlign: 'right',
                      direction: 'rtl'
                    }}
                    itemStyle={{ fontWeight: 800, color: '#6366f1' }}
                  />
                  <Bar 
                    dataKey="count" 
                    fill="#6366f1" 
                    radius={[6, 6, 0, 0]} 
                    barSize={45}
                  >
                    {manufacturerData.map((_, index) => (
                      <Cell key={`cell-brand-${index}`} fill={COLORS[(index + 2) % COLORS.length]} />
                    ))}
                    <LabelList 
                      dataKey="count" 
                      position="top" 
                      offset={10}
                      style={{ fontSize: 11, fontWeight: 900, fill: '#1e293b' }}
                    />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </motion.div>
      </div>

      {/* Locations Row */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-surface p-8 rounded-3xl border border-border shadow-sm"
      >
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 mb-8">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                 <MapPin className="w-6 h-6" />
              </div>
              <div className="text-right">
                 <h3 className="text-xl font-black text-text-main">انتشار الحافلات حسب الموقع الميداني</h3>
                 <p className="text-xs text-text-muted font-bold mt-0.5">تفصيل كامل لمواقع تمركز الحافلات في جميع المشاريع</p>
              </div>
           </div>
           
           <div className="flex items-center gap-3 text-right" dir="rtl">
              <div className="p-3 bg-slate-50/80 rounded-2xl border border-border/50 text-right min-w-[110px]">
                 <div className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none mb-1.5">إجمالي المواقع</div>
                 <div className="text-xl font-black text-primary leading-none">{locationData.length} موقع</div>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-2xl border border-border/50 text-right min-w-[110px]">
                 <div className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none mb-1.5">الموقع الأكثر نشاطاً</div>
                 <div className="text-sm font-black text-text-main leading-none truncate max-w-[140px]" title={topLocation}>{topLocation}</div>
              </div>
              <button
                onClick={() => handleExportLocationModels('all')}
                className="p-3 bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-200 rounded-2xl flex items-center gap-2.5 text-emerald-800 transition-all cursor-pointer shadow-xs hover:shadow-sm"
                title="تصدير كشف أماكن العمل وعدد الحافلات والموديلات إلى ملف Excel"
              >
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-[9px] text-emerald-700 font-bold uppercase leading-none">تصدير Excel</div>
                  <div className="text-xs font-black text-emerald-950 mt-1">المواقع والموديلات</div>
                </div>
              </button>
           </div>
        </div>

        {/* Search, Sort & View Mode Panel */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 mb-6 border-b border-border/40 pb-6">
          {/* Search Input */}
          <div className="relative flex-1 max-w-md">
            <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
            <input 
              type="text"
              placeholder="ابحث عن الموقع الميداني..."
              value={locSearch}
              onChange={(e) => setLocSearch(e.target.value)}
              className="w-full pr-10 pl-12 py-2.5 bg-background border border-border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-right"
              dir="rtl"
            />
            {locSearch && (
              <button 
                onClick={() => setLocSearch('')} 
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 hover:bg-slate-350 text-text-muted py-0.5 px-2 rounded-md font-bold transition-colors"
                type="button"
              >
                مسح
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-4" dir="rtl">
            {/* View Mode Switcher */}
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">طريقة العرض:</span>
              <div className="inline-flex bg-slate-100 border border-border/80 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setLocationViewMode('grid')}
                  className={`py-1.5 px-3 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    locationViewMode === 'grid'
                      ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                  title="عرض بطاقات شبكية"
                >
                  <LayoutGrid className="w-3.5 h-3.5" />
                  <span>بطاقات</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationViewMode('barChart')}
                  className={`py-1.5 px-3 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    locationViewMode === 'barChart'
                      ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                  title="مخطط بياني أعمدة (Bar Chart)"
                >
                  <BarChart3 className="w-3.5 h-3.5" />
                  <span>مخطط بياني (Bar)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationViewMode('pieChart')}
                  className={`py-1.5 px-3 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                    locationViewMode === 'pieChart'
                      ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                      : 'text-text-muted hover:text-text-main'
                  }`}
                  title="مخطط دائري (Pie Chart)"
                >
                  <PieChartIcon className="w-3.5 h-3.5" />
                  <span>مخطط دائري (Pie)</span>
                </button>
              </div>
            </div>

            {/* Sort Buttons (for Grid view) */}
            {locationViewMode === 'grid' && (
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">ترتيب:</span>
                <div className="inline-flex bg-slate-100 border border-border/80 p-1 rounded-xl">
                  <button
                    type="button"
                    onClick={() => setLocSort('value')}
                    className={`py-1.5 px-3 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      locSort === 'value'
                        ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    <ArrowUpDown className="w-3 h-3" />
                    الأعلى
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocSort('name')}
                    className={`py-1.5 px-3 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 cursor-pointer ${
                      locSort === 'name'
                        ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                        : 'text-text-muted hover:text-text-main'
                    }`}
                  >
                    أبجدياً
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* View Mode Content */}
        {locationViewMode === 'barChart' ? (
          <div className="h-[360px] w-full pt-4" dir="rtl">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={filteredLocationData.slice(0, 15)}
                margin={{ top: 20, right: 20, left: 10, bottom: 40 }}
                onClick={(state: any) => {
                  if (state && state.activePayload && state.activePayload.length > 0) {
                    const locName = state.activePayload[0].payload.name;
                    setSelectedLocation(locName);
                    setModalSearch('');
                    setModalCategoryFilter('');
                    setModalStatusFilter('');
                  }
                }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.6} />
                <XAxis 
                  dataKey="name" 
                  fontSize={10} 
                  fontWeight={800} 
                  tickLine={false} 
                  axisLine={false} 
                  stroke="#475569" 
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />
                <YAxis 
                  fontSize={11} 
                  fontWeight={800} 
                  tickLine={false} 
                  axisLine={false} 
                  stroke="#475569"
                />
                <Tooltip 
                  cursor={{ fill: '#F8FAFC', radius: 8 }}
                  contentStyle={{ 
                    borderRadius: '16px', 
                    border: '1px solid #E2E8F0', 
                    boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                    textAlign: 'right',
                    direction: 'rtl'
                  }}
                  itemStyle={{ fontWeight: 800, color: '#059669' }}
                  formatter={(val: any) => [`${val} حافلة`, 'العدد']}
                />
                <Bar 
                  dataKey="value" 
                  radius={[6, 6, 0, 0]} 
                  barSize={40}
                  className="cursor-pointer"
                >
                  {filteredLocationData.map((_, index) => (
                    <Cell key={`cell-loc-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                  <LabelList 
                    dataKey="value" 
                    position="top" 
                    offset={8}
                    style={{ fontSize: 11, fontWeight: 900, fill: '#1e293b' }}
                  />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <p className="text-center text-[11px] font-bold text-text-muted mt-2">
              💡 انقر على أي عامود في المخطط البياني لعرض قائمة الحافلات وتفاصيل الموقع
            </p>
          </div>
        ) : locationViewMode === 'pieChart' ? (
          <div className="min-h-[360px] w-full flex flex-col lg:flex-row items-center justify-around gap-6 pt-2" dir="rtl">
            <div className="relative w-full lg:w-1/2 h-[300px] flex items-center justify-center">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={filteredLocationData.slice(0, 8)}
                    cx="50%"
                    cy="50%"
                    innerRadius={70}
                    outerRadius={105}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {filteredLocationData.slice(0, 8).map((_, index) => (
                      <Cell 
                        key={`cell-pie-loc-${index}`} 
                        fill={COLORS[index % COLORS.length]} 
                        className="outline-none cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => {
                          const locName = filteredLocationData[index]?.name;
                          if (locName) {
                            setSelectedLocation(locName);
                            setModalSearch('');
                            setModalCategoryFilter('');
                            setModalStatusFilter('');
                          }
                        }}
                      />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid #E2E8F0', 
                      boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                      textAlign: 'right',
                      direction: 'rtl'
                    }}
                    itemStyle={{ fontWeight: 800 }}
                    formatter={(val: any) => [`${val} حافلة`, 'العدد']}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute pointer-events-none text-center">
                <span className="text-3xl font-black text-text-main leading-none block">{totalBuses}</span>
                <span className="text-[10px] font-bold text-text-muted mt-1 block">إجمالي الحافلات</span>
              </div>
            </div>

            {/* Top Locations Legend */}
            <div className="w-full lg:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {filteredLocationData.slice(0, 8).map((loc, idx) => {
                const percentage = totalBuses > 0 ? (loc.value / totalBuses) * 100 : 0;
                return (
                  <div 
                    key={loc.name}
                    onClick={() => {
                      setSelectedLocation(loc.name);
                      setModalSearch('');
                      setModalCategoryFilter('');
                      setModalStatusFilter('');
                    }}
                    className="p-3 bg-background border border-border/60 hover:border-primary/40 rounded-xl cursor-pointer transition-all flex items-center justify-between group"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                      <span className="text-xs font-bold text-text-main group-hover:text-primary transition-colors truncate max-w-[130px]" title={loc.name}>
                        {loc.name}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-xs font-black text-text-main">{loc.value}</span>
                      <span className="text-[10px] font-bold text-text-muted">({percentage.toFixed(0)}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Locations Grid */
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
             {filteredLocationData.length === 0 ? (
               <div className="py-12 text-center col-span-full bg-slate-50 border border-dashed border-border rounded-2xl">
                 <MapPin className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
                 <p className="text-sm font-black text-text-main mb-1">لم يتم العثور على أي كفايات تطابق البحث</p>
                 <p className="text-xs text-text-muted font-bold">يرجى تجربة عبارة بحث أخرى للعثور على النتائج المطلوبة</p>
               </div>
             ) : (
               filteredLocationData.map((loc, idx) => {
                 const displayName = normalizeBusLocation(loc.name);
                 const percentage = totalBuses > 0 ? (loc.value / totalBuses) * 100 : 0;
                 return (
                   <motion.div 
                     layout
                     initial={{ opacity: 0, scale: 0.98 }}
                     animate={{ opacity: 1, scale: 1 }}
                     whileHover={{ y: -4 }}
                     key={loc.name} 
                     onClick={() => {
                       setSelectedLocation(loc.name);
                       setModalSearch('');
                       setModalCategoryFilter('');
                       setModalStatusFilter('');
                     }}
                     className="pr-6 pl-5 py-5 bg-background border border-border rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-lg hover:border-primary/40 group flex flex-col justify-between min-h-[115px] cursor-pointer active:scale-[0.98]"
                   >
                     {/* Colored side indicator block */}
                     <div className="absolute top-0 right-0 w-1.5 h-full" style={{ backgroundColor: COLORS[idx % COLORS.length] }} />
                     
                     <div className="flex justify-between items-start mb-3 gap-3">
                        <div className="space-y-0.5 text-right flex-1">
                          <span className="text-[9px] font-bold text-text-muted uppercase tracking-wider block">الموقع الميداني</span>
                          <span className="text-[12px] font-black text-text-main group-hover:text-primary transition-colors block line-clamp-2 leading-tight" title={displayName}>
                            {displayName}
                          </span>
                        </div>
                        <div className="text-left shrink-0">
                          <span className="text-xl font-black text-text-main leading-none block">{loc.value}</span>
                          <span className="text-[9px] font-bold text-text-muted mt-1 block">حافلة</span>
                        </div>
                     </div>
                     
                     <div className="space-y-1.5">
                        <div className="flex justify-between items-center text-[10px] font-bold text-text-muted">
                          <span>معدل التمركز والانتشار</span>
                          <span className="font-bold text-text-main">{percentage.toFixed(1)}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                           <motion.div 
                             initial={{ width: 0 }}
                             animate={{ width: `${percentage}%` }}
                             className="h-full rounded-full"
                             style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                           />
                        </div>
                     </div>
                   </motion.div>
                 );
               })
             )}
          </div>
        )}
      </motion.div>

      {/* Elegant, interactive details modal for selected location */}
      <AnimatePresence>
        {selectedLocation && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setSelectedLocation(null)}
          >
            <motion.div 
              initial={{ scale: 0.95, y: 15, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 15, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 350 }}
              className="bg-surface w-full max-w-5xl rounded-3xl border border-border/80 shadow-2xl overflow-hidden flex flex-col h-[85vh] text-right"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-slate-50 border-b border-border/60 p-6 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-text-main flex items-center gap-2">
                      <span>حافلات موقع:</span>
                      <span className="text-primary">{selectedLocation ? normalizeBusLocation(selectedLocation) : ''}</span>
                    </h3>
                    <p className="text-[11px] text-text-muted font-bold mt-0.5">
                      يوجد {busesInSelectedLocation.length} حافلة مسجلة ميدانياً في هذا الموقع
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedLocation(null)}
                  className="w-10 h-10 bg-white border border-border hover:bg-slate-50 text-text-muted hover:text-text-main rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-sm hover:scale-105"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters Bar */}
              <div className="p-5 border-b border-border/40 bg-white flex flex-col md:flex-row items-stretch md:items-center gap-4 shrink-0">
                {/* Search field */}
                <div className="relative flex-1">
                  <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                  <input 
                    type="text"
                    placeholder="البحث بالرقم التشغيلي، رقم اللوحة، الماركة..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pr-9 pl-4 py-2 bg-background border border-border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-right"
                  />
                  {modalSearch && (
                    <button 
                      onClick={() => setModalSearch('')} 
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] bg-slate-200 hover:bg-slate-350 text-text-muted py-0.5 px-2 rounded font-bold"
                    >
                      مسح
                    </button>
                  )}
                </div>

                {/* Category filter */}
                <div className="flex items-center gap-2 min-w-[180px]">
                  <span className="text-[10px] font-black text-text-muted shrink-0">الفئة:</span>
                  <select
                    value={modalCategoryFilter}
                    onChange={(e) => setModalCategoryFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">كل الفئات ({uniqueCategories.length})</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-2 min-w-[180px]">
                  <span className="text-[10px] font-black text-text-muted shrink-0">الحالة:</span>
                  <select
                    value={modalStatusFilter}
                    onChange={(e) => setModalStatusFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-background border border-border rounded-xl text-xs font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">كل الحالات ({uniqueStatuses.length})</option>
                    {uniqueStatuses.map(stat => (
                      <option key={stat} value={stat}>{stat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scrollable Buses List */}
              <div className="flex-1 overflow-y-auto p-6 bg-slate-50/40 custom-scrollbar">
                {filteredBusesInSelectedLocation.length === 0 ? (
                  <div className="py-16 text-center bg-white border border-dashed border-border rounded-2xl max-w-lg mx-auto mt-8 shadow-sm">
                    <Bus className="w-14 h-14 text-text-muted/30 mx-auto mb-3" />
                    <p className="text-sm font-black text-text-main mb-1">لا توجد حافلات مطابقة لخيارات البحث</p>
                    <p className="text-xs text-text-muted font-bold">يرجى تعديل الفلاتر أو عبارة البحث للمحاولة مرة أخرى</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-hidden bg-white border border-border rounded-2xl shadow-sm">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-50 border-b border-border text-[10px] font-black text-text-muted uppercase">
                            <th className="px-5 py-4">الرقم التشغيلي</th>
                            <th className="px-5 py-4">رقم اللوحة</th>
                            <th className="px-5 py-4">الفئة</th>
                            <th className="px-5 py-4">الماركة / الموديل</th>
                            <th className="px-5 py-4">الحالة الفنية</th>
                            <th className="px-5 py-4 text-center">الكوادر المرتبطين (السائقين)</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 text-xs text-text-main">
                          {filteredBusesInSelectedLocation.map(bus => {
                            const assignedWorkers = workers.filter(w => w.assignedBusId === bus.id);
                            
                            let statusColor = 'bg-slate-100 text-slate-800 border-slate-200';
                            const status = bus.technicalStatus || '';
                            if (status.includes('ممتاز') || status.includes('جديد')) {
                              statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                            } else if (status.includes('جيد جداً')) {
                              statusColor = 'bg-teal-50 text-teal-700 border-teal-100';
                            } else if (status.includes('جيد')) {
                              statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
                            } else if (status.includes('صيانة') || status.includes('متوقف') || status.includes('عطل')) {
                              statusColor = 'bg-rose-50 text-rose-700 border-rose-100';
                            }

                            return (
                              <tr key={bus.id} className="hover:bg-slate-50/50 transition-colors">
                                <td className="px-5 py-4 font-black text-primary font-mono">{bus.operationalNumber}</td>
                                <td className="px-5 py-4">
                                  <div className="inline-flex items-center bg-slate-50 border border-slate-300 rounded-md px-2 py-0.5 text-[11px] font-mono font-black select-none shadow-sm gap-2">
                                    <span className="text-slate-800 tracking-wider">{bus.plateNumber}</span>
                                    <span className="text-[8px] bg-slate-200 text-slate-500 px-1 rounded font-bold">KSA</span>
                                  </div>
                                </td>
                                <td className="px-5 py-4 font-bold text-text-main">{bus.category}</td>
                                <td className="px-5 py-4 font-semibold text-text-muted">
                                  {bus.manufacturer || 'غير محدد'} / {bus.model || '—'}
                                </td>
                                <td className="px-5 py-4">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 border rounded-lg text-[10px] font-black ${statusColor}`}>
                                    <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                    {bus.technicalStatus}
                                  </span>
                                </td>
                                <td className="px-5 py-4 text-center">
                                  {assignedWorkers.length > 0 ? (
                                    <div className="flex flex-wrap gap-1 justify-center">
                                      {assignedWorkers.map(w => (
                                        <span key={w.id} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md text-[10px] font-black">
                                          <Users className="w-3 h-3 text-indigo-500 shrink-0" />
                                          <span>{w.name}</span>
                                        </span>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2.5 py-1 rounded-lg text-[10px] font-bold">
                                      <AlertTriangle className="w-3 h-3 text-slate-400 shrink-0" />
                                      <span>غير معين له سائق</span>
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View Card List */}
                    <div className="block md:hidden space-y-4">
                      {filteredBusesInSelectedLocation.map(bus => {
                        const assignedWorkers = workers.filter(w => w.assignedBusId === bus.id);
                        let statusColor = 'bg-slate-100 text-slate-800 border-slate-200';
                        const status = bus.technicalStatus || '';
                        if (status.includes('ممتاز') || status.includes('جديد')) {
                          statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-100';
                        } else if (status.includes('جيد جداً')) {
                          statusColor = 'bg-teal-50 text-teal-700 border-teal-100';
                        } else if (status.includes('جيد')) {
                          statusColor = 'bg-amber-50 text-amber-700 border-amber-100';
                        } else if (status.includes('صيانة') || status.includes('متوقف') || status.includes('عطل')) {
                          statusColor = 'bg-rose-50 text-rose-700 border-rose-100';
                        }

                        return (
                          <div key={bus.id} className="bg-white p-4 rounded-xl border border-border shadow-sm space-y-3">
                            <div className="flex justify-between items-center border-b border-border/40 pb-2">
                              <span className="text-xs font-black text-primary font-mono">حافلة تشغيلية: #{bus.operationalNumber}</span>
                              <span className={`inline-flex items-center gap-1 px-2.5 py-1 border rounded-lg text-[9px] font-black ${statusColor}`}>
                                {bus.technicalStatus}
                              </span>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-[10px] text-text-muted font-bold">
                              <div>
                                <span className="block text-[8px] text-text-muted/60 mb-0.5">رقم اللوحة</span>
                                <span className="text-text-main font-mono">{bus.plateNumber}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] text-text-muted/60 mb-0.5">الفئة</span>
                                <span className="text-text-main">{bus.category}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] text-text-muted/60 mb-0.5">الماركة</span>
                                <span className="text-text-main">{bus.manufacturer || '—'}</span>
                              </div>
                              <div>
                                <span className="block text-[8px] text-text-muted/60 mb-0.5">الموديل</span>
                                <span className="text-text-main">{bus.model || '—'}</span>
                              </div>
                            </div>

                            {/* Assigned Drivers */}
                            <div className="bg-slate-50 p-2.5 rounded-lg border border-border/40">
                              <span className="block text-[8px] text-text-muted/70 font-bold mb-1">الكوادر المرتبطين (السائقين):</span>
                              {assignedWorkers.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {assignedWorkers.map(w => (
                                    <span key={w.id} className="inline-flex items-center gap-1 bg-indigo-50 text-indigo-700 border border-indigo-100 px-2 py-0.5 rounded-md text-[9px] font-black">
                                      <Users className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                                      <span>{w.name}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[9px] text-slate-500 font-bold flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3 text-slate-400 shrink-0" />
                                  <span>لم يتم تعيين سائق بعد</span>
                                </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>

              {/* Modal Footer */}
              <div className="bg-slate-50 border-t border-border/40 p-4 shrink-0 flex items-center justify-between text-[11px] font-bold text-text-muted">
                <span>يتم تحديث هذه البيانات ديناميكياً بناءً على إدخالات قسم التشغيل</span>
                <span>الحافلات المعروضة: {filteredBusesInSelectedLocation.length} من أصل {busesInSelectedLocation.length}</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Export Options Modal */}
      <AnimatePresence>
        {isExportModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setIsExportModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.95, y: 10, opacity: 0 }}
              className="bg-surface w-full max-w-lg rounded-3xl border border-border/80 shadow-2xl p-6 text-right space-y-6"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-border/60 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 bg-primary/10 rounded-xl flex items-center justify-center text-primary shadow-inner">
                    <Download className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-text-main">استخراج تقرير الإحصائيات الكاملة</h3>
                    <p className="text-[11px] text-text-muted font-bold">اختر صيغة الملف لاستخراج كافة إحصائيات الحافلات ومواقع العمل</p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExportModalOpen(false)}
                  className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-text-muted hover:bg-slate-100 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 gap-4">
                {/* Export Location Models Specifically */}
                <button
                  onClick={() => {
                    handleExportLocationModels(modelLocationFilter);
                    setIsExportModalOpen(false);
                  }}
                  className="p-4 bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/30 rounded-2xl flex items-center justify-between transition-all group cursor-pointer text-right hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-emerald-700 text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black text-sm text-emerald-950 dark:text-emerald-100 block">
                          تصدير إحصائية الموديلات والأنواع ومواقع العمل (Excel)
                        </span>
                        <span className="text-[10px] font-bold bg-emerald-600/20 text-emerald-800 dark:text-emerald-300 px-2 py-0.5 rounded-md">
                          مطلوب
                        </span>
                      </div>
                      <span className="text-[11px] font-bold text-emerald-800/80 dark:text-emerald-200/80 block mt-1 leading-relaxed">
                        ملف إكسل متخصص يوضح مكان العمل وعدد الحافلات مع الموديلات ونوع الحافلة وسنوات الصنع والمصفوفة التقاطعية الميدانية
                      </span>
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-emerald-700 dark:text-emerald-400 shrink-0 group-hover:translate-x-[-2px] transition-transform" />
                </button>

                {/* Export Full General Dashboard Stats */}
                <button
                  onClick={handleExportExcel}
                  className="p-4 bg-slate-50 hover:bg-slate-100/90 dark:bg-slate-800/60 dark:hover:bg-slate-800 border border-border rounded-2xl flex items-center justify-between transition-all group cursor-pointer text-right hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-primary text-white rounded-2xl flex items-center justify-center shrink-0 shadow-md group-hover:scale-105 transition-transform">
                      <FileSpreadsheet className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="font-black text-sm text-text-main block">التقرير الإحصائي الشامل للأسطول (Excel .xlsx)</span>
                      <span className="text-[11px] font-bold text-text-muted block mt-1 leading-relaxed">
                        يتضمن 4 صفحات تفصيلية (الملخص الإحصائي العام، إحصائيات مواقع العمل، مصفوفة الموديلات، وتفاصيل الأسطول والكوادر)
                      </span>
                    </div>
                  </div>
                  <Download className="w-5 h-5 text-primary shrink-0 group-hover:translate-x-[-2px] transition-transform" />
                </button>
              </div>

              <div className="pt-2 border-t border-border/40 flex justify-between items-center text-[10px] text-text-muted font-bold">
                <span>تحديث البيانات: {new Date().toLocaleDateString('ar-SA')}</span>
                <span>درة المنورة لنقل الحجاج والمعتمرين</span>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
