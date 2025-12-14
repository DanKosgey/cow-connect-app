-- Migration: 20251214000400_create_collector_tables_with_rls_policies.sql
-- Description: Create collector-related tables with comprehensive RLS policies for all roles
-- Estimated time: 1 minute

BEGIN;

-- Create table for collector rates
CREATE TABLE IF NOT EXISTS public.collector_rates (
  id BIGSERIAL PRIMARY KEY,
  collector_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  rate_type TEXT NOT NULL CHECK (rate_type IN ('collection', 'approval', 'variance_handling')),
  rate_amount NUMERIC(10,2) NOT NULL,
  effective_from DATE DEFAULT CURRENT_DATE,
  effective_to DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_rates_collector_id ON public.collector_rates (collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_rates_rate_type ON public.collector_rates (rate_type);
CREATE INDEX IF NOT EXISTS idx_collector_rates_effective_dates ON public.collector_rates (effective_from, effective_to);
CREATE INDEX IF NOT EXISTS idx_collector_rates_is_active ON public.collector_rates (is_active);

-- Create table for collector payments
CREATE TABLE IF NOT EXISTS public.collector_payments (
  id BIGSERIAL PRIMARY KEY,
  collector_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_collections INTEGER DEFAULT 0,
  total_approvals INTEGER DEFAULT 0,
  total_variance_handled NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) DEFAULT 0,
  deductions NUMERIC(10,2) DEFAULT 0,
  net_amount NUMERIC(10,2) DEFAULT 0,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'paid')),
  processed_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collector_id, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_payments_collector_id ON public.collector_payments (collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_payments_period ON public.collector_payments (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_collector_payments_status ON public.collector_payments (status);

-- Create table for collector performance
CREATE TABLE IF NOT EXISTS public.collector_performance (
  id BIGSERIAL PRIMARY KEY,
  collector_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_collections INTEGER DEFAULT 0,
  total_liters_collected NUMERIC(10,2) DEFAULT 0,
  total_approvals INTEGER DEFAULT 0,
  total_liters_approved NUMERIC(10,2) DEFAULT 0,
  total_variance_handled NUMERIC(10,2) DEFAULT 0,
  average_variance_percentage NUMERIC(5,2) DEFAULT 0,
  positive_variances INTEGER DEFAULT 0,
  negative_variances INTEGER DEFAULT 0,
  accuracy_score NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(collector_id, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_performance_collector_id ON public.collector_performance (collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_performance_period ON public.collector_performance (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_collector_performance_accuracy ON public.collector_performance (accuracy_score);

-- Enable RLS on all tables
ALTER TABLE IF EXISTS public.collector_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collector_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.collector_performance ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADMIN ROLE POLICIES
-- ============================================

-- Collector Rates Policies
DROP POLICY IF EXISTS "Admins can read collector rates" ON public.collector_rates;
CREATE POLICY "Admins can read collector rates" 
  ON public.collector_rates FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

DROP POLICY IF EXISTS "Admins can insert collector rates" ON public.collector_rates;
CREATE POLICY "Admins can insert collector rates" 
  ON public.collector_rates FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

DROP POLICY IF EXISTS "Admins can update collector rates" ON public.collector_rates;
CREATE POLICY "Admins can update collector rates" 
  ON public.collector_rates FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

DROP POLICY IF EXISTS "Admins can delete collector rates" ON public.collector_rates;
CREATE POLICY "Admins can delete collector rates" 
  ON public.collector_rates FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Collector Payments Policies
DROP POLICY IF EXISTS "Admins can read collector payments" ON public.collector_payments;
CREATE POLICY "Admins can read collector payments" 
  ON public.collector_payments FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

DROP POLICY IF EXISTS "Admins can insert collector payments" ON public.collector_payments;
CREATE POLICY "Admins can insert collector payments" 
  ON public.collector_payments FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

DROP POLICY IF EXISTS "Admins can update collector payments" ON public.collector_payments;
CREATE POLICY "Admins can update collector payments" 
  ON public.collector_payments FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

DROP POLICY IF EXISTS "Admins can delete collector payments" ON public.collector_payments;
CREATE POLICY "Admins can delete collector payments" 
  ON public.collector_payments FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Collector Performance Policies
DROP POLICY IF EXISTS "Admins can read collector performance" ON public.collector_performance;
CREATE POLICY "Admins can read collector performance" 
  ON public.collector_performance FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

DROP POLICY IF EXISTS "Admins can insert collector performance" ON public.collector_performance;
CREATE POLICY "Admins can insert collector performance" 
  ON public.collector_performance FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

DROP POLICY IF EXISTS "Admins can update collector performance" ON public.collector_performance;
CREATE POLICY "Admins can update collector performance" 
  ON public.collector_performance FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

DROP POLICY IF EXISTS "Admins can delete collector performance" ON public.collector_performance;
CREATE POLICY "Admins can delete collector performance" 
  ON public.collector_performance FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ============================================
-- STAFF ROLE POLICIES
-- ============================================

-- Allow staff to view collector rates for collectors they supervise
DROP POLICY IF EXISTS "Staff can read collector rates" ON public.collector_rates;
CREATE POLICY "Staff can read collector rates" 
  ON public.collector_rates FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- Allow staff to view collector payments for collectors they supervise
DROP POLICY IF EXISTS "Staff can read collector payments" ON public.collector_payments;
CREATE POLICY "Staff can read collector payments" 
  ON public.collector_payments FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- Allow staff to view collector performance for collectors they supervise
DROP POLICY IF EXISTS "Staff can read collector performance" ON public.collector_performance;
CREATE POLICY "Staff can read collector performance" 
  ON public.collector_performance FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- ============================================
-- COLLECTOR ROLE POLICIES
-- ============================================

-- Allow collectors to view their own rates
DROP POLICY IF EXISTS "Collectors can read their own rates" ON public.collector_rates;
CREATE POLICY "Collectors can read their own rates" 
  ON public.collector_rates FOR SELECT 
  TO authenticated
  USING (collector_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  ));

-- Allow collectors to view their own payments
DROP POLICY IF EXISTS "Collectors can read their own payments" ON public.collector_payments;
CREATE POLICY "Collectors can read their own payments" 
  ON public.collector_payments FOR SELECT 
  TO authenticated
  USING (collector_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  ));

-- Allow collectors to view their own performance
DROP POLICY IF EXISTS "Collectors can read their own performance" ON public.collector_performance;
CREATE POLICY "Collectors can read their own performance" 
  ON public.collector_performance FOR SELECT 
  TO authenticated
  USING (collector_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  ));

-- ============================================
-- CREDITOR ROLE POLICIES
-- ============================================

-- Allow creditors to view collector rates
DROP POLICY IF EXISTS "Creditors can read collector rates" ON public.collector_rates;
CREATE POLICY "Creditors can read collector rates" 
  ON public.collector_rates FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- Allow creditors to view collector payments
DROP POLICY IF EXISTS "Creditors can read collector payments" ON public.collector_payments;
CREATE POLICY "Creditors can read collector payments" 
  ON public.collector_payments FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- Allow creditors to view collector performance
DROP POLICY IF EXISTS "Creditors can read collector performance" ON public.collector_performance;
CREATE POLICY "Creditors can read collector performance" 
  ON public.collector_performance FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- Grant necessary permissions
GRANT ALL ON public.collector_rates TO authenticated;
GRANT ALL ON public.collector_payments TO authenticated;
GRANT ALL ON public.collector_performance TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that tables were created
SELECT table_name FROM information_schema.tables WHERE table_name IN ('collector_rates', 'collector_payments', 'collector_performance');

-- Check that columns were created
SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('collector_rates', 'collector_payments', 'collector_performance') ORDER BY table_name, ordinal_position;

-- Check that indexes were created
SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('collector_rates', 'collector_payments', 'collector_performance');

-- Check that RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('collector_rates', 'collector_payments', 'collector_performance');

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polrelid IN ('collector_rates'::regclass, 'collector_payments'::regclass, 'collector_performance'::regclass);