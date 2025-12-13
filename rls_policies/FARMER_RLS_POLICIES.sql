-- FARMER ROLE RLS POLICIES
-- This script defines RLS policies for the farmer role across all relevant tables

BEGIN;

-- PROFILES TABLE
-- Farmers can view and edit their own profile
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Farmers can update their own profile" ON public.profiles;

CREATE POLICY "Farmers can read their own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated
  USING (id IN (
    SELECT f.user_id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

CREATE POLICY "Farmers can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING (id IN (
    SELECT f.user_id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- FARMERS TABLE
-- Farmers can view and edit their own farmer record
ALTER TABLE IF EXISTS public.farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own record" ON public.farmers;
DROP POLICY IF EXISTS "Farmers can update their own record" ON public.farmers;

CREATE POLICY "Farmers can read their own record" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Farmers can update their own record" 
  ON public.farmers FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid());

-- COLLECTIONS TABLE
-- Farmers can view their own collections
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own collections" ON public.collections;

CREATE POLICY "Farmers can read their own collections" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- MILK QUALITY PARAMETERS TABLE
-- Farmers can view quality parameters for their own collections
ALTER TABLE IF EXISTS public.milk_quality_parameters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read quality params for their collections" ON public.milk_quality_parameters;

CREATE POLICY "Farmers can read quality params for their collections" 
  ON public.milk_quality_parameters FOR SELECT 
  TO authenticated
  USING (collection_id IN (
    SELECT c.id FROM public.collections c
    JOIN public.farmers f ON c.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- KYC DOCUMENTS TABLE
-- Farmers can view their own KYC documents
ALTER TABLE IF EXISTS public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own kyc documents" ON public.kyc_documents;

CREATE POLICY "Farmers can read their own kyc documents" 
  ON public.kyc_documents FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- FARMER ANALYTICS TABLE
-- Farmers can view their own analytics
ALTER TABLE IF EXISTS public.farmer_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own analytics" ON public.farmer_analytics;

CREATE POLICY "Farmers can read their own analytics" 
  ON public.farmer_analytics FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- PAYMENTS TABLE
-- Farmers can view their own payments
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own payments" ON public.payments;

CREATE POLICY "Farmers can read their own payments" 
  ON public.payments FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- COLLECTION PAYMENTS TABLE
-- Farmers can view payment details for their collections
ALTER TABLE IF EXISTS public.collection_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read payment details for their collections" ON public.collection_payments;

CREATE POLICY "Farmers can read payment details for their collections" 
  ON public.collection_payments FOR SELECT 
  TO authenticated
  USING (collection_id IN (
    SELECT c.id FROM public.collections c
    JOIN public.farmers f ON c.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- NOTIFICATIONS TABLE
-- Farmers can view their own notifications
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own notifications" ON public.notifications;

CREATE POLICY "Farmers can read their own notifications" 
  ON public.notifications FOR SELECT 
  TO authenticated
  USING (user_id IN (
    SELECT f.user_id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- PENDING FARMERS TABLE
-- Farmers can view their own pending registration
ALTER TABLE IF EXISTS public.pending_farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own pending registration" ON public.pending_farmers;

CREATE POLICY "Farmers can read their own pending registration" 
  ON public.pending_farmers FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

-- FARMER APPROVAL HISTORY TABLE
-- Farmers can view their own approval history
ALTER TABLE IF EXISTS public.farmer_approval_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own approval history" ON public.farmer_approval_history;

CREATE POLICY "Farmers can read their own approval history" 
  ON public.farmer_approval_history FOR SELECT 
  TO authenticated
  USING (pending_farmer_id IN (
    SELECT pf.id FROM public.pending_farmers pf
    WHERE pf.user_id = auth.uid()
  ));

-- FARMER NOTIFICATIONS TABLE
-- Farmers can view notifications sent to them
ALTER TABLE IF EXISTS public.farmer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read notifications sent to them" ON public.farmer_notifications;

CREATE POLICY "Farmers can read notifications sent to them" 
  ON public.farmer_notifications FOR SELECT 
  TO authenticated
  USING (pending_farmer_id IN (
    SELECT pf.id FROM public.pending_farmers pf
    WHERE pf.user_id = auth.uid()
  ) OR farmer_id IN (
    SELECT f.id FROM public.farmers f
    WHERE f.user_id = auth.uid()
  ) OR user_email IN (
    SELECT p.email FROM public.profiles p
    WHERE p.id IN (
      SELECT f.user_id FROM public.farmers f
      WHERE f.user_id = auth.uid()
    )
  ));

-- MILK APPROVALS TABLE
-- Farmers can view approvals for their collections
ALTER TABLE IF EXISTS public.milk_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read approvals for their collections" ON public.milk_approvals;

CREATE POLICY "Farmers can read approvals for their collections" 
  ON public.milk_approvals FOR SELECT 
  TO authenticated
  USING (collection_id IN (
    SELECT c.id FROM public.collections c
    JOIN public.farmers f ON c.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- FARMER CREDIT PROFILES TABLE
-- Farmers can view their own credit profile
ALTER TABLE IF EXISTS public.farmer_credit_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own credit profile" ON public.farmer_credit_profiles;

CREATE POLICY "Farmers can read their own credit profile" 
  ON public.farmer_credit_profiles FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- FARMER CREDIT LIMITS TABLE
-- Farmers can view their own credit limits
ALTER TABLE IF EXISTS public.farmer_credit_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own credit limits" ON public.farmer_credit_limits;

CREATE POLICY "Farmers can read their own credit limits" 
  ON public.farmer_credit_limits FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- FARMER CREDIT TRANSACTIONS TABLE
-- Farmers can view their own credit transactions
ALTER TABLE IF EXISTS public.farmer_credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own credit transactions" ON public.farmer_credit_transactions;

CREATE POLICY "Farmers can read their own credit transactions" 
  ON public.farmer_credit_transactions FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- AGROVET PURCHASES TABLE
-- Farmers can view their own purchases
ALTER TABLE IF EXISTS public.agrovet_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own purchases" ON public.agrovet_purchases;

CREATE POLICY "Farmers can read their own purchases" 
  ON public.agrovet_purchases FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- AGROVET CREDIT REQUESTS TABLE
-- Farmers can view their own credit requests
ALTER TABLE IF EXISTS public.agrovet_credit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own credit requests" ON public.agrovet_credit_requests;

CREATE POLICY "Farmers can read their own credit requests" 
  ON public.agrovet_credit_requests FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- AGROVET DISBURSEMENTS TABLE
-- Farmers can view their own disbursements
ALTER TABLE IF EXISTS public.agrovet_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own disbursements" ON public.agrovet_disbursements;

CREATE POLICY "Farmers can read their own disbursements" 
  ON public.agrovet_disbursements FOR SELECT 
  TO authenticated
  USING (purchase_id IN (
    SELECT ap.id FROM public.agrovet_purchases ap
    JOIN public.farmers f ON ap.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- CREDIT REQUESTS TABLE
-- Farmers can view their own credit requests
ALTER TABLE IF EXISTS public.credit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own credit requests" ON public.credit_requests;

CREATE POLICY "Farmers can read their own credit requests" 
  ON public.credit_requests FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- CREDIT TRANSACTIONS TABLE
-- Farmers can view their own credit transactions
ALTER TABLE IF EXISTS public.credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own credit transactions" ON public.credit_transactions;

CREATE POLICY "Farmers can read their own credit transactions" 
  ON public.credit_transactions FOR SELECT 
  TO authenticated
  USING (credit_request_id IN (
    SELECT cr.id FROM public.credit_requests cr
    JOIN public.farmers f ON cr.farmer_id = f.id
    WHERE f.user_id = auth.uid()
  ));

-- PAYMENT STATEMENTS TABLE
-- Farmers can view their own payment statements
ALTER TABLE IF EXISTS public.payment_statements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read their own payment statements" ON public.payment_statements;

CREATE POLICY "Farmers can read their own payment statements" 
  ON public.payment_statements FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- FARMER CHARGES TABLE
-- Farmers can view charges applied to them
ALTER TABLE IF EXISTS public.farmer_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read charges applied to them" ON public.farmer_charges;

CREATE POLICY "Farmers can read charges applied to them" 
  ON public.farmer_charges FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

-- DEDUCTION RECORDS TABLE
-- Farmers can view records of deductions applied to them
ALTER TABLE IF EXISTS public.deduction_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Farmers can read deduction records applied to them" ON public.deduction_records;

CREATE POLICY "Farmers can read deduction records applied to them" 
  ON public.deduction_records FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT f.id FROM public.farmers f 
    WHERE f.user_id = auth.uid()
  ));

COMMIT;