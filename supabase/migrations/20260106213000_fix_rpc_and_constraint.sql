-- Migration: Ultimate Fix for Credit System (Revision 3)
-- Description: Fixes status constraints, adds missing columns, and installs the secure RPC function for auto-approvals.
-- Fixes RPC: Adds mandatory balance_before and balance_after to credit_transactions.
-- Date: 2026-01-06

BEGIN;

-- 1. Fix Status Constraint on agrovet_purchases
ALTER TABLE public.agrovet_purchases 
DROP CONSTRAINT IF EXISTS agrovet_purchases_status_check;

ALTER TABLE public.agrovet_purchases 
ADD CONSTRAINT agrovet_purchases_status_check 
CHECK (status IN ('pending', 'completed', 'cancelled', 'pending_collection'));


-- 2. Ensure packaging_option_id exists
ALTER TABLE public.credit_requests 
ADD COLUMN IF NOT EXISTS packaging_option_id UUID REFERENCES public.product_packaging(id) ON DELETE SET NULL;


-- 3. Update secure RPC function
CREATE OR REPLACE FUNCTION request_credit_transaction(
    p_farmer_id UUID,
    p_product_id UUID,
    p_quantity NUMERIC,
    p_total_amount NUMERIC,
    p_requested_by UUID,
    p_packaging_option_id UUID DEFAULT NULL,
    p_product_name TEXT DEFAULT NULL,
    p_unit_price NUMERIC DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_auto_approve BOOLEAN;
    v_request_id UUID;
    v_purchase_id UUID;
    v_unit_price NUMERIC;
    v_current_balance NUMERIC;
    v_setting_value JSONB;
BEGIN
    -- Check Balance
    SELECT current_credit_balance INTO v_current_balance
    FROM farmer_credit_profiles
    WHERE farmer_id = p_farmer_id;
    
    -- Handle null balance
    v_current_balance := COALESCE(v_current_balance, 0);
    
    IF v_current_balance < p_total_amount THEN
        RAISE EXCEPTION 'Insufficient credit balance. Available: %', v_current_balance;
    END IF;

    -- Check Auto-Approve
    SELECT value INTO v_setting_value FROM system_settings WHERE key = 'credit_config';
    v_auto_approve := COALESCE((v_setting_value->>'auto_approve')::BOOLEAN, false);

    -- Get Unit Price
    IF p_unit_price IS NOT NULL THEN
        v_unit_price := p_unit_price;
    ELSE
        SELECT selling_price INTO v_unit_price FROM agrovet_inventory WHERE id = p_product_id;
    END IF;

    -- Insert Request
    INSERT INTO credit_requests (
        farmer_id, product_id, quantity, total_amount, status, 
        approved_at, approved_by, packaging_option_id, product_name, unit_price
    )
    VALUES (
        p_farmer_id, p_product_id, p_quantity, p_total_amount, 
        CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END, 
        CASE WHEN v_auto_approve THEN NOW() ELSE NULL END, NULL, 
        p_packaging_option_id, p_product_name, v_unit_price
    )
    RETURNING id INTO v_request_id;

    -- If Approved, Create Purchase & Transact
    IF v_auto_approve THEN
        INSERT INTO agrovet_purchases (
            farmer_id, item_id, quantity, unit_price, total_amount, 
            payment_method, status, purchased_by
        )
        VALUES (
            p_farmer_id, p_product_id, p_quantity, COALESCE(v_unit_price, 0), p_total_amount,
            'credit', 'pending_collection', NULL
        )
        RETURNING id INTO v_purchase_id;

        INSERT INTO credit_transactions (
             farmer_id, amount, transaction_type, reference_type, 
             reference_id, description, approved_by,
             balance_before, balance_after
        )
        VALUES (
            p_farmer_id, p_total_amount, 'credit_used', 'agrovet_purchase',
            v_purchase_id, 'Credit purchase (Auto-approved)', NULL,
            v_current_balance, v_current_balance - p_total_amount
        );
        
        -- Update Balance
        UPDATE farmer_credit_profiles
        SET current_credit_balance = current_credit_balance - p_total_amount,
            total_credit_used = total_credit_used + p_total_amount,
            updated_at = NOW()
        WHERE farmer_id = p_farmer_id;
    END IF;

    RETURN jsonb_build_object('request_id', v_request_id, 'status', CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END, 'auto_approved', v_auto_approve);
END;
$$;

COMMIT;
