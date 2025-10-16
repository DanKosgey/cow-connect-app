-- Migration: 20251013310000_enable_kyc_documents_rls.sql
-- Description: Enable RLS on kyc_documents table and create appropriate policies

BEGIN;

-- Enable RLS on kyc_documents table
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Create policies for kyc_documents table using safe approach
DO $$
BEGIN
  -- Farmers can view their own KYC documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Farmers can view their own KYC documents' 
    AND pc.relname = 'kyc_documents'
  ) THEN
    CREATE POLICY "Farmers can view their own KYC documents" 
      ON public.kyc_documents FOR SELECT 
      USING (
        farmer_id IN (
          SELECT id FROM public.farmers WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Admins can view all KYC documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can view all KYC documents' 
    AND pc.relname = 'kyc_documents'
  ) THEN
    CREATE POLICY "Admins can view all KYC documents" 
      ON public.kyc_documents FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;

  -- Farmers can insert their own KYC documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Farmers can insert their own KYC documents' 
    AND pc.relname = 'kyc_documents'
  ) THEN
    CREATE POLICY "Farmers can insert their own KYC documents" 
      ON public.kyc_documents FOR INSERT 
      WITH CHECK (
        farmer_id IN (
          SELECT id FROM public.farmers WHERE user_id = auth.uid()
        )
      );
  END IF;

  -- Admins can insert KYC documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can insert KYC documents' 
    AND pc.relname = 'kyc_documents'
  ) THEN
    CREATE POLICY "Admins can insert KYC documents" 
      ON public.kyc_documents FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;

  -- Admins can update KYC documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can update KYC documents' 
    AND pc.relname = 'kyc_documents'
  ) THEN
    CREATE POLICY "Admins can update KYC documents" 
      ON public.kyc_documents FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;

  -- Admins can delete KYC documents
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can delete KYC documents' 
    AND pc.relname = 'kyc_documents'
  ) THEN
    CREATE POLICY "Admins can delete KYC documents" 
      ON public.kyc_documents FOR DELETE 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;

EXCEPTION WHEN OTHERS THEN
  -- Log the error but continue
  RAISE NOTICE 'Error creating kyc_documents policies: %', SQLERRM;
END $$;

-- Grant necessary permissions
GRANT ALL ON public.kyc_documents TO authenticated;

COMMIT;