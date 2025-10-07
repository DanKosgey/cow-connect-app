-- Migration: 20251005_add_kyc_documents_policies.sql
-- Description: Add missing RLS policies for kyc_documents table and storage bucket
BEGIN;

-- Enable RLS on kyc_documents table
ALTER TABLE IF EXISTS public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for kyc_documents table
-- Farmers can read their own documents
CREATE POLICY "kyc_documents_select_own" ON public.kyc_documents
  FOR SELECT
  USING (
    farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Admins can insert documents
CREATE POLICY "kyc_documents_insert_admin" ON public.kyc_documents
  FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Admins can update document status
CREATE POLICY "kyc_documents_update_admin" ON public.kyc_documents
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Admins can delete documents
CREATE POLICY "kyc_documents_delete_admin" ON public.kyc_documents
  FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
  );

-- Enable RLS on storage.objects table
ALTER TABLE IF EXISTS storage.objects ENABLE ROW LEVEL SECURITY;

-- Create policies for kyc-documents storage bucket
-- Public can access documents (for viewing)
CREATE POLICY "kyc_documents_storage_select_public" ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'kyc-documents');

-- Authenticated users can upload documents
CREATE POLICY "kyc_documents_storage_insert_authenticated" ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'kyc-documents');

-- Users can update their own documents
CREATE POLICY "kyc_documents_storage_update_own" ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid() = owner_id);

-- Users can delete their own documents
CREATE POLICY "kyc_documents_storage_delete_own" ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'kyc-documents' AND auth.uid() = owner_id);

COMMIT;