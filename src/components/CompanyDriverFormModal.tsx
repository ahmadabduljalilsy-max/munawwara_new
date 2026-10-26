import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  User, 
  Phone, 
  IdCard, 
  Globe, 
  FileText, 
  CheckCircle2, 
  ShieldCheck, 
  Sparkles, 
  MapPin, 
  Bus,
  AlertCircle,
  Briefcase
} from 'lucide-react';
import type { CompanyDriver, DriverType, DriverStatus, DriverClassification, Bus as BusType, Worker } from '../types';
import { resolveDriverType, getDriverClassification, isDriverActiveInMonitoring, getMatchingActiveMonitoringWorker } from '../lib/driverUtils';
import { Activity, UserX, Clock, Calendar } from 'lucide-react';

interface CompanyDriverFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (driverData: Partial<CompanyDriver>) => Promise<void>;
  driver: CompanyDriver | null;
  existingDrivers?: CompanyDriver[];
  buses?: BusType[];
  workers?: Worker[];
}

const COMMON_NATIONALITIES = [
  'السعودية',
  'مصر',
  'اليمن',
  'باكستان',
  'الهند',
  'بنغلاديش',
  'السودان',
  'الأردن',
  'سوريا',
  'المغرب',
  'تونس',
  'الفلبين',
  'نيبال'
];

const COMMON_WORKPLACES = [
  'المدينة المنورة',
  'مكة المكرمة',
  'جدة',
  'الرياض',
  'ينبع',
  'الدمام',
  'القصيم',
  'الطائف',
  'حائل',
  'تبوك',
  'محطة القطار',
  'مطار الأمير محمد بن عبدالعزيز',
  'مطار الملك عبدالعزيز الدولي'
];

export const CompanyDriverFormModal: React.FC<CompanyDriverFormModalProps> = ({
  isOpen,
  onClose,
  onSave,
  driver,
  existingDrivers = [],
  buses = [],
  workers = []
}) => {
  const [formData, setFormData] = useState<{
    fullName: string;
    driverType: DriverType;
    driverClassification: DriverClassification;
    status: DriverStatus;
    statusReason: string;
    nationality: string;
    iqamaNumber: string;
    borderNumber: string;
    mobileNumber: string;
    workplace: string;
    busNumber: string;
    notes: string;
  }>({
    fullName: '',
    driverType: 'مقيم',
    driverClassification: 'نقل عمال',
    status: 'نشط',
    statusReason: '',
    nationality: '',
    iqamaNumber: '',
    borderNumber: '',
    mobileNumber: '',
    workplace: 'نقل عمال',
    busNumber: '',
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (driver) {
      const computedType = resolveDriverType(driver);
      const computedClass = getDriverClassification(driver, workers);
      setFormData({
        fullName: driver.fullName || '',
        driverType: computedType,
        driverClassification: computedClass,
        status: driver.status || 'نشط',
        statusReason: driver.statusReason || '',
        nationality: driver.nationality || '',
        iqamaNumber: driver.iqamaNumber || '',
        borderNumber: driver.borderNumber || '',
        mobileNumber: driver.mobileNumber || '',
        workplace: computedClass,
        busNumber: driver.busNumber || '',
        notes: driver.notes || ''
      });
    } else {
      setFormData({
        fullName: '',
        driverType: 'مقيم',
        driverClassification: 'نقل عمال',
        status: 'نشط',
        statusReason: '',
        nationality: '',
        iqamaNumber: '',
        borderNumber: '',
        mobileNumber: '',
        workplace: 'نقل عمال',
        busNumber: '',
        notes: ''
      });
    }
    setError(null);
  }, [driver, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim()) {
      setError('يرجى إدخال اسم السائق الثلاثي');
      return;
    }

    const cleanIqama = formData.iqamaNumber.trim();
    const cleanBorder = formData.borderNumber.trim();

    // 1. Validation: Iqama Number Uniqueness Check
    if (cleanIqama) {
      const dupIqama = existingDrivers.find(d => 
        d.id !== driver?.id && 
        d.iqamaNumber && 
        d.iqamaNumber.trim() === cleanIqama
      );
      if (dupIqama) {
        setError(`رقم الإقامة (${cleanIqama}) مسجل مسبقاً للسائق: "${dupIqama.fullName}" ولا يمكن تكراره.`);
        return;
      }

      const crossDupBorder = existingDrivers.find(d => 
        d.id !== driver?.id && 
        d.borderNumber && 
        d.borderNumber.trim() === cleanIqama
      );
      if (crossDupBorder) {
        setError(`الرقم (${cleanIqama}) مسجل مسبقاً كرقم حدود للسائق: "${crossDupBorder.fullName}".`);
        return;
      }
    }

    // 2. Validation: Border Number Uniqueness Check
    if (cleanBorder) {
      const dupBorder = existingDrivers.find(d => 
        d.id !== driver?.id && 
        d.borderNumber && 
        d.borderNumber.trim() === cleanBorder
      );
      if (dupBorder) {
        setError(`رقم الحدود (${cleanBorder}) مسجل مسبقاً للسائق: "${dupBorder.fullName}" ولا يمكن تكراره.`);
        return;
      }

      const crossDupIqama = existingDrivers.find(d => 
        d.id !== driver?.id && 
        d.iqamaNumber && 
        d.iqamaNumber.trim() === cleanBorder
      );
      if (crossDupIqama) {
        setError(`الرقم (${cleanBorder}) مسجل مسبقاً كرقم إقامة للسائق: "${crossDupIqama.fullName}".`);
        return;
      }
    }

    setLoading(true);
    setError(null);
    try {
      const nowIso = new Date().toISOString();
      // If status changed or not set yet, update statusUpdatedAt
      const statusChanged = !driver || driver.status !== formData.status;
      const statusUpdatedAt = statusChanged 
        ? nowIso 
        : (driver?.statusUpdatedAt || nowIso);

      // Auto resolve driverType: if iqama exists -> 'مقيم', if border exists and no iqama -> 'موسمي'
      const computedDriverType: DriverType = cleanIqama ? 'مقيم' : (cleanBorder ? 'موسمي' : formData.driverType);

      // Auto resolve classification: if active in monitoring (الرقابة والمتابعة) -> 'نقل عمال'
      const isMonitoringActive = isDriverActiveInMonitoring({ iqamaNumber: cleanIqama }, workers);
      const finalClassification = isMonitoringActive ? 'نقل عمال' : formData.driverClassification;

      await onSave({
        fullName: formData.fullName.trim(),
        driverType: computedDriverType,
        driverClassification: finalClassification,
        status: formData.status,
        statusUpdatedAt: statusUpdatedAt,
        statusReason: formData.statusReason.trim(),
        nationality: formData.nationality.trim(),
        iqamaNumber: cleanIqama,
        borderNumber: cleanBorder,
        mobileNumber: formData.mobileNumber.trim(),
        workplace: finalClassification,
        busNumber: formData.busNumber.trim(),
        notes: formData.notes.trim()
      });
      onClose();
    } catch (err: any) {
      setError(err?.message || 'حدث خطأ أثناء حفظ بيانات السائق');
    } finally {
      setLoading(false);
    }
  };

  const driverTypes: { type: DriverType; title: string; subtitle: string; color: string }[] = [
    { type: 'مقيم', title: 'مقيم', subtitle: 'إقامة نظامية سارية', color: 'emerald' },
    { type: 'مؤقت', title: 'مؤقت', subtitle: 'عقد لفترة محددة', color: 'amber' },
    { type: 'موسمي', title: 'موسمي', subtitle: 'مواسم الحج والعمرة', color: 'purple' },
  ];

  const driverStatuses: { status: DriverStatus; title: string; subtitle: string; color: string; badgeClass: string }[] = [
    { 
      status: 'نشط', 
      title: 'نشط', 
      subtitle: 'متاح للعمل وجاهز للرحلات والتشغيل', 
      color: 'emerald',
      badgeClass: 'text-emerald-700 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800'
    },
    { 
      status: 'في إجازة', 
      title: 'في إجازة', 
      subtitle: 'إجازة دورية أو سنوية أو مرضية مؤقتة', 
      color: 'amber',
      badgeClass: 'text-amber-700 bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800'
    },
    { 
      status: 'مستبعد', 
      title: 'مستبعد', 
      subtitle: 'مستبعد من التشغيل أو موقوف عن العمل', 
      color: 'rose',
      badgeClass: 'text-rose-700 bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800'
    },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/40 backdrop-blur-xs"
          />

          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
            dir="rtl"
          >
            {/* Header */}
            <div className="p-6 border-b border-border flex items-center justify-between bg-gradient-to-r from-blue-50/50 to-transparent dark:from-slate-800/40">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary shadow-2xs">
                  <User className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-lg font-black text-text-main leading-tight">
                      {driver ? `تعديل بيانات السائق ${driver.serialNumber ? `(#${driver.serialNumber})` : ''}` : 'إضافة سائق جديد لسائقي الشركة'}
                    </h3>
                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20">
                      {driver?.serialNumber ? `رقم متسلسل: #${driver.serialNumber}` : 'رقم متسلسل تلقائي (يبدأ من 1)'}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted font-bold mt-0.5">
                    سجل سائقي الشركة المعتمدين (مقيم - مؤقت - موسمي) مع ربط الحافلة والموقع
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="w-9 h-9 rounded-xl border border-border hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center justify-center text-text-muted hover:text-text-main transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-5 custom-scrollbar flex-1">
              {error && (
                <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 rounded-2xl text-red-600 dark:text-red-400 text-xs font-bold flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              {/* Driver Type / Legal Classification Selector */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-primary" />
                    <span>الصفة النظامية للسائق</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  <span className="text-[10px] text-text-muted font-bold">
                    (تحدد آلياً: مقيم للإقامة / موسمي للحدود)
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-2.5">
                  {driverTypes.map((item) => {
                    const isSelected = formData.driverType === item.type;
                    return (
                      <button
                        key={item.type}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, driverType: item.type }))}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? 'bg-primary/5 border-primary ring-2 ring-primary/20 shadow-xs'
                            : 'bg-background border-border hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 left-2 text-primary">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        <span className={`text-xs font-black block mb-0.5 ${
                          isSelected ? 'text-primary' : 'text-text-main'
                        }`}>
                          {item.title}
                        </span>
                        <span className="text-[10px] text-text-muted block font-medium">
                          {item.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Status Selector (نشط / في إجازة / مستبعد) with Last Update Tracking */}
              <div className="space-y-2 p-3.5 bg-slate-50/70 dark:bg-slate-800/40 border border-border/80 rounded-2xl">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <Activity className="w-4 h-4 text-emerald-600" />
                    <span>حالة السائق التشغيلية</span>
                    <span className="text-red-500 font-bold">*</span>
                  </label>
                  {driver?.statusUpdatedAt && (
                    <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-white dark:bg-slate-900 px-2 py-0.5 rounded-lg border border-border/60">
                      <Calendar className="w-3 h-3 text-primary" />
                      <span>آخر تحديث:</span>
                      <span className="font-mono text-slate-800 dark:text-slate-200">
                        {new Date(driver.statusUpdatedAt).toLocaleDateString('ar-SA', {
                          year: 'numeric',
                          month: 'numeric',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2.5">
                  {driverStatuses.map((item) => {
                    const isSelected = formData.status === item.status;
                    return (
                      <button
                        key={item.status}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, status: item.status }))}
                        className={`p-3 rounded-2xl border text-right transition-all cursor-pointer relative overflow-hidden ${
                          isSelected
                            ? `${item.badgeClass} ring-2 ring-primary/20 shadow-xs font-bold`
                            : 'bg-background border-border hover:border-slate-300 dark:hover:border-slate-700'
                        }`}
                      >
                        {isSelected && (
                          <div className="absolute top-2 left-2 text-primary">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        )}
                        <span className="text-xs font-black block mb-0.5">
                          {item.title}
                        </span>
                        <span className="text-[10px] text-text-muted block font-medium leading-tight line-clamp-1">
                          {item.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {formData.status !== 'نشط' && (
                  <div className="pt-2 mt-2 border-t border-border/60">
                    <label className="text-[11px] font-bold text-slate-600 dark:text-slate-300 block mb-1">
                      {formData.status === 'في إجازة' ? 'سبب الإجازة أو مدتها (اختياري)' : 'سبب الاستبعاد أو الإيقاف (اختياري)'}
                    </label>
                    <input
                      type="text"
                      placeholder={formData.status === 'في إجازة' ? 'مثال: إجازة سنوية لمدة 30 يوماً' : 'مثال: موقوف للمراجعة / غير لائق طبياً'}
                      value={formData.statusReason}
                      onChange={(e) => setFormData(prev => ({ ...prev, statusReason: e.target.value }))}
                      className="w-full px-3 py-2 bg-background border border-border focus:border-primary rounded-xl outline-none text-xs font-medium text-text-main transition-all"
                    />
                  </div>
                )}
              </div>

              {/* Driver Full Name */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                  <User className="w-4 h-4 text-primary" />
                  <span>اسم السائق الثلاثي</span>
                  <span className="text-red-500 font-bold">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: محمد أحمد السعيد"
                  value={formData.fullName}
                  onChange={(e) => setFormData(prev => ({ ...prev, fullName: e.target.value }))}
                  className="w-full px-4 py-3 bg-background border border-border focus:border-primary rounded-2xl outline-none text-sm font-bold text-text-main shadow-2xs transition-all"
                />
              </div>

              {/* Nationality & Mobile */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <Globe className="w-4 h-4 text-primary" />
                    <span>الجنسية</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="nationalities-list"
                      placeholder="اختر أو اكتب الجنسية..."
                      value={formData.nationality}
                      onChange={(e) => setFormData(prev => ({ ...prev, nationality: e.target.value }))}
                      className="w-full px-4 py-3 bg-background border border-border focus:border-primary rounded-2xl outline-none text-sm font-bold text-text-main shadow-2xs transition-all"
                    />
                    <datalist id="nationalities-list">
                      {COMMON_NATIONALITIES.map(nat => (
                        <option key={nat} value={nat} />
                      ))}
                    </datalist>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <Phone className="w-4 h-4 text-primary" />
                    <span>رقم الموبايل</span>
                  </label>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="05XXXXXXXX"
                    value={formData.mobileNumber}
                    onChange={(e) => setFormData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                    className="w-full px-4 py-3 bg-background border border-border focus:border-primary rounded-2xl outline-none text-sm font-bold text-text-main shadow-2xs transition-all text-right font-mono"
                  />
                </div>
              </div>

              {/* Iqama Number & Border Number (Strict Non-duplicate check) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                      <IdCard className="w-4 h-4 text-primary" />
                      <span>رقم الإقامة</span>
                    </label>
                    <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-50 dark:bg-emerald-950/40 px-1.5 py-0.5 rounded">
                      يصنف "مقيم" تلقائياً
                    </span>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="2XXXXXXXXX"
                    value={formData.iqamaNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      const inMonitoring = isDriverActiveInMonitoring({ iqamaNumber: val }, workers);
                      setFormData(prev => ({
                        ...prev,
                        iqamaNumber: val,
                        driverType: val.trim() ? 'مقيم' : (prev.borderNumber.trim() ? 'موسمي' : prev.driverType),
                        driverClassification: inMonitoring ? 'نقل عمال' : prev.driverClassification,
                        workplace: inMonitoring ? 'نقل عمال' : prev.workplace
                      }));
                    }}
                    className="w-full px-4 py-3 bg-background border border-border focus:border-primary rounded-2xl outline-none text-sm font-bold text-text-main shadow-2xs transition-all text-right font-mono"
                  />
                  <span className="text-[10px] text-text-muted font-bold mr-1 block">عند تسجيل رقم الإقامة يصبح السائق "مقيم"</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-primary" />
                      <span>رقم الحدود</span>
                    </label>
                    <span className="text-[10px] text-amber-600 dark:text-amber-400 font-bold bg-amber-50 dark:bg-amber-950/40 px-1.5 py-0.5 rounded">
                      يصنف "موسمي" تلقائياً
                    </span>
                  </div>
                  <input
                    type="text"
                    dir="ltr"
                    placeholder="3XXXXXXXXX"
                    value={formData.borderNumber}
                    onChange={(e) => {
                      const val = e.target.value;
                      setFormData(prev => ({
                        ...prev,
                        borderNumber: val,
                        driverType: prev.iqamaNumber.trim() ? 'مقيم' : (val.trim() ? 'موسمي' : prev.driverType)
                      }));
                    }}
                    className="w-full px-4 py-3 bg-background border border-border focus:border-primary rounded-2xl outline-none text-sm font-bold text-text-main shadow-2xs transition-all text-right font-mono"
                  />
                  <span className="text-[10px] text-text-muted font-bold mr-1 block">عند تسجيل رقم الحدود بدون إقامة يصبح السائق "موسمي"</span>
                </div>
              </div>

              {/* Replaced Workplace with Driver Classification (نقل عمال / عمرة) & Bus Number */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                      <Briefcase className="w-4 h-4 text-primary" />
                      <span>تصنيف السائق</span>
                      <span className="text-red-500 font-bold">*</span>
                    </label>
                    <span className="text-[10px] text-text-muted font-bold">
                      (نقل عمال / عمرة)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, driverClassification: 'نقل عمال', workplace: 'نقل عمال' }))}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 font-bold text-xs ${
                        formData.driverClassification === 'نقل عمال'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-500 text-emerald-800 dark:text-emerald-200 ring-2 ring-emerald-500/20 shadow-xs'
                          : 'bg-background border-border hover:border-slate-300 dark:hover:border-slate-700 text-text-muted'
                      }`}
                    >
                      <Bus className="w-4 h-4 text-emerald-600" />
                      <span>نقل عمال</span>
                      {formData.driverClassification === 'نقل عمال' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, driverClassification: 'عمرة', workplace: 'عمرة' }))}
                      className={`p-3 rounded-2xl border text-center transition-all cursor-pointer flex items-center justify-center gap-2 font-bold text-xs ${
                        formData.driverClassification === 'عمرة'
                          ? 'bg-amber-50 dark:bg-amber-950/50 border-amber-500 text-amber-800 dark:text-amber-200 ring-2 ring-amber-500/20 shadow-xs'
                          : 'bg-background border-border hover:border-slate-300 dark:hover:border-slate-700 text-text-muted'
                      }`}
                    >
                      <span className="text-base leading-none">🕌</span>
                      <span>عمرة</span>
                      {formData.driverClassification === 'عمرة' && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-600" />
                      )}
                    </button>
                  </div>

                  {/* Active monitoring notice if applicable */}
                  {(() => {
                    const matchedWorker = getMatchingActiveMonitoringWorker({ iqamaNumber: formData.iqamaNumber }, workers);
                    return matchedWorker ? (
                      <div className="p-2.5 rounded-xl bg-cyan-50 dark:bg-cyan-950/40 border border-cyan-200 dark:border-cyan-800 text-[11px] text-cyan-800 dark:text-cyan-200 flex items-center gap-2 font-bold mt-2">
                        <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0" />
                        <span>تم التصنيف تلقائياً «نقل عمال» لتطابق السائق مع سجل نشط بالرقابة والمتابعة ({matchedWorker.name} - {matchedWorker.clientName || matchedWorker.workplace || 'نشط'})</span>
                      </div>
                    ) : null;
                  })()}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                    <Bus className="w-4 h-4 text-primary" />
                    <span>رقم الحافلة</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      list="buses-list"
                      placeholder="مثال: 101 أو اختر من أسطول الحافلات..."
                      value={formData.busNumber}
                      onChange={(e) => setFormData(prev => ({ ...prev, busNumber: e.target.value }))}
                      className="w-full px-4 py-3 bg-background border border-border focus:border-primary rounded-2xl outline-none text-sm font-bold text-text-main shadow-2xs transition-all font-mono"
                    />
                    <datalist id="buses-list">
                      {buses.map(b => (
                        <option 
                          key={b.id} 
                          value={b.operationalNumber} 
                          label={`لوحة: ${b.plateNumber} | ${b.model || ''}`} 
                        />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <label className="text-xs font-black text-text-main flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-primary" />
                  <span>ملاحظات إضافية</span>
                </label>
                <textarea
                  rows={2}
                  placeholder="أي ملاحظات حول السائق أو رخصة القيادة أو الخبرة..."
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-3 bg-background border border-border focus:border-primary rounded-2xl outline-none text-sm font-medium text-text-main shadow-2xs transition-all resize-none"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-border flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-5 py-2.5 rounded-2xl border border-border text-xs font-black text-text-muted hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="soft-btn-primary px-7 py-2.5 text-xs font-black flex items-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {loading ? (
                    <span>جاري الحفظ...</span>
                  ) : (
                    <span>{driver ? 'حفظ التعديلات' : 'إضافة السائق'}</span>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
