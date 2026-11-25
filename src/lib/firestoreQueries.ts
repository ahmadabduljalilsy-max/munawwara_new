import { useEffect, useRef, useState } from 'react';
import { QueryClient } from '@tanstack/react-query';
import {
  collection,
  doc,
  documentId,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot
} from 'firebase/firestore';
import { db } from './firebase';
import { handleFirestoreError, OperationType } from './firestoreUtils';
import type { AppUser, Bus, CompanyDriver, DriverResponse, SalaryRecord, Worker } from '../types';

export const FIRESTORE_PAGE_SIZE = 50;

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60_000, // 1 min fresh window (stale-while-revalidate feel via local cache + RQ)
      gcTime: 10 * 60_000,
      refetchOnWindowFocus: false,
      retry: 1
    }
  }
});

export const queryKeys = {
  buses: ['buses'] as const,
  workers: ['workers'] as const,
  workersFull: ['workers', 'full'] as const,
  workerDetail: (id: string) => ['workers', 'detail', id] as const,
  salaries: ['salaries'] as const,
  companyDrivers: ['company_drivers'] as const,
  driverResponses: ['driver_responses'] as const,
  users: ['users'] as const,
  settingsApp: ['settings', 'app'] as const
};

export interface PaginatedResult<T> {
  items: T[];
  lastCursor: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
}

/**
 * Fetches a bounded page (default 50) from any Firestore collection with optional where/orderBy constraints.
 */
export async function fetchCollectionPage<T>(
  collectionName: string,
  options: {
    pageSize?: number;
    cursor?: QueryDocumentSnapshot<DocumentData> | null;
    constraints?: QueryConstraint[];
    orderByField?: string;
    orderDirection?: 'asc' | 'desc';
  } = {}
): Promise<PaginatedResult<T>> {
  const {
    pageSize = FIRESTORE_PAGE_SIZE,
    cursor = null,
    constraints = [],
    orderByField,
    orderDirection = 'asc'
  } = options;

  try {
    const queryParts: QueryConstraint[] = [...constraints];
    if (orderByField) {
      queryParts.push(orderBy(orderByField, orderDirection));
    } else {
      queryParts.push(orderBy(documentId()));
    }
    if (cursor) {
      queryParts.push(startAfter(cursor));
    }
    queryParts.push(limit(pageSize));

    const q = query(collection(db, collectionName), ...queryParts);
    const snapshot = await getDocs(q);
    const items = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as T));
    const lastCursor = snapshot.docs.length > 0 ? snapshot.docs[snapshot.docs.length - 1] : null;
    return {
      items,
      lastCursor,
      hasMore: snapshot.docs.length === pageSize
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, collectionName);
    return { items: [], lastCursor: null, hasMore: false };
  }
}

/**
 * Fetches bounded batches in cursor steps (using limit() per query, never uncapped collection reads)
 * with an optional per-item mapper so list views retain only required fields in memory.
 */
async function fetchBoundedBatched<T>(
  collectionName: string,
  options: {
    batchSize?: number;
    maxBatches?: number;
    constraints?: QueryConstraint[];
    mapper?: (id: string, data: DocumentData) => T;
  } = {}
): Promise<T[]> {
  const {
    batchSize = 250,
    maxBatches = 20,
    constraints = [],
    mapper
  } = options;

  const all: T[] = [];
  let cursor: QueryDocumentSnapshot<DocumentData> | null = null;

  try {
    for (let page = 0; page < maxBatches; page++) {
      const parts: QueryConstraint[] = [
        ...constraints,
        orderBy(documentId()),
        ...(cursor ? [startAfter(cursor)] : []),
        limit(batchSize)
      ];
      const snapshot = await getDocs(query(collection(db, collectionName), ...parts));
      if (snapshot.empty) break;

      for (const docSnap of snapshot.docs) {
        if (mapper) {
          all.push(mapper(docSnap.id, docSnap.data()));
        } else {
          all.push({ id: docSnap.id, ...docSnap.data() } as T);
        }
      }

      if (snapshot.docs.length < batchSize) break;
      cursor = snapshot.docs[snapshot.docs.length - 1];
    }
    return all;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, collectionName);
    return [];
  }
}

export async function fetchCollectionCount(
  collectionName: string,
  constraints: QueryConstraint[] = []
): Promise<number> {
  try {
    const q = constraints.length > 0
      ? query(collection(db, collectionName), ...constraints)
      : collection(db, collectionName);
    const snap = await getCountFromServer(q);
    return snap.data().count;
  } catch {
    return 0;
  }
}

/**
 * Lightweight Worker projection for list/table views.
 * Heavy narrative fields (notes, workHistory, previousBuses) are kept lean in memory
 * and hydrated on demand when opening WorkerDetailsModal or exporting Excel/PDF.
 */
export function projectWorkerListItem(id: string, data: DocumentData): Worker {
  return {
    id,
    workerNumber: data.workerNumber || '',
    name: data.name || '',
    iqamaNumber: data.iqamaNumber || '',
    nationalId: data.nationalId || '',
    mobileNumber: data.mobileNumber || '',
    recruitmentCompany: data.recruitmentCompany || '',
    workplace: data.workplace || '',
    basicSalary: data.basicSalary,
    assignedBusId: data.assignedBusId || '',
    assignedBusOperationalNumber: data.assignedBusOperationalNumber || '',
    assignedBusPlateNumber: data.assignedBusPlateNumber || '',
    startDate: data.startDate || '',
    endDate: data.endDate || '',
    clientName: data.clientName || '',
    previousBuses: data.previousBuses || '',
    ...(data.contractEndDate ? { contractEndDate: data.contractEndDate } : {})
  } as Worker;
}

export async function fetchWorkersList(): Promise<Worker[]> {
  return fetchBoundedBatched<Worker>('workers', {
    batchSize: 250,
    mapper: projectWorkerListItem
  });
}

export async function fetchWorkersFull(): Promise<Worker[]> {
  return fetchBoundedBatched<Worker>('workers', {
    batchSize: 250
  });
}

export async function fetchWorkerDetails(workerId: string): Promise<Worker | null> {
  if (!workerId) return null;
  try {
    const snap = await getDoc(doc(db, 'workers', workerId));
    if (!snap.exists()) return null;
    return { id: snap.id, ...snap.data() } as Worker;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `workers/${workerId}`);
    return null;
  }
}

export async function fetchWorkersPage(options: {
  cursor?: QueryDocumentSnapshot<DocumentData> | null;
  workplace?: string;
  assignedBusId?: string;
  recruitmentCompany?: string;
  pageSize?: number;
}) {
  const constraints: QueryConstraint[] = [];
  if (options.workplace) constraints.push(where('workplace', '==', options.workplace));
  if (options.assignedBusId) constraints.push(where('assignedBusId', '==', options.assignedBusId));
  if (options.recruitmentCompany) constraints.push(where('recruitmentCompany', '==', options.recruitmentCompany));
  return fetchCollectionPage<Worker>('workers', {
    pageSize: options.pageSize ?? FIRESTORE_PAGE_SIZE,
    cursor: options.cursor,
    constraints
  });
}

export async function fetchBusesList(): Promise<Bus[]> {
  return fetchBoundedBatched<Bus>('buses', { batchSize: 250 });
}

export async function fetchSalariesList(): Promise<SalaryRecord[]> {
  return fetchBoundedBatched<SalaryRecord>('salaries', { batchSize: 250 });
}

export async function fetchSalariesByMonth(month: string): Promise<SalaryRecord[]> {
  return fetchBoundedBatched<SalaryRecord>('salaries', {
    batchSize: 250,
    constraints: [where('month', '==', month)]
  });
}

export async function fetchCompanyDriversList(): Promise<CompanyDriver[]> {
  const list = await fetchBoundedBatched<CompanyDriver>('company_drivers', { batchSize: 250 });
  list.sort((a, b) => (Number(a.serialNumber) || 0) - (Number(b.serialNumber) || 0));
  return list;
}

export async function fetchDriverResponsesList(): Promise<DriverResponse[]> {
  const list = await fetchBoundedBatched<DriverResponse>('driver_responses', { batchSize: 250 });
  list.sort((a, b) => {
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : new Date(a.createdAt || a.createdDate || 0).getTime();
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : new Date(b.createdAt || b.createdDate || 0).getTime();
    return timeB - timeA;
  });
  return list;
}

export async function fetchUsersList(): Promise<AppUser[]> {
  const raw = await fetchBoundedBatched<any>('users', { batchSize: 250 });
  return raw.map(u => ({ uid: u.id, ...u } as AppUser));
}

/**
 * Dedicated live tracking hook ONLY for `buses`:
 * - Pauses Firestore `onSnapshot` whenever `document.visibilityState === 'hidden'`
 * - Unsubscribes cleanly when leaving the page or unmounting
 * - Batches/throttles incoming snapshot updates every 1.5s
 * - Patches only changed bus records (docChanges), keeping unchanged bus objects referentially identical
 */
export function useVisibilityPausedBusStream(enabled: boolean) {
  const [buses, setBuses] = useState<Bus[]>(() => queryClient.getQueryData<Bus[]>(queryKeys.buses) || []);
  const [busesLoaded, setBusesLoaded] = useState<boolean>(() => Boolean(queryClient.getQueryData<Bus[]>(queryKeys.buses)));
  const busMapRef = useRef<Map<string, Bus>>(new Map());
  const pendingFlushRef = useRef<number | null>(null);
  const dirtyRef = useRef<boolean>(false);

  useEffect(() => {
    if (buses.length > 0 && busMapRef.current.size === 0) {
      buses.forEach(b => busMapRef.current.set(b.id, b));
    }
  }, []);

  useEffect(() => {
    if (!enabled) return;

    let unsub: (() => void) | null = null;
    let isDisposed = false;

    const flushUpdates = () => {
      pendingFlushRef.current = null;
      if (isDisposed || !dirtyRef.current) return;
      dirtyRef.current = false;
      const next = Array.from(busMapRef.current.values());
      setBuses(next);
      setBusesLoaded(true);
      queryClient.setQueryData(queryKeys.buses, next);
    };

    const scheduleFlush = (immediate = false) => {
      if (immediate) {
        if (pendingFlushRef.current !== null) {
          window.clearTimeout(pendingFlushRef.current);
          pendingFlushRef.current = null;
        }
        flushUpdates();
        return;
      }
      if (pendingFlushRef.current === null) {
        pendingFlushRef.current = window.setTimeout(flushUpdates, 1500);
      }
    };

    const startListening = () => {
      if (unsub || isDisposed) return;
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return;

      const qBuses = query(collection(db, 'buses'), limit(500));
      let isFirstSnapshot = true;

      unsub = onSnapshot(
        qBuses,
        (snapshot) => {
          const changes = snapshot.docChanges();
          if (isFirstSnapshot) {
            const nextMap = new Map<string, Bus>();
            snapshot.docs.forEach(d => {
              const prev = busMapRef.current.get(d.id);
              const nextData = { id: d.id, ...d.data() } as Bus;
              // Keep existing reference if unchanged on reconnect
              if (prev && JSON.stringify(prev) === JSON.stringify(nextData)) {
                nextMap.set(d.id, prev);
              } else {
                nextMap.set(d.id, nextData);
              }
            });
            busMapRef.current = nextMap;
            dirtyRef.current = true;
            isFirstSnapshot = false;
            scheduleFlush(true);
            return;
          }

          if (changes.length === 0) return;

          changes.forEach(change => {
            if (change.type === 'removed') {
              busMapRef.current.delete(change.doc.id);
            } else {
              busMapRef.current.set(change.doc.id, {
                id: change.doc.id,
                ...change.doc.data()
              } as Bus);
            }
          });
          dirtyRef.current = true;
          scheduleFlush(false);
        },
        (error) => {
          setBusesLoaded(true);
          handleFirestoreError(error, OperationType.GET, 'buses');
        }
      );
    };

    const stopListening = () => {
      if (unsub) {
        unsub();
        unsub = null;
      }
      if (pendingFlushRef.current !== null) {
        window.clearTimeout(pendingFlushRef.current);
        pendingFlushRef.current = null;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        stopListening();
      } else {
        startListening();
      }
    };

    startListening();
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isDisposed = true;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      stopListening();
    };
  }, [enabled]);

  return { buses, busesLoaded };
}
