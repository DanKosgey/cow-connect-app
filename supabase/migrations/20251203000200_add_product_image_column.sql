-- Migration: Add image column to agrovet_inventory table
-- Description: Add support for product images in the agrovet inventory system
-- Estimated time: 10 seconds

BEGIN;

-- Add image_url column to agrovet_inventory table
ALTER TABLE public.agrovet_inventory 
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add image_alt_text column for accessibility
ALTER TABLE public.agrovet_inventory 
ADD COLUMN IF NOT EXISTS image_alt_text TEXT;

-- Create index for better query performance on image_url
CREATE INDEX IF NOT EXISTS idx_agrovet_inventory_image_url 
ON public.agrovet_inventory(image_url);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that columns were added
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'agrovet_inventory' 
AND column_name IN ('image_url', 'image_alt_text')
ORDER BY column_name;

-- ============================================
-- DOWN MIGRATION (Rollback)
-- ============================================

/*
BEGIN;

-- Remove columns
ALTER TABLE public.agrovet_inventory 
DROP COLUMN IF EXISTS image_url;

ALTER TABLE public.agrovet_inventory 
DROP COLUMN IF EXISTS image_alt_text;

COMMIT;
*/