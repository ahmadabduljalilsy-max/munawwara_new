import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Save, 
  User, 
  IdCard, 
  Phone, 
  Building, 
  Briefcase, 
  Calendar, 
  FileText, 
  Bus as BusIcon, 
  AlertTriangle, 
  CircleDollarSign,
  History,
  Plus,
  Trash2,
  Edit2,
  Archive,
  CheckCircle2,
  Clock
} from 'lucide-react';
import { Worker, Bus, WorkerPreviousWork } from '../types';

interface WorkerFormProps {
  worker: Worker | null;
  allWorkers: Worker[];
  buses: Bus[];
  onSave: (workerData: Omit<Worker, 'id'>) => void;
  onClose: () => void;
}

export const WorkerForm: React.FC<WorkerFormProps> = ({ worker, allWorkers, buses, onSave, onClose }) => {
  const [formData, setFormData] = useState<Omit<Worker, 'id'>>({
    workerNumber: '',
    name: '',
    iqamaNumber: '',
    nationalId: '',
    mobileNumber: '',
    recruitmentCompany: '',
    workplace: '',
    basicSalary: undefined,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    clientName: '',
    assignedBusId: '',
    assignedBusOperationalNumber: '',
    assignedBusPlateNumber: '',
    previousBuses: '',
    workHistory: [],
    notes: ''
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<Omit<Worker, 'id'> | null>(null);

  // State for adding/editing a historical work record
  const [isAddingHistory, setIsAddingHistory] = useState(false);
  const [editingHistoryId, setEditingHistoryId] = useState<string | null>(null);
  const [historyItem, setHistoryItem] = useState<Omit<WorkerPreviousWork, 'id'>>({
    clientOrProject: '',
    workplace: '',
    startDate: '',
    endDate: '',
    role: '',
    notes: ''
  });

  useEffect(() => {
    if (worker) {
      setFormData({
        workerNumber: worker.workerNumber,
        name: worker.name,
        iqamaNumber: worker.iqamaNumber,
        nationalId: worker.nationalId || '',
        mobileNumber: worker.mobileNumber,
        recruitmentCompany: worker.recruitmentCompany,
        workplace: worker.workplace,
        basicSalary: worker.basicSalary,
        startDate: worker.startDate,
        endDate: worker.endDate || '',
        clientName: worker.clientName,
        assignedBusId: worker.assignedBusId || '',
        assignedBusOperationalNumber: worker.assignedBusOperationalNumber || '',
        assignedBusPlateNumber: worker.assignedBusPlateNumber || '',
        previousBuses: worker.previousBuses || '',
        workHistory: worker.workHistory || [],
        notes: worker.notes || ''
      });
    } else {
      // Find the next available sequential integer worker number
      const numbers = allWorkers
        .map(w => parseInt(w.workerNumber, 10))
        .filter(num => !isNaN(num) && isFinite(num));
      const max = numbers.length > 0 ? Math.max(...numbers) : 0;
      const nextNum = (max + 1).toString();
      
      setFormData(prev => ({
        ...prev,
        workerNumber: nextNum,
        workHistory: []
      }));
    }
  }, [worker, allWorkers]);

  // Real-time check to prevent adding duplicate workers based on Iqama or National ID
  const duplicateWorker = React.useMemo(() => {
    const cleanIqama = formData.iqamaNumber ? formData.iqamaNumber.trim() : '';
    const cleanNationalId = formData.nationalId ? formData.nationalId.trim() : '';

    if (!cleanIqama && !cleanNationalId) return null;

    return allWorkers.find(w => {
      // Exclude current worker if editing
      if (worker && w.id === worker.id) return false;

      const wIqama = w.iqamaNumber ? w.iqamaNumber.trim() : '';
      const wNational = w.nationalId ? w.nationalId.trim() : '';

      if (cleanIqama && ((wIqama && wIqama === cleanIqama) || (wNational && wNational === cleanIqama))) {
        return true;
      }
      if (cleanNationalId && ((wIqama && wIqama === cleanNationalId) || (wNational && wNational === cleanNationalId))) {
        return true;
      }
      return false;
    }) || null;
  }, [formData.iqamaNumber, formData.nationalId, allWorkers, worker]);

  // Handle adding or updating a work history item
  const handleSaveHistoryItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!historyItem.clientOrProject.trim()) {
      alert('يرجى كتابة اسم العميل أو المشروع السابق (مثل: أمكور)');
      return;
    }

    if (editingHistoryId) {
      // Update existing item
      setFormData(prev => ({
        ...prev,
        workHistory: (prev.workHistory || []).map(item => 
          item.id === editingHistoryId 
            ? { ...historyItem, id: editingHistoryId } 
            : item
        )
      }));
    } else {
      // Add new item
      const newItem: WorkerPreviousWork = {
        ...historyItem,
        id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)
      };
      setFormData(prev => ({
        ...prev,
        workHistory: [...(prev.workHistory || []), newItem]
      }));
    }

    // Reset history item form
    setHistoryItem({
      clientOrProject: '',
      workplace: '',
      startDate: '',
      endDate: '',
      role: '',
      notes: ''
    });
    setEditingHistoryId(null);
    setIsAddingHistory(false);
  };

  const handleEditHistoryItem = (item: WorkerPreviousWork) => {
    setHistoryItem({
      clientOrProject: item.clientOrProject,
      workplace: item.workplace || '',
      startDate: item.startDate || '',
      endDate: item.endDate || '',
      role: item.role || '',
      notes: item.notes || ''
    });
    setEditingHistoryId(item.id);
    setIsAddingHistory(true);
  };

  const handleDeleteHistoryItem = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا السجل من أرشيف الأعمال السابقة؟')) {
      setFormData(prev => ({
        ...prev,
        workHistory: (prev.workHistory || []).filter(item => item.id !== id)
      }));
    }
  };

  // Archive current workplace/client into history with one click
  const handleArchiveCurrentWork = () => {
    if (!formData.clientName && !formData.workplace) {
      alert('لا توجد بيانات حالية للعميل أو مكان العمل لأرشفتها.');
      return;
    }

    const newItem: WorkerPreviousWork = {
      id: 'hist_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      clientOrProject: formData.clientName || formData.workplace || 'مشروع سابق',
      workplace: formData.workplace || '',
      startDate: formData.startDate || '',
      endDate: formData.endDate || new Date().toISOString().split('T')[0],
      role: 'سائق / عامل',
      notes: 'تمت الأرشفة التلقائية من بيانات العمل السابقة'
    };

    setFormData(prev => ({
      ...prev,
      workHistory: [...(prev.workHistory || []), newItem]
    }));

    alert(`تمت أرشفة المشروع "${newItem.clientOrProject}" بنجاح في سجل أعمال العامل.`);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (duplicateWorker) {
      alert(`عذراً، لا يمكن حفظ البيانات! رقم الإقامة/الهوية مسجل بالفعل للعامل "${duplicateWorker.name}" (رقم العامل: ${duplicateWorker.workerNumber}).`);
      return;
    }
    
    let finalNotes = formData.notes;
    let finalPreviousBuses = formData.previousBuses || '';
    const isReassignment = worker && worker.assignedBusId && worker.assignedBusId !== formData.assignedBusId;
    
    // Check if we are editing an existing worker and the bus has changed
    if (isReassignment) {
      const today = new Date();
      const dateStr = today.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const historyHeader = "--- سجل الحافلات السابقة ---";
      let nextIndex = 1;

      // Count existing entries to determine next number
      if (finalNotes && finalNotes.includes(historyHeader)) {
        const historyPart = finalNotes.split(historyHeader)[1];
        const matches = historyPart.match(/\d+-\s/g);
        if (matches) {
          nextIndex = matches.length + 1;
        }
      }
      
      const logEntry = `${nextIndex}- تم فك الارتباط في ${dateStr} عن الحافلة رقم تشغيل: ${worker.assignedBusOperationalNumber} / رقم اللوحة: ${worker.assignedBusPlateNumber}`;
      
      if (!finalNotes || !finalNotes.includes(historyHeader)) {
        finalNotes = finalNotes ? `${finalNotes}\n\n${historyHeader}\n${logEntry}` : `${historyHeader}\n${logEntry}`;
      } else {
        finalNotes = `${finalNotes}\n${logEntry}`;
      }

      // Automatically append old bus to previousBuses field
      if (worker?.assignedBusOperationalNumber) {
        const oldBusNum = worker.assignedBusOperationalNumber.trim();
        const existingList = finalPreviousBuses 
          ? finalPreviousBuses.split(/[\s,،\-]+/).map(item => item.trim()).filter(Boolean) 
          : [];
        if (!existingList.includes(oldBusNum)) {
          existingList.push(oldBusNum);
          finalPreviousBuses = existingList.join(' - ');
        }
      }
    }

    const saveData: Omit<Worker, 'id'> = {
      ...formData,
      notes: finalNotes,
      previousBuses: finalPreviousBuses,
      workHistory: formData.workHistory || []
    };

    if (isReassignment) {
      setPendingSaveData(saveData);
      setShowConfirmModal(true);
    } else {
      onSave(saveData);
    }
  };

  const handleConfirmSave = () => {
    if (pendingSaveData) {
      onSave(pendingSaveData);
    }
    setShowConfirmModal(false);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === 'assignedBusId') {
      const selectedBus = buses.find(b => b.id === value);
      setFormData(prev => ({ 
        ...prev, 
        assignedBusId: value,
        assignedBusPlateNumber: selectedBus ? selectedBus.plateNumber : ''
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  return (
    <div className="fixed inset-0 bg-[#00000080] backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface w-full max-w-4xl max-h-[92vh] rounded-3xl overflow-hidden shadow-2xl border border-border flex flex-col"
        dir="rtl"
      >
        {/* Header */}
        <div className="bg-primary/10 p-6 text-primary border-b border-border flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <User className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-xl font-black">{worker ? 'تعديل بيانات وملف العامل' : 'إضافة عامل جديد'}</h2>
                <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">نظام الرقابة والأرشفة المهنية - درة المنورة</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="p-8 overflow-y-auto flex-1">
          <form id="worker-form" onSubmit={handleSubmit} className="space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Worker Identity */}
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                      <Briefcase className="w-3 h-3 text-primary" /> رقم العامل (تلقائي متسلسل)
                    </label>
                    <input 
                      name="workerNumber"
                      required
                      readOnly
                      value={formData.workerNumber}
                      className="w-full bg-slate-50 dark:bg-slate-800/50 border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-text-muted cursor-not-allowed font-bold"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                      <User className="w-3 h-3 text-primary" /> اسم العامل الكامل
                    </label>
                    <input 
                      name="name"
                      required
                      placeholder="الاسم الثلاثي أو الرباعي..."
                      value={formData.name}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                      <IdCard className="w-3 h-3 text-emerald-600" /> رقم الإقامة (للمقيمين)
                    </label>
                    <input 
                      name="iqamaNumber"
                      required={!formData.nationalId}
                      value={formData.iqamaNumber}
                      onChange={handleChange}
                      placeholder="رقم الإقامة المكون من 10 أرقام"
                      className={`w-full bg-background border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all ${
                        duplicateWorker ? 'border-red-400 focus:ring-2 focus:ring-red-400/20 bg-red-50/30' : 'border-border focus:ring-2 focus:ring-primary/20 font-bold'
                      }`}
                    />
                 </div>
                 <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                      <IdCard className="w-3 h-3 text-blue-600" /> رقم الهوية الوطنية (للسعوديين)
                    </label>
                    <input 
                      name="nationalId"
                      value={formData.nationalId}
                      onChange={handleChange}
                      placeholder="رقم الهوية الوطنية إن وجد"
                      className={`w-full bg-background border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all ${
                        duplicateWorker ? 'border-red-400 focus:ring-2 focus:ring-red-400/20 bg-red-50/30' : 'border-border focus:ring-2 focus:ring-primary/20 font-bold'
                      }`}
                    />
                 </div>

                 {duplicateWorker && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs shadow-2xs">
                      <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5 animate-bounce" />
                      <div>
                        <span className="font-black block text-sm">تنبيه: هذا العامل مسجل بالفعل في النظام (تكرار إقامة/هوية)!</span>
                        <span className="mt-0.5 block leading-relaxed">
                          رقم الإقامة أو الهوية المدخل مسجل سابقاً للعامل: <strong className="underline font-black">{duplicateWorker.name}</strong> (رقم العامل: <strong className="font-mono font-black">{duplicateWorker.workerNumber}</strong>).
                        </span>
                      </div>
                    </div>
                 )}
                 <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                      <Phone className="w-3 h-3 text-emerald-600" /> رقم الجوال
                    </label>
                    <input 
                      name="mobileNumber"
                      placeholder="05XXXXXXXX"
                      value={formData.mobileNumber}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                    />
                 </div>
              </div>

              {/* Employment Details */}
              <div className="space-y-4">
                 <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                      <Building className="w-3 h-3 text-blue-600" /> شركة الاستقدام
                    </label>
                    <input 
                      name="recruitmentCompany"
                      placeholder="اسم شركة الاستقدام / الكفيل..."
                      value={formData.recruitmentCompany}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                    />
                 </div>
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                   <div>
                      <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                        <Briefcase className="w-3 h-3 text-amber-600" /> مكان العمل الحالي
                      </label>
                      <input 
                        name="workplace"
                        placeholder="مثل: المدينة المنورة / الفرع الرئيسي..."
                        value={formData.workplace}
                        onChange={handleChange}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                      />
                   </div>
                   <div>
                      <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                        <CircleDollarSign className="w-3 h-3 text-emerald-600" /> الراتب الأساسي الشهري (ريال)
                      </label>
                      <input 
                        type="number"
                        name="basicSalary"
                        placeholder="الراتب الافتراضي..."
                        value={formData.basicSalary ?? ''}
                        onChange={(e) => {
                          const val = e.target.value === '' ? undefined : Number(e.target.value);
                          setFormData(prev => ({ ...prev, basicSalary: val }));
                        }}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-mono font-bold"
                      />
                   </div>
                 </div>
                 <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-blue-600" /> بداية العمل الحالي
                      </label>
                      <input 
                        type="date"
                        name="startDate"
                        lang="en-GB"
                        required
                        value={formData.startDate}
                        onChange={handleChange}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-right font-mono"
                        dir="ltr"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                        <Calendar className="w-3 h-3 text-red-600" /> نهاية العمل (اختياري)
                      </label>
                      <input 
                        type="date"
                        name="endDate"
                        lang="en-GB"
                        value={formData.endDate}
                        onChange={handleChange}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-right font-mono"
                        dir="ltr"
                      />
                    </div>
                 </div>
                 <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                      <User className="w-3 h-3 text-primary" /> اسم العميل / المشروع الحالي
                    </label>
                    <input 
                      name="clientName"
                      placeholder="مثل: شركة أمكور، عقد الحرم، أرامكو..."
                      value={formData.clientName}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                    />
                 </div>
                 <div className="space-y-4">
                    <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2 text-primary">
                      <BusIcon className="w-3 h-3" /> الحافلة المرتبطة
                    </label>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-[10px] font-black text-text-muted mb-1 block">رقم التشغيل (يدوي)</label>
                        <input 
                          name="assignedBusOperationalNumber"
                          list="bus-numbers"
                          value={formData.assignedBusOperationalNumber}
                          onChange={(e) => {
                            const val = e.target.value;
                            const selectedBus = buses.find(b => b.operationalNumber === val);
                            setFormData(prev => ({
                              ...prev,
                              assignedBusOperationalNumber: val,
                              assignedBusId: selectedBus ? selectedBus.id : '',
                              assignedBusPlateNumber: selectedBus ? selectedBus.plateNumber : ''
                            }));
                          }}
                          placeholder="اكتب رقم التشغيل..."
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                        />
                        <datalist id="bus-numbers">
                          {buses.map(bus => (
                            <option key={bus.id} value={bus.operationalNumber}>
                              {bus.plateNumber} ({bus.category})
                            </option>
                          ))}
                        </datalist>
                      </div>
                      <div>
                        <label className="text-[10px] font-black text-text-muted mb-1 block">رقم اللوحة (تلقائي)</label>
                        <input 
                          readOnly
                          value={formData.assignedBusPlateNumber || ''}
                          placeholder="سيظهر تلقائياً"
                          className="w-full bg-gray-50 border border-border rounded-xl px-4 py-3 text-sm font-mono text-text-muted cursor-not-allowed"
                        />
                      </div>
                    </div>
                    
                    {!formData.assignedBusId && formData.assignedBusOperationalNumber && (
                      <p className="text-[9px] text-amber-600 font-bold px-1">
                        * لم يتم العثور على حافلة بهذا الرقم في النظام
                      </p>
                    )}
                 </div>
              </div>
            </div>

            {/* === Previous Work History Section (أرشيف أعمال ومشاريع العامل السابقة) === */}
            <div className="p-6 bg-amber-50/40 dark:bg-amber-950/20 border-2 border-amber-200/80 rounded-3xl space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-amber-200/70 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md">
                    <History className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-amber-950 dark:text-amber-200">
                      سجل الأعمال والمشاريع السابقة (أرشيف العامل)
                    </h3>
                    <p className="text-xs text-amber-800/80 dark:text-amber-300/80 font-bold">
                      أرشفة الشركات والمشاريع التي عمل بها العامل (مثل: أمكور من تاريخ كذا وحتى كذا)
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(formData.clientName || formData.workplace) && (
                    <button
                      type="button"
                      onClick={handleArchiveCurrentWork}
                      title="نسخ العميل والموقع الحالي إلى أرشيف الأعمال السابقة"
                      className="px-3 py-2 bg-white dark:bg-slate-800 text-amber-800 dark:text-amber-300 border border-amber-300 rounded-xl text-xs font-black flex items-center gap-1.5 hover:bg-amber-100 transition-all shadow-xs"
                    >
                      <Archive className="w-3.5 h-3.5" />
                      أرشفة العمل الحالي
                    </button>
                  )}

                  {!isAddingHistory && (
                    <button
                      type="button"
                      onClick={() => {
                        setHistoryItem({
                          clientOrProject: '',
                          workplace: '',
                          startDate: '',
                          endDate: '',
                          role: 'سائق حافلة',
                          notes: ''
                        });
                        setEditingHistoryId(null);
                        setIsAddingHistory(true);
                      }}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 transition-all shadow-md active:scale-95"
                    >
                      <Plus className="w-4 h-4" />
                      إضافة مشروع / عمل سابق
                    </button>
                  )}
                </div>
              </div>

              {/* Add / Edit History Sub-form */}
              {isAddingHistory && (
                <div className="p-5 bg-white dark:bg-slate-800 rounded-2xl border border-amber-300 shadow-lg space-y-4">
                  <div className="flex items-center justify-between pb-2 border-b border-border">
                    <h4 className="text-xs font-black text-amber-900 dark:text-amber-200 flex items-center gap-2">
                      <Clock className="w-4 h-4 text-amber-600" />
                      {editingHistoryId ? 'تعديل بيانات العمل السابق' : 'تسجيل عمل / مشروع سابق جديد'}
                    </h4>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingHistory(false);
                        setEditingHistoryId(null);
                      }}
                      className="p-1 hover:bg-slate-100 rounded-lg text-text-muted"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-[11px] font-bold text-text-muted mb-1 block">
                        اسم العميل / المشروع / الشركة <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: أمكور (Amcor)"
                        value={historyItem.clientOrProject}
                        onChange={(e) => setHistoryItem(prev => ({ ...prev, clientOrProject: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-text-muted mb-1 block">
                        مكان العمل / المدينة
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: المدينة المنورة / جدة"
                        value={historyItem.workplace}
                        onChange={(e) => setHistoryItem(prev => ({ ...prev, workplace: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-text-muted mb-1 block">
                        المسمى الوظيفي / الدور
                      </label>
                      <input
                        type="text"
                        placeholder="مثال: سائق حافلة / مشرف نقل"
                        value={historyItem.role}
                        onChange={(e) => setHistoryItem(prev => ({ ...prev, role: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-text-muted mb-1 block">
                        من تاريخ (تاريخ البدء)
                      </label>
                      <input
                        type="date"
                        lang="en-GB"
                        value={historyItem.startDate}
                        onChange={(e) => setHistoryItem(prev => ({ ...prev, startDate: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-text-muted mb-1 block">
                        حتى تاريخ (تاريخ الانتهاء)
                      </label>
                      <input
                        type="date"
                        lang="en-GB"
                        value={historyItem.endDate}
                        onChange={(e) => setHistoryItem(prev => ({ ...prev, endDate: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none font-mono"
                        dir="ltr"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-text-muted mb-1 block">
                        ملاحظات أو سبب الانتقال
                      </label>
                      <input
                        type="text"
                        placeholder="ملاحظات توثيقية..."
                        value={historyItem.notes}
                        onChange={(e) => setHistoryItem(prev => ({ ...prev, notes: e.target.value }))}
                        className="w-full bg-background border border-border rounded-xl px-3 py-2.5 text-xs font-bold focus:ring-2 focus:ring-amber-500/20 outline-none"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingHistory(false);
                        setEditingHistoryId(null);
                      }}
                      className="px-4 py-2 bg-slate-100 dark:bg-slate-700 text-text-muted rounded-xl text-xs font-bold hover:bg-slate-200"
                    >
                      إلغاء
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveHistoryItem}
                      className="px-5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-black flex items-center gap-1.5 shadow-sm"
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      {editingHistoryId ? 'حفظ التعديلات' : 'إضافة إلى الأرشيف'}
                    </button>
                  </div>
                </div>
              )}

              {/* List of Archived Works */}
              {formData.workHistory && formData.workHistory.length > 0 ? (
                <div className="space-y-3">
                  {formData.workHistory.map((item, idx) => (
                    <div 
                      key={item.id || idx} 
                      className="p-4 bg-white dark:bg-slate-800 rounded-2xl border border-amber-200/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-amber-400 transition-all"
                    >
                      <div className="space-y-1 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-black text-sm text-text-main text-amber-900 dark:text-amber-300">
                            {item.clientOrProject}
                          </span>
                          {item.workplace && (
                            <span className="text-[11px] font-bold px-2 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg">
                              📍 {item.workplace}
                            </span>
                          )}
                          {item.role && (
                            <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-lg">
                              {item.role}
                            </span>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted font-bold font-mono">
                          <span className="flex items-center gap-1">
                            <span className="text-text-muted">الفترة:</span>
                            <span className="text-emerald-700 font-black">{item.startDate || 'غير محدد'}</span>
                            <span>وحتى</span>
                            <span className="text-red-700 font-black">{item.endDate || 'مستمر'}</span>
                          </span>
                          {item.notes && (
                            <span className="text-[11px] text-text-muted font-sans font-normal italic">
                              ({item.notes})
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() => handleEditHistoryItem(item)}
                          className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition-all"
                          title="تعديل هذا المشروع"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteHistoryItem(item.id)}
                          className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-xl transition-all"
                          title="حذف من الأرشيف"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-4 bg-white/60 dark:bg-slate-800/60 rounded-2xl border border-dashed border-amber-300 text-center text-xs text-amber-800/80 font-bold">
                  لا توجد أعمال أو مشاريع سابقة مضافة بعد لهذا العامل. يمكنك الضغط على "+ إضافة مشروع / عمل سابق" للأرشفة الكاملة (مثل: أمكور من تاريخ كذا وحتى كذا).
                </div>
              )}
            </div>

            {/* Previous Buses */}
            <div>
                <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2 text-indigo-600">
                  <BusIcon className="w-3.5 h-3.5 text-indigo-600" /> الحافلات السابقة المستلمة
                </label>
                <input 
                  name="previousBuses"
                  value={formData.previousBuses || ''}
                  onChange={handleChange}
                  placeholder="مثال: 102 - 105 - 304"
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all font-bold"
                />
                <p className="text-[10px] text-text-muted mt-1 font-medium">تُسجّل تلقائياً عند فك ارتباط وتغيير الحافلة، وتُعرض كقائمة أرقام تشغيل مفصولة بشرطة (-).</p>
            </div>

            {/* Additional Notes */}
            <div>
                <label className="text-xs font-bold text-text-muted mb-1.5 flex items-center gap-2">
                  <FileText className="w-3 h-3" /> ملاحظات إضافية
                </label>
                <textarea 
                  name="notes"
                  rows={3}
                  value={formData.notes}
                  onChange={handleChange}
                  placeholder="أي تفاصيل أو ملاحظات إدارية أخرى..."
                  className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
                ></textarea>
            </div>
          </form>
        </div>

        {/* Footer Actions */}
        <div className="p-6 bg-surface border-t border-border flex gap-3 shrink-0">
           <button 
            type="submit"
            form="worker-form"
            disabled={!!duplicateWorker}
            title={duplicateWorker ? 'رقم الإقامة/الهوية مكرر مسجل لعامل آخر' : 'حفظ البيانات'}
            className={`flex-1 py-3.5 rounded-xl font-black flex items-center justify-center gap-2 transition-all ${
              duplicateWorker
                ? 'bg-red-300 text-white cursor-not-allowed opacity-80'
                : 'bg-primary text-white hover:bg-secondary shadow-lg shadow-primary/20 cursor-pointer active:scale-98'
            }`}
          >
            <Save className="w-5 h-5" />
            {duplicateWorker ? 'لا يمكن الحفظ (عامل مكرر)' : 'حفظ بيانات وملف العامل'}
          </button>
          <button 
            type="button" 
            onClick={onClose}
            className="px-8 bg-surface text-text-muted border border-border rounded-xl font-bold hover:bg-background transition-all text-sm"
          >
            إلغاء
          </button>
        </div>
      </motion.div>

      {/* Reassignment Confirmation Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <div className="fixed inset-0 bg-[#00000090] backdrop-blur-md z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-surface max-w-md w-full rounded-3xl overflow-hidden shadow-2xl border border-border"
              dir="rtl"
            >
              <div className="p-8 text-center">
                <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto mb-6 text-amber-600">
                  <AlertTriangle className="w-8 h-8" />
                </div>
                <h3 className="text-xl font-black text-text-main mb-3">تأكيد تغيير الارتباط</h3>
                <p className="text-text-muted text-sm font-bold leading-relaxed mb-8">
                  هذا العامل مرتبط حالياً بالحافلة رقم 
                  <span className="text-amber-600 px-1">({worker?.assignedBusOperationalNumber})</span>. 
                  هل أنت متأكد من رغبتك في فك هذا الارتباط وتغييره للحافلة الجديدة؟ سيتم حفظ بيانات الحافلة السابقة في سجل الملاحظات تلقائياً.
                </p>
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleConfirmSave}
                    className="w-full bg-primary text-white py-3.5 rounded-xl font-black hover:bg-secondary transition-all shadow-lg"
                  >
                    نعم، تأكيد تغيير الارتباط
                  </button>
                  <button
                    onClick={() => setShowConfirmModal(false)}
                    className="w-full bg-surface text-text-muted py-3.5 rounded-xl font-black border border-border hover:bg-background transition-all"
                  >
                    تراجع، البقاء على الارتباط الحالي
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

