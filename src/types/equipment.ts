
export interface Equipment {
  id: string;
  name: string;
  category: string; // Changed from union type to string for flexibility
  hourly_rate: number;
  year?: number;
  value?: number;
  status: 'Available' | 'In Use' | 'Maintenance';
  image?: string;
  description?: string;
  created_at: string;
  updated_at: string;
  location?: string;
  project_assignment_id?: string;
  purchase_date?: string;
  depreciation_rate?: number;
  total_hours_used?: number;
  qr_code?: string;
  vin_serial_number?: string;
  specifications?: Record<string, any>;
  insurance_expiry?: string;
  last_inspection_date?: string;
}

export interface EquipmentReservation {
  id: string;
  equipment_id: string;
  project_id: string;
  start_date: string;
  end_date: string;
  status: 'Reserved' | 'Active' | 'Completed' | 'Cancelled';
  created_at: string;
  updated_at: string;
  notes?: string;
}

export interface EquipmentUsageLog {
  id: string;
  equipment_id: string;
  project_id?: string;
  start_time: string;
  end_time?: string;
  hours_used?: number;
  operator_name?: string;
  fuel_consumed?: number;
  created_at: string;
}

export interface EquipmentAlert {
  id: string;
  equipment_id: string;
  alert_type: string; // Changed from union type to string for flexibility
  message: string;
  severity: string; // Changed from union type to string for flexibility
  due_date?: string;
  is_acknowledged: boolean;
  acknowledged_at?: string;
  created_at: string;
}

export interface EquipmentFilters {
  search: string;
  status: string;
  category: string;
  location: string;
  project: string;
  maintenanceDue: boolean;
  availableOnly: boolean;
}
