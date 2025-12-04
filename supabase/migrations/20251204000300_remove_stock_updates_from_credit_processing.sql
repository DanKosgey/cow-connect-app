-- Migration: 20251204000300_remove_stock_updates_from_credit_processing.sql
-- Description: Remove stock updates from credit request processing since stock tracking is no longer needed
-- Estimated time: 30 seconds

BEGIN;

-- Update the process_agrovet_credit_request function to remove stock updates
CREATE OR REPLACE FUNCTION process_agrovet_credit_request(
    request_id UUID,
    staff_id UUID,
    action TEXT
) RETURNS VOID AS $$
DECLARE
    v_request agrovet_credit_requests%ROWTYPE;
    v_credit_profile farmer_credit_profiles%ROWTYPE;
    v_credit_transaction_id UUID;
    v_disbursement_id UUID;
BEGIN
    -- Get request details
    SELECT * INTO v_request 
    FROM public.agrovet_credit_requests 
    WHERE id = request_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credit request not found';
    END IF;

    -- Get credit profile
    SELECT * INTO v_credit_profile 
    FROM public.farmer_credit_profiles 
    WHERE farmer_id = v_request.farmer_id;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Farmer credit profile not found';
    END IF;

    -- Check if farmer is eligible for credit
    IF v_credit_profile.is_frozen THEN
        RAISE EXCEPTION 'Farmer credit account is frozen';
    END IF;

    -- If disbursing, process the credit transaction
    IF action = 'disbursed' THEN
        -- Verify available credit
        IF v_credit_profile.current_credit_balance < v_request.total_amount THEN
            RAISE EXCEPTION 'Insufficient credit available';
        END IF;

        -- Create credit transaction
        INSERT INTO public.credit_transactions (
            farmer_id,
            transaction_type,
            amount,
            balance_before,
            balance_after,
            product_id,
            product_name,
            quantity,
            unit_price,
            reference_id,
            description,
            approved_by
        ) VALUES (
            v_request.farmer_id,
            'credit_used',
            v_request.total_amount,
            v_credit_profile.current_credit_balance,
            v_credit_profile.current_credit_balance - v_request.total_amount,
            v_request.product_id,
            (SELECT name FROM public.agrovet_inventory WHERE id = v_request.product_id),
            v_request.quantity,
            v_request.unit_price,
            v_request.id,
            'Agrovet purchase on credit',
            staff_id
        ) RETURNING id INTO v_credit_transaction_id;

        -- Update credit profile
        UPDATE public.farmer_credit_profiles
        SET 
            current_credit_balance = current_credit_balance - v_request.total_amount,
            total_credit_used = total_credit_used + v_request.total_amount,
            pending_deductions = pending_deductions + v_request.total_amount,
            updated_at = NOW()
        WHERE id = v_credit_profile.id;

        -- Create disbursement record
        INSERT INTO public.agrovet_disbursements (
            credit_request_id,
            farmer_id,
            disbursed_by,
            total_amount,
            credit_used,
            net_payment,
            credit_transaction_id,
            due_date
        ) VALUES (
            v_request.id,
            v_request.farmer_id,
            staff_id,
            v_request.total_amount,
            v_request.total_amount,
            0, -- Full amount on credit
            v_credit_transaction_id,
            NOW() + INTERVAL '30 days'
        ) RETURNING id INTO v_disbursement_id;

        -- REMOVED: Stock update - stock tracking is no longer needed
    END IF;

    -- Update request status and reference
    UPDATE public.agrovet_credit_requests
    SET 
        status = action,
        processed_by = staff_id,
        processed_at = NOW(),
        credit_transaction_id = v_credit_transaction_id,
        updated_at = NOW()
    WHERE id = request_id;

    -- If rejected, add rejection note to credit profile
    IF action = 'rejected' THEN
        UPDATE public.farmer_credit_profiles
        SET 
            notes = COALESCE(notes, '') || format(E'\nAgrovet credit request %s rejected on %s', request_id, NOW()),
            updated_at = NOW()
        WHERE id = v_credit_profile.id;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the function was updated
SELECT proname, provolatile 
FROM pg_proc 
WHERE proname = 'process_agrovet_credit_request';

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Revert to the previous version of the function with stock updates
-- (You would need to restore the original function code here)

COMMIT;
*/