-- Migration: 20251013200000_add_missing_indexes_and_constraints.sql
-- Description: Add missing indexes and constraints for better performance and data integrity
-- Rollback: DROP INDEX IF EXISTS idx_collections_farmer_id; DROP INDEX IF EXISTS idx_collections_staff_id; DROP INDEX IF EXISTS idx_payments_farmer_id; DROP INDEX IF EXISTS idx_farmers_user_id; DROP INDEX IF EXISTS idx_staff_user_id; DROP INDEX IF EXISTS idx_user_roles_user_id;

BEGIN;

-- Add missing indexes on foreign key columns for better performance
CREATE INDEX IF NOT EXISTS idx_collections_farmer_id ON public.collections (farmer_id);
CREATE INDEX IF NOT EXISTS idx_collections_staff_id ON public.collections (staff_id);
CREATE INDEX IF NOT EXISTS idx_payments_farmer_id ON public.payments (farmer_id);
CREATE INDEX IF NOT EXISTS idx_farmers_user_id ON public.farmers (user_id);
CREATE INDEX IF NOT EXISTS idx_staff_user_id ON public.staff (user_id);
CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON public.user_roles (user_id);
CREATE INDEX IF NOT EXISTS idx_kyc_documents_farmer_id ON public.kyc_documents (farmer_id);
CREATE INDEX IF NOT EXISTS idx_collection_payments_collection_id ON public.collection_payments (collection_id);
CREATE INDEX IF NOT EXISTS idx_collection_payments_payment_id ON public.collection_payments (payment_id);
CREATE INDEX IF NOT EXISTS idx_milk_quality_parameters_collection_id ON public.milk_quality_parameters (collection_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications (user_id);
CREATE INDEX IF NOT EXISTS idx_auth_events_user_id ON public.auth_events (user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON public.user_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_uploaded_by ON public.file_uploads (uploaded_by);

-- Add check constraints for data validation
ALTER TABLE public.collections 
  ADD CONSTRAINT chk_collections_liters_positive CHECK (liters >= 0),
  ADD CONSTRAINT chk_collections_rate_per_liter_positive CHECK (rate_per_liter >= 0);

ALTER TABLE public.payments 
  ADD CONSTRAINT chk_payments_amount_positive CHECK (amount >= 0);

ALTER TABLE public.farmers
  ADD CONSTRAINT chk_farmers_phone_number_format CHECK (phone_number ~ '^[0-9+\-\s\(\)]+$');

ALTER TABLE public.profiles
  ADD CONSTRAINT chk_profiles_phone_format CHECK (phone IS NULL OR phone ~ '^[0-9+\-\s\(\)]+$');

-- Add updated_at triggers for tables that are missing them
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for tables that don't have them
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_farmers_updated_at') THEN
        CREATE TRIGGER update_farmers_updated_at
        BEFORE UPDATE ON public.farmers
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_staff_updated_at') THEN
        CREATE TRIGGER update_staff_updated_at
        BEFORE UPDATE ON public.staff
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_user_roles_updated_at') THEN
        CREATE TRIGGER update_user_roles_updated_at
        BEFORE UPDATE ON public.user_roles
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_kyc_documents_updated_at') THEN
        CREATE TRIGGER update_kyc_documents_updated_at
        BEFORE UPDATE ON public.kyc_documents
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_file_uploads_updated_at') THEN
        CREATE TRIGGER update_file_uploads_updated_at
        BEFORE UPDATE ON public.file_uploads
        FOR EACH ROW
        EXECUTE FUNCTION public.update_updated_at_column();
    END IF;
END $$;

COMMIT;