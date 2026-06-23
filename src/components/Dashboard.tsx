import React, { useState } from 'react';
import { motion } from 'motion/react';
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
  ChevronUp
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
import type { Bus as BusType, Worker as WorkerType } from '../types';

interface DashboardProps {
  buses: BusType[];
  workers?: WorkerType[];
  profile: any;
  workersCount?: number;
}

const COLORS = ['#059669', '#3b82f6', '#f59e0b', '#ef4444', '#6366f1', '#ec4899', '#8b5cf6'];

export const Dashboard: React.FC<DashboardProps> = ({ buses, workers = [], profile, workersCount = 0 }) => {
  const totalBuses = buses.length;
  const [chartTab, setChartTab] = useState<'year' | 'brand'>('year');

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
      const loc = bus.location?.trim() || 'غير محدد';
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
      acc[bus.location] = (acc[bus.location] || 0) + 1;
      return acc;
    }, {});
  }, [buses]);

  const locationData = React.useMemo(() => {
    return Object.keys(locationCounts)
      .map(name => ({ name, value: locationCounts[name] }))
      .sort((a, b) => b.value - a.value);
  }, [locationCounts]);

  const topLocation = locationData[0]?.name || 'غير محدد';

  const [locSearch, setLocSearch] = useState('');
  const [locSort, setLocSort] = useState<'value' | 'name'>('value');

  const filteredLocationData = React.useMemo(() => {
    return locationData
      .filter(loc => {
        const displayName = loc.name?.trim() || 'موقع غير محدد';
        return displayName.toLowerCase().includes(locSearch.trim().toLowerCase());
      })
      .sort((a, b) => {
        if (locSort === 'value') {
          return b.value - a.value;
        } else {
          const nameA = a.name?.trim() || 'موقع غير محدد';
          const nameB = b.name?.trim() || 'موقع غير محدد';
          return nameA.localeCompare(nameB, 'ar');
        }
      });
  }, [locationData, locSearch, locSort]);

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

  const statsCards = [
    { label: 'إجمالي الحافلات', value: totalBuses, icon: Bus, color: 'text-primary', bg: 'bg-emerald-50', trend: '↑ الأسطول مكتمل' },
    { label: 'إجمالي العمال', value: workersCount, icon: Users, color: 'text-blue-600', bg: 'bg-blue-50', trend: 'المسجلين في النظام' },
    { label: 'المواقع النشطة', value: Object.keys(locationCounts).length, icon: MapPin, color: 'text-amber-600', bg: 'bg-amber-50', trend: `أهمها: ${topLocation}` },
    { label: 'في الصيانة', value: statusCounts.maintenance, icon: Wrench, color: 'text-red-600', bg: 'bg-red-50', trend: 'تتطلب متابعة فورية' },
  ];

  return (
    <div className="space-y-8 pb-12 text-right" dir="rtl">
      {/* Metrics Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statsCards.map((card, idx) => (
          <motion.div
            key={card.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.05 }}
            className="bg-surface p-5 rounded-2xl border border-border shadow-sm flex flex-col gap-3 relative overflow-hidden group hover:shadow-md transition-shadow"
          >
            <div className="flex justify-between items-center relative z-10">
              <div className={`${card.bg} p-3 rounded-xl group-hover:scale-110 transition-transform shadow-inner`}>
                <card.icon className={`${card.color} w-6 h-6`} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-text-muted uppercase tracking-widest mb-0.5">{card.label}</p>
                <h3 className="text-3xl font-black text-text-main leading-none">{card.value}</h3>
              </div>
            </div>
            <div className="text-[10px] font-bold text-text-muted mt-auto flex items-center gap-1">
               <Activity className="w-3 h-3 text-primary opacity-50" />
               <span className="truncate">{card.trend}</span>
            </div>
            <div className="absolute top-0 left-0 w-32 h-32 bg-gradient-to-tr from-transparent to-black/[0.02] -translate-x-1/2 -translate-y-1/2 rounded-full blur-3xl pointer-events-none" />
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Status Breakdown */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-4 bg-surface p-6 rounded-2xl border border-border shadow-sm flex flex-col"
        >
          <div className="flex items-center justify-between mb-8 border-b border-border pb-4">
             <h3 className="text-base font-black flex items-center gap-2">
               <ShieldCheck className="w-5 h-5 text-primary" />
               توزيع الحالات الفنية
             </h3>
          </div>
          <div className="space-y-6 flex-1">
             {statusData.map((stat, idx) => (
               <div key={stat.name} className="relative">
                 <div className="flex justify-between items-center mb-2">
                    <div className="flex items-center gap-2">
                       <div className="p-1.5 rounded-lg shrink-0" style={{ backgroundColor: `${stat.color}15`, color: stat.color }}>
                          <stat.icon className="w-4 h-4" />
                       </div>
                       <span className="text-sm font-bold text-text-main">{stat.name}</span>
                    </div>
                    <span className="text-sm font-black" style={{ color: stat.color }}>{stat.value}</span>
                 </div>
                 <div className="h-2.5 bg-background rounded-full overflow-hidden border border-border/50 shadow-inner">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${(stat.value / totalBuses) * 100}%` }}
                      transition={{ duration: 1, delay: 0.2 + idx * 0.1 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: stat.color }}
                    />
                 </div>
               </div>
             ))}
             {statusData.length === 0 && (
               <div className="flex flex-col items-center justify-center p-12 text-text-muted opacity-50">
                  <Activity className="w-12 h-12 mb-4" />
                  <p className="text-sm font-bold">لا تتوفر بيانات كافية للحالات</p>
               </div>
             )}
          </div>
          <div className="mt-8 p-4 bg-primary/[0.03] rounded-xl border border-primary/10">
             <p className="text-[11px] text-primary/80 font-bold leading-relaxed">
               نظام المتابعة الفنية يراقب حالة الأسطول بشكل لحظي ويتم تحديث هذه البيانات من قبل المشرفين الميدانيين.
             </p>
          </div>
        </motion.div>

        {/* Operational Status (متاحة، صيانة، في الخدمة) Donut Chart */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-8 bg-surface p-6 rounded-2xl border border-border shadow-sm min-h-[400px] h-auto flex flex-col justify-between"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-border pb-4">
             <div className="text-right">
               <h3 className="text-base font-black flex items-center gap-2">
                 <Activity className="w-5 h-5 text-indigo-600" />
                 توزيع الحافلات حسب حالة التشغيل
               </h3>
               <p className="text-[10px] text-text-muted font-bold mt-0.5">انقر على أي حالة أدناه أو بالرسم البياني لتفصيل توزيع الحافلات في المواقع الميدانية</p>
             </div>
             <span className="text-xs font-bold text-text-muted bg-slate-100 px-2.5 py-1 rounded-lg self-start sm:self-auto">
               الوضعية الحالية الميدانية
             </span>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row items-center md:items-start justify-around gap-6 mt-4">
            {/* The Donut Chart */}
            <div className="relative w-full md:w-1/2 h-[220px] flex-shrink-0 flex items-center justify-center">
              <div className="absolute inset-0">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={opStatusChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={85}
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
                        borderRadius: '16px', 
                        border: '1px solid #E2E8F0', 
                        boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)',
                        textAlign: 'right',
                        direction: 'rtl'
                      }}
                      itemStyle={{ fontWeight: 800 }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              {/* Central text displaying total number of buses */}
              <div className="absolute pointer-events-none text-center">
                <span className="text-4xl font-black text-text-main leading-none block">{totalBuses}</span>
                <span className="text-[10px] font-extrabold text-text-muted mt-1 block">إجمالي الحافلات</span>
              </div>
            </div>

            {/* Explanatory Legend / Details Cards */}
            <div className="w-full md:w-1/2 flex flex-col gap-3">
              {opStatusChartData.map((item) => {
                const percentage = totalBuses > 0 ? (item.value / totalBuses) * 100 : 0;
                const isSelected = activeStatusKey === item.id;
                const locationsForStatus = statusLocationBreakdown[item.id as 'available' | 'inService' | 'maintenance'] || [];

                return (
                  <div 
                    key={item.name} 
                    onClick={() => setActiveStatusKey(isSelected ? null : item.id)}
                    className={`p-3.5 bg-background rounded-xl border transition-all cursor-pointer flex flex-col group ${
                      isSelected 
                        ? 'border-indigo-600 ring-2 ring-indigo-600/10 shadow-sm'
                        : activeStatusKey 
                          ? 'border-border/30 opacity-60 hover:opacity-100 hover:border-border'
                          : 'border-border/60 hover:border-primary/40 hover:shadow-sm'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <div className="w-3.5 h-3.5 rounded-full shrink-0 flex items-center justify-center relative" style={{ backgroundColor: item.color }}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-black text-text-main flex items-center gap-1.5">
                            {item.name}
                            {isSelected ? (
                              <ChevronUp className="w-3.5 h-3.5 text-text-muted shrink-0" />
                            ) : (
                              <ChevronDown className="w-3.5 h-3.5 text-text-muted shrink-0 opacity-40 group-hover:opacity-100 transition-opacity" />
                            )}
                          </p>
                          <p className="text-[10px] text-text-muted font-bold mt-0.5">{percentage.toFixed(1)}% من إجمالي الأسطول</p>
                        </div>
                      </div>
                      <div className="text-left shrink-0">
                        <span className="text-lg font-black text-text-main block leading-none">{item.value}</span>
                        <span className="text-[9px] font-bold text-text-muted block mt-1">حافلة</span>
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
           
           <div className="flex items-center gap-4 text-right" dir="rtl">
              <div className="p-3 bg-slate-50/80 rounded-2xl border border-border/50 text-right min-w-[120px]">
                 <div className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none mb-1.5">إجمالي المواقع</div>
                 <div className="text-xl font-black text-primary leading-none">{locationData.length} موقع</div>
              </div>
              <div className="p-3 bg-slate-50/80 rounded-2xl border border-border/50 text-right min-w-[120px]">
                 <div className="text-[9px] font-black text-text-muted uppercase tracking-widest leading-none mb-1.5">الموقع الأكثر نشاطاً</div>
                 <div className="text-sm font-black text-text-main leading-none truncate max-w-[150px]" title={topLocation}>{topLocation}</div>
              </div>
           </div>
        </div>

        {/* Search & Sort Panel */}
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

          {/* Sort Buttons */}
          <div className="flex items-center gap-3" dir="rtl">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-widest leading-none">ترتيب حسب:</span>
            <div className="inline-flex bg-slate-100 border border-border/80 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setLocSort('value')}
                className={`py-1.5 px-4 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${
                  locSort === 'value'
                    ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                <ArrowUpDown className="w-3.5 h-3.5" />
                الأعلى استجراراً
              </button>
              <button
                type="button"
                onClick={() => setLocSort('name')}
                className={`py-1.5 px-4 rounded-lg text-[10px] font-black transition-all flex items-center gap-1.5 ${
                  locSort === 'name'
                    ? 'bg-white text-primary shadow-sm ring-1 ring-black/5'
                    : 'text-text-muted hover:text-text-main'
                }`}
              >
                أبجدياً (أ - ي)
              </button>
            </div>
          </div>
        </div>

        {/* Locations Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" dir="rtl">
           {filteredLocationData.length === 0 ? (
             <div className="py-12 text-center col-span-full bg-slate-50 border border-dashed border-border rounded-2xl">
               <MapPin className="w-12 h-12 text-text-muted/40 mx-auto mb-3" />
               <p className="text-sm font-black text-text-main mb-1">لم يتم العثور على أي كفايات تطابق البحث</p>
               <p className="text-xs text-text-muted font-bold">يرجى تجربة عبارة بحث أخرى للعثور على النتائج المطلوبة</p>
             </div>
           ) : (
             filteredLocationData.map((loc, idx) => {
               const displayName = loc.name?.trim() || 'مجمع المواقع الرئيسي';
               const percentage = totalBuses > 0 ? (loc.value / totalBuses) * 100 : 0;
               return (
                 <motion.div 
                   layout
                   initial={{ opacity: 0, scale: 0.98 }}
                   animate={{ opacity: 1, scale: 1 }}
                   key={loc.name} 
                   className="pr-6 pl-5 py-5 bg-background border border-border rounded-2xl relative overflow-hidden transition-all duration-300 hover:shadow-md hover:border-primary/20 group flex flex-col justify-between min-h-[115px]"
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
      </motion.div>
    </div>
  );
};
