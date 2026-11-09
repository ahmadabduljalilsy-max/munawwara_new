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
  driver: { iqamaNumber?: string; borderNumber?: string },
  workers?: T[]
): T | undefined {
  const driverIqama = (driver.iqamaNumber || '').trim();
  const driverBorder = (driver.borderNumber || '').trim();
  if ((!driverIqama && !driverBorder) || !workers || workers.length === 0) return undefined;

  return workers.find(w => {
    const workerIqama = (w.iqamaNumber || '').trim();
    const workerNational = (w.nationalId || '').trim();
    return (
      (driverIqama && (workerIqama === driverIqama || workerNational === driverIqama)) ||
      (driverBorder && (workerIqama === driverBorder || workerNational === driverBorder))
    );
  });
}

/**
 * Finds the matching active worker in monitoring (الرقابة والمتابعة) by Iqama or Border number
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
  driver: { iqamaNumber?: string; borderNumber?: string },
  workers?: T[],
  todayStr?: string
): T | undefined {
  const driverIqama = (driver.iqamaNumber || '').trim();
  const driverBorder = (driver.borderNumber || '').trim();
  if ((!driverIqama && !driverBorder) || !workers || workers.length === 0) return undefined;

  const today = todayStr || new Date().toISOString().split('T')[0];

  return workers.find(w => {
    const workerIqama = (w.iqamaNumber || w.nationalId || '').trim();
    const matchesId = (driverIqama && workerIqama === driverIqama) || (driverBorder && workerIqama === driverBorder);
    if (matchesId) {
      return isWorkerActiveInMonitoring(w, today);
    }
    return false;
  });
}

/**
 * Checks if a driver in the driver fleet also exists in monitoring (الرقابة والمتابعة)
 * and is currently active (غير منتهي عمله).
 */
export function isDriverActiveInMonitoring(
  driver: { iqamaNumber?: string; borderNumber?: string; driverClassification?: string },
  workers?: { iqamaNumber?: string; nationalId?: string; endDate?: string }[],
  todayStr?: string
): boolean {
  if (driver.driverClassification === 'خروج نهائي') return false;
  return Boolean(getMatchingActiveMonitoringWorker(driver, workers, todayStr));
}

/**
 * Checks if a driver in the driver fleet has an ended assignment in monitoring (الرقابة والمتابعة).
 * When true, the driver is automatically classified as Umrah (عمرة).
 */
export function isDriverEndedInMonitoring(
  driver: { iqamaNumber?: string; borderNumber?: string; driverClassification?: string },
  workers?: { iqamaNumber?: string; nationalId?: string; endDate?: string }[],
  todayStr?: string
): boolean {
  if (driver.driverClassification === 'خروج نهائي') return false;
  const matched = getMatchingWorkerByIqama(driver, workers);
  if (!matched) return false;
  const today = todayStr || new Date().toISOString().split('T')[0];
  return Boolean(matched.endDate && matched.endDate.trim() && matched.endDate < today);
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
 * 1. Links Company Drivers and Monitoring:
 *    If driver exists in monitoring:
 *      - If work has ended (endDate < today): AUTOMATICALLY classified as 'عمرة'
 *      - If active and in School Transport locations (ينبع - القصيم - محايل عسير): 'النقل المدرسي'
 *      - If active and in other locations: 'نقل عمال'
 * 2. If not in monitoring:
 *      - If school transport location -> 'النقل المدرسي'
 *      - If Syria -> 'النقل الدولي سوريا'
 *      - If Yemen -> 'النقل الدولي اليمن'
 *      - If Umrah -> 'عمرة'
 *      - Otherwise -> 'نقل عمال'
 */
export function getDriverClassification(
  driver: {
    iqamaNumber?: string;
    borderNumber?: string;
    driverClassification?: DriverClassification | string;
    workplace?: string;
    responseType?: string;
    notes?: string;
  },
  workers?: { iqamaNumber?: string; nationalId?: string; endDate?: string; workplace?: string; clientName?: string }[],
  todayStr?: string
): DriverClassification {
  const today = todayStr || new Date().toISOString().split('T')[0];
  const driverExplicitClass = (driver.driverClassification || '').trim();

  // تصنيف خروج نهائي: نهائي ودائم ومقفل، ولا يتغير بأي مزامنة أو ربط ميداني
  if (driverExplicitClass === 'خروج نهائي') {
    return 'خروج نهائي';
  }

  const driverWorkplace = (driver.workplace || '').trim();
  const driverResponse = (driver.responseType || '').trim();
  const driverNotes = (driver.notes || '').trim();

  // 1. Find matched worker in monitoring by Iqama or Border number
  const matchedWorker = workers ? getMatchingWorkerByIqama(driver, workers) : undefined;

  if (matchedWorker) {
    // في الرقابة والمتابعة عندما ينتهي عمل السائق يصنف تلقائياً عمرة
    const isEnded = Boolean(matchedWorker.endDate && matchedWorker.endDate.trim() && matchedWorker.endDate < today);
    if (isEnded) {
      return 'عمرة';
    }

    const workerWorkplace = (matchedWorker.workplace || '').trim();
    const workerClient = (matchedWorker.clientName || '').trim();

    // Check School Transport (ينبع - القصيم - محايل عسير)
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

    // Active in monitoring -> نقل عمال
    return 'نقل عمال';
  }

  // 2. Drivers not currently in monitoring
  if (
    isSchoolTransportLocation(driverWorkplace) ||
    isSchoolTransportLocation(driverResponse) ||
    isSchoolTransportLocation(driverNotes) ||
    driverExplicitClass === 'النقل المدرسي'
  ) {
    return 'النقل المدرسي';
  }

  const combinedDriverText = `${driverExplicitClass} ${driverWorkplace} ${driverNotes}`;
  if (combinedDriverText.includes('سوريا') || combinedDriverText.includes('سورية') || driverExplicitClass === 'النقل الدولي سوريا') {
    return 'النقل الدولي سوريا';
  }

  if (combinedDriverText.includes('اليمن') || driverExplicitClass === 'النقل الدولي اليمن') {
    return 'النقل الدولي اليمن';
  }

  if (combinedDriverText.includes('عمرة') || combinedDriverText.includes('عمره') || driverExplicitClass === 'عمرة') {
    return 'عمرة';
  }

  return 'نقل عمال';
}

/**
 * Computes fields that should be updated for a driver based on their monitoring worker record:
 * - Workplace
 * - Classification (عمرة if ended, النقل المدرسي vs نقل عمال if active)
 * - Assigned bus number (if missing in driver record)
 * - Mobile number (if missing in driver record)
 */
export function getMonitoringUpdatesForDriver(
  driver: {
    id: string;
    iqamaNumber?: string;
    borderNumber?: string;
    driverClassification?: string;
    workplace?: string;
    busNumber?: string;
    mobileNumber?: string;
  },
  matchedWorker: {
    workplace?: string;
    clientName?: string;
    endDate?: string;
    assignedBusOperationalNumber?: string;
    assignedBusPlateNumber?: string;
    mobileNumber?: string;
  },
  todayStr?: string
): {
  hasChanges: boolean;
  updates: Record<string, any>;
} {
  // السائق المصنف خروج نهائي لا يقبل أي تحديث أو تعديل
  if (driver.driverClassification === 'خروج نهائي') {
    return { hasChanges: false, updates: {} };
  }

  const updates: Record<string, any> = {};
  let hasChanges = false;
  const today = todayStr || new Date().toISOString().split('T')[0];

  const isEnded = Boolean(matchedWorker.endDate && matchedWorker.endDate.trim() && matchedWorker.endDate < today);

  let targetClass: DriverClassification;
  let targetWorkplace: string;

  if (isEnded) {
    targetClass = 'عمرة';
    targetWorkplace = 'عمرة';
  } else {
    targetClass = isSchoolTransportLocation(matchedWorker.workplace) || isSchoolTransportLocation(matchedWorker.clientName)
      ? 'النقل المدرسي'
      : 'نقل عمال';
    targetWorkplace = matchedWorker.workplace || (targetClass === 'النقل المدرسي' ? 'النقل المدرسي' : 'نقل عمال');
  }

  if (driver.driverClassification !== targetClass) {
    updates.driverClassification = targetClass;
    hasChanges = true;
  }

  if (driver.workplace !== targetWorkplace) {
    updates.workplace = targetWorkplace;
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
