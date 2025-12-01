-- Migration: 20251201003_add_collection_fee_status.sql
-- Description: Add collection_fee_status column to collections table to track payment status of collector fees

BEGIN;

-- Add collection_fee_status column to collections table
-- This column will track whether the collector fee for a collection has been paid or is pending
ALTER TABLE collections 
ADD COLUMN IF NOT EXISTS collection_fee_status TEXT DEFAULT 'pending' 
CHECK (collection_fee_status IN ('pending', 'paid'));

-- Create an index for better performance when querying by collection_fee_status
CREATE INDEX IF NOT EXISTS idx_collections_fee_status ON collections (collection_fee_status);

-- Update existing records to have 'paid' status for collections that are already approved
-- This is a safe default since existing systems may have already processed these
UPDATE collections 
SET collection_fee_status = 'paid' 
WHERE approved_for_payment = true;

-- For collections that are approved but might not have been paid yet, we'll set them to pending
-- This will require manual review or can be updated by the payment system
UPDATE collections 
SET collection_fee_status = 'pending' 
WHERE approved_for_payment = true AND collection_fee_status IS NULL;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the column was added
-- SELECT column_name, data_type, is_nullable, column_default 
-- FROM information_schema.columns 
-- WHERE table_name = 'collections' AND column_name = 'collection_fee_status';

-- Check the distribution of statuses
-- SELECT collection_fee_status, COUNT(*) as count 
-- FROM collections 
-- GROUP BY collection_fee_status;

-- Check index creation
-- SELECT indexname, indexdef 
-- FROM pg_indexes 
-- WHERE tablename = 'collections' AND indexname = 'idx_collections_fee_status';