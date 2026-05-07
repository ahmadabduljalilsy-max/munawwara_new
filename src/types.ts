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
  createdAt: any;
  updatedAt: any;
  createdBy: string;
}

export interface Worker {
  id: string;
  workerNumber: string;
  name: string;
  iqamaNumber: string;
  mobileNumber: string;
  recruitmentCompany: string;
  workplace: string;
  startDate: string;
  endDate: string;
  clientName: string;
  assignedBusId?: string;
  assignedBusOperationalNumber?: string;
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

export type UserRole = 'admin' | 'supervisor' | 'user' | 'pending';

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
