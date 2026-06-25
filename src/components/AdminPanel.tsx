import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, 
  CheckCircle, 
  XCircle, 
  Shield, 
  Mail,
  UserCheck,
  UserPlus,
  Trash2,
  Image as ImageIcon,
  Settings,
  UploadCloud,
  ChevronRight,
  Clock,
  ArrowUpDown,
  SortAsc,
  SortDesc,
  Search,
  Filter,
  RefreshCw,
  FileSpreadsheet,
  Download,
  Upload,
  Database,
  AlertTriangle
} from 'lucide-react';
import * as XLSX from 'xlsx';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc, getDocs, writeBatch } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useLogo } from '../lib/LogoContext';
import { handleFirestoreError, OperationType } from '../lib/firestoreUtils';
import type { AppUser } from '../types';

type SortField = 'displayName' | 'email' | 'role';
type SortOrder = 'asc' | 'desc';

interface UserCardProps {
  user: AppUser;
  isPending: boolean;
  onApprove: (uid: string) => void;
  onMakeSupervisor: (uid: string) => void;
  onMakeUser: (uid: string) => void;
  onDeactivate: (uid: string) => void;
  onDelete: (user: { uid: string; name: string }) => void;
  adminEmails: string[];
}

const UserCard: React.FC<UserCardProps> = ({ 
  user, 
  isPending, 
  onApprove, 
  onMakeSupervisor, 
  onMakeUser, 
  onDeactivate, 
  onDelete,
  adminEmails
}) => (
  <motion.div 
    layout
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-surface p-6 rounded-[32px] border border-border shadow-sm flex flex-col hover:shadow-md transition-all group relative overflow-hidden h-full"
  >
    {/* Role/Status Badge */}
    <div className="absolute top-4 left-4 z-10">
      {isPending ? (
        <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 shadow-sm border border-amber-200">
          قيد المراجعة
        </span>
      ) : (
        <span className={`
          inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider shadow-sm
          ${user.role === 'admin' ? 'bg-indigo-500 text-white' : 
            user.role === 'supervisor' ? 'bg-emerald-500 text-white' : 
            'bg-blue-500 text-white'}
        `}>
          {user.role === 'admin' ? 'مدير' : 
           user.role === 'supervisor' ? 'مشرف' : 
           'سائق/عامل'}
        </span>
      )}
    </div>

    <div className="flex flex-col items-center text-center gap-4 mb-6 mt-4">
      <div className="relative group/avatar">
        <div className="w-20 h-20 rounded-[28px] overflow-hidden p-1 bg-white border border-border shadow-md group-hover:scale-105 transition-transform duration-500">
          <img 
            src={user.photoURL || ''} 
            alt="" 
            className={`w-full h-full object-cover rounded-[22px] ${isPending ? 'grayscale' : ''}`} 
          />
        </div>
        {!isPending && user.role === 'admin' && (
          <div className="absolute -bottom-1 -right-1 bg-amber-400 p-1.5 rounded-xl border-4 border-white shadow-lg">
            <Shield className="w-3.5 h-3.5 text-white" />
          </div>
        )}
        {isPending && (
          <div className="absolute -bottom-1 -right-1 bg-amber-500 w-5 h-5 rounded-full border-2 border-white animate-pulse" />
        )}
      </div>
      
      <div className="space-y-1 w-full overflow-hidden">
        <h4 className="font-black text-lg text-text-main leading-tight truncate">{user.displayName}</h4>
        <p className="text-xs text-text-muted font-bold flex items-center justify-center gap-1.5 truncate">
          <Mail className="w-3 h-3 flex-shrink-0" />
          <span className="truncate">{user.email}</span>
        </p>
      </div>
    </div>

    <div className="mt-auto space-y-3">
      {adminEmails.includes(user.email) ? (
        <div className="w-full py-2.5 bg-slate-50 rounded-2xl text-xs font-black text-slate-400 text-center border border-slate-100 italic">
          حساب المدير محمي
        </div>
      ) : isPending ? (
        <div className="flex items-stretch gap-2">
          <button 
            onClick={() => onApprove(user.uid)}
            className="flex-[2] bg-[#10B981] text-white py-3.5 rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 shadow-emerald-100"
          >
            <CheckCircle className="w-5 h-5" /> تفعيل
          </button>
          <button 
            onClick={() => onDelete({ uid: user.uid, name: user.displayName || 'مستخدم' })}
            className="flex-1 bg-red-50 text-red-600 py-3.5 rounded-2xl font-black text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2 border-2 border-red-200 active:scale-95"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2">
            {user.role !== 'supervisor' && (
              <button 
                onClick={() => onMakeSupervisor(user.uid)}
                className="flex-1 px-3 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl text-[11px] font-black hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-100"
              >
                ترقية لمشرف
              </button>
            )}
            {user.role !== 'user' && (
              <button 
                onClick={() => onMakeUser(user.uid)}
                className="flex-1 px-3 py-2.5 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
              >
                تخفيض لمستخدم
              </button>
            )}
          </div>
          
          <div className="flex items-center gap-2">
            <button 
              onClick={() => onDeactivate(user.uid)}
              className="flex-1 px-4 py-3 bg-amber-50 text-amber-600 rounded-2xl text-xs font-black hover:bg-amber-100 transition-all flex items-center justify-center gap-2 border border-amber-100 active:scale-95"
            >
              <XCircle className="w-4 h-4" /> تعطيل
            </button>
            <button 
              onClick={() => onDelete({ uid: user.uid, name: user.displayName || 'مستخدم' })}
              className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-100 active:scale-95 group/del"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </>
      )}
    </div>
    <div className="absolute inset-0 pointer-events-none opacity-[0.02] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px] -z-10" />
  </motion.div>
);

export const AdminPanel: React.FC = () => {
  const { logoURL: currentLogo } = useLogo();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'all' | 'active' | 'pending'>('all');
  const [userToDelete, setUserToDelete] = useState<{ uid: string; name: string } | null>(null);
  const [appLogo, setAppLogo] = useState<string>(currentLogo);
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortField, setSortField] = useState<SortField>('displayName');
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc');
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [showSyncConfirm, setShowSyncConfirm] = useState(false);
  const [showResultModal, setShowResultModal] = useState<{
    type: 'success' | 'info' | 'error';
    title: string;
    message: string;
  } | null>(null);

  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importProgress, setImportProgress] = useState<string | null>(null);

  const handleExportBackup = async () => {
    setIsExporting(true);
    try {
      // 1. Fetch all collections from Firestore on-demand
      const busesSnap = await getDocs(collection(db, 'buses'));
      const workersSnap = await getDocs(collection(db, 'workers'));
      const salariesSnap = await getDocs(collection(db, 'salaries'));
      const usersSnap = await getDocs(collection(db, 'users'));

      const busesData = busesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const workersData = workersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const salariesData = salariesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const usersData = usersSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

      // 2. Format data with Arabic friendly columns for the Excel sheets
      const formattedBuses = busesData.map((b: any) => ({
        'معرف فريد (ID)': b.id || '',
        'الرقم التشغيلي': b.operationalNumber || '',
        'رقم اللوحة': b.plateNumber || '',
        'الفئة': b.category || '',
        'الموديل': b.model || '',
        'الشركة المصنعة': b.manufacturer || '',
        'اللون': b.color || '',
        'الحالة الفنية': b.technicalStatus || '',
        'الموقع الحالي': b.location || '',
        'ملاحظات': b.notes || '',
        'تاريخ الإنشاء': b.createdAt || ''
      }));

      const formattedWorkers = workersData.map((w: any) => ({
        'معرف فريد (ID)': w.id || '',
        'رقم العامل': w.workerNumber || '',
        'اسم العامل': w.name || '',
        'رقم الإقامة/الهوية': w.iqamaNumber || w.nationalId || '',
        'رقم الجوال': w.mobileNumber || '',
        'شركة الاستقدام': w.recruitmentCompany || '',
        'مكان العمل': w.workplace || '',
        'العميل': w.clientName || '',
        'تاريخ بداية العمل': w.startDate || '',
        'تاريخ نهاية العمل': w.endDate || '',
        'معرف الحافلة المرتبطة': w.assignedBusId || '',
        'الرقم التشغيلي للحافلة': w.assignedBusOperationalNumber || '',
        'لوحة الحافلة': w.assignedBusPlateNumber || '',
        'الحافلات السابقة': w.previousBuses || '',
        'ملاحظات': w.notes || '',
        'تاريخ الإضافة': w.createdAt || ''
      }));

      const formattedSalaries = salariesData.map((s: any) => ({
        'معرف فريد (ID)': s.id || '',
        'معرف العامل': s.workerId || '',
        'رقم العامل': s.workerNumber || '',
        'اسم العامل': s.workerName || '',
        'الشهر': s.month || '',
        'الراتب الأساسي': s.baseSalary || 0,
        'ساعات العمل الإضافية': s.extraHours || 0,
        'قيمة العمل الإضافي': s.extraHoursValue || 0,
        'المرابطة': s.morabata || 0,
        'إجمالي المستحق': s.totalSalary || 0,
        'الحالة': s.status === 'paid' ? 'مدفوع' : 'معلق',
        'موقع العمل': s.workLocation || '',
        'ملاحظات': s.notes || '',
        'تاريخ العمل الإجرائي': s.createdAt || ''
      }));

      const formattedUsers = usersData.map((u: any) => ({
        'معرف المستخدم (UID)': u.uid || '',
        'الاسم الكامل': u.displayName || '',
        'البريد الإلكتروني': u.email || '',
        'الصلاحية في النظام': u.role === 'admin' ? 'مدير' : u.role === 'supervisor' ? 'مشرف' : u.role === 'user' ? 'سائق/عامل' : 'قيد المراجعة',
        'حالة التفعيل': u.approved ? 'نشط' : 'معلق',
        'تاريخ الإنشاء': u.createdAt || ''
      }));

      // 3. Create Excel workbook and worksheets
      const wb = XLSX.utils.book_new();

      const wsBuses = XLSX.utils.json_to_sheet(formattedBuses);
      const wsWorkers = XLSX.utils.json_to_sheet(formattedWorkers);
      const wsSalaries = XLSX.utils.json_to_sheet(formattedSalaries);
      const wsUsers = XLSX.utils.json_to_sheet(formattedUsers);

      // Add to workbook
      XLSX.utils.book_append_sheet(wb, wsBuses, "أسطول الحافلات");
      XLSX.utils.book_append_sheet(wb, wsWorkers, "سجل الكوادر والعمال");
      XLSX.utils.book_append_sheet(wb, wsSalaries, "مسيرات الرواتب");
      XLSX.utils.book_append_sheet(wb, wsUsers, "مستخدمي وصلاحيات النظام");

      // Generate filename with timestamp
      const dateStr = new Date().toISOString().split('T')[0];
      const filename = `النسخة_الاحتياطية_الشاملة_${dateStr}.xlsx`;

      // Trigger download
      XLSX.writeFile(wb, filename);

      setShowResultModal({
        type: 'success',
        title: 'تم تصدير النسخة الاحتياطية بنجاح',
        message: `تم بنجاح إنشاء ملف إكسل شامل يحتوي على 4 صفحات بيانات: أسطول الحافلات (${formattedBuses.length})، سجل الكوادر (${formattedWorkers.length})، مسيرات الرواتب (${formattedSalaries.length})، والمستخدمين (${formattedUsers.length}).`
      });
    } catch (error: any) {
      console.error(error);
      setShowResultModal({
        type: 'error',
        title: 'فشل تصدير النسخة الاحتياطية',
        message: `حدث خطأ أثناء الاتصال بقاعدة البيانات وتصدير الملف: ${error?.message || 'خطأ غير معروف'}`
      });
    } finally {
      setIsExporting(false);
    }
  };

  const handleImportBackup = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!window.confirm('تنبيه هام جداً: هل أنت متأكد من رغبتك في استعادة واستيراد البيانات من ملف الإكسل؟ قد يؤدي هذا الإجراء إلى تحديث البيانات الحالية أو إضافة بيانات جديدة وفقاً للمحتوى المرفق.')) {
      e.target.value = '';
      return;
    }

    setIsImporting(true);
    setImportProgress('جاري قراءة وتحليل ملف النسخة الاحتياطية...');

    try {
      const data = await file.arrayBuffer();
      const workbook = XLSX.read(data, { type: 'array' });

      let importedBusesCount = 0;
      let importedWorkersCount = 0;
      let importedSalariesCount = 0;
      let importedUsersCount = 0;

      // 1. IMPORT BUSES
      const sheetBuses = workbook.Sheets["أسطول الحافلات"];
      if (sheetBuses) {
        setImportProgress('جاري استيراد وتحديث بيانات أسطول الحافلات...');
        const rows: any[] = XLSX.utils.sheet_to_json(sheetBuses);
        let batch = writeBatch(db);
        let count = 0;

        for (const row of rows) {
          const id = row['معرف فريد (ID)'] || doc(collection(db, 'buses')).id;
          const busData = {
            operationalNumber: (row['الرقم التشغيلي'] || '').toString().trim(),
            plateNumber: (row['رقم اللوحة'] || '').toString().trim(),
            category: (row['الفئة'] || '').toString().trim(),
            model: (row['الموديل'] || '').toString().trim(),
            manufacturer: (row['الشركة المصنعة'] || '').toString().trim(),
            color: (row['اللون'] || '').toString().trim(),
            technicalStatus: (row['الحالة الفنية'] || '').toString().trim(),
            location: (row['الموقع الحالي'] || '').toString().trim(),
            notes: (row['ملاحظات'] || '').toString().trim(),
            updatedAt: new Date().toISOString()
          };

          // Only keep valid operational number
          if (busData.operationalNumber) {
            batch.set(doc(db, 'buses', id), busData, { merge: true });
            count++;
            importedBusesCount++;

            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }

      // 2. IMPORT WORKERS
      const sheetWorkers = workbook.Sheets["سجل الكوادر والعمال"];
      if (sheetWorkers) {
        setImportProgress('جاري استيراد وتحديث بيانات الكوادر والعمال...');
        const rows: any[] = XLSX.utils.sheet_to_json(sheetWorkers);
        let batch = writeBatch(db);
        let count = 0;

        for (const row of rows) {
          const id = row['معرف فريد (ID)'] || doc(collection(db, 'workers')).id;
          const workerData: any = {
            workerNumber: (row['رقم العامل'] || '').toString().trim(),
            name: (row['اسم العامل'] || '').toString().trim(),
            iqamaNumber: (row['رقم الإقامة/الهوية'] || '').toString().trim(),
            mobileNumber: (row['رقم الجوال'] || '').toString().trim(),
            recruitmentCompany: (row['شركة الاستقدام'] || '').toString().trim(),
            workplace: (row['مكان العمل'] || '').toString().trim(),
            clientName: (row['العميل'] || '').toString().trim(),
            startDate: (row['تاريخ بداية العمل'] || '').toString().trim(),
            endDate: (row['تاريخ نهاية العمل'] || '').toString().trim(),
            notes: (row['ملاحظات'] || '').toString().trim(),
            updatedAt: new Date().toISOString()
          };

          if (row['معرف الحافلة المرتبطة']) {
            workerData.assignedBusId = row['معرف الحافلة المرتبطة'].toString().trim();
          }
          if (row['الرقم التشغيلي للحافلة']) {
            workerData.assignedBusOperationalNumber = row['الرقم التشغيلي للحافلة'].toString().trim();
          }
          if (row['لوحة الحافلة']) {
            workerData.assignedBusPlateNumber = row['لوحة الحافلة'].toString().trim();
          }
          if (row['الحافلات السابقة']) {
            workerData.previousBuses = row['الحافلات السابقة'].toString().trim();
          }

          if (workerData.name && workerData.workerNumber) {
            batch.set(doc(db, 'workers', id), workerData, { merge: true });
            count++;
            importedWorkersCount++;

            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }

      // 3. IMPORT SALARIES
      const sheetSalaries = workbook.Sheets["مسيرات الرواتب"];
      if (sheetSalaries) {
        setImportProgress('جاري استيراد وتحديث مسيرات الرواتب...');
        const rows: any[] = XLSX.utils.sheet_to_json(sheetSalaries);
        let batch = writeBatch(db);
        let count = 0;

        for (const row of rows) {
          const id = row['معرف فريد (ID)'] || doc(collection(db, 'salaries')).id;
          const salaryData = {
            workerId: (row['معرف العامل'] || '').toString().trim(),
            workerNumber: (row['رقم العامل'] || '').toString().trim(),
            workerName: (row['اسم العامل'] || '').toString().trim(),
            month: (row['الشهر'] || '').toString().trim(),
            baseSalary: Number(row['الراتب الأساسي'] || 0),
            extraHours: Number(row['ساعات العمل الإضافية'] || 0),
            extraHoursValue: Number(row['قيمة العمل الإضافي'] || 0),
            morabata: Number(row['المرابطة'] || 0),
            totalSalary: Number(row['إجمالي المستحق'] || 0),
            status: row['الحالة'] === 'مدفوع' ? 'paid' : 'pending',
            workLocation: (row['موقع العمل'] || '').toString().trim(),
            notes: (row['ملاحظات'] || '').toString().trim(),
            updatedAt: new Date().toISOString()
          };

          if (salaryData.workerName && salaryData.month) {
            batch.set(doc(db, 'salaries', id), salaryData, { merge: true });
            count++;
            importedSalariesCount++;

            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }

      // 4. IMPORT USERS
      const sheetUsers = workbook.Sheets["مستخدمي وصلاحيات النظام"];
      if (sheetUsers) {
        setImportProgress('جاري استيراد وتحديث صلاحيات مستخدمي النظام...');
        const rows: any[] = XLSX.utils.sheet_to_json(sheetUsers);
        let batch = writeBatch(db);
        let count = 0;

        for (const row of rows) {
          const uid = row['معرف المستخدم (UID)'];
          if (uid) {
            const roleStr = row['الصلاحية في النظام'];
            const role = roleStr === 'مدير' ? 'admin' : roleStr === 'مشرف' ? 'supervisor' : roleStr === 'سائق/عامل' ? 'user' : 'pending';
            const approved = row['حالة التفعيل'] === 'نشط';

            batch.set(doc(db, 'users', uid), {
              role,
              approved,
              updatedAt: new Date().toISOString()
            }, { merge: true });

            count++;
            importedUsersCount++;

            if (count >= 400) {
              await batch.commit();
              batch = writeBatch(db);
              count = 0;
            }
          }
        }
        if (count > 0) {
          await batch.commit();
        }
      }

      setImportProgress(null);
      setShowResultModal({
        type: 'success',
        title: 'تم استيراد واستعادة النسخة الاحتياطية بنجاح',
        message: `اكتملت عملية المعالجة وتحديث قاعدة البيانات بنجاح:
        - تم تحديث ${importedBusesCount} حافلة في أسطول الشركة.
        - تم تحديث ${importedWorkersCount} عامل في سجل الكوادر والمتابعة.
        - تم تحديث ${importedSalariesCount} سجل رواتب في مسيرات الرواتب.
        - تم تحديث صلاحيات وحالة ${importedUsersCount} مستخدم في النظام.`
      });

    } catch (error: any) {
      console.error(error);
      setImportProgress(null);
      setShowResultModal({
        type: 'error',
        title: 'فشل استيراد النسخة الاحتياطية',
        message: `حدث خطأ أثناء تحليل الملف واستيراد البيانات: ${error?.message || 'تأكد من اختيار ملف إكسل متوافق ومولد من النظام سابقاً.'}`
      });
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const executeSyncPreviousBuses = async () => {
    setShowSyncConfirm(false);
    setIsSyncing(true);
    setSyncStatus('جاري فحص وتحديث وترتيب بيانات الحافلات من سجل الملاحظات...');
    
    try {
      const workersSnap = await getDocs(collection(db, 'workers'));
      let batch = writeBatch(db);
      let batchSize = 0;
      let updatedCount = 0;
      let totalCount = 0;

      for (const workerDoc of workersSnap.docs) {
        totalCount++;
        const workerId = workerDoc.id;
        const workerData = workerDoc.data();
        const notes = (workerData.notes || '').toString().trim();
        const existingPreviousStr = (workerData.previousBuses || '').toString().trim();

        if (!notes) continue;

        // --- ULTRA-ROBUST PARSING METHOD ---
        let cleanNotes = notes;

        // 1. Convert all Arabic-Indic numbers (e.g., ٢٠٢٦, ٣١٦) to standard digits (e.g., 2026, 316)
        cleanNotes = cleanNotes.replace(/[\u0660-\u0669]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632));

        // 2. Remove any standard digit-based dates (e.g. YYYY/MM/DD, DD/MM/YYYY, DD-MM-YYYY, DD/MM/YY, etc.)
        cleanNotes = cleanNotes.replace(/\d{4}[/\-.]\d{1,2}[/\-.]\d{1,2}/g, ''); // YYYY/MM/DD
        cleanNotes = cleanNotes.replace(/\d{1,2}[/\-.]\d{1,2}[/\-.]\d{2,4}/g, ''); // DD/MM/YY or DD/MM/YYYY

        // 3. Remove Arabic written dates (e.g. "11 مايو 2026", "22 مايو 2026")
        cleanNotes = cleanNotes.replace(/\d{1,2}\s+[\u0600-\u06FFa-zA-Z]+\s+\d{4}/g, '');

        // 4. Remove vehicle plates explicitly to avoid matching plate digits (e.g. "اللوحة: أ ر د 2411" or "لوحة أدق 2569")
        // We match up to 20 alphabetic/spacing characters between "لوحة" and the digits to be completely clean
        cleanNotes = cleanNotes.replace(/(اللوحة|لوحة|اللوحه|لوحه)\s*[:：-]*\s*[a-zA-Z\u0600-\u06FF\s]{0,20}\d+/gi, '');

        // 5. Scan the remaining string for any sequences of digits (the actual bus numbers!)
        const extracted: string[] = [];
        const digitMatches = cleanNotes.match(/\d+/g);

        if (digitMatches) {
          digitMatches.forEach(numStr => {
            const val = numStr.trim();
            const num = parseInt(val, 10);
            
            // Exclude small index numbers like 1, 2, 3 corresponding to lists
            // Exclude current/future year digits (e.g., 2020 to 2030) to skip any years that weren't captured by dates patterns
            if (val.length >= 2 && val.length <= 4) {
              if (num < 2020 || num > 2030) {
                if (!extracted.includes(val)) {
                  extracted.push(val);
                }
              }
            }
          });
        }

        // Parse current previousBuses and split cleanly
        const existingList = existingPreviousStr
          ? existingPreviousStr.split(/[\s,،\-]+/).map((item: string) => item.trim()).filter(Boolean)
          : [];

        // Combine non-duplicated list values
        const mergedList = Array.from(new Set([...existingList, ...extracted]));

        // Sort numerically (ascending order)
        mergedList.sort((a, b) => {
          const numA = parseInt(a, 10);
          const numB = parseInt(b, 10);
          if (isNaN(numA) || isNaN(numB)) {
            return a.localeCompare(b);
          }
          return numA - numB;
        });

        const newPreviousBuses = mergedList.join(' - ');

        // If the calculated string differs from current state, compile it to batch queue
        if (newPreviousBuses !== existingPreviousStr) {
          batch.update(doc(db, 'workers', workerId), {
            previousBuses: newPreviousBuses,
            updatedAt: new Date().toISOString()
          });
          updatedCount++;
          batchSize++;

          // Commit batch incrementally if we reach Firestore limit of 500 documents
          if (batchSize >= 400) {
            await batch.commit();
            batch = writeBatch(db);
            batchSize = 0;
          }
        }
      }

      // Commit remaining batch updates
      if (batchSize > 0) {
        await batch.commit();
      }

      if (updatedCount > 0) {
        setSyncStatus(`تم بنجاح! تم استخراج وترتيب بيانات الحافلات السابقة لـ ${updatedCount} عمال من أصل ${totalCount}.`);
        setShowResultModal({
          type: 'success',
          title: 'اكتمل التحديث بنجاح',
          message: `تم نسخ وترتيب مصفوفة الحافلات السابقة لـ ${updatedCount} عمال بنجاح بناءً على الملاحظات وحفظ التغييرات في السحابة.`
        });
      } else {
        setSyncStatus(`قاعدة البيانات محدثة ومطابقة بالكامل! (تم فحص ${totalCount} عمال ولم يستدعِ أي تعديلات).`);
        setShowResultModal({
          type: 'info',
          title: 'البيانات متطابقة بالفعل',
          message: 'كافة حقول "الحافلات السابقة" متطابقة تماماً ومحدثة بالفعل مع سجل الملاحظات لجميع العمال.'
        });
      }
    } catch (error) {
      console.error('Error syncing previous buses from notes:', error);
      setSyncStatus('حدث خطأ أثناء فحص وتحديث البيانات من السحابة.');
      setShowResultModal({
        type: 'error',
        title: 'فشل التحديث',
        message: 'حدث خطأ غير متوقع أثناء الاتصال بقاعدة البيانات السحابية. يرجى التحقق من جودة الاتصال بالإنترنت والمحاولة مجدداً.'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    // Sync Users
    const pathUsers = 'users';
    const unsubUsers = onSnapshot(collection(db, pathUsers), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
      setUsers(userData);
      setLoading(false);
    }, (error) => handleFirestoreError(error, OperationType.GET, pathUsers));

    // Sync App Settings
    const pathSettings = 'settings/app';
    const unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.logoURL) {
        setAppLogo(docSnap.data()?.logoURL);
      }
    }, (error) => handleFirestoreError(error, OperationType.GET, pathSettings));

    return () => {
      unsubUsers();
      unsubSettings();
    };
  }, []);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 1024 * 1024) { // 1MB limit for base64 storage in firestore
      alert('حجم الصورة كبير جداً. يرجى اختيار صورة أقل من 1 ميجابايت.');
      return;
    }

    setIsUpdatingLogo(true);
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result as string;
        try {
          await setDoc(doc(db, 'settings', 'app'), { 
            logoURL: base64String,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          setIsUpdatingLogo(false);
          alert('تم تحديث شعار التطبيق بنجاح');
        } catch (error) {
          handleFirestoreError(error, OperationType.WRITE, 'settings/app');
        }
      };
      reader.readAsDataURL(file);
    } catch (error) {
      console.error('Logo upload error:', error);
      setIsUpdatingLogo(false);
      alert('حدث خطأ أثناء رفع الشعار');
    }
  };

  const handleApprove = async (uid: string) => {
    if (window.confirm('هل أنت متأكد من تفعيل صلاحيات هذا المستخدم؟')) {
      try {
        await updateDoc(doc(db, 'users', uid), { approved: true, role: 'user' });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
  };

  const handleMakeSupervisor = async (uid: string) => {
    if (window.confirm('هل أنت متأكد من ترقية هذا المستخدم إلى مشرف؟')) {
      try {
        await updateDoc(doc(db, 'users', uid), { role: 'supervisor', approved: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
  };

  const handleMakeUser = async (uid: string) => {
    if (window.confirm('هل أنت متأكد من تغيير صلاحيات هذا المستخدم إلى مستخدم عادي؟')) {
      try {
        await updateDoc(doc(db, 'users', uid), { role: 'user', approved: true });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
  };

  const handleDeactivate = async (uid: string) => {
    if (window.confirm('هل أنت متأكد من إلغاء تفعيل هذا المستخدم؟')) {
      try {
        await updateDoc(doc(db, 'users', uid), { approved: false });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `users/${uid}`);
      }
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    if (userToDelete.uid === auth.currentUser?.uid) {
        alert('لا يمكنك حذف حسابك الخاص من لوحة التحكم.');
        setUserToDelete(null);
        return;
    }

    try {
      await deleteDoc(doc(db, 'users', userToDelete.uid));
      alert('تم حذف المستخدم بنجاح.');
      setUserToDelete(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `users/${userToDelete.uid}`);
    }
  };

  const getSortedAndFilteredUsers = (userList: AppUser[]) => {
    return [...userList]
      .filter(u => 
        u.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.email?.toLowerCase().includes(searchQuery.toLowerCase())
      )
      .sort((a, b) => {
        const valA = (a[sortField] || '').toString().toLowerCase();
        const valB = (b[sortField] || '').toString().toLowerCase();
        
        if (sortOrder === 'asc') {
          return valA > valB ? 1 : -1;
        } else {
          return valA < valB ? 1 : -1;
        }
      });
  };

  const pendingUsers = getSortedAndFilteredUsers(users.filter(u => !u.approved));
  const activeUsers = getSortedAndFilteredUsers(users.filter(u => u.approved));

  const ADMIN_EMAILS = ['ahmad.abduljalil.sy@gmail.com', 'ahmad.abduljalilmunawwara@gmail.com'];

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };


  return (
    <div className="space-y-8 pb-20">
      {/* Admin Header Section */}
      <div className="bg-surface p-8 rounded-[40px] border border-border shadow-sm flex flex-col md:flex-row items-center justify-between relative overflow-hidden group gap-6">
        <div className="flex items-center gap-6 relative z-10 text-right">
          <div className="w-20 h-20 bg-primary/10 rounded-[28px] flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
             <Users className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-text-main leading-none">
              مركز إدارة الكوادر
            </h2>
            <p className="text-text-muted font-bold mt-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              منصة التحكم المركزية في الهويات والصلاحيات التشغيلية
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-4 relative z-10">
           {/* Logo Management Section Small */}
           <div className="flex items-center gap-3 bg-white px-4 py-2.5 rounded-2xl border border-border shadow-sm group/logo transition-all hover:border-primary/30">
              <div className="relative w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center p-1 overflow-hidden border border-border">
                <img src={appLogo} alt="Logo" className="w-full h-full object-contain" />
                {isUpdatingLogo && (
                  <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
                    <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                  </div>
                )}
              </div>
              <label className="flex flex-col text-right cursor-pointer">
                <span className="text-[10px] font-black text-text-main">شعار المؤسسة</span>
                <span className="text-[9px] font-bold text-primary group-hover:underline flex items-center gap-1">
                  تحديث الهوية <UploadCloud className="w-3 h-3" />
                </span>
                <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUpdatingLogo} />
              </label>
           </div>
        </div>

        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-50" />
      </div>

      {/* Comprehensive Backup & Restore Center */}
      <div className="bg-surface p-8 rounded-[40px] border border-border shadow-sm relative overflow-hidden group">
         <div className="relative z-10 text-right space-y-6">
           <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-border/60">
             <div className="flex items-center gap-4">
               <div className="w-14 h-14 bg-emerald-50 border border-emerald-100 rounded-[22px] flex items-center justify-center shadow-inner text-emerald-600">
                 <Database className="w-7 h-7" />
               </div>
               <div>
                 <h3 className="text-xl font-black text-text-main flex items-center gap-2">
                   مركز النسخ الاحتياطي واستعادة البيانات الشامل
                 </h3>
                 <p className="text-xs text-text-muted mt-1.5 font-bold leading-relaxed max-w-2xl">
                   يمكنك هنا تصدير كامل بيانات المنصة (الأسطول، سجل الكوادر والمتابعة، مسيرات الرواتب، المستخدمين) في ملف Excel واحد ذي شيتات متعددة، أو استيرادها لاستعادة النظام وحفظ التغييرات.
                 </p>
               </div>
             </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             {/* Export Section */}
             <div className="bg-white p-6 rounded-3xl border border-border/80 hover:border-emerald-200 hover:shadow-md transition-all flex flex-col justify-between gap-6">
               <div className="space-y-2">
                 <div className="flex items-center gap-2.5">
                   <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center">
                     <Download className="w-4 h-4" />
                   </div>
                   <h4 className="text-sm font-black text-text-main">تصدير نسخة احتياطية شاملة</h4>
                 </div>
                 <p className="text-[11px] text-text-muted font-bold leading-relaxed">
                   يقوم بإنشاء وتنزيل ملف Excel (.xlsx) موحد يحتوي على:
                 </p>
                 <ul className="text-[10px] text-text-muted/90 font-bold space-y-1 pr-4 list-disc">
                   <li>شيت أسطول حافلات الشركة (البيانات والحالة الفنية والمواقع)</li>
                   <li>شيت سجل الكوادر والعمال (بيانات الهوية ومكان العمل والحافلات)</li>
                   <li>شيت مسيرات الرواتب للشهر وساعات العمل والرواتب الإجمالية</li>
                   <li>شيت مستخدمي النظام وصلاحياتهم المسجلة</li>
                 </ul>
               </div>

               <button 
                 onClick={handleExportBackup}
                 disabled={isExporting}
                 className="w-full bg-emerald-600 hover:bg-emerald-700 text-white py-4 px-5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100 active:scale-[0.98] cursor-pointer disabled:opacity-50"
               >
                 {isExporting ? (
                   <>
                     <RefreshCw className="w-4 h-4 animate-spin" /> جاري تجميع وتصدير البيانات...
                   </>
                 ) : (
                   <>
                     <FileSpreadsheet className="w-4 h-4" /> تصدير كامل البيانات إلى ملف Excel
                   </>
                 )}
               </button>
             </div>

             {/* Import Section */}
             <div className="bg-white p-6 rounded-3xl border border-border/80 hover:border-indigo-200 hover:shadow-md transition-all flex flex-col justify-between gap-6">
               <div className="space-y-2">
                 <div className="flex items-center gap-2.5">
                   <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                     <Upload className="w-4 h-4" />
                   </div>
                   <h4 className="text-sm font-black text-text-main">استيراد واستعادة البيانات</h4>
                 </div>
                 <p className="text-[11px] text-text-muted font-bold leading-relaxed">
                   ارفع ملف Excel متوافق (تم تصديره سابقاً من هذا النظام) لتحديث أو استعادة كافة الجداول في قاعدة البيانات السحابية دفعة واحدة بشكل آمن وسلس.
                 </p>
                 <div className="bg-amber-50 border border-amber-100 text-amber-800 p-3 rounded-xl flex items-start gap-2">
                   <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                   <span className="text-[10px] font-black leading-relaxed">
                     تنبيه: الاستعادة تعتمد على المعرف الفريد للمستندات لعدم التكرار وتحديث السجلات المطابقة بنجاح.
                   </span>
                 </div>
               </div>

               <div className="relative">
                 <input 
                   type="file" 
                   id="excel-import-file" 
                   className="hidden" 
                   accept=".xlsx, .xls" 
                   onChange={handleImportBackup} 
                   disabled={isImporting} 
                 />
                 <label 
                   htmlFor="excel-import-file"
                   className={`w-full bg-indigo-600 hover:bg-indigo-700 text-white py-4 px-5 rounded-2xl font-black text-xs transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-100 active:scale-[0.98] cursor-pointer ${isImporting ? 'opacity-50 pointer-events-none' : ''}`}
                 >
                   {isImporting ? (
                     <>
                       <RefreshCw className="w-4 h-4 animate-spin" /> جاري الاستعادة: {importProgress || 'يرجى الانتظار...'}
                     </>
                   ) : (
                     <>
                       <Upload className="w-4 h-4" /> رفع ملف Excel واستعادة البيانات الآن
                     </>
                   )}
                 </label>
               </div>
             </div>
           </div>
         </div>
         <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      {/* Maintenance & Data Synchronization Card */}
      <div className="bg-surface p-6 rounded-[32px] border border-border shadow-sm relative overflow-hidden group">
         <div className="flex flex-col md:flex-row items-center justify-between gap-6 relative z-10 text-right">
           <div className="flex items-center gap-4">
             <div className="w-12 h-12 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center justify-center shadow-inner text-indigo-600 flex-shrink-0">
               <RefreshCw className={`w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} />
             </div>
             <div>
               <h3 className="text-base font-black text-text-main flex items-center gap-2">
                 مزامنة وإصلاح بيانات الحافلات السابقة
               </h3>
               <p className="text-xs text-text-muted mt-1 font-bold leading-relaxed max-w-2xl">
                 يقوم هذا الفحص بقراءة حقل الملاحظات لكل عامل واستخراج أرقام الحافلات السابقة المسجلة فيه تلقائياً، ثم تحديث قائمة "الحافلات السابقة" لكل عامل لضمان استرجاع ومزامنة كافة التعديلات وعمليات فك الارتباط السابقة.
               </p>
               {syncStatus && (
                 <div className="mt-2 text-xs font-black text-indigo-700 bg-indigo-50/50 px-3 py-1.5 rounded-lg border border-indigo-100 inline-block">
                   {syncStatus}
                 </div>
               )}
             </div>
           </div>
           <button 
             onClick={() => setShowSyncConfirm(true)}
             disabled={isSyncing}
             className="bg-indigo-600 text-white px-6 py-3.5 rounded-2xl font-black text-xs hover:bg-indigo-700 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100 disabled:opacity-50 flex-shrink-0 w-full md:w-auto justify-center cursor-pointer active:scale-[0.98]"
           >
             <Settings className="w-4 h-4" /> تحديث الحافلات السابقة من الملاحظات
           </button>
         </div>
         <div className="absolute inset-0 pointer-events-none opacity-[0.015] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:12px_12px]" />
      </div>

      {/* Control Bar: Search & Sorting */}
      <div className="bg-surface p-4 rounded-3xl border border-border shadow-sm flex flex-col lg:flex-row gap-4 sticky top-4 z-50 backdrop-blur-md bg-white/95">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 text-text-muted w-5 h-5" />
          <input 
            type="text"
            placeholder="بحث بالاسم أو البريد الإلكتروني..."
            className="w-full pr-12 pl-4 py-3 bg-background border border-border rounded-2xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all shadow-inner"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        <div className="flex items-center gap-3 overflow-x-auto pb-1 lg:pb-0 scrollbar-hide">
          <div className="flex bg-background p-1.5 rounded-2xl border border-border/50 gap-1 flex-shrink-0">
             <button 
               onClick={() => setViewMode('all')}
               className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all ${viewMode === 'all' ? 'bg-primary text-white shadow-md' : 'text-text-muted hover:bg-gray-100'}`}
             >الكل</button>
             <button 
               onClick={() => setViewMode('active')}
               className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all ${viewMode === 'active' ? 'bg-emerald-500 text-white shadow-md' : 'text-text-muted hover:bg-gray-100'}`}
             >النشطين</button>
             <button 
               onClick={() => setViewMode('pending')}
               className={`px-4 py-2 rounded-xl text-[11px] font-black transition-all ${viewMode === 'pending' ? 'bg-amber-500 text-white shadow-md' : 'text-text-muted hover:bg-gray-100'}`}
             >المعلقين</button>
          </div>

          <div className="h-8 w-[1px] bg-border mx-1 flex-shrink-0" />

          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[10px] font-black text-text-muted uppercase ml-2 flex items-center gap-1">
              <ArrowUpDown className="w-3 h-3" /> ترتيب حسب:
            </span>
            <div className="flex gap-1.5">
              {(['displayName', 'email', 'role'] as SortField[]).map(field => (
                <button 
                  key={field}
                  onClick={() => toggleSort(field)}
                  className={`
                    px-3 py-2 rounded-xl text-[11px] font-black border transition-all flex items-center gap-1.5
                    ${sortField === field 
                      ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                      : 'bg-white border-border text-text-muted hover:border-gray-300'}
                  `}
                >
                  {field === 'displayName' ? 'الاسم' : field === 'email' ? 'البريد' : 'الصلاحية'}
                  {sortField === field && (
                    sortOrder === 'asc' ? <SortAsc className="w-3 h-3" /> : <SortDesc className="w-3 h-3" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-12">
        {/* Pending Users Section */}
        {(viewMode === 'all' || viewMode === 'pending') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-50 rounded-2xl flex items-center justify-center border border-amber-100">
                  <Clock className="w-5 h-5 text-amber-600" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-text-main flex items-center gap-2">
                     طلبات الانضمام الجديدة
                     <span className="bg-amber-100 text-amber-700 px-2.5 py-0.5 rounded-lg text-xs border border-amber-200">{pendingUsers.length}</span>
                   </h3>
                   <p className="text-[11px] font-bold text-text-muted">مستخدمين بانتظار مراجعة وتفعيل الحساب من قبل الإدارة</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {pendingUsers.map(user => (
                <UserCard 
                  key={user.uid} 
                  user={user} 
                  isPending={true} 
                  onApprove={handleApprove}
                  onMakeSupervisor={handleMakeSupervisor}
                  onMakeUser={handleMakeUser}
                  onDeactivate={handleDeactivate}
                  onDelete={setUserToDelete}
                  adminEmails={ADMIN_EMAILS}
                />
              ))}
              {pendingUsers.length === 0 && (
                <div className="col-span-full py-16 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center gap-3">
                   <UserPlus className="w-10 h-10 text-gray-300" />
                   <p className="text-gray-400 font-bold">لا يوجد طلبات انضمام تتوافق مع البحث</p>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Active Users Section */}
        {(viewMode === 'all' || viewMode === 'active') && (
          <section className="space-y-6">
            <div className="flex items-center justify-between px-2 border-t border-border pt-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-emerald-50 rounded-2xl flex items-center justify-center border border-emerald-100">
                  <UserCheck className="w-5 h-5 text-emerald-600" />
                </div>
                <div>
                   <h3 className="text-xl font-black text-text-main flex items-center gap-2">
                     قائمة الكادر النشطة
                     <span className="bg-emerald-100 text-emerald-700 px-2.5 py-0.5 rounded-lg text-xs border border-emerald-200">{activeUsers.length}</span>
                   </h3>
                   <p className="text-[11px] font-bold text-text-muted">المستخدمين المصرح لهم بالدخول واستخدام ميزات النظام كاملة</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {activeUsers.map(user => (
                <UserCard 
                  key={user.uid} 
                  user={user} 
                  isPending={false} 
                  onApprove={handleApprove}
                  onMakeSupervisor={handleMakeSupervisor}
                  onMakeUser={handleMakeUser}
                  onDeactivate={handleDeactivate}
                  onDelete={setUserToDelete}
                  adminEmails={ADMIN_EMAILS}
                />
              ))}
              {activeUsers.length === 0 && (
                <div className="col-span-full py-16 text-center bg-gray-50/50 rounded-[40px] border-2 border-dashed border-gray-200 flex flex-col items-center gap-3">
                   <Users className="w-10 h-10 text-gray-300" />
                   <p className="text-gray-400 font-bold">لا يوجد مستخدمين نشطين يتوافقون مع البحث</p>
                </div>
              )}
            </div>
          </section>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {userToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface p-8 rounded-[40px] shadow-2xl border border-border max-w-md w-full text-center relative overflow-hidden"
            dir="rtl"
          >
            <div className="w-20 h-20 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-red-100">
               <Trash2 className="w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-text-main mb-3">حذف المستخدم؟</h3>
            <p className="text-text-muted font-bold text-base leading-relaxed mb-8">
              هل أنت متأكد من حذف <span className="text-red-600">"{userToDelete.name}"</span>؟ 
              <br />
              هذا الإجراء سيقوم بإلغاء صلاحيات الدخول نهائياً ولا يمكن التراجع عنه.
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={handleDelete}
                className="w-full bg-red-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-red-700 transition-all shadow-lg shadow-red-200 active:scale-95"
              >
                تأكيد الحذف النهائي
              </button>
              <button 
                onClick={() => setUserToDelete(null)}
                className="w-full bg-slate-50 text-text-main py-4 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all border border-border active:scale-95"
              >
                إلغاء
              </button>
            </div>

            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </motion.div>
        </div>
      )}

      {/* Sync Confirmation Modal */}
      {showSyncConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface p-8 rounded-[40px] shadow-2xl border border-border max-w-lg w-full text-center relative overflow-hidden"
            dir="rtl"
          >
            <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border border-indigo-100">
               <RefreshCw className="w-10 h-10 animate-spin" />
            </div>
            <h3 className="text-2xl font-black text-text-main mb-3">تحديث وترتيب الحافلات السابقة؟</h3>
            <p className="text-text-muted font-bold text-sm leading-relaxed mb-8">
              هل أنت متأكد من رغبتك في تحديث وترتيب بيانات الحافلات السابقة لجميع العمال بناءً على حقل الملاحظات وسجلات الفك والتركيب السابقة الخاصة بكل عامل؟
              <br />
              <span className="text-indigo-600 font-extrabold mt-2 block bg-indigo-50/50 py-2.5 px-4 rounded-xl border border-indigo-100/50 text-xs">
                سيقوم هذا الإجراء تلقائياً بجمع وتصفية وترتيب أرقام الحافلات السابقة لكل عامل بشكل صحيح.
              </span>
            </p>
            
            <div className="flex flex-col gap-3">
              <button 
                onClick={executeSyncPreviousBuses}
                className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-sm hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 active:scale-95 cursor-pointer"
              >
                تأكيد التحديث والترتيب الآن
              </button>
              <button 
                onClick={() => setShowSyncConfirm(false)}
                className="w-full bg-slate-50 text-text-main py-4 rounded-2xl font-black text-sm hover:bg-slate-100 transition-all border border-border active:scale-95 cursor-pointer"
              >
                إلغاء التحديث
              </button>
            </div>

            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </motion.div>
        </div>
      )}

      {/* Result feedback Modal */}
      {showResultModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-background/80 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-surface p-8 rounded-[40px] shadow-2xl border border-border max-w-md w-full text-center relative overflow-hidden"
            dir="rtl"
          >
            <div className={`w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-inner border ${
              showResultModal.type === 'success' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 
              showResultModal.type === 'error' ? 'bg-red-50 text-red-600 border-red-100' : 
              'bg-blue-50 text-indigo-600 border-blue-100'
            }`}>
               {showResultModal.type === 'success' && <CheckCircle className="w-10 h-10" />}
               {showResultModal.type === 'error' && <XCircle className="w-10 h-10" />}
               {showResultModal.type === 'info' && <RefreshCw className="w-10 h-10" />}
            </div>
            <h3 className="text-xl font-black text-text-main mb-3">{showResultModal.title}</h3>
            <p className="text-text-muted font-bold text-sm leading-relaxed mb-8">
              {showResultModal.message}
            </p>
            
            <button 
              onClick={() => setShowResultModal(null)}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-sm hover:bg-slate-800 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              موافق
            </button>

            {/* Decorative background circle */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
          </motion.div>
        </div>
      )}
    </div>
  );
};
