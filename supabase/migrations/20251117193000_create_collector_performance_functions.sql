-- Migration: 20251117193000_create_collector_performance_functions.sql
-- Description: Create functions for collector performance data management
-- Estimated time: 1 minute

BEGIN;

-- RPC: upsert_collector_performance - inserts or updates collector performance data
CREATE OR REPLACE FUNCTION public.upsert_collector_performance(
  p_staff_id UUID,
  p_period_start DATE,
  p_period_end DATE,
  p_total_collections INTEGER DEFAULT 1,
  p_total_liters_collected NUMERIC DEFAULT 0,
  p_total_liters_received NUMERIC DEFAULT 0,
  p_total_variance NUMERIC DEFAULT 0,
  p_positive_variances INTEGER DEFAULT 0,
  p_negative_variances INTEGER DEFAULT 0,
  p_total_penalty_amount NUMERIC DEFAULT 0,
  p_notes TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  v_average_variance_percentage NUMERIC(5,2);
  v_performance_score NUMERIC(5,2);
BEGIN
  -- Calculate average variance percentage
  v_average_variance_percentage := CASE 
    WHEN p_total_liters_collected > 0 THEN
      (ABS(p_total_variance) / p_total_liters_collected) * 100
    ELSE 0
  END;
  
  -- Calculate performance score (simplified formula)
  -- Higher score for more collections, lower penalties, and fewer variances
  v_performance_score := CASE 
    WHEN p_total_collections > 0 THEN
      GREATEST(0, LEAST(100, 
        100 - 
        (p_total_penalty_amount / 100) -  -- Penalty deduction
        ((p_positive_variances + p_negative_variances)::NUMERIC / GREATEST(p_total_collections::NUMERIC, 1)) * 10  -- Variance deduction
      ))
    ELSE 0
  END;
  
  -- Insert or update performance record
  INSERT INTO public.collector_performance (
    staff_id,
    period_start,
    period_end,
    total_collections,
    total_liters_collected,
    total_liters_received,
    total_variance,
    average_variance_percentage,
    positive_variances,
    negative_variances,
    total_penalty_amount,
    performance_score,
    notes
  ) VALUES (
    p_staff_id,
    p_period_start,
    p_period_end,
    p_total_collections,
    p_total_liters_collected,
    p_total_liters_received,
    p_total_variance,
    v_average_variance_percentage,
    p_positive_variances,
    p_negative_variances,
    p_total_penalty_amount,
    v_performance_score,
    p_notes
  )
  ON CONFLICT (staff_id, period_start, period_end) 
  DO UPDATE SET
    total_collections = EXCLUDED.total_collections,
    total_liters_collected = EXCLUDED.total_liters_collected,
    total_liters_received = EXCLUDED.total_liters_received,
    total_variance = EXCLUDED.total_variance,
    average_variance_percentage = EXCLUDED.average_variance_percentage,
    positive_variances = EXCLUDED.positive_variances,
    negative_variances = EXCLUDED.negative_variances,
    total_penalty_amount = EXCLUDED.total_penalty_amount,
    performance_score = EXCLUDED.performance_score,
    notes = EXCLUDED.notes,
    updated_at = NOW();
END;
$$;

-- RPC: get_collector_performance_summary - gets performance summary for a collector
CREATE OR REPLACE FUNCTION public.get_collector_performance_summary(
  p_staff_id UUID
)
RETURNS TABLE(
  period_start DATE,
  period_end DATE,
  total_collections INTEGER,
  total_liters_collected NUMERIC(10,2),
  total_liters_received NUMERIC(10,2),
  total_variance NUMERIC(10,2),
  average_variance_percentage NUMERIC(5,2),
  positive_variances INTEGER,
  negative_variances INTEGER,
  total_penalty_amount NUMERIC(10,2),
  performance_score NUMERIC(5,2),
  notes TEXT,
  created_at TIMESTAMPTZ
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.period_start,
    cp.period_end,
    cp.total_collections,
    cp.total_liters_collected,
    cp.total_liters_received,
    cp.total_variance,
    cp.average_variance_percentage,
    cp.positive_variances,
    cp.negative_variances,
    cp.total_penalty_amount,
    cp.performance_score,
    cp.notes,
    cp.created_at
  FROM public.collector_performance cp
  WHERE cp.staff_id = p_staff_id
  ORDER BY cp.period_start DESC
  LIMIT 10;
END;
$$;

-- RPC: get_top_collectors_by_performance - gets top collectors by performance score
CREATE OR REPLACE FUNCTION public.get_top_collectors_by_performance(
  p_limit INTEGER DEFAULT 10
)
RETURNS TABLE(
  staff_id UUID,
  collector_name TEXT,
  performance_score NUMERIC(5,2),
  total_collections INTEGER,
  total_penalty_amount NUMERIC(10,2),
  average_variance_percentage NUMERIC(5,2)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.staff_id,
    COALESCE(p.full_name, 'Unknown Collector') as collector_name,
    AVG(cp.performance_score) as performance_score,
    SUM(cp.total_collections) as total_collections,
    SUM(cp.total_penalty_amount) as total_penalty_amount,
    AVG(cp.average_variance_percentage) as average_variance_percentage
  FROM public.collector_performance cp
  LEFT JOIN public.staff s ON cp.staff_id = s.id
  LEFT JOIN public.profiles p ON s.user_id = p.id
  GROUP BY cp.staff_id, p.full_name
  ORDER BY AVG(cp.performance_score) DESC
  LIMIT p_limit;
END;
$$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that functions were created
SELECT proname FROM pg_proc WHERE proname IN ('upsert_collector_performance', 'get_collector_performance_summary', 'get_top_collectors_by_performance');

-- Test the functions with sample data (will need actual staff IDs)
-- SELECT * FROM public.upsert_collector_performance('some-uuid', '2025-11-01', '2025-11-30', 10, 1000, 995, -5, 0, 1, 15.50);
-- SELECT * FROM public.get_collector_performance_summary('some-uuid');
-- SELECT * FROM public.get_top_collectors_by_performance(5);