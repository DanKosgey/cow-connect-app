-- Migration: 20251117183000_create_populate_collector_performance_function.sql
-- Description: Create functions to populate and retrieve collector performance data
-- Estimated time: 2 minutes

BEGIN;

-- RPC: populate_collector_performance - populates performance data for a collector in a period
CREATE OR REPLACE FUNCTION public.populate_collector_performance(
  p_staff_id UUID,
  p_period_start DATE,
  p_period_end DATE
)
RETURNS VOID
LANGUAGE plpgsql AS $$
DECLARE
  v_total_collections INTEGER;
  v_total_liters NUMERIC(10,2);
  v_approved_collections INTEGER;
  v_rejected_collections INTEGER;
  v_pending_collections INTEGER;
  v_positive_variances INTEGER;
  v_negative_variances INTEGER;
  v_average_variance_percentage NUMERIC(5,2);
  v_total_penalties NUMERIC(10,2);
  v_performance_score NUMERIC(5,2);
BEGIN
  -- Get collection statistics
  SELECT 
    COUNT(*),
    COALESCE(SUM(liters), 0),
    COUNT(CASE WHEN approved_for_company = true THEN 1 END),
    COUNT(CASE WHEN status = 'Rejected' THEN 1 END),
    COUNT(CASE WHEN approved_for_company = false AND status = 'Collected' THEN 1 END)
  INTO 
    v_total_collections,
    v_total_liters,
    v_approved_collections,
    v_rejected_collections,
    v_pending_collections
  FROM public.collections
  WHERE staff_id = p_staff_id
  AND DATE(collection_date) BETWEEN p_period_start AND p_period_end;
  
  -- Get variance statistics
  SELECT 
    COUNT(CASE WHEN ma.variance_type = 'positive' THEN 1 END),
    COUNT(CASE WHEN ma.variance_type = 'negative' THEN 1 END),
    COALESCE(AVG(variance_percentage), 0)
  INTO 
    v_positive_variances,
    v_negative_variances,
    v_average_variance_percentage
  FROM public.milk_approvals ma
  JOIN public.collections c ON ma.collection_id = c.id
  WHERE c.staff_id = p_staff_id
  AND DATE(c.collection_date) BETWEEN p_period_start AND p_period_end;
  
  -- Get total penalties (only pending penalties)
  SELECT COALESCE(SUM(CASE WHEN ma.penalty_status = 'pending' THEN ma.penalty_amount ELSE 0 END), 0)
  INTO v_total_penalties
  FROM public.milk_approvals ma
  JOIN public.collections c ON ma.collection_id = c.id
  WHERE c.staff_id = p_staff_id
  AND DATE(c.collection_date) BETWEEN p_period_start AND p_period_end;
  
  -- Calculate performance score (simplified formula)
  -- Higher score for more collections, lower penalties, and fewer variances
  v_performance_score := CASE 
    WHEN v_total_collections > 0 THEN
      (v_approved_collections::NUMERIC / v_total_collections::NUMERIC) * 100 -
      (v_total_penalties / 100) -
      ((v_positive_variances + v_negative_variances)::NUMERIC / v_total_collections::NUMERIC) * 10
    ELSE 0
  END;
  
  -- Ensure performance score is between 0 and 100
  v_performance_score := GREATEST(0, LEAST(100, v_performance_score));
  
  -- Insert or update performance record
  INSERT INTO public.collector_performance (
    staff_id,
    period_start,
    period_end,
    total_collections,
    total_liters,
    approved_collections,
    rejected_collections,
    pending_collections,
    average_variance_percentage,
    positive_variances,
    negative_variances,
    total_penalties,
    performance_score
  ) VALUES (
    p_staff_id,
    p_period_start,
    p_period_end,
    v_total_collections,
    v_total_liters,
    v_approved_collections,
    v_rejected_collections,
    v_pending_collections,
    v_average_variance_percentage,
    v_positive_variances,
    v_negative_variances,
    v_total_penalties,
    v_performance_score
  )
  ON CONFLICT (staff_id, period_start, period_end) 
  DO UPDATE SET
    total_collections = EXCLUDED.total_collections,
    total_liters = EXCLUDED.total_liters,
    approved_collections = EXCLUDED.approved_collections,
    rejected_collections = EXCLUDED.rejected_collections,
    pending_collections = EXCLUDED.pending_collections,
    average_variance_percentage = EXCLUDED.average_variance_percentage,
    positive_variances = EXCLUDED.positive_variances,
    negative_variances = EXCLUDED.negative_variances,
    total_penalties = EXCLUDED.total_penalties,
    performance_score = EXCLUDED.performance_score,
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
  total_liters NUMERIC(10,2),
  approved_collections INTEGER,
  rejected_collections INTEGER,
  pending_collections INTEGER,
  average_variance_percentage NUMERIC(5,2),
  positive_variances INTEGER,
  negative_variances INTEGER,
  total_penalties NUMERIC(10,2),
  performance_score NUMERIC(5,2)
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cp.period_start,
    cp.period_end,
    cp.total_collections,
    cp.total_liters,
    cp.approved_collections,
    cp.rejected_collections,
    cp.pending_collections,
    cp.average_variance_percentage,
    cp.positive_variances,
    cp.negative_variances,
    cp.total_penalties,
    cp.performance_score
  FROM public.collector_performance cp
  WHERE cp.staff_id = p_staff_id
  ORDER BY cp.period_start DESC
  LIMIT 10;
END;
$$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that functions were created
SELECT proname FROM pg_proc WHERE proname IN ('populate_collector_performance', 'get_collector_performance_summary');

-- Test the functions with sample data (will need actual staff IDs)
-- SELECT * FROM public.populate_collector_performance('some-uuid', '2025-11-01', '2025-11-30');
-- SELECT * FROM public.get_collector_performance_summary('some-uuid');