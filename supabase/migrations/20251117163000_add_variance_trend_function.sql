-- Migration: 20251117163000_add_variance_trend_function.sql
-- Description: Create function to get variance trend data
-- Estimated time: 1 minute

BEGIN;

-- RPC: get_variance_trend_data - returns trend data for variance analysis
CREATE OR REPLACE FUNCTION public.get_variance_trend_data(
  start_date date,
  end_date date
)
RETURNS TABLE(
  date date,
  positive_variance_count bigint,
  negative_variance_count bigint,
  average_positive_variance numeric,
  average_negative_variance numeric,
  total_penalty_amount numeric
) 
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(ma.approved_at) as date,
    COUNT(CASE WHEN ma.variance_type = 'positive' THEN 1 END)::bigint as positive_variance_count,
    COUNT(CASE WHEN ma.variance_type = 'negative' THEN 1 END)::bigint as negative_variance_count,
    COALESCE(AVG(CASE WHEN ma.variance_type = 'positive' THEN ma.variance_percentage END), 0) as average_positive_variance,
    COALESCE(AVG(CASE WHEN ma.variance_type = 'negative' THEN ma.variance_percentage END), 0) as average_negative_variance,
    COALESCE(SUM(ma.penalty_amount), 0) as total_penalty_amount
  FROM public.milk_approvals ma
  WHERE DATE(ma.approved_at) BETWEEN start_date AND end_date
  GROUP BY DATE(ma.approved_at)
  ORDER BY DATE(ma.approved_at);
END;
$$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that function was created
SELECT proname FROM pg_proc WHERE proname = 'get_variance_trend_data';

-- Test the function with sample dates (replace with actual values)
-- SELECT * FROM public.get_variance_trend_data('2025-11-01', '2025-11-30');