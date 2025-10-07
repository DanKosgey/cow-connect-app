-- Migration: 20251005_fix_farmers_table.sql
-- Description: Add missing columns to farmers table to match application expectations
BEGIN;

-- Add missing columns to farmers table
ALTER TABLE public.farmers 
ADD COLUMN IF NOT EXISTS kyc_rejection_reason text,
ADD COLUMN IF NOT EXISTS kyc_documents jsonb DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS email text,
ADD COLUMN IF NOT EXISTS physical_address text,
ADD COLUMN IF NOT EXISTS gps_latitude numeric,
ADD COLUMN IF NOT EXISTS gps_longitude numeric,
ADD COLUMN IF NOT EXISTS bank_account_name text,
ADD COLUMN IF NOT EXISTS bank_account_number text,
ADD COLUMN IF NOT EXISTS bank_name text,
ADD COLUMN IF NOT EXISTS bank_branch text,
ADD COLUMN IF NOT EXISTS status user_status_enum DEFAULT 'active',
ADD COLUMN IF NOT EXISTS registration_date timestamptz DEFAULT now();

-- Create the user_status_enum if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_status_enum') THEN
        CREATE TYPE user_status_enum AS ENUM ('active', 'inactive', 'suspended');
    END IF;
END$$;

-- Update the status column to use the enum if it was created as text
ALTER TABLE public.farmers 
ALTER COLUMN status TYPE user_status_enum 
USING status::user_status_enum;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_farmers_kyc_status ON public.farmers (kyc_status);
CREATE INDEX IF NOT EXISTS idx_farmers_status ON public.farmers (status);

COMMIT;