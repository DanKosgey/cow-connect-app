-- RLS HELPER FUNCTIONS
-- This script defines helper functions to simplify RLS policy definitions

BEGIN;

-- Function to check if current user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'admin' 
      AND ur.active = true
  );
$$;

-- Function to check if current user is a farmer
CREATE OR REPLACE FUNCTION public.is_farmer()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'farmer' 
      AND ur.active = true
  );
$$;

-- Function to check if current user is staff
CREATE OR REPLACE FUNCTION public.is_staff()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'staff' 
      AND ur.active = true
  );
$$;

-- Function to check if current user is a collector
CREATE OR REPLACE FUNCTION public.is_collector()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'collector' 
      AND ur.active = true
  );
$$;

-- Function to check if current user is a creditor
CREATE OR REPLACE FUNCTION public.is_creditor()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
      AND ur.role = 'creditor' 
      AND ur.active = true
  );
$$;

-- Function to get farmer ID for current user
CREATE OR REPLACE FUNCTION public.get_farmer_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT f.id
  FROM farmers f
  WHERE f.user_id = auth.uid()
  LIMIT 1;
$$;

-- Function to get staff ID for current user
CREATE OR REPLACE FUNCTION public.get_staff_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id
  FROM staff s
  WHERE s.user_id = auth.uid()
  LIMIT 1;
$$;

-- Function to get agrovet staff ID for current user
CREATE OR REPLACE FUNCTION public.get_agrovet_staff_id()
RETURNS UUID
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT ags.id
  FROM agrovet_staff ags
  WHERE ags.user_id = auth.uid()
  LIMIT 1;
$$;

-- Function to check if a farmer belongs to a staff member
CREATE OR REPLACE FUNCTION public.is_farmer_of_staff(farmer_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM collections c
    JOIN staff s ON c.staff_id = s.id
    WHERE c.farmer_id = farmer_uuid
      AND s.user_id = auth.uid()
  );
$$;

-- Function to check if a collection belongs to a staff member
CREATE OR REPLACE FUNCTION public.is_collection_of_staff(collection_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM collections c
    JOIN staff s ON c.staff_id = s.id
    WHERE c.id = collection_uuid
      AND s.user_id = auth.uid()
  );
$$;

-- Function to check if a farmer has a credit profile
CREATE OR REPLACE FUNCTION public.has_credit_profile(farmer_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM farmer_credit_profiles fcp
    WHERE fcp.farmer_id = farmer_uuid
  );
$$;

-- Function to check if an agrovet purchase belongs to a farmer
CREATE OR REPLACE FUNCTION public.is_purchase_of_farmer(purchase_uuid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM agrovet_purchases ap
    JOIN farmers f ON ap.farmer_id = f.id
    WHERE ap.id = purchase_uuid
      AND f.user_id = auth.uid()
  );
$$;

-- Grant execute permissions on all functions to authenticated users
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_farmer() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_staff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_collector() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_creditor() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_farmer_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_staff_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_agrovet_staff_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_farmer_of_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_collection_of_staff(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_credit_profile(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_purchase_of_farmer(UUID) TO authenticated;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that functions were created
SELECT proname, proargtypes FROM pg_proc WHERE proname ILIKE '%is_%' AND pronamespace = 'public'::regnamespace;
SELECT proname, proargtypes FROM pg_proc WHERE proname ILIKE '%get_%' AND pronamespace = 'public'::regnamespace;