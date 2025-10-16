-- Migration: Create kyc-documents storage bucket
-- Description: Create the kyc-documents bucket for farmer KYC document storage

BEGIN;

-- Create the kyc-documents bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('kyc-documents', 'kyc-documents', true)
ON CONFLICT (id) DO NOTHING;

COMMIT;