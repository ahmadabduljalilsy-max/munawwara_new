import React, { useState, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  Filter, 
  Plus, 
  FileDown, 
  Upload, 
  Download, 
  MoreVertical,
  Edit,
  Trash2,
  FileText,
  X,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Wrench,
  XCircle,
  MinusCircle,
  Users
} from 'lucide-react';
import type { Bus } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface FleetListProps {
  buses: Bus[];
  isAdmin: boolean;
  isSystemAdmin: boolean;
  onAdd: () => void;
  onEdit: (bus: Bus) => void;
  onDelete: (id: string) => void;
  onDeleteAll: () => void;
  onImport: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExport: (data: Bus[]) => void;
  onGenerateFullPdf: (data: Bus[]) => void;
  onGenerateFilteredPdf: (buses: Bus[]) => void;
  onGenerateBusPdf: (bus: Bus) => void;
}

export const FleetList: React.FC<FleetListProps> = ({ 
  buses, 
  isAdmin, 
  isSystemAdmin,
  onAdd, 
  onEdit, 
  onDelete, 
  onDeleteAll,
  onImport, 
  onExport,
  onGenerateFullPdf,
  onGenerateFilteredPdf,
  onGenerateBusPdf
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState({
    location: '',
    model: '',
    category: '',
    technicalStatus: '',
    color: '',
    seatsCount: ''
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 50;
  const fileInputRef = useRef<HTMLInputElement>(null);

  const locations = useMemo(() => Array.from(new Set(buses.map(b => b.location))).filter(Boolean), [buses]);
  const categories = useMemo(() => Array.from(new Set(buses.map(b => b.category))).filter(Boolean), [buses]);
  const models = useMemo(() => Array.from(new Set(buses.map(b => b.model))).filter(Boolean).sort(), [buses]);
  const technicalStatuses = useMemo(() => Array.from(new Set(buses.map(b => b.technicalStatus))).filter(Boolean).sort(), [buses]);
  const busColors = useMemo(() => Array.from(new Set(buses.map(b => b.color))).filter(Boolean).sort(), [buses]);
  const seatsCounts = useMemo(() => Array.from(new Set(buses.map(b => b.seatsCount))).filter((s): s is number => s !== undefined && s !== null).sort((a, b) => a - b), [buses]);

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

  const filteredBuses = useMemo(() => {
    return buses.filter(bus => {
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        bus.operationalNumber.toLowerCase().includes(searchLower) ||
        bus.plateNumber.toLowerCase().includes(searchLower) ||
        bus.location.toLowerCase().includes(searchLower) ||
        (bus.category || '').toLowerCase().includes(searchLower);
      
      const matchesLocation = !filters.location || bus.location === filters.location;
      const matchesModel = !filters.model || bus.model === filters.model;
      const matchesCategory = !filters.category || bus.category === filters.category;
      const matchesStatus = !filters.technicalStatus || bus.technicalStatus === filters.technicalStatus;
      const matchesColor = !filters.color || bus.color === filters.color;
      const matchesSeats = !filters.seatsCount || String(bus.seatsCount) === filters.seatsCount;

      return matchesSearch && matchesLocation && matchesModel && matchesCategory && matchesStatus && matchesColor && matchesSeats;
    });
  }, [buses, searchTerm, filters]);

  // Reset to page 1 when search or filters change
  React.useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filters]);

  const totalPages = Math.ceil(filteredBuses.length / itemsPerPage);

  const paginatedBuses = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredBuses.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredBuses, currentPage]);

  const getBusColorHex = (colorName: string) => {
    const c = (colorName || '').toLowerCase();
    if (c.includes('أحمر') || c.includes('احمر')) return '#ef4444'; // red-500
    if (c.includes('أزرق') || c.includes('ازرق')) return '#3b82f6'; // blue-500
    if (c.includes('أخضر') || c.includes('اخضر')) return '#22c55e'; // green-500
    if (c.includes('أصفر') || c.includes('اصفر')) return '#eab308'; // yellow-500
    if (c.includes('برتقالي')) return '#f97316'; // orange-500
    if (c.includes('رمادي')) return '#64748b'; // slate-500
    if (c.includes('أسود') || c.includes('اسود')) return '#0f172a'; // slate-900
    if (c.includes('أبيض') || c.includes('ابيض')) return '#f8fafc'; // slate-50
    if (c.includes('ذهبي')) return '#fbbf24'; // amber-400
    if (c.includes('فضي')) return '#94a3b8'; // slate-400
    if (c.includes('بني')) return '#78350f'; // amber-900
    if (c.includes('كحلي')) return '#1e3a8a'; // blue-900
    if (c.includes('نبيتي') || c.includes('خمري')) return '#7f1d1d'; // red-950
    if (c.includes('بنفسجي')) return '#a855f7'; // purple-500
    if (c.includes('وردي')) return '#ec4899'; // pink-500
    return null;
  };

  const getStatusBadge = (status: string) => {
    const s = status || '';
    if (s.includes('ممتاز') || s.includes('جديد')) {
      return {
        className: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        icon: <CheckCircle2 className="w-3.5 h-3.5" />,
        label: s || 'ممتاز'
      };
    }
    if (s.includes('جيد')) {
      return {
        className: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: <AlertCircle className="w-3.5 h-3.5" />,
        label: s || 'جيد'
      };
    }
    if (s.includes('صيانة')) {
      return {
        className: 'bg-orange-50 text-orange-700 border-orange-200',
        icon: <Wrench className="w-3.5 h-3.5" />,
        label: s || 'تحت الصيانة'
      };
    }
    if (s.includes('متوقف') || s.includes('عطل')) {
      return {
        className: 'bg-red-50 text-red-700 border-red-200',
        icon: <XCircle className="w-3.5 h-3.5" />,
        label: s || 'متوقف'
      };
    }
    return {
      className: 'bg-slate-50 text-slate-600 border-slate-200',
      icon: <MinusCircle className="w-3.5 h-3.5" />,
      label: s || 'غير محدد'
    };
  };

  return (
    <div className="space-y-6 text-right" dir="rtl">
      {/* Action Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <span>سجل وإدارة</span>
            <span className="text-primary font-bold">أسطول الحافلات</span>
          </h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-xs text-slate-700 dark:text-slate-300 font-semibold">
              إجمالي الأسطول: <span className="text-emerald-700 dark:text-emerald-400 font-bold">{filteredBuses.length}</span> حافلة مسجلة
            </p>
            {totalPages > 1 && (
              <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800 px-2.5 py-0.5 rounded-full font-bold">
                الصفحة {currentPage} من {totalPages}
              </span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <>
              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-slate-900 dark:text-white rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
               >
                <Upload className="w-4 h-4 text-blue-600" />
                <span>استيراد Excel</span>
                <input type="file" ref={fileInputRef} onChange={onImport} className="hidden" accept=".xlsx, .xls, .csv" />
              </button>
              <button 
                onClick={() => onExport(filteredBuses)}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-slate-900 dark:text-white rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
               >
                <Download className="w-4 h-4 text-emerald-600" />
                <span>تصدير Excel</span>
              </button>
              <button 
                onClick={() => onGenerateFullPdf(filteredBuses)}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-slate-900 dark:text-white rounded-xl text-xs font-bold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors shadow-xs cursor-pointer"
               >
                <FileDown className="w-4 h-4 text-red-600" />
                <span>تصدير PDF</span>
              </button>
              <button 
                onClick={onAdd}
                className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-all shadow-sm shadow-primary/20 cursor-pointer"
               >
                <Plus className="w-4 h-4" />
                <span>إضافة حافلة جديدة</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-surface p-4 rounded-xl border border-border shadow-sm flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 group">
              <Search className={`absolute right-3 top-1/2 -translate-y-1/2 transition-colors w-4 h-4 ${searchTerm ? 'text-primary' : 'text-text-muted'}`} />
              <input 
                type="text" 
                placeholder="ابحث عن حافلة..." 
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
              className={`p-2.5 rounded-lg transition-all border flex items-center gap-2 ${showFilters ? 'bg-primary text-white border-primary shadow-sm' : 'bg-surface text-text-muted border-border hover:bg-background'}`}
            >
              <Filter className="w-5 h-5" />
              <span className="text-xs font-bold hidden md:block">الفلاتر المتقدمة</span>
            </button>
          </div>
          
          <div className="flex items-center gap-2 px-1">
            <span className="text-[10px] font-black text-text-muted/60 uppercase tracking-tighter">مجال البحث:</span>
            <div className="flex flex-wrap gap-1.5">
              {['رقم التشغيل', 'رقم اللوحة', 'الموقع', 'الفئة'].map((field) => (
                <span 
                  key={field}
                  className={`text-[9px] px-2 py-0.5 rounded-full border transition-all ${
                    searchTerm ? 'bg-primary/5 text-primary border-primary/20 font-black' : 'bg-slate-100 text-slate-500 border-slate-200 font-bold'
                  }`}
                >
                  {field}
                </span>
              ))}
            </div>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-border pt-4"
            >
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted mr-1">موقع العمل</label>
                  <select 
                    value={filters.location}
                    onChange={(e) => setFilters(f => ({ ...f, location: e.target.value }))}
                    className="w-full p-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-sm shadow-sm"
                  >
                    <option value="">الكل</option>
                    {locations.map(loc => <option key={loc} value={loc}>{loc}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted mr-1">الموديل</label>
                  <select 
                    value={filters.model}
                    onChange={(e) => setFilters(f => ({ ...f, model: e.target.value }))}
                    className="w-full p-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-sm shadow-sm"
                  >
                    <option value="">الكل</option>
                    {models.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted mr-1">فئة الحافلة</label>
                  <select 
                    value={filters.category}
                    onChange={(e) => setFilters(f => ({ ...f, category: e.target.value }))}
                    className="w-full p-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-sm shadow-sm"
                  >
                    <option value="">الكل</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted mr-1">الحالة الفنية</label>
                  <select 
                    value={filters.technicalStatus}
                    onChange={(e) => setFilters(f => ({ ...f, technicalStatus: e.target.value }))}
                    className="w-full p-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-sm shadow-sm"
                  >
                    <option value="">الكل</option>
                    {technicalStatuses.map(status => <option key={status} value={status}>{status}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted mr-1">اللون</label>
                  <select 
                    value={filters.color}
                    onChange={(e) => setFilters(f => ({ ...f, color: e.target.value }))}
                    className="w-full p-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-sm shadow-sm"
                  >
                    <option value="">الكل</option>
                    {busColors.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-text-muted mr-1">عدد المقاعد</label>
                  <select 
                    value={filters.seatsCount}
                    onChange={(e) => setFilters(f => ({ ...f, seatsCount: e.target.value }))}
                    className="w-full p-2 bg-background border border-border rounded-lg outline-none focus:border-primary text-sm shadow-sm"
                  >
                    <option value="">الكل</option>
                    {seatsCounts.map(count => <option key={count} value={String(count)}>{count} مقعد</option>)}
                  </select>
                </div>
              </div>
              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => setFilters({ location: '', model: '', category: '', technicalStatus: '', color: '', seatsCount: '' })}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Cards Grid Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        <AnimatePresence mode="popLayout">
          {paginatedBuses.map((bus, index) => {
            const badge = getStatusBadge(bus.technicalStatus);
            const busColorHex = getBusColorHex(bus.color);
            return (
              <motion.div
                key={bus.id}
                layout
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className="group bg-surface rounded-2xl border border-border shadow-sm hover:shadow-xl transition-all overflow-hidden flex flex-col relative"
                style={{ 
                  borderColor: busColorHex ? `${busColorHex}40` : undefined,
                  boxShadow: busColorHex ? `0 0 15px -3px ${busColorHex}15, 0 4px 6px -4px ${busColorHex}20` : undefined
                }}
              >
                {/* Color Strip at top */}
                {busColorHex && (
                  <div 
                    className="h-1.5 w-full absolute top-0 left-0" 
                    style={{ backgroundColor: busColorHex }}
                  />
                )}
                {/* Card Header - Main Info */}
                <div className="p-4 bg-gradient-to-br from-primary/[0.03] to-transparent border-b border-border/50">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-bold text-primary dark:text-emerald-400 uppercase tracking-wider mb-1">رقم التشغيل</span>
                      <h3 className="text-lg font-bold text-slate-900 dark:text-white group-hover:text-primary transition-colors leading-none tracking-tight">
                        {bus.operationalNumber}
                      </h3>
                    </div>
                    <span className={`
                      inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border tracking-tight shadow-xs
                      ${badge.className}
                    `}>
                      {badge.icon}
                      <span>{badge.label}</span>
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-[#FAF9F6] dark:bg-background border border-border rounded-lg shadow-xs">
                      <FileText className="w-3.5 h-3.5 text-primary" />
                      <span className="text-[11px] font-bold text-slate-900 dark:text-white font-mono">{bus.plateNumber}</span>
                    </div>
                    {bus.category && (
                      <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-lg shadow-xs">
                        <span className="text-[10px] font-bold text-emerald-800 dark:text-emerald-300">{bus.category}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Body - Details */}
                <div className="p-4 flex-1 space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">الموقع الميداني</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                        <span className="truncate">{bus.location}</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase">الموديل</span>
                      <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 dark:text-white">
                        <span className="w-2 h-2 rounded-full bg-primary shrink-0" />
                        <span className="truncate">{bus.model}</span>
                      </div>
                    </div>
                  </div>

                  {(bus.color || (bus.seatsCount !== undefined && bus.seatsCount !== null)) && (
                    <div className="pt-2 border-t border-border/40 space-y-2">
                      {bus.color && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">اللون</span>
                          <span className="text-[11px] font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md">{bus.color}</span>
                        </div>
                      )}
                      {bus.seatsCount !== undefined && bus.seatsCount !== null && (
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300">عدد المقاعد</span>
                          <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/40 px-2 py-0.5 rounded-md flex items-center gap-1">
                            <Users className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                            <span>{bus.seatsCount} مقعد</span>
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Card Footer - Actions */}
                <div className="p-3 bg-slate-50/50 border-t border-border/50 mt-auto flex items-center justify-between gap-2">
                  <button 
                    onClick={() => onGenerateBusPdf(bus)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-white text-primary border border-primary/20 rounded-xl hover:bg-primary hover:text-white transition-all text-[11px] font-black shadow-sm group/btn"
                  >
                    <FileDown className="w-3.5 h-3.5 group-hover/btn:scale-110 transition-transform" />
                    تقرير PDF
                  </button>

                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => onEdit(bus)}
                        className="p-2 text-text-muted hover:text-emerald-700 hover:bg-emerald-50 rounded-xl transition-all border border-transparent hover:border-emerald-200"
                        title="تعديل"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteModal({ isOpen: true, id: bus.id, name: bus.operationalNumber, isAll: false })}
                        className="p-2 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-xl transition-all border border-transparent hover:border-red-200"
                        title="حذف"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
      </div>

      {filteredBuses.length === 0 && (
        <div className="p-20 text-center bg-surface rounded-2xl border-2 border-dashed border-border">
          <div className="bg-primary/5 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
            <Search className="w-8 h-8 text-primary/40" />
          </div>
          <h3 className="text-lg font-black text-text-main mb-1">لا توجد حافلات مطابقة</h3>
          <p className="text-sm text-text-muted font-medium">جرب تغيير معايير البحث أو الفلترة لتظهر النتائج هنا</p>
        </div>
      )}

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-surface p-4 rounded-xl border border-border shadow-sm">
          <div className="text-xs font-bold text-text-muted">
            عرض {Math.min((currentPage * itemsPerPage), filteredBuses.length)} من أصل {filteredBuses.length}
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
              className="p-2 text-text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <div className="rotate-180">
                <Download className="w-5 h-5 rotate-90" />
              </div>
            </button>
            
            <div className="flex items-center gap-1">
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum = currentPage;
                if (currentPage <= 3) pageNum = i + 1;
                else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                else pageNum = currentPage - 2 + i;
                
                if (pageNum <= 0 || pageNum > totalPages) return null;

                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                      currentPage === pageNum 
                        ? 'bg-primary text-white shadow-md shadow-primary/20' 
                        : 'bg-background text-text-muted hover:bg-slate-100'
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
              className="p-2 text-text-muted hover:text-primary disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <Download className="w-5 h-5 -rotate-90" />
            </button>
          </div>
        </div>
      )}

      <DeleteConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={() => {
          if (deleteModal.isAll) {
            onDeleteAll();
          } else if (deleteModal.id) {
            onDelete(deleteModal.id);
          }
        }}
        title={deleteModal.isAll ? "حذف جميع الحافلات" : "حذف حافلة"}
        message={deleteModal.isAll 
          ? "هل أنت متأكد من رغبتك في مسح كافة الحافلات من النظام؟" 
          : "هل أنت متأكد من حذف الحافلة رقم:"
        }
        itemName={deleteModal.name}
      />
    </div>
  );
};
