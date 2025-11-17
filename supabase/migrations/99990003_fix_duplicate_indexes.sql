-- Migration: 99990003_fix_duplicate_indexes.sql
-- Description: Remove duplicate indexes that were created multiple times
-- This migration cleans up duplicate index definitions that can cause performance issues

BEGIN;

-- Drop duplicate indexes on kyc_documents table
-- These indexes were created multiple times in different migrations
DROP INDEX IF EXISTS idx_kyc_documents_pending_farmer_id;
DROP INDEX IF EXISTS idx_kyc_documents_status;
DROP INDEX IF EXISTS idx_kyc_documents_document_type;
DROP INDEX IF EXISTS idx_kyc_documents_farmer_id;

-- Recreate the indexes once with proper definitions
CREATE INDEX IF NOT EXISTS idx_kyc_documents_pending_farmer_id ON kyc_documents(pending_farmer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_farmer_id ON kyc_documents(farmer_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_document_type ON kyc_documents(document_type);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_status ON kyc_documents(status);

-- Drop duplicate indexes on pending_farmers table
DROP INDEX IF EXISTS idx_pending_farmers_status;

-- Recreate the index once
CREATE INDEX IF NOT EXISTS idx_pending_farmers_status ON pending_farmers(status);

-- Drop duplicate indexes on collections table
DROP INDEX IF EXISTS idx_collections_approved_by;

-- Recreate the index once
CREATE INDEX IF NOT EXISTS idx_collections_approved_by ON public.collections (approved_by);

COMMIT;

-- Verification queries
-- Check that indexes exist correctly
SELECT indexname FROM pg_indexes WHERE tablename = 'kyc_documents' AND indexname LIKE 'idx_kyc_documents_%';
SELECT indexname FROM pg_indexes WHERE tablename = 'pending_farmers' AND indexname = 'idx_pending_farmers_status';
SELECT indexname FROM pg_indexes WHERE tablename = 'collections' AND indexname = 'idx_collections_approved_by';