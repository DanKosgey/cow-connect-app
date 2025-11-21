-- Migration script to fix batch approval data issues
-- This script identifies and fixes any data inconsistencies related to staff IDs in milk approvals

BEGIN;

-- 1. Find any milk approvals where the staff_id refers to a user_id instead of a staff_id
-- This would be identified by checking if the staff_id exists in the auth.users table but not in the staff table
CREATE TEMP TABLE temp_user_staff_mismatch AS
SELECT 
    ma.id as approval_id,
    ma.staff_id as user_id,
    s.id as correct_staff_id,
    ma.collection_id,
    ma.created_at
FROM public.milk_approvals ma
JOIN auth.users u ON ma.staff_id = u.id  -- This staff_id is actually a user_id
LEFT JOIN public.staff s ON u.id = s.user_id  -- Find the correct staff_id
WHERE NOT EXISTS (
    SELECT 1 FROM public.staff WHERE id = ma.staff_id  -- staff_id doesn't exist in staff table
)
AND s.id IS NOT NULL;  -- But there is a corresponding staff record

-- 2. Count how many records need to be fixed
DO $$
DECLARE
    mismatch_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO mismatch_count FROM temp_user_staff_mismatch;
    
    RAISE NOTICE 'Found % milk approval records with user_id/staff_id mismatch', mismatch_count;
    
    -- 3. Fix the mismatched records
    IF mismatch_count > 0 THEN
        UPDATE public.milk_approvals ma
        SET staff_id = t.correct_staff_id
        FROM temp_user_staff_mismatch t
        WHERE ma.id = t.approval_id;
        
        RAISE NOTICE 'Fixed % milk approval records', mismatch_count;
    END IF;
END $$;

-- 4. Verify the fix by checking that all staff_ids in milk_approvals now exist in the staff table
DO $$
DECLARE
    invalid_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO invalid_count
    FROM public.milk_approvals ma
    WHERE NOT EXISTS (
        SELECT 1 FROM public.staff s WHERE s.id = ma.staff_id
    );
    
    IF invalid_count > 0 THEN
        RAISE WARNING 'Found % milk approval records with invalid staff_id references', invalid_count;
    ELSE
        RAISE NOTICE 'All milk approval records have valid staff_id references';
    END IF;
END $$;

-- 5. Clean up
DROP TABLE IF EXISTS temp_user_staff_mismatch;

COMMIT;

-- 6. Additional verification queries (can be run separately)
/*
-- Check for any collections that were approved but don't have a valid staff_id in milk_approvals
SELECT 
    c.id as collection_id,
    c.collection_id as collection_ref,
    c.liters,
    c.collection_date,
    ma.staff_id as current_staff_id
FROM public.collections c
JOIN public.milk_approvals ma ON c.company_approval_id = ma.id
WHERE NOT EXISTS (
    SELECT 1 FROM public.staff s WHERE s.id = ma.staff_id
);

-- Check for any recent batch approvals that might have failed
SELECT 
    al.id,
    al.description,
    al.created_at,
    al.new_data->>'staff_name' as staff_name
FROM public.audit_logs al
WHERE al.operation = 'batch_approve_collections'
AND al.created_at > NOW() - INTERVAL '7 days'
ORDER BY al.created_at DESC;
*/