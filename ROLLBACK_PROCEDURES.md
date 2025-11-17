# Database Rollback Procedures

## Overview
This document provides rollback procedures for all major database changes. These procedures should be used when it's necessary to revert changes made by migrations.

## 1. Rollback Cleanup of Deprecated Objects

### File: `99990001_cleanup_deprecated_objects.sql`

If you need to restore the deprecated objects:

```sql
-- Migration: ROLLBACK_99990001_restore_deprecated_objects.sql
-- Description: Restore deprecated database objects that were removed

BEGIN;

-- Recreate deprecated tables (with minimal structure)
CREATE TABLE IF NOT EXISTS public.farmer_notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_farmer_id UUID REFERENCES pending_farmers(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE,
    user_email TEXT,
    notification_type TEXT CHECK (notification_type IN ('kyc_submitted', 'approved', 'rejected', 'reminder')),
    subject TEXT,
    body TEXT,
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    sent_at TIMESTAMPTZ,
    failed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS public.farmer_approval_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pending_farmer_id UUID REFERENCES pending_farmers(id) ON DELETE CASCADE,
    farmer_id UUID REFERENCES public.farmers(id) ON DELETE CASCADE,
    admin_id UUID REFERENCES auth.users(id),
    action TEXT CHECK (action IN ('submitted', 'approved', 'rejected', 'resubmitted')),
    previous_status TEXT,
    new_status TEXT,
    rejection_reason TEXT,
    admin_notes TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.variance_penalty_config (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    variance_type TEXT NOT NULL,
    min_variance_percentage DECIMAL(5,2) NOT NULL,
    max_variance_percentage DECIMAL(5,2) NOT NULL,
    penalty_rate_per_liter DECIMAL(10,2) NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.collector_performance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    staff_id UUID REFERENCES public.staff(id),
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    collections_count INTEGER DEFAULT 0,
    total_liters DECIMAL(10,2) DEFAULT 0,
    accuracy_score DECIMAL(5,2) DEFAULT 0,
    variance_penalty DECIMAL(10,2) DEFAULT 0,
    final_score DECIMAL(5,2) DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Recreate deprecated functions
CREATE OR REPLACE FUNCTION public.check_pending_farmer_documents(p_pending_farmer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    v_document_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO v_document_count
    FROM kyc_documents 
    WHERE pending_farmer_id = p_pending_farmer_id
    AND document_type IN ('id_front', 'id_back', 'selfie')
    AND status = 'pending';
    
    RETURN v_document_count >= 3;
END;
$$ LANGUAGE plpgsql;

COMMIT;
```

## 2. Rollback Duplicate Constraint Fix

### File: `99990002_fix_duplicate_constraints.sql`

To rollback the constraint changes:

```sql
-- Migration: ROLLBACK_99990002_restore_previous_constraints.sql
-- Description: Restore previous constraint definitions

BEGIN;

-- Drop the current constraint
ALTER TABLE public.pending_farmers 
DROP CONSTRAINT IF EXISTS pending_farmers_status_check;

-- Add the previous constraint with old values (if needed for compatibility)
ALTER TABLE public.pending_farmers 
ADD CONSTRAINT pending_farmers_status_check 
CHECK (status IN ('draft', 'submitted', 'under_review', 'approved', 'rejected'));

COMMIT;
```

## 3. Rollback Duplicate Index Fix

### File: `99990003_fix_duplicate_indexes.sql`

To rollback the index changes:

```sql
-- Migration: ROLLBACK_99990003_restore_duplicate_indexes.sql
-- Description: Restore duplicate indexes that were removed

BEGIN;

-- Note: Duplicate indexes don't need to be "restored" as they were redundant
-- This is a no-op rollback since removing duplicates is a safe operation
-- The single remaining indexes provide the same functionality

-- If for some reason you need the exact duplicates back:
-- CREATE INDEX idx_kyc_documents_pending_farmer_id ON kyc_documents(pending_farmer_id);
-- CREATE INDEX idx_kyc_documents_status ON kyc_documents(status);
-- etc.

COMMIT;
```

## 4. Rollback Function Security Definer Fix

### File: `99990004_fix_function_security_definer.sql`

To rollback the function changes:

```sql
-- Migration: ROLLBACK_99990004_restore_previous_function.sql
-- Description: Restore previous function implementation

BEGIN;

-- Drop the current function
DROP FUNCTION IF EXISTS get_user_role_secure(uuid);

-- Recreate the previous version (with potential SET ROLE issues)
CREATE OR REPLACE FUNCTION public.get_user_role_secure(user_id_param UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER  -- This allows the function to run with elevated privileges
SET search_path = public
AS $$
DECLARE
  user_role TEXT;
BEGIN
  -- Query the user_roles table without switching roles
  SELECT role INTO user_role
  FROM user_roles
  WHERE user_id = user_id_param AND active = true;
  
  RETURN user_role;
EXCEPTION WHEN OTHERS THEN
  -- Return null if any error occurs
  RAISE NOTICE 'Error in get_user_role_secure: %', SQLERRM;
  RETURN NULL;
END;
$$;

-- Restore previous policies if needed
-- DROP POLICY IF EXISTS "Users can read own role" ON public.user_roles;
-- DROP POLICY IF EXISTS "Allow secure function access" ON public.user_roles;

-- Recreate previous policies as needed

COMMIT;
```

## 5. Major Feature Rollbacks

### Credit System Rollback
If you need to rollback the entire credit system:

```sql
-- Migration: ROLLBACK_credit_system.sql
-- Description: Remove all credit system tables and functions

BEGIN;

-- Drop credit system tables (CASCADE will remove dependencies)
DROP TABLE IF EXISTS public.agrovet_disbursements CASCADE;
DROP TABLE IF EXISTS public.agrovet_credit_requests CASCADE;
DROP TABLE IF EXISTS public.agrovet_products CASCADE;
DROP TABLE IF EXISTS public.agrovet_staff CASCADE;
DROP TABLE IF EXISTS public.credit_transactions CASCADE;
DROP TABLE IF EXISTS public.farmer_credit_profiles CASCADE;

-- Drop related functions
DROP FUNCTION IF EXISTS get_farmer_credit_status(UUID);
DROP FUNCTION IF EXISTS process_agrovet_credit_request(UUID, UUID, TEXT);

COMMIT;
```

### Farmer Registration System Rollback
If you need to rollback farmer registration changes:

```sql
-- Migration: ROLLBACK_farmer_registration.sql
-- Description: Remove farmer registration system changes

BEGIN;

-- This is a complex rollback that would require careful data migration
-- Generally not recommended unless absolutely necessary

-- Consider archiving data before dropping tables
-- CREATE TABLE pending_farmers_archive AS SELECT * FROM pending_farmers;
-- CREATE TABLE kyc_documents_archive AS SELECT * FROM kyc_documents;

-- Drop farmer registration tables
-- DROP TABLE IF EXISTS pending_farmers CASCADE;
-- DROP TABLE IF EXISTS kyc_documents CASCADE;

COMMIT;
```

## General Rollback Guidelines

1. **Always backup data** before performing rollbacks
2. **Test rollbacks** in a development environment first
3. **Check dependencies** before dropping objects
4. **Communicate** with team members about rollbacks
5. **Monitor** the system after rollback for issues
6. **Document** the reason for rollback and any data loss

## Emergency Rollback Procedure

In case of emergency, follow this procedure:

1. Stop all application services
2. Backup current database state
3. Identify the problematic migration
4. Apply the appropriate rollback script
5. Verify database integrity
6. Restart services
7. Monitor for issues
8. Document the incident

## Verification After Rollback

After any rollback, verify:

1. All expected tables, functions, indexes exist
2. Application functionality works as expected
3. No data loss occurred
4. Performance is acceptable
5. Security policies are still effective