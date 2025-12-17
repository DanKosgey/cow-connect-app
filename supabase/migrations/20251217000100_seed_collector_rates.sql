-- Migration: 20251217000100_seed_collector_rates.sql
-- Description: Seed initial collector rates data
BEGIN;

-- Insert a default collector rate of 48.78 (as seen in the collections)
INSERT INTO public.collector_rates (rate_per_liter, is_active, effective_from)
VALUES (48.78, true, NOW())
ON CONFLICT DO NOTHING;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that the rate was inserted
SELECT * FROM public.collector_rates;

-- Test the function
SELECT public.get_current_collector_rate();