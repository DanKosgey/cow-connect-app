-- Migration: 20251128000800_create_manual_payment_generation_function.sql
-- Description: Create a manual function to generate collector payment records that can be called from the frontend

BEGIN;

-- Create a function that can be called manually to generate payment records
CREATE OR REPLACE FUNCTION public.manual_generate_collector_payments()
RETURNS BOOLEAN
SECURITY DEFINER
AS $$
DECLARE
    v_collector_id UUID;
    v_period_start DATE;
    v_period_end DATE;
    v_total_collections INTEGER;
    v_total_liters NUMERIC(10,2);
    v_rate_per_liter NUMERIC(10,2);
    v_total_earnings NUMERIC(10,2);
    v_total_penalties NUMERIC(10,2);
    v_adjusted_earnings NUMERIC(10,2);
    v_payment_exists BOOLEAN;
BEGIN
    -- Loop through all collectors with approved collections that don't have payment records
    FOR v_collector_id IN
        SELECT DISTINCT c.staff_id
        FROM collections c
        WHERE c.approved_for_payment = true
          AND c.status = 'Collected'
          AND NOT EXISTS (
              SELECT 1 
              FROM collector_payments cp 
              WHERE cp.collector_id = c.staff_id
                AND cp.period_start <= c.collection_date::DATE
                AND cp.period_end >= c.collection_date::DATE
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
            
            -- Calculate total penalties for this collector in this period
            -- Sum penalties from milk_approvals table
            SELECT COALESCE(SUM(ma.penalty_amount), 0)::NUMERIC(10,2)
            INTO v_total_penalties
            FROM milk_approvals ma
            JOIN collections c ON ma.collection_id = c.id
            WHERE c.staff_id = v_collector_id
              AND c.approved_for_payment = true
              AND c.status = 'Collected'
              AND ma.approved_at::DATE BETWEEN v_period_start AND v_period_end;
              
            -- Calculate adjusted earnings (earnings minus penalties)
            v_adjusted_earnings := GREATEST(0, v_total_earnings - v_total_penalties);
            
            -- Insert payment record
            INSERT INTO collector_payments (
                collector_id,
                period_start,
                period_end,
                total_collections,
                total_liters,
                rate_per_liter,
                total_earnings,
                total_penalties,
                adjusted_earnings,
                status
            ) VALUES (
                v_collector_id,
                v_period_start,
                v_period_end,
                v_total_collections,
                v_total_liters,
                v_rate_per_liter,
                v_total_earnings,
                v_total_penalties,
                v_adjusted_earnings,
                'pending'
            )
            ON CONFLICT DO NOTHING; -- Prevent duplicates
        END IF;
    END LOOP;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the entire function
        RAISE WARNING 'Error in manual_generate_collector_payments: %', SQLERRM;
        RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the function was created
SELECT proname FROM pg_proc WHERE proname = 'manual_generate_collector_payments';

-- Test the function (this should return true)
-- SELECT public.manual_generate_collector_payments();