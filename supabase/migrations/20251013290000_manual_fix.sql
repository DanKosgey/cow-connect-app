-- Manual fix for database issues
-- Run this in the Supabase SQL editor

-- 1. Ensure staff table has all required columns with proper constraints
ALTER TABLE public.staff
  ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
  ADD COLUMN IF NOT EXISTS department TEXT,
  ADD COLUMN IF NOT EXISTS "position" TEXT,
  ADD COLUMN IF NOT EXISTS hire_date DATE DEFAULT CURRENT_DATE,
  ADD COLUMN IF NOT EXISTS supervisor_id UUID REFERENCES public.staff(id);

-- 2. Create indexes for new columns if they don't exist
CREATE INDEX IF NOT EXISTS idx_staff_status ON public.staff (status);
CREATE INDEX IF NOT EXISTS idx_staff_department ON public.staff (department);
CREATE INDEX IF NOT EXISTS idx_staff_position ON public.staff ("position");
CREATE INDEX IF NOT EXISTS idx_staff_supervisor_id ON public.staff (supervisor_id);

-- 3. Fix policy conflicts by dropping and recreating
-- Drop existing policies (ignore errors if they don't exist)
DROP POLICY IF EXISTS "Invitations are viewable by invited admins" ON public.invitations;
DROP POLICY IF EXISTS "Admins can create invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can update their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Admins can delete their invitations" ON public.invitations;
DROP POLICY IF EXISTS "Anyone can view invitations by token" ON public.invitations;

-- 4. Recreate policies with proper column references
CREATE POLICY "Invitations are viewable by invited admins" 
  ON public.invitations FOR SELECT 
  USING (
    invited_by IN (
      SELECT p.id FROM public.profiles p
      JOIN public.user_roles ur ON p.id = ur.user_id
      WHERE ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can create invitations" 
  ON public.invitations FOR INSERT 
  WITH CHECK (
    invited_by IN (
      SELECT p.id FROM public.profiles p
      JOIN public.user_roles ur ON p.id = ur.user_id
      WHERE ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can update their invitations" 
  ON public.invitations FOR UPDATE 
  USING (
    invited_by IN (
      SELECT p.id FROM public.profiles p
      JOIN public.user_roles ur ON p.id = ur.user_id
      WHERE ur.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete their invitations" 
  ON public.invitations FOR DELETE 
  USING (
    invited_by IN (
      SELECT p.id FROM public.profiles p
      JOIN public.user_roles ur ON p.id = ur.user_id
      WHERE ur.role = 'admin'
    )
  );

CREATE POLICY "Anyone can view invitations by token" 
  ON public.invitations FOR SELECT 
  USING (true);

-- 5. Grant necessary permissions
GRANT SELECT ON public.invitations TO anon, authenticated;