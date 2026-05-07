import React, { useState, useMemo } from 'react';
import { 
  FileText, 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  Building2,
  DollarSign,
  Filter,
  CheckCircle2,
  Clock,
  AlertCircle,
  X,
  History,
  File,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Contract } from '../types';
import { DeleteConfirmModal } from './DeleteConfirmModal';

interface ContractListProps {
  contracts: Contract[];
  isAdmin: boolean;
  onAdd: () => void;
  onEdit: (contract: Contract) => void;
  onDelete: (id: string) => void;
}

export const ContractList: React.FC<ContractListProps> = ({ 
  contracts, 
  isAdmin, 
  onAdd, 
  onEdit, 
  onDelete 
}) => {
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filterType, setFilterType] = useState<'all' | 'expiring' | 'expired' | 'active'>('all');
  
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    id: string | null;
    name?: string;
  }>({
    isOpen: false,
    id: null
  });

  const calculateDuration = (start: string, end: string) => {
    if (!start || !end) return '-';
    const s = new Date(start);
    const e = new Date(end);
    const diffTime = Math.abs(e.getTime() - s.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays >= 365) {
      const years = (diffDays / 365).toFixed(1);
      return `${years} سنة`;
    }
    if (diffDays >= 30) {
      const months = (diffDays / 30).toFixed(1);
      return `${months} شهر`;
    }
    return `${diffDays} يوم`;
  };

  const getDaysRemaining = (endDate: string) => {
    if (!endDate) return null;
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const diffTime = end.getTime() - today.getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const filteredContracts = useMemo(() => {
    return contracts.filter(c => {
      const matchesSearch = 
        c.clientName.toLowerCase().includes(search.toLowerCase()) ||
        c.contractNumber.toLowerCase().includes(search.toLowerCase());
      
      const daysLeft = getDaysRemaining(c.endDate);
      
      if (filterType === 'expiring') {
        return matchesSearch && daysLeft !== null && daysLeft > 0 && daysLeft <= 30;
      }
      if (filterType === 'expired') {
        return matchesSearch && (c.status === 'expired' || (daysLeft !== null && daysLeft < 0));
      }
      if (filterType === 'active') {
        return matchesSearch && c.status === 'active' && (daysLeft === null || daysLeft > 30);
      }
      
      return matchesSearch;
    });
  }, [contracts, search, filterType]);

  const getStatusBadge = (contract: Contract) => {
    const daysLeft = getDaysRemaining(contract.endDate);
    
    if (daysLeft !== null && daysLeft < 0) {
      return {
        label: 'منتهي',
        className: 'bg-red-50 text-red-700 border-red-100',
        icon: <AlertCircle className="w-3 h-3" />
      };
    }
    
    if (daysLeft !== null && daysLeft <= 30) {
      return {
        label: `ينتهي خلال ${daysLeft} يوم`,
        className: 'bg-orange-50 text-orange-700 border-orange-200 animate-pulse',
        icon: <Clock className="w-3 h-3" />
      };
    }

    switch (contract.status) {
      case 'active':
        return {
          label: 'نشط',
          className: 'bg-emerald-50 text-emerald-700 border-emerald-100',
          icon: <CheckCircle2 className="w-3 h-3" />
        };
      case 'expired':
        return {
          label: 'منتهي',
          className: 'bg-red-50 text-red-700 border-red-100',
          icon: <AlertCircle className="w-3 h-3" />
        };
      default:
        return {
          label: 'قيد الانتظار',
          className: 'bg-amber-50 text-amber-700 border-amber-100',
          icon: <Clock className="w-3 h-3" />
        };
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col gap-6"
    >
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-col">
          <h2 className="text-xl font-bold text-text-main">إدارة العقود</h2>
          <p className="text-sm text-text-muted font-medium">إجمالي {filteredContracts.length} عقد متاح</p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2">
          {isAdmin && (
            <button 
              onClick={onAdd}
              className="flex items-center gap-2 px-5 py-2 bg-primary text-white rounded-xl text-xs font-black hover:bg-secondary transition-all shadow-sm shadow-primary/20 active:scale-95"
            >
              <Plus className="w-4 h-4" />
              إضافة عقد جديد
            </button>
          )}
        </div>
      </div>

      <div className="bg-surface rounded-2xl border border-border shadow-sm overflow-hidden min-h-[400px] flex flex-col">
        <div className="p-4 border-b border-border flex flex-col sm:flex-row gap-4 items-center justify-between bg-slate-50/30">
          <div className="relative w-full sm:w-80">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted w-4 h-4" />
            <input 
              type="text" 
              placeholder="بحث برقم العقد أو العميل..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pr-10 pl-4 py-2 text-xs bg-background border border-border rounded-xl focus:border-primary outline-none transition-all shadow-sm"
            />
          </div>
          
          <div className="flex gap-2 w-full sm:w-auto">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 transition-all text-xs font-bold border rounded-xl shadow-sm ${showFilters ? 'bg-primary text-white border-primary' : 'text-text-muted border-border bg-background hover:text-primary'}`}
            >
              <Filter className="w-4 h-4" />
              تصفية العقود
            </button>
          </div>
        </div>

        <AnimatePresence>
          {showFilters && (
            <motion.div 
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden bg-slate-50/50 border-b border-border"
            >
              <div className="p-4 flex flex-wrap gap-2">
                <button 
                  onClick={() => setFilterType('all')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black border transition-all ${filterType === 'all' ? 'bg-primary text-white border-primary' : 'bg-white text-text-muted border-border hover:border-primary'}`}
                >
                  الكل
                </button>
                <button 
                  onClick={() => setFilterType('active')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black border transition-all ${filterType === 'active' ? 'bg-emerald-500 text-white border-emerald-500' : 'bg-white text-text-muted border-border hover:border-emerald-500'}`}
                >
                  عقود نشطة
                </button>
                <button 
                  onClick={() => setFilterType('expiring')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black border transition-all ${filterType === 'expiring' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white text-text-muted border-border hover:border-orange-500'}`}
                >
                  تنهي قريباً (30 يوم)
                </button>
                <button 
                  onClick={() => setFilterType('expired')}
                  className={`px-4 py-1.5 rounded-full text-[10px] font-black border transition-all ${filterType === 'expired' ? 'bg-red-500 text-white border-red-500' : 'bg-white text-text-muted border-border hover:border-red-500'}`}
                >
                  عقود منتهية
                </button>
                
                {filterType !== 'all' && (
                  <button 
                    onClick={() => setFilterType('all')}
                    className="flex items-center gap-1 text-[10px] font-bold text-red-500 hover:underline mr-auto"
                  >
                    <X className="w-3 h-3" />
                    إلغاء التصفية
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="overflow-x-auto flex-1">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-background/50 border-b border-border">
                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">رقم العقد</th>
                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">العميل</th>
                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">مدة العقد</th>
                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">تاريخ البدء</th>
                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">تاريخ الانتهاء</th>
                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">القيمة</th>
                <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider">الحالة</th>
                {isAdmin && <th className="px-6 py-4 text-[11px] font-bold text-text-muted uppercase tracking-wider text-center">الإجراءات</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {filteredContracts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-20 text-center text-text-muted">
                    <div className="flex flex-col items-center gap-2">
                      <FileText className="w-12 h-12 opacity-10" />
                      <p className="font-bold">لا توجد عقود تطابق البحث</p>
                      <p className="text-xs">حاول تغيير معايير البحث أو التصفية</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredContracts.map((contract) => {
                  const badge = getStatusBadge(contract);
                  const duration = calculateDuration(contract.startDate, contract.endDate);
                  return (
                    <motion.tr 
                      key={contract.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-primary/[0.01] transition-colors group"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-text-main">{contract.contractNumber}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-bold text-text-main">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-3.5 h-3.5 text-text-muted" />
                          {contract.clientName}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-text-main">
                        <div className="flex items-center gap-2">
                          <History className="w-3.5 h-3.5 text-primary opacity-70" />
                          {duration}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-text-muted">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 opacity-50" />
                          {contract.startDate}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-text-muted">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 opacity-50 text-red-500/50" />
                          {contract.endDate}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs font-black text-primary">
                        <div className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          {contract.value.toLocaleString()} ر.س
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-black border ${badge.className}`}>
                          {badge.icon}
                          {badge.label}
                        </div>
                      </td>
                      {isAdmin && (
                        <td className="px-6 py-4 whitespace-nowrap text-center">
                          <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            {contract.pdfUrl && (
                              <a 
                                href={contract.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="p-1.5 text-text-muted hover:text-secondary hover:bg-secondary/5 rounded-lg transition-colors border border-transparent hover:border-secondary/20"
                                title="عرض العقد (PDF)"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <File className="w-3.5 h-3.5" />
                              </a>
                            )}
                            <button 
                              onClick={() => onEdit(contract)}
                              className="p-1.5 text-text-muted hover:text-primary hover:bg-primary/5 rounded-lg transition-colors"
                              title="تعديل"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => setDeleteModal({ isOpen: true, id: contract.id, name: contract.contractNumber })}
                              className="p-1.5 text-text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                              title="حذف"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      )}
                    </motion.tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="p-4 border-t border-border bg-slate-50/30 flex justify-center">
          <p className="text-[10px] font-bold text-text-muted">© 2026 أحمد عبد الجليل – قسم نقل العمال – شركة درة المنورة</p>
        </div>
      </div>

      <DeleteConfirmModal 
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={() => {
          if (deleteModal.id) {
            onDelete(deleteModal.id);
          }
        }}
        title="حذف عقد"
        message="هل أنت متأكد من رغبتك في حذف العقد رقم:"
        itemName={deleteModal.name}
      />
    </motion.div>
  );
};
