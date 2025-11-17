-- Migration: 99990005_standardize_naming_conventions.sql
-- Description: Standardize migration file naming conventions
-- This migration doesn't change the database but serves as a marker for future migrations
-- to follow a consistent naming pattern: YYYYMMDDHHMMSS_description.sql

-- No database changes in this migration

-- Going forward, all new migrations should follow the pattern:
-- YYYYMMDDHHMMSS_short_description_of_changes.sql
-- For example: 20251117120000_add_new_user_field.sql

-- This ensures:
-- 1. Consistent chronological ordering
-- 2. Clear descriptions of changes
-- 3. No naming conflicts
-- 4. Easy identification of migration purpose

-- Future migrations should be named with the current timestamp followed by a descriptive name
-- This helps avoid the "multiple heads" issue that can occur with inconsistent naming

-- Example of proper naming:
-- 20251117120000_add_farmer_bio_field.sql
-- 20251117120500_create_notification_preferences_table.sql
-- 20251117121000_add_payment_reference_index.sql

-- Verification: Check current migration file names
-- This should be done manually by reviewing the migrations directory