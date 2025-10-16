-- Migration: 20251015000300_add_approved_by_to_collections.sql
-- Description: Add approved_by column to collections table to track staff who approved collections

BEGIN;

-- Add approved_by column to collections table
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES public.staff(id) ON DELETE SET NULL;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_collections_approved_by ON public.collections (approved_by);

COMMIT;