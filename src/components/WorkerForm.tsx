import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, User, IdCard, Phone, Building, Briefcase, Calendar, FileText, Bus as BusIcon } from 'lucide-react';
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
    mobileNumber: '',
    recruitmentCompany: '',
    workplace: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0],
    clientName: '',
    assignedBusId: '',
    assignedBusOperationalNumber: '',
    assignedBusPlateNumber: '',
    notes: ''
  });

  useEffect(() => {
    if (worker) {
      setFormData({
        workerNumber: worker.workerNumber,
        name: worker.name,
        iqamaNumber: worker.iqamaNumber,
        mobileNumber: worker.mobileNumber,
        recruitmentCompany: worker.recruitmentCompany,
        workplace: worker.workplace,
        startDate: worker.startDate,
        endDate: worker.endDate,
        clientName: worker.clientName,
        assignedBusId: worker.assignedBusId || '',
        assignedBusOperationalNumber: worker.assignedBusOperationalNumber || '',
        assignedBusPlateNumber: worker.assignedBusPlateNumber || '',
        notes: worker.notes || ''
      });
    }
  }, [worker]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalNotes = formData.notes;
    
    // Check if we are editing an existing worker and the bus has changed
    if (worker && worker.assignedBusId && worker.assignedBusId !== formData.assignedBusId) {
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
    }

    onSave({
      ...formData,
      notes: finalNotes
    });
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
                    <Briefcase className="w-3 h-3" /> رقم العامل
                  </label>
                  <input 
                    name="workerNumber"
                    required
                    value={formData.workerNumber}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
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
                    <IdCard className="w-3 h-3" /> رقم الإقامة
                  </label>
                  <input 
                    name="iqamaNumber"
                    required
                    value={formData.iqamaNumber}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm font-mono focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
               </div>
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
               <div>
                  <label className="text-xs font-bold text-text-muted mb-1.5 block flex items-center gap-2">
                    <Briefcase className="w-3 h-3" /> مكان العمل
                  </label>
                  <input 
                    name="workplace"
                    value={formData.workplace}
                    onChange={handleChange}
                    className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm focus:ring-2 focus:ring-primary/20 outline-none transition-all"
                  />
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
                      <Calendar className="w-3 h-3 text-red-600" /> نهاية العمل
                    </label>
                    <input 
                      type="date"
                      name="endDate"
                      lang="en-GB"
                      required
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
              className="flex-1 bg-primary text-white py-4 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-secondary transition-all shadow-lg shadow-primary/20"
            >
              <Save className="w-5 h-5" />
              حفظ البيانات
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
    </div>
  );
};
