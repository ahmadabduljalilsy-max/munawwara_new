import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { X, FileText, Building2, Calendar, DollarSign, Info, History, Upload, File } from 'lucide-react';
import { Contract } from '../types';

interface ContractFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (contract: Partial<Contract>) => Promise<void>;
  editingContract: Contract | null;
}

export const ContractForm: React.FC<ContractFormProps> = ({
  isOpen,
  onClose,
  onSave,
  editingContract
}) => {
  const [formData, setFormData] = useState<Partial<Contract>>({
    contractNumber: '',
    clientName: '',
    startDate: '',
    endDate: '',
    value: 0,
    status: 'active',
    description: ''
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        alert('يرجى اختيار ملف بصيغة PDF فقط');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        alert('حجم الملف كبير جداً. الحد الأقصى هو 5 ميجابايت');
        return;
      }

      const reader = new FileReader();
      reader.onload = (event) => {
        setFormData({ ...formData, pdfUrl: event.target?.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (editingContract) {
      setFormData(editingContract);
    } else {
      setFormData({
        contractNumber: '',
        clientName: '',
        startDate: '',
        endDate: '',
        value: 0,
        status: 'active',
        description: ''
      });
    }
  }, [editingContract, isOpen]);

  const duration = useMemo(() => {
    if (!formData.startDate || !formData.endDate) return null;
    const start = new Date(formData.startDate);
    const end = new Date(formData.endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return null;
    
    const diffTime = Math.abs(end.getTime() - start.getTime());
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
  }, [formData.startDate, formData.endDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSave(formData);
      onClose();
    } catch (error) {
      console.error(error);
      alert('حدث خطأ أثناء حفظ العقد');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative bg-surface w-full max-w-2xl rounded-2xl shadow-2xl border border-border overflow-hidden"
            dir="rtl"
          >
            <div className="flex items-center justify-between p-6 border-b border-border bg-slate-50/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-text-main">
                    {editingContract ? 'تعديل بيانات العقد' : 'إضافة عقد جديد'}
                  </h3>
                  <p className="text-xs text-text-muted font-bold">يرجى إدخال كافة البيانات المطلوبة بدقة</p>
                </div>
              </div>
              <button 
                onClick={onClose}
                className="p-2 hover:bg-background rounded-xl transition-colors text-text-muted"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* رقم العقد */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-primary" />
                    رقم العقد
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.contractNumber}
                    onChange={(e) => setFormData({ ...formData, contractNumber: e.target.value })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary outline-none transition-all text-xs font-bold"
                    placeholder="مثال: CN-2024-001"
                  />
                </div>

                {/* اسم العميل */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-primary" />
                    اسم العميل
                  </label>
                  <input
                    required
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary outline-none transition-all text-xs font-bold"
                    placeholder="أدخل اسم الشركة الموكلة"
                  />
                </div>

                {/* تاريخ البدء */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-primary" />
                    تاريخ البدء
                  </label>
                  <input
                    required
                    type="date"
                    lang="en-GB"
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary outline-none transition-all text-xs font-bold text-right"
                    dir="ltr"
                  />
                </div>

                {/* تاريخ الانتهاء */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-red-500" />
                    تاريخ الانتهاء
                  </label>
                  <div className="relative">
                    <input
                      required
                      type="date"
                      lang="en-GB"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                      className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary outline-none transition-all text-xs font-bold text-right"
                      dir="ltr"
                    />
                    {duration && (
                      <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-1 px-2 py-0.5 rounded bg-primary/5 text-primary text-[10px] font-black border border-primary/20">
                        <History className="w-3 h-3" />
                        {duration}
                      </div>
                    )}
                  </div>
                </div>

                {/* القيمة */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-primary" />
                    قيمة العقد (ر.س)
                  </label>
                  <input
                    required
                    type="number"
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary outline-none transition-all text-xs font-bold"
                  />
                </div>

                {/* الحالة */}
                <div className="space-y-2">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-primary" />
                    حالة العقد
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary outline-none transition-all text-xs font-bold appearance-none cursor-pointer"
                  >
                    <option value="active">نشط</option>
                    <option value="expired">منتهي</option>
                    <option value="pending">قيد الانتظار</option>
                  </select>
                </div>

                {/* ملاحظات */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-text-muted" />
                    ملاحظات إضافية
                  </label>
                  <textarea
                    rows={3}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-2.5 bg-background border border-border rounded-xl focus:border-primary outline-none transition-all text-xs font-bold resize-none"
                    placeholder="أدخل أي تفاصيل إضافية عن العقد..."
                  />
                </div>

                {/* رفع العقد PDF */}
                <div className="md:col-span-2 space-y-2">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <Upload className="w-3.5 h-3.5 text-primary" />
                    رفع نسخة العقد (PDF)
                  </label>
                  <div className="relative">
                    <input
                      type="file"
                      accept=".pdf"
                      onChange={handleFileChange}
                      className="hidden"
                      id="pdf-upload"
                    />
                    <label
                      htmlFor="pdf-upload"
                      className="flex items-center justify-between w-full px-4 py-3 bg-background border-2 border-dashed border-border rounded-2xl cursor-pointer hover:border-primary/50 hover:bg-primary/[0.02] transition-all group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                          <File className="w-4 h-4" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[11px] font-black text-text-main">
                            {formData.pdfUrl ? 'تم اختيار ملف العقد' : 'اختر ملف PDF'}
                          </span>
                          <span className="text-[9px] text-text-muted font-bold">الحد الأقصى 5 ميجابايت</span>
                        </div>
                      </div>
                      {formData.pdfUrl && (
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                          تم الرفع بنجاح
                        </span>
                      )}
                    </label>
                  </div>
                </div>
              </div>

              <div className="mt-8 flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-primary text-white font-black py-3 rounded-xl hover:bg-secondary transition-all shadow-lg shadow-primary/20 disabled:opacity-50 active:scale-95"
                >
                  {loading ? 'جاري الحفظ...' : 'حفظ البيانات'}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-background text-text-main font-bold py-3 rounded-xl border border-border hover:bg-slate-50 transition-all active:scale-95"
                >
                  إلغاء
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
