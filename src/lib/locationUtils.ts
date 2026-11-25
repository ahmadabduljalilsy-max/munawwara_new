import type { CompanyDriver, DriverResponse } from '../types';

/**
 * Normalizes bus or worker location so that empty, 'غير محدد', or '( غير محدد )' becomes 'في الشركة'
 */
export const normalizeBusLocation = (loc?: string): string => {
  const trimmed = (loc || '').trim();
  if (
    !trimmed ||
    trimmed === 'غير محدد' ||
    trimmed === '( غير محدد )' ||
    trimmed === '(غير محدد)' ||
    trimmed === 'غير محددة' ||
    trimmed === '(غير محددة)' ||
    trimmed === '( غير محددة )' ||
    trimmed === '—' ||
    trimmed === '-' ||
    trimmed === 'لا يوجد' ||
    trimmed === '(لا يوجد)'
  ) {
    return 'في الشركة';
  }
  return trimmed;
};

/**
 * Copies Driver Responses to clipboard in TSV (Tab Separated Values) format
 * so that it can be directly pasted (Ctrl+V) into any Google Sheet with columns preserved.
 */
export const copyDriverResponsesToGoogleSheetsClipboard = (
  responses: DriverResponse[],
  drivers: CompanyDriver[] = []
): boolean => {
  try {
    const driverById = new Map<string, CompanyDriver>();
    const driverBySerial = new Map<number, CompanyDriver>();
    drivers.forEach(d => {
      if (d.id) driverById.set(d.id, d);
      if (d.serialNumber) driverBySerial.set(d.serialNumber, d);
    });

    const headers = [
      'الرقم المتسلسل',
      'اسم السائق',
      'رقم الإقامة',
      'رقم الحدود',
      'رقم الحافلة',
      'نوع الرد / الوجهة',
      'تاريخ ووقت التسجيل',
      'المسؤول عن التسجيل',
      'ملاحظات'
    ];

    const rows = responses.map(r => {
      const matchedDriver =
        (r.driverId && driverById.get(r.driverId)) ||
        (r.driverSerialNumber && driverBySerial.get(r.driverSerialNumber));
      const iqamaNumber = matchedDriver?.iqamaNumber || '';
      const borderNumber = matchedDriver?.borderNumber || '';

      let formattedDate = r.createdDate || '';
      if (!formattedDate && r.createdAt) {
        try {
          const d = r.createdAt?.toDate ? r.createdAt.toDate() : new Date(r.createdAt);
          formattedDate = d.toLocaleString('ar-SA');
        } catch {
          formattedDate = String(r.createdAt);
        }
      }
      return [
        r.driverSerialNumber,
        (r.driverName || '').replace(/[\t\n]/g, ' '),
        iqamaNumber.replace(/[\t\n]/g, ' '),
        borderNumber.replace(/[\t\n]/g, ' '),
        (r.busNumber || '').replace(/[\t\n]/g, ' '),
        (r.responseType || '').replace(/[\t\n]/g, ' '),
        (formattedDate || '').replace(/[\t\n]/g, ' '),
        (r.recordedBy || r.createdBy || '').replace(/[\t\n]/g, ' '),
        (r.notes || '').replace(/[\t\n]/g, ' ')
      ].join('\t');
    });

    const tsvContent = [headers.join('\t'), ...rows].join('\n');
    navigator.clipboard.writeText(tsvContent);
    return true;
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
};
