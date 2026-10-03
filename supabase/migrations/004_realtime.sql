-- Enable realtime for alert-related tables
ALTER PUBLICATION supabase_realtime ADD TABLE alerts;
ALTER PUBLICATION supabase_realtime ADD TABLE notification_events;
ALTER PUBLICATION supabase_realtime ADD TABLE medical_documents;
ALTER PUBLICATION supabase_realtime ADD TABLE health_records;
ALTER PUBLICATION supabase_realtime ADD TABLE safety_events;
