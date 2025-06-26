export interface User {
  id: string;
  email: string;
  role: 'Admin' | 'PM' | 'Field';
  name: string;
  createdAt: Date;
}

export interface Project {
  id: string;
  name: string;
  type: string;
  contractValue: number;
  status: 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Closed';
  startDate: Date;
  dueDate: Date;
  completionPercentage: number;
  address: string;
  projectCode: string;
  client: string;
  fieldLeader?: string;
  description?: string;
  contingency_type?: 'percentage' | 'dollar';
  contingency_value?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BidTemplate {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface BidTemplateItem {
  id: string;
  templateId: string;
  category: string;
  subcategory: string;
  description: string;
  unit: string;
  unitCost: number;
  createdAt: Date;
}

export interface BidItem {
  id: string;
  projectId: string;
  templateId?: string;
  category: string;
  subcategory?: string;
  description: string;
  unit: string;
  unitCost: number;
  quantity: number;
  total: number;
}

export interface SOVItem {
  id: string;
  projectId: string;
  itemNumber: string;
  category: string;
  description: string;
  scheduledValue: number;
  previousApplications: number;
  thisPeriod: number;
  materialsStored: number;
  workCompletedFromPrevious: number;
  materialsPresently_stored: number;
  totalCompletedAndStored: number;
  percentComplete: number;
  retainagePercentage: number;
}

export interface PaymentApplicationG702 {
  id: string;
  projectId: string;
  applicationNumber: number;
  periodTo: Date;
  contractorName: string;
  contractorAddress: string;
  projectName: string;
  projectNumber: string;
  originalContractSum: number;
  netChangeByChangeOrders: number;
  contractSumToDate: number;
  totalCompletedAndStored: number;
  retainageCompletedWork: number;
  retainageStoredMaterials: number;
  totalRetainage: number;
  totalEarnedLessRetainage: number;
  lessPreviousCertificates: number;
  currentPaymentDue: number;
  balanceToFinish: number;
  architectSignature?: string;
  architectDate?: Date;
  contractorSignature?: string;
  contractorDate?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface Task {
  id: string;
  projectId: string;
  title: string;
  startDate: Date;
  endDate: Date;
  progress: number;
  status: 'Not Started' | 'In Progress' | 'Completed' | 'On Hold';
  dependencies: string[];
}

export interface ChangeOrder {
  id: string;
  projectId: string;
  number: string;
  date: Date;
  description: string;
  amount: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
}

export interface Proposal {
  id: string;
  projectName: string;
  client: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  projectAddress?: string;
  scope: string;
  amount: number;
  status: 'Draft' | 'Sent' | 'Approved' | 'Rejected';
  validDays?: number;
  notes?: string;
  proposalItems?: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
  createdAt: Date;
}

export interface MaintenanceLog {
  id: string;
  equipmentId: string;
  date: Date;
  description: string;
  cost: number;
  nextDue: Date;
}

export interface BurnRecord {
  id: string;
  projectId: string;
  date: Date;
  plannedCost: number;
  actualCost: number;
}

// New types for additional functionality
export interface Invoice {
  id: string;
  projectId?: string;
  invoiceNumber: string;
  clientName: string;
  clientAddress?: string;
  invoiceDate: Date;
  dueDate?: Date;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface BidPackage {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  dueDate?: Date;
  status: 'Draft' | 'Sent' | 'Received' | 'Awarded' | 'Cancelled';
  estimatedValue?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface BidPackageItem {
  id: string;
  bidPackageId: string;
  category: string;
  description: string;
  quantity: number;
  unit?: string;
  estimatedCost?: number;
}

export interface Subcontractor {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  specialties?: string[];
  rating?: number;
  status: 'Active' | 'Inactive' | 'Blacklisted';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectSubcontractor {
  id: string;
  projectId: string;
  subcontractorId: string;
  role?: string;
  contractAmount?: number;
  startDate?: Date;
  endDate?: Date;
  status: 'Pending' | 'Active' | 'Completed' | 'Terminated';
}

export interface Document {
  id: string;
  projectId?: string;
  name: string;
  category: 'General' | 'Contracts' | 'Plans' | 'Photos' | 'Reports' | 'Permits' | 'Invoices' | 'Change Orders';
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  version?: number;
  isCurrentVersion?: boolean;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface CompanySettings {
  id: string;
  companyName: string;
  companyAddress?: string;
  companyPhone?: string;
  companyEmail?: string;
  logoUrl?: string;
  defaultTaxRate?: number;
  defaultRetainageRate?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ProjectBilling {
  id: string;
  projectId: string;
  billingPeriodStart: Date;
  billingPeriodEnd: Date;
  invoiceNumber?: string;
  billedAmount: number;
  paidAmount: number;
  remainingAmount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  invoiceDate?: Date;
  dueDate?: Date;
  paymentDate?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface BillingLineItem {
  id: string;
  billingId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  sovItemId?: string;
  createdAt: Date;
}

// Re-export equipment types
export type { 
  Equipment, 
  EquipmentReservation, 
  EquipmentUsageLog, 
  EquipmentAlert, 
  EquipmentFilters
} from './equipment';
