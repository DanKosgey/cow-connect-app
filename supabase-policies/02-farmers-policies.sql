-- Phase 2: Farmers table policies
-- Apply these policies after storage policies

-- Enable RLS on farmers table if not already enabled
ALTER TABLE public.farmers ENABLE ROW LEVEL SECURITY;

-- Policy 1: Farmers can read their own record, staff and admin can read all
CREATE POLICY "Farmers can read their own record or staff/admin can read all"
ON public.farmers
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Policy 2: Farmers can update their own record, admin can update all
CREATE POLICY "Farmers can update their own record or admin can update all"
ON public.farmers
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Policy 3: Anyone can insert (for registration)
CREATE POLICY "Anyone can insert farmer records"
ON public.farmers
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Policy 4: Admin can delete
CREATE POLICY "Admin can delete farmer records"
ON public.farmers
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Policy 5: Public can read approved farmers (for public directory)
CREATE POLICY "Public can read approved farmers"
ON public.farmers
FOR SELECT
TO anon
USING (kyc_status = 'approved');