import type { DriverType, DriverClassification, Worker } from '../types';

/**
 * Checks if a worker from monitoring (الرقابة والمتابعة) is currently active (نشط حالي - غير منتهي عمله)
 */
export function isWorkerActiveInMonitoring(
  worker: { endDate?: string },
  todayStr?: string
): boolean {
  if (!worker.endDate || !worker.endDate.trim()) return true;
  const today = todayStr || new Date().toISOString().split('T')[0];
  return worker.endDate >= today;
}

/**
 * Finds matching worker in monitoring (الرقابة والمتابعة) by Iqama / National ID number
 */
export function getMatchingWorkerByIqama<T extends { 
  iqamaNumber?: string; 
  nationalId?: string; 
  endDate?: string;
  workplace?: string;
  clientName?: string;
  assignedBusOperationalNumber?: string;
  assignedBusPlateNumber?: string;
  mobileNumber?: string;
} = Worker>(
  driver: { iqamaNumber?: string },
  workers?: T[]
): T | undefined {
  const driverIqama = (driver.iqamaNumber || '').trim();
  if (!driverIqama || !workers || workers.length === 0) return undefined;

  return workers.find(w => {
    const workerIqama = (w.iqamaNumber || '').trim();
    const workerNational = (w.nationalId || '').trim();
    return (workerIqama && workerIqama === driverIqama) || (workerNational && workerNational === driverIqama);
  });
}

/**
 * Finds the matching active worker in monitoring (الرقابة والمتابعة) by Iqama number
 */
export function getMatchingActiveMonitoringWorker<T extends { 
  iqamaNumber?: string; 
  nationalId?: string; 
  endDate?: string;
  workplace?: string;
  clientName?: string;
  assignedBusOperationalNumber?: string;
  assignedBusPlateNumber?: string;
  mobileNumber?: string;
} = Worker>(
  driver: { iqamaNumber?: string },
  workers?: T[],
  todayStr?: string
): T | undefined {
  const driverIqama = (driver.iqamaNumber || '').trim();
  if (!driverIqama || !workers || workers.length === 0) return undefined;

  const today = todayStr || new Date().toISOString().split('T')[0];

  return workers.find(w => {
    const workerIqama = (w.iqamaNumber || w.nationalId || '').trim();
    if (workerIqama && workerIqama === driverIqama) {
      return isWorkerActiveInMonitoring(w, today);
    }
    return false;
  });
}

/**
 * Checks if a driver in the driver fleet also exists in monitoring (الرقابة والمتابعة)
 * with matching Iqama number and is currently active (غير منتهي عمله).
 */
export function isDriverActiveInMonitoring(
  driver: { iqamaNumber?: string },
  workers?: { iqamaNumber?: string; nationalId?: string; endDate?: string }[],
  todayStr?: string
): boolean {
  return Boolean(getMatchingActiveMonitoringWorker(driver, workers, todayStr));
}

/**
 * Resolves driver type based on legal identity documents:
 * - If driver has an Iqama number -> 'مقيم'
 * - If driver has a Border number and no Iqama -> 'موسمي'
 * - Otherwise falls back to stored driverType or 'مقيم'
 */
export function resolveDriverType(driver: {
  iqamaNumber?: string;
  borderNumber?: string;
  driverType?: DriverType;
}): DriverType {
  const hasIqama = Boolean(driver.iqamaNumber && driver.iqamaNumber.trim().length > 0);
  const hasBorder = Boolean(driver.borderNumber && driver.borderNumber.trim().length > 0);

  if (hasIqama) {
    return 'مقيم';
  }
  if (hasBorder) {
    return 'موسمي';
  }
  return driver.driverType || 'مقيم';
}

/**
 * Checks if a location or text corresponds to School Transport (النقل المدرسي)
 * School transport locations per company operations: ينبع - القصيم - محايل عسير
 */
export function isSchoolTransportLocation(text?: string): boolean {
  if (!text) return false;
  const t = text.trim();
  return (
    t.includes('ينبع') ||
    t.includes('القصيم') ||
    t.includes('محايل') ||
    t.includes('عسير') ||
    t.includes('بريدة') ||
    t.includes('عنيزة') ||
    t.includes('مدرسي') ||
    t.includes('مدارس') ||
    t.includes('تعليم') ||
    t.includes('النقل المدرسي')
  );
}

/**
 * Resolves driver operation classification:
 * - Links Company Drivers and Monitoring by Iqama Number:
 *   If driver exists in monitoring by Iqama:
 *     - If in School Transport locations (ينبع - القصيم - محايل عسير) -> 'النقل المدرسي'
 *     - Otherwise -> 'نقل عمال'
 * - If not in monitoring:
 *     - If school transport location -> 'النقل المدرسي'
 *     - If Syria -> 'النقل الدولي سوريا'
 *     - If Yemen -> 'النقل الدولي اليمن'
 *     - If Umrah -> 'عمرة'
 *     - Otherwise -> 'نقل عمال'
 */
export function getDriverClassification(
  driver: {
    iqamaNumber?: string;
    driverClassification?: DriverClassification | string;
    workplace?: string;
    responseType?: string;
    notes?: string;
  },
  workers?: { iqamaNumber?: string; nationalId?: string; endDate?: string; workplace?: string; clientName?: string }[]
): DriverClassification {
  const driverExplicitClass = (driver.driverClassification || '').trim();
  const driverWorkplace = (driver.workplace || '').trim();
  const driverResponse = (driver.responseType || '').trim();
  const driverNotes = (driver.notes || '').trim();

  // 1. Find matched worker in monitoring by Iqama number
  const matchedWorker = workers ? getMatchingWorkerByIqama(driver, workers) : undefined;
  const workerWorkplace = (matchedWorker?.workplace || '').trim();
  const workerClient = (matchedWorker?.clientName || '').trim();

  // 2. School Transport check (ينبع - القصيم - محايل عسير)
  if (
    isSchoolTransportLocation(workerWorkplace) ||
    isSchoolTransportLocation(workerClient) ||
    driverExplicitClass === 'النقل المدرسي' ||
    isSchoolTransportLocation(driverWorkplace) ||
    isSchoolTransportLocation(driverResponse) ||
    isSchoolTransportLocation(driverNotes)
  ) {
    return 'النقل المدرسي';
  }

  // 3. If driver exists in monitoring by Iqama number -> classified as 'نقل عمال'
  if (matchedWorker) {
    return 'نقل عمال';
  }

  // 4. Check for Syria International Transport
  const combinedDriverText = `${driverExplicitClass} ${driverWorkplace} ${driverNotes}`;
  if (combinedDriverText.includes('سوريا') || combinedDriverText.includes('سورية') || driverExplicitClass === 'النقل الدولي سوريا') {
    return 'النقل الدولي سوريا';
  }

  // 5. Check for Yemen International Transport
  if (combinedDriverText.includes('اليمن') || driverExplicitClass === 'النقل الدولي اليمن') {
    return 'النقل الدولي اليمن';
  }

  // 6. Check for Umrah
  if (combinedDriverText.includes('عمرة') || combinedDriverText.includes('عمره') || driverExplicitClass === 'عمرة') {
    return 'عمرة';
  }

  return 'نقل عمال';
}

/**
 * Computes fields that should be updated for a driver based on their active monitoring worker record:
 * - Workplace
 * - Classification (النقل المدرسي vs نقل عمال)
 * - Assigned bus number (if missing in driver record)
 * - Mobile number (if missing in driver record)
 */
export function getMonitoringUpdatesForDriver(
  driver: {
    id: string;
    iqamaNumber?: string;
    driverClassification?: string;
    workplace?: string;
    busNumber?: string;
    mobileNumber?: string;
  },
  matchedWorker: {
    workplace?: string;
    clientName?: string;
    assignedBusOperationalNumber?: string;
    assignedBusPlateNumber?: string;
    mobileNumber?: string;
  }
): {
  hasChanges: boolean;
  updates: Record<string, any>;
} {
  const updates: Record<string, any> = {};
  let hasChanges = false;

  const targetClass = isSchoolTransportLocation(matchedWorker.workplace) || isSchoolTransportLocation(matchedWorker.clientName)
    ? 'النقل المدرسي'
    : 'نقل عمال';

  if (driver.driverClassification !== targetClass) {
    updates.driverClassification = targetClass;
    hasChanges = true;
  }

  if (matchedWorker.workplace && driver.workplace !== matchedWorker.workplace) {
    updates.workplace = matchedWorker.workplace;
    hasChanges = true;
  }

  const workerBus = matchedWorker.assignedBusOperationalNumber || matchedWorker.assignedBusPlateNumber;
  if (workerBus && !driver.busNumber) {
    updates.busNumber = workerBus;
    hasChanges = true;
  }

  if (matchedWorker.mobileNumber && !driver.mobileNumber) {
    updates.mobileNumber = matchedWorker.mobileNumber;
    hasChanges = true;
  }

  return { hasChanges, updates };
}
