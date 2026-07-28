import * as XLSX from 'xlsx';
import { Bus, Worker } from '../types';

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
