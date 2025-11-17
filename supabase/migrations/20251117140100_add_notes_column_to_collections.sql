-- Migration: 20251117140100_add_notes_column_to_collections.sql
-- Description: Add missing notes column to collections table
-- This migration addresses the 400 Bad Request errors related to the missing notes column

BEGIN;

-- Add notes column to collections table if it doesn't exist
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Add an index for better query performance on notes column
CREATE INDEX IF NOT EXISTS idx_collections_notes ON public.collections (notes);

COMMIT;

-- Verification query
-- Check that the column exists
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'collections' AND column_name = 'notes';