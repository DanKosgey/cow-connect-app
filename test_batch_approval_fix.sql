-- Test script to verify the batch approval fix
-- Run this in your Supabase SQL Editor

-- First, let's check what collections exist for the specific collector and date
SELECT 
    'Pre-fix check' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.collection_date::date as collection_date_only,
    c.status,
    c.approved_for_company,
    c.staff_id
FROM public.collections c
WHERE c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
AND c.collection_date::date = '2025-11-19'
AND c.status = 'Collected'
AND c.approved_for_company = false;

-- Now test the batch approval function with the fix
-- Note: You'll need to replace the staff_id with a valid staff ID from your database
SELECT * FROM public.batch_approve_collector_collections(
    'f695826b-c5f1-4d12-b338-95e34a3165ea',  -- staff_id (replace with valid staff ID)
    '2ae103c4-0370-4b5e-9eea-6c9b7c226570',  -- collector_id
    '2025-11-19',  -- collection_date
    41  -- default_received_liters
);

-- Check if collections were approved
SELECT 
    'Post-fix check' as info_type,
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.staff_id,
    c.company_approval_id
FROM public.collections c
WHERE c.staff_id = '2ae103c4-0370-4b5e-9eea-6c9b7c226570'
AND c.collection_date::date = '2025-11-19';