import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, Save, User, IdCard, Phone, Building, Briefcase, Calendar, FileText, Bus as BusIcon, AlertTriangle, CircleDollarSign } from 'lucide-react';
import { Worker, Bus } from '../types';

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
    notes: ''
  });

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingSaveData, setPendingSaveData] = useState<Omit<Worker, 'id'> | null>(null);

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
        workerNumber: nextNum
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

    const saveData = {
      ...formData,
      notes: finalNotes,
      previousBuses: finalPreviousBuses
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
        className="bg-surface w-full max-w-3xl rounded-3xl overflow-hidden shadow-2xl border border-border"
      >
        <div className="bg-primary/10 p-6 text-primary border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center text-primary">
                <User className="w-6 h-6" />
             </div>
             <div>
                <h2 className="text-xl font-black">{worker ? 'تعديل بيانات عامل' : 'إضافة عامل جديد'}</h2>
                <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">نظام الرقابة والمتابعة - درة المنورة</p>
             </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Worker Identity */}
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                    <Briefcase className="w-3 h-3" /> رقم العامل (تلقائي متسلسل)
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
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                    <User className="w-3 h-3" /> اسم العامل الكامل
                  </label>
                  <input 
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
               </div>
               <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                    <IdCard className="w-3 h-3 text-emerald-600" /> رقم الإقامة (للمقيمين)
                  </label>
                  <input 
                    name="iqamaNumber"
                    required={!formData.nationalId}
                    value={formData.iqamaNumber}
                    onChange={handleChange}
                    className={`w-full bg-background border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all ${
                      duplicateWorker ? 'border-red-400 focus:ring-2 focus:ring-red-400/20 bg-red-50/30' : 'border-border focus:ring-2 focus:ring-primary/20'
                    }`}
                  />
               </div>
               <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                    <IdCard className="w-3 h-3 text-blue-600" /> رقم الهوية الوطنية (للسعوديين)
                  </label>
                  <input 
                    name="nationalId"
                    value={formData.nationalId}
                    onChange={handleChange}
                    className={`w-full bg-background border rounded-xl px-4 py-3 text-sm font-mono outline-none transition-all ${
                      duplicateWorker ? 'border-red-400 focus:ring-2 focus:ring-red-400/20 bg-red-50/30' : 'border-border focus:ring-2 focus:ring-primary/20'
                    }`}
                  />
               </div>

               {duplicateWorker && (
                  <div className="col-span-1 md:col-span-2 p-3 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-xs shadow-2xs">
                    <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 mt-0.5 animate-bounce" />
                    <div>
                      <span className="font-black block text-sm">تنبيه: هذا العامل مسجل بالفعل في النظام (تكرار إقامة/هوية)!</span>
                      <span className="mt-0.5 block leading-relaxed">
                        رقم الإقامة أو الهوية المدخل مسجل سابقاً للعامل: <strong className="underline font-black">{duplicateWorker.name}</strong> (رقم العامل المسلسل: <strong className="font-mono font-black">{duplicateWorker.workerNumber}</strong>). لا يمكن إضافة العامل مرتين بالنظام.
                      </span>
                    </div>
                  </div>
               )}
               <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                    <Phone className="w-3 h-3" /> رقم الجوال
                  </label>
                  <input 
                    name="mobileNumber"
                    value={formData.mobileNumber}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
               </div>
            </div>

            {/* Employment Details */}
            <div className="space-y-4">
               <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                    <Building className="w-3 h-3" /> شركة الاستقدام
                  </label>
                  <input 
                    name="recruitmentCompany"
                    value={formData.recruitmentCompany}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
               </div>
               <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                 <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                      <Briefcase className="w-3 h-3 text-amber-600" /> مكان العمل
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
                    <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                      <CircleDollarSign className="w-3 h-3 text-emerald-600" /> الراتب الأساسي الشهري (ريال)
                    </label>
                    <input 
                      type="number"
                      name="basicSalary"
                      placeholder="الراتب الأساسي الافتراضي..."
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
                    <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-blue-600" /> بداية العمل
                    </label>
                    <input 
                      type="date"
                      name="startDate"
                      lang="en-GB"
                      required
                      value={formData.startDate}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-right"
                      dir="ltr"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                      <Calendar className="w-3 h-3 text-red-600" /> نهاية العمل (اختياري)
                    </label>
                    <input 
                      type="date"
                      name="endDate"
                      lang="en-GB"
                      value={formData.endDate}
                      onChange={handleChange}
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all text-right"
                      dir="ltr"
                    />
                  </div>
               </div>
               <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                    <User className="w-3 h-3" /> اسم العميل
                  </label>
                  <input 
                    name="clientName"
                    value={formData.clientName}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
               </div>
               <div className="space-y-4">
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2 text-primary">
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

          <div className="mt-6">
              <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2 text-indigo-600">
                <BusIcon className="w-3.5 h-3.5 text-indigo-600" /> الحافلات السابقة
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

          <div className="mt-6">
              <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                <FileText className="w-3 h-3" /> ملاحظات إضافية
              </label>
              <textarea 
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={handleChange}
                className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all resize-none"
              ></textarea>
          </div>

          <div className="mt-8 flex gap-3">
             <button 
              type="submit"
              disabled={!!duplicateWorker}
              title={duplicateWorker ? 'رقم الإقامة/الهوية مكرر مسجل لعامل آخر' : 'حفظ البيانات'}
              className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all ${
                duplicateWorker
                  ? 'bg-red-300 text-white cursor-not-allowed opacity-80'
                  : 'bg-primary text-white hover:bg-secondary shadow-lg shadow-primary/20 cursor-pointer'
              }`}
            >
              <Save className="w-5 h-5" />
              {duplicateWorker ? 'لا يمكن الحفظ (عامل مكرر)' : 'حفظ البيانات'}
            </button>
            <button 
              type="button" 
              onClick={onClose}
              className="px-8 bg-surface text-text-muted border border-border rounded-xl font-bold hover:bg-background transition-all text-sm"
            >
              إلغاء
            </button>
          </div>
        </form>
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
