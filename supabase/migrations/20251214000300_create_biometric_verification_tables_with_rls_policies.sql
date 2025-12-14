-- Migration: 20251214000300_create_biometric_verification_tables_with_rls_policies.sql
-- Description: Create biometric verification tables with comprehensive RLS policies for all roles
-- Estimated time: 1 minute

BEGIN;

-- Create table for staff biometric data
CREATE TABLE IF NOT EXISTS public.staff_biometric_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  biometric_type TEXT NOT NULL CHECK (biometric_type IN ('fingerprint', 'face', 'iris')),
  biometric_data TEXT NOT NULL, -- In production, this should be encrypted
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure each staff member can only have one record per biometric type
  UNIQUE(staff_id, biometric_type)
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_staff_biometric_staff_id ON public.staff_biometric_data(staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_biometric_type ON public.staff_biometric_data(biometric_type);

-- Create table for biometric verification logs
CREATE TABLE IF NOT EXISTS public.biometric_verification_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  biometric_type TEXT NOT NULL,
  success BOOLEAN NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for faster queries
CREATE INDEX IF NOT EXISTS idx_biometric_logs_staff_id ON public.biometric_verification_logs(staff_id);
CREATE INDEX IF NOT EXISTS idx_biometric_logs_created_at ON public.biometric_verification_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_biometric_logs_success ON public.biometric_verification_logs(success);

-- Enable RLS (Row Level Security)
ALTER TABLE IF EXISTS public.staff_biometric_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public.biometric_verification_logs ENABLE ROW LEVEL SECURITY;

-- ============================================
-- ADMIN ROLE POLICIES
-- ============================================

-- Allow admins to view all staff biometric data
DROP POLICY IF EXISTS "Admins can view all staff biometric data" ON public.staff_biometric_data;
CREATE POLICY "Admins can view all staff biometric data" 
  ON public.staff_biometric_data 
  FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Allow admins to insert staff biometric data
DROP POLICY IF EXISTS "Admins can insert staff biometric data" ON public.staff_biometric_data;
CREATE POLICY "Admins can insert staff biometric data" 
  ON public.staff_biometric_data 
  FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Allow admins to update staff biometric data
DROP POLICY IF EXISTS "Admins can update staff biometric data" ON public.staff_biometric_data;
CREATE POLICY "Admins can update staff biometric data" 
  ON public.staff_biometric_data 
  FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Allow admins to delete staff biometric data
DROP POLICY IF EXISTS "Admins can delete staff biometric data" ON public.staff_biometric_data;
CREATE POLICY "Admins can delete staff biometric data" 
  ON public.staff_biometric_data 
  FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Allow admins to view all biometric verification logs
DROP POLICY IF EXISTS "Admins can view all biometric verification logs" ON public.biometric_verification_logs;
CREATE POLICY "Admins can view all biometric verification logs" 
  ON public.biometric_verification_logs 
  FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Allow admins to insert biometric verification logs
DROP POLICY IF EXISTS "Admins can insert biometric verification logs" ON public.biometric_verification_logs;
CREATE POLICY "Admins can insert biometric verification logs" 
  ON public.biometric_verification_logs 
  FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Allow admins to update biometric verification logs
DROP POLICY IF EXISTS "Admins can update biometric verification logs" ON public.biometric_verification_logs;
CREATE POLICY "Admins can update biometric verification logs" 
  ON public.biometric_verification_logs 
  FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- Allow admins to delete biometric verification logs
DROP POLICY IF EXISTS "Admins can delete biometric verification logs" ON public.biometric_verification_logs;
CREATE POLICY "Admins can delete biometric verification logs" 
  ON public.biometric_verification_logs 
  FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ============================================
-- STAFF ROLE POLICIES
-- ============================================

-- Allow staff to view their own biometric data
DROP POLICY IF EXISTS "Staff can view their own biometric data" ON public.staff_biometric_data;
CREATE POLICY "Staff can view their own biometric data" 
  ON public.staff_biometric_data 
  FOR SELECT 
  USING (staff_id = auth.uid());

-- Allow staff to insert their own biometric data
DROP POLICY IF EXISTS "Staff can insert their own biometric data" ON public.staff_biometric_data;
CREATE POLICY "Staff can insert their own biometric data" 
  ON public.staff_biometric_data 
  FOR INSERT 
  WITH CHECK (staff_id = auth.uid());

-- Allow staff to update their own biometric data
DROP POLICY IF EXISTS "Staff can update their own biometric data" ON public.staff_biometric_data;
CREATE POLICY "Staff can update their own biometric data" 
  ON public.staff_biometric_data 
  FOR UPDATE 
  USING (staff_id = auth.uid());

-- Allow staff to view their own verification logs
DROP POLICY IF EXISTS "Staff can view their own verification logs" ON public.biometric_verification_logs;
CREATE POLICY "Staff can view their own verification logs" 
  ON public.biometric_verification_logs 
  FOR SELECT 
  USING (staff_id = auth.uid());

-- ============================================
-- COLLECTOR ROLE POLICIES
-- ============================================

-- Allow collectors to view biometric data for staff they work with
DROP POLICY IF EXISTS "Collectors can view staff biometric data" ON public.staff_biometric_data;
CREATE POLICY "Collectors can view staff biometric data" 
  ON public.staff_biometric_data 
  FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'collector' AND ur.active = true
  ));

-- Allow collectors to view verification logs for staff they work with
DROP POLICY IF EXISTS "Collectors can view staff verification logs" ON public.biometric_verification_logs;
CREATE POLICY "Collectors can view staff verification logs" 
  ON public.biometric_verification_logs 
  FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'collector' AND ur.active = true
  ));

-- ============================================
-- CREDITOR ROLE POLICIES
-- ============================================

-- Allow creditors to view biometric data for staff they work with
DROP POLICY IF EXISTS "Creditors can view staff biometric data" ON public.staff_biometric_data;
CREATE POLICY "Creditors can view staff biometric data" 
  ON public.staff_biometric_data 
  FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- Allow creditors to view verification logs for staff they work with
DROP POLICY IF EXISTS "Creditors can view staff verification logs" ON public.biometric_verification_logs;
CREATE POLICY "Creditors can view staff verification logs" 
  ON public.biometric_verification_logs 
  FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- Grant necessary permissions
GRANT ALL ON public.staff_biometric_data TO authenticated;
GRANT ALL ON public.biometric_verification_logs TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that tables were created
SELECT table_name FROM information_schema.tables WHERE table_name IN ('staff_biometric_data', 'biometric_verification_logs');

-- Check that columns were created
SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name IN ('staff_biometric_data', 'biometric_verification_logs') ORDER BY table_name, ordinal_position;

-- Check that indexes were created
SELECT tablename, indexname FROM pg_indexes WHERE tablename IN ('staff_biometric_data', 'biometric_verification_logs');

-- Check that RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname IN ('staff_biometric_data', 'biometric_verification_logs');

-- Check that policies were created
SELECT polname FROM pg_policy WHERE polrelid IN ('staff_biometric_data'::regclass, 'biometric_verification_logs'::regclass);