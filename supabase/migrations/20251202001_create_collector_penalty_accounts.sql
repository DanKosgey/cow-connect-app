-- Migration: 20251202001_create_collector_penalty_accounts.sql
-- Description: Create tables for collector penalty account tracking

BEGIN;

-- Create collector_penalty_accounts table
CREATE TABLE IF NOT EXISTS public.collector_penalty_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  pending_penalties NUMERIC(10,2) DEFAULT 0,  -- Penalties awaiting deduction
  total_penalties_incurred NUMERIC(10,2) DEFAULT 0,  -- Total penalties ever incurred
  total_penalties_paid NUMERIC(10,2) DEFAULT 0,  -- Total penalties actually paid
  is_frozen BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one account per collector
  UNIQUE(collector_id)
);

-- Create collector_penalty_transactions table
CREATE TABLE IF NOT EXISTS public.collector_penalty_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id UUID NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('penalty_incurred', 'penalty_paid', 'penalty_adjusted')),
  amount NUMERIC(10,2) NOT NULL,
  balance_after NUMERIC(10,2) NOT NULL,
  reference_type TEXT,
  reference_id UUID,
  description TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_penalty_accounts_collector_id ON public.collector_penalty_accounts (collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_penalty_transactions_collector_id ON public.collector_penalty_transactions (collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_penalty_transactions_type ON public.collector_penalty_transactions (transaction_type);
CREATE INDEX IF NOT EXISTS idx_collector_penalty_transactions_reference ON public.collector_penalty_transactions (reference_type, reference_id);

-- Add RLS policies for collector_penalty_accounts
ALTER TABLE public.collector_penalty_accounts ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all collector penalty accounts
CREATE POLICY "Admins can view all collector penalty accounts" 
ON public.collector_penalty_accounts 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to insert collector penalty accounts
CREATE POLICY "Admins can insert collector penalty accounts" 
ON public.collector_penalty_accounts 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to update collector penalty accounts
CREATE POLICY "Admins can update collector penalty accounts" 
ON public.collector_penalty_accounts 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow collectors to view their own penalty accounts
CREATE POLICY "Collectors can view their own penalty accounts" 
ON public.collector_penalty_accounts 
FOR SELECT 
TO authenticated 
USING (
  collector_id IN (
    SELECT id FROM public.staff WHERE user_id = auth.uid()
  )
);

-- Add RLS policies for collector_penalty_transactions
ALTER TABLE public.collector_penalty_transactions ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all collector penalty transactions
CREATE POLICY "Admins can view all collector penalty transactions" 
ON public.collector_penalty_transactions 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to insert collector penalty transactions
CREATE POLICY "Admins can insert collector penalty transactions" 
ON public.collector_penalty_transactions 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow collectors to view their own penalty transactions
CREATE POLICY "Collectors can view their own penalty transactions" 
ON public.collector_penalty_transactions 
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

-- Check that tables were created
SELECT table_name FROM information_schema.tables WHERE table_name IN ('collector_penalty_accounts', 'collector_penalty_transactions');

-- Check that columns were created
SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('collector_penalty_accounts', 'collector_penalty_transactions') ORDER BY table_name, ordinal_position;

-- Check that indexes were created
SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('collector_penalty_accounts', 'collector_penalty_transactions');

-- Check that RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('collector_penalty_accounts', 'collector_penalty_transactions');

-- Check that policies were created
SELECT polrelid::regclass as table_name, policyname FROM pg_policy WHERE polrelid IN ('collector_penalty_accounts'::regclass, 'collector_penalty_transactions'::regclass);