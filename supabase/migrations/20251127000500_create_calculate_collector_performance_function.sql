-- Migration: 20251127000500_create_calculate_collector_performance_function.sql
-- Description: Create function to calculate collector performance directly from collections and approvals data
-- Estimated time: 1 minute

BEGIN;

-- RPC: calculate_collector_performance - calculates collector performance for a given date range
CREATE OR REPLACE FUNCTION public.calculate_collector_performance(
    p_start_date DATE,
    p_end_date DATE
)
RETURNS TABLE(
    collector_id UUID,
    collector_name TEXT,
    total_collections INTEGER,
    total_liters_collected NUMERIC(10,2),
    total_variance NUMERIC(10,2),
    average_variance_percentage NUMERIC(5,2),
    total_penalty_amount NUMERIC(10,2),
    positive_variances INTEGER,
    negative_variances INTEGER,
    performance_score NUMERIC(5,2),
    last_collection_date DATE
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    WITH collector_stats AS (
        SELECT 
            c.staff_id,
            COUNT(c.id) as collection_count,
            COALESCE(SUM(c.liters), 0) as total_liters,
            COALESCE(SUM(ma.variance_liters), 0) as total_variance,
            COALESCE(SUM(ma.penalty_amount), 0) as total_penalties,
            COUNT(CASE WHEN ma.variance_type = 'positive' THEN 1 END) as positive_vars,
            COUNT(CASE WHEN ma.variance_type = 'negative' THEN 1 END) as negative_vars,
            COALESCE(AVG(ma.variance_percentage), 0) as avg_variance_pct,
            MAX(DATE(c.collection_date)) as last_collection
        FROM public.collections c
        LEFT JOIN public.milk_approvals ma ON c.id = ma.collection_id
        WHERE c.approved_for_company = true
        AND DATE(c.collection_date) BETWEEN p_start_date AND p_end_date
        GROUP BY c.staff_id
    )
    SELECT 
        cs.staff_id as collector_id,
        COALESCE(p.full_name, 'Unknown Collector') as collector_name,
        cs.collection_count::INTEGER as total_collections,
        cs.total_liters as total_liters_collected,
        cs.total_variance,
        cs.avg_variance_pct as average_variance_percentage,
        cs.total_penalties as total_penalty_amount,
        cs.positive_vars::INTEGER as positive_variances,
        cs.negative_vars::INTEGER as negative_variances,
        -- Performance score calculation:
        -- Higher score for more collections, lower penalties, and fewer variances
        GREATEST(0, LEAST(100, 
            100 - 
            (cs.total_penalties / 100) -  -- Penalty deduction
            ((cs.positive_vars + cs.negative_vars)::NUMERIC / GREATEST(cs.collection_count::NUMERIC, 1)) * 10  -- Variance deduction
        )) as performance_score,
        cs.last_collection as last_collection_date
    FROM collector_stats cs
    LEFT JOIN public.staff s ON cs.staff_id = s.id
    LEFT JOIN public.profiles p ON s.user_id = p.id
    ORDER BY cs.total_liters DESC;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the function was created
SELECT proname FROM pg_proc WHERE proname = 'calculate_collector_performance';

-- Test the function with sample dates
-- SELECT * FROM public.calculate_collector_performance('2025-11-01', '2025-11-30') LIMIT 10;