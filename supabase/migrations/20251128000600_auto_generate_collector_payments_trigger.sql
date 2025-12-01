-- Migration: 20251128000600_auto_generate_collector_payments_trigger.sql
-- Description: Create trigger to automatically generate collector payment records when collections are approved
-- This will ensure payment records are created automatically without admin intervention

BEGIN;

-- Create a function to automatically generate payment records when collections are approved
CREATE OR REPLACE FUNCTION auto_generate_collector_payment()
RETURNS TRIGGER AS $$
DECLARE
    v_collector_id UUID;
    v_period_start DATE;
    v_period_end DATE;
    v_total_collections INTEGER;
    v_total_liters NUMERIC(10,2);
    v_rate_per_liter NUMERIC(10,2);
    v_total_earnings NUMERIC(10,2);
BEGIN
    -- Only process when approved_for_payment is set to true
    IF NEW.approved_for_payment = true AND OLD.approved_for_payment IS DISTINCT FROM true THEN
        -- Get collector information
        v_collector_id := NEW.staff_id;
        
        -- Get the current collector rate
        SELECT COALESCE((
            SELECT rate_per_liter 
            FROM collector_rates 
            WHERE is_active = true 
            ORDER BY effective_from DESC 
            LIMIT 1
        ), 0.00) INTO v_rate_per_liter;
        
        -- Calculate payment data for this collector
        SELECT 
            COUNT(c.id)::INTEGER,
            COALESCE(SUM(c.liters), 0)::NUMERIC(10,2),
            MIN(c.collection_date::DATE),
            MAX(c.collection_date::DATE),
            (COALESCE(SUM(c.liters), 0) * v_rate_per_liter)::NUMERIC(10,2)
        INTO 
            v_total_collections,
            v_total_liters,
            v_period_start,
            v_period_end,
            v_total_earnings
        FROM collections c
        WHERE c.staff_id = v_collector_id
          AND c.approved_for_payment = true
          AND c.status = 'Collected'
          AND NOT EXISTS (
              -- Check if a payment record already exists for this collector and period
              SELECT 1 
              FROM collector_payments cp 
              WHERE cp.collector_id = v_collector_id
                AND cp.period_start <= c.collection_date::DATE
                AND cp.period_end >= c.collection_date::DATE
          );
        
        -- Only create payment record if there are collections
        IF v_total_collections > 0 THEN
            -- Insert payment record
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
            )
            ON CONFLICT DO NOTHING; -- Prevent duplicates
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on collections table
CREATE TRIGGER trigger_auto_generate_collector_payment
    AFTER UPDATE OF approved_for_payment ON collections
    FOR EACH ROW
    EXECUTE FUNCTION auto_generate_collector_payment();

-- Also create trigger for new collections that are immediately approved
CREATE OR REPLACE FUNCTION auto_generate_collector_payment_on_insert()
RETURNS TRIGGER AS $$
DECLARE
    v_collector_id UUID;
    v_period_start DATE;
    v_period_end DATE;
    v_total_collections INTEGER;
    v_total_liters NUMERIC(10,2);
    v_rate_per_liter NUMERIC(10,2);
    v_total_earnings NUMERIC(10,2);
BEGIN
    -- Only process when approved_for_payment is true on insert
    IF NEW.approved_for_payment = true THEN
        -- Get collector information
        v_collector_id := NEW.staff_id;
        
        -- Get the current collector rate
        SELECT COALESCE((
            SELECT rate_per_liter 
            FROM collector_rates 
            WHERE is_active = true 
            ORDER BY effective_from DESC 
            LIMIT 1
        ), 0.00) INTO v_rate_per_liter;
        
        -- Calculate payment data for this collector
        SELECT 
            COUNT(c.id)::INTEGER,
            COALESCE(SUM(c.liters), 0)::NUMERIC(10,2),
            MIN(c.collection_date::DATE),
            MAX(c.collection_date::DATE),
            (COALESCE(SUM(c.liters), 0) * v_rate_per_liter)::NUMERIC(10,2)
        INTO 
            v_total_collections,
            v_total_liters,
            v_period_start,
            v_period_end,
            v_total_earnings
        FROM collections c
        WHERE c.staff_id = v_collector_id
          AND c.approved_for_payment = true
          AND c.status = 'Collected'
          AND NOT EXISTS (
              -- Check if a payment record already exists for this collector and period
              SELECT 1 
              FROM collector_payments cp 
              WHERE cp.collector_id = v_collector_id
                AND cp.period_start <= c.collection_date::DATE
                AND cp.period_end >= c.collection_date::DATE
          );
        
        -- Only create payment record if there are collections
        IF v_total_collections > 0 THEN
            -- Insert payment record
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
            )
            ON CONFLICT DO NOTHING; -- Prevent duplicates
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on collections table for inserts
CREATE TRIGGER trigger_auto_generate_collector_payment_on_insert
    AFTER INSERT ON collections
    FOR EACH ROW
    WHEN (NEW.approved_for_payment = true)
    EXECUTE FUNCTION auto_generate_collector_payment_on_insert();

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that triggers were created
SELECT tgname FROM pg_trigger WHERE tgname LIKE '%auto_generate_collector_payment%';

-- Check that functions were created
SELECT proname FROM pg_proc WHERE proname IN ('auto_generate_collector_payment', 'auto_generate_collector_payment_on_insert');