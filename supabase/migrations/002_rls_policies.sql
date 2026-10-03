-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE family_relationships ENABLE ROW LEVEL SECURITY;
ALTER TABLE medical_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE medications ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE medication_adherence ENABLE ROW LEVEL SECURITY;
ALTER TABLE doctors ENABLE ROW LEVEL SECURITY;
ALTER TABLE emergency_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE notification_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversation_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE safety_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function: check if user has access to patient
CREATE OR REPLACE FUNCTION user_can_access_patient(target_patient_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM family_relationships
    WHERE user_id = auth.uid()
    AND patient_id = target_patient_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Users: can only see their own record
CREATE POLICY "users_own_record" ON users
  FOR ALL USING (id = auth.uid());

-- Profiles: can only see/edit own profile
CREATE POLICY "profiles_own" ON profiles
  FOR ALL USING (id = auth.uid());

-- Patients: only authorized family/caregivers
CREATE POLICY "patients_authorized" ON patients
  FOR SELECT USING (user_can_access_patient(id));
CREATE POLICY "patients_create" ON patients
  FOR INSERT WITH CHECK (created_by = auth.uid());
CREATE POLICY "patients_update_owner" ON patients
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM family_relationships
            WHERE user_id = auth.uid() AND patient_id = patients.id AND role = 'owner')
  );

-- Family relationships: users see their own relationships
CREATE POLICY "family_relationships_own" ON family_relationships
  FOR SELECT USING (user_id = auth.uid() OR user_can_access_patient(patient_id));
CREATE POLICY "family_relationships_create" ON family_relationships
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM family_relationships fr
            WHERE fr.user_id = auth.uid() AND fr.patient_id = patient_id
            AND fr.role IN ('owner', 'caregiver'))
  );

-- Medical documents: authorized users only
CREATE POLICY "medical_documents_authorized" ON medical_documents
  FOR SELECT USING (user_can_access_patient(patient_id));
CREATE POLICY "medical_documents_create" ON medical_documents
  FOR INSERT WITH CHECK (
    user_can_access_patient(patient_id) AND uploaded_by = auth.uid()
  );

-- Health records: authorized users only
CREATE POLICY "health_records_authorized" ON health_records
  FOR SELECT USING (user_can_access_patient(patient_id));
CREATE POLICY "health_records_create" ON health_records
  FOR INSERT WITH CHECK (user_can_access_patient(patient_id));

-- Health metrics: authorized users only
CREATE POLICY "health_metrics_authorized" ON health_metrics
  FOR SELECT USING (user_can_access_patient(patient_id));

-- Medications: authorized users only
CREATE POLICY "medications_authorized" ON medications
  FOR SELECT USING (user_can_access_patient(patient_id));
CREATE POLICY "medications_manage" ON medications
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM family_relationships
            WHERE user_id = auth.uid() AND patient_id = medications.patient_id
            AND (role IN ('owner', 'caregiver') OR can_manage_medications = TRUE))
  );

-- Alerts: users who can receive alerts for that patient
CREATE POLICY "alerts_authorized" ON alerts
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM family_relationships
            WHERE user_id = auth.uid() AND patient_id = alerts.patient_id
            AND can_receive_alerts = TRUE)
  );

-- Conversations: own conversations only
CREATE POLICY "conversations_own" ON conversations
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "conversation_messages_own" ON conversation_messages
  FOR ALL USING (
    EXISTS (SELECT 1 FROM conversations WHERE id = conversation_id AND user_id = auth.uid())
  );

-- Doctors, emergency_contacts, appointments: authorized users only
CREATE POLICY "doctors_authorized" ON doctors FOR SELECT USING (user_can_access_patient(patient_id));
CREATE POLICY "emergency_contacts_authorized" ON emergency_contacts FOR SELECT USING (user_can_access_patient(patient_id));
CREATE POLICY "appointments_authorized" ON appointments FOR SELECT USING (user_can_access_patient(patient_id));

-- Safety events: authorized users only
CREATE POLICY "safety_events_authorized" ON safety_events FOR SELECT USING (user_can_access_patient(patient_id));

-- Audit logs: users can see their own audit entries
CREATE POLICY "audit_logs_own" ON audit_logs FOR SELECT USING (user_id = auth.uid());

-- Document chunks: NOT directly queryable by users (backend service only)
-- Use service_role for document_chunks access
CREATE POLICY "document_chunks_service_only" ON document_chunks
  FOR ALL USING (FALSE); -- Only service_role can access
