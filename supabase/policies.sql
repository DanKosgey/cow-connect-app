-- policies.sql
-- Row Level Security policies for Supabase

-- Helper: use auth.uid() to match authenticated user's id

-- Profiles: users can read and update their own profile; admins can read all
CREATE POLICY "profiles_select_own_or_admin" ON public.profiles
  FOR SELECT
  USING (
    id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
    )
  );

CREATE POLICY "profiles_insert_own" ON public.profiles
  FOR INSERT
  WITH CHECK (id = auth.uid());

CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Farmers: farmers can only access their own farmer row; staff and admin can read many
CREATE POLICY "farmers_select_own_or_staff_admin" ON public.farmers
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'staff')
    OR user_id = auth.uid()
  );

CREATE POLICY "farmers_update_own_or_admin" ON public.farmers
  FOR UPDATE
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  WITH CHECK (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Collections: farmers can read their collections; staff can read collections for which they are staff; admin can read all
CREATE POLICY "collections_select_rls" ON public.collections
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    OR farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid())
    OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

CREATE POLICY "collections_insert_staff_or_admin" ON public.collections
  FOR INSERT
  WITH CHECK (
    -- staff create collections when staff_id belongs to them, admin allowed
    (staff_id IS NOT NULL AND staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid()))
    OR (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'))
  );

CREATE POLICY "collections_update_admin_or_staff" ON public.collections
  FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    OR staff_id IN (SELECT id FROM public.staff WHERE user_id = auth.uid())
  );

-- Payments: read by farmer (their payments), staff (admin), admin
CREATE POLICY "payments_select_rls" ON public.payments
  FOR SELECT
  USING (
    EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin')
    OR farmer_id IN (SELECT id FROM public.farmers WHERE user_id = auth.uid())
  );

CREATE POLICY "payments_insert_admin" ON public.payments
  FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.user_roles ur WHERE ur.user_id = auth.uid() AND ur.role = 'admin'));

-- Notifications: users can read their own notifications; server (service role) can insert
CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "notifications_insert_server" ON public.notifications
  FOR INSERT
  WITH CHECK (true); -- Let edge functions or service role insert

-- Allow authenticated users to use RPCs via functions that implement checks (RPC functions must check permissions server-side)

-- Grant usage on enums to public (required in some setups)
GRANT USAGE ON TYPE user_role_enum TO public;
GRANT USAGE ON TYPE kyc_status_enum TO public;
GRANT USAGE ON TYPE collection_status_enum TO public;
GRANT USAGE ON TYPE quality_grade_enum TO public;
GRANT USAGE ON TYPE payment_status_enum TO public;
GRANT USAGE ON TYPE batch_status_enum TO public;

-- Note: After applying policies, ensure Supabase Auth JWT has role in claims if relying on auth.role()
