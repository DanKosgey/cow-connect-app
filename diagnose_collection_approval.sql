-- Diagnostic script to check if collections are properly approved
-- Run this in your Supabase SQL Editor

-- 1. Check recently approved collections
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.company_approval_id,
    c.created_at,
    c.updated_at,
    ma.id as approval_id,
    ma.staff_id,
    ma.company_received_liters,
    ma.variance_liters,
    ma.variance_percentage,
    ma.penalty_amount,
    ma.created_at as approval_created_at
FROM public.collections c
LEFT JOIN public.milk_approvals ma ON c.company_approval_id = ma.id
WHERE c.collection_date >= CURRENT_DATE - INTERVAL '7 days'
AND c.status = 'Collected'
ORDER BY c.collection_date DESC, c.created_at DESC
LIMIT 20;

-- 2. Check collections that might be incorrectly showing as unapproved
-- These should NOT appear in the pending collections list
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.company_approval_id,
    c.created_at,
    c.updated_at
FROM public.collections c
WHERE c.collection_date >= CURRENT_DATE - INTERVAL '7 days'
AND c.status = 'Collected'
AND c.approved_for_company = true
AND c.company_approval_id IS NOT NULL
ORDER BY c.collection_date DESC, c.created_at DESC
LIMIT 20;

-- 3. Check for any collections that have approval records but are not marked as approved
-- This would indicate a data inconsistency
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.company_approval_id,
    c.created_at,
    c.updated_at,
    ma.id as approval_id,
    ma.staff_id,
    ma.company_received_liters,
    ma.created_at as approval_created_at
FROM public.collections c
JOIN public.milk_approvals ma ON c.company_approval_id = ma.id
WHERE c.collection_date >= CURRENT_DATE - INTERVAL '7 days'
AND c.status = 'Collected'
AND c.approved_for_company = false  -- This is the inconsistency
ORDER BY c.collection_date DESC, c.created_at DESC
LIMIT 20;

-- 4. Check the audit logs for recent batch approvals
SELECT 
    al.id,
    al.table_name,
    al.operation,
    al.changed_by,
    al.new_data,
    al.created_at
FROM public.audit_logs al
WHERE al.operation = 'batch_approve_collections'
AND al.created_at >= CURRENT_DATE - INTERVAL '7 days'
ORDER BY al.created_at DESC
LIMIT 20;

-- 5. Check for any collections that might have been approved but not updated properly
-- Look for collections with very recent updates
SELECT 
    c.id,
    c.collection_id,
    c.liters,
    c.collection_date,
    c.status,
    c.approved_for_company,
    c.company_approval_id,
    c.created_at,
    c.updated_at
FROM public.collections c
WHERE c.updated_at >= CURRENT_DATE - INTERVAL '1 day'
AND c.status = 'Collected'
ORDER BY c.updated_at DESC
LIMIT 20;