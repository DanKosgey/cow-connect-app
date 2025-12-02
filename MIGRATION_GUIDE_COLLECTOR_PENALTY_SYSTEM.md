# Migration Guide: Collector Penalty System

## Overview

This guide provides instructions for migrating to the new collector penalty system that deducts penalties from collector earnings similar to how credits are deducted from farmer payments.

## Prerequisites

Before applying this migration, ensure you have:
1. Backed up your database
2. Reviewed the changes in `COLLECTOR_PENALTY_ACCOUNT_SYSTEM.md`
3. Tested the changes in a development environment

## Migration Steps

### 1. Apply Database Migration

Run the database migration to create the new penalty account tables:

```sql
-- Execute the migration script
20251202001_create_collector_penalty_accounts.sql
```

This will create:
- `collector_penalty_accounts` table
- `collector_penalty_transactions` table
- Appropriate indexes and RLS policies

### 2. Deploy Updated Services

Deploy the updated service files:
- `src/services/collector-penalty-account-service.ts`
- Updated `src/services/collector-earnings-service.ts`
- Updated `src/services/collector-penalty-service.ts`

### 3. Deploy Updated UI Components

Deploy the updated UI components:
- `src/pages/collector-portal/CollectorPaymentsPage.tsx`
- `src/pages/collector-portal/CollectorEarningsPage.tsx`
- `src/pages/admin/CollectorsPage.tsx`

### 4. Deploy Test Files

Deploy the new test files:
- `src/__tests__/collector-penalty-account-service.test.ts`
- `src/__tests__/collector-earnings-service-penalty.test.ts`

## Verification

### 1. Database Verification

Verify the new tables were created:

```sql
-- Check that tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_name IN ('collector_penalty_accounts', 'collector_penalty_transactions');

-- Check table structure
SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'collector_penalty_accounts' 
ORDER BY ordinal_position;

SELECT column_name, data_type FROM information_schema.columns 
WHERE table_name = 'collector_penalty_transactions' 
ORDER BY ordinal_position;
```

### 2. Functional Verification

1. Log in as a collector and verify:
   - Payment history shows penalty information
   - Penalty totals are displayed in dashboard
   - Earnings calculations include penalty deductions

2. Log in as an admin and verify:
   - Collector management page shows penalty information
   - Payment processing deducts penalties from collector accounts
   - Penalty account balances update correctly

### 3. Test Verification

Run the new test suites:

```bash
npm test collector-penalty-account-service.test.ts
npm test collector-earnings-service-penalty.test.ts
```

## Rollback Procedure

If issues are encountered, you can rollback the changes:

### 1. Database Rollback

Drop the new tables:

```sql
DROP TABLE IF EXISTS collector_penalty_transactions;
DROP TABLE IF EXISTS collector_penalty_accounts;
```

### 2. Code Rollback

Revert to the previous versions of:
- `src/services/collector-earnings-service.ts`
- `src/services/collector-penalty-service.ts`
- `src/pages/collector-portal/CollectorPaymentsPage.tsx`
- `src/pages/collector-portal/CollectorEarningsPage.tsx`
- `src/pages/admin/CollectorsPage.tsx`

Remove the new files:
- `src/services/collector-penalty-account-service.ts`
- `src/__tests__/collector-penalty-account-service.test.ts`
- `src/__tests__/collector-earnings-service-penalty.test.ts`

## Post-Migration Tasks

### 1. Data Population (Optional)

If you want to populate existing penalty data into the new system:

1. Query existing penalty information from `milk_approvals` and `collector_daily_summaries`
2. Create penalty accounts for existing collectors
3. Incur penalties in the new system based on historical data

### 2. User Training

Inform collectors and admins about the new penalty system:
- Collectors can now see detailed penalty information
- Admins have enhanced tools for penalty management
- Payment processing now automatically deducts penalties

## Support

For issues with this migration, contact the development team with:
1. Error messages or logs
2. Steps to reproduce the issue
3. Screenshots if applicable