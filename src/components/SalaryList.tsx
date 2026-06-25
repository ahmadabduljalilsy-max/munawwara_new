import React, { useState, useMemo } from 'react';
import { 
  CircleDollarSign, 
  Search, 
  Save, 
  RefreshCw,
  Clock,
  Coins,
  ShieldPlus,
  Users,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Download,
  Building,
  Filter,
  MapPin
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Worker, SalaryRecord } from '../types';

interface SalaryListProps {
  workers: Worker[];
  salaries: SalaryRecord[];
  isAdmin: boolean;
  onSaveSalary: (record: Omit<SalaryRecord, 'id'>) => void;
  onUpdateSalary: (id: string, updates: Partial<SalaryRecord>) => void;
  onExportExcel: (data: any[]) => void;
  onGeneratePDF: (config: { title: string; salaries: SalaryRecord[]; stats: any }) => void;
}

export const SalaryList: React.FC<SalaryListProps> = ({ 
  workers, 
  salaries, 
  isAdmin, 
  onSaveSalary,
  onUpdateSalary,
  onExportExcel,
  onGeneratePDF
}) => {
  const [search, setSearch] = useState('');
  const [selectedYear, setSelectedYear] = useState(() => {
    const d = new Date();
    return d.getFullYear().toString();
  });
  const [selectedMonthNum, setSelectedMonthNum] = useState(() => {
    const d = new Date();
    return String(d.getMonth() + 1).padStart(2, '0');
  });

  const selectedMonth = useMemo(() => {
    return `${selectedYear}-${selectedMonthNum}`;
  }, [selectedYear, selectedMonthNum]);

  const years = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const startYear = 2024;
    const endYear = currentYear + 2;
    const list = [];
    for (let y = startYear; y <= endYear; y++) {
      list.push(y.toString());
    }
    return list;
  }, []);

  const months = useMemo(() => [
    { value: '01', name: 'يناير (01)' },
    { value: '02', name: 'فبراير (02)' },
    { value: '03', name: 'مارس (03)' },
    { value: '04', name: 'أبريل (04)' },
    { value: '05', name: 'مايو (05)' },
    { value: '06', name: 'يونيو (06)' },
    { value: '07', name: 'يوليو (07)' },
    { value: '08', name: 'أغسطس (08)' },
    { value: '09', name: 'سبتمبر (09)' },
    { value: '10', name: 'أكتوبر (10)' },
    { value: '11', name: 'نوفمبر (11)' },
    { value: '12', name: 'ديسمبر (12)' }
  ], []);

  const [companyFilter, setCompanyFilter] = useState('all');
  const [locationFilter, setLocationFilter] = useState('all');

  const [localSalaries, setLocalSalaries] = useState<Record<string, Partial<SalaryRecord>>>({});

  const companies = useMemo(() => {
    const unique = new Set(workers.map(w => w.recruitmentCompany).filter(Boolean));
    return Array.from(unique).sort();
  }, [workers]);

  const locations = useMemo(() => {
    const unique = new Set(workers.map(w => w.workplace).filter(Boolean));
    return Array.from(unique).sort();
  }, [workers]);

  // Sync with existing salaries for selected month
  const monthSalariesMap = useMemo(() => {
    const map: Record<string, SalaryRecord> = {};
    salaries.forEach(s => {
      if (s.month === selectedMonth) {
        map[s.workerId] = s;
      }
    });
    return map;
  }, [salaries, selectedMonth]);

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      // Check if employee's contract expired in a prior month
      const hasSavedSalary = !!monthSalariesMap[w.id];
      if (!hasSavedSalary && w.endDate) {
        const endYearMonth = w.endDate.substring(0, 7); // "YYYY-MM"
        if (endYearMonth < selectedMonth) {
          return false;
        }
      }

      const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) || 
                           w.workerNumber.includes(search);
      const matchesCompany = companyFilter === 'all' || w.recruitmentCompany === companyFilter;
      const matchesLocation = locationFilter === 'all' || w.workplace === locationFilter;
      return matchesSearch && matchesCompany && matchesLocation;
    });
  }, [workers, search, companyFilter, locationFilter, selectedMonth, monthSalariesMap]);

  const handleInputChange = (workerId: string, field: keyof SalaryRecord, value: any) => {
    setLocalSalaries(prev => {
      const current = prev[workerId] || monthSalariesMap[workerId] || {
        workerId,
        month: selectedMonth,
        baseSalary: 0,
        extraHours: 0,
        extraHoursValue: 0,
        morabata: 0,
        totalSalary: 0,
        status: 'pending',
        notes: ''
      };
      
      const updated = { ...current, [field]: value };
      
      // Recalculate total if needed
      if (['baseSalary', 'extraHoursValue', 'morabata'].includes(field as string)) {
        updated.totalSalary = Number(updated.baseSalary || 0) + Number(updated.extraHoursValue || 0) + Number(updated.morabata || 0);
      }
      
      return { ...prev, [workerId]: updated };
    });
  };

  const handleSave = (worker: Worker) => {
    const local = localSalaries[worker.id];
    const existing = monthSalariesMap[worker.id];

    if (existing) {
      // Create a clean updates object without the id field
      const updates = { ...local };
      if ('id' in updates) delete (updates as any).id;
      
      onUpdateSalary(existing.id, updates);
    } else {
      const dataToSave = {
        workerId: worker.id,
        workerName: worker.name,
        workerNumber: worker.workerNumber,
        month: selectedMonth,
        baseSalary: Number(local?.baseSalary || 0),
        extraHours: Number(local?.extraHours || 0),
        extraHoursValue: Number(local?.extraHoursValue || 0),
        morabata: Number(local?.morabata || 0),
        totalSalary: Number(local?.totalSalary || 0),
        workLocation: worker.workplace || '',
        status: (local?.status || 'pending') as 'pending' | 'paid',
        notes: local?.notes || '',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      onSaveSalary(dataToSave);
    }
  };

  const stats = useMemo(() => {
    const monthSalaries = salaries.filter(s => s.month === selectedMonth);
    return {
      total: monthSalaries.reduce((sum, s) => sum + s.totalSalary, 0),
      totalExtra: monthSalaries.reduce((sum, s) => sum + s.extraHoursValue, 0),
      totalMorabata: monthSalaries.reduce((sum, s) => sum + s.morabata, 0),
      paidCount: monthSalaries.filter(s => s.status === 'paid').length,
      pendingCount: monthSalaries.filter(s => s.status === 'pending').length
    };
  }, [salaries, selectedMonth]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-text-main flex items-center gap-2">
            <CircleDollarSign className="w-7 h-7 text-primary" />
            إدارة الرواتب والأجور
          </h2>
          <p className="text-text-muted text-xs font-bold mt-1">إدخال ومراجعة الرواتب الشهرية والعمل الإضافي</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* فلترة السنة والشهر */}
          <div className="flex items-center gap-2 bg-slate-50 border border-border/80 p-1.5 rounded-xl">
            <div className="flex items-center gap-1.5" dir="rtl">
              <span className="text-[10px] font-black text-text-muted uppercase">السنة:</span>
              <select 
                value={selectedYear}
                onChange={(e) => setSelectedYear(e.target.value)}
                className="bg-surface border border-border/60 rounded-lg px-2.5 py-1 text-xs font-black text-primary outline-none focus:border-primary cursor-pointer"
              >
                {years.map(y => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </div>
            <div className="w-px h-4 bg-border/60" />
            <div className="flex items-center gap-1.5" dir="rtl">
              <span className="text-[10px] font-black text-text-muted uppercase">الشهر:</span>
              <select 
                value={selectedMonthNum}
                onChange={(e) => setSelectedMonthNum(e.target.value)}
                className="bg-surface border border-border/60 rounded-lg px-2.5 py-1 text-xs font-black text-primary outline-none focus:border-primary cursor-pointer"
              >
                {months.map(m => (
                  <option key={m.value} value={m.value}>{m.name}</option>
                ))}
              </select>
            </div>
          </div>
          <button 
             onClick={() => {
               const allWorkerSalaries = filteredWorkers.map(worker => {
                 const saved = monthSalariesMap[worker.id];
                 const local = localSalaries[worker.id];
                 const data = local || saved || {};
                 
                 const baseSalary = Number(data.baseSalary ?? worker.basicSalary ?? 0);
                 const extraHours = Number(data.extraHours ?? 0);
                 const extraHoursValue = Number(data.extraHoursValue ?? 0);
                 const morabata = Number(data.morabata ?? 0);
                 const totalSalary = baseSalary + extraHoursValue + morabata;
                 const status = (data.status || 'pending') as 'pending' | 'paid';
                 const notes = data.notes || '';
                 const workLocation = worker.workplace || saved?.workLocation || '';

                 return {
                   workerId: worker.id,
                   workerName: worker.name,
                   workerNumber: worker.workerNumber,
                   month: selectedMonth,
                   baseSalary,
                   extraHours,
                   extraHoursValue,
                   morabata,
                   totalSalary,
                   status,
                   notes,
                   workLocation
                 } as SalaryRecord;
               }).filter(s => s.totalSalary > 0);
               onExportExcel(allWorkerSalaries);
             }}
             className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition-all shadow-md"
          >
             <Download className="w-4 h-4" />
             تصدير كشف الرواتب
          </button>
          <button 
             onClick={() => {
               const allWorkerSalaries = filteredWorkers.map(worker => {
                 const saved = monthSalariesMap[worker.id];
                 const local = localSalaries[worker.id];
                 const data = local || saved || {};
                 
                 const baseSalary = Number(data.baseSalary ?? worker.basicSalary ?? 0);
                 const extraHours = Number(data.extraHours ?? 0);
                 const extraHoursValue = Number(data.extraHoursValue ?? 0);
                 const morabata = Number(data.morabata ?? 0);
                 const totalSalary = baseSalary + extraHoursValue + morabata;
                 const status = (data.status || 'pending') as 'pending' | 'paid';
                 const notes = data.notes || '';
                 const workLocation = worker.workplace || saved?.workLocation || '';

                 return {
                   workerId: worker.id,
                   workerName: worker.name,
                   workerNumber: worker.workerNumber,
                   month: selectedMonth,
                   baseSalary,
                   extraHours,
                   extraHoursValue,
                   morabata,
                   totalSalary,
                   status,
                   notes,
                   workLocation
                 } as SalaryRecord;
               }).filter(s => s.totalSalary > 0);

               const repTotal = allWorkerSalaries.reduce((sum, s) => sum + s.totalSalary, 0);
               const repExtra = allWorkerSalaries.reduce((sum, s) => sum + s.extraHoursValue, 0);
               const repMorabata = allWorkerSalaries.reduce((sum, s) => sum + s.morabata, 0);

               onGeneratePDF({
                 title: `كشف رواتب تفصيلي - شهر ${selectedMonth}`,
                 salaries: allWorkerSalaries,
                 stats: {
                   'إجمالي الرواتب': repTotal.toLocaleString() + ' ريال',
                   'العمل الإضافي': repExtra.toLocaleString() + ' ريال',
                   'بدل المرابطة': repMorabata.toLocaleString() + ' ريال',
                   'عدد الموظفين': allWorkerSalaries.length
                 }
               });
             }}
             className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-xl text-sm font-black hover:bg-red-700 transition-all shadow-md"
          >
            <RefreshCw className="w-4 h-4" />
            طباعة تقرير PDF
          </button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">إجمالي الرواتب</span>
            <Coins className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-text-main">{stats.total.toLocaleString()} <span className="text-xs">ريال</span></div>
          <div className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            لشهر {selectedMonth}
          </div>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">العمل الإضافي</span>
            <Clock className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-black text-text-main">{stats.totalExtra.toLocaleString()} <span className="text-xs">ريال</span></div>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">بدل المرابطة</span>
            <ShieldPlus className="w-5 h-5 text-blue-500" />
          </div>
          <div className="text-2xl font-black text-text-main">{stats.totalMorabata.toLocaleString()} <span className="text-xs">ريال</span></div>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">حالة الدفع</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-4">
            <div>
               <div className="text-xl font-black text-emerald-600">{stats.paidCount}</div>
               <div className="text-[9px] font-black text-text-muted uppercase">تم الدفع</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
               <div className="text-xl font-black text-amber-600">{stats.pendingCount}</div>
               <div className="text-[9px] font-black text-text-muted uppercase">قيد الانتظار</div>
            </div>
          </div>
        </div>
      </div>

      {/* List Section */}
      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border bg-slate-50/50 flex flex-col md:flex-row gap-4 items-center justify-between">
           <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto flex-1">
              <div className="relative flex-1 md:max-w-xs">
                 <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                 <input 
                   type="text" 
                   placeholder="بحث باسم العامل أو الرقم الوظيفي..."
                   value={search}
                   onChange={(e) => setSearch(e.target.value)}
                   className="w-full pr-10 pl-4 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-primary transition-all font-black"
                 />
              </div>
              
              <div className="relative w-full md:w-64">
                 <Building className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4 shadow-sm" />
                 <select
                   value={companyFilter}
                   onChange={(e) => setCompanyFilter(e.target.value)}
                   className="w-full pr-10 pl-4 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-primary appearance-none cursor-pointer font-black text-text-main"
                 >
                   <option value="all">جميع شركات الاستقدام</option>
                   {companies.map(company => (
                     <option key={company} value={company}>{company}</option>
                   ))}
                 </select>
              </div>

              <div className="relative w-full md:w-64">
                 <MapPin className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                 <select
                   value={locationFilter}
                   onChange={(e) => setLocationFilter(e.target.value)}
                   className="w-full pr-10 pl-4 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-primary appearance-none cursor-pointer font-black text-text-main"
                 >
                   <option value="all">جميع مواقع العمل</option>
                   {locations.map(loc => (
                     <option key={loc} value={loc}>{loc}</option>
                   ))}
                 </select>
              </div>
           </div>
           
           <div className="text-[11px] font-black text-text-muted px-2 py-1 bg-background rounded-lg border border-border">
              عرض {filteredWorkers.length} عامل
           </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
             <thead>
                <tr className="bg-background border-b border-border">
                   <th className="px-6 py-4 text-[11px] font-black text-text-muted uppercase">العامل</th>
                   <th className="px-6 py-4 text-[11px] font-black text-text-muted uppercase text-center">الراتب الأساسي</th>
                   <th className="px-6 py-4 text-[11px] font-black text-text-muted uppercase text-center">ساعات إضافي</th>
                   <th className="px-6 py-4 text-[11px] font-black text-text-muted uppercase text-center">قيمة الإضافي</th>
                   <th className="px-6 py-4 text-[11px] font-black text-text-muted uppercase text-center">المرابطة</th>
                   <th className="px-6 py-4 text-[11px] font-black text-text-muted uppercase text-center text-primary">المجموع</th>
                   <th className="px-6 py-4 text-[11px] font-black text-text-muted uppercase text-center">الحالة</th>
                   <th className="px-6 py-4 text-[11px] font-black text-text-muted uppercase text-center">الإجراء</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-border/50">
                {filteredWorkers.map(worker => {
                  const saved = monthSalariesMap[worker.id];
                  const local = localSalaries[worker.id];
                  const data = local || saved || {
                    baseSalary: 0,
                    extraHours: 0,
                    extraHoursValue: 0,
                    morabata: 0,
                    totalSalary: 0,
                    status: 'pending'
                  };

                  return (
                    <tr key={worker.id} className="hover:bg-primary/[0.01] transition-colors">
                       <td className="px-6 py-4">
                          <div className="flex flex-col">
                             <div className="text-sm font-black text-text-main leading-none mb-1">{worker.name}</div>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-text-muted">{worker.workerNumber}</span>
                                {worker.workplace && (
                                  <>
                                    <span className="w-1 h-1 bg-border rounded-full" />
                                    <span className="text-[10px] font-bold text-primary flex items-center gap-0.5">
                                      <MapPin className="w-2.5 h-2.5" />
                                      {worker.workplace}
                                    </span>
                                  </>
                                )}
                             </div>
                          </div>
                       </td>
                       <td className="px-4 py-4">
                          <input 
                            type="number" 
                            value={data.baseSalary}
                            onChange={(e) => handleInputChange(worker.id, 'baseSalary', Number(e.target.value))}
                            className="w-24 mx-auto block p-2 text-center text-xs font-black bg-background border border-border rounded-lg outline-none focus:border-primary"
                          />
                       </td>
                       <td className="px-4 py-4">
                          <input 
                            type="number" 
                            value={data.extraHours}
                            onChange={(e) => handleInputChange(worker.id, 'extraHours', Number(e.target.value))}
                            className="w-16 mx-auto block p-2 text-center text-xs font-black bg-background border border-border rounded-lg outline-none focus:border-primary"
                          />
                       </td>
                       <td className="px-4 py-4">
                          <input 
                            type="number" 
                            value={data.extraHoursValue}
                            onChange={(e) => handleInputChange(worker.id, 'extraHoursValue', Number(e.target.value))}
                            className="w-24 mx-auto block p-2 text-center text-xs font-black bg-background border border-border rounded-lg outline-none focus:border-primary"
                          />
                       </td>
                       <td className="px-4 py-4">
                          <input 
                            type="number" 
                            value={data.morabata}
                            onChange={(e) => handleInputChange(worker.id, 'morabata', Number(e.target.value))}
                            className="w-24 mx-auto block p-2 text-center text-xs font-black bg-background border border-border rounded-lg outline-none focus:border-primary"
                          />
                       </td>
                       <td className="px-6 py-4 text-center font-black text-primary text-sm">
                          {data.totalSalary?.toLocaleString()}
                       </td>
                       <td className="px-4 py-4">
                          <select 
                            value={data.status}
                            onChange={(e) => handleInputChange(worker.id, 'status', e.target.value)}
                            className={`
                              w-full p-2 text-center text-[10px] font-black rounded-lg outline-none border transition-colors cursor-pointer
                              ${data.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
                            `}
                          >
                             <option value="pending">قيد الانتظار</option>
                             <option value="paid">تم الدفع</option>
                          </select>
                       </td>
                       <td className="px-6 py-4 text-center">
                          <button 
                            onClick={() => handleSave(worker)}
                            disabled={!local}
                            className={`
                              p-2 rounded-xl transition-all
                              ${local 
                                ? 'bg-primary text-white shadow-md hover:bg-secondary' 
                                : 'bg-background text-text-muted cursor-not-allowed'}
                            `}
                          >
                             <Save className="w-4 h-4" />
                          </button>
                       </td>
                    </tr>
                  );
                })}
             </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
