import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Building2, 
  Bus, 
  Users, 
  TrendingUp, 
  MapPin, 
  Search, 
  Filter, 
  LayoutGrid, 
  ListFilter, 
  ChevronLeft, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Phone, 
  Plus, 
  Maximize2, 
  Minimize2, 
  Sparkles, 
  ExternalLink, 
  ShieldCheck, 
  Activity, 
  Target, 
  Layers, 
  X,
  Copy,
  Check,
  Briefcase,
  Compass
} from 'lucide-react';
import { 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import type { Bus as BusType, Worker as WorkerType, CompanyDriver } from '../types';
import { normalizeBusLocation } from '../lib/excelService';

export interface LocationStatItem {
  name: string;
  city: string;
  buses: BusType[];
  workers: WorkerType[];
  companyDrivers: CompanyDriver[];
  activeBusesCount: number;
  maintenanceBusesCount: number;
  operationalRate: number;
  percentageOfFleet: number;
  categories: string[];
}

interface WorkLocationsDashboardProps {
  buses: BusType[];
  workers: WorkerType[];
  companyDrivers?: CompanyDriver[];
  isAdmin: boolean;
  canEdit?: boolean;
  initialSelectedLocation?: string | null;
  onClearInitialLocation?: () => void;
  onAddBus?: () => void;
  onEditBus?: (bus: BusType) => void;
  onNavigateToFleet?: () => void;
  onNavigateToDrivers?: () => void;
}

// Color palette for charts & cards matching modern SaaS theme
const PALETTE = ['#2563EB', '#00A88B', '#10B981', '#E8B44D', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];

// Helper to extract city from location name
export function extractCityFromLocation(loc: string): string {
  const normalized = normalizeBusLocation(loc);
  if (normalized.includes('/')) {
    const parts = normalized.split('/');
    return parts[parts.length - 1].trim();
  }
  if (normalized.includes('-')) {
    const parts = normalized.split('-');
    const last = parts[parts.length - 1].trim();
    if (['الرياض', 'ينبع', 'الدمام', 'محايل عسير', 'عسير', 'القصيم', 'بريدة', 'مكة', 'مكة المكرمة', 'المدينة', 'المدينة المنورة', 'جدة', 'حائل', 'تبوك', 'الجبيل', 'الخبر', 'الأحساء', 'جازان', 'نجران', 'الجوف', 'عرعر'].some(c => last.includes(c))) {
      return last;
    }
  }
  if (normalized.includes('الرياض')) return 'الرياض';
  if (normalized.includes('ينبع')) return 'ينبع';
  if (normalized.includes('الدمام')) return 'الدمام';
  if (normalized.includes('محايل عسير') || normalized.includes('عسير')) return 'محايل عسير';
  if (normalized.includes('القصيم') || normalized.includes('بريدة')) return 'القصيم';
  if (normalized.includes('مكة')) return 'مكة المكرمة';
  if (normalized.includes('المدينة')) return 'المدينة المنورة';
  if (normalized.includes('جدة')) return 'جدة';
  if (normalized.includes('الجبيل')) return 'الجبيل';
  if (normalized.includes('الخبر')) return 'الخبر';
  if (normalized.includes('الأحساء')) return 'الأحساء';
  if (normalized.includes('جازان')) return 'جازان';
  if (normalized.includes('تبوك')) return 'تبوك';
  if (normalized.includes('حائل')) return 'حائل';
  if (normalized === 'في الشركة') return 'الرياض';
  return 'الرياض';
}

// Saudi City map coordinates (percentages for normalized canvas)
const SAUDI_CITY_COORDINATES: Record<string, { x: number; y: number; label: string }> = {
  'الرياض': { x: 55, y: 50, label: 'الرياض' },
  'الدمام': { x: 78, y: 44, label: 'الدمام / الشرقية' },
  'الخبر': { x: 79, y: 46, label: 'الخبر' },
  'الجبيل': { x: 76, y: 40, label: 'الجبيل' },
  'ينبع': { x: 26, y: 45, label: 'ينبع' },
  'المدينة المنورة': { x: 30, y: 46, label: 'المدينة المنورة' },
  'مكة المكرمة': { x: 28, y: 58, label: 'مكة المكرمة' },
  'جدة': { x: 27, y: 60, label: 'جدة' },
  'القصيم': { x: 48, y: 38, label: 'القصيم' },
  'محايل عسير': { x: 38, y: 76, label: 'محايل عسير' },
  'عسير': { x: 40, y: 78, label: 'عسير' },
  'جازان': { x: 40, y: 84, label: 'جازان' },
  'حائل': { x: 42, y: 32, label: 'حائل' },
  'تبوك': { x: 18, y: 24, label: 'تبوك' },
  'الجوف': { x: 32, y: 20, label: 'الجوف' },
};

export const WorkLocationsDashboard: React.FC<WorkLocationsDashboardProps> = ({
  buses,
  workers,
  companyDrivers = [],
  isAdmin,
  canEdit = false,
  initialSelectedLocation,
  onClearInitialLocation,
  onAddBus,
  onEditBus,
  onNavigateToFleet,
  onNavigateToDrivers
}) => {
  // Selected location for the dedicated details page
  const [selectedLocation, setSelectedLocation] = useState<string | null>(initialSelectedLocation || null);

  // View mode in list page: 'grid' (cards) vs 'table' (dense rows)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Filters for All Locations view
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [isMapExpanded, setIsMapExpanded] = useState(false);

  // Details Page Tab: 'buses' | 'drivers' | 'analytics'
  const [detailsTab, setDetailsTab] = useState<'buses' | 'drivers' | 'analytics'>('buses');
  const [detailsBusSearch, setDetailsBusSearch] = useState('');
  const [detailsBusCategory, setDetailsBusCategory] = useState('');
  const [detailsBusStatus, setDetailsBusStatus] = useState('');
  const [detailsDriverSearch, setDetailsDriverSearch] = useState('');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Sync with initialSelectedLocation if prop changes
  React.useEffect(() => {
    if (initialSelectedLocation) {
      setSelectedLocation(initialSelectedLocation);
    }
  }, [initialSelectedLocation]);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // ── Global Aggregations ─────────────────────────────────────────────────
  const totalBusesCount = buses.length;

  // Active drivers count
  const totalActiveDriversCount = useMemo(() => {
    const fromCompany = companyDrivers.filter(d => !d.status || d.status === 'نشط').length;
    if (fromCompany > 0) return fromCompany;
    return workers.length;
  }, [companyDrivers, workers]);

  // Group buses by normalized location
  const locationStatsMap = useMemo(() => {
    const map: Record<string, LocationStatItem> = {};

    // 1. Assign buses to locations
    buses.forEach(bus => {
      const locName = normalizeBusLocation(bus.location);
      if (!map[locName]) {
        map[locName] = {
          name: locName,
          city: extractCityFromLocation(locName),
          buses: [],
          workers: [],
          companyDrivers: [],
          activeBusesCount: 0,
          maintenanceBusesCount: 0,
          operationalRate: 100,
          percentageOfFleet: 0,
          categories: []
        };
      }
      map[locName].buses.push(bus);
      const st = (bus.technicalStatus || '').trim();
      if (st.includes('صيانة') || st.includes('عطل') || st.includes('متوقف')) {
        map[locName].maintenanceBusesCount++;
      } else {
        map[locName].activeBusesCount++;
      }
      if (bus.category && !map[locName].categories.includes(bus.category)) {
        map[locName].categories.push(bus.category);
      }
    });

    // 2. Assign workers to locations
    workers.forEach(w => {
      const locName = normalizeBusLocation(w.workplace);
      if (map[locName]) {
        map[locName].workers.push(w);
      }
    });

    // 3. Assign company drivers to locations via bus number or workplace
    companyDrivers.forEach(d => {
      const driverBus = (d.busNumber || '').trim();
      let matchedLoc: string | null = null;
      if (driverBus) {
        for (const loc in map) {
          if (map[loc].buses.some(b => b.operationalNumber === driverBus || b.plateNumber === driverBus)) {
            matchedLoc = loc;
            break;
          }
        }
      }
      if (!matchedLoc && d.workplace) {
        matchedLoc = normalizeBusLocation(d.workplace);
      }
      if (matchedLoc && map[matchedLoc]) {
        map[matchedLoc].companyDrivers.push(d);
      }
    });

    // 4. Compute rates and percentages
    (Object.values(map) as LocationStatItem[]).forEach(loc => {
      const total = loc.buses.length;
      loc.percentageOfFleet = totalBusesCount > 0 ? (total / totalBusesCount) * 100 : 0;
      loc.operationalRate = total > 0 
        ? Math.round(((total - loc.maintenanceBusesCount) / total) * 1000) / 10
        : 100;
    });

    return map;
  }, [buses, workers, companyDrivers, totalBusesCount]);

  // List of all locations sorted by bus count descending
  const allLocationsList = useMemo<LocationStatItem[]>(() => {
    return (Object.values(locationStatsMap) as LocationStatItem[]).sort((a, b) => b.buses.length - a.buses.length);
  }, [locationStatsMap]);

  // Unique cities and categories for filter dropdowns
  const availableCities = useMemo(() => {
    const set = new Set(allLocationsList.map(l => l.city).filter(Boolean));
    return Array.from(set).sort();
  }, [allLocationsList]);

  const availableCategories = useMemo(() => {
    const set = new Set(buses.map(b => b.category).filter(Boolean));
    return Array.from(set).sort();
  }, [buses]);

  // Average operational rate across all locations
  const avgOperationalRate = useMemo(() => {
    if (allLocationsList.length === 0) return 100;
    const totalBusesInLocations = buses.length;
    const activeTotal = buses.filter(b => {
      const s = b.technicalStatus || '';
      return !s.includes('صيانة') && !s.includes('عطل') && !s.includes('متوقف');
    }).length;
    return totalBusesInLocations > 0 ? Math.round((activeTotal / totalBusesInLocations) * 1000) / 10 : 100;
  }, [buses, allLocationsList]);

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return allLocationsList.filter(loc => {
      const search = searchTerm.trim().toLowerCase();
      const matchesSearch = !search || 
        loc.name.toLowerCase().includes(search) || 
        loc.city.toLowerCase().includes(search);

      const matchesCity = !selectedCity || loc.city === selectedCity;
      const matchesCategory = !selectedCategory || loc.categories.includes(selectedCategory);
      
      const matchesStatus = !selectedStatus || (
        selectedStatus === 'active' ? loc.operationalRate >= 80 :
        selectedStatus === 'warning' ? loc.operationalRate < 80 : true
      );

      return matchesSearch && matchesCity && matchesCategory && matchesStatus;
    });
  }, [allLocationsList, searchTerm, selectedCity, selectedCategory, selectedStatus]);

  // Top locations data for the trend/rate chart
  const operationalChartData = useMemo(() => {
    return allLocationsList.slice(0, 8).map(loc => ({
      name: loc.name.length > 15 ? loc.name.slice(0, 15) + '...' : loc.name,
      fullName: loc.name,
      rate: loc.operationalRate,
      buses: loc.buses.length
    }));
  }, [allLocationsList]);

  // ── Selected Location Data (for Details View) ──────────────────────────
  const selectedLocationData = useMemo(() => {
    if (!selectedLocation) return null;
    const normalized = normalizeBusLocation(selectedLocation);
    return locationStatsMap[normalized] || {
      name: normalized,
      city: extractCityFromLocation(normalized),
      buses: [],
      workers: [],
      companyDrivers: [],
      activeBusesCount: 0,
      maintenanceBusesCount: 0,
      operationalRate: 100,
      percentageOfFleet: 0,
      categories: []
    };
  }, [selectedLocation, locationStatsMap]);

  // Buses inside selected location filtered by search/category/status
  const filteredLocationBuses = useMemo(() => {
    if (!selectedLocationData) return [];
    return selectedLocationData.buses.filter(bus => {
      const search = detailsBusSearch.trim().toLowerCase();
      const opNum = (bus.operationalNumber || '').toLowerCase();
      const plate = (bus.plateNumber || '').toLowerCase();
      const cat = (bus.category || '').toLowerCase();
      const manufacturer = (bus.manufacturer || '').toLowerCase();
      const model = (bus.model || '').toLowerCase();

      // Check assigned worker name
      const workerMatch = workers.some(w => 
        (w.assignedBusId === bus.id || w.assignedBusOperationalNumber === bus.operationalNumber) &&
        w.name.toLowerCase().includes(search)
      );

      const matchesSearch = !search || 
        opNum.includes(search) || 
        plate.includes(search) || 
        cat.includes(search) || 
        manufacturer.includes(search) || 
        model.includes(search) ||
        workerMatch;

      const matchesCategory = !detailsBusCategory || bus.category === detailsBusCategory;
      const matchesStatus = !detailsBusStatus || bus.technicalStatus === detailsBusStatus;

      return matchesSearch && matchesCategory && matchesStatus;
    });
  }, [selectedLocationData, detailsBusSearch, detailsBusCategory, detailsBusStatus, workers]);

  // Drivers inside selected location filtered by search
  const filteredLocationDrivers = useMemo(() => {
    if (!selectedLocationData) return [];
    
    // Combine companyDrivers and workers for this location
    const combined: Array<{
      id: string;
      name: string;
      phone: string;
      iqama: string;
      busNumber: string;
      classification: string;
      status: string;
      source: 'company' | 'monitoring';
    }> = [];

    const seenIds = new Set<string>();

    selectedLocationData.companyDrivers.forEach(d => {
      combined.push({
        id: d.id,
        name: d.fullName,
        phone: d.mobileNumber || '—',
        iqama: d.iqamaNumber || d.borderNumber || '—',
        busNumber: d.busNumber || '—',
        classification: d.driverClassification || 'نقل عمال',
        status: d.status || 'نشط',
        source: 'company'
      });
      seenIds.add(d.fullName);
    });

    selectedLocationData.workers.forEach(w => {
      if (!seenIds.has(w.name)) {
        combined.push({
          id: w.id,
          name: w.name,
          phone: w.mobileNumber || '—',
          iqama: w.iqamaNumber || w.nationalId || '—',
          busNumber: w.assignedBusOperationalNumber || w.assignedBusPlateNumber || '—',
          classification: w.clientName || 'الرقابة والمتابعة',
          status: 'نشط',
          source: 'monitoring'
        });
      }
    });

    return combined.filter(d => {
      const s = detailsDriverSearch.trim().toLowerCase();
      if (!s) return true;
      return d.name.toLowerCase().includes(s) || 
        d.phone.includes(s) || 
        d.iqama.includes(s) || 
        d.busNumber.toLowerCase().includes(s);
    });
  }, [selectedLocationData, detailsDriverSearch]);

  // Distribution for analytics tab in details view
  const locationCategoryDistribution = useMemo(() => {
    if (!selectedLocationData) return [];
    const counts: Record<string, number> = {};
    selectedLocationData.buses.forEach(b => {
      const c = b.category || 'غير محدد';
      counts[c] = (counts[c] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value], idx) => ({
      name,
      value,
      color: PALETTE[idx % PALETTE.length]
    }));
  }, [selectedLocationData]);

  // Back button handler
  const handleBackToAllLocations = () => {
    setSelectedLocation(null);
    if (onClearInitialLocation) {
      onClearInitialLocation();
    }
  };

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 2: DEDICATED LOCATION DETAILS PAGE
  // ═════════════════════════════════════════════════════════════════════════
  if (selectedLocationData && selectedLocation) {
    return (
      <div className="space-y-6 pb-12 text-right bg-[#F8FAFC] min-h-[85vh] -m-3 sm:-m-6 p-4 sm:p-6" dir="rtl">
        {/* Breadcrumb Navigation Bar */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
            <button 
              onClick={handleBackToAllLocations}
              className="hover:text-primary transition-colors flex items-center gap-1 cursor-pointer font-black"
            >
              <span>مواقع العمل</span>
            </button>
            <ChevronLeft className="w-3.5 h-3.5 text-slate-400 rotate-180" />
            <span className="text-slate-900 font-black">{selectedLocationData.name}</span>
          </div>

          <button
            onClick={handleBackToAllLocations}
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-black transition-all shadow-2xs hover:shadow-xs cursor-pointer active:scale-95"
          >
            <ArrowRight className="w-3.5 h-3.5 text-slate-500" />
            <span>الرجوع إلى جميع المواقع</span>
          </button>
        </div>

        {/* Location Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white border border-[#E2E8F0] p-5 sm:p-6 rounded-2xl shadow-xs">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <MapPin className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2.5 flex-wrap">
                <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight font-cairo">
                  {selectedLocationData.name}
                </h1>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-black">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>نشط</span>
                </span>
              </div>
              <p className="text-xs text-slate-500 font-bold mt-1">
                موقع تشغيل ميداني معتمد • المدينة: <span className="text-primary font-black">{selectedLocationData.city}</span>
              </p>
            </div>
          </div>

          {canEdit && onAddBus && (
            <button
              onClick={onAddBus}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة حافلة للموقع</span>
            </button>
          )}
        </div>

        {/* Top 3 KPI Cards for Location */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {/* 1. إجمالي الحافلات */}
          <div className="bg-white border border-[#E2E8F0] p-4.5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 block">إجمالي الحافلات</span>
              <span className="text-2xl font-black text-[#0F172A] font-mono tabular-nums leading-none block">
                {selectedLocationData.buses.length}
              </span>
              <span className="text-[11px] text-slate-400 font-medium block">
                ({selectedLocationData.percentageOfFleet.toFixed(1)}% من الأسطول)
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
              <Bus className="w-5 h-5" />
            </div>
          </div>

          {/* 2. السائقون النشطون */}
          <div className="bg-white border border-[#E2E8F0] p-4.5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 block">السائقون النشطون</span>
              <span className="text-2xl font-black text-[#0F172A] font-mono tabular-nums leading-none block">
                {filteredLocationDrivers.length}
              </span>
              <span className="text-[11px] text-emerald-600 font-bold block">
                مخصصون للتشغيل الميداني
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <Users className="w-5 h-5" />
            </div>
          </div>

          {/* 3. معدل التشغيل */}
          <div className="bg-white border border-[#E2E8F0] p-4.5 rounded-2xl shadow-xs flex items-center justify-between">
            <div className="space-y-1">
              <span className="text-xs font-bold text-slate-500 block">معدل التشغيل</span>
              <span className="text-2xl font-black text-[#0F172A] font-mono tabular-nums leading-none block">
                {selectedLocationData.operationalRate}%
              </span>
              <span className="text-[11px] text-emerald-600 font-bold flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>جاهزية تشغيلية مستقرة</span>
              </span>
            </div>
            <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* 2-Column Layout: Sidebar (Left in RTL, visually right) & Main Tabs */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
          {/* Main Area (3 Columns) */}
          <div className="lg:col-span-3 space-y-4">
            {/* Tabs Header */}
            <div className="bg-white border border-[#E2E8F0] rounded-2xl p-1.5 shadow-2xs flex items-center justify-between gap-2 overflow-x-auto">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setDetailsTab('buses')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    detailsTab === 'buses'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Bus className="w-4 h-4" />
                  <span>الحافلات ({selectedLocationData.buses.length})</span>
                </button>

                <button
                  onClick={() => setDetailsTab('drivers')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    detailsTab === 'drivers'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>السائقون ({filteredLocationDrivers.length})</span>
                </button>

                <button
                  onClick={() => setDetailsTab('analytics')}
                  className={`px-4 py-2.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    detailsTab === 'analytics'
                      ? 'bg-primary text-white shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Activity className="w-4 h-4" />
                  <span>الإحصائيات</span>
                </button>
              </div>

              {detailsTab === 'buses' && onNavigateToFleet && (
                <button
                  onClick={onNavigateToFleet}
                  className="text-xs text-primary hover:underline font-black px-3 py-1 flex items-center gap-1 cursor-pointer"
                >
                  <span>عرض الأسطول الكامل</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* TAB 1: BUSES TABLE */}
            {detailsTab === 'buses' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
                {/* Search & Filter Bar */}
                <div className="p-4 border-b border-slate-100 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-50/50">
                  <div className="relative flex-1">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="البحث بالرقم التشغيلي، رقم اللوحة، الماركة، أو السائق..."
                      value={detailsBusSearch}
                      onChange={(e) => setDetailsBusSearch(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary text-right"
                    />
                    {detailsBusSearch && (
                      <button 
                        onClick={() => setDetailsBusSearch('')}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                      >
                        مسح
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={detailsBusCategory}
                      onChange={(e) => setDetailsBusCategory(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
                    >
                      <option value="">الفئة: الكل</option>
                      {availableCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>

                    <select
                      value={detailsBusStatus}
                      onChange={(e) => setDetailsBusStatus(e.target.value)}
                      className="px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
                    >
                      <option value="">الحالة: الكل</option>
                      <option value="جاهزة">جاهزة للعمل</option>
                      <option value="حالة ممتازة">حالة ممتازة</option>
                      <option value="حالة جيدة">حالة جيدة</option>
                      <option value="تحت الصيانة">تحت الصيانة</option>
                      <option value="متوقفة حالياً">متوقفة حالياً</option>
                    </select>
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-black border-b border-slate-200">
                        <th className="px-4 py-3">الرقم التشغيلي</th>
                        <th className="px-4 py-3">رقم اللوحة</th>
                        <th className="px-4 py-3">الفئة</th>
                        <th className="px-4 py-3">الماركة / الموديل</th>
                        <th className="px-4 py-3">الحالة الفنية</th>
                        <th className="px-4 py-3">السائق المخصص</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLocationBuses.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                            لا توجد حافلات مطابقة لشروط البحث في هذا الموقع
                          </td>
                        </tr>
                      ) : (
                        filteredLocationBuses.map((bus) => {
                          const status = bus.technicalStatus || 'جاهزة';
                          let statusBadge = 'bg-emerald-50 text-emerald-700 border-emerald-200';
                          if (status.includes('صيانة') || status.includes('عطل') || status.includes('متوقف')) {
                            statusBadge = 'bg-rose-50 text-rose-700 border-rose-200';
                          } else if (status.includes('جيد')) {
                            statusBadge = 'bg-amber-50 text-amber-700 border-amber-200';
                          }

                          // Find assigned driver from workers or companyDrivers
                          const assignedWorker = workers.find(w => 
                            w.assignedBusId === bus.id || 
                            w.assignedBusOperationalNumber === bus.operationalNumber
                          );
                          const assignedCompany = companyDrivers.find(d => 
                            d.busNumber === bus.operationalNumber || 
                            d.busNumber === bus.plateNumber
                          );
                          const driverName = assignedCompany?.fullName || assignedWorker?.name || null;

                          return (
                            <tr key={bus.id} className="hover:bg-slate-50/70 transition-colors">
                              {/* الرقم التشغيلي */}
                              <td className="px-4 py-3.5 font-black text-primary font-mono text-sm">
                                {bus.operationalNumber}
                              </td>

                              {/* رقم اللوحة السعودية */}
                              <td className="px-4 py-3.5">
                                <div className="inline-flex items-center bg-slate-50 border border-slate-300 rounded-md px-2 py-0.5 text-[11px] font-mono font-black select-none shadow-2xs gap-1.5">
                                  <span className="text-slate-800 tracking-wider">{bus.plateNumber}</span>
                                  <span className="text-[8px] bg-slate-200 text-slate-600 px-1 rounded font-bold">KSA</span>
                                </div>
                              </td>

                              {/* الفئة */}
                              <td className="px-4 py-3.5 font-bold text-slate-700">
                                <span className="inline-block px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                                  {bus.category || 'نقل عمال'}
                                </span>
                              </td>

                              {/* الماركة / الموديل */}
                              <td className="px-4 py-3.5 text-slate-600 font-bold">
                                {bus.manufacturer || 'غير محدد'} {bus.model ? `(${bus.model})` : ''}
                              </td>

                              {/* الحالة الفنية */}
                              <td className="px-4 py-3.5">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full border text-[10px] font-black ${statusBadge}`}>
                                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                                  <span>{status}</span>
                                </span>
                              </td>

                              {/* السائق المخصص */}
                              <td className="px-4 py-3.5">
                                {driverName ? (
                                  <span className="inline-flex items-center gap-1.5 text-indigo-700 bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 rounded-md text-[11px] font-black">
                                    <Users className="w-3 h-3 text-indigo-500 shrink-0" />
                                    <span>{driverName}</span>
                                  </span>
                                ) : (
                                  <span className="text-slate-400 font-medium text-[11px]">غير مخصص</span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 2: DRIVERS TABLE */}
            {detailsTab === 'drivers' && (
              <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
                <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="البحث باسم السائق، رقم الهاتف، أو الحافلة..."
                      value={detailsDriverSearch}
                      onChange={(e) => setDetailsDriverSearch(e.target.value)}
                      className="w-full pr-10 pl-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-primary text-right"
                    />
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-right text-xs">
                    <thead>
                      <tr className="bg-slate-50/80 text-slate-500 font-black border-b border-slate-200">
                        <th className="px-4 py-3">اسم السائق</th>
                        <th className="px-4 py-3">رقم الهاتف</th>
                        <th className="px-4 py-3">رقم الإقامة / الحدود</th>
                        <th className="px-4 py-3">الحافلة المرتبطة</th>
                        <th className="px-4 py-3">طبيعة العمل</th>
                        <th className="px-4 py-3">الحالة</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredLocationDrivers.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="py-12 text-center text-slate-400 font-bold">
                            لا يوجد سائقون مسجلون في هذا الموقع حالياً
                          </td>
                        </tr>
                      ) : (
                        filteredLocationDrivers.map((driver) => (
                          <tr key={driver.id} className="hover:bg-slate-50/70 transition-colors">
                            <td className="px-4 py-3.5 font-black text-slate-900 flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold text-xs shrink-0">
                                {driver.name.charAt(0)}
                              </div>
                              <span>{driver.name}</span>
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-600">
                              {driver.phone}
                            </td>
                            <td className="px-4 py-3.5 font-mono text-slate-600">
                              {driver.iqama}
                            </td>
                            <td className="px-4 py-3.5 font-mono font-bold text-primary">
                              {driver.busNumber !== '—' ? (
                                <span className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded border border-blue-200">
                                  <Bus className="w-3 h-3" />
                                  <span>{driver.busNumber}</span>
                                </span>
                              ) : (
                                <span className="text-slate-400">—</span>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-slate-600 font-bold">
                              {driver.classification}
                            </td>
                            <td className="px-4 py-3.5">
                              <span className="inline-flex items-center gap-1 text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full text-[10px] font-black">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>{driver.status}</span>
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* TAB 3: ANALYTICS */}
            {detailsTab === 'analytics' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Categories Breakdown */}
                <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs">
                  <h3 className="text-xs font-black text-slate-900 mb-4 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-primary" />
                    <span>توزيع فئات الحافلات بالموقع</span>
                  </h3>
                  <div className="h-56">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={locationCategoryDistribution}
                          cx="50%"
                          cy="50%"
                          innerRadius={50}
                          outerRadius={75}
                          paddingAngle={3}
                          dataKey="value"
                        >
                          {locationCategoryDistribution.map((entry, index) => (
                            <Cell key={`cat-cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip 
                          formatter={(val: any) => [`${val} حافلة`, 'العدد']}
                          contentStyle={{ borderRadius: '12px', textAlign: 'right' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center mt-2">
                    {locationCategoryDistribution.map((item) => (
                      <div key={item.name} className="flex items-center gap-1.5 text-[11px] font-bold text-slate-600">
                        <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
                        <span>{item.name}: {item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Technical Readiness Gauge */}
                <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
                  <h3 className="text-xs font-black text-slate-900 mb-4 flex items-center gap-2">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>مؤشر الجاهزية التشغيلية للموقع</span>
                  </h3>

                  <div className="flex flex-col items-center justify-center my-auto py-4">
                    <div className="relative w-32 h-32 flex items-center justify-center">
                      <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                        <circle cx="50" cy="50" r="40" className="stroke-slate-100" strokeWidth="8" fill="transparent" />
                        <circle
                          cx="50"
                          cy="50"
                          r="40"
                          stroke="#10B981"
                          strokeWidth="8"
                          fill="transparent"
                          strokeDasharray="251.32"
                          strokeDashoffset={251.32 - (selectedLocationData.operationalRate / 100) * 251.32}
                          strokeLinecap="round"
                          className="transition-all duration-1000 ease-out"
                        />
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                        <span className="text-2xl font-black text-slate-900 font-mono">
                          {selectedLocationData.operationalRate}%
                        </span>
                        <span className="text-[10px] font-bold text-emerald-600">جاهزية</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center pt-3 border-t border-slate-100 text-xs">
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-100">
                      <span className="block text-[10px] text-emerald-600 font-bold">عاملة وجاهزة</span>
                      <span className="font-mono font-black text-emerald-800 text-base">{selectedLocationData.activeBusesCount}</span>
                    </div>
                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200">
                      <span className="block text-[10px] text-slate-500 font-bold">صيانة / متوقفة</span>
                      <span className="font-mono font-black text-slate-700 text-base">{selectedLocationData.maintenanceBusesCount}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Left Column (Sidebar Information Card) */}
          <div className="lg:col-span-1 space-y-4">
            {/* Location Info */}
            <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-black text-slate-900">
                <Building2 className="w-4 h-4 text-primary" />
                <span>معلومات الموقع</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">المدينة:</span>
                  <span className="font-black text-slate-800">{selectedLocationData.city}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">الفئة:</span>
                  <span className="font-black text-slate-800">مواقع تشغيل</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">تاريخ البدء:</span>
                  <span className="font-mono font-bold text-slate-700">يناير 2026</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 font-bold">نسبة الأسطول:</span>
                  <span className="font-mono font-black text-primary">{selectedLocationData.percentageOfFleet.toFixed(1)}%</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100 text-xs font-black text-slate-900">
                <Target className="w-4 h-4 text-emerald-600" />
                <span>إحصائيات سريعة</span>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>الحافلات العاملة:</span>
                  </span>
                  <span className="font-mono font-black text-slate-900">{selectedLocationData.activeBusesCount}</span>
                </div>

                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-1.5 text-slate-600 font-bold">
                    <span className="w-2 h-2 rounded-full bg-slate-400" />
                    <span>الحافلات المتوقفة:</span>
                  </span>
                  <span className="font-mono font-black text-slate-700">{selectedLocationData.maintenanceBusesCount}</span>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <span className="text-slate-600 font-bold">معدل الالتزام:</span>
                  <span className="font-mono font-black text-emerald-600">{selectedLocationData.operationalRate}%</span>
                </div>
              </div>
            </div>

            {/* View on Map Button */}
            <button
              onClick={() => {
                handleBackToAllLocations();
                setTimeout(() => {
                  window.scrollTo({ top: 120, behavior: 'smooth' });
                }, 100);
              }}
              className="w-full p-3 bg-blue-50 hover:bg-blue-100 text-primary border border-blue-200 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 cursor-pointer shadow-2xs"
            >
              <Compass className="w-4 h-4" />
              <span>عرض الموقع على الخريطة</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═════════════════════════════════════════════════════════════════════════
  // VIEW 1: ALL WORK LOCATIONS DASHBOARD
  // ═════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 pb-12 text-right bg-[#F8FAFC] min-h-[85vh] -m-3 sm:-m-6 p-4 sm:p-6" dir="rtl">
      {/* Top Main Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shrink-0">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-[#0F172A] tracking-tight font-cairo">
                مواقع العمل
              </h1>
              <p className="text-xs text-slate-500 font-bold mt-0.5">
                إدارة ومتابعة جميع مواقع تشغيل الحافلات وتوزيع الأسطول الميداني
              </p>
            </div>
          </div>
        </div>

        {canEdit && onAddBus && (
          <button
            onClick={onAddBus}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-primary hover:bg-primary-hover text-white text-xs font-black rounded-xl shadow-sm transition-all cursor-pointer active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>إضافة حافلة جديدة</span>
          </button>
        )}
      </div>

      {/* 4 Top KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* 1. إجمالي الحافلات */}
        <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block">إجمالي الحافلات</span>
            <span className="text-xl sm:text-2xl font-black text-[#0F172A] font-mono tabular-nums leading-none block">
              {totalBusesCount.toLocaleString('en-US')}
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-primary shrink-0">
            <Bus className="w-5 h-5" />
          </div>
        </div>

        {/* 2. السائقون النشطون */}
        <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block">السائقون النشطون</span>
            <span className="text-xl sm:text-2xl font-black text-[#0F172A] font-mono tabular-nums leading-none block">
              {totalActiveDriversCount.toLocaleString('en-US')}
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        {/* 3. متوسط معدل التشغيل */}
        <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block">متوسط معدل التشغيل</span>
            <span className="text-xl sm:text-2xl font-black text-[#0F172A] font-mono tabular-nums leading-none block">
              {avgOperationalRate}%
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>

        {/* 4. إجمالي مواقع العمل */}
        <div className="bg-white border border-[#E2E8F0] p-4 sm:p-5 rounded-2xl shadow-xs flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-xs font-bold text-slate-500 block">إجمالي مواقع العمل</span>
            <span className="text-xl sm:text-2xl font-black text-[#0F172A] font-mono tabular-nums leading-none block">
              {allLocationsList.length}
            </span>
          </div>
          <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-600 shrink-0">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Middle Section: Mini Map & Operational Rate Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left Card: Interactive Locations Map */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary" />
              <h2 className="text-xs font-black text-[#0F172A]">خريطة توزيع مواقع العمل الميدانية</h2>
            </div>
            <button
              onClick={() => setIsMapExpanded(!isMapExpanded)}
              className="p-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-500 text-xs transition-colors cursor-pointer"
              title={isMapExpanded ? 'تصغير' : 'تكبير'}
            >
              {isMapExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          </div>

          {/* Map Visual Container */}
          <div className={`relative bg-gradient-to-br from-blue-50/50 via-slate-50/80 to-blue-50/30 rounded-xl border border-slate-200/80 overflow-hidden transition-all duration-300 ${
            isMapExpanded ? 'h-72' : 'h-48'
          }`}>
            {/* Grid background lines */}
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#e2e8f0_1px,transparent_1px),linear-gradient(to_bottom,#e2e8f0_1px,transparent_1px)] bg-[size:24px_24px] opacity-40" />

            {/* Interactive Pins on Map */}
            {Object.entries(SAUDI_CITY_COORDINATES).map(([cityName, coord]) => {
              // Count locations and buses in this city
              const cityLocs = allLocationsList.filter(l => l.city === cityName);
              if (cityLocs.length === 0) return null;
              const totalCityBuses = cityLocs.reduce((sum, l) => sum + l.buses.length, 0);
              const isRiyadh = cityName === 'الرياض';

              return (
                <div
                  key={cityName}
                  style={{ left: `${coord.x}%`, top: `${coord.y}%` }}
                  onClick={() => setSelectedCity(selectedCity === cityName ? '' : cityName)}
                  className="absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer group z-10"
                >
                  {/* Radar pulse around active/key city */}
                  {isRiyadh && (
                    <span className="absolute -inset-2.5 rounded-full bg-primary/20 animate-ping pointer-events-none" />
                  )}

                  {/* Marker Pin */}
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full shadow-md text-[10px] font-black transition-all ${
                    selectedCity === cityName
                      ? 'bg-primary text-white scale-110 ring-2 ring-primary/30'
                      : 'bg-white border border-slate-300 text-slate-800 hover:border-primary hover:text-primary'
                  }`}>
                    <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                    <span>{cityName}</span>
                    <span className="font-mono text-[9px] opacity-75">({totalCityBuses})</span>
                  </div>

                  {/* Tooltip on hover */}
                  <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-slate-900 text-white text-[10px] py-1 px-2.5 rounded-lg whitespace-nowrap shadow-lg z-20 pointer-events-none font-bold">
                    {cityLocs.length} مواقع • {totalCityBuses} حافلة
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-500 mt-2.5 pt-2 border-t border-slate-100">
            <span>انقر على أي مدينة للتصفية الفورية</span>
            {selectedCity && (
              <button 
                onClick={() => setSelectedCity('')}
                className="text-primary hover:underline font-black"
              >
                إلغاء تصفية المدينة ({selectedCity})
              </button>
            )}
          </div>
        </div>

        {/* Right Card: Operational Rate Chart */}
        <div className="bg-white border border-[#E2E8F0] p-5 rounded-2xl shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-xs font-black text-[#0F172A]">معدل التشغيل عبر المواقع</h2>
                <span className="text-[10px] text-slate-400 font-bold" title="معدل جاهزية الحافلات في أبرز المواقع">ⓘ</span>
              </div>
              <div className="inline-flex items-center gap-1 text-[11px] font-black text-emerald-600 mt-0.5">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+2.8% مقارنة بالشهر السابق</span>
              </div>
            </div>

            <div className="text-left font-mono font-black text-lg text-primary">
              {avgOperationalRate}%
            </div>
          </div>

          {/* Area Sparkline Chart */}
          <div className="h-44 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={operationalChartData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="opRateGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563EB" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#2563EB" stopOpacity={0.0} />
                  </linearGradient>
                </defs>
                <Tooltip 
                  formatter={(val: any) => [`${val}%`, 'معدل التشغيل']}
                  labelFormatter={(name, payload) => payload?.[0]?.payload?.fullName || name}
                  contentStyle={{ borderRadius: '12px', textAlign: 'right', direction: 'rtl' }}
                />
                <Area 
                  type="monotone" 
                  dataKey="rate" 
                  stroke="#2563EB" 
                  strokeWidth={2.5} 
                  fillOpacity={1} 
                  fill="url(#opRateGrad)" 
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 pt-2 border-t border-slate-100">
            <span>استقرار تشغيلي عبر كافة المسارات</span>
            <span className="text-slate-600 font-black">{allLocationsList.length} موقع مسجل</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white border border-[#E2E8F0] p-3 sm:p-4 rounded-2xl shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="البحث عن موقع عمل أو مدينة..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pr-10 pl-4 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold focus:outline-none focus:border-primary focus:bg-white text-right"
          />
          {searchTerm && (
            <button 
              onClick={() => setSearchTerm('')}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
            >
              مسح
            </button>
          )}
        </div>

        {/* Filters and View Toggle */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* City filter */}
          <select
            value={selectedCity}
            onChange={(e) => setSelectedCity(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
          >
            <option value="">المدينة: الكل</option>
            {availableCities.map(city => (
              <option key={city} value={city}>{city}</option>
            ))}
          </select>

          {/* Category filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
          >
            <option value="">الفئة: الكل</option>
            {availableCategories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-2 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl text-xs font-bold text-slate-700 outline-none focus:border-primary"
          >
            <option value="">الحالة: الكل</option>
            <option value="active">تشغيل ممتاز (80%+)</option>
            <option value="warning">يتطلب متابعة (&lt;80%)</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'grid' ? 'bg-white text-primary shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="عرض البطاقات"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-1.5 rounded-lg transition-all cursor-pointer ${
                viewMode === 'table' ? 'bg-white text-primary shadow-xs' : 'text-slate-500 hover:text-slate-900'
              }`}
              title="عرض الجدول"
            >
              <ListFilter className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Locations Title Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-black text-[#0F172A] font-cairo">
          قائمة مواقع العمل ({filteredLocations.length})
        </h2>
        {(searchTerm || selectedCity || selectedCategory || selectedStatus) && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCity('');
              setSelectedCategory('');
              setSelectedStatus('');
            }}
            className="text-xs text-rose-600 hover:underline font-bold"
          >
            إلغاء كافة الفلاتر
          </button>
        )}
      </div>

      {/* ── CARD GRID VIEW (Matching Reference Image) ────────────────────── */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLocations.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white border border-dashed border-slate-200 rounded-2xl">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-sm font-black text-slate-700">لم يتم العثور على أي مواقع عمل مطابقة</p>
              <p className="text-xs text-slate-400 font-bold mt-1">يرجى تعديل معايير البحث أو اختيار مدينة أخرى</p>
            </div>
          ) : (
            filteredLocations.map((loc, idx) => {
              const sparklineColor = PALETTE[idx % PALETTE.length];
              return (
                <motion.div
                  key={loc.name}
                  whileHover={{ y: -3 }}
                  onClick={() => setSelectedLocation(loc.name)}
                  className="bg-white border border-[#E2E8F0] hover:border-primary/50 hover:shadow-md transition-all duration-200 rounded-2xl p-5 shadow-xs cursor-pointer flex flex-col justify-between group relative overflow-hidden"
                >
                  {/* Top Bar: Status Pill & Category Icon */}
                  <div className="flex items-center justify-between mb-3">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span>نشط</span>
                    </span>

                    <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-500 group-hover:text-primary group-hover:bg-blue-50 transition-colors">
                      <Building2 className="w-4 h-4" />
                    </div>
                  </div>

                  {/* Location Title & City */}
                  <div className="space-y-0.5 mb-4">
                    <h3 className="text-sm font-black text-[#0F172A] group-hover:text-primary transition-colors line-clamp-1 font-cairo">
                      {loc.name}
                    </h3>
                    <p className="text-[11px] text-slate-400 font-bold">
                      {loc.city}
                    </p>
                  </div>

                  {/* Mid Numbers: Bus Count & Operational Rate */}
                  <div className="flex items-end justify-between mb-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 block">إجمالي الحافلات</span>
                      <span className="text-xl font-black font-mono text-slate-900 leading-none">
                        {loc.buses.length}
                      </span>
                    </div>

                    <div className="text-left">
                      <span className="text-[10px] font-bold text-slate-400 block">معدل التشغيل</span>
                      <span className="text-sm font-black font-mono text-emerald-600">
                        {loc.operationalRate}%
                      </span>
                    </div>
                  </div>

                  {/* Colorful Sparkline wave curve */}
                  <div className="h-6 w-full mb-2">
                    <svg className="w-full h-full overflow-visible" viewBox="0 0 100 20" preserveAspectRatio="none">
                      <path
                        d="M0,10 Q25,2 50,12 T100,6"
                        fill="none"
                        stroke={sparklineColor}
                        strokeWidth="2"
                        strokeLinecap="round"
                      />
                    </svg>
                  </div>

                  {/* Bottom Progress Bar */}
                  <div className="space-y-1 pt-1 border-t border-slate-100">
                    <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                      <span>حصة الأسطول</span>
                      <span className="font-mono text-slate-700">{loc.percentageOfFleet.toFixed(1)}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${Math.min(100, Math.max(5, loc.percentageOfFleet))}%`,
                          backgroundColor: sparklineColor
                        }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })
          )}
        </div>
      ) : (
        /* ── TABLE VIEW ─────────────────────────────────────────────────── */
        <div className="bg-white border border-[#E2E8F0] rounded-2xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-black border-b border-slate-200">
                  <th className="px-5 py-3.5">اسم موقع العمل</th>
                  <th className="px-5 py-3.5">المدينة</th>
                  <th className="px-5 py-3.5">إجمالي الحافلات</th>
                  <th className="px-5 py-3.5">السائقون</th>
                  <th className="px-5 py-3.5">معدل التشغيل</th>
                  <th className="px-5 py-3.5">حصة الأسطول</th>
                  <th className="px-5 py-3.5">الحالة</th>
                  <th className="px-5 py-3.5 text-center">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLocations.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center text-slate-400 font-bold">
                      لا توجد مواقع مطابقة للبحث
                    </td>
                  </tr>
                ) : (
                  filteredLocations.map((loc) => (
                    <tr 
                      key={loc.name}
                      onClick={() => setSelectedLocation(loc.name)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer"
                    >
                      <td className="px-5 py-4 font-black text-slate-900 font-cairo">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary shrink-0" />
                          <span>{loc.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-600">
                        {loc.city}
                      </td>
                      <td className="px-5 py-4 font-mono font-black text-primary">
                        {loc.buses.length} حافلة
                      </td>
                      <td className="px-5 py-4 font-mono font-bold text-slate-700">
                        {loc.workers.length + loc.companyDrivers.length} سائق
                      </td>
                      <td className="px-5 py-4 font-mono font-black text-emerald-600">
                        {loc.operationalRate}%
                      </td>
                      <td className="px-5 py-4">
                        <div className="w-24 flex items-center gap-2">
                          <div className="h-1.5 flex-1 bg-slate-100 rounded-full overflow-hidden">
                            <div 
                              className="h-full bg-primary rounded-full" 
                              style={{ width: `${Math.min(100, Math.max(5, loc.percentageOfFleet))}%` }} 
                            />
                          </div>
                          <span className="font-mono text-[10px] text-slate-500 font-bold">
                            {loc.percentageOfFleet.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-[10px] font-black">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          <span>نشط</span>
                        </span>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className="text-primary hover:underline font-black text-xs">
                          استعراض التفاصيل ←
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
