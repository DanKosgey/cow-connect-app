-- Migration: 202511180008_biometric_verification_tables.sql
-- Description: Create tables for biometric verification system
-- Estimated time: 2 minutes

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
ALTER TABLE public.staff_biometric_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.biometric_verification_logs ENABLE ROW LEVEL SECURITY;

-- Create policies for staff_biometric_data
CREATE POLICY "Staff can view their own biometric data" 
  ON public.staff_biometric_data 
  FOR SELECT 
  USING (staff_id = auth.uid());

CREATE POLICY "Staff can insert their own biometric data" 
  ON public.staff_biometric_data 
  FOR INSERT 
  WITH CHECK (staff_id = auth.uid());

CREATE POLICY "Staff can update their own biometric data" 
  ON public.staff_biometric_data 
  FOR UPDATE 
  USING (staff_id = auth.uid());

-- Create policies for biometric_verification_logs
CREATE POLICY "Staff can view their own verification logs" 
  ON public.biometric_verification_logs 
  FOR SELECT 
  USING (staff_id = auth.uid());

CREATE POLICY "Verification logs can be inserted by the system" 
  ON public.biometric_verification_logs 
  FOR INSERT 
  WITH CHECK (true); -- Allow system to insert logs

-- Grant permissions
GRANT ALL ON public.staff_biometric_data TO authenticated;
GRANT ALL ON public.biometric_verification_logs TO authenticated;

-- Add trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_staff_biometric_data_updated_at 
  BEFORE UPDATE ON public.staff_biometric_data 
  FOR EACH ROW 
  EXECUTE FUNCTION update_updated_at_column();

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that tables were created
SELECT table_name FROM information_schema.tables WHERE table_name IN ('staff_biometric_data', 'biometric_verification_logs');

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename IN ('staff_biometric_data', 'biometric_verification_logs');

-- Check that policies were created
SELECT policyname FROM pg_policies WHERE tablename IN ('staff_biometric_data', 'biometric_verification_logs');