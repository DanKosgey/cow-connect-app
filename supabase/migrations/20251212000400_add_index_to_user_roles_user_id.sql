-- Migration: 20251212000400_add_index_to_user_roles_user_id.sql
-- Description: Add index to user_roles.user_id for better query performance
-- This improves the performance of role lookups which was causing timeouts

BEGIN;

-- Add index on user_roles.user_id for better query performance
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);

-- Add index on user_roles.role for filtering by role
CREATE INDEX IF NOT EXISTS idx_user_roles_role ON public.user_roles (role);

-- Add composite index for common query patterns
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id_active ON public.user_roles (user_id, active);

COMMIT;

-- Verification queries
-- Check that the indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'user_roles' AND indexname LIKE 'idx_user_roles%';