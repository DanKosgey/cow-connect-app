-- COMPREHENSIVE ADMIN RLS POLICIES FOR ALL TABLES
-- This script consolidates all RLS policies for the admin role across all tables
-- It includes TODOs for implementing RLS for other roles (farmer, staff, collector, creditor)

-- ============================================
-- CORE TABLES (from 20240001_create_base_tables.sql)
-- ============================================

-- PROFILES TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can insert profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can delete profiles" ON public.profiles;

CREATE POLICY "Admins can read profiles" 
  ON public.profiles FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert profiles" 
  ON public.profiles FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update profiles" 
  ON public.profiles FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete profiles" 
  ON public.profiles FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- USER ROLES TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.user_roles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can insert user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can update user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can delete user_roles" ON public.user_roles;

CREATE POLICY "Admins can read user_roles" 
  ON public.user_roles FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert user_roles" 
  ON public.user_roles FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update user_roles" 
  ON public.user_roles FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete user_roles" 
  ON public.user_roles FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- FARMERS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read farmers" ON public.farmers;
DROP POLICY IF EXISTS "Admins can insert farmers" ON public.farmers;
DROP POLICY IF EXISTS "Admins can update farmers" ON public.farmers;
DROP POLICY IF EXISTS "Admins can delete farmers" ON public.farmers;

CREATE POLICY "Admins can read farmers" 
  ON public.farmers FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert farmers" 
  ON public.farmers FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update farmers" 
  ON public.farmers FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete farmers" 
  ON public.farmers FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- STAFF TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can insert staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can update staff" ON public.staff;
DROP POLICY IF EXISTS "Admins can delete staff" ON public.staff;

CREATE POLICY "Admins can read staff" 
  ON public.staff FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert staff" 
  ON public.staff FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update staff" 
  ON public.staff FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete staff" 
  ON public.staff FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- COLLECTIONS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.collections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can insert collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can update collections" ON public.collections;
DROP POLICY IF EXISTS "Admins can delete collections" ON public.collections;

CREATE POLICY "Admins can read collections" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert collections" 
  ON public.collections FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update collections" 
  ON public.collections FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete collections" 
  ON public.collections FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- MILK QUALITY PARAMETERS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.milk_quality_parameters ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read milk_quality_parameters" ON public.milk_quality_parameters;
DROP POLICY IF EXISTS "Admins can insert milk_quality_parameters" ON public.milk_quality_parameters;
DROP POLICY IF EXISTS "Admins can update milk_quality_parameters" ON public.milk_quality_parameters;
DROP POLICY IF EXISTS "Admins can delete milk_quality_parameters" ON public.milk_quality_parameters;

CREATE POLICY "Admins can read milk_quality_parameters" 
  ON public.milk_quality_parameters FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert milk_quality_parameters" 
  ON public.milk_quality_parameters FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update milk_quality_parameters" 
  ON public.milk_quality_parameters FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete milk_quality_parameters" 
  ON public.milk_quality_parameters FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- MILK RATES TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.milk_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read milk_rates" ON public.milk_rates;
DROP POLICY IF EXISTS "Admins can insert milk_rates" ON public.milk_rates;
DROP POLICY IF EXISTS "Admins can update milk_rates" ON public.milk_rates;
DROP POLICY IF EXISTS "Admins can delete milk_rates" ON public.milk_rates;

CREATE POLICY "Admins can read milk_rates" 
  ON public.milk_rates FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert milk_rates" 
  ON public.milk_rates FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update milk_rates" 
  ON public.milk_rates FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete milk_rates" 
  ON public.milk_rates FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- KYC DOCUMENTS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read kyc_documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins can insert kyc_documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins can update kyc_documents" ON public.kyc_documents;
DROP POLICY IF EXISTS "Admins can delete kyc_documents" ON public.kyc_documents;

CREATE POLICY "Admins can read kyc_documents" 
  ON public.kyc_documents FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert kyc_documents" 
  ON public.kyc_documents FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update kyc_documents" 
  ON public.kyc_documents FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete kyc_documents" 
  ON public.kyc_documents FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- FARMER ANALYTICS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.farmer_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read farmer_analytics" ON public.farmer_analytics;
DROP POLICY IF EXISTS "Admins can insert farmer_analytics" ON public.farmer_analytics;
DROP POLICY IF EXISTS "Admins can update farmer_analytics" ON public.farmer_analytics;
DROP POLICY IF EXISTS "Admins can delete farmer_analytics" ON public.farmer_analytics;

CREATE POLICY "Admins can read farmer_analytics" 
  ON public.farmer_analytics FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert farmer_analytics" 
  ON public.farmer_analytics FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update farmer_analytics" 
  ON public.farmer_analytics FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete farmer_analytics" 
  ON public.farmer_analytics FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- PAYMENTS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can insert payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can update payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can delete payments" ON public.payments;

CREATE POLICY "Admins can read payments" 
  ON public.payments FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert payments" 
  ON public.payments FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update payments" 
  ON public.payments FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete payments" 
  ON public.payments FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- PAYMENT BATCHES TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.payment_batches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read payment_batches" ON public.payment_batches;
DROP POLICY IF EXISTS "Admins can insert payment_batches" ON public.payment_batches;
DROP POLICY IF EXISTS "Admins can update payment_batches" ON public.payment_batches;
DROP POLICY IF EXISTS "Admins can delete payment_batches" ON public.payment_batches;

CREATE POLICY "Admins can read payment_batches" 
  ON public.payment_batches FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert payment_batches" 
  ON public.payment_batches FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update payment_batches" 
  ON public.payment_batches FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete payment_batches" 
  ON public.payment_batches FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- COLLECTION PAYMENTS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.collection_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read collection_payments" ON public.collection_payments;
DROP POLICY IF EXISTS "Admins can insert collection_payments" ON public.collection_payments;
DROP POLICY IF EXISTS "Admins can update collection_payments" ON public.collection_payments;
DROP POLICY IF EXISTS "Admins can delete collection_payments" ON public.collection_payments;

CREATE POLICY "Admins can read collection_payments" 
  ON public.collection_payments FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert collection_payments" 
  ON public.collection_payments FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update collection_payments" 
  ON public.collection_payments FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete collection_payments" 
  ON public.collection_payments FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- NOTIFICATIONS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Admins can delete notifications" ON public.notifications;

CREATE POLICY "Admins can read notifications" 
  ON public.notifications FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert notifications" 
  ON public.notifications FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update notifications" 
  ON public.notifications FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete notifications" 
  ON public.notifications FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- AUTH EVENTS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.auth_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read auth_events" ON public.auth_events;
DROP POLICY IF EXISTS "Admins can insert auth_events" ON public.auth_events;
DROP POLICY IF EXISTS "Admins can update auth_events" ON public.auth_events;
DROP POLICY IF EXISTS "Admins can delete auth_events" ON public.auth_events;

CREATE POLICY "Admins can read auth_events" 
  ON public.auth_events FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert auth_events" 
  ON public.auth_events FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update auth_events" 
  ON public.auth_events FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete auth_events" 
  ON public.auth_events FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- USER SESSIONS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.user_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can insert user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can update user_sessions" ON public.user_sessions;
DROP POLICY IF EXISTS "Admins can delete user_sessions" ON public.user_sessions;

CREATE POLICY "Admins can read user_sessions" 
  ON public.user_sessions FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert user_sessions" 
  ON public.user_sessions FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update user_sessions" 
  ON public.user_sessions FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete user_sessions" 
  ON public.user_sessions FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- AUDIT LOGS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.audit_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can insert audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can update audit_logs" ON public.audit_logs;
DROP POLICY IF EXISTS "Admins can delete audit_logs" ON public.audit_logs;

CREATE POLICY "Admins can read audit_logs" 
  ON public.audit_logs FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert audit_logs" 
  ON public.audit_logs FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update audit_logs" 
  ON public.audit_logs FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete audit_logs" 
  ON public.audit_logs FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- SYSTEM SETTINGS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.system_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can insert system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can update system_settings" ON public.system_settings;
DROP POLICY IF EXISTS "Admins can delete system_settings" ON public.system_settings;

CREATE POLICY "Admins can read system_settings" 
  ON public.system_settings FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert system_settings" 
  ON public.system_settings FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update system_settings" 
  ON public.system_settings FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete system_settings" 
  ON public.system_settings FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- FILE UPLOADS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.file_uploads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read file_uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Admins can insert file_uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Admins can update file_uploads" ON public.file_uploads;
DROP POLICY IF EXISTS "Admins can delete file_uploads" ON public.file_uploads;

CREATE POLICY "Admins can read file_uploads" 
  ON public.file_uploads FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert file_uploads" 
  ON public.file_uploads FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update file_uploads" 
  ON public.file_uploads FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete file_uploads" 
  ON public.file_uploads FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ACCOUNT LOCKOUTS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.account_lockouts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read account_lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Admins can insert account_lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Admins can update account_lockouts" ON public.account_lockouts;
DROP POLICY IF EXISTS "Admins can delete account_lockouts" ON public.account_lockouts;

CREATE POLICY "Admins can read account_lockouts" 
  ON public.account_lockouts FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert account_lockouts" 
  ON public.account_lockouts FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update account_lockouts" 
  ON public.account_lockouts FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete account_lockouts" 
  ON public.account_lockouts FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ROLE PERMISSIONS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.role_permissions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can insert role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can update role_permissions" ON public.role_permissions;
DROP POLICY IF EXISTS "Admins can delete role_permissions" ON public.role_permissions;

CREATE POLICY "Admins can read role_permissions" 
  ON public.role_permissions FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert role_permissions" 
  ON public.role_permissions FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update role_permissions" 
  ON public.role_permissions FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete role_permissions" 
  ON public.role_permissions FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ============================================
-- REGISTRATION SYSTEM TABLES (from 20251011000100_farmer_registration_system.sql)
-- ============================================

-- PENDING FARMERS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.pending_farmers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read pending_farmers" ON public.pending_farmers;
DROP POLICY IF EXISTS "Admins can insert pending_farmers" ON public.pending_farmers;
DROP POLICY IF EXISTS "Admins can update pending_farmers" ON public.pending_farmers;
DROP POLICY IF EXISTS "Admins can delete pending_farmers" ON public.pending_farmers;

CREATE POLICY "Admins can read pending_farmers" 
  ON public.pending_farmers FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert pending_farmers" 
  ON public.pending_farmers FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update pending_farmers" 
  ON public.pending_farmers FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete pending_farmers" 
  ON public.pending_farmers FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- FARMER APPROVAL HISTORY TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.farmer_approval_history ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read farmer_approval_history" ON public.farmer_approval_history;
DROP POLICY IF EXISTS "Admins can insert farmer_approval_history" ON public.farmer_approval_history;
DROP POLICY IF EXISTS "Admins can update farmer_approval_history" ON public.farmer_approval_history;
DROP POLICY IF EXISTS "Admins can delete farmer_approval_history" ON public.farmer_approval_history;

CREATE POLICY "Admins can read farmer_approval_history" 
  ON public.farmer_approval_history FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert farmer_approval_history" 
  ON public.farmer_approval_history FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update farmer_approval_history" 
  ON public.farmer_approval_history FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete farmer_approval_history" 
  ON public.farmer_approval_history FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- FARMER NOTIFICATIONS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.farmer_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read farmer_notifications" ON public.farmer_notifications;
DROP POLICY IF EXISTS "Admins can insert farmer_notifications" ON public.farmer_notifications;
DROP POLICY IF EXISTS "Admins can update farmer_notifications" ON public.farmer_notifications;
DROP POLICY IF EXISTS "Admins can delete farmer_notifications" ON public.farmer_notifications;

CREATE POLICY "Admins can read farmer_notifications" 
  ON public.farmer_notifications FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert farmer_notifications" 
  ON public.farmer_notifications FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update farmer_notifications" 
  ON public.farmer_notifications FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete farmer_notifications" 
  ON public.farmer_notifications FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ============================================
-- MILK APPROVAL WORKFLOW TABLES (from 20251113_milk_approval_workflow.sql)
-- ============================================

-- MILK APPROVALS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.milk_approvals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Admins can insert milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Admins can update milk_approvals" ON public.milk_approvals;
DROP POLICY IF EXISTS "Admins can delete milk_approvals" ON public.milk_approvals;

CREATE POLICY "Admins can read milk_approvals" 
  ON public.milk_approvals FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert milk_approvals" 
  ON public.milk_approvals FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update milk_approvals" 
  ON public.milk_approvals FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete milk_approvals" 
  ON public.milk_approvals FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- COLLECTOR PERFORMANCE TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.collector_performance ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read collector_performance" ON public.collector_performance;
DROP POLICY IF EXISTS "Admins can insert collector_performance" ON public.collector_performance;
DROP POLICY IF EXISTS "Admins can update collector_performance" ON public.collector_performance;
DROP POLICY IF EXISTS "Admins can delete collector_performance" ON public.collector_performance;

CREATE POLICY "Admins can read collector_performance" 
  ON public.collector_performance FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert collector_performance" 
  ON public.collector_performance FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update collector_performance" 
  ON public.collector_performance FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete collector_performance" 
  ON public.collector_performance FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- VARIANCE PENALTY CONFIG TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.variance_penalty_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read variance_penalty_config" ON public.variance_penalty_config;
DROP POLICY IF EXISTS "Admins can insert variance_penalty_config" ON public.variance_penalty_config;
DROP POLICY IF EXISTS "Admins can update variance_penalty_config" ON public.variance_penalty_config;
DROP POLICY IF EXISTS "Admins can delete variance_penalty_config" ON public.variance_penalty_config;

CREATE POLICY "Admins can read variance_penalty_config" 
  ON public.variance_penalty_config FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert variance_penalty_config" 
  ON public.variance_penalty_config FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update variance_penalty_config" 
  ON public.variance_penalty_config FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete variance_penalty_config" 
  ON public.variance_penalty_config FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ============================================
-- CREDIT SYSTEM TABLES (from various credit system migrations)
-- ============================================

-- AGROVET INVENTORY TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.agrovet_inventory ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read agrovet_inventory" ON public.agrovet_inventory;
DROP POLICY IF EXISTS "Admins can insert agrovet_inventory" ON public.agrovet_inventory;
DROP POLICY IF EXISTS "Admins can update agrovet_inventory" ON public.agrovet_inventory;
DROP POLICY IF EXISTS "Admins can delete agrovet_inventory" ON public.agrovet_inventory;

CREATE POLICY "Admins can read agrovet_inventory" 
  ON public.agrovet_inventory FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert agrovet_inventory" 
  ON public.agrovet_inventory FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update agrovet_inventory" 
  ON public.agrovet_inventory FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete agrovet_inventory" 
  ON public.agrovet_inventory FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- AGROVET PURCHASES TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.agrovet_purchases ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read agrovet_purchases" ON public.agrovet_purchases;
DROP POLICY IF EXISTS "Admins can insert agrovet_purchases" ON public.agrovet_purchases;
DROP POLICY IF EXISTS "Admins can update agrovet_purchases" ON public.agrovet_purchases;
DROP POLICY IF EXISTS "Admins can delete agrovet_purchases" ON public.agrovet_purchases;

CREATE POLICY "Admins can read agrovet_purchases" 
  ON public.agrovet_purchases FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert agrovet_purchases" 
  ON public.agrovet_purchases FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update agrovet_purchases" 
  ON public.agrovet_purchases FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete agrovet_purchases" 
  ON public.agrovet_purchases FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- AGROVET STAFF TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.agrovet_staff ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read agrovet_staff" ON public.agrovet_staff;
DROP POLICY IF EXISTS "Admins can insert agrovet_staff" ON public.agrovet_staff;
DROP POLICY IF EXISTS "Admins can update agrovet_staff" ON public.agrovet_staff;
DROP POLICY IF EXISTS "Admins can delete agrovet_staff" ON public.agrovet_staff;

CREATE POLICY "Admins can read agrovet_staff" 
  ON public.agrovet_staff FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert agrovet_staff" 
  ON public.agrovet_staff FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update agrovet_staff" 
  ON public.agrovet_staff FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete agrovet_staff" 
  ON public.agrovet_staff FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- AGROVET PRODUCTS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.agrovet_products ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read agrovet_products" ON public.agrovet_products;
DROP POLICY IF EXISTS "Admins can insert agrovet_products" ON public.agrovet_products;
DROP POLICY IF EXISTS "Admins can update agrovet_products" ON public.agrovet_products;
DROP POLICY IF EXISTS "Admins can delete agrovet_products" ON public.agrovet_products;

CREATE POLICY "Admins can read agrovet_products" 
  ON public.agrovet_products FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert agrovet_products" 
  ON public.agrovet_products FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update agrovet_products" 
  ON public.agrovet_products FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete agrovet_products" 
  ON public.agrovet_products FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- AGROVET CREDIT REQUESTS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.agrovet_credit_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read agrovet_credit_requests" ON public.agrovet_credit_requests;
DROP POLICY IF EXISTS "Admins can insert agrovet_credit_requests" ON public.agrovet_credit_requests;
DROP POLICY IF EXISTS "Admins can update agrovet_credit_requests" ON public.agrovet_credit_requests;
DROP POLICY IF EXISTS "Admins can delete agrovet_credit_requests" ON public.agrovet_credit_requests;

CREATE POLICY "Admins can read agrovet_credit_requests" 
  ON public.agrovet_credit_requests FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert agrovet_credit_requests" 
  ON public.agrovet_credit_requests FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update agrovet_credit_requests" 
  ON public.agrovet_credit_requests FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete agrovet_credit_requests" 
  ON public.agrovet_credit_requests FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- AGROVET DISBURSEMENTS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.agrovet_disbursements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read agrovet_disbursements" ON public.agrovet_disbursements;
DROP POLICY IF EXISTS "Admins can insert agrovet_disbursements" ON public.agrovet_disbursements;
DROP POLICY IF EXISTS "Admins can update agrovet_disbursements" ON public.agrovet_disbursements;
DROP POLICY IF EXISTS "Admins can delete agrovet_disbursements" ON public.agrovet_disbursements;

CREATE POLICY "Admins can read agrovet_disbursements" 
  ON public.agrovet_disbursements FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert agrovet_disbursements" 
  ON public.agrovet_disbursements FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update agrovet_disbursements" 
  ON public.agrovet_disbursements FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete agrovet_disbursements" 
  ON public.agrovet_disbursements FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ============================================
-- INVENTORY MANAGEMENT TABLES (from 20251015000800_create_inventory_tables.sql)
-- ============================================

-- INVENTORY ITEMS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Admins can insert inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Admins can update inventory_items" ON public.inventory_items;
DROP POLICY IF EXISTS "Admins can delete inventory_items" ON public.inventory_items;

CREATE POLICY "Admins can read inventory_items" 
  ON public.inventory_items FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert inventory_items" 
  ON public.inventory_items FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update inventory_items" 
  ON public.inventory_items FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete inventory_items" 
  ON public.inventory_items FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- INVENTORY TRANSACTIONS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.inventory_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read inventory_transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Admins can insert inventory_transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Admins can update inventory_transactions" ON public.inventory_transactions;
DROP POLICY IF EXISTS "Admins can delete inventory_transactions" ON public.inventory_transactions;

CREATE POLICY "Admins can read inventory_transactions" 
  ON public.inventory_transactions FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert inventory_transactions" 
  ON public.inventory_transactions FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update inventory_transactions" 
  ON public.inventory_transactions FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete inventory_transactions" 
  ON public.inventory_transactions FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ============================================
-- COLLECTOR SYSTEM TABLES (from various collector migrations)
-- ============================================

-- COLLECTOR RATES TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.collector_rates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read collector_rates" ON public.collector_rates;
DROP POLICY IF EXISTS "Admins can insert collector_rates" ON public.collector_rates;
DROP POLICY IF EXISTS "Admins can update collector_rates" ON public.collector_rates;
DROP POLICY IF EXISTS "Admins can delete collector_rates" ON public.collector_rates;

CREATE POLICY "Admins can read collector_rates" 
  ON public.collector_rates FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert collector_rates" 
  ON public.collector_rates FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update collector_rates" 
  ON public.collector_rates FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete collector_rates" 
  ON public.collector_rates FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- COLLECTOR PAYMENTS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.collector_payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read collector_payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can insert collector_payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can update collector_payments" ON public.collector_payments;
DROP POLICY IF EXISTS "Admins can delete collector_payments" ON public.collector_payments;

CREATE POLICY "Admins can read collector_payments" 
  ON public.collector_payments FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert collector_payments" 
  ON public.collector_payments FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update collector_payments" 
  ON public.collector_payments FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete collector_payments" 
  ON public.collector_payments FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- FARMER CHARGES TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.farmer_charges ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read farmer_charges" ON public.farmer_charges;
DROP POLICY IF EXISTS "Admins can insert farmer_charges" ON public.farmer_charges;
DROP POLICY IF EXISTS "Admins can update farmer_charges" ON public.farmer_charges;
DROP POLICY IF EXISTS "Admins can delete farmer_charges" ON public.farmer_charges;

CREATE POLICY "Admins can read farmer_charges" 
  ON public.farmer_charges FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert farmer_charges" 
  ON public.farmer_charges FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update farmer_charges" 
  ON public.farmer_charges FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete farmer_charges" 
  ON public.farmer_charges FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ============================================
-- DEDUCTION SYSTEM TABLES (from 202512020001_create_deduction_system_tables.sql)
-- ============================================

-- DEDUCTION TYPES TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.deduction_types ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read deduction_types" ON public.deduction_types;
DROP POLICY IF EXISTS "Admins can insert deduction_types" ON public.deduction_types;
DROP POLICY IF EXISTS "Admins can update deduction_types" ON public.deduction_types;
DROP POLICY IF EXISTS "Admins can delete deduction_types" ON public.deduction_types;

CREATE POLICY "Admins can read deduction_types" 
  ON public.deduction_types FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert deduction_types" 
  ON public.deduction_types FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update deduction_types" 
  ON public.deduction_types FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete deduction_types" 
  ON public.deduction_types FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- FARMER DEDUCTIONS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.farmer_deductions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read farmer_deductions" ON public.farmer_deductions;
DROP POLICY IF EXISTS "Admins can insert farmer_deductions" ON public.farmer_deductions;
DROP POLICY IF EXISTS "Admins can update farmer_deductions" ON public.farmer_deductions;
DROP POLICY IF EXISTS "Admins can delete farmer_deductions" ON public.farmer_deductions;

CREATE POLICY "Admins can read farmer_deductions" 
  ON public.farmer_deductions FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert farmer_deductions" 
  ON public.farmer_deductions FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update farmer_deductions" 
  ON public.farmer_deductions FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete farmer_deductions" 
  ON public.farmer_deductions FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- DEDUCTION RECORDS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.deduction_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read deduction_records" ON public.deduction_records;
DROP POLICY IF EXISTS "Admins can insert deduction_records" ON public.deduction_records;
DROP POLICY IF EXISTS "Admins can update deduction_records" ON public.deduction_records;
DROP POLICY IF EXISTS "Admins can delete deduction_records" ON public.deduction_records;

CREATE POLICY "Admins can read deduction_records" 
  ON public.deduction_records FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert deduction_records" 
  ON public.deduction_records FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update deduction_records" 
  ON public.deduction_records FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete deduction_records" 
  ON public.deduction_records FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- ============================================
-- COLLECTOR PENALTY ACCOUNTS TABLES (from 20251202001_create_collector_penalty_accounts.sql)
-- ============================================

-- COLLECTOR PENALTY ACCOUNTS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.collector_penalty_accounts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read collector_penalty_accounts" ON public.collector_penalty_accounts;
DROP POLICY IF EXISTS "Admins can insert collector_penalty_accounts" ON public.collector_penalty_accounts;
DROP POLICY IF EXISTS "Admins can update collector_penalty_accounts" ON public.collector_penalty_accounts;
DROP POLICY IF EXISTS "Admins can delete collector_penalty_accounts" ON public.collector_penalty_accounts;

CREATE POLICY "Admins can read collector_penalty_accounts" 
  ON public.collector_penalty_accounts FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert collector_penalty_accounts" 
  ON public.collector_penalty_accounts FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update collector_penalty_accounts" 
  ON public.collector_penalty_accounts FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete collector_penalty_accounts" 
  ON public.collector_penalty_accounts FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

-- COLLECTOR PENALTY TRANSACTIONS TABLE
-- TODO: Implement RLS policies for farmer, staff, collector, creditor roles
ALTER TABLE IF EXISTS public.collector_penalty_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can read collector_penalty_transactions" ON public.collector_penalty_transactions;
DROP POLICY IF EXISTS "Admins can insert collector_penalty_transactions" ON public.collector_penalty_transactions;
DROP POLICY IF EXISTS "Admins can update collector_penalty_transactions" ON public.collector_penalty_transactions;
DROP POLICY IF EXISTS "Admins can delete collector_penalty_transactions" ON public.collector_penalty_transactions;

CREATE POLICY "Admins can read collector_penalty_transactions" 
  ON public.collector_penalty_transactions FOR SELECT 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can insert collector_penalty_transactions" 
  ON public.collector_penalty_transactions FOR INSERT 
  TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can update collector_penalty_transactions" 
  ON public.collector_penalty_transactions FOR UPDATE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active = true
  ));

CREATE POLICY "Admins can delete collector_penalty_transactions" 
  ON public.collector_penalty_transactions FOR DELETE 
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin' AND ur.active