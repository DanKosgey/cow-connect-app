-- Migration: 20251201004_update_payment_generation_logic.sql
-- Description: Update payment generation logic to filter by collection_fee_status

BEGIN;

-- Drop existing functions to ensure clean state
DROP FUNCTION IF EXISTS generate_collector_payments();
DROP FUNCTION IF EXISTS manual_generate_collector_payments();

-- Simplified function to generate collector payments
-- Only includes collections with collection_fee_status = 'pending'
CREATE OR REPLACE FUNCTION public.manual_generate_collector_payments()
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_collector_id UUID;
    v_period_start DATE;
    v_period_end DATE;
    v_total_collections INTEGER;
    v_total_liters NUMERIC(10,2);
    v_rate_per_liter NUMERIC(10,2);
    v_total_earnings NUMERIC(10,2);
    v_payment_exists BOOLEAN;
BEGIN
    -- Loop through all collectors with approved collections that have pending fees
    FOR v_collector_id IN
        SELECT DISTINCT c.staff_id
        FROM collections c
        WHERE c.approved_for_payment = true
          AND c.status = 'Collected'
          AND c.collection_fee_status = 'pending' -- Only include collections with pending fees
    LOOP
        -- Get payment data for this collector (only pending collections)
        SELECT 
            COUNT(c.id)::INTEGER,
            COALESCE(SUM(c.liters), 0)::NUMERIC(10,2),
            MIN(c.collection_date::DATE),
            MAX(c.collection_date::DATE)
        INTO 
            v_total_collections,
            v_total_liters,
            v_period_start,
            v_period_end
        FROM collections c
        WHERE c.staff_id = v_collector_id
          AND c.approved_for_payment = true
          AND c.status = 'Collected'
          AND c.collection_fee_status = 'pending'; -- Only include collections with pending fees
        
        -- Only proceed if there are collections
        IF v_total_collections > 0 THEN
            -- Get the current collector rate
            SELECT COALESCE((
                SELECT rate_per_liter 
                FROM collector_rates 
                WHERE is_active = true 
                ORDER BY effective_from DESC 
                LIMIT 1
            ), 0.00) INTO v_rate_per_liter;
            
            -- Calculate total earnings
            v_total_earnings := v_total_liters * v_rate_per_liter;
            
            -- Check if payment record already exists for this exact period
            SELECT EXISTS (
                SELECT 1 
                FROM collector_payments cp 
                WHERE cp.collector_id = v_collector_id
                  AND cp.period_start = v_period_start
                  AND cp.period_end = v_period_end
            ) INTO v_payment_exists;
            
            -- Insert payment record only if it doesn't exist
            IF NOT v_payment_exists THEN
                INSERT INTO collector_payments (
                    collector_id,
                    period_start,
                    period_end,
                    total_collections,
                    total_liters,
                    rate_per_liter,
                    total_earnings,
                    status
                ) VALUES (
                    v_collector_id,
                    v_period_start,
                    v_period_end,
                    v_total_collections,
                    v_total_liters,
                    v_rate_per_liter,
                    v_total_earnings,
                    'pending'
                );
                RAISE NOTICE 'Created payment record for collector %', v_collector_id;
            END IF;
        END IF;
    END LOOP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the entire function
        RAISE WARNING 'Error in manual_generate_collector_payments: %', SQLERRM;
        RETURN FALSE;
END;
$$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the functions were created
-- SELECT proname, proargnames, prorettype FROM pg_proc WHERE proname IN ('generate_collector_payments', 'manual_generate_collector_payments');

-- Test the manual function (this should return true)
-- SELECT public.manual_generate_collector_payments();