export interface Bus {
  id: string;
  operationalNumber: string;
  plateNumber: string;
  category: string;
  model: string;
  manufacturer: string;
  color: string;
  technicalStatus: string;
  location: string;
  notes: string;
  seatsCount?: number;
  createdAt: any;
  updatedAt: any;
  createdBy: string;
}

export interface WorkerPreviousWork {
  id: string;
  clientOrProject: string; // اسم العميل / المشروع / الشركة (مثل: أمكور، أرامكو...)
  workplace?: string; // موقع العمل
  startDate: string; // من تاريخ
  endDate: string; // حتى تاريخ
  role?: string; // المسمى الوظيفي / طبيعة العمل (سائق، فني، مشرف...)
  notes?: string; // ملاحظات أو تقييم
}

export interface Worker {
  id: string;
  workerNumber: string;
  name: string;
  iqamaNumber: string;
  nationalId?: string;
  mobileNumber: string;
  recruitmentCompany: string;
  workplace: string;
  basicSalary?: number;
  startDate: string;
  endDate: string;
  clientName: string;
  assignedBusId?: string;
  assignedBusOperationalNumber?: string;
  assignedBusPlateNumber?: string;
  previousBuses?: string;
  workHistory?: WorkerPreviousWork[];
  notes: string;
  createdAt?: any;
}

export interface Contract {
  id: string;
  contractNumber: string;
  clientName: string;
  startDate: string;
  endDate: string;
  status: 'active' | 'expired' | 'pending';
  value: number;
  description: string;
  pdfUrl?: string;
  createdAt?: any;
  updatedAt?: any;
}

export interface SalaryRecord {
  id: string;
  workerId: string;
  workerName: string;
  workerNumber: string;
  month: string; // YYYY-MM
  baseSalary: number;
  workingDays?: number; // عدد أيام العمل الفعلية للشهر (افتراضياً 30 يوم)
  earnedBaseSalary?: number; // الراتب الأساسي المستحق حسب أيام العمل
  extraHours: number;
  extraHoursValue: number;
  morabata: number;
  totalSalary: number;
  status: 'pending' | 'paid';
  workLocation?: string;
  notes: string;
  createdAt?: any;
  updatedAt?: any;
}

export type UserRole = 
  | 'admin'           // مدير النظام
  | 'supervisor'      // موظف تشغيل (مشرف)
  | 'operator'        // موظف تشغيل
  | 'inspector'       // مراقب
  | 'bus_supervisor'  // مشرف نقل الحافلات
  | 'readonly'        // وضع قراءة فقط
  | 'user' 
  | 'pending';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  approved: boolean;
  canSubmitDriverResponses?: boolean; // تصريح خاص لتسجيل ردود وحركة السائقين
  createdAt?: any;
}

export interface AppSettings {
  logoURL: string;
  updatedAt?: any;
}

export type DriverType = 'مقيم' | 'مؤقت' | 'موسمي';
export type DriverStatus = 'نشط' | 'في إجازة' | 'مستبعد';
export type DriverResponseType = 'محايل عسير' | 'ينبع' | 'القصيم' | 'الرياض' | 'الترددية';
export type DriverClassification = 'نقل عمال' | 'عمرة';

export interface CompanyDriver {
  id: string;
  serialNumber?: number; // رقم متسلسل تلقائي يبدأ من 1 ولا يتكرر
  fullName: string; // اسم السائق الثلاثي
  nationality: string; // الجنسية
  driverType: DriverType; // مقيم - مؤقت - موسمي
  driverClassification?: DriverClassification | string; // تصنيف السائق: نقل عمال - عمرة
  status?: DriverStatus; // نشط - في إجازة - مستبعد (الافتراضي: نشط)
  statusUpdatedAt?: string | any; // تاريخ آخر تحديث للحالة
  statusReason?: string; // سبب الحالة (إجازة سنوية، انتهاء عقد، مخالفة...)
  iqamaNumber: string; // رقم الإقامة
  borderNumber: string; // رقم الحدود
  mobileNumber: string; // رقم الموبايل
  workplace?: string; // مكان العمل (legacy/متوافق)
  busNumber?: string; // رقم الحافلة
  notes?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
}

export interface DriverResponse {
  id: string;
  driverId: string; // معرف السائق المرتبط
  driverSerialNumber: number; // الرقم المتسلسل للسائق
  driverName: string; // اسم السائق
  busNumber: string; // رقم الحافلة
  responseType: DriverResponseType; // نوع الرد: محايل عسير - ينبع - القصيم - الرياض - الترددية
  notes?: string; // ملاحظات إضافية
  createdAt?: any;
  createdDate?: string; // تاريخ ووقت التسجيل بتنسيق مقروء
  createdBy?: string;
  recordedBy?: string; // اسم الموظف / المراقب / المشرف الذي سجل الرد
  recordedByRole?: string; // الدور الوظيفي للشخص الذي سجل الرد
}
