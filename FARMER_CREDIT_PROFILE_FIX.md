# Farmer Credit Profile RLS Fix

## Issue Description

Farmers were unable to create default credit profiles when accessing their credit dashboard due to insufficient Row Level Security (RLS) permissions on the `farmer_credit_profiles` table.

### Error Message
```
new row violates row-level security policy for table "farmer_credit_profiles"
```

### Root Cause

The RLS policies for the `farmer_credit_profiles` table only allowed:
1. Farmers to SELECT their own profiles
2. Admins and staff to SELECT all profiles
3. Admins to perform ALL operations (including INSERT/UPDATE/DELETE)

However, there was no policy allowing farmers to INSERT their own credit profiles, which is required when the system creates a default profile for them.

## Solution

Added a new RLS policy that allows farmers to create their own credit profiles:

```sql
CREATE POLICY "Farmers can create their own credit profile" 
  ON public.farmer_credit_profiles FOR INSERT 
  WITH CHECK (
    farmer_id IN (
      SELECT f.id FROM public.farmers f 
      WHERE f.user_id = auth.uid()
    )
  );
```

## Files Created

1. `supabase/migrations/20251119000100_fix_farmer_credit_profiles_rls.sql` - Migration file
2. `apply_farmer_credit_profiles_fix.sql` - Direct SQL script
3. `scripts/apply-farmer-credit-profiles-fix.ps1` - PowerShell script

## How to Apply the Fix

### Option 1: Using Supabase CLI (Recommended)
```bash
supabase db push
```

### Option 2: Direct SQL Execution
Run the `apply_farmer_credit_profiles_fix.sql` script directly on your database.

### Option 3: Using PowerShell Script
```powershell
.\scripts\apply-farmer-credit-profiles-fix.ps1
```

## Verification

After applying the fix, farmers should be able to access their credit dashboard without encountering the RLS error. The system will successfully create default credit profiles for farmers who don't have one yet.

## Affected Components

- Farmer Portal Credit Dashboard
- CreditServiceEssentials.createDefaultCreditProfile() function