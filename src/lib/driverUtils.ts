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
 * Finds the matching active worker in monitoring (الرقابة والمتابعة) by Iqama number
 */
export function getMatchingActiveMonitoringWorker<T extends { iqamaNumber?: string; nationalId?: string; endDate?: string }>(
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
 * Resolves driver operation classification:
 * - If driver is also present in monitoring (الرقابة والمتابعة) with matching Iqama and is active (غير منتهي عمله) -> automatically 'نقل عمال'
 * - Otherwise 'عمرة' or 'نقل عمال' based on stored value
 */
export function getDriverClassification(
  driver: {
    iqamaNumber?: string;
    driverClassification?: DriverClassification | string;
    workplace?: string;
  },
  workers?: { iqamaNumber?: string; nationalId?: string; endDate?: string }[]
): DriverClassification {
  // If driver exists in monitoring (الرقابة والمتابعة) and is active (non-expired) -> auto 'نقل عمال'
  if (workers && isDriverActiveInMonitoring(driver, workers)) {
    return 'نقل عمال';
  }

  const raw = (driver.driverClassification || driver.workplace || '').trim();
  if (raw.includes('عمرة') || raw.includes('عمره')) {
    return 'عمرة';
  }
  return 'نقل عمال';
}
