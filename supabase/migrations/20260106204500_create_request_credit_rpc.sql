-- Create a secure function to handle credit requests
-- This allows Farmers (and Creditors) to request credit without direct INSERT permissions on sensitivity tables (purchases, transactions).
-- The function runs with SECURITY DEFINER, meaning it uses the database owner's privileges to bypass RLS for these specific operations.

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
    v_transaction_id UUID;
    v_status TEXT;
    v_credit_limit NUMERIC;
    v_credit_used NUMERIC;
    v_unit_price NUMERIC;
    v_setting_value JSONB;
BEGIN
    -- 1. Check Credit Limit
    SELECT credit_limit, credit_used INTO v_credit_limit, v_credit_used
    FROM farmer_credit_profiles
    WHERE farmer_id = p_farmer_id;
    
    -- Initialize if null
    v_credit_limit := COALESCE(v_credit_limit, 0);
    v_credit_used := COALESCE(v_credit_used, 0);
    
    IF (v_credit_limit - v_credit_used) < p_total_amount THEN
        RAISE EXCEPTION 'Insufficient credit limit';
    END IF;

    -- 2. Check Auto-Approve Setting
    SELECT value INTO v_setting_value
    FROM system_settings
    WHERE key = 'credit_config';
    
    v_auto_approve := COALESCE((v_setting_value->>'auto_approve')::BOOLEAN, false);
    v_status := CASE WHEN v_auto_approve THEN 'approved' ELSE 'pending' END;

    -- Use provided unit price or fetch it
    IF p_unit_price IS NOT NULL THEN
        v_unit_price := p_unit_price;
    ELSE
        SELECT selling_price INTO v_unit_price
        FROM agrovet_inventory
        WHERE id = p_product_id;
    END IF;

    -- 3. Insert Credit Request
    INSERT INTO credit_requests (
        farmer_id, product_id, quantity, total_amount, status, request_date, 
        approved_at, approved_by, processed_at, packaging_option_id, product_name, unit_price
    )
    VALUES (
        p_farmer_id, p_product_id, p_quantity, p_total_amount, v_status, NOW(),
        CASE WHEN v_auto_approve THEN NOW() ELSE NULL END,
        NULL, -- approved_by is NULL for system
        CASE WHEN v_auto_approve THEN NOW() ELSE NULL END,
        p_packaging_option_id, p_product_name, v_unit_price
    )
    RETURNING id INTO v_request_id;

    -- 4. If Approved, Create Purchase and Transaction
    IF v_auto_approve THEN
        -- Create Purchase
        INSERT INTO agrovet_purchases (
            farmer_id, item_id, quantity, unit_price, total_amount, 
            payment_method, status, purchased_by
        )
        VALUES (
            p_farmer_id, p_product_id, p_quantity, COALESCE(v_unit_price, 0), p_total_amount,
            'credit', 'pending_collection', p_requested_by
        )
        RETURNING id INTO v_purchase_id;

        -- Create Transaction
        INSERT INTO credit_transactions (
             farmer_id, amount, transaction_type, reference_type, 
             reference_id, description, created_by
        )
        VALUES (
            p_farmer_id, p_total_amount, 'credit_used', 'agrovet_purchase',
            v_purchase_id, 'Credit purchase (Auto-approved)', p_requested_by
        )
        RETURNING id INTO v_transaction_id;
        
        -- Update purchase with transaction id reference
        UPDATE agrovet_purchases 
        SET credit_transaction_id = v_transaction_id 
        WHERE id = v_purchase_id;
        
        -- Update credit used in profile immediately (optional trigger usually handles this, but good for safety)
        UPDATE farmer_credit_profiles
        SET credit_used = v_credit_used + p_total_amount,
            last_updated = NOW()
        WHERE farmer_id = p_farmer_id;

    END IF;

    RETURN jsonb_build_object(
        'request_id', v_request_id,
        'status', v_status,
        'purchase_id', v_purchase_id,
        'auto_approved', v_auto_approve
    );
END;
$$;
