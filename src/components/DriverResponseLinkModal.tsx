import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  X, 
  Copy, 
  Check, 
  ExternalLink, 
  Share2, 
  FileSpreadsheet, 
  Download, 
  Link2, 
  Sparkles, 
  Code, 
  CheckCircle2, 
  AlertCircle, 
  Send,
  MessageSquare,
  Globe,
  RefreshCw,
  Hash,
  MapPin,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { DriverResponse, CompanyDriver } from '../types';
import { 
  getGoogleSheetSettings, 
  saveGoogleSheetSettings, 
  syncResponseToGoogleSheet, 
  getGoogleAppsScriptTemplate,
  fetchAndSyncGoogleSheetResponses
} from '../lib/googleSheetService';
import { 
  exportDriverResponsesToExcel, 
  copyDriverResponsesToGoogleSheetsClipboard 
} from '../lib/excelService';

interface DriverResponseLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  driverResponses: DriverResponse[];
  drivers: CompanyDriver[];
  onOpenPublicPageDirectly?: () => void;
}

export const DriverResponseLinkModal: React.FC<DriverResponseLinkModalProps> = ({
  isOpen,
  onClose,
  driverResponses,
  drivers,
  onOpenPublicPageDirectly
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedScript, setCopiedScript] = useState(false);
  const [copiedTsv, setCopiedTsv] = useState(false);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sheetUrl, setSheetUrl] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isTestingWebhook, setIsTestingWebhook] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isPullingSheet, setIsPullingSheet] = useState(false);
  const [pullResult, setPullResult] = useState<{ added: number; error?: string } | null>(null);
  const [showScriptDetails, setShowScriptDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'link' | 'sheets' | 'responses'>('link');

  const publicLink = `${window.location.origin}${window.location.pathname}?action=driver-response`;

  // Load existing Google Sheet settings
  useEffect(() => {
    if (isOpen) {
      getGoogleSheetSettings().then(settings => {
        setWebhookUrl(settings.webhookUrl || '');
        setSheetUrl(settings.sheetUrl || '');
      });
      setTestResult(null);
      setSaveSuccess(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyPublicLink = () => {
    navigator.clipboard.writeText(publicLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleOpenLinkInNewTab = () => {
    window.open(publicLink, '_blank');
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(
      `السلام عليكم ورحمة الله وبركاته\nكباتن وسائقي الشركة الكرام،\nيرجى الدخول على الرابط التالي لتسجيل الرد وحركة الحافلة وتحديد الوجهة:\n${publicLink}\n(الرابط يعمل مباشرة بدون الحاجة لاسم مستخدم أو كلمة مرور)`
    );
    window.open(`https://api.whatsapp.com/send?text=${text}`, '_blank');
  };

  const handleSaveSettings = async () => {
    try {
      setIsSavingSettings(true);
      await saveGoogleSheetSettings({
        webhookUrl: webhookUrl.trim(),
        sheetUrl: sheetUrl.trim(),
        enabled: Boolean(webhookUrl.trim())
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert('حدث خطأ أثناء حفظ إعدادات غوغل شيت: ' + (err?.message || err));
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleTestWebhook = async () => {
    if (!webhookUrl.trim()) {
      alert('يرجى كتابة رابط ويب هوك غوغل شيت أولاً');
      return;
    }
    try {
      setIsTestingWebhook(true);
      setTestResult(null);
      const res = await syncResponseToGoogleSheet(webhookUrl, {
        driverSerialNumber: 999,
        driverName: 'تجربة اتصال النظام',
        busNumber: '000',
        responseType: 'محايل عسير',
        notes: 'سجل اختبار للربط مع Google Sheets',
        createdDate: new Date().toLocaleString('ar-SA')
      });
      if (res.success) {
        setTestResult({
          success: true,
          message: 'تم إرسال سجل الاختبار إلى جدول غوغل شيت بنجاح! تفقد جدولك للتأكد.'
        });
      } else {
        setTestResult({
          success: false,
          message: res.message || 'فشل الاتصال برابط الويب هوك. يرجى التأكد من نشر السكربت كـ Web App مع إتاحة الوصول لـ Anyone.'
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err?.message || 'حدث خطأ أثناء اختبار الاتصال.'
      });
    } finally {
      setIsTestingWebhook(false);
    }
  };

  const handleSyncFromGoogleSheet = async () => {
    if (!sheetUrl.trim()) {
      alert('يرجى إدخال رابط جدول Google Sheet أولاً في خانة الرابط.');
      return;
    }
    try {
      setIsPullingSheet(true);
      setPullResult(null);
      const res = await fetchAndSyncGoogleSheetResponses(sheetUrl.trim(), driverResponses, drivers);
      setPullResult(res);
      if (res.added > 0) {
        alert(`تمت المزامنة بنجاح! تم سحب وإضافة ${res.added} رد جديد من Google Sheet وربطها بالسائقين في الموقع تلقائياً.`);
      } else if (!res.error) {
        alert('تم فحص جدول Google Sheet بنجاح: لا توجد ردود جديدة غير مسجلة حالياً.');
      }
    } catch (err: any) {
      setPullResult({ added: 0, error: err?.message || 'حدث خطأ أثناء مزامنة الجدول.' });
    } finally {
      setIsPullingSheet(false);
    }
  };

  const handleCopyScript = () => {
    navigator.clipboard.writeText(getGoogleAppsScriptTemplate());
    setCopiedScript(true);
    setTimeout(() => setCopiedScript(false), 2500);
  };

  const handleCopyTsvToGoogleSheets = () => {
    if (driverResponses.length === 0) {
      alert('لا توجد ردود مسجلة بعد لنسخها.');
      return;
    }
    const success = copyDriverResponsesToGoogleSheetsClipboard(driverResponses, drivers);
    if (success) {
      setCopiedTsv(true);
      setTimeout(() => setCopiedTsv(false), 2500);
    }
  };

  const handleExportExcel = () => {
    if (driverResponses.length === 0) {
      alert('لا توجد ردود مسجلة بعد لتصديرها.');
      return;
    }
    exportDriverResponsesToExcel(driverResponses, 'ردود_السائقين_درة_المنورة.xlsx', drivers);
  };

  // Stats on destinations
  const destStats = {
    total: driverResponses.length,
    mahayil: driverResponses.filter(r => r.responseType === 'محايل عسير').length,
    yanbu: driverResponses.filter(r => r.responseType === 'ينبع').length,
    qassim: driverResponses.filter(r => r.responseType === 'القصيم').length,
    riyadh: driverResponses.filter(r => r.responseType === 'الرياض').length,
    shuttle: driverResponses.filter(r => r.responseType === 'الترددية').length
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 overflow-y-auto" dir="rtl">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 15 }}
        className="relative w-full max-w-2xl bg-surface border border-border rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] z-10 my-auto"
      >
        {/* Header */}
        <div className="p-5 border-b border-border bg-gradient-to-r from-emerald-600/10 via-teal-600/5 to-transparent flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shadow-md shadow-emerald-600/20">
              <Link2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-black text-slate-900 dark:text-white">
                رابط تسجيل الرد والربط بـ Google Sheets
              </h3>
              <p className="text-xs text-text-muted">
                إدارة رابط استجابات السائقين والمزامنة الفورية مع جداول غوغل
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-text-muted hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border bg-slate-50 dark:bg-slate-900/40 p-1.5 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('link')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'link'
                ? 'bg-surface text-primary shadow-xs border border-border font-black'
                : 'text-text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Globe className="w-4 h-4" />
            <span>رابط السائقين المباشر</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('sheets')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'sheets'
                ? 'bg-surface text-emerald-600 shadow-xs border border-border font-black'
                : 'text-text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>الربط مع Google Sheets</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('responses')}
            className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 cursor-pointer ${
              activeTab === 'responses'
                ? 'bg-surface text-purple-600 shadow-xs border border-border font-black'
                : 'text-text-muted hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MapPin className="w-4 h-4" />
            <span>سجل الردود ({destStats.total})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-5 text-right flex-1">
          {/* TAB 1: Public Driver Link */}
          {activeTab === 'link' && (
            <div className="space-y-4">
              {/* Direct Open Button - Primary Action */}
              <div className="p-4 bg-gradient-to-r from-emerald-600/10 via-teal-600/10 to-transparent border border-emerald-500/30 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-black text-slate-900 dark:text-white flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600" />
                    <span>الدخول على الرابط وتعبئة البيانات الآن</span>
                  </h4>
                  <p className="text-xs text-text-muted mt-0.5">
                    افتح الرابط مباشرة داخل الموقع لتسجيل الرد وحركة السائق فوراً
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    if (onOpenPublicPageDirectly) {
                      onOpenPublicPageDirectly();
                    } else {
                      window.location.hash = 'driver-response';
                    }
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-black text-xs rounded-xl shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                >
                  <Send className="w-4 h-4" />
                  <span>فتح الرابط والتسجيل الآن</span>
                </button>
              </div>

              {/* Notice Box */}
              <div className="p-4 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-2xl flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 dark:text-emerald-200 space-y-1">
                  <p className="font-black text-sm">الرابط مفعّل ويعمل مباشرة بدون تسجيل دخول!</p>
                  <p className="leading-relaxed">
                    يمكن لأي شخص أو سائق في الشركة فتح هذا الرابط، وإدخال رقمه المتسلسل المسجل (مثل 1 أو 2) ورقم الحافلة، واختيار وجهة الرد (محايل عسير - ينبع - القصيم - الرياض)، وسيصل الرد فوراً وتلقائياً إلى بطاقة السائق في الموقع.
                  </p>
                </div>
              </div>

              {/* URL Display Card */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                  الرابط العام لتسجيل الرد:
                </label>
                <div className="flex items-center gap-2 p-2 bg-slate-100 dark:bg-slate-900 border border-border rounded-2xl">
                  <input
                    type="text"
                    readOnly
                    value={publicLink}
                    className="flex-1 bg-transparent px-2 text-xs font-mono text-slate-800 dark:text-slate-200 outline-none select-all"
                    dir="ltr"
                  />
                  <button
                    type="button"
                    onClick={handleCopyPublicLink}
                    className="flex items-center gap-1.5 px-3 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors shrink-0 cursor-pointer shadow-xs"
                  >
                    {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLink ? 'تم النسخ' : 'نسخ الرابط'}</span>
                  </button>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={handleOpenLinkInNewTab}
                  className="flex items-center justify-center gap-2 p-3 bg-surface border border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4 text-primary" />
                  <span>فتح وتجربة الرابط في صفحة جديدة</span>
                </button>

                <button
                  type="button"
                  onClick={handleShareWhatsApp}
                  className="flex items-center justify-center gap-2 p-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl text-xs font-bold transition-all shadow-md shadow-emerald-600/20 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>مشاركة الرابط عبر واتساب للسائقين</span>
                </button>
              </div>

              {/* Instructions */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-border text-xs text-text-muted space-y-2">
                <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-500" />
                  <span>كيف يعمل الرابط مع السائق؟</span>
                </div>
                <ol className="list-decimal list-inside space-y-1 pr-1 text-[11px] leading-relaxed">
                  <li>يفتح السائق الرابط المرسل إليه على واتساب أو المتصفح.</li>
                  <li>يكتب رقمه المتسلسل (الرقم الظاهر في بطاقة السائق، مثل 1، 2، 3...).</li>
                  <li>يتحقق النظام فوراً ويظهر اسمه الكامل ورقم حافلته تلقائياً للتأكيد.</li>
                  <li>يختار وجهة الرد (محايل عسير - ينبع - القصيم - الرياض) ويضغط إرسال.</li>
                  <li>يظهر الرد مباشرة في بطاقة السائق وتبويب ردود السائقين، وفي Google Sheets إذا تم تفعيله!</li>
                </ol>
              </div>
            </div>
          )}

          {/* TAB 2: Google Sheets Sync */}
          {activeTab === 'sheets' && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-2xl text-xs text-blue-950 dark:text-blue-200 space-y-1">
                <p className="font-black text-sm">الربط المباشر مع جداول Google Sheets</p>
                <p className="leading-relaxed">
                  يمكنك ربط نموذج الردود بجدول Google Sheets ليتم تسجيل كل رد تلقائياً في صف جديد بالجدول، كما يمكنك نسخ الردود الحالية بضغطة زر واحدة ولصقها في أي جدول فوراً!
                </p>
              </div>

              {/* Quick Actions Bar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyTsvToGoogleSheets}
                  className="flex items-center justify-center gap-2 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 rounded-2xl text-xs font-black transition-all hover:bg-emerald-100 dark:hover:bg-emerald-900/60 cursor-pointer shadow-xs"
                >
                  {copiedTsv ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  <span>{copiedTsv ? 'تم نسخ الردود! اضغط Ctrl+V في غوغل شيت' : 'نسخ كل الردود لـ Google Sheets (Ctrl+V)'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex items-center justify-center gap-2 p-3 bg-surface border border-border hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-800 dark:text-slate-200 rounded-2xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                >
                  <Download className="w-4 h-4 text-emerald-600" />
                  <span>تحميل ملف Excel متوافق مع غوغل شيت</span>
                </button>
              </div>

              {/* Webhook Configuration */}
              <div className="bg-slate-50 dark:bg-slate-900/60 p-4 rounded-2xl border border-border space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-slate-800 dark:text-slate-200">
                    رابط ويب هوك غوغل شيت (Apps Script Webhook URL)
                  </label>
                  {saveSuccess && (
                    <span className="text-[11px] font-bold text-emerald-600 flex items-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>تم الحفظ بنجاح</span>
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <input
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec"
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    className="w-full p-2.5 text-xs bg-surface border border-border rounded-xl font-mono text-left focus:border-primary focus:ring-1 focus:ring-primary outline-none"
                    dir="ltr"
                  />
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveSettings}
                      disabled={isSavingSettings}
                      className="px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-primary-hover transition-colors disabled:opacity-50 cursor-pointer shadow-xs"
                    >
                      {isSavingSettings ? 'جاري الحفظ...' : 'حفظ رابط الربط'}
                    </button>

                    <button
                      type="button"
                      onClick={handleTestWebhook}
                      disabled={isTestingWebhook || !webhookUrl.trim()}
                      className="px-3.5 py-2 bg-surface border border-border text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 cursor-pointer shadow-xs flex items-center gap-1.5"
                    >
                      {isTestingWebhook ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin text-primary" />
                      ) : (
                        <Send className="w-3.5 h-3.5 text-emerald-600" />
                      )}
                      <span>اختبار الاتصال بـ غوغل شيت</span>
                    </button>
                  </div>
                </div>

                {/* Direct Sheet URL Link & Auto Sync */}
                <div className="pt-2 border-t border-border/60 space-y-2">
                  <label className="text-[11px] font-bold text-slate-800 dark:text-slate-200">
                    رابط جدول Google Sheet (المرتبط بنموذج غوغل أو جدول الردود):
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="url"
                      placeholder="https://docs.google.com/spreadsheets/d/..."
                      value={sheetUrl}
                      onChange={(e) => setSheetUrl(e.target.value)}
                      className="flex-1 p-2.5 text-xs bg-surface border border-border rounded-xl font-mono text-left outline-none"
                      dir="ltr"
                    />
                    {sheetUrl.trim() && (
                      <button
                        type="button"
                        onClick={() => window.open(sheetUrl.trim(), '_blank')}
                        className="px-3 py-2 bg-surface border border-border hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl text-xs font-bold text-primary flex items-center gap-1 cursor-pointer shrink-0"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>فتح الجدول</span>
                      </button>
                    )}
                  </div>

                  {/* Pull & Sync Button */}
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 rounded-xl space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-black text-emerald-900 dark:text-emerald-200">
                        مزامنة وسحب الردود من Google Sheet تلقائياً
                      </span>
                      <button
                        type="button"
                        onClick={handleSyncFromGoogleSheet}
                        disabled={isPullingSheet || !sheetUrl.trim()}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition-all shadow-sm flex items-center gap-1.5 disabled:opacity-50 cursor-pointer shrink-0"
                      >
                        {isPullingSheet ? (
                          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <RefreshCw className="w-3.5 h-3.5" />
                        )}
                        <span>{isPullingSheet ? 'جاري السحب...' : 'سحب وتحديث الردود الآن'}</span>
                      </button>
                    </div>
                    <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                      إذا قمت أنت أو أي شخص بإدخال ردود في Google Sheet أو عبر Google Form، اضغط هنا ليتم سحبها وقراءتها وتنزيلها تلقائياً وفوراً في بطاقات السائقين بالموقع!
                    </p>
                  </div>
                </div>

                {pullResult && (
                  <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    pullResult.error 
                      ? 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300'
                      : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                  }`}>
                    {pullResult.error ? (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    )}
                    <span>{pullResult.error ? pullResult.error : `تمت المزامنة بنجاح! تم إضافة ${pullResult.added} رد جديد إلى الموقع.`}</span>
                  </div>
                )}

                {/* Test Feedback */}
                {testResult && (
                  <div className={`p-3 rounded-xl text-xs flex items-start gap-2 ${
                    testResult.success 
                      ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-300'
                      : 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border border-rose-300'
                  }`}>
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                    )}
                    <span>{testResult.message}</span>
                  </div>
                )}
              </div>

              {/* Apps Script Guide Accordion */}
              <div className="border border-border rounded-2xl overflow-hidden">
                <button
                  type="button"
                  onClick={() => setShowScriptDetails(!showScriptDetails)}
                  className="w-full p-3.5 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between text-xs font-bold text-slate-800 dark:text-slate-200 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-primary" />
                    <span>خطوات إعداد كود Google Apps Script البسيط (دقيقة واحدة فقط)</span>
                  </div>
                  {showScriptDetails ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>

                {showScriptDetails && (
                  <div className="p-4 bg-surface space-y-3 text-xs text-text-muted border-t border-border">
                    <div className="space-y-1.5 leading-relaxed text-[11px]">
                      <p><strong>1.</strong> افتح أي جدول Google Sheets جديد أو موجود.</p>
                      <p><strong>2.</strong> من القائمة العلوية اضغط على <strong>التوسيعات (Extensions)</strong> ثم <strong>Apps Script</strong>.</p>
                      <p><strong>3.</strong> امسح أي كود موجود والصق الكود الجاهز أدناه.</p>
                      <p><strong>4.</strong> اضغط على زر <strong>Deploy (نشر)</strong> بالأعلى واختر <strong>New deployment (نشر جديد)</strong>.</p>
                      <p><strong>5.</strong> اختر نوع النشر: <strong>Web app</strong> واجعل خيار Who has access: <strong>Anyone (أي شخص)</strong>.</p>
                      <p><strong>6.</strong> انسخ رابط Web app (ينتهي بـ /exec) والصقه في خانة الرابط أعلاه واضغط حفظ!</p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyScript}
                      className="w-full flex items-center justify-center gap-2 py-2.5 bg-slate-900 dark:bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      {copiedScript ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedScript ? 'تم نسخ كود السكربت!' : 'نسخ كود Apps Script لغوغل شيت'}</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: Responses Overview */}
          {activeTab === 'responses' && (
            <div className="space-y-4">
              {/* Destination Metrics */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-2xl text-center">
                  <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">محايل عسير</span>
                  <span className="text-lg font-black text-emerald-600 font-mono">{destStats.mahayil}</span>
                </div>
                <div className="p-3 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-2xl text-center">
                  <span className="text-[11px] font-bold text-sky-800 dark:text-sky-300 block">ينبع</span>
                  <span className="text-lg font-black text-sky-600 font-mono">{destStats.yanbu}</span>
                </div>
                <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-2xl text-center">
                  <span className="text-[11px] font-bold text-amber-800 dark:text-amber-300 block">القصيم</span>
                  <span className="text-lg font-black text-amber-600 font-mono">{destStats.qassim}</span>
                </div>
                <div className="p-3 bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 rounded-2xl text-center">
                  <span className="text-[11px] font-bold text-purple-800 dark:text-purple-300 block">الرياض</span>
                  <span className="text-lg font-black text-purple-600 font-mono">{destStats.riyadh}</span>
                </div>
                <div className="p-3 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-2xl text-center col-span-2 sm:col-span-1">
                  <span className="text-[11px] font-bold text-teal-800 dark:text-teal-300 block">الترددية</span>
                  <span className="text-lg font-black text-teal-600 font-mono">{destStats.shuttle}</span>
                </div>
              </div>

              {/* Latest Responses List */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-black text-slate-900 dark:text-white">
                    آخر الردود المسجلة ({driverResponses.length}):
                  </h4>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleCopyTsvToGoogleSheets}
                      className="text-[11px] text-emerald-600 font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Copy className="w-3 h-3" />
                      <span>نسخ لـ Sheets</span>
                    </button>
                    <span className="text-text-muted">|</span>
                    <button
                      type="button"
                      onClick={handleExportExcel}
                      className="text-[11px] text-primary font-bold hover:underline flex items-center gap-1 cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                      <span>تصدير Excel</span>
                    </button>
                  </div>
                </div>

                {driverResponses.length === 0 ? (
                  <div className="text-center py-8 text-xs text-text-muted border border-dashed border-border rounded-2xl">
                    لا توجد ردود مسجلة بعد. عند إرسال السائقين للردود ستظهر هنا وفي بطاقات السائقين تلقائياً.
                  </div>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {driverResponses.slice(0, 20).map((resp) => (
                      <div
                        key={resp.id}
                        className="p-3 bg-slate-50 dark:bg-slate-900/60 border border-border rounded-xl flex items-center justify-between text-xs"
                      >
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-slate-900 dark:text-white">
                              {resp.driverName}
                            </span>
                            <span className="text-[10px] px-1.5 py-0.2 bg-primary/10 text-primary font-bold rounded">
                              #{resp.driverSerialNumber}
                            </span>
                            <span className="text-[10px] text-text-muted">
                              حافلة: {resp.busNumber}
                            </span>
                          </div>
                          <p className="text-[10px] text-text-muted">
                            {resp.createdDate || 'مسجل حديثاً'} {resp.notes ? `• ${resp.notes}` : ''}
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[11px] font-black bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                          {resp.responseType}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-border bg-slate-50 dark:bg-slate-900/40 flex items-center justify-between">
          <span className="text-xs text-text-muted">
            إجمالي السائقين المسجلين: {drivers.length} سائق
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            إغلاق
          </button>
        </div>
      </motion.div>
    </div>
  );
};
