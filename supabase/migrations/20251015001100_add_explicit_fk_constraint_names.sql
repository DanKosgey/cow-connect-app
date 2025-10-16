-- Migration: 20251015001100_add_explicit_fk_constraint_names.sql
-- Description: Add explicit foreign key constraint names to resolve PostgREST embedding ambiguity

BEGIN;

-- Drop existing constraint and add explicit constraint name for milk_quality_parameters
ALTER TABLE public.milk_quality_parameters 
DROP CONSTRAINT IF EXISTS milk_quality_parameters_collection_id_fkey;

ALTER TABLE public.milk_quality_parameters 
ADD CONSTRAINT milk_quality_parameters_collection_id_fkey 
FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;

-- Drop existing constraint and add explicit constraint name for collection_payments
ALTER TABLE public.collection_payments 
DROP CONSTRAINT IF EXISTS collection_payments_collection_id_fkey;

ALTER TABLE public.collection_payments 
ADD CONSTRAINT collection_payments_collection_id_fkey 
FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;

-- Drop existing constraint and add explicit constraint name for warehouse_collections
ALTER TABLE public.warehouse_collections 
DROP CONSTRAINT IF EXISTS warehouse_collections_collection_id_fkey;

ALTER TABLE public.warehouse_collections 
ADD CONSTRAINT warehouse_collections_collection_id_fkey 
FOREIGN KEY (collection_id) REFERENCES public.collections(id) ON DELETE CASCADE;

-- Refresh PostgREST schema cache
COMMENT ON TABLE public.milk_quality_parameters IS 'Milk quality parameters table - refreshed to update PostgREST schema cache with explicit constraint names';

COMMIT;