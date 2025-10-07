-- Migration: 20251005_fix_kyc_documents_table.sql
-- Description: Add missing columns to kyc_documents table
BEGIN;

-- Add missing columns to kyc_documents table
ALTER TABLE public.kyc_documents 
ADD COLUMN IF NOT EXISTS rejection_reason text,
ADD COLUMN IF NOT EXISTS verified_at timestamptz;

-- Ensure the status column uses the correct enum
ALTER TABLE public.kyc_documents 
ALTER COLUMN status TYPE kyc_doc_status_enum 
USING status::kyc_doc_status_enum;

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_kyc_documents_farmer_id ON public.kyc_documents (farmer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON public.kyc_documents (status);

COMMIT;