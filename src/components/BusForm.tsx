import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Bus as BusIcon } from 'lucide-react';
import type { Bus } from '../types';

interface BusFormProps {
  bus?: Bus | null;
  onSave: (data: Partial<Bus>) => void;
  onClose: () => void;
}

export const BusForm: React.FC<BusFormProps> = ({ bus, onSave, onClose }) => {
  const [formData, setFormData] = useState<Partial<Bus>>({
    operationalNumber: '',
    plateNumber: '',
    category: '',
    model: '',
    manufacturer: '',
    color: '',
    technicalStatus: '',
    location: '',
    notes: ''
  });

  useEffect(() => {
    if (bus) {
      setFormData(bus);
    }
  }, [bus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    let finalNotes = formData.notes;

    // Check if we are editing an existing bus and the location has changed
    if (bus && bus.location && bus.location !== formData.location) {
      const today = new Date();
      const dateStr = today.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      
      const historyHeader = "--- سجل المواقع السابقة ---";
      let nextIndex = 1;

      // Count existing entries to determine next number
      if (finalNotes && finalNotes.includes(historyHeader)) {
        const historyPart = finalNotes.split(historyHeader)[1];
        const matches = historyPart.match(/\d+-\s/g);
        if (matches) {
          nextIndex = matches.length + 1;
        }
      }
      
      const logEntry = `${nextIndex}- تم تغيير الموقع في ${dateStr} من: ${bus.location}`;
      
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
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-surface w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl border border-border"
      >
        <div className="bg-primary/10 p-6 text-primary border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <BusIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{bus ? 'تعديل بيانات الحافلة' : 'إضافة حافلة جديدة'}</h3>
              <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">نظام إدارة الأسطول - درة المنورة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-right" dir="rtl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted mr-1 uppercase">رقم التشغيل</label>
              <input 
                required
                name="operationalNumber"
                value={formData.operationalNumber}
                onChange={handleChange}
                placeholder="مثال: 501"
                className="w-full p-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary transition-all text-sm font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted mr-1 uppercase">رقم اللوحة</label>
              <input 
                required
                name="plateNumber"
                value={formData.plateNumber}
                onChange={handleChange}
                placeholder="مثال: أ ب ج 1234"
                className="w-full p-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary transition-all text-sm font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted mr-1 uppercase">فئة الحافلة</label>
              <input 
                name="category"
                value={formData.category}
                onChange={handleChange}
                placeholder="مثال: VIP / عمال"
                className="w-full p-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary transition-all text-sm font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted mr-1 uppercase">الموديل (السنة)</label>
              <input 
                name="model"
                value={formData.model}
                onChange={handleChange}
                placeholder="مثال: 2023"
                className="w-full p-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary transition-all text-sm font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted mr-1 uppercase">الشركة المصنعة</label>
              <input 
                name="manufacturer"
                value={formData.manufacturer}
                onChange={handleChange}
                placeholder="مثال: مرسيدس / هيونداي"
                className="w-full p-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary transition-all text-sm font-semibold"
              />
            </div>
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-text-muted mr-1 uppercase">موقع عمل الباص</label>
              <input 
                name="location"
                value={formData.location}
                onChange={handleChange}
                placeholder="مثال: أمكور / رابغ"
                className="w-full p-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary transition-all text-sm font-semibold"
              />
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-text-muted mr-1 uppercase">حالة الباص الفنية</label>
              <select 
                name="technicalStatus"
                value={formData.technicalStatus}
                onChange={handleChange}
                className="w-full p-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary transition-all text-sm font-semibold"
              >
                <option value="">اختر الحالة</option>
                <option value="ممتازة">ممتازة</option>
                <option value="جيدة جداً">جيدة جداً</option>
                <option value="جيدة">جيدة</option>
                <option value="تحت الصيانة">تحت الصيانة</option>
                <option value="متوقف">متوقف</option>
              </select>
            </div>
            <div className="space-y-1 md:col-span-2">
              <label className="text-[11px] font-bold text-text-muted mr-1 uppercase">ملاحظات</label>
              <textarea 
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                placeholder="أي تفاصيل إضافية..."
                className="w-full p-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary transition-all resize-none text-sm font-semibold"
              />
            </div>
          </div>

          <div className="flex gap-3 pt-4">
            <button 
              type="submit"
              className="flex-1 bg-primary text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-secondary transition-all shadow-lg shadow-primary/20 text-sm"
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
