-- Migration: 20251014000700_fix_kyc_documents_pending_farmer_id.sql
-- Description: Ensure kyc_documents table has pending_farmer_id column and proper indexes
-- Estimated time: 1 minute

-- ============================================
-- UP MIGRATION
-- ============================================

BEGIN;

-- Add pending_farmer_id column to kyc_documents table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.columns 
        WHERE table_name = 'kyc_documents' 
        AND column_name = 'pending_farmer_id'
    ) THEN
        ALTER TABLE public.kyc_documents 
        ADD COLUMN pending_farmer_id UUID REFERENCES pending_farmers(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create index on pending_farmer_id for performance
CREATE INDEX IF NOT EXISTS idx_kyc_documents_pending_farmer_id 
ON kyc_documents(pending_farmer_id);

-- Update existing kyc_documents records to set pending_farmer_id based on farmer_id
-- Only run if pending_farmer_id is NULL and farmer_id exists
UPDATE kyc_documents 
SET pending_farmer_id = (
    SELECT pf.id 
    FROM pending_farmers pf 
    JOIN farmers f ON pf.user_id = f.user_id 
    WHERE f.id = kyc_documents.farmer_id
)
WHERE pending_farmer_id IS NULL AND farmer_id IS NOT NULL;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the column exists
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'kyc_documents' 
AND column_name = 'pending_farmer_id';

-- Check that the index exists
SELECT indexname 
FROM pg_indexes 
WHERE tablename = 'kyc_documents' 
AND indexname = 'idx_kyc_documents_pending_farmer_id';

COMMIT;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop index if it exists
DROP INDEX IF EXISTS idx_kyc_documents_pending_farmer_id;

-- Remove column if it exists (Note: This would lose data)
-- ALTER TABLE public.kyc_documents DROP COLUMN IF EXISTS pending_farmer_id;

COMMIT;
*/