-- COLLECTOR ROLE RLS POLICIES
-- This script defines RLS policies for the collector role across all relevant tables

BEGIN;

-- PROFILES TABLE
-- Collectors can view and edit their own profile
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Collectors can update their own profile" ON public.profiles;

CREATE POLICY "Collectors can read their own profile" 
  ON public.profiles FOR SELECT 
  TO authenticated
  USING (id IN (
    SELECT s.user_id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ));

CREATE POLICY "Collectors can update their own profile" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING (id IN (
    SELECT s.user_id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ));

-- STAFF TABLE
-- Collectors can view and edit their own staff record
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read their own record" ON public.staff;
DROP POLICY IF EXISTS "Collectors can update their own record" ON public.staff;

CREATE POLICY "Collectors can read their own record" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Collectors can update their own record" 
  ON public.staff FOR UPDATE 
  TO authenticated
  USING (user_id = auth.uid());

-- COLLECTIONS TABLE
-- Collectors can view collections they've made
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read collections they've made" ON public.collections;

CREATE POLICY "Collectors can read collections they've made" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (staff_id IN (
    SELECT s.id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ));


-- FARMERS TABLE
-- Collectors can view farmers they collect from
ALTER TABLE IF EXISTS public.farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read farmers they collect from" ON public.farmers;

CREATE POLICY "Collectors can read farmers they collect from" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (id IN (
    SELECT DISTINCT c.farmer_id FROM public.collections c
    JOIN public.staff s ON c.staff_id = s.id
    WHERE s.user_id = auth.uid()
  ));

-- KYC DOCUMENTS TABLE
-- Collectors can view KYC documents for farmers they collect from
ALTER TABLE IF EXISTS public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read kyc documents for farmers they collect from" ON public.kyc_documents;

CREATE POLICY "Collectors can read kyc documents for farmers they collect from" 
  ON public.kyc_documents FOR SELECT 
  TO authenticated
  USING (farmer_id IN (
    SELECT DISTINCT c.farmer_id FROM public.collections c
    JOIN public.staff s ON c.staff_id = s.id
    WHERE s.user_id = auth.uid()
  ));


-- COLLECTION PAYMENTS TABLE
-- Collectors can view payment details for collections they've made
ALTER TABLE IF EXISTS public.collection_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read payment details for collections they've made" ON public.collection_payments;

CREATE POLICY "Collectors can read payment details for collections they've made" 
  ON public.collection_payments FOR SELECT 
  TO authenticated
  USING (collection_id IN (
    SELECT c.id FROM public.collections c
    JOIN public.staff s ON c.staff_id = s.id
    WHERE s.user_id = auth.uid()
  ));

-- NOTIFICATIONS TABLE
-- Collectors can view notifications addressed to them
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read notifications addressed to them" ON public.notifications;

CREATE POLICY "Collectors can read notifications addressed to them" 
  ON public.notifications FOR SELECT 
  TO authenticated
  USING (user_id IN (
    SELECT s.user_id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ));

-- MILK APPROVALS TABLE
-- Collectors can view approvals for collections they've made
ALTER TABLE IF EXISTS public.milk_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read approvals for collections they've made" ON public.milk_approvals;

CREATE POLICY "Collectors can read approvals for collections they've made" 
  ON public.milk_approvals FOR SELECT 
  TO authenticated
  USING (collection_id IN (
    SELECT c.id FROM public.collections c
    JOIN public.staff s ON c.staff_id = s.id
    WHERE s.user_id = auth.uid()
  ));

-- COLLECTOR PERFORMANCE TABLE
-- Collectors can view their own performance
ALTER TABLE IF EXISTS public.collector_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read their own performance" ON public.collector_performance;

CREATE POLICY "Collectors can read their own performance" 
  ON public.collector_performance FOR SELECT 
  TO authenticated
  USING (collector_id IN (
    SELECT s.id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ));

-- COLLECTOR RATES TABLE
-- Collectors can view current rates
ALTER TABLE IF EXISTS public.collector_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read current rates" ON public.collector_rates;

CREATE POLICY "Collectors can read current rates" 
  ON public.collector_rates FOR SELECT 
  TO authenticated
  USING (is_active = true);

-- COLLECTOR PAYMENTS TABLE
-- Collectors can view their own payments
ALTER TABLE IF EXISTS public.collector_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Collectors can read their own payments" ON public.collector_payments;

CREATE POLICY "Collectors can read their own payments" 
  ON public.collector_payments FOR SELECT 
  TO authenticated
  USING (collector_id IN (
    SELECT s.id FROM public.staff s 
    WHERE s.user_id = auth.uid()
  ));

