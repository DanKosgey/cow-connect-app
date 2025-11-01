-- Migration: 20251031000100_create_credit_system_tables.sql
-- Description: Create credit system tables for farmer credit against produce and agrovet purchases

BEGIN;

-- Create farmer_credit_limits table
CREATE TABLE IF NOT EXISTS public.farmer_credit_limits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    credit_limit_percentage DECIMAL(5,2) NOT NULL DEFAULT 70.00, -- Default 70% of pending payments
    max_credit_amount DECIMAL(10,2) DEFAULT 100000.00, -- Maximum credit cap per farmer
    current_credit_balance DECIMAL(10,2) DEFAULT 0.00, -- Current available credit
    total_credit_used DECIMAL(10,2) DEFAULT 0.00, -- Total credit used historically
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create farmer_credit_transactions table
CREATE TABLE IF NOT EXISTS public.farmer_credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_granted', 'credit_used', 'credit_repaid', 'credit_adjusted')),
    amount DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    reference_type TEXT, -- 'collection', 'payment', 'purchase', etc.
    reference_id UUID, -- ID of the related record
    description TEXT,
    created_by UUID REFERENCES public.staff(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agrovet_inventory table (extends existing inventory_items)
CREATE TABLE IF NOT EXISTS public.agrovet_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
    supplier VARCHAR(255),
    cost_price DECIMAL(10,2), -- Cost to the company
    selling_price DECIMAL(10,2), -- Price to farmers (can be 0 for credit purchases)
    is_credit_eligible BOOLEAN DEFAULT true, -- Whether this item can be purchased on credit
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agrovet_purchases table
CREATE TABLE IF NOT EXISTS public.agrovet_purchases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    item_id UUID NOT NULL REFERENCES public.agrovet_inventory(id) ON DELETE CASCADE,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(10,2) NOT NULL, -- Price at time of purchase
    total_amount DECIMAL(10,2) NOT NULL, -- quantity * unit_price
    payment_method TEXT CHECK (payment_method IN ('cash', 'credit')), -- How the purchase was paid
    credit_transaction_id UUID REFERENCES public.farmer_credit_transactions(id), -- Link to credit transaction if paid with credit
    status TEXT DEFAULT 'completed' CHECK (status IN ('pending', 'completed', 'cancelled')),
    purchased_by UUID REFERENCES public.staff(id), -- Staff who processed the purchase
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_farmer_credit_limits_farmer_id ON public.farmer_credit_limits(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_credit_limits_active ON public.farmer_credit_limits(is_active);
CREATE INDEX IF NOT EXISTS idx_farmer_credit_transactions_farmer_id ON public.farmer_credit_transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_credit_transactions_type ON public.farmer_credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_farmer_credit_transactions_created_at ON public.farmer_credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_agrovet_inventory_category ON public.agrovet_inventory(category);
CREATE INDEX IF NOT EXISTS idx_agrovet_inventory_credit_eligible ON public.agrovet_inventory(is_credit_eligible);
CREATE INDEX IF NOT EXISTS idx_agrovet_purchases_farmer_id ON public.agrovet_purchases(farmer_id);
CREATE INDEX IF NOT EXISTS idx_agrovet_purchases_item_id ON public.agrovet_purchases(item_id);
CREATE INDEX IF NOT EXISTS idx_agrovet_purchases_payment_method ON public.agrovet_purchases(payment_method);
CREATE INDEX IF NOT EXISTS idx_agrovet_purchases_status ON public.agrovet_purchases(status);

-- Enable RLS
ALTER TABLE public.farmer_credit_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.farmer_credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrovet_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrovet_purchases ENABLE ROW LEVEL SECURITY;

-- RLS policies for farmer_credit_limits
DO $$ 
BEGIN
  -- Farmers can view their own credit limits
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Farmers can view their own credit limits' 
    AND pc.relname = 'farmer_credit_limits'
  ) THEN
    CREATE POLICY "Farmers can view their own credit limits" 
      ON public.farmer_credit_limits FOR SELECT 
      USING (
        farmer_id IN (
          SELECT f.id FROM public.farmers f 
          WHERE f.user_id = auth.uid()
        )
      );
  END IF;

  -- Admins and staff can view all credit limits
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins and staff can view all credit limits' 
    AND pc.relname = 'farmer_credit_limits'
  ) THEN
    CREATE POLICY "Admins and staff can view all credit limits" 
      ON public.farmer_credit_limits FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Only admins can insert/update credit limits
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can manage credit limits' 
    AND pc.relname = 'farmer_credit_limits'
  ) THEN
    CREATE POLICY "Admins can manage credit limits" 
      ON public.farmer_credit_limits FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS policies for farmer_credit_transactions
DO $$ 
BEGIN
  -- Farmers can view their own credit transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Farmers can view their own credit transactions' 
    AND pc.relname = 'farmer_credit_transactions'
  ) THEN
    CREATE POLICY "Farmers can view their own credit transactions" 
      ON public.farmer_credit_transactions FOR SELECT 
      USING (
        farmer_id IN (
          SELECT f.id FROM public.farmers f 
          WHERE f.user_id = auth.uid()
        )
      );
  END IF;

  -- Admins and staff can view all credit transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins and staff can view all credit transactions' 
    AND pc.relname = 'farmer_credit_transactions'
  ) THEN
    CREATE POLICY "Admins and staff can view all credit transactions" 
      ON public.farmer_credit_transactions FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Only admins can insert/update credit transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can manage credit transactions' 
    AND pc.relname = 'farmer_credit_transactions'
  ) THEN
    CREATE POLICY "Admins can manage credit transactions" 
      ON public.farmer_credit_transactions FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS policies for agrovet_inventory
DO $$ 
BEGIN
  -- All authenticated users can view inventory
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Authenticated users can view agrovet inventory' 
    AND pc.relname = 'agrovet_inventory'
  ) THEN
    CREATE POLICY "Authenticated users can view agrovet inventory" 
      ON public.agrovet_inventory FOR SELECT 
      TO authenticated 
      USING (true);
  END IF;

  -- Only admins can manage inventory
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can manage agrovet inventory' 
    AND pc.relname = 'agrovet_inventory'
  ) THEN
    CREATE POLICY "Admins can manage agrovet inventory" 
      ON public.agrovet_inventory FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS policies for agrovet_purchases
DO $$ 
BEGIN
  -- Farmers can view their own purchases
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Farmers can view their own agrovet purchases' 
    AND pc.relname = 'agrovet_purchases'
  ) THEN
    CREATE POLICY "Farmers can view their own agrovet purchases" 
      ON public.agrovet_purchases FOR SELECT 
      USING (
        farmer_id IN (
          SELECT f.id FROM public.farmers f 
          WHERE f.user_id = auth.uid()
        )
      );
  END IF;

  -- Admins and staff can view all purchases
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins and staff can view all agrovet purchases' 
    AND pc.relname = 'agrovet_purchases'
  ) THEN
    CREATE POLICY "Admins and staff can view all agrovet purchases" 
      ON public.agrovet_purchases FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Only admins and staff can create purchases
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Staff can create agrovet purchases' 
    AND pc.relname = 'agrovet_purchases'
  ) THEN
    CREATE POLICY "Staff can create agrovet purchases" 
      ON public.agrovet_purchases FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Only admins can update purchases
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can update agrovet purchases' 
    AND pc.relname = 'agrovet_purchases'
  ) THEN
    CREATE POLICY "Admins can update agrovet purchases" 
      ON public.agrovet_purchases FOR UPDATE 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_farmer_credit_limits_updated_at ON public.farmer_credit_limits;
CREATE TRIGGER update_farmer_credit_limits_updated_at
  BEFORE UPDATE ON public.farmer_credit_limits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agrovet_inventory_updated_at ON public.agrovet_inventory;
CREATE TRIGGER update_agrovet_inventory_updated_at
  BEFORE UPDATE ON public.agrovet_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.farmer_credit_limits TO authenticated;
GRANT ALL ON public.farmer_credit_transactions TO authenticated;
GRANT ALL ON public.agrovet_inventory TO authenticated;
GRANT ALL ON public.agrovet_purchases TO authenticated;

COMMIT;