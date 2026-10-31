/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { LogoProvider, useLogo } from './lib/LogoContext';
import { AuthPage } from './components/AuthPage';
import { Layout } from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { FleetList } from './components/FleetList';
import { AdminPanel } from './components/AdminPanel';
import { BusForm } from './components/BusForm';
import { ReportTemplate } from './components/ReportTemplates';
import { WorkerList } from './components/WorkerList';
import { WorkerForm } from './components/WorkerForm';
import { SalaryList } from './components/SalaryList';
import { CompanyDriversList } from './components/CompanyDriversList';
import { CompanyDriverFormModal } from './components/CompanyDriverFormModal';
import { DriverResponseModal } from './components/DriverResponseModal';
import { PublicDriverResponsePage } from './components/PublicDriverResponsePage';
import { WelcomeAnnouncementModal } from './components/WelcomeAnnouncementModal';
import { AnimatePresence, motion } from 'motion/react';
import { db, auth, testConnection } from './lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';
import { parseExcel, parseWorkersExcel, exportToExcel, exportWorkersToExcel, exportSalariesToExcel, exportCompanyDriversToExcel, parseCompanyDriversExcel } from './lib/excelService';
import { getGoogleSheetSettings, syncResponseToGoogleSheet } from './lib/googleSheetService';
import { generatePdf } from './lib/pdfService';
import { isDriverActiveInMonitoring } from './lib/driverUtils';
import type { Bus, Worker, SalaryRecord, CompanyDriver, DriverStatus, DriverResponse } from './types';

function AppContent({ onOpenPublicResponsePage }: { onOpenPublicResponsePage?: () => void }) {
  const { user, profile, loading: authLoading } = useAuth();
  const { logoURL, loading: logoLoading } = useLogo();
  const loading = authLoading || logoLoading;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [salaries, setSalaries] = useState<SalaryRecord[]>([]);
  const [companyDrivers, setCompanyDrivers] = useState<CompanyDriver[]>([]);
  const [driverResponses, setDriverResponses] = useState<DriverResponse[]>([]);
  const [isDriverResponseModalOpen, setIsDriverResponseModalOpen] = useState(false);
  const [prefilledResponseDriver, setPrefilledResponseDriver] = useState<CompanyDriver | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus|null>(null);
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker|null>(null);
  const [isCompanyDriverFormOpen, setIsCompanyDriverFormOpen] = useState(false);
  const [editingCompanyDriver, setEditingCompanyDriver] = useState<CompanyDriver|null>(null);
  const [reportConfig, setReportConfig] = useState<{title: string, buses?: Bus[], workers?: Worker[], salaries?: SalaryRecord[], stats: any}|null>(null);
  const [isAnnouncementModalOpen, setIsAnnouncementModalOpen] = useState(false);

  // Check if current URL is targeting the public driver response page (no auth required)
  const [isPublicResponsePage, setIsPublicResponsePage] = useState(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const hash = window.location.hash;
    const pathname = window.location.pathname;
    return (
      urlParams.get('action') === 'driver-response' ||
      urlParams.get('action') === 'response' ||
      urlParams.get('mode') === 'response' ||
      urlParams.get('view') === 'response' ||
      hash === '#driver-response' ||
      pathname.endsWith('/response')
    );
  });

  // URL Listener for direct links and route transitions
  useEffect(() => {
    const handleUrlActions = () => {
      const urlParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const pathname = window.location.pathname;
      const isPublic = (
        urlParams.get('action') === 'driver-response' ||
        urlParams.get('action') === 'response' ||
        urlParams.get('mode') === 'response' ||
        urlParams.get('view') === 'response' ||
        hash === '#driver-response' ||
        pathname.endsWith('/response')
      );
      setIsPublicResponsePage(isPublic);

      if (!isPublic && (urlParams.get('tab') === 'drivers' || hash === '#drivers')) {
        setActiveTab('drivers');
      }
    };
    handleUrlActions();
    window.addEventListener('popstate', handleUrlActions);
    return () => window.removeEventListener('popstate', handleUrlActions);
  }, []);

  useEffect(() => {
    if (user && profile?.approved) {
      // Test connection once
      testConnection().catch(e => console.error("Initial connection test failed", e));

      const pathBuses = 'buses';
      const qBuses = query(collection(db, pathBuses));
      const unsubBuses = onSnapshot(qBuses, (snapshot) => {
        const fleet = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Bus));
        setBuses(fleet);
      }, (error) => handleFirestoreError(error, OperationType.GET, pathBuses));

      const pathWorkers = 'workers';
      const qWorkers = query(collection(db, pathWorkers));
      const unsubWorkers = onSnapshot(qWorkers, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Worker));
        setWorkers(list);
      }, (error) => handleFirestoreError(error, OperationType.GET, pathWorkers));

      let unsubSalaries = () => {};
      const isPrivileged = profile?.role === 'admin';
      if (isPrivileged) {
        const pathSalaries = 'salaries';
        const qSalaries = query(collection(db, pathSalaries));
        unsubSalaries = onSnapshot(qSalaries, (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as SalaryRecord));
          setSalaries(list);
        }, (error) => handleFirestoreError(error, OperationType.GET, pathSalaries));
      }

      let unsubCompanyDrivers = () => {};
      const isAdminUser = profile?.role === 'admin';
      if (isAdminUser) {
        const pathCompanyDrivers = 'company_drivers';
        const qCompanyDrivers = query(collection(db, pathCompanyDrivers));
        unsubCompanyDrivers = onSnapshot(qCompanyDrivers, async (snapshot) => {
          const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CompanyDriver));
          
          // Guarantee unique sequential serial numbers starting from 1 with no repeats
          const missingSerial = list.filter(d => !d.serialNumber || isNaN(Number(d.serialNumber)) || Number(d.serialNumber) <= 0);
          if (missingSerial.length > 0) {
            const assignedNumbers = list
              .filter(d => d.serialNumber && !isNaN(Number(d.serialNumber)) && Number(d.serialNumber) > 0)
              .map(d => Number(d.serialNumber));
            let nextNum = assignedNumbers.length > 0 ? Math.max(...assignedNumbers) + 1 : 1;

            try {
              const batch = writeBatch(db);
              for (const driver of missingSerial) {
                batch.update(doc(db, 'company_drivers', driver.id), {
                  serialNumber: nextNum++,
                  updatedAt: serverTimestamp()
                });
              }
              await batch.commit();
            } catch (err) {
              console.error('Error backfilling serial numbers:', err);
            }
          }

          list.sort((a, b) => (Number(a.serialNumber) || 0) - (Number(b.serialNumber) || 0));
          setCompanyDrivers(list);
        }, (error) => handleFirestoreError(error, OperationType.GET, pathCompanyDrivers));
      }

      // Realtime listener for driver responses
      let unsubDriverResponses = () => {};
      const pathResponses = 'driver_responses';
      const qResponses = query(collection(db, pathResponses));
      unsubDriverResponses = onSnapshot(qResponses, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DriverResponse));
        // Sort newest responses first
        list.sort((a, b) => {
          const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || a.createdDate || 0).getTime();
          const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || b.createdDate || 0).getTime();
          return timeB - timeA;
        });
        setDriverResponses(list);
      }, (error) => handleFirestoreError(error, OperationType.GET, pathResponses));

      return () => {
        unsubBuses();
        unsubWorkers();
        unsubSalaries();
        unsubCompanyDrivers();
        unsubDriverResponses();
      };
    }
  }, [user, profile]);

  const isSuperAdmin = profile?.role === 'admin';
  const isBusSupervisor = profile?.role === 'bus_supervisor' || profile?.role === 'inspector' || profile?.role === 'supervisor' || profile?.role === 'operator';
  const isReadOnly = profile?.role === 'readonly';

  // Only super admin has edit privileges (adding, editing, deleting, importing)
  // Readonly users are strictly prevented from any edits or changes
  const canEdit = isSuperAdmin;

  // Protect tabs based on user role:
  // 1. Bus Supervisor: restricted ONLY to Dashboard (الصفحة الرئيسية فقط)
  // 2. Read-only: allowed Dashboard, Fleet, and Monitoring only. Forbidden from: drivers, salaries, admin.
  // 3. Super Admin: full access to all tabs.
  useEffect(() => {
    if (isBusSupervisor && activeTab !== 'dashboard') {
      setActiveTab('dashboard');
    } else if (isReadOnly && (activeTab === 'salaries' || activeTab === 'admin' || activeTab === 'drivers')) {
      setActiveTab('dashboard');
    } else if (!isSuperAdmin && (activeTab === 'admin' || activeTab === 'drivers' || activeTab === 'salaries')) {
      setActiveTab('dashboard');
    }
  }, [activeTab, isBusSupervisor, isReadOnly, isSuperAdmin]);

  const activeWorkersCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return workers.filter(w => !w.endDate || w.endDate >= today).length;
  }, [workers]);

  // Public standalone driver response portal (no authentication required)
  if (isPublicResponsePage) {
    return <PublicDriverResponsePage />;
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-background" dir="rtl">
      <div className="flex flex-col items-center gap-6">
        <motion.div 
          animate={{ scale: [1, 1.05, 1], opacity: [0.8, 1, 0.8] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="w-24 h-24 bg-white p-2 rounded-3xl shadow-xl border border-border flex items-center justify-center"
        >
          <img 
            src={logoURL} 
            alt="Logo" 
            className="w-full h-full object-contain"
          />
        </motion.div>
        <div className="text-xl font-black text-primary animate-pulse">جاري تحضير النظام...</div>
      </div>
    </div>
  );
  if (!user || !profile?.approved) return <AuthPage />;

  const handleSaveBus = async (data: Partial<Bus>) => {
    try {
      const cleaned = cleanData(data);
      if (editingBus) {
        await updateDoc(doc(db, 'buses', editingBus.id), {
          ...cleaned,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'buses'), {
          ...cleaned,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid
        });
      }
      setIsFormOpen(false);
      setEditingBus(null);
    } catch (error) {
      handleFirestoreError(error, editingBus ? OperationType.UPDATE : OperationType.CREATE, 'buses');
    }
  };

  const handleSaveWorker = async (data: Omit<Worker, 'id'>) => {
    try {
      const cleaned = cleanData(data);
      const batch = writeBatch(db);
      
      const oldBusId = editingWorker?.assignedBusId;
      const newBusId = cleaned.assignedBusId;

      // 1. Handle old bus unlinking
      if (oldBusId && oldBusId !== newBusId) {
        const oldBus = buses.find(b => b.id === oldBusId);
        if (oldBus) {
          batch.update(doc(db, 'buses', oldBusId), {
            location: 'في الشركة',
            updatedAt: serverTimestamp()
          });
        }
      }

      // 2. Handle new bus linking and sync location
      if (newBusId) {
        // First, unassign other workers from this bus
        const otherWorkersWithSameBus = workers.filter(w => 
          w.assignedBusId === newBusId && w.id !== (editingWorker?.id || '')
        );

        for (const other of otherWorkersWithSameBus) {
          batch.update(doc(db, 'workers', other.id), {
            assignedBusId: '',
            assignedBusOperationalNumber: '',
            updatedAt: serverTimestamp()
          });
        }

        // Update the new bus's location to match worker's workplace/client
        const newBus = buses.find(b => b.id === newBusId);
        if (newBus) {
          const newLocation = `${cleaned.clientName}${cleaned.clientName && cleaned.workplace ? ' / ' : ''}${cleaned.workplace}` || 'في الشركة';
          
          if (newBus.location !== newLocation) {
            let finalNotes = newBus.notes || '';
            const today = new Date();
            const dateStr = today.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
            const historyHeader = "--- سجل المواقع السابقة ---";
            let nextIndex = 1;

            if (finalNotes.includes(historyHeader)) {
              const historyPart = finalNotes.split(historyHeader)[1];
              const matches = historyPart.match(/\d+-\s/g);
              if (matches) nextIndex = matches.length + 1;
            }

            const logEntry = `${nextIndex}- تم تغيير الموقع في ${dateStr} من: ${newBus.location || 'في الشركة'} (عن طريق تعيين العامل ${cleaned.name})`;
            
            if (!finalNotes.includes(historyHeader)) {
              finalNotes = finalNotes ? `${finalNotes}\n\n${historyHeader}\n${logEntry}` : `${historyHeader}\n${logEntry}`;
            } else {
              finalNotes = `${finalNotes}\n${logEntry}`;
            }

            batch.update(doc(db, 'buses', newBusId), {
              location: newLocation,
              notes: finalNotes,
              updatedAt: serverTimestamp()
            });
          }
        }
      }

      // Enforce no duplicate worker based on iqamaNumber or nationalId
      const cleanIqama = cleaned.iqamaNumber ? String(cleaned.iqamaNumber).trim() : '';
      const cleanNationalId = cleaned.nationalId ? String(cleaned.nationalId).trim() : '';

      if (cleanIqama) {
        const existingIqamaWorker = workers.find(w => 
          w.id !== (editingWorker?.id || '') && 
          ((w.iqamaNumber && String(w.iqamaNumber).trim() === cleanIqama) || (w.nationalId && String(w.nationalId).trim() === cleanIqama))
        );
        if (existingIqamaWorker) {
          alert(`خطأ: رقم الإقامة (${cleanIqama}) مسجل بالفعل للعامل "${existingIqamaWorker.name}" (رقم العامل: ${existingIqamaWorker.workerNumber}). لا يمكن إضافة العامل مرتين.`);
          return;
        }
      }

      if (cleanNationalId) {
        const existingNationalWorker = workers.find(w => 
          w.id !== (editingWorker?.id || '') && 
          ((w.iqamaNumber && String(w.iqamaNumber).trim() === cleanNationalId) || (w.nationalId && String(w.nationalId).trim() === cleanNationalId))
        );
        if (existingNationalWorker) {
          alert(`خطأ: رقم الهوية (${cleanNationalId}) مسجل بالفعل للعامل "${existingNationalWorker.name}" (رقم العامل: ${existingNationalWorker.workerNumber}). لا يمكن إضافة العامل مرتين.`);
          return;
        }
      }

      // 3. Save the worker
      if (editingWorker) {
        // Enforce no duplicates for workerNumber
        const duplicate = workers.find(w => w.workerNumber === cleaned.workerNumber && w.id !== editingWorker.id);
        if (duplicate) {
          alert(`خطأ: رقم العامل ${cleaned.workerNumber} مكرر ومسجل بالفعل لعامل آخر باسم (${duplicate.name})`);
          return;
        }

        batch.update(doc(db, 'workers', editingWorker.id), {
          ...cleaned,
          updatedAt: serverTimestamp()
        });

        // If the worker number changed, update all corresponding salary records
        if (editingWorker.workerNumber !== cleaned.workerNumber) {
          const assocSalaries = salaries.filter(s => s.workerId === editingWorker.id);
          assocSalaries.forEach(salary => {
            batch.update(doc(db, 'salaries', salary.id), {
              workerNumber: cleaned.workerNumber,
              updatedAt: serverTimestamp()
            });
          });
        }
      } else {
        // Find the absolute next sequential available number
        const numbers = workers
          .map(w => parseInt(w.workerNumber, 10))
          .filter(num => !isNaN(num) && isFinite(num));
        const max = numbers.length > 0 ? Math.max(...numbers) : 0;
        const nextNum = (max + 1).toString();

        const newDocRef = doc(collection(db, 'workers'));
        batch.set(newDocRef, {
          ...cleaned,
          workerNumber: nextNum, // Guaranteed sequential and unique
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid
        });
      }

      await batch.commit();
      setIsWorkerFormOpen(false);
      setEditingWorker(null);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workers');
    }
  };

  const handleSaveSalary = async (data: Omit<SalaryRecord, 'id'>) => {
    try {
      await addDoc(collection(db, 'salaries'), {
        ...data,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'salaries');
    }
  };

  const handleUpdateSalary = async (id: string, updates: Partial<SalaryRecord>) => {
    try {
      await updateDoc(doc(db, 'salaries', id), {
        ...updates,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `salaries/${id}`);
    }
  };

  const cleanData = (data: any) => {
    const cleaned = { ...data };
    Object.keys(cleaned).forEach(key => {
      if (cleaned[key] === undefined) {
        delete cleaned[key];
      }
    });
    return cleaned;
  };

  const handleDeleteBus = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'buses', id));
      alert('تم حذف الحافلة بنجاح.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `buses/${id}`);
    }
  };

  const handleDeleteWorker = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'workers', id));
      alert('تم حذف بيانات العامل بنجاح.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `workers/${id}`);
    }
  };

  const handleDeleteContract = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'contracts', id));
      alert('تم حذف العقد بنجاح.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `contracts/${id}`);
    }
  };

  const handleDeleteAllBuses = async () => {
    if (buses.length === 0) {
      alert('لا توجد حافلات لحذفها حالياً.');
      return;
    }

    try {
      const batch = writeBatch(db);
      buses.forEach(bus => {
        batch.delete(doc(db, 'buses', bus.id));
      });
      await batch.commit();
      alert('تم حذف جميع الحافلات بنجاح.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'buses');
    }
  };

  const handleDeleteAllWorkers = async () => {
    if (workers.length === 0) {
      alert('لا توجد بيانات عمال لحذفها حالياً.');
      return;
    }

    try {
      const batch = writeBatch(db);
      workers.forEach(worker => {
        batch.delete(doc(db, 'workers', worker.id));
      });
      await batch.commit();
      alert('تم حذف جميع بيانات العمال بنجاح.');
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'workers');
    }
  };

  const handleRenumberWorkers = async () => {
    if (workers.length === 0) {
      alert('لا توجد بيانات عمال لإعادة ترقيمها.');
      return;
    }

    const confirmRenumber = window.confirm(
      'هل أنت متأكد من رغبتك في إعادة ترقيم جميع العمال الحاليين بشكل متسلسل وتحديث كافة سجلات الرواتب المرتبطة بهم؟ لا يمكن التراجع عن هذه العملية.'
    );
    if (!confirmRenumber) return;

    try {
      // Sort workers to preserve order as much as possible (numerical sorting first, name fallback)
      const sortedWorkers = [...workers].sort((a, b) => {
        const numA = parseInt(a.workerNumber, 10);
        const numB = parseInt(b.workerNumber, 10);
        const isNumA = !isNaN(numA) && isFinite(numA);
        const isNumB = !isNaN(numB) && isFinite(numB);
        
        if (isNumA && isNumB) {
          if (numA !== numB) return numA - numB;
          return (a.name || '').localeCompare(b.name || '');
        }
        if (isNumA) return -1;
        if (isNumB) return 1;
        return (a.name || '').localeCompare(b.name || '');
      });

      const updates: { ref: any; data: any }[] = [];
      let index = 1;

      for (const worker of sortedWorkers) {
        const newNum = String(index);
        
        // Unconditionally update to ensure perfect sequential numbering and no skipped duplicates
        updates.push({
          ref: doc(db, 'workers', worker.id),
          data: {
            workerNumber: newNum,
            updatedAt: serverTimestamp()
          }
        });

        // Find and update all associated salary records in Firestore to match
        const assocSalaries = salaries.filter(s => s.workerId === worker.id);
        assocSalaries.forEach(salary => {
          updates.push({
            ref: doc(db, 'salaries', salary.id),
            data: {
              workerNumber: newNum,
              updatedAt: serverTimestamp()
            }
          });
        });

        index++;
      }

      if (updates.length > 0) {
        // Execute updates in chunks of 250 to comply with Firestore transaction/batch limits safely
        const CHUNK_SIZE = 250;
        for (let i = 0; i < updates.length; i += CHUNK_SIZE) {
          const chunk = updates.slice(i, i + CHUNK_SIZE);
          const chunkBatch = writeBatch(db);
          for (const item of chunk) {
            chunkBatch.update(item.ref, item.data);
          }
          await chunkBatch.commit();
        }
        alert(`تمت إعادة ترقيم العمال بنجاح وتحديث كافة سجلات الرواتب التابعة لهم. (تم تحديث إجمالي ${updates.length} مستنداً)`);
      } else {
        alert('جميع العمال مرتبون تسلسلياً بالفعل، لا توجد تغييرات مطلوبة.');
      }
    } catch (error) {
      console.error('Error renumbering workers:', error);
      alert('حدث خطأ أثناء إعادة الترقيم: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseExcel(file);
      let added = 0;
      let updated = 0;
      
      // Process in chunks of 500 for Firestore batch limits
      const chunkSize = 500;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        
        for (const busData of chunk) {
          const cleaned = cleanData(busData);
          // Match by operationalNumber OR plateNumber
          const existingBus = buses.find(b => 
            (cleaned.operationalNumber && b.operationalNumber === cleaned.operationalNumber) || 
            (cleaned.plateNumber && b.plateNumber === cleaned.plateNumber)
          );

          if (existingBus) {
            batch.update(doc(db, 'buses', existingBus.id), {
              ...cleaned,
              updatedAt: serverTimestamp()
            });
            updated++;
          } else {
            const newDocRef = doc(collection(db, 'buses'));
            batch.set(newDocRef, {
              ...cleaned,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: user.uid
            });
            added++;
          }
        }
        await batch.commit();
      }
      
      alert(`تمت العملية بنجاح: إضافة ${added} حافلة جديدة وتحديث ${updated} حافلة موجودة`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'buses');
    }
  };

  const handleImportWorkersExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseWorkersExcel(file);
      let added = 0;
      let updated = 0;

      // Keep track of maximum worker number to assign new ones sequentially
      let currentMaxNum = workers.reduce((max, w) => {
        const val = parseInt(w.workerNumber, 10);
        return (!isNaN(val) && val > max) ? val : max;
      }, 0);

      // Keep track of all workers dynamically during import to prevent duplicates
      let importedWorkersTracker = [...workers];

      const chunkSize = 500;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        for (const workerData of chunk) {
          const cleaned = cleanData(workerData);
          
          // Resolve bus ID if operational number is provided
          if (cleaned.assignedBusOperationalNumber && cleaned.assignedBusOperationalNumber !== 'غير مرتبط') {
            const bus = buses.find(b => b.operationalNumber === cleaned.assignedBusOperationalNumber);
            if (bus) {
              cleaned.assignedBusId = bus.id;
            }
          }

          const cleanIqama = cleaned.iqamaNumber ? String(cleaned.iqamaNumber).trim() : '';
          const cleanNationalId = cleaned.nationalId ? String(cleaned.nationalId).trim() : '';
          const cleanWorkerNum = cleaned.workerNumber ? String(cleaned.workerNumber).trim() : '';

          // Match by iqamaNumber OR nationalId OR workerNumber in our dynamic tracker
          const existingWorkerIndex = importedWorkersTracker.findIndex(w => {
            const wIqama = w.iqamaNumber ? String(w.iqamaNumber).trim() : '';
            const wNational = w.nationalId ? String(w.nationalId).trim() : '';
            const wNum = w.workerNumber ? String(w.workerNumber).trim() : '';

            if (cleanIqama && (wIqama === cleanIqama || wNational === cleanIqama)) return true;
            if (cleanNationalId && (wIqama === cleanNationalId || wNational === cleanNationalId)) return true;
            if (cleanWorkerNum && wNum === cleanWorkerNum) return true;

            return false;
          });

          if (existingWorkerIndex !== -1) {
            const existingWorker = importedWorkersTracker[existingWorkerIndex];
            const resolvedWorkerNumber = existingWorker.workerNumber || String(++currentMaxNum);
            
            batch.update(doc(db, 'workers', existingWorker.id), {
              ...cleaned,
              workerNumber: resolvedWorkerNumber,
              updatedAt: serverTimestamp()
            });

            // Update our tracker
            importedWorkersTracker[existingWorkerIndex] = {
              ...existingWorker,
              ...cleaned,
              workerNumber: resolvedWorkerNumber
            };
            updated++;
          } else {
            const nextNum = String(++currentMaxNum);
            const newDocRef = doc(collection(db, 'workers'));
            batch.set(newDocRef, {
              ...cleaned,
              workerNumber: nextNum,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: user.uid
            });

            // Add to tracker
            importedWorkersTracker.push({
              id: newDocRef.id,
              ...cleaned,
              workerNumber: nextNum
            } as any);
            added++;
          }
        }
        await batch.commit();
      }
      
      alert(`تمت العملية بنجاح: إضافة ${added} عامل جديد وتحديث ${updated} عامل موجود`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workers');
    }
  };

  const handleSaveCompanyDriver = async (data: Partial<CompanyDriver>) => {
    try {
      const cleaned = cleanData(data);
      const cleanIqama = cleaned.iqamaNumber ? String(cleaned.iqamaNumber).trim() : '';
      const cleanBorder = cleaned.borderNumber ? String(cleaned.borderNumber).trim() : '';

      if (cleanIqama) {
        const dup = companyDrivers.find(d => 
          d.id !== editingCompanyDriver?.id && 
          d.iqamaNumber && 
          String(d.iqamaNumber).trim() === cleanIqama
        );
        if (dup) {
          throw new Error(`رقم الإقامة (${cleanIqama}) مسجل مسبقاً للسائق: "${dup.fullName}" ولا يمكن تكراره.`);
        }
      }

      if (cleanBorder) {
        const dup = companyDrivers.find(d => 
          d.id !== editingCompanyDriver?.id && 
          d.borderNumber && 
          String(d.borderNumber).trim() === cleanBorder
        );
        if (dup) {
          throw new Error(`رقم الحدود (${cleanBorder}) مسجل مسبقاً للسائق: "${dup.fullName}" ولا يمكن تكراره.`);
        }
      }

      const nowIso = new Date().toISOString();
      const finalStatus = cleaned.status || 'نشط';
      const finalStatusDate = cleaned.statusUpdatedAt || nowIso;

      // Auto classify as 'نقل عمال' if driver is active in monitoring (الرقابة والمتابعة)
      const isMonitoringActive = isDriverActiveInMonitoring({ iqamaNumber: cleanIqama }, workers);
      const finalClassification = isMonitoringActive ? 'نقل عمال' : (cleaned.driverClassification || 'نقل عمال');

      if (editingCompanyDriver) {
        await updateDoc(doc(db, 'company_drivers', editingCompanyDriver.id), {
          ...cleaned,
          driverClassification: finalClassification,
          workplace: finalClassification,
          serialNumber: editingCompanyDriver.serialNumber || (companyDrivers.findIndex(d => d.id === editingCompanyDriver.id) + 1),
          status: finalStatus,
          statusUpdatedAt: finalStatusDate,
          updatedAt: serverTimestamp()
        });
      } else {
        // Find highest existing serialNumber to assign the next sequential non-repeating number starting from 1
        const serials = companyDrivers
          .map(d => Number(d.serialNumber))
          .filter(n => !isNaN(n) && isFinite(n) && n > 0);
        const maxSerial = serials.length > 0 ? Math.max(...serials) : 0;
        const nextSerial = maxSerial + 1;

        await addDoc(collection(db, 'company_drivers'), {
          ...cleaned,
          driverClassification: finalClassification,
          workplace: finalClassification,
          serialNumber: nextSerial,
          status: finalStatus,
          statusUpdatedAt: finalStatusDate,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid
        });
      }
      setIsCompanyDriverFormOpen(false);
      setEditingCompanyDriver(null);
    } catch (error) {
      if (error instanceof Error && error.message.includes('مسجل مسبقاً')) {
        throw error;
      }
      handleFirestoreError(error, editingCompanyDriver ? OperationType.UPDATE : OperationType.CREATE, 'company_drivers');
    }
  };

  const handleSaveDriverResponse = async (data: Omit<DriverResponse, 'id'>) => {
    try {
      const cleaned = cleanData(data);
      await addDoc(collection(db, 'driver_responses'), {
        ...cleaned,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: user?.uid
      });

      // Background sync to Google Sheet if configured
      getGoogleSheetSettings().then(settings => {
        if (settings.webhookUrl) {
          syncResponseToGoogleSheet(settings.webhookUrl, {
            driverSerialNumber: cleaned.driverSerialNumber,
            driverName: cleaned.driverName,
            busNumber: cleaned.busNumber,
            responseType: cleaned.responseType,
            notes: cleaned.notes,
            createdDate: cleaned.createdDate
          }).catch(e => console.warn('Background Google Sheet sync warning:', e));
        }
      }).catch(() => {});

      alert('تم تسجيل الرد وتنزيله في بطاقة السائق بنجاح.');
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'driver_responses');
    }
  };

  const handleDeleteDriverResponse = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'driver_responses', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `driver_responses/${id}`);
    }
  };

  const handleUpdateCompanyDriverStatus = async (id: string, newStatus: DriverStatus, reason?: string) => {
    try {
      const updateData: any = {
        status: newStatus,
        statusUpdatedAt: new Date().toISOString(),
        updatedAt: serverTimestamp()
      };
      if (reason !== undefined) {
        updateData.statusReason = reason;
      }
      await updateDoc(doc(db, 'company_drivers', id), updateData);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, 'company_drivers');
    }
  };

  const handleDeleteCompanyDriver = async (id: string) => {
    try {
      await deleteDoc(doc(db, 'company_drivers', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'company_drivers');
    }
  };

  const handleDeleteAllCompanyDrivers = async () => {
    try {
      const chunkSize = 500;
      for (let i = 0; i < companyDrivers.length; i += chunkSize) {
        const chunk = companyDrivers.slice(i, i + chunkSize);
        const batch = writeBatch(db);
        for (const driver of chunk) {
          batch.delete(doc(db, 'company_drivers', driver.id));
        }
        await batch.commit();
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, 'company_drivers');
    }
  };

  const handleImportCompanyDriversExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const data = await parseCompanyDriversExcel(file, workers);
      let added = 0;
      let updated = 0;

      let importedDriversTracker = [...companyDrivers];
      let currentMaxSerial = companyDrivers.reduce((max, d) => Math.max(max, Number(d.serialNumber) || 0), 0);
      const chunkSize = 500;
      for (let i = 0; i < data.length; i += chunkSize) {
        const chunk = data.slice(i, i + chunkSize);
        const batch = writeBatch(db);

        for (const driverData of chunk) {
          const cleaned = cleanData(driverData);
          const cleanIqama = cleaned.iqamaNumber ? String(cleaned.iqamaNumber).trim() : '';
          const cleanBorder = cleaned.borderNumber ? String(cleaned.borderNumber).trim() : '';
          const cleanName = cleaned.fullName ? String(cleaned.fullName).trim() : '';

          const existingIndex = importedDriversTracker.findIndex(d => {
            const dIqama = d.iqamaNumber ? String(d.iqamaNumber).trim() : '';
            const dBorder = d.borderNumber ? String(d.borderNumber).trim() : '';
            const dName = d.fullName ? String(d.fullName).trim() : '';

            if (cleanIqama && dIqama && dIqama === cleanIqama) return true;
            if (cleanBorder && dBorder && dBorder === cleanBorder) return true;
            if (cleanName && dName && dName === cleanName) return true;
            return false;
          });

          if (existingIndex !== -1) {
            const existingDriver = importedDriversTracker[existingIndex];
            const resolvedSerial = existingDriver.serialNumber || ++currentMaxSerial;
            batch.update(doc(db, 'company_drivers', existingDriver.id), {
              ...cleaned,
              serialNumber: resolvedSerial,
              updatedAt: serverTimestamp()
            });
            importedDriversTracker[existingIndex] = {
              ...existingDriver,
              ...cleaned,
              serialNumber: resolvedSerial
            };
            updated++;
          } else {
            const nextSerial = ++currentMaxSerial;
            const newDocRef = doc(collection(db, 'company_drivers'));
            batch.set(newDocRef, {
              ...cleaned,
              serialNumber: nextSerial,
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
              createdBy: user.uid
            });
            importedDriversTracker.push({
              id: newDocRef.id,
              ...cleaned,
              serialNumber: nextSerial
            } as any);
            added++;
          }
        }
        await batch.commit();
      }

      alert(`تم استيراد سائقي الشركة بنجاح: إضافة ${added} سائق جديد وتحديث ${updated} سائق موجود.`);
      e.target.value = '';
    } catch (error) {
      console.error('Error importing company drivers:', error);
      alert('حدث خطأ أثناء استيراد ملف إكسل للسائقين: ' + (error instanceof Error ? error.message : String(error)));
    }
  };

  const handleGeneratePdf = async (title: string, data: Bus[]) => {
    const locationCounts = data.reduce((acc: any, b) => {
      acc[b.location] = (acc[b.location] || 0) + 1;
      return acc;
    }, {});

    setReportConfig({
      title,
      buses: data,
      stats: {
        'إجمالي الحافلات': data.length,
        'عدد المواقع': Object.keys(locationCounts).length,
        'أحدث موديل': Math.max(...data.map(b => Number(b.model) || 0)),
        'بانتظار الصيانة': data.filter(b => b.technicalStatus?.includes('صيانة')).length
      }
    });

    // Wait for state to reflect in hidden element
    setTimeout(async () => {
      await generatePdf('pdf-report', `${title}.pdf`);
    }, 500);
  };

  const handleGenerateWorkerPdf = async (title: string, data: Worker[]) => {
    const today = new Date().toISOString().split('T')[0];
    const activeData = data.filter(w => !w.endDate || w.endDate >= today);
    
    const clientCounts = activeData.reduce((acc: any, w) => {
      acc[w.clientName] = (acc[w.clientName] || 0) + 1;
      return acc;
    }, {});

    setReportConfig({
      title,
      workers: data, // Keep all data for the list
      stats: {
        'إجمالي العمال (النشطين)': activeData.length,
        'عدد العملاء النشطين': Object.keys(clientCounts).length,
        'مواقع العمل النشطة': Array.from(new Set(activeData.map(w => w.workplace))).length,
        'شركات الاستقدام النشطة': Array.from(new Set(activeData.map(w => w.recruitmentCompany))).length
      }
    });

    setTimeout(async () => {
      await generatePdf('pdf-report', `${title}.pdf`);
    }, 500);
  };

  const handleGenerateSalaryPdf = async (config: { title: string; salaries: SalaryRecord[]; stats: any }) => {
    setReportConfig({
      title: config.title,
      salaries: config.salaries,
      stats: config.stats
    });

    setTimeout(async () => {
      await generatePdf('pdf-report', `${config.title}.pdf`);
    }, 500);
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <AnimatePresence mode="wait">
        <motion.div
           key={activeTab}
           initial={{ opacity: 0, x: 20 }}
           animate={{ opacity: 1, x: 0 }}
           exit={{ opacity: 0, x: -20 }}
           transition={{ duration: 0.2, ease: "easeInOut" }}
           className="w-full h-full"
        >
          {activeTab === 'dashboard' && (
            <Dashboard 
              buses={buses} 
              workers={workers} 
              profile={profile} 
              workersCount={activeWorkersCount}
              driverResponses={driverResponses}
              companyDrivers={companyDrivers}
              onOpenResponsePage={onOpenPublicResponsePage}
              onOpenAnnouncement={() => setIsAnnouncementModalOpen(true)}
              onNavigateToDrivers={() => setActiveTab('drivers')}
              onNavigateToFleet={() => setActiveTab('fleet')}
            />
          )}
          {activeTab === 'fleet' && (
            <FleetList 
              buses={buses} 
              isAdmin={isSuperAdmin} 
              isSystemAdmin={isSuperAdmin}
              canEdit={canEdit}
              onAdd={canEdit ? () => { setEditingBus(null); setIsFormOpen(true); } : undefined}
              onEdit={canEdit ? (bus) => { setEditingBus(bus); setIsFormOpen(true); } : undefined}
              onDelete={isSuperAdmin ? handleDeleteBus : undefined}
              onDeleteAll={isSuperAdmin ? handleDeleteAllBuses : undefined}
              onImport={canEdit ? handleImportExcel : undefined}
              onExport={(data) => exportToExcel(data)}
              onGenerateFullPdf={(data) => handleGeneratePdf('تقرير أسطول الحافلات الشامل', data)}
              onGenerateFilteredPdf={(filtered) => handleGeneratePdf('تقرير أسطول الحافلات (بناءً على الفلترة)', filtered)}
              onGenerateBusPdf={(bus) => handleGeneratePdf(`تقرير تفصيلي للحافلة - ${bus.operationalNumber}`, [bus])}
            />
          )}
          {activeTab === 'salaries' && canEdit && (
            <SalaryList 
              workers={workers}
              salaries={salaries}
              isAdmin={isSuperAdmin}
              onSaveSalary={handleSaveSalary}
              onUpdateSalary={handleUpdateSalary}
              onExportExcel={(data) => exportSalariesToExcel(data)}
              onGeneratePDF={handleGenerateSalaryPdf}
            />
          )}
          {activeTab === 'admin' && isSuperAdmin && <AdminPanel />}

          {activeTab === 'drivers' && isSuperAdmin && (
            <CompanyDriversList 
              drivers={companyDrivers}
              workers={workers}
              isAdmin={isSuperAdmin}
              driverResponses={driverResponses}
              onOpenDriverResponse={(driver) => {
                setPrefilledResponseDriver(driver || null);
                setIsDriverResponseModalOpen(true);
              }}
              onOpenPublicResponsePage={onOpenPublicResponsePage}
              onDeleteDriverResponse={handleDeleteDriverResponse}
              onAdd={() => { setEditingCompanyDriver(null); setIsCompanyDriverFormOpen(true); }}
              onEdit={(driver) => { setEditingCompanyDriver(driver); setIsCompanyDriverFormOpen(true); }}
              onDelete={handleDeleteCompanyDriver}
              onDeleteAll={handleDeleteAllCompanyDrivers}
              onStatusChange={handleUpdateCompanyDriverStatus}
              onImport={handleImportCompanyDriversExcel}
              onExport={(data) => exportCompanyDriversToExcel(data, workers)}
            />
          )}

          {activeTab === 'monitoring' && (
            <WorkerList 
              workers={workers}
              isAdmin={isSuperAdmin}
              canEdit={canEdit}
              onAdd={canEdit ? () => { setEditingWorker(null); setIsWorkerFormOpen(true); } : undefined}
              onEdit={canEdit ? (w) => { setEditingWorker(w); setIsWorkerFormOpen(true); } : undefined}
              onDelete={isSuperAdmin ? handleDeleteWorker : undefined}
              onDeleteAll={isSuperAdmin ? handleDeleteAllWorkers : undefined}
              onImport={canEdit ? handleImportWorkersExcel : undefined}
              onExportExcel={(data) => exportWorkersToExcel(data)}
              onExportPdf={(data) => handleGenerateWorkerPdf('تقرير الرقابة والمتابعة - العمال', data)}
              onRenumberWorkers={isSuperAdmin ? handleRenumberWorkers : undefined}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {isFormOpen && (
        <BusForm 
          bus={editingBus} 
          onSave={handleSaveBus} 
          onClose={() => { setIsFormOpen(false); setEditingBus(null); }} 
        />
      )}

      {isWorkerFormOpen && (
        <WorkerForm 
          worker={editingWorker}
          allWorkers={workers}
          buses={buses}
          onSave={handleSaveWorker}
          onClose={() => { setIsWorkerFormOpen(false); setEditingWorker(null); }}
        />
      )}

      {isCompanyDriverFormOpen && (
        <CompanyDriverFormModal 
          driver={editingCompanyDriver}
          existingDrivers={companyDrivers}
          buses={buses}
          workers={workers}
          isOpen={isCompanyDriverFormOpen}
          onSave={handleSaveCompanyDriver}
          onClose={() => { setIsCompanyDriverFormOpen(false); setEditingCompanyDriver(null); }}
        />
      )}

      {isDriverResponseModalOpen && (
        <DriverResponseModal
          isOpen={isDriverResponseModalOpen}
          onClose={() => {
            setIsDriverResponseModalOpen(false);
            setPrefilledResponseDriver(null);
          }}
          drivers={companyDrivers}
          buses={buses}
          prefilledDriver={prefilledResponseDriver}
          onSave={handleSaveDriverResponse}
        />
      )}

      {/* Hidden report template for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {reportConfig && (
          <ReportTemplate 
            title={reportConfig.title} 
            buses={reportConfig.buses} 
            workers={reportConfig.workers}
            salaries={reportConfig.salaries}
            generatedBy={profile.displayName || 'مستخدم النظام'}
            stats={reportConfig.stats}
          />
        )}
      </div>

      {/* First-visit & On-demand Welcome Announcement Modal */}
      <WelcomeAnnouncementModal 
        forceOpen={isAnnouncementModalOpen}
        onClose={() => setIsAnnouncementModalOpen(false)}
      />
    </Layout>
  );
}

function isPublicResponseUrl(): boolean {
  if (typeof window === 'undefined') return false;
  const urlParams = new URLSearchParams(window.location.search);
  const hash = window.location.hash;
  const pathname = window.location.pathname;
  return (
    urlParams.get('action') === 'driver-response' ||
    urlParams.get('action') === 'response' ||
    urlParams.get('mode') === 'response' ||
    urlParams.get('view') === 'response' ||
    urlParams.get('page') === 'response' ||
    hash === '#driver-response' ||
    hash === '#response' ||
    pathname.endsWith('/response')
  );
}

export default function App() {
  const [showPublicResponse, setShowPublicResponse] = useState(isPublicResponseUrl);

  useEffect(() => {
    const handleUrl = () => setShowPublicResponse(isPublicResponseUrl());
    window.addEventListener('popstate', handleUrl);
    window.addEventListener('hashchange', handleUrl);
    return () => {
      window.removeEventListener('popstate', handleUrl);
      window.removeEventListener('hashchange', handleUrl);
    };
  }, []);

  if (showPublicResponse) {
    return (
      <LogoProvider>
        <PublicDriverResponsePage 
          onBackToDashboard={() => {
            setShowPublicResponse(false);
            try {
              const url = new URL(window.location.href);
              url.searchParams.delete('action');
              url.searchParams.delete('mode');
              url.searchParams.delete('view');
              url.searchParams.delete('page');
              url.hash = '';
              window.history.pushState({}, '', url.pathname + (url.search ? url.search : ''));
            } catch {
              // ignore
            }
          }} 
        />
        <WelcomeAnnouncementModal />
      </LogoProvider>
    );
  }

  return (
    <AuthProvider>
      <LogoProvider>
        <AppContent 
          onOpenPublicResponsePage={() => {
            setShowPublicResponse(true);
            try {
              const url = new URL(window.location.href);
              url.searchParams.set('action', 'driver-response');
              window.history.pushState({}, '', url.pathname + '?' + url.searchParams.toString());
            } catch {
              // ignore
            }
          }} 
        />
      </LogoProvider>
    </AuthProvider>
  );
}
