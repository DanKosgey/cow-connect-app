-- Migration: 20251113_add_creditor_role.sql
-- Description: Add creditor role for agrovet workers
-- Estimated time: 30 seconds

BEGIN;

-- Add 'creditor' to the user_role_enum
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'creditor';

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the new role exists
SELECT enumlabel FROM pg_enum WHERE enumtypid = 'user_role_enum'::regtype ORDER BY enumsortorder;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Note: PostgreSQL doesn't allow removing values from ENUM types directly
-- To rollback, you would need to recreate the type without the 'creditor' value
-- This is a complex operation and should be done with caution in production

COMMIT;
*/