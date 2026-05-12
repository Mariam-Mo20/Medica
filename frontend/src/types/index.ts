export interface User {
  id: number;
  tenant_id: number;
  email: string;
  full_name: string;
  role: "doctor" | "assistant";
  phone?: string;
  is_active: boolean;
  created_at: string;
}

export interface AuthUser {
  id: number;
  email: string;
  full_name: string;
  role: string;
  tenant_id: number;
  tenant_slug?: string;
  tenant_name?: string;
}

export interface Patient {
  id: number;
  tenant_id: number;
  medical_record_number: string;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  gender?: string;
  phone?: string;
  email?: string;
  address?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Doctor {
  id: number;
  tenant_id: number;
  user_id: number;
  full_name?: string;
  email?: string;
  specialization: string;
  license_number?: string;
  schedule?: Record<string, unknown>;
  created_at: string;
}

export interface Appointment {
  id: number;
  tenant_id: number;
  patient_id: number;
  doctor_id: number | null;
  receptionist_id?: number | null;
  scheduled_at: string;
  duration_minutes: number;
  status: string;
  reason?: string;
  notes?: string;
  recurring_rule?: string;
  recurring_end_date?: string;
  series_id?: string;
  is_series_cancelled: boolean;
  created_at: string;
  updated_at: string;
  patient_name?: string;
  doctor_name?: string;
}

export interface MedicalRecord {
  id: number;
  tenant_id: number;
  patient_id: number;
  appointment_id: number;
  doctor_id: number;
  diagnosis?: string;
  symptoms?: string;
  visit_notes?: string;
  created_at: string;
  updated_at: string;
  doctor_name?: string;
  appointment_date?: string;
}

export interface Prescription {
  id: number;
  tenant_id: number;
  medical_record_id: number;
  doctor_id: number;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration?: string;
  instructions?: string;
  created_at: string;
  doctor_name?: string;
}

export interface DashboardStats {
  total_patients: number;
  today_appointments: number;
  completed_appointments: number;
  cancelled_appointments: number;
  pending_appointments: number;
  active_doctors: number;
  new_patients_today: number;
  appointments_by_status: Array<{ status: string; count: number }>;
  appointments_trend: Array<Record<string, unknown>>;
  recent_appointments: Array<Record<string, unknown>>;
}

export interface Invitation {
  id: number;
  clinic_id: number;
  doctor_id: number;
  email?: string;
  role: string;
  token: string;
  status: string;
  expires_at: string;
  accepted_at: string | null;
  created_at: string;
  doctor_name?: string;
}


