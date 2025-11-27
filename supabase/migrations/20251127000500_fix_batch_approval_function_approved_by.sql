-- Migration: 20251127000500_fix_batch_approval_function_approved_by.sql
-- Description: Fix batch approval function to properly set approved_by field in collections table
-- This ensures that the staff member who approves collections is properly recorded

BEGIN;

-- Update function to batch approve collector collections with proper approved_by setting
CREATE OR REPLACE FUNCTION public.batch_approve_collector_collections(
    p_staff_id uuid,
    p_collector_id uuid,
    p_collection_date date,
    p_total_received_liters numeric DEFAULT NULL
)
RETURNS TABLE(
    approved_count integer,
    total_liters_collected numeric,
    total_liters_received numeric,
    total_variance numeric,
    total_penalty_amount numeric,
    message text
) 
SECURITY DEFINER
AS $$
DECLARE
    v_approved_count integer := 0;
    v_total_collected numeric := 0;
    v_total_received numeric := 0;
    v_total_variance numeric := 0;
    v_total_penalty numeric := 0;
    v_collection_record record;
    v_variance_data record;
    v_penalty_amount numeric;
    v_approval_id uuid;
    v_collected_liters numeric;
    v_received_liters numeric;
    v_variance_liters numeric;
    v_variance_percentage numeric;
    v_variance_type text;
BEGIN
    -- Log the input parameters for debugging
    RAISE LOG 'batch_approve_collector_collections called with: staff_id=%, collector_id=%, collection_date=%, total_received_liters=%', 
        p_staff_id, p_collector_id, p_collection_date, p_total_received_liters;

    -- Validate inputs
    IF p_staff_id IS NULL THEN
        RETURN QUERY SELECT 0, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 'Staff ID is required'::text;
        RETURN;
    END IF;
    
    IF p_collector_id IS NULL THEN
        RETURN QUERY SELECT 0, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 'Collector ID is required'::text;
        RETURN;
    END IF;
    
    IF p_collection_date IS NULL THEN
        RETURN QUERY SELECT 0, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 'Collection date is required'::text;
        RETURN;
    END IF;
    
    IF p_total_received_liters IS NOT NULL AND p_total_received_liters < 0 THEN
        RETURN QUERY SELECT 0, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 'Total received liters cannot be negative'::text;
        RETURN;
    END IF;
    
    -- Validate staff ID exists
    IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_staff_id) THEN
        RETURN QUERY SELECT 0, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 'Invalid approving staff ID'::text;
        RETURN;
    END IF;
    
    -- Validate collector ID exists
    IF NOT EXISTS (SELECT 1 FROM public.staff WHERE id = p_collector_id) THEN
        RETURN QUERY SELECT 0, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 'Invalid collector ID'::text;
        RETURN;
    END IF;
    
    -- Get total collected liters for the collector on that date for proportional distribution
    SELECT COALESCE(SUM(liters), 0) INTO v_total_collected
    FROM public.collections
    WHERE staff_id = p_collector_id
    AND collection_date::date = p_collection_date
    AND status = 'Collected'
    AND approved_for_company = false;
    
    -- If no collections found, return appropriate message
    IF v_total_collected = 0 THEN
        RETURN QUERY SELECT 0, 0::numeric, 0::numeric, 0::numeric, 0::numeric, 'No unapproved collections found for this collector on the specified date'::text;
        RETURN;
    END IF;
    
    -- Process each collection for the collector on the specified date
    FOR v_collection_record IN
        SELECT id, liters, farmer_id, staff_id
        FROM public.collections
        WHERE staff_id = p_collector_id
        AND collection_date::date = p_collection_date
        AND status = 'Collected'
        AND approved_for_company = false
    LOOP
        -- Log each collection being processed
        RAISE LOG 'Processing collection ID=%, liters=%', v_collection_record.id, v_collection_record.liters;
        
        -- Use collected liters as baseline
        v_collected_liters := v_collection_record.liters;
        
        -- Calculate received liters based on proportional distribution if total is provided
        IF p_total_received_liters IS NOT NULL AND v_total_collected > 0 THEN
            -- Distribute total received liters proportionally based on collected liters
            v_received_liters := (v_collected_liters / v_total_collected) * p_total_received_liters;
        ELSE
            -- If no total provided, use collected liters (no variance)
            v_received_liters := v_collected_liters;
        END IF;
        
        -- Calculate variance
        v_variance_liters := v_received_liters - v_collected_liters;
        v_variance_percentage := CASE 
            WHEN v_collected_liters > 0 THEN (v_variance_liters / v_collected_liters) * 100
            ELSE 0
        END;
        
        -- Determine variance type
        IF v_variance_liters > 0 THEN
            v_variance_type := 'positive';
        ELSIF v_variance_liters < 0 THEN
            v_variance_type := 'negative';
        ELSE
            v_variance_type := 'none';
        END IF;
        
        -- Calculate penalty based on variance configuration
        SELECT COALESCE(penalty_rate_per_liter, 0) * ABS(v_variance_liters) INTO v_penalty_amount
        FROM public.variance_penalty_config
        WHERE is_active = true
          AND variance_type = v_variance_type::variance_type_enum
          AND ABS(v_variance_percentage) BETWEEN min_variance_percentage AND max_variance_percentage
        LIMIT 1;
        
        v_penalty_amount := COALESCE(v_penalty_amount, 0);
        
        -- Create milk approval record
        INSERT INTO public.milk_approvals (
            collection_id,
            staff_id,
            company_received_liters,
            variance_liters,
            variance_percentage,
            variance_type,
            penalty_amount
        ) VALUES (
            v_collection_record.id,
            p_staff_id,
            v_received_liters,
            v_variance_liters,
            v_variance_percentage,
            v_variance_type::variance_type_enum,
            v_penalty_amount
        ) RETURNING id INTO v_approval_id;
        
        -- Update collection to mark as approved with approved_by field
        UPDATE public.collections
        SET approved_for_company = true,
            company_approval_id = v_approval_id,
            approved_by = p_staff_id,
            updated_at = NOW()
        WHERE id = v_collection_record.id;
        
        -- Update collector performance metrics
        -- Get existing performance record for current period (month)
        -- For simplicity, we'll use the current month as the period
        PERFORM 1 FROM public.collector_performance
        WHERE staff_id = v_collection_record.staff_id
        AND period_start = DATE_TRUNC('month', p_collection_date)::date
        AND period_end = (DATE_TRUNC('month', p_collection_date) + INTERVAL '1 month - 1 day')::date;
        
        IF FOUND THEN
            -- Update existing record
            UPDATE public.collector_performance
            SET 
                total_collections = total_collections + 1,
                total_liters_collected = total_liters_collected + v_collected_liters,
                total_liters_received = total_liters_received + v_received_liters,
                total_variance = total_variance + v_variance_liters,
                total_penalty_amount = total_penalty_amount + v_penalty_amount,
                positive_variances = positive_variances + CASE WHEN v_variance_type = 'positive' THEN 1 ELSE 0 END,
                negative_variances = negative_variances + CASE WHEN v_variance_type = 'negative' THEN 1 ELSE 0 END,
                updated_at = NOW()
            WHERE staff_id = v_collection_record.staff_id
            AND period_start = DATE_TRUNC('month', p_collection_date)::date
            AND period_end = (DATE_TRUNC('month', p_collection_date) + INTERVAL '1 month - 1 day')::date;
        ELSE
            -- Create new performance record
            INSERT INTO public.collector_performance (
                staff_id,
                period_start,
                period_end,
                total_collections,
                total_liters_collected,
                total_liters_received,
                total_variance,
                total_penalty_amount,
                positive_variances,
                negative_variances
            ) VALUES (
                v_collection_record.staff_id,
                DATE_TRUNC('month', p_collection_date)::date,
                (DATE_TRUNC('month', p_collection_date) + INTERVAL '1 month - 1 day')::date,
                1,
                v_collected_liters,
                v_received_liters,
                v_variance_liters,
                v_penalty_amount,
                CASE WHEN v_variance_type = 'positive' THEN 1 ELSE 0 END,
                CASE WHEN v_variance_type = 'negative' THEN 1 ELSE 0 END
            );
        END IF;
        
        -- Update totals
        v_approved_count := v_approved_count + 1;
        v_total_collected := v_total_collected + v_collected_liters;
        v_total_received := v_total_received + v_received_liters;
        v_total_variance := v_total_variance + v_variance_liters;
        v_total_penalty := v_total_penalty + v_penalty_amount;
    END LOOP;
    
    -- Return summary
    RETURN QUERY SELECT 
        v_approved_count,
        v_total_collected,
        v_total_received,
        v_total_variance,
        v_total_penalty,
        CASE 
            WHEN v_approved_count > 0 THEN 'Successfully approved ' || v_approved_count || ' collections'
            ELSE 'No collections found for approval'
        END;
END;
$$ LANGUAGE plpgsql;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.batch_approve_collector_collections TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that function was updated
SELECT proname, probin FROM pg_proc WHERE proname = 'batch_approve_collector_collections';

-- Test the function with sample data (will need actual staff IDs)
-- SELECT * FROM public.batch_approve_collector_collections('staff-id', 'collector-id', '2025-11-27', 100);

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Revert to previous version of the function (you would need to restore the previous function definition)
-- CREATE OR REPLACE FUNCTION public.batch_approve_collector_collections(...) ...;

COMMIT;
*/