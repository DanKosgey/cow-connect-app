# Final Database Schema Documentation

## Overview
This document describes the final, optimized database schema after all migrations have been applied and cleanup has been performed.

## Core Tables

### profiles
- Extends `auth.users`
- Contains user profile information
- Columns: id, full_name, email, phone, metadata, created_at, updated_at, deleted_at, created_by, updated_by

### user_roles
- Manages user role assignments
- Columns: id, user_id (FK to profiles), role, active, created_at
- Roles: farmer, staff, admin

### farmers
- Farmer-specific information
- Columns: id, user_id (FK to profiles), registration_number, national_id, phone_number, full_name, address, farm_location, kyc_status, registration_completed, created_at, updated_at, deleted_at, created_by, updated_by

### staff
- Staff-specific information
- Columns: id, user_id (FK to profiles), employee_id, created_at, updated_at

### collections
- Milk collection records
- Columns: id, collection_id, farmer_id (FK to farmers), staff_id (FK to staff), liters, quality_grade, rate_per_liter, total_amount, gps_latitude, gps_longitude, validation_code, verification_code, collection_date, status, created_at, updated_at

### pending_farmers
- Temporary storage for farmer registration workflow
- Columns: id, user_id, registration_number, national_id, phone_number, full_name, email, address, farm_location, gender, number_of_cows, feeding_type, kyc_complete, email_verified, status, rejection_reason, rejection_count, submitted_at, reviewed_at, reviewed_by, created_at, updated_at

### kyc_documents
- KYC document storage
- Columns: id, farmer_id (FK to farmers), pending_farmer_id (FK to pending_farmers), document_type, file_name, file_path, file_size, mime_type, status, created_at, updated_at

## Credit System Tables

### farmer_credit_profiles
- Farmer credit information
- Columns: id, farmer_id (FK to farmers), credit_tier, credit_limit_percentage, max_credit_amount, current_credit_balance, total_credit_used, pending_deductions, last_settlement_date, next_settlement_date, is_frozen, freeze_reason, created_at, updated_at

### credit_transactions
- Credit transaction history
- Columns: id, farmer_id (FK to farmers), transaction_type, amount, balance_before, balance_after, product_id, product_name, quantity, unit_price, reference_id, description, approved_by, approval_status, created_at

### agrovet_inventory
- Agrovet product inventory
- Columns: id, name, sku, description, category, unit, current_stock, reorder_level, supplier, cost_price, selling_price, is_credit_eligible, created_at, updated_at

## Payment System Tables

### payments
- Payment records
- Columns: id, payment_id, farmer_id (FK to farmers), amount, status, payment_method, transaction_id, created_at, processed_at

### payment_batches
- Payment batch processing
- Columns: batch_id, batch_name, period_start, period_end, total_farmers, total_collections, total_amount, status, created_at, processed_at, completed_at

### collection_payments
- Link between collections and payments
- Columns: id, collection_id (FK to collections), payment_id (FK to payments), batch_id (FK to payment_batches), amount, rate_applied, created_at

## Supporting Tables

### notifications
- User notifications
- Columns: id, user_id (FK to profiles), title, message, type, category, read, created_at

### audit_logs
- System audit trail
- Columns: id, table_name, record_id, operation, changed_by, changed_at, old_data, new_data

## Key Functions

### get_user_role_secure
- Secure function to retrieve user roles
- Uses SECURITY DEFINER for proper permissions

### approve_pending_farmer
- Approves farmer registration applications

### reject_pending_farmer
- Rejects farmer registration applications

### resubmit_kyc_documents
- Allows farmers to resubmit KYC documents after rejection

## Indexes
- All tables have appropriate indexes for performance
- Duplicate indexes have been removed
- Index naming follows consistent pattern: idx_table_column

## Constraints
- All tables have proper foreign key constraints
- Check constraints enforce data integrity
- Duplicate constraints have been resolved

## Security
- Row Level Security (RLS) enabled on all tables
- Policies properly configured for user roles
- SECURITY DEFINER functions properly implemented
- No deprecated or insecure functions

## Synchronization with Application Models
The database schema is fully synchronized with the application models:
- All entity relationships are properly represented
- Data types match application expectations
- Required fields are enforced through constraints
- Indexes support application query patterns

## Migration Status
- All migrations execute successfully from fresh install
- No duplicate or conflicting migrations
- Consistent naming conventions applied
- Cleanup of deprecated objects completed