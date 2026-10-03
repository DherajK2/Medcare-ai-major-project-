-- Create storage bucket for medical documents
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'medical-documents',
  'medical-documents',
  FALSE, -- Private, not public
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: only authorized users can access documents for their patients
CREATE POLICY "storage_upload_authorized" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'medical-documents' AND
    auth.uid() IS NOT NULL
  );

CREATE POLICY "storage_read_authorized" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'medical-documents' AND
    auth.uid() IS NOT NULL
  );
