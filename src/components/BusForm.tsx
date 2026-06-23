import React, { useState, useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Save, Bus as BusIcon, History, Calendar, MapPin, ArrowRight } from 'lucide-react';
import type { Bus } from '../types';

interface BusFormProps {
  bus?: Bus | null;
  onSave: (data: Partial<Bus>) => void;
  onClose: () => void;
}

interface MovementLog {
  index: number;
  date: string;
  fromLocation: string;
}

const parseMovementLogs = (notes: string): MovementLog[] => {
  if (!notes) return [];
  const historyHeader = "--- سجل المواقع السابقة ---";
  if (!notes.includes(historyHeader)) return [];
  
  const historyPart = notes.split(historyHeader)[1];
  if (!historyPart) return [];
  
  const lines = historyPart.split('\n').map(line => line.trim()).filter(Boolean);
  const logs: MovementLog[] = [];
  
  lines.forEach(line => {
    // Regex matches the format: <index>- تم تغيير الموقع في <date> من: <location>
    const match = line.match(/^(\d+)-\s*تم تغيير الموقع في\s+(.+?)\s+من:\s*(.+)$/);
    if (match) {
      logs.push({
        index: parseInt(match[1], 10),
        date: match[2].trim(),
        fromLocation: match[3].trim()
      });
    } else {
      const indexMatch = line.match(/^(\d+)-/);
      const index = indexMatch ? parseInt(indexMatch[1], 10) : logs.length + 1;
      
      let date = '';
      let fromLocation = '';
      
      if (line.includes('في ') && line.includes(' من:')) {
        const parts = line.split('في ');
        if (parts[1]) {
          const subParts = parts[1].split(' من:');
          date = subParts[0] ? subParts[0].trim() : '';
          fromLocation = subParts[1] ? subParts[1].trim() : '';
        }
      }
      
      if (date || fromLocation) {
        logs.push({
          index,
          date: date || 'غير محدد',
          fromLocation: fromLocation || 'غير محدد'
        });
      } else {
        logs.push({
          index,
          date: '—',
          fromLocation: line
        });
      }
    }
  });
  
  return logs.sort((a, b) => b.index - a.index);
};

export const BusForm: React.FC<BusFormProps> = ({ bus, onSave, onClose }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'history'>('details');
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

  // Extract previous location movement logs if editing a bus
  const movementLogs = React.useMemo(() => {
    return bus && bus.notes ? parseMovementLogs(bus.notes) : [];
  }, [bus, bus?.notes]);

  useEffect(() => {
    if (bus) {
      const historyHeader = "--- سجل المواقع السابقة ---";
      let displayNotes = bus.notes || '';
      if (displayNotes.includes(historyHeader)) {
        displayNotes = displayNotes.split(historyHeader)[0].trim();
      }
      setFormData({
        ...bus,
        notes: displayNotes
      });
      // Default to details tab when opening a new bus
      setActiveTab('details');
    } else {
      setFormData({
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
      setActiveTab('details');
    }
  }, [bus]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Extract history part from existing bus or display notes if we need to preserve existing
    const historyHeader = "--- سجل المواقع السابقة ---";
    let historyPart = '';
    if (bus && bus.notes && bus.notes.includes(historyHeader)) {
      historyPart = bus.notes.substring(bus.notes.indexOf(historyHeader));
    }
    
    // Clean up current user manual notes
    let userNotes = formData.notes || '';
    if (userNotes.includes(historyHeader)) {
      userNotes = userNotes.split(historyHeader)[0].trim();
    }
    
    let finalNotes = userNotes;

    // Check if we are editing an existing bus and the location has changed
    if (bus && bus.location && bus.location !== formData.location) {
      const today = new Date();
      const dateStr = today.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
      
      let nextIndex = 1;

      // Count existing entries in historyPart to calculate the correct index
      if (historyPart) {
        const matches = historyPart.match(/\d+-\s/g);
        if (matches) {
          nextIndex = matches.length + 1;
        }
      }
      
      const logEntry = `${nextIndex}- تم تغيير الموقع في ${dateStr} من: ${bus.location}`;
      
      if (!historyPart) {
        historyPart = `${historyHeader}\n${logEntry}`;
      } else {
        historyPart = `${historyPart}\n${logEntry}`;
      }
    }

    // Combine manual notes with history log
    if (historyPart) {
      finalNotes = finalNotes ? `${finalNotes}\n\n${historyPart}` : historyPart;
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
        {/* Header section */}
        <div className="bg-primary/10 p-6 text-primary border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary/20 rounded-xl flex items-center justify-center">
              <BusIcon className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h3 className="text-xl font-bold">{bus ? 'تفاصيل وبيانات الحافلة' : 'إضافة حافلة جديدة'}</h3>
              <p className="text-text-muted text-[10px] uppercase font-bold tracking-wider">نظام إدارة الأسطول - درة المنورة</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-surface rounded-lg transition-colors">
            <X className="w-5 h-5 text-text-muted" />
          </button>
        </div>

        {/* Navigation Tabs (Only shown if editing an existing bus) */}
        {bus && (
          <div className="flex border-b border-border bg-slate-50/50 px-6 gap-4" dir="rtl">
            <button
              type="button"
              onClick={() => setActiveTab('details')}
              className={`py-3 px-2 border-b-2 font-black text-xs transition-all flex items-center gap-2 ${
                activeTab === 'details'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <BusIcon className="w-4 h-4" />
              البيانات والمواصفات
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('history')}
              className={`py-3 px-2 border-b-2 font-black text-xs transition-all flex items-center gap-2 ${
                activeTab === 'history'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-text-muted hover:text-text-main'
              }`}
            >
              <History className="w-4 h-4" />
              سجل الحركة والمواقع
              {movementLogs.length > 0 && (
                <span className="bg-primary/10 text-primary rounded-full px-1.5 py-0.5 text-[9px] font-bold">
                  {movementLogs.length}
                </span>
              )}
            </button>
          </div>
        )}

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6 text-right" dir="rtl">
          {activeTab === 'details' ? (
            <>
              {/* Form Input Fields */}
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
                  <label className="text-[11px] font-bold text-text-muted mr-1 uppercase">اللون</label>
                  <input 
                    name="color"
                    value={formData.color}
                    onChange={handleChange}
                    placeholder="مثال: أبيض / أزرق"
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
                  <label className="text-[11px] font-bold text-text-muted mr-1 uppercase">ملاحظات عامة</label>
                  <textarea 
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                    placeholder="أي تفاصيل إضافية عن الحافلة..."
                    className="w-full p-2.5 bg-background border border-border rounded-xl outline-none focus:border-primary transition-all resize-none text-sm font-semibold"
                  />
                </div>
              </div>

              {/* Action Buttons for Details Edit Mode */}
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
            </>
          ) : (
            <>
              {/* Movement History Logs View */}
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-border pb-3">
                  <div>
                    <h4 className="text-[10px] font-black text-text-muted uppercase tracking-wide">سجل حركات وتتبع موقع الحافلة</h4>
                    <p className="text-sm font-black text-text-main mt-0.5">الحافلة رقم {bus?.operationalNumber} ({bus?.plateNumber})</p>
                  </div>
                  <div className="text-left">
                    <span className="text-[9px] font-bold text-text-muted block">الموقع الحالي</span>
                    <span className="inline-flex items-center gap-1 text-[10px] font-black text-primary bg-primary/10 px-2.5 py-1 rounded-lg mt-0.5 border border-primary/20">
                      <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                      {formData.location || 'غير محدد'}
                    </span>
                  </div>
                </div>

                {/* Logs Table / Timeline */}
                <div className="max-h-[320px] overflow-y-auto pr-1">
                  {movementLogs.length === 0 ? (
                    <div className="py-12 text-center bg-slate-50/50 rounded-2xl border border-dashed border-border p-6">
                      <div className="bg-primary/5 w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3">
                        <History className="w-6 h-6 text-primary/40" />
                      </div>
                      <p className="text-sm font-black text-text-main mb-1">لا يوجد سجل حركات للسيارة</p>
                      <p className="text-[11px] text-text-muted font-bold max-w-sm mx-auto">
                        سيقوم النظام بتتبع وتحديث المواقع السابقة لهذه الحافلة وتدوينها آلياً هنا عند قيامك بتغيير موقع عمل الحافلة في المستقبل.
                      </p>
                    </div>
                  ) : (
                    <div className="border border-border rounded-xl overflow-hidden bg-background shadow-inner">
                      <table className="w-full text-right border-collapse text-xs" dir="rtl">
                        <thead>
                          <tr className="bg-slate-50/80 border-b border-border text-text-muted font-bold">
                            <th className="py-3 px-4 text-center w-12">#</th>
                            <th className="py-3 px-4">تاريخ التغيير</th>
                            <th className="py-3 px-4">الموقع السابق</th>
                            <th className="py-3 px-4">المسار الانتقالي</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border/60 font-semibold text-text-main">
                          {movementLogs.map((log, idx) => {
                            // Determine destination of this transition
                            const nextLog = idx > 0 ? movementLogs[idx - 1] : null;
                            const destination = nextLog ? nextLog.fromLocation : (formData.location || 'تحديث حالي');

                            return (
                              <tr key={log.index} className="hover:bg-slate-50/30 transition-colors">
                                <td className="py-3.5 px-4 text-center">
                                  <span className="inline-flex items-center justify-center w-5 h-5 rounded bg-slate-100 text-[10px] text-text-muted font-bold">
                                    {log.index}
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 font-black">
                                  <div className="flex items-center gap-1.5">
                                    <Calendar className="w-3.5 h-3.5 text-text-muted" />
                                    <span>{log.date}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-amber-700">
                                  <div className="flex items-center gap-1">
                                    <MapPin className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                                    <span>{log.fromLocation}</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-[10px]">
                                  <div className="flex items-center gap-2 text-text-muted">
                                    <span className="font-bold">{log.fromLocation}</span>
                                    <ArrowRight className="w-3.5 h-3.5 text-primary rotate-180 shrink-0" />
                                    <span className="text-primary font-black">{destination}</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons for History View */}
              <div className="flex gap-3 pt-4">
                <button 
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="flex-1 bg-primary/10 text-primary py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-all text-xs"
                >
                  <BusIcon className="w-4 h-4" />
                  الرجوع لتعديل البيانات والمواصفات
                </button>
                <button 
                  type="button" 
                  onClick={onClose}
                  className="px-8 bg-surface text-text-muted border border-border rounded-xl font-bold hover:bg-background transition-all text-xs"
                >
                  إغلاق التفاصيل
                </button>
              </div>
            </>
          )}
        </form>
      </motion.div>
    </div>
  );
};
