import * as XLSX from 'xlsx';
import { Bus, Worker } from '../types';

export const exportDashboardStatsToExcel = (buses: Bus[], workers: Worker[] = []) => {
  const totalBuses = buses.length;
  const assignedBusIds = new Set(workers.map(w => w.assignedBusId).filter(Boolean));

  let availableCount = 0;
  let maintenanceCount = 0;
  let inServiceCount = 0;

  const locationMap: { 
    [loc: string]: { 
      total: number; 
      available: number; 
      inService: number; 
      maintenance: number; 
      workers: Set<string>;
      categories: Set<string>;
    } 
  } = {};

  buses.forEach(bus => {
    const loc = bus.location?.trim() || 'غير محدد';
    if (!locationMap[loc]) {
      locationMap[loc] = { 
        total: 0, 
        available: 0, 
        inService: 0, 
        maintenance: 0, 
        workers: new Set(),
        categories: new Set()
      };
    }
    locationMap[loc].total += 1;
    if (bus.category) locationMap[loc].categories.add(bus.category);

    const isUnderMaintenance = bus.technicalStatus === 'تحت الصيانة' || bus.technicalStatus === 'متوقف';
    if (isUnderMaintenance) {
      maintenanceCount++;
      locationMap[loc].maintenance += 1;
    } else if (assignedBusIds.has(bus.id)) {
      inServiceCount++;
      locationMap[loc].inService += 1;
    } else {
      availableCount++;
      locationMap[loc].available += 1;
    }

    workers.filter(w => w.assignedBusId === bus.id).forEach(w => {
      locationMap[loc].workers.add(w.name);
    });
  });

  // Fleet Age & Brand Metrics
  const currentYear = new Date().getFullYear();
  const years = buses
    .map(b => parseInt(b.model, 10))
    .filter(y => !isNaN(y) && y > 1900 && y <= currentYear + 1);
  const newest = years.length > 0 ? Math.max(...years) : 'غير معروف';
  const oldest = years.length > 0 ? Math.min(...years) : 'غير معروف';
  const sumYears = years.reduce((sum, val) => sum + val, 0);
  const avgYear = years.length > 0 ? Math.round(sumYears / years.length) : 0;
  const avgAge = avgYear > 0 ? Math.max(0, currentYear - avgYear) : 0;

  // 1. Summary Sheet
  const summarySheetData = [
    { 'المؤشر الإحصائي': 'إجمالي أسطول الحافلات', 'القيمة': totalBuses, 'الوحدة / التوضيح': 'حافلة' },
    { 'المؤشر الإحصائي': 'إجمالي العرفاء والكوادر المسجلين', 'القيمة': workers.length, 'الوحدة / التوضيح': 'عامل / سائق' },
    { 'المؤشر الإحصائي': 'إجمالي مواقع العمل النشطة', 'القيمة': Object.keys(locationMap).length, 'الوحدة / التوضيح': 'موقع ميداني' },
    { 'المؤشر الإحصائي': 'الحافلات المتاحة للتشغيل', 'القيمة': availableCount, 'الوحدة / التوضيح': `${(totalBuses ? (availableCount / totalBuses * 100).toFixed(1) : 0)}% من الأسطول` },
    { 'المؤشر الإحصائي': 'الحافلات في الخدمة', 'القيمة': inServiceCount, 'الوحدة / التوضيح': `${(totalBuses ? (inServiceCount / totalBuses * 100).toFixed(1) : 0)}% من الأسطول` },
    { 'المؤشر الإحصائي': 'الحافلات تحت الصيانة / المتوقفة', 'القيمة': maintenanceCount, 'الوحدة / التوضيح': `${(totalBuses ? (maintenanceCount / totalBuses * 100).toFixed(1) : 0)}% من الأسطول` },
    { 'المؤشر الإحصائي': 'متوسط عمر الأسطول', 'القيمة': `${avgAge} سنوات`, 'الوحدة / التوضيح': `متوسط الموديل (${avgYear || '—'})` },
    { 'المؤشر الإحصائي': 'أحدث موديل بالأسطول', 'القيمة': newest, 'الوحدة / التوضيح': 'سنة الصنع' },
    { 'المؤشر الإحصائي': 'أقدم موديل بالأسطول', 'القيمة': oldest, 'الوحدة / التوضيح': 'سنة الصنع' },
  ];

  // 2. Workplace Locations Sheet
  const locationsSheetData = Object.entries(locationMap).map(([locName, data]) => ({
    'موقع العمل الميداني': locName,
    'إجمالي الحافلات بالموقع': data.total,
    'الحافلات المتاحة للتشغيل': data.available,
    'الحافلات في الخدمة': data.inService,
    'تحت الصيانة / متوقفة': data.maintenance,
    'نسبة تمركز الأسطول بالموقع (%)': totalBuses > 0 ? `${((data.total / totalBuses) * 100).toFixed(1)}%` : '0%',
    'عدد الكوادر والسائقين بالموقع': data.workers.size,
    'فئات الحافلات بالموقع': Array.from(data.categories).join(' ، ') || 'غير محدد'
  })).sort((a, b) => b['إجمالي الحافلات بالموقع'] - a['إجمالي الحافلات بالموقع']);

  // 3. Detailed Fleet Sheet
  const detailedFleetData = buses.map(bus => {
    const assignedWorkers = workers.filter(w => w.assignedBusId === bus.id);
    const workerNames = assignedWorkers.map(w => w.name).join(' ، ');

    let opStatus = 'متاحة للتشغيل';
    const isUnderMaintenance = bus.technicalStatus === 'تحت الصيانة' || bus.technicalStatus === 'متوقف';
    if (isUnderMaintenance) opStatus = 'تحت الصيانة / متوقفة';
    else if (assignedBusIds.has(bus.id)) opStatus = 'في الخدمة';

    return {
      'رقم التشغيل': bus.operationalNumber,
      'رقم اللوحة': bus.plateNumber,
      'موقع العمل الحالي': bus.location,
      'حالة التشغيل الميدانية': opStatus,
      'الحالة الفنية': bus.technicalStatus,
      'فئة الحافلة': bus.category,
      'الشركة المصنعة': bus.manufacturer || '-',
      'الموديل': bus.model || '-',
      'اللون': bus.color || '-',
      'عدد المقاعد': bus.seatsCount || '-',
      'السائقين / الكوادر المرتبطين': workerNames || 'غير معين',
      'ملاحظات': bus.notes || '-'
    };
  });

  const workbook = XLSX.utils.book_new();
  
  const summarySheet = XLSX.utils.json_to_sheet(summarySheetData);
  const locationSheet = XLSX.utils.json_to_sheet(locationsSheetData);
  const fleetSheet = XLSX.utils.json_to_sheet(detailedFleetData);

  XLSX.utils.book_append_sheet(workbook, summarySheet, 'الملخص الإحصائي');
  XLSX.utils.book_append_sheet(workbook, locationSheet, 'إحصائيات مواقع العمل');
  XLSX.utils.book_append_sheet(workbook, fleetSheet, 'تفاصيل الأسطول والمواقع');

  const todayStr = new Date().toLocaleDateString('ar-SA').replace(/\//g, '-');
  XLSX.writeFile(workbook, `تقرير_إحصائيات_الحافلات_والمواقع_${todayStr}.xlsx`);
};

export const exportToExcel = (data: Bus[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(bus => ({
    'رقم التشغيل': bus.operationalNumber,
    'رقم اللوحة': bus.plateNumber,
    'فئة الحافلة': bus.category,
    'الموديل': bus.model,
    'الشركة المصنعة': bus.manufacturer,
    'اللون': bus.color,
    'عدد المقاعد': bus.seatsCount || '',
    'حالة الباص الفنية': bus.technicalStatus,
    'موقع عمل الباص': bus.location,
    'ملاحظات': bus.notes,
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'الأسطول');
  XLSX.writeFile(workbook, `أسطول_درة_المنورة_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
};

export const exportWorkersToExcel = (data: Worker[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(worker => ({
    'رقم العامل': worker.workerNumber,
    'اسم العامل': worker.name,
    'رقم الإقامة': worker.iqamaNumber,
    'رقم الجوال': worker.mobileNumber,
    'شركة الاستقدام': worker.recruitmentCompany,
    'مكان العمل': worker.workplace,
    'الراتب الأساسي': worker.basicSalary || '',
    'الحافلة المرتبطة': worker.assignedBusOperationalNumber || 'غير مرتبط',
    'الحافلات السابقة': worker.previousBuses || '',
    'بداية العمل': worker.startDate,
    'نهاية العمل': worker.endDate,
    'العميل': worker.clientName,
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'العمال');
  XLSX.writeFile(workbook, `عمال_درة_المنورة_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
};

export const exportSalariesToExcel = (data: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(s => ({
    'الشهر': s.month,
    'الرقم الوظيفي': s.workerNumber,
    'اسم العامل': s.workerName,
    'موقع العمل': s.workLocation || '',
    'الراتب الأساسي': s.baseSalary,
    'ساعات العمل الإضافي': s.extraHours,
    'قيمة العمل الإضافي': s.extraHoursValue,
    'المرابطة': s.morabata,
    'إجمالي المستحق': s.totalSalary,
    'الحالة': s.status === 'paid' ? 'تم الدفع' : 'قيد الانتظار',
    'ملاحظات': s.notes
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'الرواتب');
  XLSX.writeFile(workbook, `كشف_الرواتب_${data[0]?.month || ''}_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
};

const formatExcelDate = (val: any) => {
  if (!val) return '';
  if (val instanceof Date) {
    return val.toISOString().split('T')[0];
  }
  if (typeof val === 'number') {
    try {
      // Excel serial date to JS Date
      const date = new Date(Math.round((val - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    } catch (e) {
      return String(val);
    }
  }
  return String(val);
};

export const parseExcel = (file: File): Promise<Partial<Bus>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      const mappedData = json.map(row => {
        const rawSeats = row['عدد المقاعد'] || row['Seats Count'] || row['Seats'] || row['سعة المقاعد'] || row['عدد مقاعد الحافلة'] || '';
        const parsedSeats = rawSeats ? Number(rawSeats) : undefined;
        return {
          operationalNumber: String(row['رقم التشغيل'] || row['Operational Number'] || row['رقم التشغيل'] || ''),
          plateNumber: String(row['رقم اللوحة'] || row['Plate Number'] || ''),
          category: String(row['فئة الحافلة'] || row['Category'] || ''),
          model: String(row['الموديل'] || row['Model'] || ''),
          manufacturer: String(row['الشركة المصنعة'] || row['Manufacturer'] || ''),
          color: String(row['اللون'] || row['Color'] || ''),
          technicalStatus: String(row['حالة الباص الفنية'] || row['Technical Status'] || ''),
          location: String(row['موقع عمل الباص'] || row['Location'] || ''),
          notes: String(row['ملاحظات'] || row['Notes'] || ''),
          seatsCount: isNaN(parsedSeats as any) ? undefined : parsedSeats,
        };
      }).filter(b => b.operationalNumber && b.plateNumber);
      
      resolve(mappedData);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const parseWorkersExcel = (file: File): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array', cellDates: true });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      const mappedData = json.map(row => {
        const rawSalary = row['الراتب الأساسي'] || row['الراتب'] || row['Basic Salary'] || '';
        const parsedSalary = rawSalary !== '' && rawSalary !== undefined && rawSalary !== null ? Number(rawSalary) : undefined;

        return {
          workerNumber: String(row['رقم العامل'] || row['Worker Number'] || '').trim(),
          name: String(row['اسم العامل'] || row['Name'] || '').trim(),
          iqamaNumber: String(row['رقم الإقامة'] || row['رقم الإقامة/الهوية'] || row['Iqama Number'] || '').trim(),
          nationalId: String(row['رقم الهوية'] || row['الهوية الوطنية'] || row['National ID'] || '').trim(),
          mobileNumber: String(row['رقم الجوال'] || row['Mobile'] || '').trim(),
          recruitmentCompany: String(row['شركة الاستقدام'] || row['Company'] || ''),
          workplace: String(row['مكان العمل'] || row['Workplace'] || ''),
          basicSalary: isNaN(parsedSalary as any) ? undefined : parsedSalary,
          assignedBusOperationalNumber: String(row['الحافلة المرتبطة'] || row['Bus Number'] || ''),
          assignedBusId: '',
          previousBuses: String(row['الحافلات السابقة'] || row['Previous Buses'] || ''),
          startDate: formatExcelDate(row['بداية العمل'] || row['Start Date']),
          endDate: formatExcelDate(row['نهاية العمل'] || row['End Date']),
          clientName: String(row['اسم العميل'] || row['العميل'] || row['Client Name'] || ''),
          notes: String(row['ملاحظات'] || row['Notes'] || ''),
        };
      }).filter(w => w.name && (w.iqamaNumber || w.nationalId));
      
      resolve(mappedData);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
