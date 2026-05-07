import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Filter,
  Plus, 
  FileDown, 
  Download, 
  Upload,
  RefreshCw, 
  User, 
  Calendar,
  Building2,
  Phone,
  ClipboardList,
  Edit,
  Trash2,
  ChevronDown,
  ChevronUp,
  X,
  Bus as BusIcon,
  Eye
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Worker } from '../types';
import { differenceInDays, parseISO } from 'date-fns';
import { DeleteConfirmModal } from './DeleteConfirmModal';
import { WorkerDetailsModal } from './WorkerDetailsModal';

interface WorkerListProps {
  workers: Worker[];
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (worker: Worker) => void;
  onDelete: (id: string) => void;
  onExportExcel: (data: Worker[]) => void;
  onExportPdf: (data: Worker[]) => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const WorkerList: React.FC<WorkerListProps> = ({ 
  workers, 
  isAdmin, 
  onAdd, 
  onEdit, 
  onDelete,
  onExportExcel,
  onExportPdf,
  onImport
}) => {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({
    workplace: '',
    clientName: '',
    recruitmentCompany: '',
    busStatus: 'all' as 'all' | 'linked' | 'unlinked'
  });
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState<keyof Worker>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
    name?: string;
  }>({
    isOpen: false,
    id: null
  });
  const [selectedWorkerForDetails, setSelectedWorkerForDetails] = useState<Worker | null>(null);

  const [viewMode, setViewMode] = useState<'grouped' | 'table'>('grouped');
  const [groupBy, setGroupBy] = useState<'workplace' | 'clientName'>('workplace');
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const workplaces = useMemo(() => Array.from(new Set(workers.map(w => w.workplace))).filter(Boolean).sort(), [workers]);
  const clients = useMemo(() => Array.from(new Set(workers.map(w => w.clientName))).filter(Boolean).sort(), [workers]);
  const companies = useMemo(() => Array.from(new Set(workers.map(w => w.recruitmentCompany))).filter(Boolean).sort(), [workers]);

  const filteredWorkers = useMemo(() => {
    return workers.filter(w => {
      const matchesSearch = 
        w.name.toLowerCase().includes(search.toLowerCase()) ||
        w.iqamaNumber.includes(search) ||
        w.workplace.toLowerCase().includes(search.toLowerCase()) ||
        w.workerNumber.includes(search) ||
        (w.assignedBusOperationalNumber && w.assignedBusOperationalNumber.toLowerCase().includes(search.toLowerCase()));
      
      const matchesWorkplace = !filters.workplace || w.workplace === filters.workplace;
      const matchesClient = !filters.clientName || w.clientName === filters.clientName;
      const matchesCompany = !filters.recruitmentCompany || w.recruitmentCompany === filters.recruitmentCompany;
      const matchesBusStatus = 
        filters.busStatus === 'all' ? true :
        filters.busStatus === 'linked' ? !!w.assignedBusId :
        !w.assignedBusId;

      return matchesSearch && matchesWorkplace && matchesClient && matchesCompany && matchesBusStatus;
    }).sort((a, b) => {
      const valA = a[sortField] || '';
      const valB = b[sortField] || '';
      if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
      if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }, [workers, search, filters, sortField, sortOrder]);

  const groupedWorkers = useMemo(() => {
    const groups: { [key: string]: Worker[] } = {};
    filteredWorkers.forEach(worker => {
      const group = worker[groupBy] || 'غير محدد';
      if (!groups[group]) groups[group] = [];
      groups[group].push(worker);
    });
    return groups;
  }, [filteredWorkers, groupBy]);

  const toggleGroup = (group: string) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(group)) {
      newExpanded.delete(group);
    } else {
      newExpanded.add(group);
    }
    setExpandedGroups(newExpanded);
  };

  const toggleSort = (field: keyof Worker) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  const calculateDays = (start: string, end: string) => {
    try {
      const days = differenceInDays(parseISO(end), parseISO(start));
      return days >= 0 ? days : 0;
    } catch (e) {
      return 0;
    }
  };

  const SortIcon = ({ field }: { field: keyof Worker }) => {
    if (sortField !== field) return null;
    return sortOrder === 'asc' ? <ChevronUp className="w-3 h-3 inline mr-1" /> : <ChevronDown className="w-3 h-3 inline mr-1" />;
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-text-main">الرقابة والمتابعة</h2>
          <p className="text-text-muted text-sm mt-1">إدارة بيانات العمال والمقاولين ومتابعة فترات الدوام</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-xs font-black hover:bg-secondary transition-all shadow-sm shadow-primary/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              إضافة عامل جديد
            </button>
          )}
          
          <div className="h-6 w-px bg-border mx-1 hidden sm:block" />

          {isAdmin && (
            <label className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-main rounded-xl text-xs font-bold hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all cursor-pointer shadow-sm">
              <Upload className="w-4 h-4 text-emerald-600" />
              <span>استيراد Excel</span>
              <input 
                type="file" 
                accept=".xlsx, .xls" 
                className="hidden" 
                onChange={onImport}
              />
            </label>
          )}

          <button 
            onClick={() => onExportExcel(filteredWorkers)}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-main rounded-xl text-xs font-bold hover:bg-emerald-50 hover:border-emerald-200 hover:text-emerald-700 transition-all shadow-sm"
          >
            <Download className="w-4 h-4 text-emerald-600" />
            <span>تصدير Excel</span>
          </button>

          <button 
            onClick={() => onExportPdf(filteredWorkers)}
            className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-main rounded-xl text-xs font-bold hover:bg-red-50 hover:border-red-200 hover:text-red-700 transition-all shadow-sm"
          >
            <FileDown className="w-4 h-4 text-red-600" />
            <span>تصدير PDF</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-surface p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <ClipboardList className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase">إجمالي العمال</p>
            <p className="text-xl font-black text-text-main">{workers.length}</p>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600">
            <BusIcon className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase">سائقين مرتبطين</p>
            <p className="text-xl font-black text-text-main">{workers.filter(w => w.assignedBusId).length}</p>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600">
            <User className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase">عمال بدون حافلة</p>
            <p className="text-xl font-black text-text-main">{workers.filter(w => !w.assignedBusId).length}</p>
          </div>
        </div>
        <div className="bg-surface p-4 rounded-2xl border border-border flex items-center gap-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[10px] font-bold text-text-muted uppercase">عدد الشركات</p>
            <p className="text-xl font-black text-text-main">{companies.length}</p>
          </div>
        </div>
      </div>

      <div className="bg-surface rounded-3xl border border-border shadow-sm overflow-hidden min-h-[500px] flex flex-col">
        <div className="p-6 border-b border-border bg-background/30 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-center w-full">
            <div className="flex items-center gap-4">
              <div className="flex bg-surface border border-border rounded-xl p-1 shadow-sm">
                <button 
                  onClick={() => setViewMode('grouped')}
                  className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${viewMode === 'grouped' ? 'bg-primary text-white' : 'text-text-muted hover:bg-background'}`}
                >
                  المناطق
                </button>
                <button 
                  onClick={() => setViewMode('table')}
                  className={`px-4 py-1.5 text-xs font-black rounded-lg transition-all ${viewMode === 'table' ? 'bg-primary text-white' : 'text-text-muted hover:bg-background'}`}
                >
                  الجدول
                </button>
              </div>

              {viewMode === 'grouped' && (
                <div className="flex items-center gap-2 px-3 py-1 bg-background/50 rounded-xl border border-border">
                  <span className="text-[10px] font-black text-text-muted">ترتيب حسب:</span>
                  <select 
                    value={groupBy}
                    onChange={(e) => {
                      setGroupBy(e.target.value as any);
                      setExpandedGroups(new Set()); // Collapse all when switching
                    }}
                    className="bg-transparent text-[10px] font-black text-primary outline-none cursor-pointer"
                  >
                    <option value="workplace">المنطقة (مكان العمل)</option>
                    <option value="clientName">العميل</option>
                  </select>
                </div>
              )}
            </div>

            <div className="relative w-full md:w-96 flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
                <input 
                  type="text"
                  placeholder="ابحث باسم العامل، رقم الإقامة، مكان العمل، أو رقم الحافلة..."
                  className="w-full pr-10 pl-4 py-2.5 bg-surface border border-border rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-sm"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <button 
                onClick={() => setShowFilters(!showFilters)}
                className={`p-2.5 rounded-xl transition-all border shrink-0 ${showFilters ? 'bg-primary text-white border-primary shadow-md' : 'bg-surface text-text-muted border-border hover:bg-background shadow-sm'}`}
                title="الفلاتر المتقدمة"
              >
                <Filter className="w-5 h-5" />
              </button>
            </div>
            <button 
              onClick={() => window.location.reload()}
              className="p-2.5 bg-surface border border-border text-text-muted rounded-xl hover:bg-background transition-colors shadow-sm"
              title="تحديث البيانات"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          <AnimatePresence>
            {showFilters && (
              <motion.div 
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden border-t border-border pt-4 mt-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4" dir="rtl">
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted mr-1">حالة الحافلة</label>
                    <div className="flex bg-surface border border-border rounded-xl p-1 shadow-sm">
                      <button 
                        onClick={() => setFilters(f => ({ ...f, busStatus: 'all' }))}
                        className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${filters.busStatus === 'all' ? 'bg-primary text-white' : 'text-text-muted hover:bg-background'}`}
                      >
                        الكل
                      </button>
                      <button 
                        onClick={() => setFilters(f => ({ ...f, busStatus: 'linked' }))}
                        className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${filters.busStatus === 'linked' ? 'bg-emerald-500 text-white' : 'text-text-muted hover:bg-background'}`}
                      >
                        مرتبط
                      </button>
                      <button 
                        onClick={() => setFilters(f => ({ ...f, busStatus: 'unlinked' }))}
                        className={`flex-1 py-1.5 text-[10px] font-black rounded-lg transition-all ${filters.busStatus === 'unlinked' ? 'bg-amber-500 text-white' : 'text-text-muted hover:bg-background'}`}
                      >
                        غير مرتبط
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted mr-1">مكان العمل</label>
                    <select 
                      value={filters.workplace}
                      onChange={(e) => setFilters(f => ({ ...f, workplace: e.target.value }))}
                      className="w-full p-2.5 bg-surface border border-border rounded-xl outline-none focus:border-primary text-sm shadow-sm font-semibold"
                    >
                      <option value="">الكل</option>
                      {workplaces.map(w => <option key={w} value={w}>{w}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted mr-1">العميل</label>
                    <select 
                      value={filters.clientName}
                      onChange={(e) => setFilters(f => ({ ...f, clientName: e.target.value }))}
                      className="w-full p-2.5 bg-surface border border-border rounded-xl outline-none focus:border-primary text-sm shadow-sm font-semibold"
                    >
                      <option value="">الكل</option>
                      {clients.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-text-muted mr-1">شركة الاستقدام</label>
                    <select 
                      value={filters.recruitmentCompany}
                      onChange={(e) => setFilters(f => ({ ...f, recruitmentCompany: e.target.value }))}
                      className="w-full p-2.5 bg-surface border border-border rounded-xl outline-none focus:border-primary text-sm shadow-sm font-semibold"
                    >
                      <option value="">الكل</option>
                      {companies.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>
                <div className="flex justify-end mt-4">
                  <button 
                    onClick={() => setFilters({ workplace: '', clientName: '', recruitmentCompany: '', busStatus: 'all' })}
                    className="text-[10px] font-bold text-primary hover:underline bg-primary/5 px-3 py-1 rounded-full"
                  >
                    إعادة ضبط الفلاتر
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {viewMode === 'table' ? (
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-right border-collapse">
              <thead>
                <tr className="bg-background/50 border-b border-border">
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase cursor-pointer hover:text-primary transition-colors" onClick={() => toggleSort('workerNumber')}>رقم العامل <SortIcon field="workerNumber" /></th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase cursor-pointer hover:text-primary transition-colors" onClick={() => toggleSort('name')}>اسم العامل <SortIcon field="name" /></th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase cursor-pointer hover:text-primary transition-colors" onClick={() => toggleSort('iqamaNumber')}>رقم الإقامة <SortIcon field="iqamaNumber" /></th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase">الجوال</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase">شركة الاستقدام</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase">مكان العمل</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase">بداية العمل</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase">نهاية العمل</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase text-center bg-primary/5">أيام الدوام</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase text-center">الحافلة المرتبطة</th>
                  <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase">العميل</th>
                  {isAdmin && <th className="px-4 py-2.5 text-[10px] font-bold text-text-muted uppercase text-center">الإجراءات</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                <AnimatePresence>
                {filteredWorkers.map((worker) => {
                  const daysRemaining = calculateDays(new Date().toISOString().split('T')[0], worker.endDate);
                  const isExpiringSoon = daysRemaining <= 7 && daysRemaining >= 0;

                  return (
                    <motion.tr 
                      key={worker.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`hover:bg-primary/[0.01] transition-colors group cursor-pointer ${isExpiringSoon ? 'bg-amber-50/30' : ''}`}
                      onClick={() => setSelectedWorkerForDetails(worker)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-black text-text-main">
                        <div className="flex items-center gap-1.5">
                          <span className={`w-1.5 h-1.5 rounded-full ${isExpiringSoon ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
                          {worker.workerNumber}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs font-bold text-text-main">
                        <div className="flex items-center gap-2">
                          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs shrink-0 border transition-colors ${isExpiringSoon ? 'bg-amber-100/50 text-amber-600 border-amber-200' : 'bg-primary/5 text-primary border-primary/10'}`}>
                            <User className="w-3.5 h-3.5" />
                          </div>
                          <div className="flex flex-col">
                            <span className={`${isExpiringSoon ? 'text-amber-900' : 'text-text-main'}`}>{worker.name}</span>
                            <span className="text-[9px] text-text-muted font-normal">{worker.recruitmentCompany}</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-text-main font-mono">{worker.iqamaNumber}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-text-main font-medium">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            navigator.clipboard.writeText(worker.mobileNumber);
                            alert('تم نسخ الرقم: ' + worker.mobileNumber);
                          }}
                          className="flex items-center gap-1 hover:text-primary transition-colors cursor-copy group/phone"
                          title="انقر لنسخ الرقم"
                        >
                          <Phone className="w-3 h-3 text-text-muted group-hover/phone:text-primary" />
                          {worker.mobileNumber}
                        </button>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-text-muted font-medium">{worker.recruitmentCompany}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-text-main font-bold">
                        <div className="flex items-center gap-1">
                          <Building2 className="w-3 h-3 text-emerald-600" />
                          {worker.workplace}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-text-main">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-blue-600/50" />
                          {worker.startDate}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-[11px] text-text-main">
                        <div className="flex items-center gap-1">
                          <Calendar className={`w-3 h-3 ${isExpiringSoon ? 'text-amber-500' : 'text-red-600/50'}`} />
                          <span className={isExpiringSoon ? 'font-black text-amber-600' : ''}>{worker.endDate}</span>
                        </div>
                      </td>
                      <td className={`px-4 py-3 whitespace-nowrap text-xs text-center font-black transition-colors ${isExpiringSoon ? 'bg-amber-100/30 text-amber-600' : 'bg-primary/[0.02] text-primary'}`}>
                        <div className="flex flex-col items-center">
                          {calculateDays(worker.startDate, worker.endDate)}
                          {isExpiringSoon && <span className="text-[8px] uppercase tracking-tighter opacity-70">تنتهي قريباً</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        {worker.assignedBusOperationalNumber ? (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-[10px] font-black border border-primary/20 shadow-sm shadow-primary/5">
                            <BusIcon className="w-2.5 h-2.5" />
                            {worker.assignedBusOperationalNumber}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-amber-50 text-amber-600 text-[10px] font-bold border border-amber-200">
                            غير مرتبط
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-xs text-text-main font-bold">{worker.clientName}</td>
                      {isAdmin && (
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-0.5">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedWorkerForDetails(worker);
                              }}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                              title="عرض التفاصيل"
                            >
                              <Eye className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(worker);
                              }}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors border border-transparent hover:border-primary/20"
                              title="تعديل البيانات"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteModal({ isOpen: true, id: worker.id, name: worker.name });
                              }}
                              className="p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-200"
                              title="حذف البيانات"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 space-y-4 flex-1 overflow-y-auto bg-background/5">
            {Object.keys(groupedWorkers).sort().map(groupName => {
              const isOpen = expandedGroups.has(groupName);
              const groupWorkers = groupedWorkers[groupName];
              
              return (
                <div key={groupName} className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden transition-all duration-300">
                  <button 
                    onClick={() => toggleGroup(groupName)}
                    className="w-full flex items-center justify-between p-4 hover:bg-background/20 transition-colors"
                  >
                    <div className="flex items-center gap-4 text-right">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors ${isOpen ? 'bg-primary text-white' : 'bg-primary/10 text-primary'}`}>
                        {groupBy === 'workplace' ? <Building2 className="w-5 h-5" /> : <User className="w-5 h-5" />}
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-text-main leading-tight">{groupName}</h3>
                        <p className="text-xs text-text-muted font-bold">عدد العمال: {groupWorkers.length} عامل</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <div className="hidden md:flex items-center gap-2">
                        <span className="px-3 py-1 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-full border border-emerald-100">
                          حافلات: {groupWorkers.filter(w => w.assignedBusId).length}
                        </span>
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-[10px] font-black rounded-full border border-blue-100">
                          متوسط الدوام: {Math.round(groupWorkers.reduce((acc, curr) => acc + calculateDays(curr.startDate, curr.endDate), 0) / groupWorkers.length)} يوم
                        </span>
                      </div>
                      <div className={`p-2 rounded-lg bg-background border border-border transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>
                        <ChevronDown className="w-4 h-4 text-text-muted" />
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isOpen && (
                      <motion.div 
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 border-t border-border bg-background/[0.02]">
                          {groupWorkers.map(worker => {
                            const daysRemaining = calculateDays(new Date().toISOString().split('T')[0], worker.endDate);
                            const isExpiringSoon = daysRemaining <= 7 && daysRemaining >= 0;

                            return (
                              <motion.div 
                                key={worker.id}
                                whileHover={{ y: -5 }}
                                onClick={() => setSelectedWorkerForDetails(worker)}
                                className={`bg-surface p-4 rounded-2xl border transition-all cursor-pointer group relative overflow-hidden ${isExpiringSoon ? 'border-amber-200 shadow-amber-100/50' : 'border-border hover:border-primary/30 hover:shadow-lg shadow-sm'}`}
                              >
                                {isExpiringSoon && <div className="absolute top-0 right-0 w-2 h-full bg-amber-500" />}
                                
                                <div className="flex items-start justify-between mb-3">
                                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-colors ${isExpiringSoon ? 'bg-amber-100/50 text-amber-600 border-amber-200' : 'bg-primary/5 text-primary border-primary/10 group-hover:bg-primary group-hover:text-white'}`}>
                                    <User className="w-5 h-5" />
                                  </div>
                                  <div className="text-left">
                                    <p className="text-[10px] font-black text-text-muted opacity-60">#{worker.workerNumber}</p>
                                    {worker.assignedBusOperationalNumber ? (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-600 text-[8px] font-black mt-1">
                                        <BusIcon className="w-2.5 h-2.5" />
                                        {worker.assignedBusOperationalNumber}
                                      </span>
                                    ) : (
                                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-lg bg-red-50 text-red-600 text-[8px] font-black mt-1">
                                        بدون حافلة
                                      </span>
                                    )}
                                  </div>
                                </div>

                                <div className="space-y-1 mb-4">
                                  <h4 className="text-sm font-black text-text-main line-clamp-1">{worker.name}</h4>
                                  <p className="text-[10px] text-text-muted font-bold truncate">
                                    {groupBy === 'workplace' ? worker.clientName : worker.workplace}
                                  </p>
                                </div>

                                <div className="grid grid-cols-2 gap-2 text-[10px] mb-4">
                                  <div className="flex items-center gap-1.5 text-text-muted">
                                    <Search className="w-3 h-3 opacity-50" />
                                    <span className="font-mono">{worker.iqamaNumber}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5 text-text-muted">
                                    <Phone className="w-3 h-3 opacity-50" />
                                    <span>{worker.mobileNumber}</span>
                                  </div>
                                </div>

                                <div className="flex items-center justify-between pt-3 border-t border-border mt-auto">
                                  <div className="flex flex-col">
                                    <span className="text-[8px] text-text-muted uppercase font-bold">بدء العمل</span>
                                    <span className="text-[10px] font-black text-text-main">{worker.startDate}</span>
                                  </div>
                                  <div className="flex flex-col text-left">
                                    <span className="text-[8px] text-text-muted uppercase font-bold">نهاية العمل</span>
                                    <span className={`text-[10px] font-black ${isExpiringSoon ? 'text-amber-600' : 'text-text-main'}`}>{worker.endDate}</span>
                                  </div>
                                </div>
                                
                                {isAdmin && (
                                  <div className="absolute top-2 left-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-border shadow-sm">
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); onEdit(worker); }}
                                      className="p-1 text-text-muted hover:text-primary transition-colors"
                                    >
                                      <Edit className="w-3.5 h-3.5" />
                                    </button>
                                    <button 
                                      onClick={(e) => { e.stopPropagation(); setDeleteModal({ isOpen: true, id: worker.id, name: worker.name }); }}
                                      className="p-1 text-text-muted hover:text-red-600 transition-colors"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                )}
                              </motion.div>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>
        )}

        <div className="p-6 border-t border-border bg-background/10 text-center">
          <p className="text-xs font-bold text-text-muted">© 2026 أحمد عبد الجليل – قسم نقل العمال – شركة درة المنورة</p>
        </div>
      </div>

      <WorkerDetailsModal 
        worker={selectedWorkerForDetails}
        isOpen={!!selectedWorkerForDetails}
        onClose={() => setSelectedWorkerForDetails(null)}
      />

      <DeleteConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={() => {
          if (deleteModal.id) {
            onDelete(deleteModal.id);
          }
        }}
        title="حذف بيانات عامل"
        message="هل أنت متأكد من رغبتك في حذف بيانات العامل:"
        itemName={deleteModal.name}
      />
    </motion.div>
  );
};
