-- Migration: 20251202001_fix_mark_as_paid_date_filtering.sql
-- Description: Fix date filtering issue in the markPaymentAsPaid function by creating a more robust update function

BEGIN;

-- Create a more robust function to mark payments as paid
-- This function properly handles date comparisons and ensures all collections are updated
CREATE OR REPLACE FUNCTION public.robust_mark_payment_as_paid(p_payment_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_collector_id UUID;
    v_period_start DATE;
    v_period_end DATE;
    v_updated_count INTEGER;
BEGIN
    -- Get payment details
    SELECT collector_id, period_start, period_end
    INTO v_collector_id, v_period_start, v_period_end
    FROM collector_payments
    WHERE id = p_payment_id;
    
    -- Check if payment exists
    IF v_collector_id IS NULL THEN
        RAISE WARNING 'Payment not found: %', p_payment_id;
        RETURN FALSE;
    END IF;
    
    -- Update the payment status
    UPDATE collector_payments
    SET 
        status = 'paid',
        payment_date = NOW()
    WHERE id = p_payment_id;
    
    -- Update collections with proper date handling
    -- Convert dates to ensure proper comparison
    UPDATE collections
    SET collection_fee_status = 'paid'
    WHERE staff_id = v_collector_id
      AND collection_date::DATE >= v_period_start
      AND collection_date::DATE <= v_period_end
      AND approved_for_payment = true
      AND collection_fee_status = 'pending';
    
    -- Get the count of updated collections for logging
    GET DIAGNOSTICS v_updated_count = ROW_COUNT;
    
    RAISE NOTICE 'Marked payment % as paid. Updated % collections.', p_payment_id, v_updated_count;
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE WARNING 'Error in robust_mark_payment_as_paid: %', SQLERRM;
        RETURN FALSE;
END;
$$;

-- Create a function to fix existing payment records with incorrect date formats
CREATE OR REPLACE FUNCTION public.fix_payment_date_formats()
RETURNS TABLE(
    payment_id UUID,
    message TEXT
)
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    -- This function ensures all payment periods are stored as proper dates without time components
    RETURN QUERY
    UPDATE collector_payments
    SET 
        period_start = period_start::DATE,
        period_end = period_end::DATE
    WHERE period_start != period_start::DATE
       OR period_end != period_end::DATE
    RETURNING id, 'Fixed date format'::TEXT;
END;
$$;

COMMIT;

-- ============================================
-- USAGE EXAMPLES
-- ============================================

-- Use the robust function to mark a payment as paid:
-- SELECT public.robust_mark_payment_as_paid('your-payment-id'::UUID);

-- Fix payment date formats:
-- SELECT * FROM public.fix_payment_date_formats();