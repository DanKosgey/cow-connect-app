-- Phase 3: KYC Documents table policies
-- Apply these policies after farmers policies

-- Enable RLS on kyc_documents table if not already enabled
ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;

-- Policy 1: Farmers can read their own documents, staff and admin can read all
CREATE POLICY "Farmers can read their own documents or staff/admin can read all"
ON public.kyc_documents
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.farmers f 
    WHERE f.id = farmer_id AND f.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'staff'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Policy 2: Farmers can insert their own documents
CREATE POLICY "Farmers can insert their own documents"
ON public.kyc_documents
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.farmers f 
    WHERE f.id = farmer_id AND f.user_id = auth.uid()
  )
);

-- Policy 3: Admin can update document status
CREATE POLICY "Admin can update document status"
ON public.kyc_documents
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);

-- Policy 4: Admin can delete documents
CREATE POLICY "Admin can delete documents"
ON public.kyc_documents
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur 
    WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
  )
);