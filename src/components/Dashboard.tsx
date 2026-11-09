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
  Phone,
  PhoneCall,
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
  Award,
  UserCheck,
  Sparkles,
  Clock,
  Globe,
  Briefcase,
  Layers,
  Building2,
  GraduationCap,
  UserX
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
import { resolveDriverType, getDriverClassification, isDriverActiveInMonitoring, isWorkerActiveInMonitoring, isDriverEndedInMonitoring } from '../lib/driverUtils';
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
  onNavigateToDrivers?: () => void;
  onNavigateToFleet?: () => void;
}

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#8b5cf6'];

const NATIONALITY_METADATA: Record<string, { flag: string; color: string }> = {
  'مصري': { flag: '🇪🇬', color: '#0284c7' },
  'مصر': { flag: '🇪🇬', color: '#0284c7' },
  'هندي': { flag: '🇮🇳', color: '#10b981' },
  'الهند': { flag: '🇮🇳', color: '#10b981' },
  'باكستاني': { flag: '🇵🇰', color: '#f59e0b' },
  'باكستان': { flag: '🇵🇰', color: '#f59e0b' },
  'سوري': { flag: '🇸🇾', color: '#8b5cf6' },
  'سوريا': { flag: '🇸🇾', color: '#8b5cf6' },
  'يمني': { flag: '🇾🇪', color: '#ef4444' },
  'اليمن': { flag: '🇾🇪', color: '#ef4444' },
  'سوداني': { flag: '🇸🇩', color: '#06b6d4' },
  'السودان': { flag: '🇸🇩', color: '#06b6d4' },
  'بنغلاديشي': { flag: '🇧🇩', color: '#14b8a6' },
  'بنغلاديش': { flag: '🇧🇩', color: '#14b8a6' },
  'سعودي': { flag: '🇸🇦', color: '#15803d' },
  'السعودية': { flag: '🇸🇦', color: '#15803d' },
  'نيبالي': { flag: '🇳🇵', color: '#ec4899' },
  'نيبال': { flag: '🇳🇵', color: '#ec4899' },
  'أردني': { flag: '🇯🇴', color: '#6366f1' },
  'الأردن': { flag: '🇯🇴', color: '#6366f1' },
  'غير محدد': { flag: '🌐', color: '#64748b' },
};

const DEFAULT_CHART_COLORS = [
  '#0284c7', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', 
  '#06b6d4', '#14b8a6', '#ec4899', '#6366f1', '#64748b'
];

export const Dashboard: React.FC<DashboardProps> = ({ 
  buses, 
  workers = [], 
  profile, 
  workersCount = 0,
  driverResponses = [],
  companyDrivers = [],
  onOpenResponsePage,
  onOpenAnnouncement,
  onNavigateToDrivers,
  onNavigateToFleet
}) => {
  const totalBuses = buses.length;
  const [copiedResponseLink, setCopiedResponseLink] = useState(false);
  const [chartTab, setChartTab] = useState<'year' | 'brand'>('year');
  const [selectedLocation, setSelectedLocation] = useState<string | null>(null);
  const [modalSearch, setModalSearch] = useState('');
  const [modalCategoryFilter, setModalCategoryFilter] = useState('');
  const [modalStatusFilter, setModalStatusFilter] = useState('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Real connectivity status listener
  const [isOnline, setIsOnline] = useState<boolean>(() => 
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  React.useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleExportExcel = () => {
    exportDashboardStatsToExcel(buses, workers);
    setIsExportModalOpen(false);
  };

  const handleExportLocationModels = (locFilter: string = 'all') => {
    exportLocationModelStatsToExcel(buses, workers, locFilter);
  };

  // ── Driver Distribution by Nationality & Field Operation ────────────────
  const [driverOpChartFilter, setDriverOpChartFilter] = useState<'all' | 'نقل عمال' | 'عمرة' | 'النقل المدرسي' | 'النقل الدولي سوريا' | 'النقل الدولي اليمن'>('all');
  const [driverNationalityChartMode, setDriverNationalityChartMode] = useState<'bar' | 'donut'>('bar');
  const [selectedNationalityKey, setSelectedNationalityKey] = useState<string | null>(null);

  const driverNationalityData = React.useMemo(() => {
    const opMap: Record<string, {
      total: number;
      residents: number;
      seasonals: number;
      nationalities: Record<string, { count: number; resident: number; seasonal: number }>;
    }> = {
      'نقل عمال': { total: 0, residents: 0, seasonals: 0, nationalities: {} },
      'عمرة': { total: 0, residents: 0, seasonals: 0, nationalities: {} },
      'النقل المدرسي': { total: 0, residents: 0, seasonals: 0, nationalities: {} },
      'النقل الدولي سوريا': { total: 0, residents: 0, seasonals: 0, nationalities: {} },
      'النقل الدولي اليمن': { total: 0, residents: 0, seasonals: 0, nationalities: {} },
    };

    const overallMap: Record<string, {
      count: number;
      resident: number;
      seasonal: number;
      byOp: Record<string, number>;
    }> = {};

    let totalAll = 0;
    let totalResidents = 0;
    let totalSeasonals = 0;

    companyDrivers.forEach(d => {
      const classification = getDriverClassification(d, workers);
      // مستبعد تماماً من إحصائيات وأعداد المنظومة
      if (classification === 'خروج نهائي' || d.driverClassification === 'خروج نهائي') {
        return;
      }
      const effType = resolveDriverType(d);
      const isSeasonal = effType === 'موسمي';
      const nat = (d.nationality || '').trim() || 'غير محدد';

      totalAll++;
      if (isSeasonal) totalSeasonals++;
      else totalResidents++;

      if (!opMap[classification]) {
        opMap[classification] = { total: 0, residents: 0, seasonals: 0, nationalities: {} };
      }
      const opEntry = opMap[classification];
      opEntry.total++;
      if (isSeasonal) opEntry.seasonals++;
      else opEntry.residents++;

      if (!opEntry.nationalities[nat]) {
        opEntry.nationalities[nat] = { count: 0, resident: 0, seasonal: 0 };
      }
      opEntry.nationalities[nat].count++;
      if (isSeasonal) opEntry.nationalities[nat].seasonal++;
      else opEntry.nationalities[nat].resident++;

      if (!overallMap[nat]) {
        overallMap[nat] = { count: 0, resident: 0, seasonal: 0, byOp: {} };
      }
      overallMap[nat].count++;
      if (isSeasonal) overallMap[nat].seasonal++;
      else overallMap[nat].resident++;
      overallMap[nat].byOp[classification] = (overallMap[nat].byOp[classification] || 0) + 1;
    });

    return { opMap, overallMap, totalAll, totalResidents, totalSeasonals };
  }, [companyDrivers, workers]);

  const currentNationalityList = React.useMemo(() => {
    interface NationalityDataRecord {
      count: number;
      resident: number;
      seasonal: number;
      byOp?: Record<string, number>;
    }

    if (driverOpChartFilter === 'all') {
      const total = driverNationalityData.totalAll;
      const entries = Object.entries(driverNationalityData.overallMap) as [string, NationalityDataRecord][];
      return entries
        .map(([nationality, data], idx) => {
          const meta = NATIONALITY_METADATA[nationality] || {
            flag: '🌐',
            color: DEFAULT_CHART_COLORS[idx % DEFAULT_CHART_COLORS.length]
          };
          return {
            nationality,
            count: data.count,
            resident: data.resident,
            seasonal: data.seasonal,
            percentage: total > 0 ? (data.count / total) * 100 : 0,
            color: meta.color,
            flag: meta.flag,
            byOp: data.byOp
          };
        })
        .sort((a, b) => b.count - a.count);
    } else {
      const opEntry = driverNationalityData.opMap[driverOpChartFilter] || { total: 0, nationalities: {} };
      const total = opEntry.total;
      const entries = Object.entries(opEntry.nationalities) as [string, NationalityDataRecord][];
      return entries
        .map(([nationality, data], idx) => {
          const meta = NATIONALITY_METADATA[nationality] || {
            flag: '🌐',
            color: DEFAULT_CHART_COLORS[idx % DEFAULT_CHART_COLORS.length]
          };
          return {
            nationality,
            count: data.count,
            resident: data.resident,
            seasonal: data.seasonal,
            percentage: total > 0 ? (data.count / total) * 100 : 0,
            color: meta.color,
            flag: meta.flag
          };
        })
        .sort((a, b) => b.count - a.count);
    }
  }, [driverNationalityData, driverOpChartFilter]);

  const activeFilterTotal = driverOpChartFilter === 'all'
    ? driverNationalityData.totalAll
    : (driverNationalityData.opMap[driverOpChartFilter]?.total || 0);

  // Driver statistics: مقيم - موسمي - نقل عمال - عمرة - دولي سوريا - دولي اليمن - نشط - في إجازة - مستبعد - بالرقابة
  const driverStats = React.useMemo(() => {
    let resident = 0;
    let seasonal = 0;
    const laborTransport = { total: 0, resident: 0, seasonal: 0 };
    const schoolTransport = { total: 0, resident: 0, seasonal: 0 };
    const umrah = { total: 0, resident: 0, seasonal: 0 };
    const intlSyria = { total: 0, resident: 0, seasonal: 0 };
    const intlYemen = { total: 0, resident: 0, seasonal: 0 };
    let active = 0;
    let onLeave = 0;
    let excluded = 0;
    let activeInMonitoring = 0;
    let assignedBuses = 0;
    let total = 0;

    companyDrivers.forEach(d => {
      const classification = getDriverClassification(d, workers);
      // مستبعد تماماً من إحصائيات وأعداد المنظومة
      if (classification === 'خروج نهائي' || d.driverClassification === 'خروج نهائي' || d.status === 'خروج نهائي' || d.status === 'مستبعد') {
        return;
      }

      total++;

      // 1. Legal Document / Type (مقيم / موسمي)
      const effType = resolveDriverType(d);
      const isSeasonal = effType === 'موسمي';
      if (isSeasonal) {
        seasonal++;
      } else {
        resident++;
      }

      // 2. Operational Classification (نقل عمال / النقل المدرسي / عمرة / النقل الدولي سوريا / النقل الدولي اليمن)
      if (classification === 'النقل المدرسي') {
        schoolTransport.total++;
        if (isSeasonal) schoolTransport.seasonal++;
        else schoolTransport.resident++;
      } else if (classification === 'عمرة') {
        umrah.total++;
        if (isSeasonal) umrah.seasonal++;
        else umrah.resident++;
      } else if (classification === 'النقل الدولي سوريا') {
        intlSyria.total++;
        if (isSeasonal) intlSyria.seasonal++;
        else intlSyria.resident++;
      } else if (classification === 'النقل الدولي اليمن') {
        intlYemen.total++;
        if (isSeasonal) intlYemen.seasonal++;
        else intlYemen.resident++;
      } else {
        laborTransport.total++;
        if (isSeasonal) laborTransport.seasonal++;
        else laborTransport.resident++;
      }

      // 3. Status (نشط / في إجازة / مستبعد)
      const st = (d.status || 'نشط').trim();
      if (st === 'في إجازة' || st.includes('إجازة') || st.includes('اجازة')) {
        onLeave++;
      } else if (st === 'مستبعد' || st.includes('مستبعد')) {
        excluded++;
      } else {
        active++;
      }

      // 4. Monitoring match
      if (isDriverActiveInMonitoring(d, workers)) {
        activeInMonitoring++;
      }

      // 5. Assigned bus
      if (d.busNumber && d.busNumber.trim()) {
        assignedBuses++;
      }
    });

    return {
      total,
      resident,
      seasonal,
      laborTransport,
      schoolTransport,
      umrah,
      intlSyria,
      intlYemen,
      active,
      onLeave,
      excluded,
      activeInMonitoring,
      assignedBuses
    };
  }, [companyDrivers, workers]);



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

  // Helper to resolve only the active driver and their phone number for any bus
  const getBusDrivers = React.useCallback((bus: BusType) => {
    const today = new Date().toISOString().split('T')[0];
    const opNum = String(bus.operationalNumber || '').trim();
    const plateNum = String(bus.plateNumber || '').trim();

    // 1. Direct active assigned workers from workers collection (الرقابة والمتابعة)
    const activeAssignedWorkers = workers.filter(w => {
      const isAssigned = (
        (w.assignedBusId && w.assignedBusId === bus.id) ||
        (w.assignedBusOperationalNumber && String(w.assignedBusOperationalNumber).trim() === opNum) ||
        (w.assignedBusPlateNumber && String(w.assignedBusPlateNumber).trim() === plateNum)
      );
      if (!isAssigned) return false;
      return isWorkerActiveInMonitoring(w, today);
    });

    if (activeAssignedWorkers.length > 0) {
      // Sort by startDate descending (or workerNumber / id) to pick the most recent active assignment
      const sorted = [...activeAssignedWorkers].sort((a, b) => {
        const dateA = a.startDate || '';
        const dateB = b.startDate || '';
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return (b.workerNumber || 0) - (a.workerNumber || 0);
      });
      const activeWorker = sorted[0];

      let phone = (activeWorker.mobileNumber || '').trim();
      if (!phone) {
        const matchCd = companyDrivers.find(cd => 
          (activeWorker.iqamaNumber && cd.iqamaNumber && cd.iqamaNumber.trim() === activeWorker.iqamaNumber.trim()) ||
          (activeWorker.name && cd.fullName && cd.fullName.trim() === activeWorker.name.trim())
        );
        if (matchCd?.mobileNumber) {
          phone = matchCd.mobileNumber.trim();
        }
      }

      return [{
        id: activeWorker.id,
        name: activeWorker.name,
        phone,
        iqama: activeWorker.iqamaNumber
      }];
    }

    // 2. Fallback: Only if NO active worker is assigned in monitoring, check active companyDrivers
    const activeCompanyDrivers = companyDrivers.filter(d => {
      if (d.driverClassification === 'خروج نهائي' || (d.statusReason && d.statusReason.includes('خروج نهائي'))) return false;
      if (!d.busNumber) return false;
      const bNum = String(d.busNumber).trim();
      const matches = bNum === opNum || bNum === `#${opNum}` || bNum === plateNum;
      if (!matches) return false;

      // Driver status check
      const st = (d.status || 'نشط').trim();
      if (st === 'خروج نهائي' || st === 'مستبعد' || st.includes('مستبعد') || st.includes('خروج نهائي') || st === 'في إجازة' || st.includes('إجازة')) return false;

      // Check if driver has an ended assignment in monitoring
      if (isDriverEndedInMonitoring(d, workers, today)) return false;

      return true;
    });

    if (activeCompanyDrivers.length > 0) {
      const cd = activeCompanyDrivers[0];
      return [{
        id: cd.id,
        name: cd.fullName,
        phone: (cd.mobileNumber || '').trim(),
        iqama: cd.iqamaNumber
      }];
    }

    return [];
  }, [workers, companyDrivers]);

  const filteredBusesInSelectedLocation = React.useMemo(() => {
    return busesInSelectedLocation.filter(bus => {
      const searchLower = modalSearch.trim().toLowerCase();
      const opNum = (bus.operationalNumber || '').toLowerCase();
      const plateNum = (bus.plateNumber || '').toLowerCase();
      const category = (bus.category || '').toLowerCase();
      const manufacturer = (bus.manufacturer || '').toLowerCase();

      const busDrivers = getBusDrivers(bus);
      const driverMatch = Boolean(searchLower && busDrivers.some(d => 
        (d.name || '').toLowerCase().includes(searchLower) ||
        (d.phone || '').includes(searchLower)
      ));

      const searchMatch = !searchLower || 
        opNum.includes(searchLower) || 
        plateNum.includes(searchLower) || 
        category.includes(searchLower) || 
        manufacturer.includes(searchLower) ||
        driverMatch;
      
      const categoryMatch = !modalCategoryFilter || bus.category === modalCategoryFilter;
      const statusMatch = !modalStatusFilter || bus.technicalStatus === modalStatusFilter;
      
      return searchMatch && categoryMatch && statusMatch;
    });
  }, [busesInSelectedLocation, modalSearch, modalCategoryFilter, modalStatusFilter, getBusDrivers]);

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

      {/* 1. Operations Hub & Readiness Summary Top Bar — Executive Operations UI */}
      <motion.div 
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-5 sm:p-6 bg-gradient-to-br from-[#07152B] via-[#0A1A33] to-[#112746] text-white rounded-[20px] shadow-xl shadow-[#07152B]/30 border border-white/10 overflow-hidden relative"
      >
        {/* Soft Ambient Corner Glows */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-[#2563EB]/15 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#00A88B]/10 rounded-full blur-3xl pointer-events-none -ml-20 -mb-20" />

        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-6 relative z-10">
          {/* Right/Main Info */}
          <div className="flex-1 text-right space-y-3.5 w-full">
            {/* Operations Center Badge & Executive Statement Button */}
            <div className="flex items-center justify-between flex-wrap gap-2.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.06] border border-white/15 backdrop-blur-md text-[11px] font-bold text-slate-200">
                <span className="relative flex h-2 w-2 shrink-0">
                  {isOnline ? (
                    <>
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-[#10B981]" />
                    </>
                  ) : (
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
                  )}
                </span>
                <span className="font-sans">مركز العمليات والمراقبة اللحظية — شركة درة المنورة للنقليات</span>
                <span className={`text-[10px] font-medium ${isOnline ? 'text-emerald-400' : 'text-amber-400'}`}>
                  ({isOnline ? 'متصل' : 'غير متصل'})
                </span>
              </div>

              {onOpenAnnouncement && (
                <button
                  id="open-announcement-btn"
                  type="button"
                  onClick={onOpenAnnouncement}
                  className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#E8B44D] hover:bg-[#f3c666] text-[#07152B] rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shadow-md shadow-[#E8B44D]/25 active:scale-95 border border-[#f8d78f] group"
                  title="عرض بيان وتوجيهات إدارة مكتب التشغيل"
                >
                  <Award className="w-4 h-4 text-[#07152B] group-hover:rotate-6 transition-transform" />
                  <span>بيان إدارة مكتب التشغيل</span>
                </button>
              )}
            </div>

            {/* Title & Description */}
            <div className="space-y-1.5">
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5 font-cairo">
                <span className="w-1.5 h-7 sm:h-8 bg-[#2563EB] rounded-full inline-block shrink-0 shadow-sm shadow-[#2563EB]/60" />
                <span>لوحة القيادة والمتابعة التشغيلية الشاملة</span>
              </h2>

              <p className="text-xs sm:text-sm text-slate-300 font-medium leading-relaxed max-w-3xl">
                نظام الفحص والتحليل الميداني المباشر لإدارة أسطول الحافلات وتوزيع الكوادر والسائقين والمعتمرين عبر مسارات نقل العمال والعمرة والنقل الدولي.
              </p>
            </div>

            {/* Operational Indicators: Mini KPI Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
              {/* الأسطول */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-[#2563EB]/40 transition-all duration-200 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-lg bg-[#2563EB]/20 border border-[#2563EB]/30 flex items-center justify-center shrink-0">
                  <Bus className="w-4 h-4 text-sky-400" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-slate-300 truncate">الأسطول</span>
                  <span className="block text-sm sm:text-base font-black font-mono text-white tabular-nums leading-tight">
                    {totalBuses} <span className="text-[10px] font-normal text-slate-400">حافلة</span>
                  </span>
                </div>
              </div>

              {/* السائقون */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-indigo-500/40 transition-all duration-200 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0">
                  <Users className="w-4 h-4 text-indigo-300" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-slate-300 truncate">السائقون</span>
                  <span className="block text-sm sm:text-base font-black font-mono text-white tabular-nums leading-tight">
                    {driverStats.total} <span className="text-[10px] font-normal text-slate-400">سائق</span>
                  </span>
                </div>
              </div>

              {/* مواقع العمل */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] border border-white/10 hover:border-[#E8B44D]/40 transition-all duration-200 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-lg bg-[#E8B44D]/20 border border-[#E8B44D]/30 flex items-center justify-center shrink-0">
                  <MapPin className="w-4 h-4 text-amber-300" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-slate-300 truncate">مواقع العمل</span>
                  <span className="block text-sm sm:text-base font-black font-mono text-white tabular-nums leading-tight">
                    {Object.keys(locationCounts).length} <span className="text-[10px] font-normal text-slate-400">موقع</span>
                  </span>
                </div>
              </div>

              {/* الربط الميداني */}
              <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-[#00A88B]/10 hover:bg-[#00A88B]/15 border border-[#00A88B]/30 hover:border-[#00A88B]/50 transition-all duration-200 backdrop-blur-xs">
                <div className="w-8 h-8 rounded-lg bg-[#00A88B]/20 border border-[#00A88B]/40 flex items-center justify-center shrink-0">
                  <Activity className="w-4 h-4 text-emerald-300" />
                </div>
                <div className="min-w-0">
                  <span className="block text-[10px] font-bold text-emerald-200 truncate">الربط الميداني</span>
                  <span className="block text-sm sm:text-base font-black font-mono text-emerald-300 tabular-nums leading-tight">
                    {isOnline ? '100%' : '90%'} <span className="text-[10px] font-normal text-emerald-400">{isOnline ? 'متزامن' : 'مؤقت'}</span>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Left: Technical Readiness Indicator Card */}
          <div className="w-full lg:w-auto shrink-0 bg-[#07152B]/85 backdrop-blur-md p-4 sm:p-4.5 rounded-[18px] border border-white/10 shadow-lg flex items-center justify-between sm:justify-start gap-4 sm:gap-5">
            {/* Circular Progress Gauge */}
            <div className="relative w-20 h-20 sm:w-22 sm:h-22 flex items-center justify-center shrink-0">
              <svg className="w-full h-full transform -rotate-90" viewBox="0 0 96 96">
                <circle
                  cx="48"
                  cy="48"
                  r="37"
                  className="stroke-white/10"
                  strokeWidth="7"
                  fill="transparent"
                />
                <circle
                  cx="48"
                  cy="48"
                  r="37"
                  stroke={readinessScore >= 95 ? '#10B981' : readinessScore >= 80 ? '#2563EB' : '#E8B44D'}
                  strokeWidth="7"
                  fill="transparent"
                  strokeDasharray="232.48"
                  strokeDashoffset={232.48 - (readinessScore / 100) * 232.48}
                  strokeLinecap="round"
                  className="transition-all duration-1000 ease-out"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-xl sm:text-2xl font-black font-mono text-white leading-none tabular-nums">
                  %{readinessScore}
                </span>
                <span className="text-[9px] font-bold text-emerald-400 mt-1 uppercase">
                  جاهزية الأسطول
                </span>
              </div>
            </div>

            {/* Details & Action Button */}
            <div className="space-y-2 text-right">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-slate-300 block">
                  مؤشر الجاهزية الفنية:
                </span>
                <span className={`inline-block text-[11px] font-black px-2.5 py-0.5 rounded-full border ${
                  readinessScore >= 95
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : readinessScore >= 80
                    ? 'bg-blue-500/20 text-blue-300 border-blue-500/30'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {readinessScore >= 95 ? 'ممتاز (جاهزية قصوى)' : readinessScore >= 80 ? 'جيد جداً للعمل' : 'يحتاج فحص وصيانة'}
                </span>
              </div>

              <div className="pt-0.5">
                <button
                  type="button"
                  onClick={() => setIsExportModalOpen(true)}
                  className="w-full px-3.5 py-1.5 bg-[#2563EB] hover:bg-[#1d4ed8] text-white rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shadow-md shadow-[#2563EB]/25 flex items-center justify-center gap-1.5 active:scale-95"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5" />
                  <span>فحص فوري وتصدير</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ============================================================== */}
      {/* 2. القسم الأول: إحصائية وتصنيفات أسطول السائقين                */}
      {/* ============================================================== */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="soft-panel p-5 sm:p-6 bg-surface rounded-3xl border-2 border-indigo-100 dark:border-indigo-950/60 shadow-sm space-y-6"
      >
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-border/80">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0 shadow-2xs">
              <Users className="w-6 h-6" />
            </div>
            <div className="text-right">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg sm:text-xl font-black text-slate-900 dark:text-white">
                  إحصائية وتصنيفات أسطول السائقين
                </h3>
                <span className="text-xs font-black text-indigo-700 dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/50 px-2.5 py-0.5 rounded-full border border-indigo-200/60">
                  كافة الكوادر المسجلة
                </span>
              </div>
              <p className="text-xs text-text-muted font-bold mt-0.5">
                توضيح شامل لكوادر وسائقي الشركة بحسب الوثيقة النظامية، ونوع العمل والتشغيل الميداني، والجاهزية الوظيفية
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {onNavigateToDrivers && (
              <button
                type="button"
                onClick={onNavigateToDrivers}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-black text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition-all shadow-sm shadow-indigo-600/20 cursor-pointer active:scale-95"
                title="فتح سجل وإدارة سائقين الشركة بالكامل"
              >
                <span>فتح سجل السائقين</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </button>
            )}
            <div className="text-center bg-indigo-50 dark:bg-indigo-950/40 px-3.5 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800">
              <span className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold block leading-tight">إجمالي السائقين</span>
              <span className="text-xl font-black text-indigo-900 dark:text-indigo-200 font-mono leading-none">{driverStats.total}</span>
            </div>
          </div>
        </div>

        {/* Group 1: تصنيف الوثيقة والصفة النظامية */}
        <div className="space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200">
            <span className="w-1.5 h-4 rounded-full bg-emerald-500" />
            <span>أولاً: تصنيف الصفة والوثيقة النظامية (الوثائق الرسمية)</span>
            <span className="text-[10px] text-text-muted font-normal">(مقيم بإقامة نظامية دائمة / موسمي برقم حدود)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* مقيم */}
            <div 
              onClick={onNavigateToDrivers}
              className={`p-4 rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/60 flex items-center justify-between gap-4 transition-all shadow-2xs ${onNavigateToDrivers ? 'hover:border-emerald-400 hover:shadow-xs cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 flex items-center justify-center shrink-0">
                  <UserCheck className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-emerald-900 dark:text-emerald-200">
                    سائق مقيم (إقامة نظامية)
                  </div>
                  <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
                    سائقون مسجلون بإقامة نظامية سارية المفعول على كفالة أو عقود عمل مستمرة
                  </p>
                </div>
              </div>
              <div className="text-left shrink-0">
                <span className="text-3xl font-black text-emerald-700 dark:text-emerald-300 font-mono leading-none block">
                  {driverStats.resident}
                </span>
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold">
                  سائق مقيم
                </span>
              </div>
            </div>

            {/* موسمي */}
            <div 
              onClick={onNavigateToDrivers}
              className={`p-4 rounded-2xl bg-purple-50/70 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex items-center justify-between gap-4 transition-all shadow-2xs ${onNavigateToDrivers ? 'hover:border-purple-400 hover:shadow-xs cursor-pointer' : ''}`}
            >
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center shrink-0">
                  <Sparkles className="w-6 h-6" />
                </div>
                <div className="text-right">
                  <div className="text-sm font-black text-purple-900 dark:text-purple-200">
                    سائق موسمي (رقم حدود)
                  </div>
                  <p className="text-[11px] text-purple-700 dark:text-purple-400 font-semibold mt-0.5">
                    سائقون مستقدمون بتأشيرات موسمية برقم حدود لتشغيل مواسم الحج والعمرة والذروة
                  </p>
                </div>
              </div>
              <div className="text-left shrink-0">
                <span className="text-3xl font-black text-purple-700 dark:text-purple-300 font-mono leading-none block">
                  {driverStats.seasonal}
                </span>
                <span className="text-[10px] text-purple-600 dark:text-purple-400 font-bold">
                  سائق موسمي
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Group 2: تصنيف نوع العمل والتشغيل الميداني */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200">
              <span className="w-1.5 h-4 rounded-full bg-blue-500" />
              <span>ثانياً: تصنيف نوع العمل والتشغيل الميداني (مسارات العمل)</span>
            </div>
            <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-0.5 rounded-full border border-border">
              توزيع الكوادر: المقيمين • الموسمين • المجموع الكامل
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3.5">
            {/* 1. نقل عمال */}
            <div 
              onClick={onNavigateToDrivers}
              className={`p-4 rounded-2xl bg-sky-50/80 dark:bg-sky-950/30 border border-sky-200 dark:border-sky-800/60 flex flex-col justify-between gap-3 transition-all shadow-2xs ${onNavigateToDrivers ? 'hover:border-sky-400 hover:scale-102 cursor-pointer' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-sky-950 dark:text-sky-200">نقل عمال</span>
                  <div className="w-8 h-8 rounded-lg bg-sky-100 dark:bg-sky-900/60 text-sky-700 dark:text-sky-300 flex items-center justify-center">
                    <Bus className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-sky-800 dark:text-sky-300/80 font-medium leading-snug">
                  عقود تشغيل المصانع ونقل الكوادر والشركات (أمكور، رابغ، نيوم...)
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-sky-200/70 dark:border-sky-800/60">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">المجموع الكامل</span>
                  <span className="text-2xl font-black text-sky-700 dark:text-sky-300 font-mono">
                    {driverStats.laborTransport.total}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-dashed border-sky-200/80 dark:border-sky-800/60">
                  <div className="px-2 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300/70 dark:border-emerald-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">مقيمين:</span>
                    <span className="text-sm font-black font-mono text-emerald-800 dark:text-emerald-200">
                      {driverStats.laborTransport.resident}
                    </span>
                  </div>
                  <div className="px-2 py-1 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 border border-purple-300/70 dark:border-purple-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-900 dark:text-purple-300">موسمين:</span>
                    <span className="text-sm font-black font-mono text-purple-800 dark:text-purple-200">
                      {driverStats.laborTransport.seasonal}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 2. النقل المدرسي (ينبع - محايل عسير - القصيم) */}
            <div 
              onClick={onNavigateToDrivers}
              className={`p-4 rounded-2xl bg-amber-50/90 dark:bg-amber-950/30 border-2 border-amber-300 dark:border-amber-700/80 flex flex-col justify-between gap-3 transition-all shadow-2xs ${onNavigateToDrivers ? 'hover:border-amber-500 hover:scale-102 cursor-pointer' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-black text-amber-950 dark:text-amber-200">النقل المدرسي</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-200/70 dark:bg-amber-900 text-amber-900 dark:text-amber-200">
                      مدارس
                    </span>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-200/80 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center justify-center">
                    <GraduationCap className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-amber-900 dark:text-amber-300/90 font-bold leading-snug">
                  مسارات وعقود المدارس والتعليم (ينبع - محايل عسير - القصيم)
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-amber-300/70 dark:border-amber-800/60">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">المجموع الكامل</span>
                  <span className="text-2xl font-black text-amber-800 dark:text-amber-300 font-mono">
                    {driverStats.schoolTransport.total}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-dashed border-amber-300/80 dark:border-amber-800/60">
                  <div className="px-2 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300/70 dark:border-emerald-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">مقيمين:</span>
                    <span className="text-sm font-black font-mono text-emerald-800 dark:text-emerald-200">
                      {driverStats.schoolTransport.resident}
                    </span>
                  </div>
                  <div className="px-2 py-1 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 border border-purple-300/70 dark:border-purple-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-900 dark:text-purple-300">موسمين:</span>
                    <span className="text-sm font-black font-mono text-purple-800 dark:text-purple-200">
                      {driverStats.schoolTransport.seasonal}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 3. عمرة */}
            <div 
              onClick={onNavigateToDrivers}
              className={`p-4 rounded-2xl bg-orange-50/80 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800/60 flex flex-col justify-between gap-3 transition-all shadow-2xs ${onNavigateToDrivers ? 'hover:border-orange-400 hover:scale-102 cursor-pointer' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-orange-950 dark:text-orange-200">عمرة</span>
                  <div className="w-8 h-8 rounded-lg bg-orange-100 dark:bg-orange-900/60 text-orange-700 dark:text-orange-300 flex items-center justify-center">
                    <MapPin className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-orange-800 dark:text-orange-300/80 font-medium leading-snug">
                  رحلات ضيوف الرحمن، مسارات مكة والمدينة والمطارات والمزارات
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-orange-200/70 dark:border-orange-800/60">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">المجموع الكامل</span>
                  <span className="text-2xl font-black text-orange-700 dark:text-orange-300 font-mono">
                    {driverStats.umrah.total}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-dashed border-orange-200/80 dark:border-orange-800/60">
                  <div className="px-2 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300/70 dark:border-emerald-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">مقيمين:</span>
                    <span className="text-sm font-black font-mono text-emerald-800 dark:text-emerald-200">
                      {driverStats.umrah.resident}
                    </span>
                  </div>
                  <div className="px-2 py-1 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 border border-purple-300/70 dark:border-purple-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-900 dark:text-purple-300">موسمين:</span>
                    <span className="text-sm font-black font-mono text-purple-800 dark:text-purple-200">
                      {driverStats.umrah.seasonal}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 4. النقل الدولي سوريا */}
            <div 
              onClick={onNavigateToDrivers}
              className={`p-4 rounded-2xl bg-teal-50/80 dark:bg-teal-950/30 border border-teal-200 dark:border-teal-800/60 flex flex-col justify-between gap-3 transition-all shadow-2xs ${onNavigateToDrivers ? 'hover:border-teal-400 hover:scale-102 cursor-pointer' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-teal-950 dark:text-teal-200">النقل الدولي سوريا</span>
                  <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/60 text-teal-700 dark:text-teal-300 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-teal-800 dark:text-teal-300/80 font-medium leading-snug">
                  خطوط الشام والنقل الدولي الخارجي المباشر لنقل الركاب والمعتمرين
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-teal-200/70 dark:border-teal-800/60">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">المجموع الكامل</span>
                  <span className="text-2xl font-black text-teal-700 dark:text-teal-300 font-mono">
                    {driverStats.intlSyria.total}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-dashed border-teal-200/80 dark:border-teal-800/60">
                  <div className="px-2 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300/70 dark:border-emerald-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">مقيمين:</span>
                    <span className="text-sm font-black font-mono text-emerald-800 dark:text-emerald-200">
                      {driverStats.intlSyria.resident}
                    </span>
                  </div>
                  <div className="px-2 py-1 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 border border-purple-300/70 dark:border-purple-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-900 dark:text-purple-300">موسمين:</span>
                    <span className="text-sm font-black font-mono text-purple-800 dark:text-purple-200">
                      {driverStats.intlSyria.seasonal}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. النقل الدولي اليمن */}
            <div 
              onClick={onNavigateToDrivers}
              className={`p-4 rounded-2xl bg-purple-50/80 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-800/60 flex flex-col justify-between gap-3 transition-all shadow-2xs ${onNavigateToDrivers ? 'hover:border-purple-400 hover:scale-102 cursor-pointer' : ''}`}
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-black text-purple-950 dark:text-purple-200">النقل الدولي اليمن</span>
                  <div className="w-8 h-8 rounded-lg bg-purple-100 dark:bg-purple-900/60 text-purple-700 dark:text-purple-300 flex items-center justify-center">
                    <Globe className="w-4 h-4" />
                  </div>
                </div>
                <p className="text-[11px] text-purple-800 dark:text-purple-300/80 font-medium leading-snug">
                  خطوط ومسارات منفذ الوديعة البري والمدن اليمنية لنقل الركاب والزوار
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-purple-200/70 dark:border-purple-800/60">
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-black text-slate-700 dark:text-slate-300">المجموع الكامل</span>
                  <span className="text-2xl font-black text-purple-700 dark:text-purple-300 font-mono">
                    {driverStats.intlYemen.total}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-dashed border-purple-200/80 dark:border-purple-800/60">
                  <div className="px-2 py-1 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/60 border border-emerald-300/70 dark:border-emerald-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-emerald-900 dark:text-emerald-300">مقيمين:</span>
                    <span className="text-sm font-black font-mono text-emerald-800 dark:text-emerald-200">
                      {driverStats.intlYemen.resident}
                    </span>
                  </div>
                  <div className="px-2 py-1 rounded-xl bg-purple-100/70 dark:bg-purple-950/60 border border-purple-300/70 dark:border-purple-800/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-purple-900 dark:text-purple-300">موسمين:</span>
                    <span className="text-sm font-black font-mono text-purple-800 dark:text-purple-200">
                      {driverStats.intlYemen.seasonal}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Group 3: تصنيف الحالة الوظيفية والجاهزية */}
        <div className="space-y-2.5 pt-2 border-t border-border/60">
          <div className="flex items-center gap-2 text-xs font-black text-slate-800 dark:text-slate-200">
            <span className="w-1.5 h-4 rounded-full bg-slate-500" />
            <span>ثالثاً: تصنيف الحالة التشغيلية والجاهزية الميدانية</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div 
              onClick={onNavigateToDrivers}
              className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border flex items-center justify-between cursor-pointer hover:border-emerald-400 transition-all"
            >
              <div>
                <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-400 block">سائق نشط</span>
                <span className="text-[10px] text-text-muted">متاح وجاهز للتشغيل</span>
              </div>
              <span className="text-xl font-black text-emerald-600 dark:text-emerald-400 font-mono">{driverStats.active}</span>
            </div>

            <div 
              onClick={onNavigateToDrivers}
              className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border flex items-center justify-between cursor-pointer hover:border-amber-400 transition-all"
            >
              <div>
                <span className="text-[11px] font-bold text-amber-700 dark:text-amber-400 block">في إجازة</span>
                <span className="text-[10px] text-text-muted">إجازة دورية / سنوية</span>
              </div>
              <span className="text-xl font-black text-amber-600 dark:text-amber-400 font-mono">{driverStats.onLeave}</span>
            </div>

            <div 
              onClick={onNavigateToDrivers}
              className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border flex items-center justify-between cursor-pointer hover:border-rose-400 transition-all"
            >
              <div>
                <span className="text-[11px] font-bold text-rose-700 dark:text-rose-400 block">خروج نهائي</span>
                <span className="text-[10px] text-text-muted">سجلات مؤرشفة ومقفلة</span>
              </div>
              <span className="text-xl font-black text-rose-600 dark:text-rose-400 font-mono">
                {companyDrivers.filter(d => d.driverClassification === 'خروج نهائي' || d.status === 'خروج نهائي' || d.status === 'مستبعد').length}
              </span>
            </div>

            <div 
              onClick={onNavigateToDrivers}
              className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-border flex items-center justify-between cursor-pointer hover:border-cyan-400 transition-all"
            >
              <div>
                <span className="text-[11px] font-bold text-cyan-700 dark:text-cyan-400 block">بالرقابة والمتابعة</span>
                <span className="text-[10px] text-text-muted">مطابق لسجل نشط</span>
              </div>
              <span className="text-xl font-black text-cyan-600 dark:text-cyan-400 font-mono">{driverStats.activeInMonitoring}</span>
            </div>
          </div>
        </div>
      </motion.div>



      {/* ============================================================== */}
      {/* 4. شريط الإشراف والمتابعة والتوقيع اليدوي الرسمي                */}
      {/* ============================================================== */}
      <motion.div 
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="soft-panel p-4 bg-surface rounded-2xl border border-border shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5"
      >
        <div className="flex items-center gap-2 text-text-muted flex-wrap">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block animate-pulse shrink-0"></span>
          <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
            إشراف ومتابعة إدارة التشغيل:
          </span>
          <span 
            className="font-handwriting text-lg sm:text-xl text-primary font-bold tracking-normal select-none inline-block drop-shadow-2xs hover:scale-105 transition-transform"
            style={{ fontFamily: "'Aref Ruqaa', cursive", transform: 'rotate(-1.5deg)' }}
            title="إشراف ومتابعة إدارة التشغيل: الاستاذ عبد الحميد سالمة"
          >
            الاستاذ عبد الحميد سالمة
          </span>
        </div>
        <div className="flex items-center gap-2 self-end sm:self-auto">
          <span className="text-xs text-text-muted font-bold">إعداد وتدقيق:</span>
          <span 
            className="font-handwriting text-lg sm:text-xl text-primary font-bold tracking-normal select-none inline-block drop-shadow-2xs hover:scale-105 transition-transform"
            style={{ fontFamily: "'Aref Ruqaa', cursive", transform: 'rotate(-1.5deg)' }}
            title="إعداد وتدقيق: أحمد عبد الجليل"
          >
            أحمد عبد الجليل
          </span>
        </div>
      </motion.div>

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

        {/* ============================================================== */}
        {/* Driver Nationality by Operation Chart (توزيع السائقين حسب الجنسية ونوع العمل) */}
        {/* ============================================================== */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 bg-surface p-6 rounded-2xl border border-border shadow-xs min-h-[440px] h-auto flex flex-col justify-between"
        >
          {/* Card Header & Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 border-b border-border pb-4">
             <div className="text-right">
               <h3 className="text-sm sm:text-base font-extrabold flex items-center gap-2 text-slate-900 dark:text-white">
                 <Globe className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                 <span>توزيع السائقين حسب الجنسية ونوع العمل الميداني</span>
               </h3>
               <p className="text-[11px] text-slate-700 dark:text-slate-300 font-semibold mt-0.5">
                 مخطط تحليلي لجنسيات السائقين وأعدادهم في نقل العمال، العمرة، النقل المدرسي، والنقل الدولي
               </p>
             </div>
             
             {/* Chart Type Toggle (Bar / Pie) */}
             <div className="flex items-center gap-2 self-start sm:self-auto shrink-0">
               <div className="flex bg-[#FAF9F6] dark:bg-background p-1 rounded-xl border border-border">
                 <button
                   onClick={() => setDriverNationalityChartMode('bar')}
                   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                     driverNationalityChartMode === 'bar'
                       ? 'bg-surface text-primary shadow-xs border border-border'
                       : 'text-text-muted hover:text-text-main'
                   }`}
                   title="عرض بياني شريطي (Bar Chart)"
                 >
                   <BarChart3 className="w-3.5 h-3.5" />
                   <span>أعمدة (Bar)</span>
                 </button>
                 <button
                   onClick={() => setDriverNationalityChartMode('donut')}
                   className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                     driverNationalityChartMode === 'donut'
                       ? 'bg-surface text-primary shadow-xs border border-border'
                       : 'text-text-muted hover:text-text-main'
                   }`}
                   title="عرض دائري مجوف (Donut Chart)"
                 >
                   <PieChartIcon className="w-3.5 h-3.5" />
                   <span>دائري (Pie)</span>
                 </button>
               </div>
             </div>
          </div>

          {/* Operation Filter Buttons / Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-none" dir="rtl">
            <button
              onClick={() => {
                setDriverOpChartFilter('all');
                setSelectedNationalityKey(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                driverOpChartFilter === 'all'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <span>جميع المسارات</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                driverOpChartFilter === 'all' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {driverNationalityData.totalAll}
              </span>
            </button>

            <button
              onClick={() => {
                setDriverOpChartFilter('نقل عمال');
                setSelectedNationalityKey(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                driverOpChartFilter === 'نقل عمال'
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Bus className="w-3.5 h-3.5" />
              <span>نقل عمال</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                driverOpChartFilter === 'نقل عمال' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {driverNationalityData.opMap['نقل عمال']?.total || 0}
              </span>
            </button>

            <button
              onClick={() => {
                setDriverOpChartFilter('عمرة');
                setSelectedNationalityKey(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                driverOpChartFilter === 'عمرة'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>عمرة</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                driverOpChartFilter === 'عمرة' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {driverNationalityData.opMap['عمرة']?.total || 0}
              </span>
            </button>

            <button
              onClick={() => {
                setDriverOpChartFilter('النقل المدرسي');
                setSelectedNationalityKey(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                driverOpChartFilter === 'النقل المدرسي'
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <GraduationCap className="w-3.5 h-3.5" />
              <span>النقل المدرسي</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                driverOpChartFilter === 'النقل المدرسي' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {driverNationalityData.opMap['النقل المدرسي']?.total || 0}
              </span>
            </button>

            <button
              onClick={() => {
                setDriverOpChartFilter('النقل الدولي سوريا');
                setSelectedNationalityKey(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                driverOpChartFilter === 'النقل الدولي سوريا'
                  ? 'bg-teal-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>دولي سوريا</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                driverOpChartFilter === 'النقل الدولي سوريا' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {driverNationalityData.opMap['النقل الدولي سوريا']?.total || 0}
              </span>
            </button>

            <button
              onClick={() => {
                setDriverOpChartFilter('النقل الدولي اليمن');
                setSelectedNationalityKey(null);
              }}
              className={`px-3 py-1.5 rounded-xl text-xs font-black transition-all shrink-0 flex items-center gap-1.5 cursor-pointer ${
                driverOpChartFilter === 'النقل الدولي اليمن'
                  ? 'bg-purple-600 text-white shadow-xs'
                  : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>دولي اليمن</span>
              <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-mono ${
                driverOpChartFilter === 'النقل الدولي اليمن' ? 'bg-white/20 text-white' : 'bg-slate-200 dark:bg-slate-700'
              }`}>
                {driverNationalityData.opMap['النقل الدولي اليمن']?.total || 0}
              </span>
            </button>
          </div>

          {/* Main Chart + Nationalities List Body */}
          <div className="flex-1 flex flex-col md:flex-row items-center md:items-start justify-between gap-6 mt-2">
            {/* Chart Area */}
            <div className="relative w-full md:w-1/2 h-[260px] flex-shrink-0 flex items-center justify-center">
              {currentNationalityList.length === 0 ? (
                <div className="text-center p-8 text-text-muted">
                  <Users className="w-10 h-10 mx-auto mb-2 opacity-40 text-indigo-500" />
                  <p className="text-xs font-bold">لا يوجد سائقين مسجلين في هذا المسار حالياً</p>
                </div>
              ) : driverNationalityChartMode === 'donut' ? (
                <>
                  <div className="absolute inset-0">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={currentNationalityList}
                          cx="50%"
                          cy="50%"
                          innerRadius={65}
                          outerRadius={92}
                          paddingAngle={3}
                          dataKey="count"
                          nameKey="nationality"
                        >
                          {currentNationalityList.map((entry, index) => (
                            <Cell 
                              key={`nat-cell-${index}`} 
                              fill={entry.color} 
                              className="outline-none"
                              style={{ 
                                cursor: 'pointer', 
                                filter: selectedNationalityKey === entry.nationality ? 'brightness(1.1) drop-shadow(0 0 6px rgba(0,0,0,0.3))' : selectedNationalityKey ? 'opacity(0.35)' : 'none',
                                transition: 'all 0.2s ease-in-out'
                              }}
                              onClick={() => {
                                setSelectedNationalityKey(selectedNationalityKey === entry.nationality ? null : entry.nationality);
                              }}
                            />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(value: any, name: any, item: any) => {
                            const p = item.payload;
                            return [
                              `${value} سائق (${p.percentage.toFixed(1)}%) • مقيم: ${p.resident} | موسمي: ${p.seasonal}`,
                              `${p.flag} ${name}`
                            ];
                          }}
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
                  {/* Central Text displaying Total */}
                  <div className="absolute pointer-events-none text-center">
                    <span className="text-3xl font-extrabold text-slate-900 dark:text-white leading-none block font-mono">
                      {activeFilterTotal}
                    </span>
                    <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 mt-1 block">
                      {driverOpChartFilter === 'all' ? 'إجمالي السائقين' : `سائقي ${driverOpChartFilter}`}
                    </span>
                  </div>
                </>
              ) : (
                <div className="w-full h-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart 
                      data={currentNationalityList}
                      layout="vertical"
                      margin={{ top: 5, right: 35, left: 10, bottom: 5 }}
                      onClick={(state: any) => {
                        if (state && state.activePayload && state.activePayload.length > 0) {
                          const clickedName = state.activePayload[0].payload.nationality;
                          setSelectedNationalityKey(selectedNationalityKey === clickedName ? null : clickedName);
                        }
                      }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E8E5DF" opacity={0.6} />
                      <XAxis type="number" fontSize={11} fontWeight={700} tickLine={false} axisLine={false} stroke="#334155" />
                      <YAxis 
                        dataKey="nationality" 
                        type="category" 
                        fontSize={11} 
                        fontWeight={800} 
                        tickLine={false} 
                        axisLine={false} 
                        stroke="#334155"
                        width={75}
                        tickFormatter={(val) => {
                          const item = currentNationalityList.find(x => x.nationality === val);
                          return item ? `${item.flag} ${val}` : val;
                        }}
                      />
                      <Tooltip 
                        formatter={(value: any, name: any, item: any) => {
                          const p = item.payload;
                          return [
                            `${value} سائق (${p.percentage.toFixed(1)}%) • مقيم: ${p.resident} | موسمي: ${p.seasonal}`,
                            `${p.flag} ${p.nationality}`
                          ];
                        }}
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
                        dataKey="count" 
                        radius={[0, 6, 6, 0]} 
                        barSize={24}
                        className="cursor-pointer"
                      >
                        {currentNationalityList.map((entry, index) => (
                          <Cell 
                            key={`nat-bar-${index}`} 
                            fill={entry.color}
                            style={{
                              opacity: selectedNationalityKey && selectedNationalityKey !== entry.nationality ? 0.35 : 1,
                              transition: 'all 0.2s ease-in-out'
                            }}
                          />
                        ))}
                        <LabelList 
                          dataKey="count" 
                          position="right" 
                          offset={8}
                          formatter={(val: any) => `${val}`}
                          style={{ fontSize: 11, fontWeight: 800, fill: '#090D16' }}
                        />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Nationalities Breakdown Cards / Details Panel */}
            <div className="w-full md:w-1/2 flex flex-col gap-2 max-h-[270px] overflow-y-auto pr-1 custom-scrollbar">
              {currentNationalityList.map((item) => {
                const isSelected = selectedNationalityKey === item.nationality;

                return (
                  <div 
                    key={item.nationality} 
                    onClick={() => setSelectedNationalityKey(isSelected ? null : item.nationality)}
                    className={`p-2.5 bg-[#FAF9F6] dark:bg-background rounded-xl border transition-all cursor-pointer flex flex-col group ${
                      isSelected 
                        ? 'border-indigo-600 ring-2 ring-indigo-600/15 shadow-xs'
                        : selectedNationalityKey 
                          ? 'border-border/40 opacity-50 hover:opacity-100 hover:border-border'
                          : 'border-border hover:border-primary/40 hover:shadow-2xs'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2.5">
                        <span className="text-xl shrink-0" role="img" aria-label={item.nationality}>
                          {item.flag}
                        </span>
                        <div className="text-right">
                          <p className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                            <span>{item.nationality}</span>
                            <span className="text-[10px] text-text-muted font-normal">
                              ({item.percentage.toFixed(1)}%)
                            </span>
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 text-[10px] font-bold">
                            <span className="text-emerald-700 dark:text-emerald-400">مقيم: {item.resident}</span>
                            <span className="text-slate-300 dark:text-slate-600">•</span>
                            <span className="text-purple-700 dark:text-purple-400">موسمي: {item.seasonal}</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-left shrink-0">
                        <span className="text-base font-black text-slate-900 dark:text-white block leading-none font-mono">
                          {item.count}
                        </span>
                        <span className="text-[10px] font-bold text-slate-500 block mt-0.5">سائق</span>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden mt-2">
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${item.percentage}%` }}
                        transition={{ duration: 0.5, ease: 'easeOut' }}
                        className="h-full rounded-full" 
                        style={{ backgroundColor: item.color }} 
                      />
                    </div>

                    {/* If selected or in "all" mode with sub-operations */}
                    {item.byOp && isSelected && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="mt-2.5 pt-2 border-t border-border/60 text-right space-y-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[10px] font-bold text-text-muted block">
                          توزيع جنسية ({item.nationality}) على مسارات العمل:
                        </span>
                        <div className="grid grid-cols-2 gap-1 text-[10px]">
                          {Object.entries(item.byOp).map(([opName, opCount]) => (
                            <div key={opName} className="flex justify-between items-center bg-white dark:bg-slate-900 p-1.5 rounded-lg border border-border/50">
                              <span className="text-text-main font-semibold truncate">{opName}:</span>
                              <span className="font-mono font-black text-primary">{opCount}</span>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Footer Insights */}
          <div className="mt-4 pt-3 border-t border-border/60 flex flex-wrap items-center justify-between gap-2 text-[11px] font-bold text-slate-700 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              <span>
                المسار المختار: <strong className="text-slate-900 dark:text-white">{driverOpChartFilter === 'all' ? 'كافة مسارات العمل' : driverOpChartFilter}</strong>
              </span>
              <span className="text-slate-300 dark:text-slate-700">|</span>
              <span>
                عدد الجنسيات: <strong className="text-indigo-600 dark:text-indigo-400 font-mono">{currentNationalityList.length}</strong>
              </span>
            </div>

            {currentNationalityList[0] && (
              <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 px-2.5 py-1 rounded-lg">
                <span className="text-text-muted">الأكثر عدداً:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">
                  {currentNationalityList[0].flag} {currentNationalityList[0].nationality} ({currentNationalityList[0].count} سائق)
                </span>
              </div>
            )}
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
              className="bg-surface w-full max-w-6xl rounded-3xl border border-border/80 shadow-2xl overflow-hidden flex flex-col h-[88vh] text-right"
              dir="rtl"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Modal Header */}
              <div className="bg-slate-50 dark:bg-slate-900/80 border-b border-border/60 p-5 sm:p-6 flex items-center justify-between gap-4 shrink-0">
                <div className="flex items-center gap-3.5">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shadow-xs">
                    <MapPin className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="text-xl sm:text-2xl font-black text-text-main flex items-center gap-2 font-cairo">
                      <span>حافلات موقع:</span>
                      <span className="text-primary">{selectedLocation ? normalizeBusLocation(selectedLocation) : ''}</span>
                    </h3>
                    <p className="text-xs sm:text-sm text-text-muted font-bold mt-1">
                      يوجد {busesInSelectedLocation.length} حافلة مسجلة ميدانياً في هذا الموقع
                    </p>
                  </div>
                </div>

                <button 
                  onClick={() => setSelectedLocation(null)}
                  className="w-11 h-11 bg-white dark:bg-slate-800 border border-border hover:bg-slate-50 dark:hover:bg-slate-700 text-text-muted hover:text-text-main rounded-xl flex items-center justify-center transition-all cursor-pointer shadow-xs hover:scale-105"
                  title="إغلاق النافذة"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Filters Bar */}
              <div className="p-4 sm:p-5 border-b border-border/40 bg-white dark:bg-slate-900 flex flex-col md:flex-row items-stretch md:items-center gap-4 shrink-0">
                {/* Search field */}
                <div className="relative flex-1">
                  <Search className="absolute right-3.5 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                  <input 
                    type="text"
                    placeholder="البحث بالرقم التشغيلي، رقم اللوحة، هاتف السائق، اسم السائق، الماركة..."
                    value={modalSearch}
                    onChange={(e) => setModalSearch(e.target.value)}
                    className="w-full pr-10 pl-4 py-2.5 bg-background border border-border rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all text-right"
                  />
                  {modalSearch && (
                    <button 
                      onClick={() => setModalSearch('')} 
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-xs bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-text-muted py-0.5 px-2 rounded-md font-bold transition-colors"
                    >
                      مسح
                    </button>
                  )}
                </div>

                {/* Category filter */}
                <div className="flex items-center gap-2 min-w-[200px]">
                  <span className="text-xs font-black text-text-muted shrink-0">الفئة:</span>
                  <select
                    value={modalCategoryFilter}
                    onChange={(e) => setModalCategoryFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">كل الفئات ({uniqueCategories.length})</option>
                    {uniqueCategories.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                {/* Status filter */}
                <div className="flex items-center gap-2 min-w-[200px]">
                  <span className="text-xs font-black text-text-muted shrink-0">الحالة:</span>
                  <select
                    value={modalStatusFilter}
                    onChange={(e) => setModalStatusFilter(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-background border border-border rounded-xl text-xs sm:text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20"
                  >
                    <option value="">كل الحالات ({uniqueStatuses.length})</option>
                    {uniqueStatuses.map(stat => (
                      <option key={stat} value={stat}>{stat}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Scrollable Buses List */}
              <div className="flex-1 overflow-y-auto p-5 sm:p-6 bg-slate-50/50 dark:bg-slate-950/30 custom-scrollbar">
                {filteredBusesInSelectedLocation.length === 0 ? (
                  <div className="py-16 text-center bg-white dark:bg-slate-900 border border-dashed border-border rounded-2xl max-w-lg mx-auto mt-8 shadow-sm p-6">
                    <Bus className="w-14 h-14 text-text-muted/30 mx-auto mb-3" />
                    <p className="text-base font-black text-text-main mb-1">لا توجد حافلات مطابقة لخيارات البحث</p>
                    <p className="text-xs sm:text-sm text-text-muted font-bold">يرجى تعديل الفلاتر أو عبارة البحث للمحاولة مرة أخرى</p>
                  </div>
                ) : (
                  <>
                    <div className="hidden md:block overflow-hidden bg-white dark:bg-slate-900 border border-border rounded-2xl shadow-sm">
                      <table className="w-full text-right border-collapse">
                        <thead>
                          <tr className="bg-slate-100/90 dark:bg-slate-800/90 border-b border-border text-xs sm:text-sm font-black text-slate-700 dark:text-slate-200 uppercase">
                            <th className="px-5 py-4">الرقم التشغيلي</th>
                            <th className="px-5 py-4">رقم اللوحة وهاتف السائق</th>
                            <th className="px-5 py-4">الفئة</th>
                            <th className="px-5 py-4">الماركة / الموديل</th>
                            <th className="px-5 py-4">الحالة الفنية</th>
                            <th className="px-5 py-4 text-center">السائق النشط</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 text-sm sm:text-base text-text-main">
                          {filteredBusesInSelectedLocation.map(bus => {
                            const busDrivers = getBusDrivers(bus);
                            const primaryDriver = busDrivers[0];
                            
                            let statusColor = 'bg-slate-100 text-slate-800 border-slate-200';
                            const status = bus.technicalStatus || '';
                            if (status.includes('ممتاز') || status.includes('جديد')) {
                              statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
                            } else if (status.includes('جيد جداً')) {
                              statusColor = 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
                            } else if (status.includes('جيد')) {
                              statusColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
                            } else if (status.includes('صيانة') || status.includes('متوقف') || status.includes('عطل')) {
                              statusColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
                            }

                            return (
                              <tr key={bus.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                                {/* 1. الرقم التشغيلي بخط كبير وواضح */}
                                <td className="px-5 py-4.5 font-black text-primary font-mono text-base sm:text-lg tabular-nums">
                                  #{bus.operationalNumber}
                                </td>

                                {/* 2. رقم اللوحة متضمناً مع رقم هاتف السائق */}
                                <td className="px-5 py-4.5">
                                  <div className="flex flex-col gap-1.5 items-start">
                                    {/* لوحة الحافلة بخط واضح ومكبر */}
                                    <div className="inline-flex items-center bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-sm sm:text-base font-mono font-black select-none shadow-2xs gap-2">
                                      <span className="text-slate-900 dark:text-white tracking-widest">{bus.plateNumber || '—'}</span>
                                      <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black tracking-tighter">KSA</span>
                                    </div>

                                    {/* رقم هاتف السائق متضمن مع اللوحة */}
                                    {primaryDriver?.phone ? (
                                      <a
                                        href={`tel:${primaryDriver.phone}`}
                                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/60 dark:hover:bg-emerald-900/60 border border-emerald-300/80 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-mono font-black transition-colors shadow-2xs group"
                                        title={`اتصال مباشر بالسائق: ${primaryDriver.name}`}
                                        dir="ltr"
                                      >
                                        <Phone className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400 shrink-0 group-hover:scale-110 transition-transform" />
                                        <span>{primaryDriver.phone}</span>
                                      </a>
                                    ) : busDrivers.length > 0 ? (
                                      <span className="text-xs text-amber-600 dark:text-amber-400 font-bold flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-amber-500 shrink-0" />
                                        <span>الهاتف غير مسجل</span>
                                      </span>
                                    ) : (
                                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1">
                                        <Phone className="w-3 h-3 text-slate-300 dark:text-slate-600 shrink-0" />
                                        <span>بدون سائق معين</span>
                                      </span>
                                    )}
                                  </div>
                                </td>

                                {/* 3. الفئة بخط كبير ومقروء */}
                                <td className="px-5 py-4.5 font-bold text-slate-900 dark:text-white text-sm sm:text-base">
                                  {bus.category || '—'}
                                </td>

                                {/* 4. الماركة / الموديل */}
                                <td className="px-5 py-4.5 font-bold text-slate-700 dark:text-slate-200 text-sm sm:text-base">
                                  <span>{bus.manufacturer || 'غير محدد'}</span>
                                  <span className="text-slate-400 mx-1.5">/</span>
                                  <span className="font-mono text-primary font-black">{bus.model || '—'}</span>
                                </td>

                                {/* 5. الحالة الفنية */}
                                <td className="px-5 py-4.5">
                                  <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 border rounded-xl text-xs sm:text-sm font-black shadow-2xs ${statusColor}`}>
                                    <span className="w-2 h-2 rounded-full bg-current" />
                                    <span>{bus.technicalStatus || 'غير محدد'}</span>
                                  </span>
                                </td>

                                {/* 6. السائق النشط فقط */}
                                <td className="px-5 py-4.5 text-center">
                                  {busDrivers.length > 0 ? (
                                    <div className="flex flex-col gap-1.5 items-center justify-center">
                                      {busDrivers.map((driver, idx) => (
                                        <div 
                                          key={driver.id || idx} 
                                          className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200/90 dark:border-indigo-800 px-3.5 py-1.5 rounded-xl text-xs sm:text-sm font-black shadow-2xs"
                                        >
                                          <Users className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                                          <span>{driver.name}</span>
                                          {driver.phone && (
                                            <a
                                              href={`tel:${driver.phone}`}
                                              className="inline-flex items-center gap-1 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-md text-emerald-700 dark:text-emerald-400 font-mono text-xs border border-emerald-200 dark:border-emerald-800 hover:bg-emerald-50 transition-colors"
                                              dir="ltr"
                                              title={`اتصال بالسائق ${driver.name}`}
                                            >
                                              <Phone className="w-3 h-3 text-emerald-600 shrink-0" />
                                              <span>{driver.phone}</span>
                                            </a>
                                          )}
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <span className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold">
                                      <AlertTriangle className="w-4 h-4 text-slate-400 shrink-0" />
                                      <span>لا يوجد سائق نشط</span>
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
                        const busDrivers = getBusDrivers(bus);
                        const primaryDriver = busDrivers[0];

                        let statusColor = 'bg-slate-100 text-slate-800 border-slate-200';
                        const status = bus.technicalStatus || '';
                        if (status.includes('ممتاز') || status.includes('جديد')) {
                          statusColor = 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800';
                        } else if (status.includes('جيد جداً')) {
                          statusColor = 'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800';
                        } else if (status.includes('جيد')) {
                          statusColor = 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800';
                        } else if (status.includes('صيانة') || status.includes('متوقف') || status.includes('عطل')) {
                          statusColor = 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800';
                        }

                        return (
                          <div key={bus.id} className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-border shadow-xs space-y-3.5">
                            <div className="flex justify-between items-center border-b border-border/40 pb-2.5">
                              <span className="text-sm sm:text-base font-black text-primary font-mono">حافلة تشغيلية: #{bus.operationalNumber}</span>
                              <span className={`inline-flex items-center gap-1.5 px-3 py-1 border rounded-lg text-xs font-black ${statusColor}`}>
                                <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                <span>{bus.technicalStatus || 'غير محدد'}</span>
                              </span>
                            </div>

                            <div className="grid grid-cols-2 gap-3 text-xs sm:text-sm font-bold text-text-muted">
                              {/* رقم اللوحة متضمن مع هاتف السائق */}
                              <div className="col-span-2 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-border/60 flex flex-wrap items-center justify-between gap-2.5">
                                <div>
                                  <span className="block text-xs text-text-muted font-bold mb-1">رقم اللوحة</span>
                                  <div className="inline-flex items-center bg-white dark:bg-slate-900 border-2 border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-0.5 text-sm sm:text-base font-mono font-black gap-2 shadow-2xs">
                                    <span className="text-slate-900 dark:text-white tracking-wider">{bus.plateNumber || '—'}</span>
                                    <span className="text-[10px] bg-emerald-600 text-white px-1.5 py-0.5 rounded font-black">KSA</span>
                                  </div>
                                </div>
                                <div>
                                  <span className="block text-xs text-text-muted font-bold mb-1">هاتف السائق المرتبط</span>
                                  {primaryDriver?.phone ? (
                                    <a
                                      href={`tel:${primaryDriver.phone}`}
                                      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-700 text-emerald-800 dark:text-emerald-300 text-xs sm:text-sm font-mono font-black"
                                      dir="ltr"
                                    >
                                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                                      <span>{primaryDriver.phone}</span>
                                    </a>
                                  ) : (
                                    <span className="text-xs text-slate-400 font-medium">غير متوفر</span>
                                  )}
                                </div>
                              </div>

                              <div>
                                <span className="block text-xs text-text-muted font-bold mb-0.5">الفئة</span>
                                <span className="text-text-main text-sm sm:text-base font-black">{bus.category || '—'}</span>
                              </div>
                              <div>
                                <span className="block text-xs text-text-muted font-bold mb-0.5">الماركة / الموديل</span>
                                <span className="text-text-main text-sm sm:text-base font-black">{bus.manufacturer || '—'} / {bus.model || '—'}</span>
                              </div>
                            </div>

                            {/* Active Driver */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-border/50">
                              <span className="block text-xs text-text-muted font-black mb-1.5">السائق النشط:</span>
                              {busDrivers.length > 0 ? (
                                <div className="flex flex-wrap gap-2">
                                  {busDrivers.map((driver, idx) => (
                                    <div key={driver.id || idx} className="inline-flex items-center gap-2 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-900 dark:text-indigo-200 border border-indigo-200 dark:border-indigo-800 px-3 py-1 rounded-xl text-xs sm:text-sm font-black">
                                      <Users className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                      <span>{driver.name}</span>
                                      {driver.phone && (
                                        <a href={`tel:${driver.phone}`} className="font-mono text-emerald-700 dark:text-emerald-300 text-xs" dir="ltr">
                                          ({driver.phone})
                                        </a>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-xs text-slate-500 font-bold flex items-center gap-1.5">
                                  <AlertTriangle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                  <span>لا يوجد سائق نشط</span>
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
              <div className="bg-slate-50 dark:bg-slate-900/80 border-t border-border/40 p-4 sm:p-5 shrink-0 flex items-center justify-between text-xs sm:text-sm font-bold text-text-muted">
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
