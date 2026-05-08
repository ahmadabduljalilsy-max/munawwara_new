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
  MinusCircle
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
  onExport: () => void;
  onGenerateFullPdf: () => void;
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
    color: ''
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

      return matchesSearch && matchesLocation && matchesModel && matchesCategory && matchesStatus && matchesColor;
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
          <h2 className="text-xl font-bold text-text-main">قائمة أسطول الحافلات</h2>
          <div className="flex items-center gap-2 mt-1">
            <p className="text-sm text-text-muted font-medium">إجمالي {filteredBuses.length} حافلة</p>
            {totalPages > 1 && (
              <span className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-bold">
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
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-main rounded-lg text-sm font-semibold hover:bg-background transition-colors"
               >
                <Upload className="w-4 h-4 text-blue-600" />
                استيراد Excel
                <input type="file" ref={fileInputRef} onChange={onImport} className="hidden" accept=".xlsx, .xls, .csv" />
              </button>
              <button 
                onClick={onExport}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-main rounded-lg text-sm font-semibold hover:bg-background transition-colors"
               >
                <Download className="w-4 h-4 text-emerald-600" />
                تصدير Excel
              </button>
              <button 
                onClick={onGenerateFullPdf}
                className="flex items-center gap-2 px-4 py-2 bg-surface border border-border text-text-main rounded-lg text-sm font-semibold hover:bg-background transition-colors"
               >
                <FileDown className="w-4 h-4 text-red-600" />
                تصدير PDF
              </button>
              {isSystemAdmin && (
                <button 
                  onClick={() => setDeleteModal({ isOpen: true, id: null, isAll: true })}
                  className="flex items-center gap-2 px-4 py-2 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800/30 text-red-600 rounded-lg text-sm font-semibold hover:bg-red-100 transition-colors"
                  title="حذف جميع الحافلات من النظام"
                >
                  <Trash2 className="w-4 h-4" />
                  حذف الكل
                </button>
              )}
              <button 
                onClick={onAdd}
                className="flex items-center gap-2 px-6 py-2 bg-primary text-white rounded-lg text-sm font-semibold hover:bg-secondary transition-all"
               >
                <Plus className="w-4 h-4" />
                إضافة حافلة
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
              </div>
              <div className="flex justify-end mt-4">
                <button 
                  onClick={() => setFilters({ location: '', model: '', category: '', technicalStatus: '', color: '' })}
                  className="text-[11px] font-bold text-primary hover:underline"
                >
                  إعادة ضبط الفلاتر
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Table Section */}
      <div className="bg-surface rounded-xl border border-border shadow-sm overflow-hidden overflow-x-auto">
        <table className="w-full text-right border-collapse min-w-[900px]">
          <thead>
            <tr className="bg-background border-b border-border">
              <th className="px-6 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">رقم التشغيل</th>
              <th className="px-6 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">رقم اللوحة</th>
              <th className="px-6 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">فئة الحافلة</th>
              <th className="px-6 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">اللون</th>
              <th className="px-6 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">الموديل</th>
              <th className="px-6 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">الموقع</th>
              <th className="px-6 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider">الحالة الفنية</th>
              <th className="px-6 py-3 text-[11px] font-bold text-text-muted uppercase tracking-wider text-center">الإجراءات</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 bg-surface">
            {paginatedBuses.map((bus) => (
              <tr key={bus.id} className="hover:bg-primary/[0.02] transition-colors group">
                <td className="px-6 py-2.5 whitespace-nowrap text-sm font-black text-text-main group-hover:text-primary transition-colors">{bus.operationalNumber}</td>
                <td className="px-6 py-2.5 whitespace-nowrap text-xs font-bold text-text-main">{bus.plateNumber}</td>
                <td className="px-6 py-2.5 whitespace-nowrap text-xs font-medium text-text-muted">{bus.category}</td>
                <td className="px-6 py-2.5 whitespace-nowrap text-xs font-bold text-text-main">{bus.color || '-'}</td>
                <td className="px-6 py-2.5 whitespace-nowrap text-xs font-black text-text-main">{bus.model}</td>
                <td className="px-6 py-2.5 whitespace-nowrap text-xs font-bold text-text-main">{bus.location}</td>
                <td className="px-6 py-2.5 whitespace-nowrap">
                  {(() => {
                    const badge = getStatusBadge(bus.technicalStatus);
                    return (
                      <span className={`
                        inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-black border tracking-tight
                        ${badge.className}
                      `}>
                        {badge.icon}
                        {badge.label}
                      </span>
                    );
                  })()}
                </td>
                <td className="px-6 py-2.5 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <button 
                      onClick={() => onGenerateBusPdf(bus)}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 bg-primary/5 text-primary hover:bg-primary/10 rounded-lg transition-all text-[10px] font-bold border border-primary/10"
                      title="تحميل تقرير الحافلة"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      تقرير PDF
                    </button>
                    {isAdmin && (
                      <>
                        <button 
                          onClick={() => onEdit(bus)}
                          className="p-1.5 text-text-muted hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
                          title="تعديل"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button 
                          onClick={() => setDeleteModal({ isOpen: true, id: bus.id, name: bus.operationalNumber, isAll: false })}
                          className="p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="حذف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filteredBuses.length === 0 && (
          <div className="p-12 text-center text-text-muted font-medium bg-surface">
            لا توجد بيانات متاحة حالياً
          </div>
        )}
      </div>

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
