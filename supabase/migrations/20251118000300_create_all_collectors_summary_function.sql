-- Migration: 20251118000300_create_all_collectors_summary_function.sql
-- Description: Create function to generate summary for all collectors
-- Estimated time: 1 minute

BEGIN;

-- Create function to get summary for all collectors on a specific date
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
        p.full_name as collector_name,
        p_collection_date as collection_date,
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
    JOIN public.profiles p ON s.user_id = p.user_id
    LEFT JOIN public.collections c ON s.id = c.staff_id 
        AND c.collection_date = p_collection_date
        AND c.status = 'Collected'
    LEFT JOIN public.milk_approvals ma ON c.id = ma.collection_id
    WHERE s.id IN (
        SELECT DISTINCT staff_id 
        FROM public.collections 
        WHERE collection_date = p_collection_date
    )
    GROUP BY s.id, p.full_name, p_collection_date
    ORDER BY total_liters_collected DESC;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.get_all_collectors_summary TO authenticated;

COMMIT;