-- Migration: 202511180007_audit_summary_function.sql
-- Description: Create function to get audit summary for fraud detection
-- Estimated time: 1 minute

BEGIN;

-- RPC: get_audit_summary - returns summary of audit logs for a given date range
CREATE OR REPLACE FUNCTION public.get_audit_summary(
  start_date TEXT,
  end_date TEXT
)
RETURNS TABLE(
  table_name TEXT,
  operation TEXT,
  count BIGINT
) 
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT 
    al.table_name::TEXT,
    al.operation::TEXT,
    COUNT(*)::BIGINT as count
  FROM public.audit_logs al
  WHERE al.created_at >= start_date::TIMESTAMPTZ
    AND al.created_at <= end_date::TIMESTAMPTZ
  GROUP BY al.table_name, al.operation
  ORDER BY al.table_name, al.operation;
END;
$$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that function was created
SELECT proname FROM pg_proc WHERE proname = 'get_audit_summary';

-- Test the function with sample dates (replace with actual values)
-- SELECT * FROM public.get_audit_summary('2025-11-01', '2025-11-30');