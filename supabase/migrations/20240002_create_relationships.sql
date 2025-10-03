-- Migration: 20240002_create_relationships.sql
-- Description: Add foreign keys, junction tables and additional indexes.
BEGIN;

-- Many-to-many: staff_routes <-> staff (example placeholder)
CREATE TABLE IF NOT EXISTS public.staff_routes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid REFERENCES public.staff(id) ON DELETE CASCADE,
  route_name text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.warehouses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text,
  address text,
  created_at timestamptz DEFAULT now()
);

-- Junction: warehouse_stores (many-to-many for warehouses and collections optional)
CREATE TABLE IF NOT EXISTS public.warehouse_collections (
  id bigserial PRIMARY KEY,
  warehouse_id uuid REFERENCES public.warehouses(id) ON DELETE CASCADE,
  collection_id uuid REFERENCES public.collections(id) ON DELETE CASCADE,
  added_at timestamptz DEFAULT now()
);

-- Add unique constraints and ensure referential integrity where missing
ALTER TABLE IF EXISTS public.payments
  ADD COLUMN IF NOT EXISTS paid_at timestamptz;

-- More indexes
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
CREATE INDEX IF NOT EXISTS idx_farmers_national_id ON public.farmers (national_id);

COMMIT;
