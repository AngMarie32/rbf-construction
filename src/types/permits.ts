
export interface Permit {
  id: string;
  project_id: string;
  permit_number?: string;
  permit_type: 'Building' | 'Electrical' | 'Plumbing' | 'Mechanical' | 'Fire' | 'Demolition' | 'Grading' | 'Other';
  description: string;
  issuing_authority: string;
  application_date?: Date;
  issued_date?: Date;
  expiration_date?: Date;
  status: 'Not Applied' | 'Application Submitted' | 'Under Review' | 'Approved' | 'Issued' | 'Expired' | 'Rejected';
  fee_amount?: number;
  fee_paid?: boolean;
  notes?: string;
  documents?: string[];
  created_at: Date;
  updated_at: Date;
}

export interface PermitFilters {
  status?: string;
  permit_type?: string;
  project_id?: string;
  expiring_soon?: boolean;
}
