-- Migration: 20251015000500_add_approved_by_column_and_constraint.sql
-- Description: Add approved_by column and explicit foreign key constraint to collections table

BEGIN;

-- Add approved_by column to collections table
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS approved_by UUID;

-- Drop existing constraint if it exists (it might have an auto-generated name)
ALTER TABLE public.collections 
DROP CONSTRAINT IF EXISTS collections_approved_by_fkey;

-- Add explicit foreign key constraint with the name PostgREST expects
ALTER TABLE public.collections 
ADD CONSTRAINT collections_approved_by_fkey 
FOREIGN KEY (approved_by) REFERENCES public.staff(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_collections_approved_by ON public.collections (approved_by);

COMMIT;