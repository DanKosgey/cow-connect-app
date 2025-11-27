-- Migration: 20251127000600_create_get_collector_last_collection_function.sql
-- Description: Create function to get last collection date for collectors
-- Estimated time: 1 minute

BEGIN;

-- RPC: get_collector_last_collection - gets the last collection date for a collector within a date range
CREATE OR REPLACE FUNCTION public.get_collector_last_collection(
    p_staff_id UUID,
    p_start_date DATE,
    p_end_date DATE
)
RETURNS DATE
SECURITY DEFINER
AS $$
DECLARE
    v_last_collection_date DATE;
BEGIN
    SELECT MAX(DATE(collection_date))
    INTO v_last_collection_date
    FROM public.collections
    WHERE staff_id = p_staff_id
    AND approval_status = 'approved'
    AND DATE(collection_date) BETWEEN p_start_date AND p_end_date;
    
    RETURN v_last_collection_date;
END;
$$ LANGUAGE plpgsql;

-- RPC: get_all_collectors_last_collection - gets the last collection date for all collectors within a date range
CREATE OR REPLACE FUNCTION public.get_all_collectors_last_collection(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    collector_id UUID,
    last_collection_date DATE
)
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.staff_id as collector_id,
        MAX(DATE(c.collection_date)) as last_collection_date
    FROM public.collections c
    WHERE c.approval_status = 'approved'
    AND DATE(c.collection_date) BETWEEN p_start_date AND p_end_date
    GROUP BY c.staff_id;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the functions were created
SELECT proname FROM pg_proc WHERE proname IN ('get_collector_last_collection', 'get_all_collectors_last_collection');

-- Test the functions with sample data
-- SELECT public.get_collector_last_collection('some-uuid', '2025-11-01', '2025-11-30');
-- SELECT * FROM public.get_all_collectors_last_collection('2025-11-01', '2025-11-30') LIMIT 10;