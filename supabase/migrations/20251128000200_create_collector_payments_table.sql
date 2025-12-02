-- Migration: 20251128000200_create_collector_payments_table.sql
-- Description: Create collector_payments table for tracking collector payments
-- Estimated time: 1 minute

BEGIN;

-- Create collector_payments table
CREATE TABLE IF NOT EXISTS public.collector_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_collections INTEGER DEFAULT 0,
  total_liters NUMERIC(10,2) DEFAULT 0,
  rate_per_liter NUMERIC(10,2) DEFAULT 0,
  total_earnings NUMERIC(10,2) DEFAULT 0,
  total_penalties NUMERIC(10,2) DEFAULT 0,
  adjusted_earnings NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid')),
  payment_date TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_payments_collector_id ON public.collector_payments (collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_payments_period ON public.collector_payments (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_collector_payments_status ON public.collector_payments (status);

-- Add RLS policies
ALTER TABLE public.collector_payments ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all collector payments
CREATE POLICY "Admins can view all collector payments" 
ON public.collector_payments 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to insert collector payments
CREATE POLICY "Admins can insert collector payments" 
ON public.collector_payments 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to update collector payments
CREATE POLICY "Admins can update collector payments" 
ON public.collector_payments 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to delete collector payments
CREATE POLICY "Admins can delete collector payments" 
ON public.collector_payments 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow collectors to view their own payments
CREATE POLICY "Collectors can view their own payments" 
ON public.collector_payments 
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
SELECT table_name FROM information_schema.tables WHERE table_name = 'collector_payments';

-- Check that columns were created
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'collector_payments' ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'collector_payments';

-- Check that RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'collector_payments';

-- Check that policies were created
SELECT policyname FROM pg_policy WHERE polrelid = 'collector_payments'::regclass;