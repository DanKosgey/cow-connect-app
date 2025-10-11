# Farmer Registration Schema Enhancements

This document describes the schema enhancements made to improve the farmer registration system and align the database structure with the frontend implementation.

## Overview

The enhancements focus on ensuring consistency between the database schema and the frontend service implementation, adding missing fields, and improving data integrity through proper constraints and indexes.

## Schema Changes

### 1. Enhanced `pending_farmers` Table

The `pending_farmers` table has been enhanced with additional columns to support the complete farmer registration workflow:

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `age` | INTEGER | Farmer's age |
| `id_number` | TEXT | Farmer's ID number |
| `breeding_method` | TEXT | Farm breeding method |
| `cow_breeds` | JSONB | JSON array of cow breeds and counts |
| `gender` | TEXT | Farmer's gender with CHECK constraint |
| `kyc_complete` | BOOLEAN | Flag indicating if KYC is complete |
| `rejection_count` | INTEGER | Number of times application was rejected |
| `rejection_reason` | TEXT | Reason for last rejection |
| `reviewed_at` | TIMESTAMPTZ | Timestamp when last reviewed |
| `reviewed_by` | UUID | Admin who last reviewed |
| `submitted_at` | TIMESTAMPTZ | Timestamp when submitted for review |

### 2. Enhanced `kyc_documents` Table

The `kyc_documents` table has been enhanced to support the new workflow:

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `pending_farmer_id` | UUID | Reference to pending farmer (new workflow) |
| `rejection_reason` | TEXT | Reason for document rejection |
| `verified_at` | TIMESTAMPTZ | Timestamp when document was verified |

### 3. Enhanced `farmers` Table

The `farmers` table has been enhanced with additional registration fields:

| Column Name | Data Type | Description |
|-------------|-----------|-------------|
| `physical_address` | TEXT | Farmer's physical address |
| `gps_latitude` | NUMERIC | GPS latitude coordinate |
| `gps_longitude` | NUMERIC | GPS longitude coordinate |
| `bank_account_name` | TEXT | Bank account name |
| `bank_account_number` | TEXT | Bank account number |
| `bank_name` | TEXT | Bank name |
| `bank_branch` | TEXT | Bank branch |

## Constraints and Indexes

### New Constraints

1. **Gender Check Constraint**: Ensures `gender` column only accepts 'male', 'female', or 'other'
2. **Status Check Constraints**: Existing constraints for status fields maintained

### New Indexes

1. `idx_pending_farmers_status` - For filtering by registration status
2. `idx_pending_farmers_email` - For email lookups
3. `idx_pending_farmers_created_at` - For time-based queries
4. `idx_kyc_documents_pending_farmer_id` - For linking documents to pending farmers
5. `idx_kyc_documents_status` - For filtering documents by status
6. `idx_kyc_documents_document_type` - For filtering by document type

## Database Functions

All existing database functions have been verified and updated to work with the enhanced schema:

1. `approve_pending_farmer` - Approves a pending farmer registration
2. `reject_pending_farmer` - Rejects a pending farmer registration
3. `resubmit_kyc_documents` - Allows farmers to resubmit rejected documents
4. `get_pending_farmers_for_review` - Retrieves pending farmers for admin review
5. `submit_kyc_for_review` - Submits KYC documents for admin review

## Migration Details

The migration script (`20251011000600_farmer_registration_schema_enhancements.sql`) implements the following changes:

1. **Additive Changes Only**: All changes are additive to prevent data loss
2. **Conditional Column Creation**: Columns are only added if they don't already exist
3. **Proper Data Types**: All columns use appropriate data types for their purpose
4. **Constraint Enforcement**: CHECK constraints ensure data integrity
5. **Index Creation**: Indexes are created for improved query performance
6. **Function Updates**: Database functions are updated to match the schema

## Testing

The schema enhancements have been tested with:

1. **Schema Validation**: Verification that all required columns exist
2. **Constraint Testing**: Verification that constraints are properly enforced
3. **Index Testing**: Verification that indexes are created and functional
4. **Function Testing**: Verification that database functions work correctly
5. **Integration Testing**: Verification that frontend services work with the new schema

## Rollback Procedure

In case of issues, the migration can be rolled back by:

1. Manually removing the added columns (if needed)
2. Restoring from a database backup
3. Reverting to the previous migration version

Note: The migration is designed to be additive only to prevent data loss during rollback.

## Performance Considerations

1. **Index Usage**: New indexes improve query performance for common operations
2. **Data Types**: Proper data types minimize storage requirements
3. **Constraint Enforcement**: Database-level constraints reduce application-level validation needs
4. **Query Optimization**: Functions have been optimized for performance

## Security Considerations

1. **Data Validation**: Constraints ensure data integrity at the database level
2. **Access Control**: Existing RLS policies remain in effect
3. **Audit Trail**: All changes are logged through existing audit mechanisms
4. **Data Privacy**: No sensitive data is exposed through the schema changes

## Future Enhancements

Planned future enhancements include:

1. **Additional Indexes**: For more complex query patterns
2. **Partitioning**: For large-scale deployments
3. **Materialized Views**: For complex reporting queries
4. **Advanced Constraints**: For more sophisticated data validation