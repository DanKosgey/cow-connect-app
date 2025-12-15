-- SQL script to fix relationships between milk_approvals and collections tables
-- Run this in your Supabase SQL Editor

BEGIN;

-- 1. Verify the foreign key constraint exists between milk_approvals.collection_id and collections.id
-- First check if the constraint already exists
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'milk_approvals' 
    AND kcu.column_name = 'collection_id';

-- 2. If the foreign key constraint doesn't exist, create it
-- (This will likely show a notice if it already exists)
ALTER TABLE public.milk_approvals
ADD CONSTRAINT fk_milk_approvals_collection_id
FOREIGN KEY (collection_id)
REFERENCES public.collections (id)
ON DELETE CASCADE;

-- 3. Verify the foreign key constraint exists between milk_approvals.staff_id and staff.id
SELECT 
    tc.table_name, 
    tc.constraint_name, 
    tc.constraint_type,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
WHERE tc.table_name = 'milk_approvals' 
    AND kcu.column_name = 'staff_id';

-- 4. If the foreign key constraint doesn't exist, create it
ALTER TABLE public.milk_approvals
ADD CONSTRAINT fk_milk_approvals_staff_id
FOREIGN KEY (staff_id)
REFERENCES public.staff (id);

-- 5. Refresh the PostgREST schema cache to recognize the new relationships
NOTIFY pgrst, 'reload schema';

-- 6. Test the relationship with a simple query
SELECT 
    ma.id,
    ma.collection_id,
    c.id as collection_id_check
FROM public.milk_approvals ma
JOIN public.collections c ON ma.collection_id = c.id
LIMIT 1;

COMMIT;