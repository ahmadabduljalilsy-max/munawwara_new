import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
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
  ChevronRight
} from 'lucide-react';
import { collection, onSnapshot, doc, updateDoc, deleteDoc, setDoc, getDoc } from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { useLogo } from '../lib/LogoContext';
import type { AppUser } from '../types';

export const AdminPanel: React.FC = () => {
  const { logoURL: currentLogo } = useLogo();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [userToDelete, setUserToDelete] = useState<{ uid: string; name: string } | null>(null);
  const [appLogo, setAppLogo] = useState<string>(currentLogo);
  const [isUpdatingLogo, setIsUpdatingLogo] = useState(false);

  useEffect(() => {
    // Sync Users
    const unsubUsers = onSnapshot(collection(db, 'users'), (snapshot) => {
      const userData = snapshot.docs.map(doc => ({ uid: doc.id, ...doc.data() } as AppUser));
      setUsers(userData);
      setLoading(false);
    });

    // Sync App Settings
    const unsubSettings = onSnapshot(doc(db, 'settings', 'app'), (docSnap) => {
      if (docSnap.exists() && docSnap.data()?.logoURL) {
        setAppLogo(docSnap.data()?.logoURL);
      }
    });

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
        await setDoc(doc(db, 'settings', 'app'), { 
          logoURL: base64String,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        setIsUpdatingLogo(false);
        alert('تم تحديث شعار التطبيق بنجاح');
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
      await updateDoc(doc(db, 'users', uid), { approved: true, role: 'user' });
    }
  };

  const handleMakeSupervisor = async (uid: string) => {
    if (window.confirm('هل أنت متأكد من ترقية هذا المستخدم إلى مشرف؟')) {
      await updateDoc(doc(db, 'users', uid), { role: 'supervisor', approved: true });
    }
  };

  const handleMakeUser = async (uid: string) => {
    if (window.confirm('هل أنت متأكد من تغيير صلاحيات هذا المستخدم إلى مستخدم عادي؟')) {
      await updateDoc(doc(db, 'users', uid), { role: 'user', approved: true });
    }
  };

  const handleDeactivate = async (uid: string) => {
    if (window.confirm('هل أنت متأكد من إلغاء تفعيل هذا المستخدم؟')) {
      await updateDoc(doc(db, 'users', uid), { approved: false });
    }
  };

  const handleFirestoreError = (error: unknown, operationType: string, path: string | null) => {
    const errInfo = {
      error: error instanceof Error ? error.message : String(error),
      authInfo: {
        userId: auth.currentUser?.uid,
        email: auth.currentUser?.email,
        emailVerified: auth.currentUser?.emailVerified,
        isAnonymous: auth.currentUser?.isAnonymous,
      },
      operationType,
      path
    };
    const jsonStr = JSON.stringify(errInfo);
    console.error('Firestore Error: ', jsonStr);
    alert(`خطأ في قاعدة البيانات: ${errInfo.error === 'Missing or insufficient permissions.' ? 'لا تملك الصلاحيات الكافية للقيام بهذا الإجراء' : errInfo.error}`);
    throw new Error(jsonStr);
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
      handleFirestoreError(error, 'delete', `users/${userToDelete.uid}`);
    }
  };

  const pendingUsers = users.filter(u => !u.approved);
  const activeUsers = users.filter(u => u.approved);

  const ADMIN_EMAILS = ['ahmad.abduljalil.sy@gmail.com', 'ahmad.abduljalilmunawwara@gmail.com'];

  return (
    <div className="space-y-10 pb-20">
      {/* Admin Header Section */}
      <div className="bg-surface p-8 rounded-3xl border border-border shadow-sm flex items-center justify-between relative overflow-hidden group">
        <div className="flex items-center gap-6 relative z-10 text-right">
          <div className="w-20 h-20 bg-primary/10 rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform duration-500">
             <Users className="w-10 h-10 text-primary" />
          </div>
          <div>
            <h2 className="text-3xl font-black text-text-main leading-none">
              إدارة المستخدمين والصلاحيات
            </h2>
            <p className="text-text-muted font-bold mt-3 flex items-center gap-2">
              <Shield className="w-4 h-4 text-accent" />
              منصة التحكم في أذونات الدخول وإدارة الهويات الرقمية
            </p>
          </div>
        </div>
        
        {/* App Settings & Logo Section */}
        <div className="hidden md:flex items-center gap-3 bg-background/80 backdrop-blur-sm px-5 py-3 rounded-2xl border border-border/50 shadow-sm relative z-10">
           <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center p-1 border border-border shadow-sm">
             <img 
               src={appLogo} 
               alt="Logo" 
               className="w-full h-full object-contain"
             />
           </div>
           <div className="flex flex-col text-right">
              <span className="text-xs font-black text-text-main tracking-widest uppercase truncate max-w-[120px]">درة المنورة</span>
              <span className="text-[10px] font-bold text-primary truncate max-w-[120px]">لنقل الحجاج والمعتمرين</span>
              <span className="text-[9px] font-black text-primary/80 truncate max-w-[120px]">مكتب نقل العمال</span>
           </div>
        </div>

        {/* Decorative Background Element */}
        <div className="absolute top-0 left-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-x-1/2 -translate-y-1/2 opacity-50" />
      </div>

      {/* Summary Stats Summary (Optional inline) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 px-2">
         {/* Logo Management Card */}
         <div className="bg-surface p-6 rounded-2xl border-2 border-dashed border-primary/20 shadow-sm flex flex-col gap-4 relative overflow-hidden group">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary relative overflow-hidden">
                 <img src={appLogo} alt="" className="w-full h-full object-contain p-1" />
                 {isUpdatingLogo && (
                    <div className="absolute inset-0 bg-white/80 flex items-center justify-center">
                       <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    </div>
                 )}
              </div>
              <div className="flex-1">
                 <div className="text-[10px] font-black text-primary uppercase tracking-wider mb-1">شعار التطبيق</div>
                 <h4 className="text-sm font-black text-text-main">تخصيص الهوية البصرية</h4>
              </div>
            </div>
            
            <label className="w-full bg-primary text-white py-2.5 rounded-xl font-black text-[11px] hover:bg-primary-dark transition-all flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-primary/20 active:scale-95">
              <UploadCloud className="w-4 h-4" /> تغيير الشعار
              <input type="file" className="hidden" accept="image/*" onChange={handleLogoUpload} disabled={isUpdatingLogo} />
            </label>

            {/* Decorative background icon */}
            <Settings className="absolute -bottom-2 -left-2 w-16 h-16 text-primary/5 -rotate-12" />
         </div>

         <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-xl flex items-center justify-center text-blue-600">
               <Users className="w-6 h-6" />
            </div>
            <div>
               <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">إجمالي المسجلين</div>
               <div className="text-xl font-black text-text-main">{users.length} مستخدم</div>
            </div>
         </div>
         <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4 border-r-4 border-r-amber-400">
            <div className="w-12 h-12 bg-amber-50 rounded-xl flex items-center justify-center text-amber-600">
               <UserPlus className="w-6 h-6" />
            </div>
            <div>
               <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">طلبات معلقة</div>
               <div className="text-xl font-black text-text-main">{pendingUsers.length} طلب</div>
            </div>
         </div>
         <div className="bg-surface p-6 rounded-2xl border border-border shadow-sm flex items-center gap-4 border-r-4 border-r-emerald-400">
            <div className="w-12 h-12 bg-emerald-50 rounded-xl flex items-center justify-center text-emerald-600">
               <UserCheck className="w-6 h-6" />
            </div>
            <div>
               <div className="text-[10px] font-black text-text-muted uppercase tracking-wider">الحسابات النشطة</div>
               <div className="text-xl font-black text-text-main">{activeUsers.length} مستخدم</div>
            </div>
         </div>
      </div>

      {/* Pending Approval Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-3 px-2">
          <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
            <UserPlus className="w-5 h-5 text-amber-600" />
          </div>
          <h3 className="text-xl font-bold text-text-main">طلبات الانضمام المعلقة ({pendingUsers.length})</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {pendingUsers.map(user => (
            <motion.div 
              key={user.uid}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-surface p-6 rounded-[32px] border border-border shadow-sm flex flex-col gap-5 hover:shadow-md transition-all group relative overflow-hidden h-full"
            >
              {/* Status Badge */}
              <div className="absolute top-4 left-4 z-10">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-700 shadow-sm border border-amber-200">
                  قيد المراجعة
                </span>
              </div>

              <div className="flex items-center gap-4 mt-4">
                <div className="relative">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden p-0.5 bg-white border border-border shadow-sm">
                    <img src={user.photoURL || ''} alt="" className="w-full h-full object-cover rounded-[14px] grayscale" />
                  </div>
                  <div className="absolute -bottom-1 -right-1 bg-amber-500 w-4 h-4 rounded-full border-2 border-white animate-pulse" />
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="font-black text-text-main truncate text-lg leading-tight">{user.displayName}</span>
                  <span className="text-xs text-text-muted truncate font-bold flex items-center gap-1 mt-0.5">
                    <Mail className="w-3 h-3" /> {user.email}
                  </span>
                </div>
              </div>

              <div className="flex items-stretch gap-2 mt-auto">
                <button 
                  onClick={() => handleApprove(user.uid)}
                  className="flex-[2] bg-[#10B981] text-white py-3.5 rounded-2xl font-black text-sm hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-sm active:scale-95 shadow-emerald-100"
                >
                  <CheckCircle className="w-5 h-5" /> تفعيل الحساب
                </button>
                <button 
                  onClick={() => setUserToDelete({ uid: user.uid, name: user.displayName || 'مستخدم' })}
                  className="flex-1 bg-red-50 text-red-600 py-3.5 rounded-2xl font-black text-sm hover:bg-red-100 transition-all flex items-center justify-center gap-2 border-2 border-red-200 active:scale-95"
                  title="رفض وحذف الحساب"
                >
                  <Trash2 className="w-5 h-5" />
                </button>
              </div>

              {/* Decorative detail */}
              <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-amber-50 rounded-full blur-2xl opacity-40 group-hover:opacity-100 transition-opacity" />
            </motion.div>
          ))}
          {pendingUsers.length === 0 && (
            <div className="col-span-full py-12 text-center bg-gray-50 rounded-3xl border-2 border-dashed border-gray-200">
               <p className="text-gray-400 font-bold">لا يوجد طلبات انضمام حالياً</p>
            </div>
          )}
        </div>
      </section>

      {/* Active Users Section */}
      <section className="space-y-6">
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <UserCheck className="w-5 h-5 text-blue-600" />
            </div>
            <h3 className="text-xl font-bold text-text-main">قائمة العاملين النشطة ({activeUsers.length})</h3>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {activeUsers.map(user => (
            <motion.div 
              key={user.uid}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-surface p-6 rounded-[32px] border border-border shadow-sm flex flex-col hover:shadow-md transition-all group relative overflow-hidden h-full"
            >
              {/* Role Badge - Floating */}
              <div className="absolute top-4 left-4 z-10">
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
              </div>

              {/* User Identity */}
              <div className="flex flex-col items-center text-center gap-4 mb-6 mt-4">
                <div className="relative group/avatar">
                  <div className="w-20 h-20 rounded-[28px] overflow-hidden p-1 bg-white border border-border shadow-md group-hover:scale-105 transition-transform duration-500">
                    <img 
                      src={user.photoURL || ''} 
                      alt="" 
                      className={`w-full h-full object-cover rounded-[22px] ${user.role === 'pending' ? 'grayscale' : ''}`} 
                    />
                  </div>
                  {user.role === 'admin' && (
                    <div className="absolute -bottom-1 -right-1 bg-amber-400 p-1.5 rounded-xl border-4 border-white shadow-lg">
                      <Shield className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                </div>
                
                <div className="space-y-1">
                  <h4 className="font-black text-lg text-text-main leading-tight">{user.displayName}</h4>
                  <p className="text-xs text-text-muted font-bold flex items-center justify-center gap-1.5">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </p>
                </div>
              </div>

              {/* Actions Section */}
              <div className="mt-auto space-y-3">
                {ADMIN_EMAILS.includes(user.email) ? (
                  <div className="w-full py-2.5 bg-slate-50 rounded-2xl text-xs font-black text-slate-400 text-center border border-slate-100 italic">
                    حساب المدير محمي من التعديلات
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-2">
                      {user.role !== 'supervisor' && (
                        <button 
                          onClick={() => handleMakeSupervisor(user.uid)}
                          className="flex-1 px-3 py-2.5 bg-emerald-50 text-emerald-600 rounded-2xl text-[11px] font-black hover:bg-emerald-100 transition-all active:scale-95 border border-emerald-100"
                        >
                          تعيين مشرف
                        </button>
                      )}
                      {user.role !== 'user' && (
                        <button 
                          onClick={() => handleMakeUser(user.uid)}
                          className="flex-1 px-3 py-2.5 bg-slate-100 text-slate-600 rounded-2xl text-[11px] font-black hover:bg-slate-200 transition-all active:scale-95 border border-slate-200"
                        >
                          تخفيض لمستخدم
                        </button>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <button 
                        onClick={() => handleDeactivate(user.uid)}
                        className="flex-1 px-4 py-3 bg-amber-50 text-amber-600 rounded-2xl text-xs font-black hover:bg-amber-100 transition-all flex items-center justify-center gap-2 border border-amber-100 active:scale-95"
                      >
                        <XCircle className="w-4 h-4" /> تعطيل العمل
                      </button>
                      <button 
                        onClick={() => setUserToDelete({ uid: user.uid, name: user.displayName || 'مستخدم' })}
                        className="p-3 bg-red-50 text-red-500 rounded-2xl hover:bg-red-500 hover:text-white transition-all border border-red-100 active:scale-95 group/del"
                        title="حذف نهائي"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </>
                )}
              </div>

              {/* Subtle Grid Background Pattern */}
              <div className="absolute inset-0 pointer-events-none opacity-[0.03] bg-[radial-gradient(#000_1px,transparent_1px)] [background-size:16px_16px] -z-10" />
            </motion.div>
          ))}
          {activeUsers.length === 0 && (
            <div className="col-span-full py-20 text-center bg-surface/50 rounded-[40px] border-2 border-dashed border-border flex flex-col items-center gap-4">
               <Users className="w-12 h-12 text-slate-200" />
               <p className="text-text-muted font-bold">لا يوجد عاملين نشطين حالياً</p>
            </div>
          )}
        </div>
      </section>

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
