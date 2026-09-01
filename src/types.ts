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

export type UserRole = 'admin' | 'supervisor' | 'readonly' | 'user' | 'pending';

export interface AppUser {
  uid: string;
  email: string;
  displayName: string | null;
  photoURL: string | null;
  role: UserRole;
  approved: boolean;
  createdAt?: any;
}

export interface AppSettings {
  logoURL: string;
  updatedAt?: any;
}
