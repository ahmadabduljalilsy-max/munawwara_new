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
    'الحافلة المرتبطة': worker.assignedBusOperationalNumber || 'غير مرتبط',
    'بداية العمل': worker.startDate,
    'نهاية العمل': worker.endDate,
    'العميل': worker.clientName,
  })));
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'العمال');
  XLSX.writeFile(workbook, `عمال_درة_المنورة_${new Date().toLocaleDateString('ar-SA')}.xlsx`);
};

export const parseExcel = (file: File): Promise<Partial<Bus>[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const data = new Uint8Array(e.target?.result as ArrayBuffer);
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      const mappedData = json.map(row => ({
        operationalNumber: String(row['رقم التشغيل'] || row['Operational Number'] || ''),
        plateNumber: String(row['رقم اللوحة'] || row['Plate Number'] || ''),
        category: String(row['فئة الحافلة'] || row['Category'] || ''),
        model: String(row['الموديل'] || row['Model'] || ''),
        manufacturer: String(row['الشركة المصنعة'] || row['Manufacturer'] || ''),
        color: String(row['اللون'] || row['Color'] || ''),
        technicalStatus: String(row['حالة الباص الفنية'] || row['Technical Status'] || ''),
        location: String(row['موقع عمل الباص'] || row['Location'] || ''),
        notes: String(row['ملاحظات'] || row['Notes'] || ''),
      })).filter(b => b.operationalNumber && b.plateNumber);
      
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
      const workbook = XLSX.read(data, { type: 'array' });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const json = XLSX.utils.sheet_to_json(worksheet) as any[];
      
      const mappedData = json.map(row => ({
        workerNumber: String(row['رقم العامل'] || row['Worker Number'] || ''),
        name: String(row['اسم العامل'] || row['Name'] || ''),
        iqamaNumber: String(row['رقم الإقامة'] || row['Iqama Number'] || ''),
        mobileNumber: String(row['رقم الجوال'] || row['Mobile'] || ''),
        recruitmentCompany: String(row['شركة الاستقدام'] || row['Company'] || ''),
        workplace: String(row['مكان العمل'] || row['Workplace'] || ''),
        assignedBusOperationalNumber: String(row['الحافلة المرتبطة'] || row['Bus Number'] || ''),
        assignedBusId: '',
        startDate: String(row['بداية العمل'] || row['Start Date'] || ''),
        endDate: String(row['نهاية العمل'] || row['End Date'] || ''),
        clientName: String(row['اسم العميل'] || row['Client Name'] || ''),
        notes: String(row['ملاحظات'] || row['Notes'] || ''),
      })).filter(w => w.name && w.iqamaNumber);
      
      resolve(mappedData);
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};
