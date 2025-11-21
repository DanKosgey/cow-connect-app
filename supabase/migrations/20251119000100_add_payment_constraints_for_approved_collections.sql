-- Migration: Add database constraints to prevent payments for unapproved collections
-- Description: Add constraints and triggers to ensure only approved collections can be processed for payments

BEGIN;

-- Create a function to validate that collections are approved before payment processing
CREATE OR REPLACE FUNCTION validate_collection_approved_for_payment()
RETURNS TRIGGER AS $$
BEGIN
  -- Check if this is an insert or update on farmer_payments or collection_payments
  IF TG_TABLE_NAME = 'farmer_payments' THEN
    -- For farmer_payments, check that all referenced collections are approved for payment
    IF EXISTS (
      SELECT 1 
      FROM collections c
      WHERE c.id = ANY(NEW.collection_ids)
      AND c.approved_for_payment = false
    ) THEN
      RAISE EXCEPTION 'Cannot create payment for unapproved collections. All collections must be approved for payment first.';
    END IF;
  ELSIF TG_TABLE_NAME = 'collection_payments' THEN
    -- For collection_payments, check that the specific collection is approved for payment
    IF EXISTS (
      SELECT 1 
      FROM collections c
      WHERE c.id = NEW.collection_id
      AND c.approved_for_payment = false
    ) THEN
      RAISE EXCEPTION 'Cannot create payment for unapproved collection. Collection must be approved for payment first.';
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for farmer_payments table
DROP TRIGGER IF EXISTS validate_collections_before_farmer_payment ON farmer_payments;
CREATE TRIGGER validate_collections_before_farmer_payment
  BEFORE INSERT OR UPDATE ON farmer_payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_collection_approved_for_payment();

-- Create trigger for collection_payments table
DROP TRIGGER IF EXISTS validate_collection_before_payment ON collection_payments;
CREATE TRIGGER validate_collection_before_payment
  BEFORE INSERT OR UPDATE ON collection_payments
  FOR EACH ROW
  EXECUTE FUNCTION validate_collection_approved_for_payment();

-- Add a check constraint to collections table to ensure approved collections have proper status
ALTER TABLE collections 
ADD CONSTRAINT check_approved_collections_status
CHECK (
  approved_for_payment = false OR 
  (approved_for_payment = true AND status IN ('Collected', 'Verified', 'Paid'))
);

-- Create index for better performance on the approval check
CREATE INDEX IF NOT EXISTS idx_collections_approved_for_payment_status 
ON collections (approved_for_payment, status);

COMMIT;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that triggers were created
SELECT tgname, tgtype, tgtable 
FROM pg_trigger 
WHERE tgname IN ('validate_collections_before_farmer_payment', 'validate_collection_before_payment');

-- Check that constraint was added
SELECT conname, conkey 
FROM pg_constraint 
WHERE conname = 'check_approved_collections_status';

-- Check index was created
SELECT indexname 
FROM pg_indexes 
WHERE indexname = 'idx_collections_approved_for_payment_status';