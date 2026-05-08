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
import { ContractList } from './components/ContractList';
import { ContractForm } from './components/ContractForm';
import { AnimatePresence, motion } from 'motion/react';
import { db, auth, testConnection } from './lib/firebase';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, serverTimestamp, writeBatch } from 'firebase/firestore';
import { handleFirestoreError, OperationType } from './lib/firestoreUtils';
import { parseExcel, parseWorkersExcel, exportToExcel, exportWorkersToExcel } from './lib/excelService';
import { generatePdf } from './lib/pdfService';
import type { Bus, Worker, Contract } from './types';

function AppContent() {
  const { user, profile, loading: authLoading } = useAuth();
  const { logoURL, loading: logoLoading } = useLogo();
  const loading = authLoading || logoLoading;
  const [activeTab, setActiveTab] = useState('dashboard');
  const [buses, setBuses] = useState<Bus[]>([]);
  const [workers, setWorkers] = useState<Worker[]>([]);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBus, setEditingBus] = useState<Bus|null>(null);
  const [isWorkerFormOpen, setIsWorkerFormOpen] = useState(false);
  const [editingWorker, setEditingWorker] = useState<Worker|null>(null);
  const [isContractFormOpen, setIsContractFormOpen] = useState(false);
  const [editingContract, setEditingContract] = useState<Contract|null>(null);
  const [reportConfig, setReportConfig] = useState<{title: string, buses?: Bus[], workers?: Worker[], stats: any}|null>(null);

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

      const pathContracts = 'contracts';
      const qContracts = query(collection(db, pathContracts));
      const unsubContracts = onSnapshot(qContracts, (snapshot) => {
        const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Contract));
        setContracts(list);
      }, (error) => handleFirestoreError(error, OperationType.GET, pathContracts));

      return () => {
        unsubBuses();
        unsubWorkers();
        unsubContracts();
      };
    }
  }, [user, profile]);

  const activeWorkersCount = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    return workers.filter(w => !w.endDate || w.endDate >= today).length;
  }, [workers]);

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
            location: 'غير محدد',
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
          const newLocation = `${cleaned.clientName}${cleaned.clientName && cleaned.workplace ? ' / ' : ''}${cleaned.workplace}` || 'غير محدد';
          
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

            const logEntry = `${nextIndex}- تم تغيير الموقع في ${dateStr} من: ${newBus.location || 'غير محدد'} (عن طريق تعيين العامل ${cleaned.name})`;
            
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

      // 3. Save the worker
      if (editingWorker) {
        batch.update(doc(db, 'workers', editingWorker.id), {
          ...cleaned,
          updatedAt: serverTimestamp()
        });
      } else {
        const newDocRef = doc(collection(db, 'workers'));
        batch.set(newDocRef, {
          ...cleaned,
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

  const handleSaveContract = async (data: Partial<Contract>) => {
    try {
      const cleaned = cleanData(data);
      if (editingContract) {
        await updateDoc(doc(db, 'contracts', editingContract.id), {
          ...cleaned,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collection(db, 'contracts'), {
          ...cleaned,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          createdBy: user.uid
        });
      }
      setIsContractFormOpen(false);
      setEditingContract(null);
    } catch (error) {
      handleFirestoreError(error, editingContract ? OperationType.UPDATE : OperationType.CREATE, 'contracts');
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

          // Match by iqamaNumber OR workerNumber
          const existingWorker = workers.find(w => 
            (cleaned.iqamaNumber && w.iqamaNumber === cleaned.iqamaNumber) || 
            (cleaned.workerNumber && w.workerNumber === cleaned.workerNumber)
          );

          if (existingWorker) {
            batch.update(doc(db, 'workers', existingWorker.id), {
              ...cleaned,
              updatedAt: serverTimestamp()
            });
            updated++;
          } else {
            const newDocRef = doc(collection(db, 'workers'));
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
      
      alert(`تمت العملية بنجاح: إضافة ${added} عامل جديد وتحديث ${updated} عامل موجود`);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'workers');
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
          {activeTab === 'dashboard' && <Dashboard buses={buses} profile={profile} workersCount={activeWorkersCount} />}
          {activeTab === 'fleet' && (
            <FleetList 
              buses={buses} 
              isAdmin={true} 
              isSystemAdmin={true}
              onAdd={() => { setEditingBus(null); setIsFormOpen(true); }}
              onEdit={(bus) => { setEditingBus(bus); setIsFormOpen(true); }}
              onDelete={handleDeleteBus}
              onDeleteAll={handleDeleteAllBuses}
              onImport={handleImportExcel}
              onExport={() => exportToExcel(buses)}
              onGenerateFullPdf={() => handleGeneratePdf('تقرير أسطول الحافلات الشامل', buses)}
              onGenerateFilteredPdf={(filtered) => handleGeneratePdf('تقرير أسطول الحافلات (بناءً على الفلترة)', filtered)}
              onGenerateBusPdf={(bus) => handleGeneratePdf(`تقرير تفصيلي للحافلة - ${bus.operationalNumber}`, [bus])}
            />
          )}
          {activeTab === 'contracts' && (
            <ContractList 
              contracts={contracts}
              isAdmin={profile.role === 'admin'}
              onAdd={() => { setEditingContract(null); setIsContractFormOpen(true); }}
              onEdit={(c) => { setEditingContract(c); setIsContractFormOpen(true); }}
              onDelete={handleDeleteContract}
            />
          )}
          {activeTab === 'admin' && profile.role === 'admin' && <AdminPanel />}

          {activeTab === 'monitoring' && (
            <WorkerList 
              workers={workers}
              isAdmin={true}
              onAdd={() => { setEditingWorker(null); setIsWorkerFormOpen(true); }}
              onEdit={(w) => { setEditingWorker(w); setIsWorkerFormOpen(true); }}
              onDelete={handleDeleteWorker}
              onDeleteAll={handleDeleteAllWorkers}
              onImport={handleImportWorkersExcel}
              onExportExcel={(data) => exportWorkersToExcel(data)}
              onExportPdf={(data) => handleGenerateWorkerPdf('تقرير الرقابة والمتابعة - العمال', data)}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {isContractFormOpen && (
        <ContractForm 
          editingContract={editingContract}
          onSave={handleSaveContract}
          onClose={() => { setIsContractFormOpen(false); setEditingContract(null); }}
          isOpen={isContractFormOpen}
        />
      )}

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

      {/* Hidden report template for PDF generation */}
      <div style={{ position: 'absolute', left: '-9999px', top: 0 }}>
        {reportConfig && (
          <ReportTemplate 
            title={reportConfig.title} 
            buses={reportConfig.buses} 
            workers={reportConfig.workers}
            generatedBy={profile.displayName || 'مستخدم النظام'}
            stats={reportConfig.stats}
          />
        )}
      </div>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <LogoProvider>
        <AppContent />
      </LogoProvider>
    </AuthProvider>
  );
}
