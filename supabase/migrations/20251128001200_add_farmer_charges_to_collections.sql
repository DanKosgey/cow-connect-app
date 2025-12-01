-- Migration: 20251128001200_add_farmer_charges_to_collections.sql
-- Description: Add foreign key reference to farmer_charges table in collections table
-- Estimated time: 1 minute

BEGIN;

-- Add foreign key reference to farmer_charges in collections table
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS farmer_charge_id UUID REFERENCES public.farmer_charges(id) ON DELETE SET NULL;

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_collections_farmer_charge_id ON public.collections (farmer_charge_id);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that column was added
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'farmer_charge_id';

-- Check that index was created
SELECT indexname FROM pg_indexes WHERE tablename = 'collections' AND indexname = 'idx_collections_farmer_charge_id';