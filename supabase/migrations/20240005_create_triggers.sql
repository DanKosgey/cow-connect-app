-- Migration: 20240005_create_triggers.sql
-- Description: Create triggers for updated_at, audit logging, and notifications
BEGIN;

-- Trigger function for audit logging
CREATE OR REPLACE FUNCTION public.audit_log_trigger()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    INSERT INTO public.audit_logs(table_name, record_id, operation, changed_by, changed_at, new_data)
    VALUES (TG_TABLE_NAME, NEW.id::text, 'INSERT', current_setting('jwt.claims.user_id', true)::uuid, now(), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'UPDATE') THEN
    INSERT INTO public.audit_logs(table_name, record_id, operation, changed_by, changed_at, old_data, new_data)
    VALUES (TG_TABLE_NAME, COALESCE(NEW.id, OLD.id)::text, 'UPDATE', current_setting('jwt.claims.user_id', true)::uuid, now(), to_jsonb(OLD), to_jsonb(NEW));
    RETURN NEW;
  ELSIF (TG_OP = 'DELETE') THEN
    INSERT INTO public.audit_logs(table_name, record_id, operation, changed_by, changed_at, old_data)
    VALUES (TG_TABLE_NAME, OLD.id::text, 'DELETE', current_setting('jwt.claims.user_id', true)::uuid, now(), to_jsonb(OLD));
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

-- Attach update_updated_at trigger to many tables
-- We'll attach to profiles, farmers, collections, payments, kyc_documents, farmer_analytics
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_profiles') THEN
    CREATE TRIGGER set_updated_at_profiles
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_farmers') THEN
    CREATE TRIGGER set_updated_at_farmers
    BEFORE UPDATE ON public.farmers
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'set_updated_at_collections') THEN
    CREATE TRIGGER set_updated_at_collections
    BEFORE UPDATE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_on_farmers') THEN
    CREATE TRIGGER audit_on_farmers
    AFTER INSERT OR UPDATE OR DELETE ON public.farmers
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'audit_on_collections') THEN
    CREATE TRIGGER audit_on_collections
    AFTER INSERT OR UPDATE OR DELETE ON public.collections
    FOR EACH ROW EXECUTE FUNCTION public.audit_log_trigger();
  END IF;
END$$;

-- Notify admin when new farmer registers
CREATE OR REPLACE FUNCTION public.notify_admin_new_registration()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  admin_user public.user_roles%ROWTYPE;
BEGIN
  -- Insert notification for all admins
  INSERT INTO public.notifications (user_id, title, message, type, category)
  SELECT ur.user_id, 'New Farmer Registration', 'A new farmer has registered and requires KYC review', 'info', 'kyc'
  FROM public.user_roles ur WHERE ur.role = 'admin' AND ur.active;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'notify_admin_on_farmer_insert') THEN
    CREATE TRIGGER notify_admin_on_farmer_insert
    AFTER INSERT ON public.farmers
    FOR EACH ROW WHEN (NEW.kyc_status = 'pending')
    EXECUTE FUNCTION public.notify_admin_new_registration();
  END IF;
END$$;

COMMIT;
