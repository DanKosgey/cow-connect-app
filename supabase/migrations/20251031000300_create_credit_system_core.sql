-- Migration: Create core credit system tables
-- Description: Essential tables for credit against produce system

BEGIN;

-- Create farmer_credit_profiles table
CREATE TABLE IF NOT EXISTS public.farmer_credit_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    credit_tier TEXT DEFAULT 'new' CHECK (credit_tier IN ('new', 'established', 'premium')),
    credit_limit_percentage DECIMAL(5,2) NOT NULL DEFAULT 30.00,
    max_credit_amount DECIMAL(10,2) DEFAULT 100000.00,
    current_credit_balance DECIMAL(10,2) DEFAULT 0.00,
    total_credit_used DECIMAL(10,2) DEFAULT 0.00,
    pending_deductions DECIMAL(10,2) DEFAULT 0.00,
    last_settlement_date DATE,
    next_settlement_date DATE,
    is_frozen BOOLEAN DEFAULT false,
    freeze_reason TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS public.credit_transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('credit_granted', 'credit_used', 'credit_repaid', 'credit_adjusted', 'settlement')),
    amount DECIMAL(10,2) NOT NULL,
    balance_before DECIMAL(10,2) NOT NULL,
    balance_after DECIMAL(10,2) NOT NULL,
    product_id UUID REFERENCES public.agrovet_inventory(id),
    product_name TEXT,
    quantity DECIMAL(10,2),
    unit_price DECIMAL(10,2),
    reference_id UUID,
    description TEXT,
    approved_by UUID REFERENCES public.staff(id),
    approval_status TEXT DEFAULT 'approved' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create agrovet_inventory table
CREATE TABLE IF NOT EXISTS public.agrovet_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    description TEXT,
    category VARCHAR(100) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    current_stock DECIMAL(10,2) NOT NULL DEFAULT 0,
    reorder_level DECIMAL(10,2) NOT NULL DEFAULT 0,
    supplier VARCHAR(255),
    cost_price DECIMAL(10,2),
    selling_price DECIMAL(10,2),
    is_credit_eligible BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_farmer_credit_profiles_farmer_id ON public.farmer_credit_profiles(farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmer_credit_profiles_tier ON public.farmer_credit_profiles(credit_tier);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_farmer_id ON public.credit_transactions(farmer_id);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_type ON public.credit_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_credit_transactions_created_at ON public.credit_transactions(created_at);
CREATE INDEX IF NOT EXISTS idx_agrovet_inventory_category ON public.agrovet_inventory(category);
CREATE INDEX IF NOT EXISTS idx_agrovet_inventory_sku ON public.agrovet_inventory(sku);

-- Enable RLS
ALTER TABLE public.farmer_credit_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.agrovet_inventory ENABLE ROW LEVEL SECURITY;

-- RLS policies for farmer_credit_profiles
DO $$ 
BEGIN
  -- Farmers can view their own credit profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Farmers can view their own credit profile' 
    AND pc.relname = 'farmer_credit_profiles'
  ) THEN
    CREATE POLICY "Farmers can view their own credit profile" 
      ON public.farmer_credit_profiles FOR SELECT 
      USING (
        farmer_id IN (
          SELECT f.id FROM public.farmers f 
          WHERE f.user_id = auth.uid()
        )
      );
  END IF;

  -- Admins and staff can view all credit profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins and staff can view all credit profiles' 
    AND pc.relname = 'farmer_credit_profiles'
  ) THEN
    CREATE POLICY "Admins and staff can view all credit profiles" 
      ON public.farmer_credit_profiles FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Only admins can insert/update credit profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can manage credit profiles' 
    AND pc.relname = 'farmer_credit_profiles'
  ) THEN
    CREATE POLICY "Admins can manage credit profiles" 
      ON public.farmer_credit_profiles FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS policies for credit_transactions
DO $$ 
BEGIN
  -- Farmers can view their own credit transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Farmers can view their own credit transactions' 
    AND pc.relname = 'credit_transactions'
  ) THEN
    CREATE POLICY "Farmers can view their own credit transactions" 
      ON public.credit_transactions FOR SELECT 
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
    AND pc.relname = 'credit_transactions'
  ) THEN
    CREATE POLICY "Admins and staff can view all credit transactions" 
      ON public.credit_transactions FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Only authorized users can insert credit transactions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Authorized users can create credit transactions' 
    AND pc.relname = 'credit_transactions'
  ) THEN
    CREATE POLICY "Authorized users can create credit transactions" 
      ON public.credit_transactions FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
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

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_farmer_credit_profiles_updated_at ON public.farmer_credit_profiles;
CREATE TRIGGER update_farmer_credit_profiles_updated_at
  BEFORE UPDATE ON public.farmer_credit_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_agrovet_inventory_updated_at ON public.agrovet_inventory;
CREATE TRIGGER update_agrovet_inventory_updated_at
  BEFORE UPDATE ON public.agrovet_inventory
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.farmer_credit_profiles TO authenticated;
GRANT ALL ON public.credit_transactions TO authenticated;
GRANT ALL ON public.agrovet_inventory TO authenticated;

COMMIT;