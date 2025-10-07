-- Migration: 20251005_add_payment_analytics_functions.sql
-- Description: Add RPC functions for payment analytics
-- Rollback: DROP FUNCTION IF EXISTS get_payment_statistics, get_monthly_payment_trends;

BEGIN;

-- Function to get payment statistics
DROP FUNCTION IF EXISTS public.get_payment_statistics();
CREATE OR REPLACE FUNCTION public.get_payment_statistics()
RETURNS TABLE(
  total_payments BIGINT,
  total_amount NUMERIC,
  pending_payments BIGINT,
  approved_payments BIGINT,
  paid_payments BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::BIGINT AS total_payments,
    COALESCE(SUM(total_amount), 0)::NUMERIC AS total_amount,
    COUNT(CASE WHEN approval_status = 'pending' THEN 1 ELSE NULL END)::BIGINT AS pending_payments,
    COUNT(CASE WHEN approval_status = 'approved' THEN 1 ELSE NULL END)::BIGINT AS approved_payments,
    COUNT(CASE WHEN approval_status = 'paid' THEN 1 ELSE NULL END)::BIGINT AS paid_payments
  FROM public.farmer_payments;
END;
$$;

-- Function to get monthly payment trends
DROP FUNCTION IF EXISTS public.get_monthly_payment_trends();
CREATE OR REPLACE FUNCTION public.get_monthly_payment_trends()
RETURNS TABLE(
  month DATE,
  total_amount NUMERIC,
  payment_count BIGINT
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE_TRUNC('month', created_at)::DATE AS month,
    COALESCE(SUM(total_amount), 0)::NUMERIC AS total_amount,
    COUNT(*)::BIGINT AS payment_count
  FROM public.farmer_payments
  WHERE approval_status = 'paid'
  GROUP BY DATE_TRUNC('month', created_at)
  ORDER BY month;
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.get_payment_statistics() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_monthly_payment_trends() TO authenticated;

COMMIT;