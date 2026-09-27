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
  TrendingUp,
  Download,
  Building,
  Filter,
  MapPin,
  CheckCircle2,
  Briefcase,
  Calendar,
  Calculator,
  Info,
  RotateCcw
} from 'lucide-react';
import { Worker, SalaryRecord } from '../types';
import { normalizeBusLocation } from '../lib/excelService';
import { calculateWorkerWorkingDays, calculateSalaryComponents } from '../lib/salaryCalculator';

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
  const [statusFilter, setStatusFilter] = useState<'all' | 'paid' | 'pending'>('all');

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
      const hasSavedSalary = !!monthSalariesMap[w.id];

      // Check if employee's contract expired in a prior month
      if (!hasSavedSalary && w.endDate) {
        const endYearMonth = w.endDate.substring(0, 7); // "YYYY-MM"
        if (endYearMonth < selectedMonth) {
          return false;
        }
      }

      // Check if employee has not started yet (future month)
      if (!hasSavedSalary && w.startDate) {
        const startYearMonth = w.startDate.substring(0, 7);
        if (startYearMonth > selectedMonth) {
          return false;
        }
      }

      const matchesSearch = w.name.toLowerCase().includes(search.toLowerCase()) || 
                           w.workerNumber.includes(search);
      const matchesCompany = companyFilter === 'all' || w.recruitmentCompany === companyFilter;
      
      const currentSalary = localSalaries[w.id] || monthSalariesMap[w.id];
      const activeLocation = currentSalary?.workLocation || w.workplace;
      const matchesLocation = locationFilter === 'all' || activeLocation === locationFilter;

      const currentStatus = currentSalary?.status || 'pending';
      const matchesStatus = statusFilter === 'all' || currentStatus === statusFilter;

      return matchesSearch && matchesCompany && matchesLocation && matchesStatus;
    });
  }, [workers, search, companyFilter, locationFilter, statusFilter, selectedMonth, monthSalariesMap, localSalaries]);

  /**
   * حساب بيانات الراتب الكاملة للعامل مع مراعاة أيام العمل
   */
  const getWorkerSalaryData = (worker: Worker) => {
    const saved = monthSalariesMap[worker.id];
    const local = localSalaries[worker.id];
    const data = local || saved || {};

    const daysCalc = calculateWorkerWorkingDays(worker.startDate, worker.endDate, selectedMonth);
    const workingDays = typeof data.workingDays === 'number' 
      ? Math.max(0, Math.min(30, Number(data.workingDays))) 
      : daysCalc.workingDays;

    const baseSalary = Number(data.baseSalary ?? worker.basicSalary ?? 0);
    const extraHours = Number(data.extraHours ?? 0);
    const extraHoursValue = Number(data.extraHoursValue ?? 0);
    const morabata = Number(data.morabata ?? 0);

    const comp = calculateSalaryComponents(baseSalary, workingDays, extraHoursValue, morabata);

    const status = (data.status || 'pending') as 'pending' | 'paid';
    const workLocation = data.workLocation || worker.workplace || '';
    const notes = data.notes || '';

    return {
      workerId: worker.id,
      workerName: worker.name,
      workerNumber: worker.workerNumber,
      month: selectedMonth,
      baseSalary,
      workingDays,
      earnedBaseSalary: comp.earnedBaseSalary,
      extraHours,
      extraHoursValue,
      morabata,
      totalSalary: comp.totalSalary,
      dailyRate: comp.dailyRate,
      daysCalc,
      status,
      workLocation,
      notes,
      isModified: !!local,
      isCustomDays: typeof data.workingDays === 'number' && data.workingDays !== daysCalc.workingDays
    };
  };

  const handleInputChange = (workerId: string, field: keyof SalaryRecord, value: any) => {
    setLocalSalaries(prev => {
      const worker = workers.find(w => w.id === workerId);
      const defaultBase = worker?.basicSalary ?? 0;
      const defaultWorkplace = worker?.workplace || '';
      const daysCalc = calculateWorkerWorkingDays(worker?.startDate, worker?.endDate, selectedMonth);

      const current = prev[workerId] || monthSalariesMap[workerId] || {
        workerId,
        month: selectedMonth,
        baseSalary: defaultBase,
        workingDays: daysCalc.workingDays,
        earnedBaseSalary: defaultBase,
        extraHours: 0,
        extraHoursValue: 0,
        morabata: 0,
        totalSalary: defaultBase,
        workLocation: defaultWorkplace,
        status: 'pending',
        notes: ''
      };
      
      const updated = { ...current, [field]: value };
      
      // إعادة احتساب الراتب المستحق والمجموع عند تغيير أي مدخل مالي أو عدد الأيام
      if (['baseSalary', 'workingDays', 'extraHoursValue', 'morabata'].includes(field as string)) {
        const base = Number(updated.baseSalary ?? defaultBase);
        const days = typeof updated.workingDays === 'number' ? Number(updated.workingDays) : daysCalc.workingDays;
        const extraVal = Number(updated.extraHoursValue || 0);
        const morab = Number(updated.morabata || 0);

        const comp = calculateSalaryComponents(base, days, extraVal, morab);
        updated.earnedBaseSalary = comp.earnedBaseSalary;
        updated.totalSalary = comp.totalSalary;
      }
      
      return { ...prev, [workerId]: updated };
    });
  };

  const handleResetDays = (workerId: string) => {
    const worker = workers.find(w => w.id === workerId);
    if (!worker) return;
    const daysCalc = calculateWorkerWorkingDays(worker.startDate, worker.endDate, selectedMonth);
    handleInputChange(workerId, 'workingDays', daysCalc.workingDays);
  };

  const handleSave = (worker: Worker) => {
    const salaryData = getWorkerSalaryData(worker);
    const existing = monthSalariesMap[worker.id];

    if (existing) {
      const updates: Partial<SalaryRecord> = {
        baseSalary: salaryData.baseSalary,
        workingDays: salaryData.workingDays,
        earnedBaseSalary: salaryData.earnedBaseSalary,
        extraHours: salaryData.extraHours,
        extraHoursValue: salaryData.extraHoursValue,
        morabata: salaryData.morabata,
        totalSalary: salaryData.totalSalary,
        workLocation: salaryData.workLocation,
        status: salaryData.status,
        notes: salaryData.notes,
        updatedAt: new Date()
      };
      
      onUpdateSalary(existing.id, updates);
      setLocalSalaries(prev => {
        const next = { ...prev };
        delete next[worker.id];
        return next;
      });
    } else {
      const dataToSave: Omit<SalaryRecord, 'id'> = {
        workerId: worker.id,
        workerName: worker.name,
        workerNumber: worker.workerNumber,
        month: selectedMonth,
        baseSalary: salaryData.baseSalary,
        workingDays: salaryData.workingDays,
        earnedBaseSalary: salaryData.earnedBaseSalary,
        extraHours: salaryData.extraHours,
        extraHoursValue: salaryData.extraHoursValue,
        morabata: salaryData.morabata,
        totalSalary: salaryData.totalSalary,
        workLocation: salaryData.workLocation,
        status: salaryData.status,
        notes: salaryData.notes,
        createdAt: new Date(),
        updatedAt: new Date()
      };
      onSaveSalary(dataToSave);
      setLocalSalaries(prev => {
        const next = { ...prev };
        delete next[worker.id];
        return next;
      });
    }
  };

  const handleSaveAll = () => {
    Object.keys(localSalaries).forEach(workerId => {
      const worker = workers.find(w => w.id === workerId);
      if (worker) {
        handleSave(worker);
      }
    });
  };

  const handleMarkAllStatus = (newStatus: 'paid' | 'pending') => {
    filteredWorkers.forEach(worker => {
      const salaryData = getWorkerSalaryData(worker);
      setLocalSalaries(prev => ({
        ...prev,
        [worker.id]: {
          workerId: worker.id,
          month: selectedMonth,
          baseSalary: salaryData.baseSalary,
          workingDays: salaryData.workingDays,
          earnedBaseSalary: salaryData.earnedBaseSalary,
          extraHours: salaryData.extraHours,
          extraHoursValue: salaryData.extraHoursValue,
          morabata: salaryData.morabata,
          totalSalary: salaryData.totalSalary,
          workLocation: salaryData.workLocation,
          status: newStatus,
          notes: salaryData.notes
        }
      }));
    });
  };

  const workplaceStats = useMemo(() => {
    const map: Record<string, { count: number; total: number }> = {};
    filteredWorkers.forEach(w => {
      const salaryData = getWorkerSalaryData(w);
      const loc = normalizeBusLocation(salaryData.workLocation || w.workplace);
      if (!map[loc]) {
        map[loc] = { count: 0, total: 0 };
      }
      map[loc].count += 1;
      map[loc].total += salaryData.totalSalary;
    });
    return Object.entries(map).map(([location, data]) => ({ location, ...data }));
  }, [filteredWorkers, monthSalariesMap, localSalaries, selectedMonth]);

  const stats = useMemo(() => {
    let total = 0;
    let totalExtra = 0;
    let totalMorabata = 0;
    let totalBaseEarned = 0;
    let paidCount = 0;
    let pendingCount = 0;

    filteredWorkers.forEach(worker => {
      const data = getWorkerSalaryData(worker);
      total += data.totalSalary;
      totalExtra += data.extraHoursValue;
      totalMorabata += data.morabata;
      totalBaseEarned += data.earnedBaseSalary;
      if (data.status === 'paid') paidCount++;
      else pendingCount++;
    });

    return {
      total,
      totalExtra,
      totalMorabata,
      totalBaseEarned,
      paidCount,
      pendingCount
    };
  }, [filteredWorkers, monthSalariesMap, localSalaries, selectedMonth]);

  const getAllWorkerSalaryRecords = () => {
    return filteredWorkers.map(worker => {
      const d = getWorkerSalaryData(worker);
      return {
        workerId: d.workerId,
        workerName: d.workerName,
        workerNumber: d.workerNumber,
        month: d.month,
        baseSalary: d.baseSalary,
        workingDays: d.workingDays,
        earnedBaseSalary: d.earnedBaseSalary,
        extraHours: d.extraHours,
        extraHoursValue: d.extraHoursValue,
        morabata: d.morabata,
        totalSalary: d.totalSalary,
        status: d.status,
        notes: d.notes,
        workLocation: d.workLocation
      } as SalaryRecord;
    }).filter(s => s.totalSalary > 0 || s.baseSalary > 0);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-text-main flex items-center gap-2">
            <CircleDollarSign className="w-7 h-7 text-primary" />
            إدارة سلم الرواتب والأجور
          </h2>
          <p className="text-text-muted text-xs font-bold mt-1">
            احتساب رواتب السائقين آلياً وفق أيام العمل وبداية الخدمة والعمل الإضافي والمرابطة
          </p>
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
               const allWorkerSalaries = getAllWorkerSalaryRecords();
               onExportExcel(allWorkerSalaries);
             }}
             className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-black hover:bg-emerald-700 transition-all shadow-md"
          >
             <Download className="w-4 h-4" />
             تصدير كشف الرواتب (Excel)
          </button>
          <button 
             onClick={() => {
               const records = getAllWorkerSalaryRecords();
               const repTotal = records.reduce((sum, s) => sum + s.totalSalary, 0);
               const repExtra = records.reduce((sum, s) => sum + s.extraHoursValue, 0);
               const repMorabata = records.reduce((sum, s) => sum + s.morabata, 0);
               const repBaseEarned = records.reduce((sum, s) => sum + (s.earnedBaseSalary ?? s.baseSalary), 0);

               onGeneratePDF({
                 title: `كشف رواتب تفصيلي - شهر ${selectedMonth}`,
                 salaries: records,
                 stats: {
                   'إجمالي الرواتب المستحقة': repTotal.toLocaleString() + ' ريال',
                   'الراتب الأساسي المستحق': repBaseEarned.toLocaleString() + ' ريال',
                   'العمل الإضافي': repExtra.toLocaleString() + ' ريال',
                   'بدل المرابطة': repMorabata.toLocaleString() + ' ريال',
                   'عدد الموظفين': records.length
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
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">إجمالي الرواتب المستحقة</span>
            <Coins className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="text-2xl font-black text-text-main">{stats.total.toLocaleString()} <span className="text-xs">ريال</span></div>
          <div className="text-[10px] font-bold text-emerald-600 mt-1 flex items-center gap-1">
            <TrendingUp className="w-3 h-3" />
            صافي مستحق لشهر {selectedMonth}
          </div>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">الراتب الأساسي المستحق</span>
            <Briefcase className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="text-2xl font-black text-text-main">{stats.totalBaseEarned.toLocaleString()} <span className="text-xs">ريال</span></div>
          <div className="text-[10px] font-bold text-text-muted mt-1">
            محسوب حسب أيام العمل الفعلية
          </div>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">الإضافي والمرابطة</span>
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-amber-500" />
              <ShieldPlus className="w-4 h-4 text-blue-500" />
            </div>
          </div>
          <div className="text-2xl font-black text-text-main">{(stats.totalExtra + stats.totalMorabata).toLocaleString()} <span className="text-xs">ريال</span></div>
          <div className="text-[10px] font-bold text-text-muted mt-1 flex items-center gap-2">
            <span>إضافي: {stats.totalExtra.toLocaleString()}</span>
            <span>•</span>
            <span>مرابطة: {stats.totalMorabata.toLocaleString()}</span>
          </div>
        </div>
        <div className="bg-surface p-5 rounded-2xl border border-border shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-black text-text-muted uppercase tracking-wider">حالة الدفع</span>
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div className="flex items-center gap-4">
            <div>
               <div className="text-xl font-black text-emerald-600">{stats.paidCount}</div>
               <div className="text-[9px] font-black text-text-muted uppercase">تم الصرف</div>
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
               <div className="text-xl font-black text-amber-600">{stats.pendingCount}</div>
               <div className="text-[9px] font-black text-text-muted uppercase">قيد الانتظار</div>
            </div>
          </div>
        </div>
      </div>

      {/* شريط توضيح قاعدة احتساب الراتب وساعات العمل */}
      <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-blue-900 text-xs flex flex-col md:flex-row items-start gap-3 shadow-2xs">
        <div className="p-2 bg-blue-100/80 text-blue-700 rounded-xl shrink-0 mt-0.5">
          <Calculator className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-black text-blue-950 text-sm">قاعدة احتساب العمليات في سلم الرواتب:</h4>
            <span className="px-2 py-0.5 bg-blue-200/70 text-blue-900 font-black text-[10px] rounded-md">الشهر القياسي = 30 يوماً</span>
            <span className="px-2 py-0.5 bg-emerald-200/70 text-emerald-950 font-black text-[10px] rounded-md">جبر الفواصل لأقرب 5 ر.س (مثلاً 1213.33 ← 1215)</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-[11px] text-blue-900/90 leading-relaxed pt-1">
            <div className="bg-surface/80 p-2.5 rounded-xl border border-blue-100">
              <strong className="block text-primary mb-0.5">1. بداية عمل السائق:</strong>
              إذا كانت البداية في نفس الشهر الحالي يُحسب من تاريخ مباشرته حتى نهاية الشهر. وإذا بدأ في شهر سابق، يُحسب من بداية الشهر الحالي (اليوم الأول).
            </div>
            <div className="bg-surface/80 p-2.5 rounded-xl border border-blue-100">
              <strong className="block text-primary mb-0.5">2. نهاية عمل السائق:</strong>
              إذا لم يكن هناك نهاية عمل مسجلة، يُعتبر نهاية الشهر هو يوم <span className="font-black">30</span> تلقائياً. وإذا كان هناك تاريخ نهاية بنفس الشهر يُحسب حتى ذلك اليوم.
            </div>
            <div className="bg-surface/80 p-2.5 rounded-xl border border-blue-100">
              <strong className="block text-primary mb-0.5">3. معادلة المجموع وجبر الفواصل:</strong>
              <span className="font-black text-emerald-800">المجموع = (الأساسي ÷ 30 × أيام العمل) + الإضافي + المرابطة (أي فواصل تُجبر للأعلى لأقرب 5)</span>
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

              <div className="relative w-full md:w-56">
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

              <div className="relative w-full md:w-48">
                 <Filter className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                 <select
                   value={statusFilter}
                   onChange={(e) => setStatusFilter(e.target.value as any)}
                   className="w-full pr-10 pl-4 py-2 text-sm bg-background border border-border rounded-xl outline-none focus:border-primary appearance-none cursor-pointer font-black text-text-main"
                 >
                   <option value="all">جميع الحالات</option>
                   <option value="paid">تم الصرف (تم الدفع)</option>
                   <option value="pending">قيد الانتظار</option>
                 </select>
              </div>
           </div>
           
           <div className="flex items-center gap-2">
              <span className="text-[11px] font-black text-text-muted px-2.5 py-1 bg-background rounded-lg border border-border">
                عرض {filteredWorkers.length} سائق / عامل
              </span>
           </div>
        </div>

        {/* Workplace Breakdown Badges */}
        {workplaceStats.length > 0 && (
          <div className="p-3 bg-slate-100/60 border-b border-border flex items-center gap-2 overflow-x-auto">
             <span className="text-[10px] font-black text-text-muted uppercase flex items-center gap-1 shrink-0">
               <Briefcase className="w-3.5 h-3.5 text-primary" /> توزيع الرواتب حسب موقع العمل:
             </span>
             <div className="flex items-center gap-2">
               {workplaceStats.map(stat => (
                 <div key={stat.location} className="flex items-center gap-1.5 px-2.5 py-1 bg-surface border border-border/80 rounded-xl text-xs shadow-2xs shrink-0">
                   <MapPin className="w-3 h-3 text-amber-600" />
                   <span className="font-black text-text-main">{stat.location}:</span>
                   <span className="font-mono font-bold text-primary">{stat.total.toLocaleString()} ريال</span>
                   <span className="text-[10px] text-text-muted">({stat.count} سائق)</span>
                 </div>
               ))}
             </div>
          </div>
        )}

        {/* Bulk Action Controls */}
        <div className="px-4 py-2 bg-slate-50 border-b border-border flex flex-wrap items-center justify-between gap-3 text-xs">
           <div className="flex items-center gap-2">
              <span className="font-bold text-text-muted text-[11px]">إجراءات سريعة:</span>
              <button
                onClick={() => handleMarkAllStatus('paid')}
                className="px-3 py-1 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-lg hover:bg-emerald-100 font-black transition-all flex items-center gap-1 text-[11px]"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                تحديد المعروضين كـ تم الصرف
              </button>
              <button
                onClick={() => handleMarkAllStatus('pending')}
                className="px-3 py-1 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg hover:bg-amber-100 font-black transition-all flex items-center gap-1 text-[11px]"
              >
                <Clock className="w-3.5 h-3.5" />
                تحديد المعروضين كـ قيد الانتظار
              </button>
           </div>

           {Object.keys(localSalaries).length > 0 && (
              <button
                onClick={handleSaveAll}
                className="px-4 py-1.5 bg-primary text-white font-black rounded-xl shadow-md hover:bg-secondary transition-all flex items-center gap-1.5 animate-pulse"
              >
                <Save className="w-4 h-4" />
                حفظ كافة التغييرات ({Object.keys(localSalaries).length})
              </button>
           )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-right">
             <thead>
                <tr className="bg-background border-b border-border">
                   <th className="px-5 py-4 text-[11px] font-black text-text-muted uppercase">السائق / العامل</th>
                   <th className="px-3 py-4 text-[11px] font-black text-text-muted uppercase text-center">مكان العمل</th>
                   <th className="px-3 py-4 text-[11px] font-black text-text-muted uppercase text-center">الراتب الأساسي</th>
                   <th className="px-3 py-4 text-[11px] font-black text-text-muted uppercase text-center">أيام العمل</th>
                   <th className="px-3 py-4 text-[11px] font-black text-text-muted uppercase text-center">الأساسي المستحق</th>
                   <th className="px-3 py-4 text-[11px] font-black text-text-muted uppercase text-center">ساعات إضافي</th>
                   <th className="px-3 py-4 text-[11px] font-black text-text-muted uppercase text-center">قيمة الإضافي</th>
                   <th className="px-3 py-4 text-[11px] font-black text-text-muted uppercase text-center">المرابطة</th>
                   <th className="px-4 py-4 text-[11px] font-black text-primary uppercase text-center">المجموع</th>
                   <th className="px-3 py-4 text-[11px] font-black text-text-muted uppercase text-center">الحالة</th>
                   <th className="px-3 py-4 text-[11px] font-black text-text-muted uppercase text-center">الإجراء</th>
                </tr>
             </thead>
             <tbody className="divide-y divide-border/50">
                {filteredWorkers.map(worker => {
                  const data = getWorkerSalaryData(worker);
                  const isModified = data.isModified;

                  return (
                    <tr key={worker.id} className={`hover:bg-primary/[0.01] transition-colors ${isModified ? 'bg-amber-50/20' : ''}`}>
                       {/* Worker Details & Date Badges */}
                       <td className="px-5 py-4">
                          <div className="flex flex-col">
                             <div className="flex flex-wrap items-center gap-1.5 mb-1">
                               <span className="text-sm font-black text-text-main leading-none">{worker.name}</span>
                               {data.daysCalc.isStartedThisMonth && (
                                 <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-md flex items-center gap-1">
                                   <Calendar className="w-2.5 h-2.5" />
                                   <span>بدأ: {worker.startDate}</span>
                                 </span>
                               )}
                               {worker.endDate && (
                                 <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-md flex items-center gap-1">
                                   <Clock className="w-2.5 h-2.5" />
                                   <span>نهاية: {worker.endDate}</span>
                                 </span>
                               )}
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold text-text-muted">الرقم: {worker.workerNumber}</span>
                                {worker.recruitmentCompany && (
                                  <>
                                    <span className="w-1 h-1 bg-border rounded-full" />
                                    <span className="text-[10px] font-bold text-text-muted">{worker.recruitmentCompany}</span>
                                  </>
                                )}
                             </div>
                             <div className="text-[10px] text-primary/80 font-bold mt-1 flex items-center gap-1">
                               <Info className="w-3 h-3 text-primary/70 shrink-0" />
                               <span>{data.daysCalc.explanation}</span>
                             </div>
                          </div>
                       </td>

                       {/* Workplace */}
                       <td className="px-2 py-4">
                          <input 
                            type="text" 
                            value={data.workLocation}
                            onChange={(e) => handleInputChange(worker.id, 'workLocation', e.target.value)}
                            placeholder="مكان العمل..."
                            className="w-28 mx-auto block p-2 text-center text-xs font-bold bg-background border border-border rounded-lg outline-none focus:border-primary text-text-main shadow-2xs"
                          />
                       </td>

                       {/* Monthly Base Salary */}
                       <td className="px-2 py-4">
                          <input 
                            type="number" 
                            value={data.baseSalary}
                            onChange={(e) => handleInputChange(worker.id, 'baseSalary', Number(e.target.value))}
                            className="w-24 mx-auto block p-2 text-center text-xs font-black bg-background border border-border rounded-lg outline-none focus:border-primary shadow-2xs"
                            title="الراتب الأساسي الشهري الكامل"
                          />
                       </td>

                       {/* Working Days */}
                       <td className="px-2 py-4 text-center">
                          <div className="flex flex-col items-center gap-1">
                             <div className="flex items-center justify-center gap-1">
                                <input 
                                  type="number"
                                  min="0"
                                  max="30"
                                  value={data.workingDays}
                                  onChange={(e) => handleInputChange(worker.id, 'workingDays', Math.max(0, Math.min(30, Number(e.target.value))))}
                                  className={`w-14 p-1.5 text-center text-xs font-black rounded-lg outline-none border focus:border-primary shadow-2xs ${
                                    data.workingDays === 30 
                                      ? 'bg-background border-border text-text-main' 
                                      : 'bg-amber-50 border-amber-300 text-amber-900'
                                  }`}
                                  title="عدد أيام العمل في هذا الشهر (الشهر معتمد 30 يوماً)"
                                />
                                <span className="text-[11px] font-bold text-text-muted">/ 30</span>
                             </div>
                             {data.isCustomDays && (
                               <button
                                 onClick={() => handleResetDays(worker.id)}
                                 className="text-[9px] text-amber-700 hover:text-amber-900 underline font-bold flex items-center gap-0.5"
                                 title="استعادة الأيام المحسوبة تلقائياً"
                               >
                                 <RotateCcw className="w-2.5 h-2.5" />
                                 تلقائي ({data.daysCalc.workingDays})
                               </button>
                             )}
                          </div>
                       </td>

                       {/* Earned Base Salary (الأساسي المستحق) */}
                       <td className="px-2 py-4 text-center">
                          <div className="font-mono font-black text-xs text-text-main">
                             {data.earnedBaseSalary.toLocaleString()} <span className="text-[10px]">ريال</span>
                          </div>
                          {data.workingDays < 30 ? (
                            <div className="text-[9px] font-bold text-amber-700 mt-0.5">
                               ({data.workingDays} من 30 يوم)
                            </div>
                          ) : (
                            <div className="text-[9px] text-emerald-600 font-bold mt-0.5">
                               (كامل الشهر)
                            </div>
                          )}
                       </td>

                       {/* Extra Hours */}
                       <td className="px-2 py-4">
                          <input 
                            type="number" 
                            value={data.extraHours}
                            onChange={(e) => handleInputChange(worker.id, 'extraHours', Number(e.target.value))}
                            className="w-14 mx-auto block p-2 text-center text-xs font-black bg-background border border-border rounded-lg outline-none focus:border-primary shadow-2xs"
                          />
                       </td>

                       {/* Extra Hours Value */}
                       <td className="px-2 py-4">
                          <input 
                            type="number" 
                            value={data.extraHoursValue}
                            onChange={(e) => handleInputChange(worker.id, 'extraHoursValue', Number(e.target.value))}
                            className="w-20 mx-auto block p-2 text-center text-xs font-black bg-background border border-border rounded-lg outline-none focus:border-primary shadow-2xs"
                          />
                       </td>

                       {/* Morabata */}
                       <td className="px-2 py-4">
                          <input 
                            type="number" 
                            value={data.morabata}
                            onChange={(e) => handleInputChange(worker.id, 'morabata', Number(e.target.value))}
                            className="w-20 mx-auto block p-2 text-center text-xs font-black bg-background border border-border rounded-lg outline-none focus:border-primary shadow-2xs"
                          />
                       </td>

                       {/* Total Salary (المجموع) */}
                       <td className="px-3 py-4 text-center">
                          <div className="text-sm font-black text-primary">
                             {data.totalSalary.toLocaleString()} <span className="text-[10px]">ريال</span>
                          </div>
                          <div className="text-[9px] text-text-muted font-mono mt-0.5" title="الأساسي المستحق + الإضافي + المرابطة">
                             {data.earnedBaseSalary.toLocaleString()} + {data.extraHoursValue.toLocaleString()} + {data.morabata.toLocaleString()}
                          </div>
                       </td>

                       {/* Status */}
                       <td className="px-2 py-4">
                          <select 
                            value={data.status}
                            onChange={(e) => handleInputChange(worker.id, 'status', e.target.value)}
                            className={`
                              w-24 mx-auto block p-2 text-center text-[10px] font-black rounded-lg outline-none border transition-colors cursor-pointer shadow-2xs
                              ${data.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-amber-50 text-amber-700 border-amber-200'}
                            `}
                          >
                             <option value="pending">قيد الانتظار</option>
                             <option value="paid">تم الصرف</option>
                          </select>
                       </td>

                       {/* Action */}
                       <td className="px-2 py-4 text-center">
                          <button 
                            onClick={() => handleSave(worker)}
                            disabled={!isModified}
                            title={isModified ? 'حفظ التغييرات' : 'لا توجد تغييرات معلقة'}
                            className={`
                              p-2 rounded-xl transition-all flex items-center justify-center mx-auto
                              ${isModified 
                                ? 'bg-primary text-white shadow-md hover:bg-secondary cursor-pointer' 
                                : 'bg-background text-text-muted opacity-40 cursor-not-allowed'}
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
