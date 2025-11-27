-- Migration: 20251127000200_create_staff_performance_table.sql
-- Description: Create staff_performance table for tracking staff approval performance metrics
-- Estimated time: 1 minute

BEGIN;

-- Create staff_performance table
CREATE TABLE IF NOT EXISTS public.staff_performance (
  id BIGSERIAL PRIMARY KEY,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_approvals INTEGER DEFAULT 0,
  total_collections_approved INTEGER DEFAULT 0,
  total_liters_approved NUMERIC(10,2) DEFAULT 0,
  total_variance_handled NUMERIC(10,2) DEFAULT 0,
  average_variance_percentage NUMERIC(5,2) DEFAULT 0,
  positive_variances INTEGER DEFAULT 0,
  negative_variances INTEGER DEFAULT 0,
  total_penalty_amount NUMERIC(10,2) DEFAULT 0,
  accuracy_score NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_staff_performance_staff_id ON public.staff_performance (staff_id);
CREATE INDEX IF NOT EXISTS idx_staff_performance_period ON public.staff_performance (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_staff_performance_accuracy ON public.staff_performance (accuracy_score);

-- Add RLS policies
ALTER TABLE public.staff_performance ENABLE ROW LEVEL SECURITY;

-- Allow admins to view all performance records
CREATE POLICY "Admins can view all staff performance records" 
ON public.staff_performance 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to insert performance records
CREATE POLICY "Admins can insert staff performance records" 
ON public.staff_performance 
FOR INSERT 
TO authenticated 
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to update performance records
CREATE POLICY "Admins can update staff performance records" 
ON public.staff_performance 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow admins to delete performance records
CREATE POLICY "Admins can delete staff performance records" 
ON public.staff_performance 
FOR DELETE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'admin' AND ur.active = true
  )
);

-- Allow staff members to view their own performance records
CREATE POLICY "Staff can view their own performance records" 
ON public.staff_performance 
FOR SELECT 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.staff s ON ur.user_id = s.user_id
    WHERE s.id = staff_id AND ur.role = 'staff' AND ur.active = true
  )
);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that table was created
SELECT table_name FROM information_schema.tables WHERE table_name = 'staff_performance';

-- Check that columns were created
SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'staff_performance' ORDER BY ordinal_position;

-- Check that indexes were created
SELECT indexname FROM pg_indexes WHERE tablename = 'staff_performance';

-- Check that RLS is enabled
SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'staff_performance';