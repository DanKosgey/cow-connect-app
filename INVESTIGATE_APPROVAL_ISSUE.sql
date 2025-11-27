-- ============================================
-- INVESTIGATE_APPROVAL_ISSUE.sql
-- Script to investigate why approved_by is null
-- ============================================

-- ============================================
-- 1. Check the collection record
-- ============================================
SELECT 
    'Collection record' as info,
    id,
    collection_id,
    staff_id,
    approved_for_company,
    company_approval_id,
    approved_by
FROM collections 
WHERE id = '1406f582-b7bf-4041-90d1-a00f8ebd54b8';

-- ============================================
-- 2. Check the milk approval record
-- ============================================
SELECT 
    'Milk approval record' as info,
    id,
    collection_id,
    staff_id,
    company_received_liters,
    variance_liters,
    variance_percentage,
    variance_type,
    penalty_amount,
    approved_at
FROM milk_approvals 
WHERE id = '051c8f27-91af-4231-8068-da8b804cc476';

-- ============================================
-- 3. Check if there's a trigger or function that should update approved_by
-- ============================================
SELECT 
    'Check for triggers on collections table' as info,
    tgname as trigger_name,
    tgtype as trigger_type
FROM pg_trigger 
WHERE tgrelid = 'collections'::regclass;

-- ============================================
-- 4. Check the collections table structure
-- ============================================
SELECT 
    'Collections table columns' as info,
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_name = 'collections' 
AND column_name IN ('approved_by', 'company_approval_id')
ORDER BY ordinal_position;

-- ============================================
-- 5. Check if there's a function that should update approved_by
-- ============================================
SELECT 
    'Check for functions that might update approved_by' as info,
    proname,
    prosrc
FROM pg_proc 
WHERE prosrc ILIKE '%approved_by%' 
AND proname ILIKE '%approval%' 
LIMIT 5;

-- ============================================
-- 6. Check the approval workflow function
-- ============================================
SELECT 
    'Batch approval function definition' as info,
    pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
WHERE proname = 'batch_approve_collector_collections';

-- ============================================
-- 7. Check for any triggers that might update collections
-- ============================================
SELECT 
    tgname as trigger_name,
    tgtype,
    tgenabled,
    pg_get_triggerdef(oid) as trigger_definition
FROM pg_trigger
WHERE tgrelid = 'collections'::regclass
ORDER BY tgname;