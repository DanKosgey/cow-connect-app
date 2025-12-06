-- Migration: 99990006_remove_quality_tables.sql
-- Description: Remove quality-related tables and columns as quality measurement is no longer required
-- This migration removes all database objects related to milk quality measurement

BEGIN;

-- Drop the milk_quality_parameters table
DROP TABLE IF EXISTS public.milk_quality_parameters CASCADE;

-- Remove quality_grade column from collections table
ALTER TABLE public.collections 
DROP COLUMN IF EXISTS quality_grade;

-- Drop the quality_grade_enum type if it's no longer used
DO $$ 
BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quality_grade_enum') THEN
    DROP TYPE IF EXISTS quality_grade_enum CASCADE;
  END IF;
END $$;

COMMIT;

-- Verification queries
-- Check that milk_quality_parameters table no longer exists
SELECT tablename FROM pg_tables WHERE tablename = 'milk_quality_parameters';

-- Check that quality_grade column no longer exists in collections table
SELECT column_name 
FROM information_schema.columns 
WHERE table_name = 'collections' AND column_name = 'quality_grade';

-- Check that quality_grade_enum type no longer exists
SELECT typname FROM pg_type WHERE typname = 'quality_grade_enum';