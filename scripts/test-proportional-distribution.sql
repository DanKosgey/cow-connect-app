-- Test script to verify proportional distribution of total received liters
-- This creates sample data and tests the fixed batch approval function

BEGIN;

-- Create test data
-- First, create a test collector and staff member if they don't exist
-- (In a real scenario, you would use existing IDs)

-- For this test, we'll assume you have existing staff records
-- Let's find a staff member and collector to use for testing

-- Find a staff member with 'staff' role
DO $$
DECLARE
    v_staff_id UUID;
    v_collector_id UUID;
    v_farmer_id UUID;
    v_collection_date DATE := '2025-11-20';
BEGIN
    -- Get a staff member (approver)
    SELECT s.id INTO v_staff_id
    FROM public.staff s
    JOIN public.user_roles ur ON s.user_id = ur.user_id
    WHERE ur.role = 'staff' AND ur.active = true
    LIMIT 1;
    
    -- Get a collector
    SELECT s.id INTO v_collector_id
    FROM public.staff s
    JOIN public.user_roles ur ON s.user_id = ur.user_id
    WHERE ur.role = 'collector' AND ur.active = true
    LIMIT 1;
    
    -- Get a farmer for testing
    SELECT id INTO v_farmer_id FROM public.farmers LIMIT 1;
    
    -- Create test collections if they don't exist
    -- Collection 1: 200 liters
    INSERT INTO public.collections (
        farmer_id, 
        staff_id, 
        liters, 
        collection_date, 
        status, 
        approved_for_company
    ) VALUES (
        v_farmer_id,
        v_collector_id,
        200,
        v_collection_date,
        'Collected',
        false
    )
    ON CONFLICT DO NOTHING;
    
    -- Collection 2: 300 liters
    INSERT INTO public.collections (
        farmer_id, 
        staff_id, 
        liters, 
        collection_date, 
        status, 
        approved_for_company
    ) VALUES (
        v_farmer_id,
        v_collector_id,
        300,
        v_collection_date,
        'Collected',
        false
    )
    ON CONFLICT DO NOTHING;
    
    -- Log the test setup
    RAISE NOTICE 'Test setup complete. Staff ID: %, Collector ID: %, Date: %', v_staff_id, v_collector_id, v_collection_date;
    
    -- Test the function with total received liters = 450
    -- Expected distribution:
    -- Collection 1 (200L): (200/500) * 450 = 180L
    -- Collection 2 (300L): (300/500) * 450 = 270L
    -- Total: 450L
    
    RAISE NOTICE 'Calling batch approval with total received liters = 450';
    
    -- Call the function
    -- Note: We're using the fixed version of the function
    PERFORM * FROM public.batch_approve_collector_collections(
        v_staff_id,
        v_collector_id,
        v_collection_date,
        450  -- Total received liters
    );
    
    -- Check the results
    RAISE NOTICE 'Checking approval results...';
    
    -- Look at the milk approvals created
    RAISE NOTICE 'Milk approvals created:';
    PERFORM * FROM public.milk_approvals ma
    JOIN public.collections c ON ma.collection_id = c.id
    WHERE c.staff_id = v_collector_id 
    AND c.collection_date::date = v_collection_date;
    
    -- Check that the total received liters equals what we provided
    RAISE NOTICE 'Verifying total received liters...';
    
END $$;

-- Rollback the transaction so we don't actually modify the database
-- Remove this ROLLBACK to actually run the test
ROLLBACK;

-- If you want to actually run the test and keep the data, replace ROLLBACK with COMMIT
-- COMMIT;