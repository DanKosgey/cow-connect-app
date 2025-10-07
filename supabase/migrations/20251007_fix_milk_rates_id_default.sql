-- Migration: 20251007_fix_milk_rates_id_default.sql
-- Description: Fix milk_rates table to ensure ID is auto-generated
-- Rollback: ALTER TABLE public.milk_rates ALTER COLUMN id DROP DEFAULT;

BEGIN;

-- Ensure pgcrypto extension is available
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Fix milk_rates table to ensure ID is auto-generated
-- The table currently uses bigserial which should auto-increment, but let's make it explicit
-- First, check if the sequence exists, if not create it
CREATE SEQUENCE IF NOT EXISTS milk_rates_id_seq AS bigint START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

-- Associate the sequence with the table column
ALTER SEQUENCE milk_rates_id_seq OWNED BY public.milk_rates.id;

-- Set the default to use the sequence
ALTER TABLE public.milk_rates ALTER COLUMN id SET DEFAULT nextval('milk_rates_id_seq');

-- Ensure the sequence is set to the correct value (max id + 1)
SELECT setval('milk_rates_id_seq', COALESCE((SELECT MAX(id) FROM public.milk_rates), 0) + 1, false);

COMMIT;