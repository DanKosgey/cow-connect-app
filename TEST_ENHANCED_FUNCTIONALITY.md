# Test Enhanced Functionality

## Overview
This document outlines tests to verify that the enhanced database functionality works correctly after migration.

## Test Cases

### 1. Staff Management Enhancement
**Objective:** Verify that the enhanced staff table works correctly

**Test Steps:**
1. Create a new staff member through the assign-role function
2. Verify that the staff record includes all new fields:
   - status (should default to 'active')
   - department (should default to 'General')
   - position (should default to 'Staff Member')
   - hire_date (should default to current date)
   - employee_id (should be generated in EMPYYYYMMDD-XXXX format)

**Expected Results:**
- Staff record is created with all enhanced fields populated
- Employee ID follows the correct format
- Default values are applied correctly

### 2. Data Validation Constraints
**Objective:** Verify that data validation constraints are working

**Test Steps:**
1. Try to insert a collection record with negative liters
2. Try to insert a collection record with negative rate_per_liter
3. Try to insert a payment record with negative amount
4. Try to insert a farmer record with invalid phone number format

**Expected Results:**
- All operations should fail with appropriate constraint violation errors
- Error messages should clearly indicate which constraint was violated

### 3. Index Performance
**Objective:** Verify that new indexes improve query performance

**Test Steps:**
1. Run queries that use the new indexes:
   - Query collections by farmer_id
   - Query collections by staff_id
   - Query payments by farmer_id
   - Query staff by status
   - Query staff by department

**Expected Results:**
- Queries should execute faster than before migration
- Query plans should show index usage

### 4. Updated Timestamps
**Objective:** Verify that updated_at timestamps are automatically maintained

**Test Steps:**
1. Update a farmer record
2. Update a staff record
3. Update a user_roles record
4. Update a kyc_documents record
5. Update a file_uploads record

**Expected Results:**
- All records should have their updated_at timestamp automatically updated
- The update should happen without requiring explicit timestamp setting

### 5. Helper Functions
**Objective:** Verify that helper functions work correctly

**Test Steps:**
1. Call the generate_employee_id() function
2. Call the get_staff_details() function
3. Call the initialize_staff_record() function

**Expected Results:**
- generate_employee_id() should return a properly formatted employee ID
- get_staff_details() should return staff information with user details
- initialize_staff_record() should create a staff record with proper defaults

## Manual Testing Procedure

### Application Testing
1. Log in as an admin user
2. Navigate to the staff management page
3. Verify that all new fields (status, department, position) are visible and editable
4. Create a new staff member and verify the record is created correctly
5. Test the invitation flow to ensure it still works
6. Test the role assignment flow to ensure it works with the enhanced staff table

### Edge Function Testing
1. Test the assign-role function with a new user
2. Verify that the staff record is created with enhanced fields
3. Test the create-invitation function
4. Test the send-email function (if email service is configured)

## Monitoring and Validation

### Performance Monitoring
- Monitor query performance for frequently accessed tables
- Check database logs for any constraint violations or errors
- Monitor Edge Function execution logs for any issues

### Data Integrity Validation
- Run data validation queries to ensure no data corruption occurred
- Verify that all existing records still conform to new constraints
- Check that all relationships between tables are maintained

## Rollback Verification
If rollback is needed:
1. Execute the rollback SQL statements from each migration file
2. Verify that all added indexes, constraints, and columns are removed
3. Verify that the staff table is reverted to its original structure
4. Verify that all helper functions are removed
5. Test that the application works with the rolled-back schema