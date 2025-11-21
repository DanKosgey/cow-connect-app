# Script Execution Tracking Sheet

This document tracks which scripts and migrations have been executed in your Supabase dashboard vs. which are pending.

## Migration Files (72 files)

### Core System Migrations (2024)
| Migration File | Status | Notes |
|----------------|--------|-------|
| 20231013_create_farmer_profile_function.sql | ❓ Unknown | Creates farmer profile function |
| 20240001_create_base_tables.sql | ❓ Unknown | Creates core tables (profiles, user_roles, farmers, staff, collections, etc.) |
| 20240002_create_relationships.sql | ❓ Unknown | Adds foreign keys and junction tables |
| 20240003_add_rls_policies.sql | ❓ Unknown | Enables Row Level Security |
| 20240004_create_functions.sql | ❓ Unknown | Creates stored procedures and helper functions |
| 20240005_create_triggers.sql | ❓ Unknown | Creates triggers for updated_at, audit logging, notifications |
| 20240006_seed_data.sql | ❓ Unknown | Seeds initial data for roles, permissions, system settings |
| 20240007_apply_policies.sql | ❓ Unknown | Applies RLS policies |
| 20240008_fix_check_account_lockout.sql | ❓ Unknown | Fixes account lockout function |

### Farmer Registration System (2025)
| Migration File | Status | Notes |
|----------------|--------|-------|
| 20251011000100_farmer_registration_system.sql | ❓ Unknown | Complete farmer registration system |
| 20251011000500_update_kyc_submission_to_allow_unverified_email.sql | ❓ Unknown | Updates KYC submission logic |
| 20251011000600_farmer_registration_schema_enhancements.sql | ❓ Unknown | Schema enhancements |
| 20251011000700_update_pending_farmers_for_registration_workflow.sql | ❓ Unknown | Updates pending farmers table |
| 20251011000800_complete_pending_farmers_schema.sql | ❓ Unknown | Completes pending farmers schema |
| 20251011000900_add_pending_farmers_rls_policies.sql | ❓ Unknown | Adds RLS policies for pending farmers |

### Invitation & Role Fixes (2025)
| Migration File | Status | Notes |
|----------------|--------|-------|
| 20251013160000_create_invitations_table.sql | ❓ Unknown | Creates invitations table |
| 20251013170000_fix_invitations_rls.sql | ❓ Unknown | Fixes invitation RLS |
| 20251013180000_fix_user_roles_rls.sql | ❓ Unknown | Fixes user roles RLS |
| 20251013200000_add_missing_indexes_and_constraints.sql | ❓ Unknown | Adds indexes and constraints |
| 20251013210000_enhance_staff_table_and_function.sql | ❓ Unknown | Enhances staff table |
| 20251013220000_fix_invitations_policies.sql | ❓ Unknown | Fixes invitation policies |
| 20251013230000_fix_invitations_policies_v2.sql | ❓ Unknown | Further fixes to invitation policies |
| 20251013240000_fix_existing_invitations_policies.sql | ❓ Unknown | Fixes existing invitation policies |
| 20251013250000_fix_staff_table_and_policies.sql | ❓ Unknown | Fixes staff table and policies |
| 20251013260000_comprehensive_fix.sql | ❓ Unknown | Comprehensive fixes |
| 20251013270000_fix_remote_policy_conflicts.sql | ❓ Unknown | Fixes remote policy conflicts |
| 20251013280000_complete_database_fix.sql | ❓ Unknown | Complete database fixes |
| 20251013290000_manual_fix.sql | ❓ Unknown | Manual fixes |
| 20251013300000_enable_staff_rls.sql | ❓ Unknown | Enables staff RLS |
| 20251013310000_enable_kyc_documents_rls.sql | ❓ Unknown | Enables KYC documents RLS |
| 20251013340000_fix_pending_farmers_constraints_safely.sql | ❓ Unknown | Fixes pending farmers constraints |

### Pending Farmers Fixes (2025)
| Migration File | Status | Notes |
|----------------|--------|-------|
| 20251014000100_update_pending_farmers_status_constraint.sql | ❓ Unknown | Updates status constraint |
| 20251014000200_fix_pending_farmer_functions.sql | ❓ Unknown | Fixes farmer functions |
| 20251014000300_update_submit_kyc_function.sql | ❓ Unknown | Updates KYC submission function |
| 20251014000400_update_resubmit_kyc_function.sql | ❓ Unknown | Updates KYC resubmission function |
| 20251014000500_update_pending_farmers_status_constraint.sql | ❓ Unknown | Updates status constraint |
| 20251014000600_ensure_correct_function_signatures.sql | ❓ Unknown | Ensures correct function signatures |
| 20251014000700_fix_kyc_documents_pending_farmer_id.sql | ❓ Unknown | Fixes KYC document references |
| 20251014000800_fix_kyc_document_types_and_status.sql | ❓ Unknown | Fixes document types and status |

### Additional Features (2025)
| Migration File | Status | Notes |
|----------------|--------|-------|
| 20251015000100_create_kyc_documents_bucket.sql | ❓ Unknown | Creates KYC documents storage bucket |
| 20251015000101_fix_kyc_submission_logic.sql | ❓ Unknown | Fixes KYC submission logic |
| 20251015000200_create_farmer_payments_table.sql | ❓ Unknown | Creates farmer payments table |
| 20251015000300_add_approved_by_to_collections.sql | ❓ Unknown | Adds approved_by to collections |
| 20251015000600_add_approved_by_column_and_constraint.sql | ❓ Unknown | Adds approved_by column |
| 20251015000700_refresh_postgrest_schema.sql | ❓ Unknown | Refreshes PostgREST schema |
| 20251015000800_create_inventory_tables.sql | ❓ Unknown | Creates inventory tables |
| 20251015000900_create_inventory_functions.sql | ❓ Unknown | Creates inventory functions |
| 20251015001000_seed_inventory_data.sql | ❓ Unknown | Seeds inventory data |
| 20251015001100_add_explicit_fk_constraint_names.sql | ❓ Unknown | Adds explicit FK constraint names |
| 20251015001200_create_market_prices_table.sql | ❓ Unknown | Creates market prices table |
| 20251015001300_create_forum_tables.sql | ❓ Unknown | Creates forum tables |
| 20251018000100_restrict_payment_access_to_admins.sql | ❓ Unknown | Restricts payment access |
| 20251018000200_payment_synchronization_triggers.sql | ❓ Unknown | Creates payment sync triggers |

### Credit System (2025)
| Migration File | Status | Notes |
|----------------|--------|-------|
| 20251031000100_create_credit_system_tables.sql | ❓ Unknown | Creates credit system tables |
| 20251031000200_add_credit_fields_to_payment_tables.sql | ❓ Unknown | Adds credit fields to payment tables |
| 20251031000300_create_credit_system_core.sql | ❓ Unknown | Creates core credit system |
| 20251031000400_create_credit_requests_table.sql | ❓ Unknown | Creates credit requests table |
| 20251031000500_add_fields_to_credit_requests.sql | ❓ Unknown | Adds fields to credit requests |
| 20251031000600_create_credit_defaults_tables.sql | ❓ Unknown | Creates credit defaults tables |
| 20251106000000_create_agrovet_credit_system.sql | ❓ Unknown | Creates agrovet credit system |

### Role Enhancements (2025)
| Migration File | Status | Notes |
|----------------|--------|-------|
| 20251113_add_collector_role.sql | ❓ Unknown | Adds collector role |
| 20251113_add_creditor_role.sql | ❓ Unknown | Adds creditor role |
| 20251113_milk_approval_workflow.sql | ❓ Unknown | Creates milk approval workflow |

### RLS Policies (2025)
| Migration File | Status | Notes |
|----------------|--------|-------|
| 20251114000100_add_collector_farmers_rls.sql | ❓ Unknown | Adds collector farmers RLS |
| 20251114000200_add_collector_collections_rls.sql | ❓ Unknown | Adds collector collections RLS |
| 20251114000300_add_collector_staff_rls.sql | ❓ Unknown | Adds collector staff RLS |
| 20251114000400_add_creditor_product_management_rls.sql | ❓ Unknown | Adds creditor product management RLS |
| 20251114000500_create_product_pricing_table.sql | ❓ Unknown | Creates product pricing table |
| 20251116000100_add_creditor_credit_requests_rls.sql | ❓ Unknown | Adds creditor credit requests RLS |

### User Role Fixes (2025)
| Migration File | Status | Notes |
|----------------|--------|-------|
| 20251117000100_fix_get_user_role_function.sql | ❓ Unknown | Fixes get_user_role function |
| 20251117000200_consolidate_user_roles_policies.sql | ❓ Unknown | Consolidates user roles policies |
| 20251117000300_fix_admin_role_and_function.sql | ❓ Unknown | Fixes admin role and function |
| 20251119000100_fix_farmer_credit_profiles_rls.sql | ⏳ Pending | Fixes farmer credit profiles RLS policies to allow farmers to create their own profiles |

## Standalone SQL Files (16 files)

| SQL File | Status | Notes |
|----------|--------|-------|
| CHECK_STAFF_TABLE.sql | ❓ Unknown | Checks staff table structure |
| DEBUG_STAFF_DATA.sql | ❓ Unknown | Debugs staff data |
| POST_MIGRATION_VERIFICATION.sql | ❓ Unknown | Verifies post-migration status |
| TEST_ADMIN_DASHBOARD_STAFF_QUERY.sql | ❓ Unknown | Tests admin dashboard staff query |
| TEST_STAFF_QUERY.sql | ❓ Unknown | Tests staff query |
| TEST_STAFF_QUERY_APPROACH.sql | ❓ Unknown | Tests staff query approach |
| VERIFY_PAYMENT_SYSTEM_CHANGES.sql | ❓ Unknown | Verifies payment system changes |
| apply_creditor_rls_fix.sql | ❓ Unknown | Applies creditor RLS fix |
| apply_creditor_rls_policies.sql | ❓ Unknown | Applies creditor RLS policies |
| apply_remote_migration.sql | ❓ Unknown | Applies remote migration |
| current_schema_check.sql | ❓ Unknown | Checks current schema |
| diagnose-get-user-role.sql | ❓ Unknown | Diagnoses user role issues |
| fix-admin-role.sql | ❓ Unknown | Fixes admin role |
| function-check.sql | ❓ Unknown | Checks functions |
| market_prices_table.sql | ❓ Unknown | Creates market prices table |
| schema_check.sql | ❓ Unknown | Checks schema |
| apply_farmer_credit_profiles_fix.sql | ⏳ Pending | Direct SQL script to fix farmer credit profiles RLS policies |

## Python Scripts

| Script | Status | Purpose |
|--------|--------|---------|
| admin_update_and_insert.py | ❓ Unknown | Updates and inserts admin data |
| create_collector_creditor.py | ❓ Unknown | Creates collector and creditor accounts |
| create_farmer.py | ❓ Unknown | Creates farmer account |
| create_staff.py | ❓ Unknown | Creates staff account |
| create_test_user.py | ❓ Unknown | Creates test user |
| e2e_create_user.py | ❓ Unknown | End-to-end user creation |
| setupFarmerAccounts.ts | ❓ Unknown | Sets up farmer accounts |
| setupTestAccounts.ts | ❓ Unknown | Sets up test accounts |
| signin_and_insert_profile.py | ❓ Unknown | Signs in and inserts profile |

## PowerShell Scripts

| Script | Status | Purpose |
|--------|--------|---------|
| apply-role-fix.ps1 | ❓ Unknown | Applies role fix |
| create_admin.ps1 | ❓ Unknown | Creates admin user |
| scripts/apply-farmer-credit-profiles-fix.ps1 | ⏳ Pending | PowerShell script to apply RLS policy fix for farmer_credit_profiles table |

## TypeScript/JavaScript Scripts

| Script | Status | Purpose |
|--------|--------|---------|
| createCollectorCreditor.ts | ❓ Unknown | Creates collector and creditor accounts |
| diagnose-email.ts | ❓ Unknown | Diagnoses email issues |
| seedWarehouses.ts | ❓ Unknown | Seeds warehouse data |
| setup-storage-bucket.js | ❓ Unknown | Sets up storage bucket |
| test-email.ts | ❓ Unknown | Tests email functionality |
| test-invitation-service.ts | ❓ Unknown | Tests invitation service |

## How to Use This Tracking Sheet

1. **Check Migration Status**: Run the following query in your Supabase SQL Editor to see applied migrations:
   ```sql
   SELECT * FROM supabase_migrations.schema_migrations ORDER BY version;
   ```

2. **Mark as Executed**: Change ❓ Unknown to ✅ Executed when you confirm the script has been run.

3. **Mark as Pending**: Change ❓ Unknown to ⏳ Pending when you identify scripts that need to be run.

4. **Add Notes**: Use the Notes column to document any issues, dependencies, or special instructions.

## Next Steps

1. Compare the list of migrations with your Supabase dashboard migration history
2. Identify any missing migrations that need to be applied
3. Run the necessary scripts in the correct order
4. Update this tracking sheet as you execute each script