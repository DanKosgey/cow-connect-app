-- Migration: 20251015001200_create_market_prices_table.sql
-- Description: Create market_prices table for storing dairy product market prices
-- Rollback: DROP TABLE IF EXISTS public.market_prices CASCADE

BEGIN;

-- Create market_prices table following the same pattern as other tables
CREATE TABLE IF NOT EXISTS public.market_prices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product text NOT NULL,
  region text NOT NULL,
  price numeric NOT NULL,
  previous_price numeric,
  change numeric,
  change_percent numeric,
  updated_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_market_prices_product ON public.market_prices (product);
CREATE INDEX IF NOT EXISTS idx_market_prices_region ON public.market_prices (region);
CREATE INDEX IF NOT EXISTS idx_market_prices_updated_at ON public.market_prices (updated_at DESC);

COMMIT;