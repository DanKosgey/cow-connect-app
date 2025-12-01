-- Migration: 20251201001_fix_payment_generation_logic.sql
-- Description: Fix payment generation logic to properly handle multiple collections per collector

BEGIN;

-- Drop existing functions to ensure clean state
DROP FUNCTION IF EXISTS generate_collector_payments();
DROP FUNCTION IF EXISTS manual_generate_collector_payments();

-- Create the main function with proper signature for RPC calls
CREATE OR REPLACE FUNCTION public.generate_collector_payments()
RETURNS TABLE(
    collector_id UUID,
    period_start DATE,
    period_end DATE,
    total_collections INTEGER,
    total_liters NUMERIC(10,2),
    rate_per_liter NUMERIC(10,2),
    total_earnings NUMERIC(10,2)
) 
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.staff_id as collector_id,
        MIN(c.collection_date::DATE) as period_start,
        MAX(c.collection_date::DATE) as period_end,
        COUNT(c.id)::INTEGER as total_collections,
        COALESCE(SUM(c.liters), 0)::NUMERIC(10,2) as total_liters,
        -- Get the current collector rate
        COALESCE((
            SELECT rate_per_liter 
            FROM collector_rates 
            WHERE is_active = true 
            ORDER BY effective_from DESC 
            LIMIT 1
        ), 0.00)::NUMERIC(10,2) as rate_per_liter,
        -- Calculate total earnings
        (COALESCE(SUM(c.liters), 0) * COALESCE((
            SELECT rate_per_liter 
            FROM collector_rates 
            WHERE is_active = true 
            ORDER BY effective_from DESC 
            LIMIT 1
        ), 0.00))::NUMERIC(10,2) as total_earnings
    FROM collections c
    WHERE c.approved_for_payment = true
      AND c.status = 'Collected'
      AND NOT EXISTS (
          -- Check if a payment record already exists for this collector covering ALL their collections
          SELECT 1 
          FROM collector_payments cp 
          WHERE cp.collector_id = c.staff_id
            AND cp.period_start = (
                SELECT MIN(c2.collection_date::DATE)
                FROM collections c2
                WHERE c2.staff_id = c.staff_id
                  AND c2.approved_for_payment = true
                  AND c2.status = 'Collected'
            )
            AND cp.period_end = (
                SELECT MAX(c2.collection_date::DATE)
                FROM collections c2
                WHERE c2.staff_id = c.staff_id
                  AND c2.approved_for_payment = true
                  AND c2.status = 'Collected'
            )
      )
    GROUP BY c.staff_id
    HAVING COUNT(c.id) > 0; -- Only return records with collections
END;
$$;

-- Create the manual function with no parameters for direct RPC call
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
    -- Loop through all collectors with approved collections that don't have payment records
    FOR v_collector_id IN
        SELECT DISTINCT c.staff_id
        FROM collections c
        WHERE c.approved_for_payment = true
          AND c.status = 'Collected'
          AND NOT EXISTS (
              -- Check if a payment record already exists for this collector covering ALL their collections
              SELECT 1 
              FROM collector_payments cp 
              WHERE cp.collector_id = c.staff_id
                AND cp.period_start = (
                    SELECT MIN(c2.collection_date::DATE)
                    FROM collections c2
                    WHERE c2.staff_id = c.staff_id
                      AND c2.approved_for_payment = true
                      AND c2.status = 'Collected'
                )
                AND cp.period_end = (
                    SELECT MAX(c2.collection_date::DATE)
                    FROM collections c2
                    WHERE c2.staff_id = c.staff_id
                      AND c2.approved_for_payment = true
                      AND c2.status = 'Collected'
                )
          )
    LOOP
        -- Get payment data for this collector
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
          AND c.status = 'Collected';
        
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
            
            -- Check if payment record already exists to prevent duplicates
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
SELECT proname, proargnames, prorettype FROM pg_proc WHERE proname IN ('generate_collector_payments', 'manual_generate_collector_payments');

-- Test the manual function (this should return true)
-- SELECT public.manual_generate_collector_payments();