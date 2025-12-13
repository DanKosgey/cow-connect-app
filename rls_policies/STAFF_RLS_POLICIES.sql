-- STAFF ROLE RLS POLICIES
-- This script defines RLS policies for the staff role across all relevant tables

BEGIN;

-- PROFILES TABLE
-- Staff can view and edit their own profile
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Staff can update their own profile" ON public.profiles;

CREATE POLICY "Staff can read their own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated
  USING (id IN (
    SELECT s.user_id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Staff can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING (id IN (
    SELECT s.user_id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ));

-- STAFF TABLE
-- Staff can view and edit their own staff record
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read their own record" ON public.staff;
DROP POLICY IF EXISTS "Staff can update their own record" ON public.staff;

CREATE POLICY "Staff can read their own record" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Staff can update their own record" 
  ON public.staff FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid());

-- FARMERS TABLE
-- Staff can view farmers they work with
ALTER TABLE IF EXISTS public.farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read farmers they work with" ON public.farmers;

CREATE POLICY "Staff can read farmers they work with" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- COLLECTIONS TABLE
-- Staff can view collections they've recorded
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read collections they've recorded" ON public.collections;

CREATE POLICY "Staff can read collections they've recorded" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (staff_id IN (
    SELECT s.id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- MILK QUALITY PARAMETERS TABLE
-- Staff can view quality parameters for collections they've recorded
ALTER TABLE IF EXISTS public.milk_quality_parameters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read quality params for collections they've recorded" ON public.milk_quality_parameters;

CREATE POLICY "Staff can read quality params for collections they've recorded" 
  ON public.milk_quality_parameters FOR SELECT 
  TO authenticated
  USING (collection_id IN (
    SELECT c.id FROM public.collections c
    JOIN public.staff s ON c.staff_id = s.id
    WHERE s.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- KYC DOCUMENTS TABLE
-- Staff can view KYC documents for farmers they work with
ALTER TABLE IF EXISTS public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read kyc documents for farmers they work with" ON public.kyc_documents;

CREATE POLICY "Staff can read kyc documents for farmers they work with" 
  ON public.kyc_documents FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- FARMER ANALYTICS TABLE
-- Staff can view analytics for farmers they work with
ALTER TABLE IF EXISTS public.farmer_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read analytics for farmers they work with" ON public.farmer_analytics;

CREATE POLICY "Staff can read analytics for farmers they work with" 
  ON public.farmer_analytics FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- PAYMENTS TABLE
-- Staff can view payments for farmers they work with
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read payments for farmers they work with" ON public.payments;

CREATE POLICY "Staff can read payments for farmers they work with" 
  ON public.payments FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- COLLECTION PAYMENTS TABLE
-- Staff can view payment details for collections they've recorded
ALTER TABLE IF EXISTS public.collection_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read payment details for collections they've recorded" ON public.collection_payments;

CREATE POLICY "Staff can read payment details for collections they've recorded" 
  ON public.collection_payments FOR SELECT 
  TO authenticated
  USING (collection_id IN (
    SELECT c.id FROM public.collections c
    JOIN public.staff s ON c.staff_id = s.id
    WHERE s.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- NOTIFICATIONS TABLE
-- Staff can view notifications addressed to them
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read notifications addressed to them" ON public.notifications;

CREATE POLICY "Staff can read notifications addressed to them" 
  ON public.notifications FOR SELECT 
  TO authenticated
  USING (user_id IN (
    SELECT s.user_id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ));

-- PENDING FARMERS TABLE
-- Staff can view pending farmers in their region
ALTER TABLE IF EXISTS public.pending_farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read pending farmers" ON public.pending_farmers;

CREATE POLICY "Staff can read pending farmers" 
  ON public.pending_farmers FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- FARMER APPROVAL HISTORY TABLE
-- Staff can view approval history for farmers they work with
ALTER TABLE IF EXISTS public.farmer_approval_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read approval history for farmers they work with" ON public.farmer_approval_history;

CREATE POLICY "Staff can read approval history for farmers they work with" 
  ON public.farmer_approval_history FOR SELECT 
  TO authenticated
  USING (pending_farmer_id IN (
    SELECT pf.id FROM public.pending_farmers pf
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- FARMER NOTIFICATIONS TABLE
-- Staff can view notifications they've sent
ALTER TABLE IF EXISTS public.farmer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read notifications they've sent" ON public.farmer_notifications;

CREATE POLICY "Staff can read notifications they've sent" 
  ON public.farmer_notifications FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- MILK APPROVALS TABLE
-- Staff can view approvals they've processed
ALTER TABLE IF EXISTS public.milk_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read approvals they've processed" ON public.milk_approvals;

CREATE POLICY "Staff can read approvals they've processed" 
  ON public.milk_approvals FOR SELECT 
  TO authenticated
  USING (approved_by IN (
    SELECT s.id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- COLLECTOR PERFORMANCE TABLE
-- Staff can view performance of collectors they supervise
ALTER TABLE IF EXISTS public.collector_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read collector performance" ON public.collector_performance;

CREATE POLICY "Staff can read collector performance" 
  ON public.collector_performance FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- FARMER CREDIT PROFILES TABLE
-- Staff can view credit profiles of farmers they work with
ALTER TABLE IF EXISTS public.farmer_credit_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read credit profiles of farmers they work with" ON public.farmer_credit_profiles;

CREATE POLICY "Staff can read credit profiles of farmers they work with" 
  ON public.farmer_credit_profiles FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- FARMER CREDIT LIMITS TABLE
-- Staff can view credit limits of farmers they work with
ALTER TABLE IF EXISTS public.farmer_credit_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read credit limits of farmers they work with" ON public.farmer_credit_limits;

CREATE POLICY "Staff can read credit limits of farmers they work with" 
  ON public.farmer_credit_limits FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- FARMER CREDIT TRANSACTIONS TABLE
-- Staff can view credit transactions of farmers they work with
ALTER TABLE IF EXISTS public.farmer_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read credit transactions of farmers they work with" ON public.farmer_credit_transactions;

CREATE POLICY "Staff can read credit transactions of farmers they work with" 
  ON public.farmer_credit_transactions FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- AGROVET PURCHASES TABLE
-- Staff can view purchases for farmers they work with
ALTER TABLE IF EXISTS public.agrovet_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read purchases for farmers they work with" ON public.agrovet_purchases;

CREATE POLICY "Staff can read purchases for farmers they work with" 
  ON public.agrovet_purchases FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- AGROVET CREDIT REQUESTS TABLE
-- Staff can view credit requests for farmers they work with
ALTER TABLE IF EXISTS public.agrovet_credit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read credit requests for farmers they work with" ON public.agrovet_credit_requests;

CREATE POLICY "Staff can read credit requests for farmers they work with" 
  ON public.agrovet_credit_requests FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- AGROVET DISBURSEMENTS TABLE
-- Staff can view disbursements for farmers they work with
ALTER TABLE IF EXISTS public.agrovet_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read disbursements for farmers they work with" ON public.agrovet_disbursements;

CREATE POLICY "Staff can read disbursements for farmers they work with" 
  ON public.agrovet_disbursements FOR SELECT 
  TO authenticated
  USING (purchase_id IN (
    SELECT ap.id FROM public.agrovet_purchases ap
    JOIN public.farmers f ON ap.farmer_id = f.id
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- CREDIT REQUESTS TABLE
-- Staff can view credit requests for farmers they work with
ALTER TABLE IF EXISTS public.credit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read credit requests for farmers they work with" ON public.credit_requests;

CREATE POLICY "Staff can read credit requests for farmers they work with" 
  ON public.credit_requests FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- CREDIT TRANSACTIONS TABLE
-- Staff can view credit transactions for farmers they work with
ALTER TABLE IF EXISTS public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read credit transactions for farmers they work with" ON public.credit_transactions;

CREATE POLICY "Staff can read credit transactions for farmers they work with" 
  ON public.credit_transactions FOR SELECT 
  TO authenticated
  USING (credit_request_id IN (
    SELECT cr.id FROM public.credit_requests cr
    JOIN public.farmers f ON cr.farmer_id = f.id
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- PAYMENT STATEMENTS TABLE
-- Staff can view payment statements for farmers they work with
ALTER TABLE IF EXISTS public.payment_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read payment statements for farmers they work with" ON public.payment_statements;

CREATE POLICY "Staff can read payment statements for farmers they work with" 
  ON public.payment_statements FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- INVENTORY ITEMS TABLE
-- Staff can view inventory items
ALTER TABLE IF EXISTS public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read inventory items" ON public.inventory_items;

CREATE POLICY "Staff can read inventory items" 
  ON public.inventory_items FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- INVENTORY TRANSACTIONS TABLE
-- Staff can view inventory transactions
ALTER TABLE IF EXISTS public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read inventory transactions" ON public.inventory_transactions;

CREATE POLICY "Staff can read inventory transactions" 
  ON public.inventory_transactions FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- MARKET PRICES TABLE
-- Staff can view market prices
ALTER TABLE IF EXISTS public.market_prices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read market prices" ON public.market_prices;

CREATE POLICY "Staff can read market prices" 
  ON public.market_prices FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- FARMER CHARGES TABLE
-- Staff can view charges for farmers they work with
ALTER TABLE IF EXISTS public.farmer_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read charges for farmers they work with" ON public.farmer_charges;

CREATE POLICY "Staff can read charges for farmers they work with" 
  ON public.farmer_charges FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

-- DEDUCTION RECORDS TABLE
-- Staff can view deduction records for farmers they work with
ALTER TABLE IF EXISTS public.deduction_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Staff can read deduction records for farmers they work with" ON public.deduction_records;

CREATE POLICY "Staff can read deduction records for farmers they work with" 
  ON public.deduction_records FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE EXISTS (
      SELECT 1 FROM public.user_roles ur 
      WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
    )
  ) OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff' AND ur.active = true
  ));

COMMIT;