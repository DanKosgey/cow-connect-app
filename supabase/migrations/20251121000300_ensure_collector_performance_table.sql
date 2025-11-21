-- Migration: 20251121000300_ensure_collector_performance_table.sql
-- Description: Ensure the collector_performance table exists with correct schema
-- This fixes issues with collector performance reporting

BEGIN;

-- Create collector_performance table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.collector_performance (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    period_start date NOT NULL,
    period_end date NOT NULL,
    total_collections integer DEFAULT 0,
    total_liters_collected numeric(10,2) DEFAULT 0,
    total_liters_received numeric(10,2) DEFAULT 0,
    total_variance numeric(10,2) DEFAULT 0,
    average_variance_percentage numeric(5,2) DEFAULT 0,
    positive_variances integer DEFAULT 0,
    negative_variances integer DEFAULT 0,
    total_penalty_amount numeric(10,2) DEFAULT 0,
    performance_score numeric(5,2) DEFAULT 0,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(staff_id, period_start, period_end)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_performance_staff_id ON public.collector_performance(staff_id);
CREATE INDEX IF NOT EXISTS idx_collector_performance_period ON public.collector_performance(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_collector_performance_score ON public.collector_performance(performance_score DESC);

-- Enable RLS
ALTER TABLE IF EXISTS public.collector_performance ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Collectors can view their own performance" ON public.collector_performance;
CREATE POLICY "Collectors can view their own performance" ON public.collector_performance
  FOR SELECT
  USING (
    staff_id IN (
      SELECT id FROM public.staff WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view all performance" ON public.collector_performance;
CREATE POLICY "Staff can view all performance" ON public.collector_performance
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() 
      AND ur.role IN ('staff', 'admin')
      AND ur.active = true
    )
  );

-- Grant permissions
GRANT SELECT ON public.collector_performance TO authenticated;

COMMIT;