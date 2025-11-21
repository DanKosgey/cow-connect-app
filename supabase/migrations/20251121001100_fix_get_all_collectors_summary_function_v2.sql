-- Migration: 20251121001100_fix_get_all_collectors_summary_function_v2.sql
-- Description: Fix the get_all_collectors_summary function to resolve column reference ambiguity
-- This fixes the "column reference "collection_date" is ambiguous" error

BEGIN;

-- Drop the function if it exists with incorrect signature
DROP FUNCTION IF EXISTS public.get_all_collectors_summary(date);

-- Create function to get summary for all collectors on a specific date
-- Using explicit parameter reference with $1 to avoid any ambiguity
CREATE OR REPLACE FUNCTION public.get_all_collectors_summary(
    p_collection_date date
)
RETURNS TABLE(
    collector_id uuid,
    collector_name text,
    collection_date date,
    total_collections integer,
    total_liters_collected numeric,
    total_liters_received numeric,
    total_variance numeric,
    average_variance_percentage numeric,
    total_penalty_amount numeric,
    approved_collections integer,
    pending_collections integer
) 
SECURITY DEFINER
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        s.id as collector_id,
        COALESCE(p.full_name, 'Unknown Collector') as collector_name,
        $1 as collection_date,
        COUNT(c.id)::integer as total_collections,
        COALESCE(SUM(c.liters), 0) as total_liters_collected,
        COALESCE(SUM(ma.company_received_liters), 0) as total_liters_received,
        COALESCE(SUM(ma.variance_liters), 0) as total_variance,
        CASE 
            WHEN SUM(c.liters) > 0 THEN 
                (SUM(ma.variance_liters) / SUM(c.liters)) * 100
            ELSE 0
        END as average_variance_percentage,
        COALESCE(SUM(ma.penalty_amount), 0) as total_penalty_amount,
        COUNT(CASE WHEN c.approved_for_company = true THEN 1 END)::integer as approved_collections,
        COUNT(CASE WHEN c.approved_for_company = false THEN 1 END)::integer as pending_collections
    FROM public.staff s
    LEFT JOIN public.profiles p ON s.user_id = p.id
    LEFT JOIN public.collections c ON s.id = c.staff_id 
        AND c.collection_date = $1
        AND c.status = 'Collected'
    LEFT JOIN public.milk_approvals ma ON c.id = ma.collection_id
    WHERE s.id IN (
        SELECT DISTINCT staff_id 
        FROM public.collections collections_sub
        WHERE collections_sub.collection_date = $1
          AND collections_sub.status = 'Collected'
          AND collections_sub.staff_id IS NOT NULL
    )
    AND EXISTS (
        SELECT 1 
        FROM public.user_roles ur 
        WHERE ur.user_id = s.user_id 
        AND ur.role = 'collector' 
        AND ur.active = true
    )
    GROUP BY s.id, p.full_name, $1
    ORDER BY total_liters_collected DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_collectors_summary TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the function exists
SELECT proname FROM pg_proc WHERE proname = 'get_all_collectors_summary';

-- Test calling the function with a sample date
-- SELECT * FROM public.get_all_collectors_summary('2025-11-18');

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Drop the fixed function
DROP FUNCTION IF EXISTS public.get_all_collectors_summary(date);

-- Recreate with the previous (incorrect) version if needed
-- Note: This would bring back the error, so only use if you have the correct backup

COMMIT;
*/