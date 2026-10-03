export interface Patient {
  id: string;
  user_id?: string;
  created_by?: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string;
  gender: string;
  blood_type?: string;
  phone?: string;
  address?: string;
  medical_notes?: string;
  allergies?: string[];
  medical_conditions?: string[];
  created_at?: string;
  updated_at?: string;
}