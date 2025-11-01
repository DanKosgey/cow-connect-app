-- Migration: Create credit defaults management tables
-- Description: Tables for tracking farmer credit defaults and recovery actions

BEGIN;

-- Create credit_defaults table
CREATE TABLE IF NOT EXISTS public.credit_defaults (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    farmer_id UUID NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
    overdue_amount DECIMAL(10,2) NOT NULL,
    days_overdue INTEGER NOT NULL,
    status TEXT DEFAULT 'overdue' CHECK (status IN ('overdue', 'past_due', 'severely_overdue', 'resolved')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create recovery_actions table
CREATE TABLE IF NOT EXISTS public.recovery_actions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_id UUID NOT NULL REFERENCES public.credit_defaults(id) ON DELETE CASCADE,
    action_type TEXT NOT NULL CHECK (action_type IN ('withhold_credit', 'suspend_credit', 'schedule_visit', 'escalate', 'close_account')),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed')),
    notes TEXT,
    created_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create contact_history table
CREATE TABLE IF NOT EXISTS public.contact_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    default_id UUID NOT NULL REFERENCES public.credit_defaults(id) ON DELETE CASCADE,
    contact_method TEXT NOT NULL CHECK (contact_method IN ('sms', 'email', 'visit')),
    notes TEXT NOT NULL,
    contacted_by UUID REFERENCES public.staff(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_credit_defaults_farmer_id ON public.credit_defaults(farmer_id);
CREATE INDEX IF NOT EXISTS idx_credit_defaults_status ON public.credit_defaults(status);
CREATE INDEX IF NOT EXISTS idx_credit_defaults_days_overdue ON public.credit_defaults(days_overdue);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_default_id ON public.recovery_actions(default_id);
CREATE INDEX IF NOT EXISTS idx_recovery_actions_status ON public.recovery_actions(status);
CREATE INDEX IF NOT EXISTS idx_contact_history_default_id ON public.contact_history(default_id);
CREATE INDEX IF NOT EXISTS idx_contact_history_contact_method ON public.contact_history(contact_method);

-- Enable RLS
ALTER TABLE public.credit_defaults ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.recovery_actions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_history ENABLE ROW LEVEL SECURITY;

-- RLS policies for credit_defaults
DO $$ 
BEGIN
  -- Admins and staff can view all credit defaults
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins and staff can view all credit defaults' 
    AND pc.relname = 'credit_defaults'
  ) THEN
    CREATE POLICY "Admins and staff can view all credit defaults" 
      ON public.credit_defaults FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Only admins can insert/update credit defaults
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can manage credit defaults' 
    AND pc.relname = 'credit_defaults'
  ) THEN
    CREATE POLICY "Admins can manage credit defaults" 
      ON public.credit_defaults FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS policies for recovery_actions
DO $$ 
BEGIN
  -- Admins and staff can view all recovery actions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins and staff can view all recovery actions' 
    AND pc.relname = 'recovery_actions'
  ) THEN
    CREATE POLICY "Admins and staff can view all recovery actions" 
      ON public.recovery_actions FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Only admins can insert/update recovery actions
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can manage recovery actions' 
    AND pc.relname = 'recovery_actions'
  ) THEN
    CREATE POLICY "Admins can manage recovery actions" 
      ON public.recovery_actions FOR ALL 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- RLS policies for contact_history
DO $$ 
BEGIN
  -- Admins and staff can view all contact history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins and staff can view all contact history' 
    AND pc.relname = 'contact_history'
  ) THEN
    CREATE POLICY "Admins and staff can view all contact history" 
      ON public.contact_history FOR SELECT 
      USING (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role IN ('admin', 'staff')
        )
      );
  END IF;

  -- Only admins can insert contact history
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy pol
    JOIN pg_class pc ON pc.oid = pol.polrelid
    WHERE pol.polname = 'Admins can create contact history' 
    AND pc.relname = 'contact_history'
  ) THEN
    CREATE POLICY "Admins can create contact history" 
      ON public.contact_history FOR INSERT 
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.user_roles ur 
          WHERE ur.user_id = auth.uid() AND ur.role = 'admin'
        )
      );
  END IF;
END $$;

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
DROP TRIGGER IF EXISTS update_credit_defaults_updated_at ON public.credit_defaults;
CREATE TRIGGER update_credit_defaults_updated_at
  BEFORE UPDATE ON public.credit_defaults
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_recovery_actions_updated_at ON public.recovery_actions;
CREATE TRIGGER update_recovery_actions_updated_at
  BEFORE UPDATE ON public.recovery_actions
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Grant permissions
GRANT ALL ON public.credit_defaults TO authenticated;
GRANT ALL ON public.recovery_actions TO authenticated;
GRANT ALL ON public.contact_history TO authenticated;

COMMIT;