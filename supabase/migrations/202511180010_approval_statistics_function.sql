-- Migration: 202511180010_approval_statistics_function.sql
-- Description: Create function to get approval statistics for analytics dashboard
-- Estimated time: 1 minute

BEGIN;

-- Create function to get approval statistics
CREATE OR REPLACE FUNCTION public.get_approval_statistics(
    start_date DATE,
    end_date DATE
)
RETURNS TABLE(
    date DATE,
    total_approvals BIGINT,
    approved_collections BIGINT,
    total_variance NUMERIC,
    average_variance NUMERIC,
    positive_variances BIGINT,
    negative_variances BIGINT,
    total_penalty_amount NUMERIC
)
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(ma.created_at) as date,
    COUNT(*)::BIGINT as total_approvals,
    COUNT(CASE WHEN c.approved_for_company = true THEN 1 END)::BIGINT as approved_collections,
    COALESCE(SUM(ma.variance_liters), 0) as total_variance,
    COALESCE(AVG(ma.variance_liters), 0) as average_variance,
    COUNT(CASE WHEN ma.variance_liters > 0 THEN 1 END)::BIGINT as positive_variances,
    COUNT(CASE WHEN ma.variance_liters < 0 THEN 1 END)::BIGINT as negative_variances,
    COALESCE(SUM(CASE WHEN ma.penalty_status = 'pending' THEN ma.penalty_amount ELSE 0 END), 0) as total_penalty_amount
  FROM public.milk_approvals ma
  JOIN public.collections c ON ma.collection_id = c.id
  WHERE ma.created_at >= start_date::TIMESTAMPTZ
    AND ma.created_at <= end_date::TIMESTAMPTZ
  GROUP BY DATE(ma.created_at)
  ORDER BY DATE(ma.created_at);
END;
$$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that function was created
SELECT proname FROM pg_proc WHERE proname = 'get_approval_statistics';

-- Test the function with sample dates (replace with actual values)
-- SELECT * FROM public.get_approval_statistics('2025-11-01', '2025-11-30');