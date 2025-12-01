-- Migration: 20251128001100_create_farmer_charges_table.sql
-- Description: Create farmer_charges table for tracking charges deducted from farmers based on collector rates
-- Estimated time: 1 minute

BEGIN;

-- Create farmer_charges table
CREATE TABLE IF NOT EXISTS public.farmer_charges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  collection_id UUID REFERENCES public.collections(id) ON DELETE SET NULL,
  collector_id UUID REFERENCES public.staff(id) ON DELETE SET NULL,
  charge_type TEXT NOT NULL CHECK (charge_type IN ('collector_fee', 'service_charge', 'other')),
  rate_per_liter NUMERIC(10,2) DEFAULT 0,
  liters_charged NUMERIC(10,2) DEFAULT 0,
  total_charge_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'waived')),
  applied_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_farmer_charges_farmer_id ON public.farmer_charges (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_charges_collection_id ON public.farmer_charges (collection_id);
CREATE INDEX IF NOT EXISTS idx_farmer_charges_collector_id ON public.farmer_charges (collector_id);
CREATE INDEX IF NOT EXISTS idx_farmer_charges_status ON public.farmer_charges (status);
CREATE INDEX IF NOT EXISTS idx_farmer_charges_charge_type ON public.farmer_charges (charge_type);
CREATE INDEX IF NOT EXISTS idx_farmer_charges_created_at ON public.farmer_charges (created_at);

-- Add RLS policies
ALTER TABLE public.farmer_charges ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all farmer charges
CREATE POLICY "Admins can view all farmer charges" 
ON public.farmer_charges 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to insert farmer charges
CREATE POLICY "Admins can insert farmer charges" 
ON public.farmer_charges 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to update farmer charges
CREATE POLICY "Admins can update farmer charges" 
ON public.farmer_charges 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to delete farmer charges
CREATE POLICY "Admins can delete farmer charges" 
ON public.farmer_charges 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow farmers to view their own charges
CREATE POLICY "Farmers can view their own charges" 
ON public.farmer_charges 
FOR SELECT 
TO authenticated 
USING (
  farmer_id IN (
    SELECT id FROM public.farmers WHERE user_id = auth.uid()
  )
);

-- Allow collectors to view charges they've created
CREATE POLICY "Collectors can view charges they've created" 
ON public.farmer_charges 
FOR SELECT 
TO authenticated 
USING (
  collector_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that table was created
SELECT table_name FROM information_schema.tables WHERE table_name = 'farmer_charges';

-- Check that columns were created
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'farmer_charges' ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'farmer_charges';

-- Check that RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'farmer_charges';

-- Check that policies were created
SELECT policyname FROM pg_policy WHERE polrelid = 'farmer_charges'::regclass;