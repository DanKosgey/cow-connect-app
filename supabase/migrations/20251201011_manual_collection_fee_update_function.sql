-- Migration: 20251201011_manual_collection_fee_update_function.sql
-- Description: Create a function to manually update collection fee status for specific collections

BEGIN;

-- Create a function to manually update collection fee status
-- This can be used to fix specific collections that should be marked as paid but aren't
CREATE OR REPLACE FUNCTION public.manual_update_collection_fee_status(
    p_collection_ids UUID[],
    p_new_status TEXT
)
RETURNS TABLE(
    updated_count INTEGER,
    error_message TEXT
)
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_error_message TEXT := '';
BEGIN
    -- Validate input
    IF p_collection_ids IS NULL OR array_length(p_collection_ids, 1) = 0 THEN
        RETURN QUERY SELECT 0, 'No collection IDs provided'::TEXT;
        RETURN;
    END IF;
    
    IF p_new_status IS NULL OR p_new_status NOT IN ('pending', 'paid') THEN
        RETURN QUERY SELECT 0, 'Invalid status. Must be ''pending'' or ''paid'''::TEXT;
        RETURN;
    END IF;
    
    -- Update the collections
    BEGIN
        UPDATE collections
        SET collection_fee_status = p_new_status
        WHERE id = ANY(p_collection_ids)
          AND approved_for_payment = true
          AND status = 'Collected';
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        
        RETURN QUERY SELECT v_updated_count, ''::TEXT;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RETURN QUERY SELECT 0, v_error_message;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create a function to update all collections for a specific payment period
-- This ensures all collections in a paid period are marked as paid
CREATE OR REPLACE FUNCTION public.update_collections_for_payment_period(
    p_payment_id UUID
)
RETURNS TABLE(
    updated_count INTEGER,
    error_message TEXT
)
SECURITY DEFINER
AS $$
DECLARE
    v_updated_count INTEGER := 0;
    v_error_message TEXT := '';
    v_collector_id UUID;
    v_period_start DATE;
    v_period_end DATE;
BEGIN
    -- Get payment details
    SELECT collector_id, period_start, period_end
    INTO v_collector_id, v_period_start, v_period_end
    FROM collector_payments
    WHERE id = p_payment_id;
    
    -- Check if payment exists
    IF v_collector_id IS NULL THEN
        RETURN QUERY SELECT 0, 'Payment not found'::TEXT;
        RETURN;
    END IF;
    
    -- Update collections
    BEGIN
        UPDATE collections
        SET collection_fee_status = 'paid'
        WHERE staff_id = v_collector_id
          AND collection_date::DATE BETWEEN v_period_start AND v_period_end
          AND approved_for_payment = true
          AND status = 'Collected'
          AND collection_fee_status = 'pending';
        
        GET DIAGNOSTICS v_updated_count = ROW_COUNT;
        
        RETURN QUERY SELECT v_updated_count, ''::TEXT;
    EXCEPTION
        WHEN OTHERS THEN
            v_error_message := SQLERRM;
            RETURN QUERY SELECT 0, v_error_message;
    END;
END;
$$ LANGUAGE plpgsql;

-- Create a function to fix payment period inconsistencies
-- This will update payment records to match actual collection data
CREATE OR REPLACE FUNCTION public.fix_payment_period_inconsistencies(
    p_collector_id UUID
)
RETURNS TABLE(
    payment_id UUID,
    message TEXT
)
SECURITY DEFINER
AS $$
DECLARE
    v_payment_id UUID;
    v_period_start DATE;
    v_period_end DATE;
    v_total_collections INTEGER;
    v_total_liters NUMERIC(10,2);
    v_rate_per_liter NUMERIC(10,2);
    v_total_earnings NUMERIC(10,2);
    v_existing_payment_id UUID;
BEGIN
    -- Get actual collection data for this collector
    SELECT 
        MIN(c.collection_date::DATE),
        MAX(c.collection_date::DATE),
        COUNT(c.id)::INTEGER,
        COALESCE(SUM(c.liters), 0)::NUMERIC(10,2)
    INTO 
        v_period_start,
        v_period_end,
        v_total_collections,
        v_total_liters
    FROM collections c
    WHERE c.staff_id = p_collector_id
      AND c.approved_for_payment = true
      AND c.status = 'Collected'
      AND c.collection_fee_status = 'pending';
    
    -- Only proceed if there are pending collections
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
        
        -- Check if there's an existing pending payment for this collector
        SELECT id INTO v_existing_payment_id
        FROM collector_payments
        WHERE collector_id = p_collector_id
          AND status = 'pending';
        
        IF v_existing_payment_id IS NOT NULL THEN
            -- Update existing payment record
            UPDATE collector_payments
            SET 
                period_start = v_period_start,
                period_end = v_period_end,
                total_collections = v_total_collections,
                total_liters = v_total_liters,
                rate_per_liter = v_rate_per_liter,
                total_earnings = v_total_earnings,
                adjusted_earnings = GREATEST(0, v_total_earnings - COALESCE(total_penalties, 0))
            WHERE id = v_existing_payment_id;
            
            RETURN QUERY SELECT v_existing_payment_id, 'Updated existing payment record'::TEXT;
        ELSE
            -- Create new payment record
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
                p_collector_id,
                v_period_start,
                v_period_end,
                v_total_collections,
                v_total_liters,
                v_rate_per_liter,
                v_total_earnings,
                'pending'
            )
            RETURNING id INTO v_payment_id;
            
            RETURN QUERY SELECT v_payment_id, 'Created new payment record'::TEXT;
        END IF;
    ELSE
        RETURN QUERY SELECT NULL::UUID, 'No pending collections found for this collector'::TEXT;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Update specific collections to paid status:
-- SELECT * FROM public.manual_update_collection_fee_status(
--     ARRAY['collection-id-1'::UUID, 'collection-id-2'::UUID], 
--     'paid'
-- );

-- Update all collections for a specific payment period:
-- SELECT * FROM public.update_collections_for_payment_period('payment-id'::UUID);

-- Fix payment period inconsistencies for a specific collector:
-- SELECT * FROM public.fix_payment_period_inconsistencies('collector-id'::UUID);