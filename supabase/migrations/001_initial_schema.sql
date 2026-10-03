-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- Enum types
CREATE TYPE relationship_role AS ENUM ('owner', 'caregiver', 'viewer', 'doctor');
CREATE TYPE processing_status AS ENUM ('uploaded', 'processing', 'ocr_required', 'extracting', 'structured', 'indexing', 'completed', 'failed');
CREATE TYPE alert_severity AS ENUM ('INFO', 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE alert_type AS ENUM ('health_threshold', 'health_trend', 'health_anomaly', 'medication_reminder', 'medication_missed', 'appointment_reminder', 'safety_event', 'missing_measurement', 'system');
CREATE TYPE safety_severity AS ENUM ('none', 'concern', 'moderate', 'high', 'immediate');
CREATE TYPE notification_channel AS ENUM ('email', 'sms', 'push', 'in_app');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'delivered', 'failed');
CREATE TYPE message_role AS ENUM ('user', 'assistant', 'system');
CREATE TYPE metric_type AS ENUM (
  'blood_pressure_systolic', 'blood_pressure_diastolic', 'blood_glucose',
  'hba1c', 'hemoglobin', 'cholesterol_total', 'heart_rate',
  'weight', 'temperature', 'oxygen_saturation', 'other'
);

-- Users (mirrors Supabase auth.users)
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- User profiles
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  phone TEXT,
  avatar_url TEXT,
  timezone TEXT DEFAULT 'UTC',
  notification_email BOOLEAN DEFAULT TRUE,
  notification_sms BOOLEAN DEFAULT FALSE,
  notification_push BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Patients
CREATE TABLE IF NOT EXISTS patients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_by UUID NOT NULL REFERENCES users(id),
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  date_of_birth DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other', 'prefer_not_to_say')),
  blood_type TEXT CHECK (blood_type IN ('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-')),
  phone TEXT,
  address TEXT,
  medical_notes TEXT,
  allergies JSONB DEFAULT '[]'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Family/caregiver relationships (access control core table)
CREATE TABLE IF NOT EXISTS family_relationships (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  relationship_label TEXT, -- 'son', 'daughter', 'spouse', 'caregiver', etc.
  role relationship_role NOT NULL DEFAULT 'viewer',
  can_view_records BOOLEAN DEFAULT TRUE,
  can_manage_medications BOOLEAN DEFAULT FALSE,
  can_receive_alerts BOOLEAN DEFAULT TRUE,
  is_emergency_contact BOOLEAN DEFAULT FALSE,
  authorized_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, patient_id)
);

-- Medical documents
CREATE TABLE IF NOT EXISTS medical_documents (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  uploaded_by UUID NOT NULL REFERENCES users(id),
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL, -- Supabase Storage path
  file_size_bytes BIGINT,
  mime_type TEXT NOT NULL,
  document_type TEXT, -- lab_report, prescription, doctor_note, etc.
  document_date DATE,
  processing_status processing_status DEFAULT 'uploaded',
  processing_error TEXT,
  extracted_text TEXT,
  extracted_data JSONB DEFAULT '{}'::JSONB,
  is_indexed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Document chunks (for RAG)
CREATE TABLE IF NOT EXISTS document_chunks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  document_id UUID NOT NULL REFERENCES medical_documents(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embedding_id TEXT, -- Pinecone vector ID
  metadata JSONB DEFAULT '{}'::JSONB, -- document_type, document_date, metric_type, etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Health records (individual measurements with provenance)
CREATE TABLE IF NOT EXISTS health_records (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  metric_type metric_type NOT NULL,
  value DECIMAL(10,4) NOT NULL,
  unit TEXT NOT NULL,
  measurement_date TIMESTAMPTZ NOT NULL,
  source_document_id UUID REFERENCES medical_documents(id) ON DELETE SET NULL,
  source_page INTEGER,
  extraction_method TEXT, -- 'manual', 'pdf_extraction', 'ocr', 'gemini_extraction'
  confidence DECIMAL(3,2), -- 0.00 to 1.00
  reference_range_min DECIMAL(10,4),
  reference_range_max DECIMAL(10,4),
  is_abnormal BOOLEAN DEFAULT FALSE,
  notes TEXT,
  recorded_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Latest health metrics per patient per metric_type (denormalized for fast dashboard)
CREATE TABLE IF NOT EXISTS health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  metric_type metric_type NOT NULL,
  latest_value DECIMAL(10,4),
  latest_unit TEXT,
  latest_date TIMESTAMPTZ,
  average_30d DECIMAL(10,4),
  trend_direction TEXT CHECK (trend_direction IN ('increasing', 'decreasing', 'stable', 'insufficient_data')),
  last_alert_severity alert_severity,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(patient_id, metric_type)
);

-- Medications
CREATE TABLE IF NOT EXISTS medications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  generic_name TEXT,
  dosage TEXT NOT NULL,
  frequency TEXT NOT NULL,
  route TEXT DEFAULT 'oral', -- oral, topical, injection, etc.
  start_date DATE NOT NULL,
  end_date DATE,
  prescribing_doctor TEXT,
  source_document_id UUID REFERENCES medical_documents(id) ON DELETE SET NULL,
  instructions TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  reminders_enabled BOOLEAN DEFAULT TRUE,
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication schedules
CREATE TABLE IF NOT EXISTS medication_schedules (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scheduled_time TIME NOT NULL,
  days_of_week JSONB DEFAULT '["mon","tue","wed","thu","fri","sat","sun"]'::JSONB,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Medication adherence log
CREATE TABLE IF NOT EXISTS medication_adherence (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  medication_id UUID NOT NULL REFERENCES medications(id) ON DELETE CASCADE,
  schedule_id UUID REFERENCES medication_schedules(id) ON DELETE SET NULL,
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  scheduled_datetime TIMESTAMPTZ NOT NULL,
  taken_at TIMESTAMPTZ,
  status TEXT CHECK (status IN ('taken', 'missed', 'skipped', 'pending')) DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Doctors
CREATE TABLE IF NOT EXISTS doctors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT,
  hospital TEXT,
  phone TEXT,
  email TEXT,
  address TEXT,
  notes TEXT,
  is_primary BOOLEAN DEFAULT FALSE,
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Emergency contacts
CREATE TABLE IF NOT EXISTS emergency_contacts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  relationship TEXT NOT NULL,
  phone TEXT NOT NULL,
  email TEXT,
  notification_preference notification_channel DEFAULT 'email',
  priority INTEGER DEFAULT 1, -- 1 = highest priority
  is_active BOOLEAN DEFAULT TRUE,
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Appointments
CREATE TABLE IF NOT EXISTS appointments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  doctor_id UUID REFERENCES doctors(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  appointment_datetime TIMESTAMPTZ NOT NULL,
  location TEXT,
  notes TEXT,
  reminder_sent BOOLEAN DEFAULT FALSE,
  status TEXT CHECK (status IN ('scheduled', 'completed', 'cancelled', 'missed')) DEFAULT 'scheduled',
  added_by UUID REFERENCES users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alerts
CREATE TABLE IF NOT EXISTS alerts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  alert_type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  metric_type TEXT,
  metric_value DECIMAL(10,4),
  source_id UUID, -- health_record_id, medication_id, etc.
  is_read BOOLEAN DEFAULT FALSE,
  is_dismissed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Notification events (delivery log)
CREATE TABLE IF NOT EXISTS notification_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  alert_id UUID REFERENCES alerts(id) ON DELETE CASCADE,
  recipient_user_id UUID REFERENCES users(id),
  recipient_email TEXT,
  recipient_phone TEXT,
  channel notification_channel NOT NULL,
  status notification_status DEFAULT 'pending',
  provider TEXT,
  provider_message_id TEXT,
  error_message TEXT,
  sent_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversations (AI chat sessions)
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  title TEXT,
  context_summary TEXT, -- brief summary of conversation context
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Conversation messages
CREATE TABLE IF NOT EXISTS conversation_messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  role message_role NOT NULL,
  content TEXT NOT NULL,
  sources JSONB DEFAULT '[]'::JSONB, -- [{document_id, document_type, document_date, score}]
  intent TEXT, -- detected intent: health_query, medication_query, etc.
  is_safety_response BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safety events
CREATE TABLE IF NOT EXISTS safety_events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  patient_id UUID NOT NULL REFERENCES patients(id) ON DELETE CASCADE,
  triggered_by UUID REFERENCES users(id),
  severity safety_severity NOT NULL,
  description TEXT,
  location TEXT,
  trigger_message TEXT, -- the message that triggered the safety event
  family_notified BOOLEAN DEFAULT FALSE,
  emergency_services_suggested BOOLEAN DEFAULT FALSE,
  resolved BOOLEAN DEFAULT FALSE,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Audit logs (security trail)
CREATE TABLE IF NOT EXISTS audit_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  patient_id UUID REFERENCES patients(id),
  action TEXT NOT NULL, -- 'login', 'patient_access', 'document_upload', 'record_view', etc.
  resource_type TEXT,
  resource_id UUID,
  details JSONB DEFAULT '{}'::JSONB, -- Non-sensitive context only
  ip_address INET,
  user_agent TEXT,
  success BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_family_relationships_user ON family_relationships(user_id);
CREATE INDEX idx_family_relationships_patient ON family_relationships(patient_id);
CREATE INDEX idx_medical_documents_patient ON medical_documents(patient_id);
CREATE INDEX idx_medical_documents_status ON medical_documents(processing_status);
CREATE INDEX idx_health_records_patient_metric ON health_records(patient_id, metric_type);
CREATE INDEX idx_health_records_date ON health_records(measurement_date DESC);
CREATE INDEX idx_medications_patient ON medications(patient_id);
CREATE INDEX idx_alerts_patient ON alerts(patient_id);
CREATE INDEX idx_alerts_severity ON alerts(severity);
CREATE INDEX idx_alerts_created ON alerts(created_at DESC);
CREATE INDEX idx_conversation_messages_conversation ON conversation_messages(conversation_id);
CREATE INDEX idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_patient ON audit_logs(patient_id);
CREATE INDEX idx_audit_logs_created ON audit_logs(created_at DESC);
CREATE INDEX idx_document_chunks_patient ON document_chunks(patient_id);

-- Updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers
CREATE TRIGGER update_patients_updated_at BEFORE UPDATE ON patients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medical_documents_updated_at BEFORE UPDATE ON medical_documents FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_medications_updated_at BEFORE UPDATE ON medications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_doctors_updated_at BEFORE UPDATE ON doctors FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to auto-create user record on Supabase auth signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email)
  VALUES (NEW.id, NEW.email)
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;

  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)))
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
