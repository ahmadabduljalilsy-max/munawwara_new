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
  CheckCircle2
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
    { name: 'متاحة للتشغيل', value: opStatusCounts.available, color: '#10b981', shortName: 'متاحة' },
    { name: 'في الخدمة', value: opStatusCounts.inService, color: '#6366f1', shortName: 'في الخدمة' },
    { name: 'تحت الصيانة / متوقفة', value: opStatusCounts.maintenance, color: '#f43f5e', shortName: 'صيانة' },
  ], [opStatusCounts]);
  
  // Stats by Location
  const locationCounts = buses.reduce((acc: any, bus) => {
    acc[bus.location] = (acc[bus.location] || 0) + 1;
    return acc;
  }, {});
  const locationData = Object.keys(locationCounts)
    .map(name => ({ name, value: locationCounts[name] }))
    .sort((a, b) => b.value - a.value);

  const topLocation = locationData[0]?.name || 'غير محدد';

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
          className="lg:col-span-8 bg-surface p-6 rounded-2xl border border-border shadow-sm h-[400px] flex flex-col"
        >
          <div className="flex items-center justify-between mb-4 border-b border-border pb-4">
             <h3 className="text-base font-black flex items-center gap-2">
               <Activity className="w-5 h-5 text-indigo-600" />
               توزيع الحافلات حسب حالة التشغيل
             </h3>
             <span className="text-xs font-bold text-text-muted">
               الوضعية الحالية الميدانية
             </span>
          </div>
          
          <div className="flex-1 flex flex-col md:flex-row items-center justify-around gap-6 min-h-0">
            {/* The Donut Chart */}
            <div className="relative w-full md:w-1/2 h-[220px] flex-shrink-0">
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
                      <Cell key={`cell-${index}`} fill={entry.color} />
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
              {/* Central text displaying total number of buses */}
              <div className="absolute top-[50%] left-[50%] -translate-x-[50%] -translate-y-[50%] text-center pointer-events-none">
                <span className="text-4xl font-black text-text-main leading-none block">{totalBuses}</span>
                <span className="text-[10px] font-extrabold text-text-muted mt-1 block">إجمالي الحافلات</span>
              </div>
            </div>

            {/* Explanatory Legend / Details Cards */}
            <div className="w-full md:w-1/2 flex flex-col gap-3">
              {opStatusChartData.map((item) => {
                const percentage = totalBuses > 0 ? (item.value / totalBuses) * 100 : 0;
                return (
                  <div 
                    key={item.name} 
                    className="p-3 bg-background rounded-xl border border-border/60 flex items-center justify-between hover:border-border transition-colors grow"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <div>
                        <p className="text-xs font-black text-text-main">{item.name}</p>
                        <p className="text-[10px] text-text-muted font-bold mt-0.5">{percentage.toFixed(1)}% من إجمالي الأسطول</p>
                      </div>
                    </div>
                    <div className="text-left">
                      <span className="text-lg font-black text-text-main block leading-none">{item.value}</span>
                      <span className="text-[9px] font-bold text-text-muted block mt-1">حافلة</span>
                    </div>
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
        <div className="flex items-center justify-between mb-8">
           <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                 <MapPin className="w-6 h-6" />
              </div>
              <div>
                 <h3 className="text-xl font-black">انتشار الحافلات حسب الموقع الميداني</h3>
                 <p className="text-xs text-text-muted font-bold mt-0.5">تفصيل كامل لمواقع تمركز الحافلات في جميع المشاريع</p>
              </div>
           </div>
           <div className="text-left">
              <div className="text-[10px] font-black text-text-muted uppercase tracking-widest">إجمالي المواقع</div>
              <div className="text-2xl font-black text-primary">{locationData.length} موقع</div>
           </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
           {locationData.map((loc, idx) => {
             const percentage = totalBuses > 0 ? (loc.value / totalBuses) * 100 : 0;
             return (
               <div key={loc.name} className="p-5 bg-background/50 rounded-2xl border border-border/50 group hover:border-primary/30 transition-colors">
                  <div className="flex justify-between items-center mb-3">
                     <span className="text-sm font-black text-text-main group-hover:text-primary transition-colors">{loc.name}</span>
                     <span className="text-lg font-black text-primary">{loc.value}</span>
                  </div>
                  <div className="h-1.5 bg-surface rounded-full overflow-hidden mb-2">
                     <motion.div 
                       initial={{ width: 0 }}
                       animate={{ width: `${percentage}%` }}
                       className="h-full bg-primary rounded-full"
                       style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                     />
                  </div>
                  <div className="text-[10px] font-bold text-text-muted">{percentage.toFixed(1)}% من إجمالي الأسطول</div>
               </div>
             );
           })}
        </div>
      </motion.div>
    </div>
  );
};
