-- Migration: 20240006_seed_data.sql
-- Description: Seed initial data for roles, permissions, system settings, and a placeholder admin profile.
BEGIN;
-- Seed role permissions (example)
INSERT INTO public.role_permissions (role, permission)
VALUES
  ('admin', 'manage_users'),
  ('admin', 'manage_kyc'),
  ('staff', 'record_collections'),
  ('farmer', 'view_own_data')
ON CONFLICT DO NOTHING;
-- Example system settings
INSERT INTO public.system_settings (key, value)
VALUES ('site.metadata', '{"name":"Cow Connect"}')
ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value, updated_at = now();
-- Example active milk rate
INSERT INTO public.milk_rates (rate_per_liter, is_active)
VALUES (20.0, true)
ON CONFLICT DO NOTHING;
-- Create a placeholder admin profile (this should be linked to auth.users in production)
-- Use a deterministic UUID for convenience (replace in prod)
INSERT INTO public.profiles (id, full_name, email, phone)
VALUES ('00000000-0000-0000-0000-000000000001', 'System Admin', 'admin@example.com', '0000000000')
ON CONFLICT (id) DO NOTHING;
INSERT INTO public.user_roles (user_id, role, active)
VALUES ('00000000-0000-0000-0000-000000000001', 'admin', true)
ON CONFLICT DO NOTHING;
COMMIT;
