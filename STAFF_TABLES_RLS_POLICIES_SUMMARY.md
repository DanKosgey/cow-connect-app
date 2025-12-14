# Staff Tables and RLS Policies Summary

This document provides an overview of the newly created migrations for staff-related tables and their Row Level Security (RLS) policies.

## Migrations Created

### 1. Staff Table with RLS Policies
**File:** `20251214000100_create_staff_table_with_rls_policies.sql`

This migration creates the main staff table with all required columns and comprehensive RLS policies for all user roles.

#### Table Structure
- `id`: UUID primary key
- `user_id`: Foreign key to profiles table (unique)
- `employee_id`: Unique employee identifier
- `status`: Employee status (active, inactive, suspended)
- `department`: Department assignment
- `position`: Job position
- `hire_date`: Date of hiring
- `supervisor_id`: Reference to supervisor staff record
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

#### RLS Policies by Role

**Admin Role:**
- Full CRUD access to all staff records

**Staff Role:**
- Read/update access to their own record only

**Collector Role:**
- Read/update access to their own record only

**Creditor Role:**
- Read access to staff records they work with

### 2. Staff Performance Table with RLS Policies
**File:** `20251214000200_create_staff_performance_table_with_rls_policies.sql`

This migration creates the staff performance tracking table with RLS policies.

#### Table Structure
- `id`: BigSerial primary key
- `staff_id`: Foreign key to staff table
- `period_start`: Performance period start date
- `period_end`: Performance period end date
- Various performance metrics (approvals, collections, accuracy scores, etc.)
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

#### RLS Policies by Role

**Admin Role:**
- Full CRUD access to all performance records

**Staff Role:**
- Read/update access to their own performance records

**Collector Role:**
- Read access to performance records for staff they work with

**Creditor Role:**
- Read access to performance records for staff they work with

### 3. Biometric Verification Tables with RLS Policies
**File:** `20251214000300_create_biometric_verification_tables_with_rls_policies.sql`

This migration creates tables for biometric verification system with RLS policies.

#### Tables Structure

**staff_biometric_data:**
- `id`: UUID primary key
- `staff_id`: Foreign key to staff table
- `biometric_type`: Type of biometric data (fingerprint, face, iris)
- `biometric_data`: Actual biometric data
- `created_at`: Timestamp of creation
- `updated_at`: Timestamp of last update

**biometric_verification_logs:**
- `id`: UUID primary key
- `staff_id`: Foreign key to staff table
- `biometric_type`: Type of biometric data used
- `success`: Whether verification was successful
- `created_at`: Timestamp of verification

#### RLS Policies by Role

**Admin Role:**
- Full CRUD access to all biometric data and logs

**Staff Role:**
- Read/update access to their own biometric data
- Read access to their own verification logs

**Collector Role:**
- Read access to biometric data and logs for staff they work with

**Creditor Role:**
- Read access to biometric data and logs for staff they work with

### 4. Collector Tables with RLS Policies
**File:** `20251214000400_create_collector_tables_with_rls_policies.sql`

This migration creates tables for collector management with RLS policies.

#### Tables Structure

**collector_rates:**
- `id`: BigSerial primary key
- `collector_id`: Foreign key to staff table
- `rate_type`: Type of rate (collection, approval, variance_handling)
- `rate_amount`: Amount of rate
- Date range and status fields

**collector_payments:**
- `id`: BigSerial primary key
- `collector_id`: Foreign key to staff table
- Period dates and payment amounts
- Status tracking fields

**collector_performance:**
- `id`: BigSerial primary key
- `collector_id`: Foreign key to staff table
- Period dates and performance metrics
- Various collection and approval statistics

#### RLS Policies by Role

**Admin Role:**
- Full CRUD access to all collector data

**Staff Role:**
- Read access to collector data for staff they supervise

**Collector Role:**
- Read access to their own rates, payments, and performance data

**Creditor Role:**
- Read access to collector data

## Implementation Notes

1. All tables have proper foreign key relationships to maintain data integrity
2. Indexes have been created on frequently queried columns for performance
3. RLS policies follow the principle of least privilege - users can only access data they need
4. All policies check for active user roles to ensure proper access control
5. The migrations are designed to be idempotent - they can be run multiple times without error
6. Verification queries are included at the end of each migration to confirm successful execution

## Deployment Instructions

1. Review each migration file to ensure it meets your requirements
2. Test migrations in a development environment first
3. Deploy to production during a maintenance window
4. Verify policies are working correctly after deployment using the verification queries
5. Monitor application logs for any RLS-related errors after deployment