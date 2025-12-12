-- Check all payment-related tables
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%payment%';

-- Check if payment_batches table exists
SELECT EXISTS (
   SELECT FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_name = 'payment_batches'
);

-- Check table structure for payment_batches if it exists
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'payment_batches'
ORDER BY ordinal_position;

-- Check for any RLS policies on payment_batches
SELECT polname, relname
FROM pg_policy pol
JOIN pg_class pc ON pc.oid = pol.polrelid
WHERE pc.relname = 'payment_batches';