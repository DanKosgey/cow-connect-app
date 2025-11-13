-- Create agrovet staff table
CREATE TABLE IF NOT EXISTS public.agrovet_staff (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    phone_number TEXT,
    password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'agrovet_staff',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agrovet products table
CREATE TABLE IF NOT EXISTS public.agrovet_products (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    unit TEXT NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    stock_quantity INTEGER NOT NULL DEFAULT 0,
    min_stock_level INTEGER DEFAULT 10,
    category TEXT NOT NULL DEFAULT 'general',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit requests table integrated with existing credit system
CREATE TABLE IF NOT EXISTS public.agrovet_credit_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    farmer_id UUID REFERENCES public.farmers(id),
    product_id UUID REFERENCES public.agrovet_products(id),
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL,
    total_amount DECIMAL(10,2) NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'disbursed')),
    notes TEXT,
    request_date TIMESTAMPTZ DEFAULT NOW(),
    processed_by UUID REFERENCES public.agrovet_staff(id),
    processed_at TIMESTAMPTZ,
    credit_transaction_id UUID REFERENCES public.credit_transactions(id),
    credit_profile_id UUID REFERENCES public.farmer_credit_profiles(id),
    available_credit_at_request DECIMAL(10,2),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit disbursements table integrated with main credit system
CREATE TABLE IF NOT EXISTS public.agrovet_disbursements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    credit_request_id UUID REFERENCES public.agrovet_credit_requests(id),
    farmer_id UUID REFERENCES public.farmers(id),
    disbursed_by UUID REFERENCES public.agrovet_staff(id),
    disbursed_at TIMESTAMPTZ DEFAULT NOW(),
    total_amount DECIMAL(10,2) NOT NULL,
    credit_used DECIMAL(10,2) NOT NULL,
    net_payment DECIMAL(10,2) NOT NULL,
    credit_transaction_id UUID REFERENCES public.credit_transactions(id),
    due_date TIMESTAMPTZ NOT NULL,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    collection_payment_ids UUID[], -- References collection_payments for credit deduction
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_credit_requests_farmer_id ON public.agrovet_credit_requests(farmer_id);
CREATE INDEX IF NOT EXISTS idx_credit_requests_status ON public.agrovet_credit_requests(status);
CREATE INDEX IF NOT EXISTS idx_credit_requests_credit_transaction ON public.agrovet_credit_requests(credit_transaction_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_farmer_id ON public.agrovet_disbursements(farmer_id);
CREATE INDEX IF NOT EXISTS idx_disbursements_status ON public.agrovet_disbursements(status);
CREATE INDEX IF NOT EXISTS idx_disbursements_credit_transaction ON public.agrovet_disbursements(credit_transaction_id);
CREATE INDEX IF NOT EXISTS idx_agrovet_products_category ON public.agrovet_products(category);
CREATE INDEX IF NOT EXISTS idx_agrovet_products_active ON public.agrovet_products(is_active);

-- Add RLS policies
ALTER TABLE public.agrovet_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrovet_products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrovet_credit_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrovet_disbursements ENABLE ROW LEVEL SECURITY;

-- Create policies for agrovet staff
CREATE POLICY "Agrovet staff can view all products" ON public.agrovet_products
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT id FROM public.agrovet_staff) OR auth.uid() IN (SELECT id FROM public.farmers));

CREATE POLICY "Agrovet staff can manage products" ON public.agrovet_products
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM public.agrovet_staff));

CREATE POLICY "Agrovet staff can view all credit requests" ON public.agrovet_credit_requests
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT id FROM public.agrovet_staff));

CREATE POLICY "Agrovet staff can manage credit requests" ON public.agrovet_credit_requests
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM public.agrovet_staff));

CREATE POLICY "Agrovet staff can manage disbursements" ON public.agrovet_disbursements
    FOR ALL TO authenticated
    USING (auth.uid() IN (SELECT id FROM public.agrovet_staff));

-- Create policies for farmers
CREATE POLICY "Farmers can view their own credit requests" ON public.agrovet_credit_requests
    FOR SELECT TO authenticated
    USING (farmer_id = auth.uid());

CREATE POLICY "Farmers can insert credit requests" ON public.agrovet_credit_requests
    FOR INSERT TO authenticated
    WITH CHECK (farmer_id = auth.uid());

CREATE POLICY "Farmers can view their own disbursements" ON public.agrovet_disbursements
    FOR SELECT TO authenticated
    USING (farmer_id = auth.uid());

-- Add policies for existing credit tables
CREATE POLICY "Agrovet staff can view credit transactions" ON public.credit_transactions
    FOR SELECT TO authenticated
    USING (auth.uid() IN (SELECT id FROM public.agrovet_staff));

-- Create helper functions
CREATE OR REPLACE FUNCTION get_farmer_credit_status(farmer_id UUID)
RETURNS TABLE (
    available_credit DECIMAL(10,2),
    credit_limit DECIMAL(10,2),
    pending_credit DECIMAL(10,2),
    total_outstanding DECIMAL(10,2),
    is_eligible BOOLEAN
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        cp.current_credit_balance,
        cp.max_credit_amount,
        cp.pending_deductions,
        (
            SELECT COALESCE(SUM(d.total_amount), 0)
            FROM public.agrovet_disbursements d
            WHERE d.farmer_id = farmer_id
            AND d.status = 'pending'
        ),
        NOT cp.is_frozen AND cp.current_credit_balance > 0
    FROM public.farmer_credit_profiles cp
    WHERE cp.farmer_id = farmer_id;
END;
$$ LANGUAGE plpgsql;

-- Create stored procedures for integrated credit system
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
            (SELECT name FROM public.agrovet_products WHERE id = v_request.product_id),
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

        -- Update product stock
        UPDATE public.agrovet_products
        SET 
            stock_quantity = stock_quantity - v_request.quantity,
            updated_at = NOW()
        WHERE id = v_request.product_id;
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