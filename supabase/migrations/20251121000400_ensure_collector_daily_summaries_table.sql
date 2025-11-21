-- Migration: 20251121000400_ensure_collector_daily_summaries_table.sql
-- Description: Ensure the collector_daily_summaries table exists with correct schema
-- This fixes issues with daily collector summaries

BEGIN;

-- Create collector_daily_summaries table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.collector_daily_summaries (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    collector_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
    collection_date date NOT NULL,
    total_collections integer DEFAULT 0,
    total_liters_collected numeric(10,2) DEFAULT 0,
    total_liters_received numeric(10,2) DEFAULT 0,
    variance_liters numeric(10,2) DEFAULT 0,
    variance_percentage numeric(5,2) DEFAULT 0,
    variance_type varchar(10) CHECK (variance_type IN ('positive', 'negative')),
    total_penalty_amount numeric(10,2) DEFAULT 0,
    approved_by uuid REFERENCES public.staff(id),
    approved_at timestamptz,
    notes text,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now(),
    UNIQUE(collector_id, collection_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_daily_summaries_collector_id ON public.collector_daily_summaries(collector_id);
CREATE INDEX IF NOT EXISTS idx_collector_daily_summaries_collection_date ON public.collector_daily_summaries(collection_date);
CREATE INDEX IF NOT EXISTS idx_collector_daily_summaries_variance_type ON public.collector_daily_summaries(variance_type);
CREATE INDEX IF NOT EXISTS idx_collector_daily_summaries_approved_at ON public.collector_daily_summaries(approved_at);

-- Enable RLS
ALTER TABLE IF EXISTS public.collector_daily_summaries ENABLE ROW LEVEL SECURITY;

-- Create policies
DROP POLICY IF EXISTS "Collectors can view their own summaries" ON public.collector_daily_summaries;
CREATE POLICY "Collectors can view their own summaries" ON public.collector_daily_summaries
  FOR SELECT
  USING (
    collector_id IN (
      SELECT id FROM public.staff WHERE user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Staff can view all summaries" ON public.collector_daily_summaries;
CREATE POLICY "Staff can view all summaries" ON public.collector_daily_summaries
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
GRANT SELECT ON public.collector_daily_summaries TO authenticated;

COMMIT;