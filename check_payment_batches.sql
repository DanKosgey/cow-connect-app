-- Check if payment_batches table exists
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'payment_batches';

-- If it exists, show its structure
\d payment_batches

-- Check if there are any records in the table
SELECT COUNT(*) as record_count FROM payment_batches;

-- Check for similar table names
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name ILIKE '%batch%';