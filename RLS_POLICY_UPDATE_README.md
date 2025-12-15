# RLS Policy Update for Staff Approval of Collector Collections

## Overview
This document explains how to update the Row Level Security (RLS) policies to allow staff members (supervisors) to approve collections made by collectors, while maintaining appropriate security boundaries.

## Problem Statement
Currently, staff members can only approve collections they themselves collected due to restrictive RLS policies. The requirement is to allow staff members (supervisors) to approve collections made by collectors, while collectors can only approve their own collections.

## Available Migration Options

### Option 1: Targeted Staff Approval Policy (Recommended)
**File:** `202512150003_targeted_staff_approval_policy.sql`

This is the recommended approach as it:
- Allows staff members to view and approve ANY collections (supervisor role)
- Restricts collectors to only view and approve their OWN collections
- Maintains admin privileges to view and approve all collections
- Provides clear separation of responsibilities

### Option 2: Simplified Policy
**File:** `202512150002_simplified_staff_approval_policy.sql`

This approach:
- Allows both staff and collectors to approve collections
- Is simpler but less restrictive than Option 1

### Option 3: Comprehensive Policy
**File:** `202512150001_allow_staff_to_approve_collector_collections.sql`

This approach:
- Provides the most comprehensive policy definitions
- May be overly complex for the use case

### Option 4: Staff Read Access Policies (Additional)
**File:** `202512150004_staff_read_access_policies.sql`

This migration adds additional policies to allow staff members to view:
- All farmers records
- All staff records  
- All collections records

This ensures staff members have the necessary read access for their supervisory duties.

## Deployment Instructions

1. **Backup your database** before applying any migrations
2. Choose the appropriate migration file based on your requirements
3. Deploy the migration to your Supabase project:
   ```bash
   supabase db push
   ```
   or use the Supabase dashboard to run the SQL

## Policy Details

### SELECT Policy
- Staff members can view ALL milk approvals
- Collectors can view ONLY their own milk approvals
- Admins can view ALL milk approvals

### INSERT Policy
- Staff members can approve ANY collections (supervisor role)
- Collectors can approve ONLY their own collections
- Admins can approve ANY collections

### UPDATE Policy
- Users can update ONLY their own approvals
- Admins can update ANY approvals

## Testing the Policies

After deployment, verify the policies work correctly:

1. Test as a staff user:
   ```sql
   -- Should return all approvals
   SELECT count(*) FROM public.milk_approvals;
   
   -- Should be able to insert approval for any collection
   INSERT INTO public.milk_approvals (collection_id, staff_id, company_received_liters) 
   VALUES (gen_random_uuid(), 'some-collector-id', 100);
   ```

2. Test as a collector user:
   ```sql
   -- Should return only their own approvals
   SELECT count(*) FROM public.milk_approvals;
   
   -- Should only be able to insert approval for their own collections
   INSERT INTO public.milk_approvals (collection_id, staff_id, company_received_liters) 
   VALUES (gen_random_uuid(), 'their-own-id', 100);
   ```

## Rollback

If issues occur, use the rollback section in each migration file to revert to the previous policies.

## Application Changes

No application code changes are required for these policy updates. The existing application logic will automatically work with the new policies.