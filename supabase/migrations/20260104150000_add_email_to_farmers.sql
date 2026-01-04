-- Add missing columns to farmers table
-- These columns are needed for the approve_pending_farmer function to work correctly
-- The function copies data from pending_farmers to farmers, so they need matching columns

-- Add email column
ALTER TABLE farmers 
ADD COLUMN IF NOT EXISTS email TEXT;

-- Add gender column
ALTER TABLE farmers 
ADD COLUMN IF NOT EXISTS gender TEXT CHECK (gender IN ('male', 'female', 'other', 'Male', 'Female', 'Other'));

-- Add number_of_cows column
ALTER TABLE farmers 
ADD COLUMN IF NOT EXISTS number_of_cows INTEGER;

-- Add feeding_type column
ALTER TABLE farmers 
ADD COLUMN IF NOT EXISTS feeding_type TEXT CHECK (feeding_type IN ('zero_grazing', 'field_grazing', 'mixed'));

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_farmers_email ON farmers(email);
CREATE INDEX IF NOT EXISTS idx_farmers_gender ON farmers(gender);
CREATE INDEX IF NOT EXISTS idx_farmers_feeding_type ON farmers(feeding_type);

-- Optional: Add unique constraint on email (uncomment if you want emails to be unique)
-- ALTER TABLE farmers ADD CONSTRAINT farmers_email_unique UNIQUE (email);
