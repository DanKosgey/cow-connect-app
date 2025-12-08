-- Migration: Fix monthly settlement to preserve pending deductions
-- Description: The current monthly settlement incorrectly resets pending_deductions to 0, 
-- but it should preserve active credit transactions that haven't been paid yet.

BEGIN;

-- Create a corrected function for monthly settlement that preserves pending deductions
CREATE OR REPLACE FUNCTION public.corrected_perform_monthly_settlement(farmer_id UUID, settled_by UUID DEFAULT NULL)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
DECLARE
    v_profile RECORD;
    v_staff_id UUID;
    v_pending_deductions DECIMAL(10,2);
BEGIN
    -- Get farmer's credit profile
    SELECT * INTO v_profile
    FROM public.farmer_credit_profiles
    WHERE farmer_id = farmer_id;
    
    IF NOT FOUND THEN
        RAISE EXCEPTION 'Credit profile not found for farmer %', farmer_id;
    END IF;
    
    -- Calculate pending deductions from active transactions (preserve existing logic)
    SELECT COALESCE(SUM(amount), 0) INTO v_pending_deductions
    FROM public.credit_transactions
    WHERE farmer_id = farmer_id
    AND status = 'active';
    
    -- Reset credit balance for next period but PRESERVE pending deductions
    UPDATE public.farmer_credit_profiles
    SET 
        current_credit_balance = max_credit_amount,
        pending_deductions = v_pending_deductions,  -- Preserve calculated pending deductions
        last_settlement_date = CURRENT_DATE,
        updated_at = NOW()
    WHERE id = v_profile.id;
    
    -- Convert user ID to staff ID if provided
    IF settled_by IS NOT NULL THEN
        SELECT id INTO v_staff_id
        FROM public.staff
        WHERE user_id = settled_by
        LIMIT 1;
        
        -- If no staff record found, v_staff_id will be NULL (acceptable for admins)
    END IF;
    
    -- Create settlement transaction with correct pending deductions amount
    INSERT INTO public.credit_transactions (
        farmer_id,
        transaction_type,
        amount,
        balance_before,
        balance_after,
        description,
        approved_by,
        approval_status
    ) VALUES (
        farmer_id,
        'settlement',
        v_pending_deductions,  -- Use the calculated pending deductions
        v_profile.current_credit_balance,
        v_profile.max_credit_amount,
        'Monthly settlement completed. KES ' || v_pending_deductions || ' pending for deduction from future payments.',
        v_staff_id,
        'approved'
    );
    
    RETURN TRUE;
EXCEPTION
    WHEN OTHERS THEN
        RAISE;
END;
$$;

-- Update the existing monthly settlement function to use the corrected logic
CREATE OR REPLACE FUNCTION public.perform_monthly_settlement(farmer_id UUID, settled_by UUID DEFAULT NULL)
RETURNS BOOLEAN
SECURITY DEFINER
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN public.corrected_perform_monthly_settlement(farmer_id, settled_by);
END;
$$;

COMMIT;