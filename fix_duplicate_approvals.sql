-- SQL script to fix duplicate approvals in milk_approvals table
-- Run this in your Supabase SQL Editor

BEGIN;

-- 1. First, let's identify duplicate approvals for the same collection
-- This will show us collections that have been approved multiple times
SELECT 
    collection_id,
    COUNT(*) as approval_count,
    ARRAY_AGG(id) as approval_ids,
    ARRAY_AGG(approved_at ORDER BY approved_at DESC) as approval_times
FROM public.milk_approvals
GROUP BY collection_id
HAVING COUNT(*) > 1
ORDER BY approval_count DESC;

-- 2. Identify the most recent approval for each collection and mark duplicates
-- We'll keep the most recent approval and mark others as deleted (or delete them)
WITH ranked_approvals AS (
    SELECT 
        id,
        collection_id,
        approved_at,
        ROW_NUMBER() OVER (PARTITION BY collection_id ORDER BY approved_at DESC) as rn
    FROM public.milk_approvals
),
duplicate_approvals AS (
    SELECT id, collection_id, approved_at
    FROM ranked_approvals
    WHERE rn > 1
)
-- Show what would be deleted
SELECT 
    da.id as duplicate_approval_id,
    da.collection_id,
    da.approved_at,
    c.liters as collection_liters,
    c.farmer_id
FROM duplicate_approvals da
JOIN public.collections c ON da.collection_id = c.id
ORDER BY da.collection_id, da.approved_at DESC;

-- 3. Delete duplicate approvals, keeping only the most recent one for each collection
WITH ranked_approvals AS (
    SELECT 
        id,
        collection_id,
        approved_at,
        ROW_NUMBER() OVER (PARTITION BY collection_id ORDER BY approved_at DESC) as rn
    FROM public.milk_approvals
)
DELETE FROM public.milk_approvals
WHERE id IN (
    SELECT id
    FROM ranked_approvals
    WHERE rn > 1
);

-- 4. Add a unique constraint to prevent future duplicates
-- This will ensure that each collection can only have one approval
ALTER TABLE public.milk_approvals
ADD CONSTRAINT unique_collection_approval 
UNIQUE (collection_id);

-- 5. Verify the fix by checking for duplicates again
SELECT 
    collection_id,
    COUNT(*) as approval_count
FROM public.milk_approvals
GROUP BY collection_id
HAVING COUNT(*) > 1;

-- 6. Test the relationship query that was failing
SELECT 
    ma.id as approval_id,
    ma.collection_id,
    ma.company_received_liters,
    ma.variance_liters,
    ma.approved_at,
    c.liters as collected_liters,
    c.collection_date,
    c.farmer_id
FROM public.milk_approvals ma
JOIN public.collections c ON ma.collection_id = c.id
LIMIT 10;

COMMIT;