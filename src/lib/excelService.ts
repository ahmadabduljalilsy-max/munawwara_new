import * as XLSX from 'xlsx';
import { Bus, Worker, DriverResponse, CompanyDriver } from '../types';
import { getDriverClassification, isDriverActiveInMonitoring } from './driverUtils';

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
 * Safely appends a sheet to a workbook ensuring:
 * 1. Name never exceeds Excel's 31 character limit
 * 2. Invalid characters (\ / ? * : [ ]) are sanitized
 * 3. Sheet names are unique within the workbook
 */
export const safeAddSheet = (wb: XLSX.WorkBook, ws: XLSX.WorkSheet, desiredName: string) => {
  let cleanName = desiredName.replace(/[\\/?*:[\]]/g, ' ').trim();
  if (cleanName.length > 31) {
    cleanName = cleanName.slice(0, 31).trim();
  }
  if (!cleanName) cleanName = 'ورقة';

  const existingNames = new Set(wb.SheetNames || []);
  let finalName = cleanName;
  let counter = 1;
  while (existingNames.has(finalName)) {
    const suffix = ` (${counter})`;
    finalName = `${cleanName.slice(0, 31 - suffix.length).trim()}${suffix}`;
    counter++;
  }

  XLSX.utils.book_append_sheet(wb, ws, finalName);
};

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
    const loc = normalizeBusLocation(bus.location);
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

  // Helper for RTL & Column Widths
  const setupWorksheet = (ws: XLSX.WorkSheet, data: any[]) => {
    if (data && data.length > 0) {
      const keys = Object.keys(data[0]);
      const colWidths = keys.map(key => {
        let maxLen = key.length;
        data.forEach(row => {
          const val = row[key];
          if (val !== undefined && val !== null) {
            const str = String(val);
            if (str.length > maxLen) maxLen = str.length;
          }
        });
        return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
      });
      ws['!cols'] = colWidths;
    }
    (ws as any)['!views'] = [{ rightToLeft: true }];
  };

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
  const locationsSheetData = Object.entries(locationMap).map(([locName, data]) => {
    // Model distribution breakdown for this location
    const locBuses = buses.filter(b => normalizeBusLocation(b.location) === locName);
    const modelCounts: { [model: string]: number } = {};
    locBuses.forEach(b => {
      const m = b.model?.trim() || 'غير محدد';
      modelCounts[m] = (modelCounts[m] || 0) + 1;
    });
    const modelsSummary = Object.entries(modelCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([m, c]) => `موديل ${m} (${c})`)
      .join(' ، ');

    return {
      'موقع العمل الميداني': locName,
      'إجمالي الحافلات بالموقع': data.total,
      'الحافلات المتاحة للتشغيل': data.available,
      'الحافلات في الخدمة': data.inService,
      'تحت الصيانة / متوقفة': data.maintenance,
      'نسبة تمركز الأسطول بالموقع (%)': totalBuses > 0 ? `${((data.total / totalBuses) * 100).toFixed(1)}%` : '0%',
      'توزيع الموديلات بالموقع': modelsSummary || 'غير محدد',
      'عدد الكوادر والسائقين بالموقع': data.workers.size,
      'فئات الحافلات بالموقع': Array.from(data.categories).join(' ، ') || 'غير محدد'
    };
  }).sort((a, b) => b['إجمالي الحافلات بالموقع'] - a['إجمالي الحافلات بالموقع']);

  // 3. Location & Model Matrix Sheet
  // Collect all unique models sorted
  const allModelsSet = new Set<string>();
  buses.forEach(b => {
    if (b.model?.trim()) allModelsSet.add(b.model.trim());
  });
  const sortedModels = Array.from(allModelsSet).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
    return a.localeCompare(b, 'ar');
  });

  const locationModelMatrixData = Object.keys(locationMap).map(locName => {
    const locBuses = buses.filter(b => normalizeBusLocation(b.location) === locName);
    const row: any = {
      'مكان العمل': locName,
      'إجمالي عدد الحافلات': locBuses.length,
    };
    sortedModels.forEach(model => {
      const count = locBuses.filter(b => (b.model?.trim() || 'غير محدد') === model).length;
      row[`موديل ${model}`] = count;
    });
    return row;
  }).sort((a, b) => b['إجمالي عدد الحافلات'] - a['إجمالي عدد الحافلات']);

  // 4. Detailed Fleet Sheet
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
      'مكان العمل الحالي': normalizeBusLocation(bus.location),
      'الموديل': bus.model || '-',
      'الشركة المصنعة': bus.manufacturer || '-',
      'فئة الحافلة': bus.category,
      'حالة التشغيل الميدانية': opStatus,
      'الحالة الفنية': bus.technicalStatus,
      'اللون': bus.color || '-',
      'عدد المقاعد': bus.seatsCount || '-',
      'السائقين / الكوادر المرتبطين': workerNames || 'غير معين',
      'ملاحظات': bus.notes || '-'
    };
  });

  const workbook = XLSX.utils.book_new();
  
  const summarySheet = XLSX.utils.json_to_sheet(summarySheetData);
  const locationSheet = XLSX.utils.json_to_sheet(locationsSheetData);
  const matrixSheet = XLSX.utils.json_to_sheet(locationModelMatrixData);
  const fleetSheet = XLSX.utils.json_to_sheet(detailedFleetData);

  setupWorksheet(summarySheet, summarySheetData);
  setupWorksheet(locationSheet, locationsSheetData);
  setupWorksheet(matrixSheet, locationModelMatrixData);
  setupWorksheet(fleetSheet, detailedFleetData);

  safeAddSheet(workbook, summarySheet, 'الملخص الإحصائي');
  safeAddSheet(workbook, locationSheet, 'إحصائيات مواقع العمل');
  safeAddSheet(workbook, matrixSheet, 'توزيع الموديلات بالمواقع');
  safeAddSheet(workbook, fleetSheet, 'تفاصيل الأسطول والمواقع');

  const todayStr = new Date().toLocaleDateString('ar-SA').replace(/\//g, '-');
  XLSX.writeFile(workbook, `تقرير_إحصائيات_الحافلات_والمواقع_${todayStr}.xlsx`);
};

/**
 * Dedicated export for workplace and bus counts with models distribution
 * (مكان العمل وعدد الحافلات مع الموديلات)
 */
export const exportLocationModelStatsToExcel = (
  buses: Bus[],
  workers: Worker[] = [],
  locationFilter: string = 'all'
) => {
  const totalBuses = buses.length;
  const isFiltered = locationFilter && locationFilter !== 'all';
  const targetBuses = isFiltered
    ? buses.filter(b => normalizeBusLocation(b.location) === normalizeBusLocation(locationFilter))
    : buses;

  const assignedBusIds = new Set(workers.map(w => w.assignedBusId).filter(Boolean));

  // Helper for RTL & Column Widths
  const setupWorksheet = (ws: XLSX.WorkSheet, data: any[]) => {
    if (data && data.length > 0) {
      const keys = Object.keys(data[0]);
      const colWidths = keys.map(key => {
        let maxLen = key.length;
        data.forEach(row => {
          const val = row[key];
          if (val !== undefined && val !== null) {
            const str = String(val);
            if (str.length > maxLen) maxLen = str.length;
          }
        });
        return { wch: Math.min(Math.max(maxLen + 4, 12), 65) };
      });
      ws['!cols'] = colWidths;
    }
    (ws as any)['!views'] = [{ rightToLeft: true }];
  };

  // Group all buses by location
  const locationMap: {
    [loc: string]: {
      total: number;
      available: number;
      inService: number;
      maintenance: number;
      modelMap: { 
        [model: string]: { 
          count: number; 
          ops: string[]; 
          plates: string[]; 
          categories: Set<string>; 
          manufacturers: Set<string>;
        } 
      };
      categoryMap: { 
        [category: string]: { 
          count: number; 
          models: Set<string>; 
          ops: string[];
        } 
      };
      categories: Set<string>;
      manufacturers: Set<string>;
    };
  } = {};

  buses.forEach(b => {
    const loc = normalizeBusLocation(b.location);
    if (!locationMap[loc]) {
      locationMap[loc] = {
        total: 0,
        available: 0,
        inService: 0,
        maintenance: 0,
        modelMap: {},
        categoryMap: {},
        categories: new Set(),
        manufacturers: new Set(),
      };
    }

    locationMap[loc].total += 1;
    const cat = (b.category || '').trim() || 'غير محدد';
    const m = (b.model || '').trim() || 'غير محدد';
    const mfg = (b.manufacturer || '').trim() || 'غير محدد';

    locationMap[loc].categories.add(cat);
    if (b.manufacturer) locationMap[loc].manufacturers.add(b.manufacturer);

    // Track by model
    if (!locationMap[loc].modelMap[m]) {
      locationMap[loc].modelMap[m] = { 
        count: 0, 
        ops: [], 
        plates: [], 
        categories: new Set(), 
        manufacturers: new Set() 
      };
    }
    locationMap[loc].modelMap[m].count += 1;
    locationMap[loc].modelMap[m].categories.add(cat);
    if (b.manufacturer) locationMap[loc].modelMap[m].manufacturers.add(b.manufacturer);
    if (b.operationalNumber) locationMap[loc].modelMap[m].ops.push(b.operationalNumber);
    if (b.plateNumber) locationMap[loc].modelMap[m].plates.push(b.plateNumber);

    // Track by category (نوع الحافلة)
    if (!locationMap[loc].categoryMap[cat]) {
      locationMap[loc].categoryMap[cat] = { count: 0, models: new Set(), ops: [] };
    }
    locationMap[loc].categoryMap[cat].count += 1;
    locationMap[loc].categoryMap[cat].models.add(m);
    if (b.operationalNumber) locationMap[loc].categoryMap[cat].ops.push(b.operationalNumber);

    const isUnderMaintenance = b.technicalStatus === 'تحت الصيانة' || b.technicalStatus === 'متوقف';
    if (isUnderMaintenance) {
      locationMap[loc].maintenance += 1;
    } else if (assignedBusIds.has(b.id)) {
      locationMap[loc].inService += 1;
    } else {
      locationMap[loc].available += 1;
    }
  });

  // Collect all unique models across the entire fleet sorted descending
  const allModelsSet = new Set<string>();
  const allCategoriesSet = new Set<string>();
  buses.forEach(b => {
    const m = (b.model || '').trim();
    if (m) allModelsSet.add(m);
    const c = (b.category || '').trim();
    if (c) allCategoriesSet.add(c);
  });
  const sortedModels = Array.from(allModelsSet).sort((a, b) => {
    const numA = parseInt(a, 10);
    const numB = parseInt(b, 10);
    if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
    return a.localeCompare(b, 'ar');
  });
  const sortedCategories = Array.from(allCategoriesSet).sort((a, b) => a.localeCompare(b, 'ar'));

  const workbook = XLSX.utils.book_new();

  // If a specific location is selected, create a dedicated detailed sheet for it first
  if (isFiltered) {
    const locData = locationMap[locationFilter.trim()] || {
      total: 0,
      available: 0,
      inService: 0,
      maintenance: 0,
      modelMap: {},
      categoryMap: {},
      categories: new Set(),
      manufacturers: new Set()
    };

    const specificLocationRows = Object.entries(locData.modelMap)
      .map(([model, info], idx) => {
        const pctInLoc = locData.total > 0 ? ((info.count / locData.total) * 100).toFixed(1) : '0';
        const pctInFleet = totalBuses > 0 ? ((info.count / totalBuses) * 100).toFixed(1) : '0';
        return {
          'م': idx + 1,
          'مكان العمل': locationFilter,
          'نوع / فئة الحافلة': Array.from(info.categories).join(' ، ') || 'غير محدد',
          'الموديل / سنة الصنع': model,
          'الشركة المصنعة (الماركة)': Array.from(info.manufacturers).join(' ، ') || '—',
          'عدد الحافلات': info.count,
          'نسبة الموديل داخل الموقع': `${pctInLoc}%`,
          'نسبة الموديل من إجمالي الأسطول': `${pctInFleet}%`,
          'أرقام التشغيل للحافلات': info.ops.join(' ، ') || '—',
          'أرقام اللوحات': info.plates.join(' ، ') || '—'
        };
      })
      .sort((a, b) => {
        const numA = parseInt(a['الموديل / سنة الصنع'], 10);
        const numB = parseInt(b['الموديل / سنة الصنع'], 10);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return b['عدد الحافلات'] - a['عدد الحافلات'];
      });

    const specificSheet = XLSX.utils.json_to_sheet(specificLocationRows);
    setupWorksheet(specificSheet, specificLocationRows);
    safeAddSheet(workbook, specificSheet, `موديلات ${locationFilter}`);
  }

  // Sheet 1: ملخص المواقع وتوزيع الموديلات والأنواع (Workplace, Models & Bus Types Summary)
  const summaryRows = Object.entries(locationMap)
    .map(([locName, data], idx) => {
      // Build text summary of models: e.g. "موديل 2024 (12) ، موديل 2023 (8)"
      const modelsList = Object.entries(data.modelMap)
        .sort((a, b) => {
          const numA = parseInt(a[0], 10);
          const numB = parseInt(b[0], 10);
          if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
          return b[1].count - a[1].count;
        });

      const modelsSummary = modelsList
        .map(([m, info]) => `موديل ${m} (${info.count} حافلة)`)
        .join(' | ');

      // Build text summary of categories: e.g. "VIP (10) | عمال (8)"
      const categoriesSummary = Object.entries(data.categoryMap)
        .sort((a, b) => b[1].count - a[1].count)
        .map(([cat, info]) => `${cat} (${info.count} حافلة)`)
        .join(' | ');

      const topModel = modelsList.length > 0 
        ? `موديل ${modelsList[0][0]} (${modelsList[0][1].count} حافلة)`
        : '—';

      const numericYears = modelsList
        .map(([m]) => parseInt(m, 10))
        .filter(y => !isNaN(y) && y > 1900);
      const newestYear = numericYears.length > 0 ? Math.max(...numericYears) : '—';
      const oldestYear = numericYears.length > 0 ? Math.min(...numericYears) : '—';

      return {
        'م': idx + 1,
        'مكان العمل': locName,
        'عدد الحافلات': data.total,
        'نسبة الأسطول بالموقع': totalBuses > 0 ? `${((data.total / totalBuses) * 100).toFixed(1)}%` : '0%',
        'نوع / فئات الحافلات بالموقع': Array.from(data.categories).join(' ، ') || '—',
        'توزيع أنواع الحافلات وأعدادها': categoriesSummary || 'غير محدد',
        'تفصيل الموديلات وأعدادها': modelsSummary || 'غير محدد',
        'الموديل الأكثر عدداً بالموقع': topModel,
        'الشركات المصنعة / الماركات': Array.from(data.manufacturers).join(' ، ') || '—',
        'أحدث موديل': newestYear,
        'أقدم موديل': oldestYear,
        'الحافلات المتاحة': data.available,
        'في الخدمة': data.inService,
        'تحت الصيانة / متوقفة': data.maintenance
      };
    })
    .sort((a, b) => b['عدد الحافلات'] - a['عدد الحافلات']);

  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  setupWorksheet(summarySheet, summaryRows);
  safeAddSheet(workbook, summarySheet, 'ملخص المواقع والموديلات');

  // Sheet 2: مصفوفة تقاطعية (مكان العمل × الموديلات)
  const matrixRows = Object.entries(locationMap)
    .map(([locName, data]) => {
      const row: any = {
        'مكان العمل': locName,
        'إجمالي عدد الحافلات': data.total,
        'أنواع وفئات الحافلات': Array.from(data.categories).join(' ، ') || '—'
      };

      // Add column for each model
      sortedModels.forEach(m => {
        row[`موديل ${m}`] = data.modelMap[m]?.count || 0;
      });

      row['الحافلات المتاحة'] = data.available;
      row['في الخدمة'] = data.inService;
      row['تحت الصيانة'] = data.maintenance;
      return row;
    })
    .sort((a, b) => b['إجمالي عدد الحافلات'] - a['إجمالي عدد الحافلات']);

  // Add Grand Total row to matrix
  if (matrixRows.length > 0) {
    const totalRow: any = {
      'مكان العمل': '⭐ الإجمالي العام للأسطول',
      'إجمالي عدد الحافلات': totalBuses,
      'أنواع وفئات الحافلات': sortedCategories.join(' ، ') || '—'
    };
    sortedModels.forEach(m => {
      const sum = buses.filter(b => (b.model || '').trim() === m).length;
      totalRow[`موديل ${m}`] = sum;
    });
    totalRow['الحافلات المتاحة'] = Object.values(locationMap).reduce((s, v) => s + v.available, 0);
    totalRow['في الخدمة'] = Object.values(locationMap).reduce((s, v) => s + v.inService, 0);
    totalRow['تحت الصيانة'] = Object.values(locationMap).reduce((s, v) => s + v.maintenance, 0);
    matrixRows.push(totalRow);
  }

  const matrixSheet = XLSX.utils.json_to_sheet(matrixRows);
  setupWorksheet(matrixSheet, matrixRows);
  safeAddSheet(workbook, matrixSheet, 'مصفوفة الموديلات والمواقع');

  // Sheet 3: مصفوفة أنواع وفئات الحافلات حسب الموقع (مكان العمل × نوع الحافلة)
  const categoryMatrixRows = Object.entries(locationMap)
    .map(([locName, data]) => {
      const row: any = {
        'مكان العمل': locName,
        'إجمالي عدد الحافلات': data.total,
      };

      // Add column for each category
      sortedCategories.forEach(cat => {
        row[`نوع: ${cat}`] = data.categoryMap[cat]?.count || 0;
      });

      row['أبرز الموديلات بالموقع'] = Object.keys(data.modelMap).sort().join(' ، ') || '—';
      return row;
    })
    .sort((a, b) => b['إجمالي عدد الحافلات'] - a['إجمالي عدد الحافلات']);

  if (categoryMatrixRows.length > 0) {
    const catTotalRow: any = {
      'مكان العمل': '⭐ الإجمالي العام للأسطول',
      'إجمالي عدد الحافلات': totalBuses,
    };
    sortedCategories.forEach(cat => {
      const sum = buses.filter(b => (b.category || '').trim() === cat).length;
      catTotalRow[`نوع: ${cat}`] = sum;
    });
    catTotalRow['أبرز الموديلات بالموقع'] = sortedModels.join(' ، ') || '—';
    categoryMatrixRows.push(catTotalRow);
  }

  const categoryMatrixSheet = XLSX.utils.json_to_sheet(categoryMatrixRows);
  setupWorksheet(categoryMatrixSheet, categoryMatrixRows);
  safeAddSheet(workbook, categoryMatrixSheet, 'مصفوفة أنواع الحافلات');

  // Sheet 4: توزيع الموديلات والأنواع التفصيلي لكل مكان عمل (مكان العمل | نوع الحافلة | الموديل | عدد الحافلات | أرقام التشغيل)
  const detailedBreakdownRows: any[] = [];
  let rowIdx = 1;

  Object.entries(locationMap)
    .sort((a, b) => b[1].total - a[1].total)
    .forEach(([locName, data]) => {
      // Group by (model + category)
      const locBuses = buses.filter(b => normalizeBusLocation(b.location) === locName);
      const comboMap: { 
        [key: string]: { 
          model: string; 
          category: string; 
          mfg: string; 
          count: number; 
          ops: string[]; 
          plates: string[];
          seats: Set<number>;
        } 
      } = {};

      locBuses.forEach(b => {
        const m = (b.model || '').trim() || 'غير محدد';
        const c = (b.category || '').trim() || 'غير محدد';
        const key = `${m}___${c}`;
        if (!comboMap[key]) {
          comboMap[key] = {
            model: m,
            category: c,
            mfg: b.manufacturer || '—',
            count: 0,
            ops: [],
            plates: [],
            seats: new Set()
          };
        }
        comboMap[key].count += 1;
        if (b.operationalNumber) comboMap[key].ops.push(b.operationalNumber);
        if (b.plateNumber) comboMap[key].plates.push(b.plateNumber);
        if (b.seatsCount) comboMap[key].seats.add(b.seatsCount);
      });

      const sortedCombos = Object.values(comboMap).sort((a, b) => {
        const numA = parseInt(a.model, 10);
        const numB = parseInt(b.model, 10);
        if (!isNaN(numA) && !isNaN(numB)) return numB - numA;
        return b.count - a.count;
      });

      sortedCombos.forEach(item => {
        const pctInLoc = data.total > 0 ? ((item.count / data.total) * 100).toFixed(1) : '0';
        const pctInFleet = totalBuses > 0 ? ((item.count / totalBuses) * 100).toFixed(1) : '0';
        const seatsText = Array.from(item.seats).map(s => `${s} راكب`).join(' ، ');

        detailedBreakdownRows.push({
          'م': rowIdx++,
          'مكان العمل': locName,
          'نوع / فئة الحافلة': item.category,
          'الموديل / سنة الصنع': item.model,
          'الشركة المصنعة (الماركة)': item.mfg,
          'عدد الحافلات': item.count,
          'نسبة التوزيع داخل الموقع': `${pctInLoc}%`,
          'نسبة التوزيع من الأسطول': `${pctInFleet}%`,
          'سعة المقاعد': seatsText || '—',
          'أرقام التشغيل للحافلات': item.ops.join(' ، ') || '—',
          'أرقام اللوحات': item.plates.join(' ، ') || '—'
        });
      });
    });

  const detailedBreakdownSheet = XLSX.utils.json_to_sheet(detailedBreakdownRows);
  setupWorksheet(detailedBreakdownSheet, detailedBreakdownRows);
  safeAddSheet(workbook, detailedBreakdownSheet, 'توزيع الموديلات والأنواع');

  // Sheet 5: كشف الحافلات الميداني
  const fleetListRows = targetBuses.map((bus, idx) => {
    const assignedWorkers = workers.filter(w => w.assignedBusId === bus.id);
    const workerNames = assignedWorkers.map(w => w.name).join(' ، ');

    let opStatus = 'متاحة للتشغيل';
    const isUnderMaintenance = bus.technicalStatus === 'تحت الصيانة' || bus.technicalStatus === 'متوقف';
    if (isUnderMaintenance) opStatus = 'تحت الصيانة / متوقفة';
    else if (assignedBusIds.has(bus.id)) opStatus = 'في الخدمة';

    return {
      'م': idx + 1,
      'مكان العمل': normalizeBusLocation(bus.location),
      'نوع / فئة الحافلة': bus.category || 'غير محدد',
      'الموديل': bus.model || 'غير محدد',
      'الشركة المصنعة': bus.manufacturer || '—',
      'عدد الحافلات': 1,
      'رقم التشغيل': bus.operationalNumber,
      'رقم اللوحة': bus.plateNumber,
      'عدد المقاعد': bus.seatsCount ? `${bus.seatsCount} راكب` : '—',
      'حالة التشغيل الميدانية': opStatus,
      'الحالة الفنية': bus.technicalStatus || '—',
      'اللون': bus.color || '—',
      'السائق / الكادر المرتبط': workerNames || 'غير معين',
      'ملاحظات': bus.notes || '—'
    };
  });

  const fleetListSheet = XLSX.utils.json_to_sheet(fleetListRows);
  setupWorksheet(fleetListSheet, fleetListRows);
  safeAddSheet(workbook, fleetListSheet, isFiltered ? `حافلات ${locationFilter}` : 'كشف الحافلات الميداني');

  const todayStr = new Date().toLocaleDateString('ar-SA').replace(/\//g, '-');
  const fileName = isFiltered
    ? `تقرير_موديلات_وأنواع_الحافلات_موقع_${locationFilter.trim().replace(/\s+/g, '_')}_${todayStr}.xlsx`
    : `تقرير_توزيع_الحافلات_والموديلات_والأنواع_حسب_مكان_العمل_${todayStr}.xlsx`;

  XLSX.writeFile(workbook, fileName);
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
    'موقع عمل الباص': normalizeBusLocation(bus.location),
    'ملاحظات': bus.notes,
  })));
  const workbook = XLSX.utils.book_new();
  safeAddSheet(workbook, worksheet, 'الأسطول');
  XLSX.writeFile(workbook, `أسطول_درة_المنورة_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
};

export const exportWorkersToExcel = (data: Worker[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(worker => {
    const historySummary = worker.workHistory && worker.workHistory.length > 0
      ? worker.workHistory.map(h => `${h.clientOrProject} (${h.startDate || ''} إلى ${h.endDate || 'مستمر'}${h.role ? ` - ${h.role}` : ''})`).join(' | ')
      : '';

    return {
      'رقم العامل': worker.workerNumber,
      'اسم العامل': worker.name,
      'رقم الإقامة': worker.iqamaNumber,
      'الهوية الوطنية': worker.nationalId || '',
      'رقم الجوال': worker.mobileNumber,
      'شركة الاستقدام': worker.recruitmentCompany,
      'مكان العمل الحالي': normalizeBusLocation(worker.workplace),
      'الراتب الأساسي': worker.basicSalary || '',
      'الحافلة المرتبطة': worker.assignedBusOperationalNumber || 'غير مرتبط',
      'الحافلات السابقة': worker.previousBuses || '',
      'بداية العمل الحالي': worker.startDate,
      'نهاية العمل': worker.endDate,
      'العميل الحالي': worker.clientName,
      'أرشيف الأعمال والمشاريع السابقة': historySummary,
      'ملاحظات': worker.notes || ''
    };
  }));
  const workbook = XLSX.utils.book_new();
  safeAddSheet(workbook, worksheet, 'العمال');
  XLSX.writeFile(workbook, `عمال_درة_المنورة_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
};

export const exportSalariesToExcel = (data: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(data.map(s => ({
    'الشهر': s.month,
    'الرقم الوظيفي': s.workerNumber,
    'اسم العامل / السائق': s.workerName,
    'موقع العمل': normalizeBusLocation(s.workLocation),
    'الراتب الأساسي الشهري': s.baseSalary,
    'أيام العمل الفعلية (من 30)': s.workingDays !== undefined ? s.workingDays : 30,
    'الراتب الأساسي المستحق': s.earnedBaseSalary !== undefined ? s.earnedBaseSalary : s.baseSalary,
    'ساعات العمل الإضافي': s.extraHours,
    'قيمة العمل الإضافي': s.extraHoursValue,
    'بدل المرابطة': s.morabata,
    'إجمالي المستحق (المجموع)': s.totalSalary,
    'الحالة': s.status === 'paid' ? 'تم الصرف' : 'قيد الانتظار',
    'ملاحظات': s.notes
  })));
  const workbook = XLSX.utils.book_new();
  safeAddSheet(workbook, worksheet, 'الرواتب');
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

export const exportCompanyDriversToExcel = (drivers: any[], workers?: any[]) => {
  const worksheet = XLSX.utils.json_to_sheet(drivers.map((d, index) => {
    let formattedDate = '';
    if (d.statusUpdatedAt) {
      try {
        const dt = new Date(d.statusUpdatedAt);
        formattedDate = !isNaN(dt.getTime()) ? dt.toISOString().split('T')[0] : String(d.statusUpdatedAt);
      } catch {
        formattedDate = String(d.statusUpdatedAt);
      }
    }

    const effectiveType = d.iqamaNumber ? 'مقيم' : (d.borderNumber ? 'موسمي' : (d.driverType || 'مقيم'));
    const classification = getDriverClassification(d, workers);

    return {
      'الرقم المتسلسل': d.serialNumber || (index + 1),
      'اسم السائق الثلاثي': d.fullName || '',
      'الصفة النظامية': effectiveType,
      'تصنيف السائق': classification,
      'الحالة': d.status || 'نشط',
      'تاريخ آخر تحديث للحالة': formattedDate,
      'سبب الحالة': d.statusReason || '',
      'الجنسية': d.nationality || '',
      'رقم الإقامة': d.iqamaNumber || '',
      'رقم الحدود': d.borderNumber || '',
      'رقم الموبايل': d.mobileNumber || '',
      'رقم الحافلة': d.busNumber || '',
      'ملاحظات': d.notes || ''
    };
  }));

  const workbook = XLSX.utils.book_new();
  safeAddSheet(workbook, worksheet, 'سائقين الشركة');
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(workbook, `سائقين_شركة_درة_المنورة_${dateStr}.xlsx`);
};

export const downloadCompanyDriversTemplate = () => {
  const today = new Date().toISOString().split('T')[0];
  const sampleData = [
    {
      'م': 1,
      'اسم السائق الثلاثي': 'محمد أحمد السعيد',
      'الصفة النظامية': 'مقيم',
      'تصنيف السائق': 'نقل عمال',
      'الحالة': 'نشط',
      'تاريخ آخر تحديث للحالة': today,
      'سبب الحالة': 'جاهز ومتاح للعمل',
      'الجنسية': 'مصر',
      'رقم الإقامة': '2345678901',
      'رقم الحدود': '',
      'رقم الموبايل': '0501234567',
      'رقم الحافلة': '101',
      'ملاحظات': 'سائق حافلة كبيرة'
    },
    {
      'م': 2,
      'اسم السائق الثلاثي': 'عبدالله خان رحمن',
      'الصفة النظامية': 'مقيم',
      'تصنيف السائق': 'عمرة',
      'الحالة': 'في إجازة',
      'تاريخ آخر تحديث للحالة': today,
      'سبب الحالة': 'إجازة سنوية لمدة 30 يوم',
      'الجنسية': 'باكستان',
      'رقم الإقامة': '2456789012',
      'رقم الحدود': '',
      'رقم الموبايل': '0559876543',
      'رقم الحافلة': '105',
      'ملاحظات': 'تشغيل مسارات العمرة'
    },
    {
      'م': 3,
      'اسم السائق الثلاثي': 'طارق عمر الفضلي',
      'الصفة النظامية': 'موسمي',
      'تصنيف السائق': 'عمرة',
      'الحالة': 'مستبعد',
      'تاريخ آخر تحديث للحالة': today,
      'سبب الحالة': 'انتهاء موسم العمرة',
      'الجنسية': 'اليمن',
      'رقم الإقامة': '',
      'رقم الحدود': '3987654321',
      'رقم الموبايل': '0561122334',
      'رقم الحافلة': '120',
      'ملاحظات': 'موسمي برقم حدود'
    }
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  safeAddSheet(workbook, worksheet, 'نموذج سائقين الشركة');
  XLSX.writeFile(workbook, `نموذج_استيراد_سائقين_الشركة.xlsx`);
};

export const parseCompanyDriversExcel = (file: File, workers?: any[]): Promise<any[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet) as any[];

        const mapped = json.map(row => {
          // Normalize driver type (تصنيف السائق)
          const rawType = String(
            row['التصنيف'] || 
            row['نوع السائق'] || 
            row['الصفة'] || 
            row['Driver Type'] || 
            row['Type'] || 
            ''
          ).trim();

          let driverType: 'مقيم' | 'مؤقت' | 'موسمي' = 'مقيم';
          if (rawType.includes('موسم')) {
            driverType = 'موسمي';
          } else if (rawType.includes('مؤقت') || rawType.includes('مؤقتة')) {
            driverType = 'مؤقت';
          } else if (rawType.includes('مقيم') || rawType.includes('دائم')) {
            driverType = 'مقيم';
          }

          // Normalize driver status (حالة السائق: نشط / في إجازة / مستبعد)
          const rawStatus = String(
            row['الحالة'] || 
            row['حالة السائق'] || 
            row['Status'] || 
            ''
          ).trim();

          let status: 'نشط' | 'في إجازة' | 'مستبعد' = 'نشط';
          if (rawStatus.includes('إجازة') || rawStatus.includes('اجازة')) {
            status = 'في إجازة';
          } else if (rawStatus.includes('مستبعد') || rawStatus.includes('موقوف') || rawStatus.includes('استبعاد')) {
            status = 'مستبعد';
          } else if (rawStatus.includes('نشط') || rawStatus.includes('فعال') || rawStatus.includes('متاح')) {
            status = 'نشط';
          }

          const rawStatusDate = String(
            row['تاريخ آخر تحديث للحالة'] || 
            row['تاريخ تحديث الحالة'] || 
            row['تاريخ الحالة'] || 
            row['Status Date'] || 
            ''
          ).trim();
          const statusUpdatedAt = rawStatusDate || new Date().toISOString();

          const statusReason = String(
            row['سبب الحالة'] || 
            row['سبب الإجازة'] || 
            row['سبب الاستبعاد'] || 
            row['Status Reason'] || 
            ''
          ).trim();

          const fullName = String(
            row['اسم السائق الثلاثي'] || 
            row['اسم السائق'] || 
            row['الاسم الثلاثي'] || 
            row['الاسم'] || 
            row['الاسم الكامل'] || 
            row['Driver Name'] || 
            row['Name'] || 
            ''
          ).trim();

          const nationality = String(
            row['الجنسية'] || 
            row['جنسية'] || 
            row['البلد'] || 
            row['Nationality'] || 
            ''
          ).trim();

          const iqamaNumber = String(
            row['رقم الإقامة'] || 
            row['الإقامة'] || 
            row['رقم الاقامة'] || 
            row['الاقامة'] || 
            row['رقم الهوية'] || 
            row['Iqama Number'] || 
            row['Iqama'] || 
            ''
          ).trim();

          const borderNumber = String(
            row['رقم الحدود'] || 
            row['الحدود'] || 
            row['رقم الدخول'] || 
            row['Border Number'] || 
            row['Border'] || 
            ''
          ).trim();

          const mobileNumber = String(
            row['رقم الموبايل'] || 
            row['رقم الجوال'] || 
            row['الجوال'] || 
            row['الموبايل'] || 
            row['الهاتف'] || 
            row['Mobile'] || 
            row['Phone'] || 
            ''
          ).trim();

          const workplace = String(
            row['مكان العمل'] || 
            row['الموقع'] || 
            row['موقع العمل'] || 
            row['الفرع'] || 
            row['Workplace'] || 
            row['Location'] || 
            ''
          ).trim();

          const busNumber = String(
            row['رقم الحافلة'] || 
            row['الحافلة'] || 
            row['رقم الباص'] || 
            row['الباص'] || 
            row['رقم التشغيل'] || 
            row['حافلة'] || 
            row['Bus Number'] || 
            row['Bus'] || 
            ''
          ).trim();

          // Classification logic:
          // 1. If iqama number is provided -> driver is 'مقيم'
          // 2. If border number is provided without iqama -> driver is 'موسمي'
          if (iqamaNumber) {
            driverType = 'مقيم';
          } else if (borderNumber) {
            driverType = 'موسمي';
          }

          // Operation classification:
          // Check if driver is active in monitoring (الرقابة والمتابعة) -> automatically 'نقل عمال'
          const isMonitoringActive = isDriverActiveInMonitoring({ iqamaNumber }, workers);

          const rawClassification = String(
            row['تصنيف السائق'] || 
            row['التصنيف التشغيلي'] || 
            row['نوع العمل'] || 
            row['مكان العمل'] || 
            row['Workplace'] || 
            ''
          ).trim();
          const driverClassification = isMonitoringActive
            ? 'نقل عمال'
            : ((rawClassification.includes('عمرة') || rawClassification.includes('عمره')) 
                ? 'عمرة' 
                : 'نقل عمال');

          const notes = String(
            row['ملاحظات'] || 
            row['الملاحظات'] || 
            row['Notes'] || 
            ''
          ).trim();

          const rawSerial = row['الرقم المتسلسل'] || row['رقم متسلسل'] || row['م'] || row['الرقم'] || row['Serial Number'] || row['Serial'];
          const parsedSerial = parseInt(String(rawSerial || ''), 10);
          const serialNumber = (!isNaN(parsedSerial) && parsedSerial > 0) ? parsedSerial : undefined;

          return {
            serialNumber,
            fullName,
            driverType,
            driverClassification,
            status,
            statusUpdatedAt,
            statusReason,
            nationality,
            iqamaNumber,
            borderNumber,
            mobileNumber,
            workplace: driverClassification,
            busNumber,
            notes
          };
        }).filter(d => d.fullName || d.iqamaNumber || d.borderNumber || d.mobileNumber);

        resolve(mapped);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

/**
 * Exports Driver Responses to Excel (.xlsx) file, formatted for Excel and Google Sheets import,
 * including Iqama Number (رقم الإقامة) and Border Number (رقم الحدود) for each driver.
 */
/**
 * Exports Driver Responses to Excel (.xlsx) file, formatted for Excel and Google Sheets import,
 * including Iqama Number (رقم الإقامة) and Border Number (رقم الحدود) for each driver.
 */
export const exportDriverResponsesToExcel = (
  responses: DriverResponse[], 
  filenameOrDrivers?: string | CompanyDriver[],
  driversList?: CompanyDriver[]
) => {
  let filename = `ردود_وحركات_السائقين_${new Date().toISOString().split('T')[0]}.xlsx`;
  let drivers: CompanyDriver[] = [];

  if (typeof filenameOrDrivers === 'string') {
    filename = filenameOrDrivers;
    if (Array.isArray(driversList)) {
      drivers = driversList;
    }
  } else if (Array.isArray(filenameOrDrivers)) {
    drivers = filenameOrDrivers;
    if (typeof driversList === 'string') {
      filename = driversList;
    }
  } else if (Array.isArray(driversList)) {
    drivers = driversList;
  }

  // Ensure filename is string and ends with .xlsx
  if (typeof filename !== 'string' || !filename.trim()) {
    filename = `ردود_وحركات_السائقين_${new Date().toISOString().split('T')[0]}.xlsx`;
  }
  if (!filename.toLowerCase().endsWith('.xlsx')) {
    filename = `${filename}.xlsx`;
  }

  // Build lookup maps for fast matching by ID and serialNumber
  const driverById = new Map<string, CompanyDriver>();
  const driverBySerial = new Map<number, CompanyDriver>();
  drivers.forEach(d => {
    if (d && d.id) driverById.set(d.id, d);
    if (d && typeof d.serialNumber === 'number') driverBySerial.set(d.serialNumber, d);
  });

  const data = responses.map((r, index) => {
    const matchedDriver = (r.driverId && driverById.get(r.driverId)) || 
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

    return {
      'م': index + 1,
      'الرقم المتسلسل للسائق': r.driverSerialNumber,
      'اسم السائق': r.driverName || (matchedDriver ? matchedDriver.fullName : ''),
      'رقم الإقامة': iqamaNumber,
      'رقم الحدود': borderNumber,
      'رقم الحافلة': r.busNumber || (matchedDriver ? matchedDriver.busNumber : ''),
      'نوع الرد / الوجهة': r.responseType || '',
      'تاريخ ووقت الرد': formattedDate,
      'المسؤول عن التسجيل': r.recordedBy || r.createdBy || '',
      'الصفة': r.recordedByRole || '',
      'ملاحظات': r.notes || ''
    };
  });

  const ws = XLSX.utils.json_to_sheet(data);
  ws['!dir'] = 'rtl';
  ws['!cols'] = [
    { wch: 6 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 16 },
    { wch: 20 },
    { wch: 26 },
    { wch: 22 },
    { wch: 20 },
    { wch: 30 }
  ];

  const wb = XLSX.utils.book_new();
  safeAddSheet(wb, ws, 'ردود السائقين');

  try {
    XLSX.writeFile(wb, filename);
  } catch (err) {
    console.warn('XLSX.writeFile failed, downloading via Blob:', err);
    try {
      const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (blobErr) {
      console.error('Blob download also failed:', blobErr);
    }
  }
};

/**
 * Copies Driver Responses to clipboard in TSV (Tab Separated Values) format
 * so that it can be directly pasted (Ctrl+V) into any Google Sheet with columns preserved,
 * including Iqama Number (رقم الإقامة) and Border Number (رقم الحدود).
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
      const matchedDriver = (r.driverId && driverById.get(r.driverId)) || 
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
