-- Migration: 202511180011_milk_collection_approval_workflow.sql
-- Description: Enhanced milk collection and approval workflow with collector variance tracking
-- This migration builds upon the existing milk approval system to implement the specific workflow requested

BEGIN;

-- Create a table to store daily collector summaries for company-level approval
CREATE TABLE IF NOT EXISTS public.collector_daily_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collector_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  collection_date date NOT NULL,
  total_collections integer NOT NULL DEFAULT 0,
  total_liters_collected numeric NOT NULL DEFAULT 0,
  total_liters_received numeric, -- Will be entered by staff
  variance_liters numeric,
  variance_percentage numeric,
  variance_type variance_type_enum,
  total_penalty_amount numeric DEFAULT 0,
  approved_by uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  approved_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(collector_id, collection_date)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_collector_daily_summaries_collector_date 
  ON public.collector_daily_summaries (collector_id, collection_date);
  
CREATE INDEX IF NOT EXISTS idx_collector_daily_summaries_date 
  ON public.collector_daily_summaries (collection_date);
  
CREATE INDEX IF NOT EXISTS idx_collector_daily_summaries_approved 
  ON public.collector_daily_summaries (approved_at);

-- Add a reference from collections to collector_daily_summaries
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS daily_summary_id uuid REFERENCES public.collector_daily_summaries(id) ON DELETE SET NULL;

-- Create function to calculate daily collector summary
CREATE OR REPLACE FUNCTION public.calculate_collector_daily_summary(
  p_collector_id uuid,
  p_collection_date date
)
RETURNS TABLE(
  total_collections integer,
  total_liters_collected numeric,
  average_quality_score numeric
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::integer as total_collections,
    COALESCE(SUM(c.liters), 0) as total_liters_collected,
    COALESCE(AVG(CASE 
      WHEN mq.fat_content IS NOT NULL AND mq.protein_content IS NOT NULL 
      THEN (mq.fat_content + mq.protein_content) / 2 
      ELSE 0 
    END), 0) as average_quality_score
  FROM public.collections c
  LEFT JOIN public.milk_quality_parameters mq ON c.id = mq.collection_id
  WHERE c.staff_id = p_collector_id
    AND c.collection_date::date = p_collection_date
    AND c.status = 'Collected';
END;
$$;

-- Create function to submit company-level approval for a collector's daily collections
CREATE OR REPLACE FUNCTION public.submit_collector_daily_approval(
  p_collector_id uuid,
  p_collection_date date,
  p_total_liters_received numeric,
  p_staff_id uuid, -- The staff member doing the approval
  p_notes text DEFAULT NULL
)
RETURNS TABLE(
  success boolean,
  message text,
  variance_liters numeric,
  variance_percentage numeric,
  variance_type text,
  penalty_amount numeric
)
LANGUAGE plpgsql AS $$
DECLARE
  v_summary record;
  v_variance_liters numeric;
  v_variance_percentage numeric;
  v_variance_type text;
  v_penalty_amount numeric := 0;
  v_daily_summary_id uuid;
BEGIN
  -- Get the calculated summary for the collector on that date
  SELECT * INTO v_summary FROM public.calculate_collector_daily_summary(p_collector_id, p_collection_date);
  
  -- If no collections found, return error
  IF v_summary.total_collections = 0 THEN
    RETURN QUERY SELECT false, 'No collections found for this collector on the specified date', NULL, NULL, NULL, NULL;
    RETURN;
  END IF;
  
  -- Calculate variance
  v_variance_liters := p_total_liters_received - v_summary.total_liters_collected;
  v_variance_percentage := CASE 
    WHEN v_summary.total_liters_collected > 0 THEN 
      (v_variance_liters / v_summary.total_liters_collected) * 100
    ELSE 0
  END;
  
  -- Determine variance type
  IF v_variance_liters > 0 THEN
    v_variance_type := 'positive';
  ELSIF v_variance_liters < 0 THEN
    v_variance_type := 'negative';
  ELSE
    v_variance_type := 'none';
  END IF;
  
  -- Calculate penalty based on variance configuration
  SELECT COALESCE(penalty_rate_per_liter, 0) * ABS(v_variance_liters) INTO v_penalty_amount
  FROM public.variance_penalty_config
  WHERE is_active = true
    AND variance_type = v_variance_type::variance_type_enum
    AND ABS(v_variance_percentage) BETWEEN min_variance_percentage AND max_variance_percentage
  LIMIT 1;
  
  v_penalty_amount := COALESCE(v_penalty_amount, 0);
  
  -- Insert or update the daily summary
  INSERT INTO public.collector_daily_summaries (
    collector_id,
    collection_date,
    total_collections,
    total_liters_collected,
    total_liters_received,
    variance_liters,
    variance_percentage,
    variance_type,
    total_penalty_amount,
    approved_by,
    approved_at,
    notes
  ) VALUES (
    p_collector_id,
    p_collection_date,
    v_summary.total_collections,
    v_summary.total_liters_collected,
    p_total_liters_received,
    v_variance_liters,
    v_variance_percentage,
    v_variance_type::variance_type_enum,
    v_penalty_amount,
    p_staff_id,
    NOW(),
    p_notes
  )
  ON CONFLICT (collector_id, collection_date)
  DO UPDATE SET
    total_liters_received = EXCLUDED.total_liters_received,
    variance_liters = EXCLUDED.variance_liters,
    variance_percentage = EXCLUDED.variance_percentage,
    variance_type = EXCLUDED.variance_type,
    total_penalty_amount = EXCLUDED.total_penalty_amount,
    approved_by = EXCLUDED.approved_by,
    approved_at = EXCLUDED.approved_at,
    notes = EXCLUDED.notes,
    updated_at = NOW()
  RETURNING id INTO v_daily_summary_id;
  
  -- Update all collections for this collector on this date with the daily summary reference
  UPDATE public.collections
  SET daily_summary_id = v_daily_summary_id,
      updated_at = NOW()
  WHERE staff_id = p_collector_id
    AND collection_date::date = p_collection_date;
  
  -- Update collector performance metrics
  PERFORM public.upsert_collector_performance(
    p_staff_id => p_collector_id,
    p_period_start => DATE_TRUNC('month', p_collection_date)::date,
    p_period_end => (DATE_TRUNC('month', p_collection_date) + INTERVAL '1 month - 1 day')::date,
    p_total_collections => v_summary.total_collections,
    p_total_liters_collected => v_summary.total_liters_collected,
    p_total_liters_received => p_total_liters_received,
    p_total_variance => v_variance_liters,
    p_positive_variances => CASE WHEN v_variance_type = 'positive' THEN 1 ELSE 0 END,
    p_negative_variances => CASE WHEN v_variance_type = 'negative' THEN 1 ELSE 0 END,
    p_total_penalty_amount => v_penalty_amount,
    p_notes => 'Daily approval submitted'
  );
  
  RETURN QUERY SELECT 
    true, 
    'Daily approval submitted successfully',
    v_variance_liters,
    v_variance_percentage,
    v_variance_type,
    v_penalty_amount;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.calculate_collector_daily_summary TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_collector_daily_approval TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that tables were created
SELECT table_name FROM information_schema.tables WHERE table_name = 'collector_daily_summaries';

-- Check that columns were added to collections table
SELECT column_name FROM information_schema.columns WHERE table_name = 'collections' AND column_name = 'daily_summary_id';

-- Check that functions were created
SELECT proname FROM pg_proc WHERE proname IN ('calculate_collector_daily_summary', 'submit_collector_daily_approval');

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Revert changes
DROP FUNCTION IF EXISTS public.submit_collector_daily_approval;
DROP FUNCTION IF EXISTS public.calculate_collector_daily_summary;

ALTER TABLE public.collections 
DROP COLUMN IF EXISTS daily_summary_id;

DROP TABLE IF EXISTS public.collector_daily_summaries;

COMMIT;
*/