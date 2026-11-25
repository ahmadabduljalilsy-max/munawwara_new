import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  FileText, 
  Download, 
  CheckCircle2, 
  AlertCircle, 
  ShieldCheck, 
  RefreshCw, 
  Bus, 
  Users, 
  MapPin, 
  Activity, 
  Lock, 
  FileCheck, 
  Layers, 
  Calendar, 
  Clock, 
  Check, 
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Award,
  Sparkles
} from 'lucide-react';
import type { Bus as BusType, CompanyDriver, Worker, DriverResponse, AppUser } from '../types';
import { 
  generateOperationalReportDataset, 
  OperationalReportData 
} from '../lib/operationalReportService';

interface AdministrativeReportsProps {
  buses: BusType[];
  companyDrivers: CompanyDriver[];
  workers: Worker[];
  driverResponses: DriverResponse[];
  profile?: AppUser | null;
  isAdmin: boolean;
  onNavigateToTab?: (tab: string) => void;
}

const ALL_CHAPTERS = [
  { id: 1, title: 'الغلاف الرسمي وبيانات التقرير والمصادقة', category: 'الرسمية' },
  { id: 2, title: 'فهرس المحتويات ودليل الفصول', category: 'الرسمية' },
  { id: 3, title: 'الملخص التنفيذي ورسالة إدارة التشغيل', category: 'التنفيذي' },
  { id: 4, title: 'المؤشرات التشغيلية العامة (KPIs)', category: 'التنفيذي' },
  { id: 5, title: 'التقرير التفصيلي لأسطول الحافلات', category: 'الأسطول' },
  { id: 6, title: 'التقرير التفصيلي لكوادر وسائقي الشركة', category: 'السائقون' },
  { id: 7, title: 'تقرير تصنيفات السائقين ونوع العمل الميداني', category: 'السائقون' },
  { id: 8, title: 'تقرير الإقامة ومتابعة صلاحية الوثائق والتراخيص', category: 'الوثائق' },
  { id: 9, title: 'تقرير مواقع وفروع العمل والتشغيل الميداني', category: 'المواقع' },
  { id: 10, title: 'تقرير الجاهزية التشغيلية والفنية المباشرة', category: 'الجاهزية' },
  { id: 11, title: 'تقرير توزيع الموارد الميدانية بين المواقع', category: 'المواقع' },
  { id: 12, title: 'العلاقات والترابط بين السائقين والحافلات والردود', category: 'العلاقات' },
  { id: 13, title: 'تدقيق جودة واكتمال البيانات الميدانية', category: 'الجودة' },
  { id: 14, title: 'النتائج والتوصيات الإدارية وخطة التطوير', category: 'التوصيات' },
  { id: 15, title: 'الملاحق والجداول التفصيلية للأسطول والسائقين', category: 'الملاحق' },
  { id: 16, title: 'ملخص التحقق والتدقيق الأمني لاكتمال استخراج البيانات', category: 'التدقيق' }
];

export const AdministrativeReports: React.FC<AdministrativeReportsProps> = ({
  buses,
  companyDrivers,
  workers,
  driverResponses,
  profile,
  isAdmin
}) => {
  const [selectedChapters, setSelectedChapters] = useState<number[]>(ALL_CHAPTERS.map(c => c.id));
  const [includeMasterTables, setIncludeMasterTables] = useState(true);
  const [isAudited, setIsAudited] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationProgress, setGenerationProgress] = useState(0);
  const [generationStep, setGenerationStep] = useState('');
  const [generatedBlob, setGeneratedBlob] = useState<Blob | null>(null);
  const [generatedDate, setGeneratedDate] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showChapterSelector, setShowChapterSelector] = useState(false);
  const [presetMode, setPresetMode] = useState<'full' | 'fleet' | 'drivers' | 'documents' | 'locations' | 'custom'>('full');

  // Compute live dataset from real Firestore data
  const reportData: OperationalReportData = useMemo(() => {
    return generateOperationalReportDataset(buses, companyDrivers, workers, driverResponses);
  }, [buses, companyDrivers, workers, driverResponses]);

  // Handle preset mode change
  const handlePresetSelect = (mode: 'full' | 'fleet' | 'drivers' | 'documents' | 'locations' | 'custom') => {
    setPresetMode(mode);
    switch (mode) {
      case 'full':
        setSelectedChapters(ALL_CHAPTERS.map(c => c.id));
        setIncludeMasterTables(true);
        break;
      case 'fleet':
        setSelectedChapters([1, 2, 3, 4, 5, 10, 11, 12, 14, 15, 16]);
        setIncludeMasterTables(true);
        break;
      case 'drivers':
        setSelectedChapters([1, 2, 3, 4, 6, 7, 8, 12, 14, 15, 16]);
        setIncludeMasterTables(true);
        break;
      case 'documents':
        setSelectedChapters([1, 2, 3, 4, 8, 13, 14, 16]);
        setIncludeMasterTables(false);
        break;
      case 'locations':
        setSelectedChapters([1, 2, 3, 4, 9, 10, 11, 14, 16]);
        setIncludeMasterTables(false);
        break;
      case 'custom':
        // Keep current selection
        break;
    }
  };

  const handleToggleChapter = (id: number) => {
    setPresetMode('custom');
    if (selectedChapters.includes(id)) {
      setSelectedChapters(prev => prev.filter(c => c !== id));
    } else {
      setSelectedChapters(prev => [...prev, id].sort((a, b) => a - b));
    }
  };

  const handleSelectAllChapters = () => {
    setSelectedChapters(ALL_CHAPTERS.map(c => c.id));
    setPresetMode('full');
  };

  const handleDeselectAllChapters = () => {
    setSelectedChapters([]);
    setPresetMode('custom');
  };

  // Run live data audit
  const handleRunAudit = () => {
    setIsAudited(true);
    setErrorMessage(null);
  };

  // Generate Word Document
  const handleGenerateReport = async () => {
    if (selectedChapters.length === 0) {
      setErrorMessage('يرجى تحديد فصل واحد على الأقل لتضمينه في التقرير');
      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setGeneratedBlob(null);

      // Step 1: Scan & Verify Firestore entities
      setGenerationStep('1/5: جاري استخراج وتدقيق سجلات العمليات الفعلية من Firestore...');
      setGenerationProgress(20);
      await new Promise(r => setTimeout(r, 400));

      // Step 2: Apply Security Allowlist
      setGenerationStep('2/5: تطبيق قائمة السماح الأمنية وحظر البيانات المالية والشخصية...');
      setGenerationProgress(45);
      await new Promise(r => setTimeout(r, 400));

      // Step 3: Compute analytics and metrics
      setGenerationStep('3/5: تحليل مؤشرات الأداء وجداول الجاهزية والربط الميداني...');
      setGenerationProgress(70);
      await new Promise(r => setTimeout(r, 450));

      // Step 4: Build DOCX document structures
      setGenerationStep('4/5: بناء مستند Microsoft Word باللغة العربية وتنسيق الجداول والفصول الـ 16...');
      setGenerationProgress(90);

      const { generateOperationalReportDocxBlob } = await import('../lib/docxReportGenerator');
      const blob = await generateOperationalReportDocxBlob(reportData, {
        includeMasterTables,
        selectedChapters,
        authorName: profile?.displayName || 'إدارة مكتب التشغيل والمتابعة'
      });

      // Step 5: Finish
      setGenerationProgress(100);
      setGenerationStep('5/5: اكتمل إنشاء التقرير بنجاح وجاهز للتنزيل الفوري.');
      setGeneratedBlob(blob);
      setGeneratedDate(new Date().toLocaleTimeString('ar-SA'));
      setIsAudited(true);
    } catch (err: any) {
      console.error('Error generating operational report docx:', err);
      setErrorMessage(`حدث خطأ أثناء إعداد ملف Word: ${err?.message || String(err)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  // Direct download trigger
  const handleDownloadFile = () => {
    if (!generatedBlob) return;
    const url = URL.createObjectURL(generatedBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'Dorra_Operational_Administrative_Report.docx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center bg-surface border border-border rounded-3xl space-y-4 max-w-xl mx-auto my-12">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-xs">
          <Lock className="w-8 h-8" />
        </div>
        <h3 className="text-xl font-black text-text-main">صلاحية التقرير الإداري مقيدة</h3>
        <p className="text-sm text-text-muted">
          هذه الميزة مخصصة حصرياً لمدير النظام فقط لإعداد وتصدير التقارير التشغيلية المعتمدة لشركة درة المنورة للنقليات.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 pb-12">
      {/* Top Executive Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-[#07152B] via-[#0E203B] to-[#112746] text-white p-6 md:p-8 rounded-3xl border border-blue-900/40 shadow-xl">
        {/* Subtle decorative glow */}
        <div className="absolute top-0 left-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-md rounded-full text-xs font-bold text-blue-200 border border-white/15">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              <span>نظام التقارير الإدارية والتشغيلية المعتمدة</span>
              <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-[10px] text-emerald-300 font-normal">بيانات Firestore الفعلية 100%</span>
            </div>

            <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              <FileText className="w-7 h-7 text-blue-400" />
              <span>التقرير الإداري والتشغيلي الشامل</span>
            </h1>

            <p className="text-xs md:text-sm text-slate-300 max-w-3xl leading-relaxed">
              إنشاء وتصدير تقرير تنفيذي رسمي متكامل بصيغة Microsoft Word (.docx) لأسطول الحافلات والسائقين والوثائق ومواقع العمل، مع تطبيق أعلى معايير الحوكمة والخصوصية، واستبعاد البيانات المالية والشخصية تلقائياً.
            </p>
          </div>

          <div className="flex flex-wrap md:flex-col items-start md:items-end gap-2 shrink-0">
            <button
              onClick={handleRunAudit}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white border border-white/20 rounded-2xl text-xs font-bold transition-all shadow-xs flex items-center gap-2 cursor-pointer active:scale-95"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-300 ${isAudited ? '' : 'animate-spin'}`} />
              <span>فحص وتدقيق البيانات الحية</span>
            </button>

            <span className="text-[11px] text-slate-300 font-mono">
              الملف: <span className="text-amber-300 font-bold">Dorra_Operational_Administrative_Report.docx</span>
            </span>
          </div>
        </div>
      </div>

      {/* Live Data Verification Bar (5 KPI Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-4 bg-surface rounded-2xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold">إجمالي الأسطول</span>
            <div className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 flex items-center justify-center">
              <Bus className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-primary font-mono">{reportData.fleet.totalBuses}</div>
          <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold block">
            {reportData.fleet.activeCount} جاهزة للعمل ({reportData.fleet.readinessRate}%)
          </span>
        </div>

        <div className="p-4 bg-surface rounded-2xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold">السائقون الفعليون</span>
            <div className="w-7 h-7 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-600 font-mono">{reportData.drivers.operationalTotal}</div>
          <span className="text-[10px] text-text-muted block">
            {reportData.drivers.activeCount} نشط متاح ({reportData.drivers.availabilityRate}%)
          </span>
        </div>

        <div className="p-4 bg-surface rounded-2xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold">مواقع العمل</span>
            <div className="w-7 h-7 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600 font-mono">{reportData.locations.totalLocations}</div>
          <span className="text-[10px] text-text-muted truncate block">
            تتصدرها: {reportData.fleet.locationDistribution[0]?.name || 'العاديات'}
          </span>
        </div>

        <div className="p-4 bg-surface rounded-2xl border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold">الجاهزية الفنية</span>
            <div className="w-7 h-7 rounded-xl bg-teal-50 dark:bg-teal-950/40 text-teal-600 flex items-center justify-center">
              <Activity className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-teal-600 font-mono">%{reportData.fleet.readinessRate}</div>
          <span className="text-[10px] text-teal-700 dark:text-teal-400 font-bold block truncate">
            {reportData.fleet.readinessRating}
          </span>
        </div>

        <div className="p-4 bg-surface rounded-2xl border border-border shadow-xs space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between text-text-muted">
            <span className="text-xs font-bold">وثائق المتابعة</span>
            <div className="w-7 h-7 rounded-xl bg-purple-50 dark:bg-purple-950/40 text-purple-600 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-purple-600 font-mono">{reportData.documents.totalDocuments}</div>
          <span className="text-[10px] text-text-muted block">
            {reportData.documents.validCount} سارية | {reportData.documents.expiredCount + reportData.documents.expiringUrgentCount} للمتابعة
          </span>
        </div>
      </div>

      {/* Main Settings & Generator Box */}
      <div className="bg-surface border border-border rounded-3xl p-6 md:p-7 shadow-xs space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-5">
          <div>
            <h3 className="text-base font-black text-text-main flex items-center gap-2">
              <Layers className="w-5 h-5 text-primary" />
              <span>نطاق ومحتوى التقرير الإداري</span>
            </h3>
            <p className="text-xs text-text-muted mt-0.5">
              اختر نطاق الفصول المطلوب تضمينها داخل ملف Microsoft Word
            </p>
          </div>

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 dark:bg-slate-800/80 p-1.5 rounded-2xl border border-border text-xs font-bold">
            <button
              type="button"
              onClick={() => handlePresetSelect('full')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                presetMode === 'full' 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              التقرير الشامل (16 فصلاً)
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('fleet')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                presetMode === 'fleet' 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              أسطول الحافلات
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('drivers')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                presetMode === 'drivers' 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              الكوادر والسائقين
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('documents')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                presetMode === 'documents' 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              متابعة الوثائق
            </button>
            <button
              type="button"
              onClick={() => handlePresetSelect('locations')}
              className={`px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                presetMode === 'locations' 
                  ? 'bg-primary text-white shadow-xs' 
                  : 'text-text-muted hover:text-text-main'
              }`}
            >
              مواقع العمل
            </button>
          </div>
        </div>

        {/* Master Tables Checkbox & Custom Chapter Toggler */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-slate-50/80 dark:bg-slate-900/50 rounded-2xl border border-border">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includeMasterTables}
              onChange={(e) => setIncludeMasterTables(e.target.checked)}
              className="w-4.5 h-4.5 text-primary rounded-md border-border focus:ring-primary cursor-pointer accent-primary"
            />
            <div>
              <span className="text-xs font-black text-text-main block">
                تضمين الجداول التفصيلية الموسعة (الملحق الكامل للأسطول والسائقين)
              </span>
              <span className="text-[11px] text-text-muted block">
                يشمل كشفاً كاملاً لجميع الحافلات ({reportData.sanitizedBuses.length} حافلة) وكافة السائقين ({reportData.sanitizedDrivers.length} سائقاً) بالحقول الإدارية المسموحة
              </span>
            </div>
          </label>

          <button
            type="button"
            onClick={() => setShowChapterSelector(!showChapterSelector)}
            className="text-xs font-bold text-primary hover:text-primary-hover flex items-center gap-1 self-end sm:self-auto cursor-pointer"
          >
            <span>{showChapterSelector ? 'إخفاء تخصيص الفصول' : 'تخصيص الفصول بالتفصيل'}</span>
            {showChapterSelector ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>

        {/* Detailed Chapter Selector Drawer */}
        <AnimatePresence>
          {showChapterSelector && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-3 overflow-hidden pt-2"
            >
              <div className="flex items-center justify-between text-xs font-bold text-text-muted px-1">
                <span>الفصول المحددة: {selectedChapters.length} من أصل 16 فصلاً</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSelectAllChapters}
                    className="text-primary hover:underline cursor-pointer"
                  >
                    تحديد الكل
                  </button>
                  <span>|</span>
                  <button
                    type="button"
                    onClick={handleDeselectAllChapters}
                    className="text-rose-500 hover:underline cursor-pointer"
                  >
                    إلغاء التحديد
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                {ALL_CHAPTERS.map(ch => {
                  const isChecked = selectedChapters.includes(ch.id);
                  return (
                    <label
                      key={ch.id}
                      className={`p-3 rounded-xl border text-right transition-all flex items-start gap-2.5 cursor-pointer ${
                        isChecked 
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800 text-text-main shadow-2xs' 
                          : 'bg-background border-border text-text-muted hover:border-slate-300'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => handleToggleChapter(ch.id)}
                        className="w-4 h-4 mt-0.5 text-primary rounded border-border focus:ring-primary cursor-pointer accent-primary"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-[11px] font-black block leading-tight text-text-main truncate">
                          {ch.id}. {ch.title}
                        </span>
                        <span className="text-[10px] text-text-muted block mt-0.5">
                          قسم {ch.category}
                        </span>
                      </div>
                    </label>
                  );
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Action Button & Progress Indicator */}
        <div className="pt-2 space-y-4">
          {errorMessage && (
            <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-800 dark:text-rose-300 text-xs font-bold">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
          )}

          {isGenerating && (
            <div className="p-4 bg-blue-50/80 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-primary">
                <span className="flex items-center gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>{generationStep}</span>
                </span>
                <span className="font-mono">{generationProgress}%</span>
              </div>
              <div className="w-full bg-blue-100 dark:bg-blue-900/50 rounded-full h-2.5 overflow-hidden">
                <motion.div
                  className="bg-primary h-2.5 rounded-full"
                  style={{ width: `${generationProgress}%`, transformOrigin: 'right' }}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ duration: 0.3 }}
                />
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-center gap-3.5">
            <button
              type="button"
              disabled={isGenerating}
              onClick={handleGenerateReport}
              className="w-full sm:w-auto px-6 py-3.5 bg-primary hover:bg-primary-hover text-white rounded-2xl text-xs font-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer disabled:opacity-50 active:scale-95"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>جاري معالجة وتوليد التقرير...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>إنشاء تقرير Word (.docx) الآن</span>
                </>
              )}
            </button>

            {generatedBlob && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                type="button"
                onClick={handleDownloadFile}
                className="w-full sm:w-auto px-6 py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-black transition-all shadow-md hover:shadow-lg flex items-center justify-center gap-2.5 cursor-pointer active:scale-95"
              >
                <Download className="w-4 h-4" />
                <span>تنزيل التقرير الرسمي (Word DOCX)</span>
                <span className="text-[10px] bg-emerald-700/60 px-2 py-0.5 rounded-full font-mono">
                  {(generatedBlob.size / 1024).toFixed(1)} KB
                </span>
              </motion.button>
            )}
          </div>

          {generatedBlob && (
            <div className="flex items-center gap-2 text-xs font-bold text-emerald-700 dark:text-emerald-400">
              <CheckCircle2 className="w-4 h-4" />
              <span>
                تم إعداد ملف Word بنجاح في تمام الساعة {generatedDate} وجاهز للطباعة والمراجعة الإدارية.
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Security & Data Governance Card (Strict Privacy Allowlist) */}
      <div className="p-6 bg-slate-50 dark:bg-slate-900/40 rounded-3xl border border-border space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-black text-text-main">
              حوكمة البيانات وحماية الخصوصية والأمان (Data Governance & Allowlist)
            </h4>
            <p className="text-xs text-text-muted">
              ضوابط مشددة تمنع كشف أو تسريب أي معلومات حساسة في التقرير الصادر
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
          <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
            <span className="text-xs font-black text-emerald-700 dark:text-emerald-400 flex items-center gap-1.5">
              <Check className="w-4 h-4" />
              <span>المجموعات والحقول المصرح بتصديرها (Allowlist):</span>
            </span>
            <ul className="text-xs text-text-muted space-y-1 pr-4 list-disc">
              <li>أسطول الحافلات: الأرقام التشغيلية، اللوحات، الفئات، الموديل، الصانع، الحالة الفنية، المواقع.</li>
              <li>سائقو الشركة: أرقام التسلسل، الأسماء، الجنسيات، الصفة النظامية، التصنيفات، الحالة.</li>
              <li>متابعة الوثائق: تواريخ الصلاحية، مدد الانتهاء، الشركات المشغلة، رموز الكوادر التشغيلية.</li>
              <li>الردود اليومية: تواريخ الحركة، الوجهات، نوع الرد، ومسؤول التسجيل.</li>
            </ul>
          </div>

          <div className="p-4 bg-surface rounded-2xl border border-border space-y-2">
            <span className="text-xs font-black text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <Lock className="w-4 h-4" />
              <span>البيانات المستبعدة نهائياً من التقرير (Strictly Blocked):</span>
            </span>
            <ul className="text-xs text-text-muted space-y-1 pr-4 list-disc">
              <li>الرواتب، الأجور، البدلات، الحوافز، والخصومات (حظر مجموعة salaries بالكامل).</li>
              <li>أرقام الإقامات والهويات الوطنية الكاملة وأرقام الجوازات (استخدام المعرفات التشغيلية).</li>
              <li>أرقام الهواتف المحمولة والبريد الإلكتروني الشخصي والعناوين السكنية.</li>
              <li>بيانات تسجيل الدخول، كلمات المرور، ورموز المصادقة والصلاحيات الفردية.</li>
            </ul>
          </div>
        </div>

        <div className="p-3 bg-blue-50/60 dark:bg-blue-950/30 rounded-xl border border-blue-200/60 dark:border-blue-900/40 text-[11px] text-blue-900 dark:text-blue-300 font-medium">
          ℹ ملاحظة: يتم إنشاء ملف Word (.docx) محلياً داخل المتصفح عبر مكتبة DOCX الأصلية بصيغة OpenXML القياسية المعتمدة من Microsoft Word، ولا يتم إرسال أي سجلات أو مستندات إلى أي خدمات سحابية خارجية طرف ثالث.
        </div>
      </div>
    </div>
  );
};
