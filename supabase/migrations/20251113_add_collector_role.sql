-- Migration: 20251113_add_collector_role.sql
-- Description: Add collector role to distinguish between field collectors and office staff
-- Estimated time: 30 seconds

BEGIN;

-- Add 'collector' to the user_role_enum
ALTER TYPE user_role_enum ADD VALUE IF NOT EXISTS 'collector';

-- Create a function to update existing staff users to collector role
-- This is a placeholder - in practice, you would need to determine which staff members
-- should be collectors vs milk approval staff based on your business logic
-- For now, we'll keep all staff as staff role and let the application handle the distinction

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
-- To rollback, you would need to recreate the type without the 'collector' value
-- This is a complex operation and should be done with caution in production

COMMIT;
*/