-- CREDITOR ROLE RLS POLICIES
-- This script defines RLS policies for the creditor role across all relevant tables

BEGIN;

-- PROFILES TABLE
-- Creditors can view and edit their own profile
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Creditors can update their own profile" ON public.profiles;

CREATE POLICY "Creditors can read their own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated
  USING (id IN (
    SELECT ags.user_id FROM public.agrovet_staff ags 
    WHERE ags.user_id = auth.uid()
  ));

CREATE POLICY "Creditors can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING (id IN (
    SELECT ags.user_id FROM public.agrovet_staff ags 
    WHERE ags.user_id = auth.uid()
  ));

-- AGROVET STAFF TABLE
-- Creditors can view and edit their own agrovet staff record
ALTER TABLE IF EXISTS public.agrovet_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can read their own agrovet staff record" ON public.agrovet_staff;
DROP POLICY IF EXISTS "Creditors can update their own agrovet staff record" ON public.agrovet_staff;

CREATE POLICY "Creditors can read their own agrovet staff record" 
  ON public.agrovet_staff FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Creditors can update their own agrovet staff record" 
  ON public.agrovet_staff FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid());

-- AGROVET INVENTORY TABLE
-- Creditors can manage agrovet inventory
ALTER TABLE IF EXISTS public.agrovet_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can manage agrovet inventory" ON public.agrovet_inventory;

CREATE POLICY "Creditors can manage agrovet inventory" 
  ON public.agrovet_inventory FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- AGROVET PRODUCTS TABLE
-- Creditors can manage agrovet products
ALTER TABLE IF EXISTS public.agrovet_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can manage agrovet products" ON public.agrovet_products;

CREATE POLICY "Creditors can manage agrovet products" 
  ON public.agrovet_products FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- AGROVET PURCHASES TABLE
-- Creditors can manage agrovet purchases
ALTER TABLE IF EXISTS public.agrovet_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can manage agrovet purchases" ON public.agrovet_purchases;

CREATE POLICY "Creditors can manage agrovet purchases" 
  ON public.agrovet_purchases FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- AGROVET CREDIT REQUESTS TABLE
-- Creditors can process credit requests
ALTER TABLE IF EXISTS public.agrovet_credit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can process credit requests" ON public.agrovet_credit_requests;

CREATE POLICY "Creditors can process credit requests" 
  ON public.agrovet_credit_requests FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- AGROVET DISBURSEMENTS TABLE
-- Creditors can manage disbursements
ALTER TABLE IF EXISTS public.agrovet_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can manage disbursements" ON public.agrovet_disbursements;

CREATE POLICY "Creditors can manage disbursements" 
  ON public.agrovet_disbursements FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- FARMERS TABLE
-- Creditors can view farmers for credit assessment
ALTER TABLE IF EXISTS public.farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can read farmers for credit assessment" ON public.farmers;

CREATE POLICY "Creditors can read farmers for credit assessment" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- FARMER CREDIT PROFILES TABLE
-- Creditors can view and manage farmer credit profiles
ALTER TABLE IF EXISTS public.farmer_credit_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can manage farmer credit profiles" ON public.farmer_credit_profiles;

CREATE POLICY "Creditors can manage farmer credit profiles" 
  ON public.farmer_credit_profiles FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- FARMER CREDIT LIMITS TABLE
-- Creditors can view and manage farmer credit limits
ALTER TABLE IF EXISTS public.farmer_credit_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can manage farmer credit limits" ON public.farmer_credit_limits;

CREATE POLICY "Creditors can manage farmer credit limits" 
  ON public.farmer_credit_limits FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- FARMER CREDIT TRANSACTIONS TABLE
-- Creditors can view and manage farmer credit transactions
ALTER TABLE IF EXISTS public.farmer_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can manage farmer credit transactions" ON public.farmer_credit_transactions;

CREATE POLICY "Creditors can manage farmer credit transactions" 
  ON public.farmer_credit_transactions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- CREDIT REQUESTS TABLE
-- Creditors can process credit requests
ALTER TABLE IF EXISTS public.credit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can process credit requests" ON public.credit_requests;

CREATE POLICY "Creditors can process credit requests" 
  ON public.credit_requests FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- CREDIT TRANSACTIONS TABLE
-- Creditors can manage credit transactions
ALTER TABLE IF EXISTS public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can manage credit transactions" ON public.credit_transactions;

CREATE POLICY "Creditors can manage credit transactions" 
  ON public.credit_transactions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- PAYMENT STATEMENTS TABLE
-- Creditors can view payment statements for accounting
ALTER TABLE IF EXISTS public.payment_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can read payment statements for accounting" ON public.payment_statements;

CREATE POLICY "Creditors can read payment statements for accounting" 
  ON public.payment_statements FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- INVENTORY ITEMS TABLE
-- Creditors can manage inventory items
ALTER TABLE IF EXISTS public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can manage inventory items" ON public.inventory_items;

CREATE POLICY "Creditors can manage inventory items" 
  ON public.inventory_items FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- INVENTORY TRANSACTIONS TABLE
-- Creditors can manage inventory transactions
ALTER TABLE IF EXISTS public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can manage inventory transactions" ON public.inventory_transactions;

CREATE POLICY "Creditors can manage inventory transactions" 
  ON public.inventory_transactions FOR ALL
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

-- MARKET PRICES TABLE
-- Creditors can view market prices
ALTER TABLE IF EXISTS public.market_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Creditors can read market prices" ON public.market_prices;

CREATE POLICY "Creditors can read market prices" 
  ON public.market_prices FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'creditor' AND ur.active = true
  ));

COMMIT;