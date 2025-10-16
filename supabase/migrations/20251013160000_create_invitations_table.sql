-- Migration: 20251013160000_create_invitations_table.sql
-- Description: Create invitations table for user invitation system
-- Rollback: DROP TABLE IF EXISTS public.invitations CASCADE

BEGIN;

-- Create invitations table
CREATE TABLE IF NOT EXISTS public.invitations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  role user_role_enum NOT NULL,
  token text UNIQUE NOT NULL,
  invited_by uuid REFERENCES public.profiles(id) ON DELETE CASCADE,
  message text,
  accepted boolean DEFAULT false,
  accepted_at timestamptz,
  expires_at timestamptz NOT NULL,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_email ON public.invitations (email);
CREATE INDEX IF NOT EXISTS idx_invitations_token ON public.invitations (token);
CREATE INDEX IF NOT EXISTS idx_invitations_invited_by ON public.invitations (invited_by);
CREATE INDEX IF NOT EXISTS idx_invitations_accepted ON public.invitations (accepted);
CREATE INDEX IF NOT EXISTS idx_invitations_expires_at ON public.invitations (expires_at);

-- Enable RLS (Row Level Security)
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;

-- Create policies
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

-- Create function to clean up expired invitations
CREATE OR REPLACE FUNCTION public.cleanup_expired_invitations()
RETURNS void AS $$
BEGIN
  DELETE FROM public.invitations 
  WHERE expires_at < NOW() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_invitations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_invitations_updated_at_trigger
  BEFORE UPDATE ON public.invitations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_invitations_updated_at();

COMMIT;