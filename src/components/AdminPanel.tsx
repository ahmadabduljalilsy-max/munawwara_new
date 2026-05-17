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
  RefreshCw
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
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
    </div>
  );
};
