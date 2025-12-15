# Collectors Page Update Implementation Plan

## Overview
This document outlines the implementation plan for updating the collectors page to meet the specified requirements:
- Gross = All collection fee amounts regardless of paid status
- Pending = Collections with collection_fee_status='pending'
- Paid = Collections with collection_fee_status='paid'
- Penalties = Pending penalties only
- Net = Pending - Pending Penalties
- Add penalty_status column to track penalty payment status
- Modify "Mark as Paid" button to update both collection_fee_status and penalty_status

## Requirements Analysis

### Current State
The current collectors page calculates:
- Gross earnings as total liters × rate per liter for all approved collections
- Pending payments as collections with collection_fee_status='pending'
- Paid payments as collections with collection_fee_status='paid'
- Penalties are calculated from milk_approvals and collector_daily_summaries tables
- Net earnings as Gross - Total Penalties

### Target State
- Gross: Sum of all collection fee amounts regardless of payment status
- Pending: Collections with collection_fee_status='pending' only
- Paid: Collections with collection_fee_status='paid' only
- Penalties: Only pending penalties (exclude paid penalties)
- Net: Pending - Pending Penalties
- Add penalty_status column to track which penalties have been paid
- Update "Mark as Paid" functionality to set penalty_status='paid'

## Implementation Tasks

### 1. Database Schema Updates
- Add `penalty_status` column to `milk_approvals` table with default value 'pending'
- Add `penalty_status` column to `collector_daily_summaries` table with default value 'pending'
- Create database migration scripts
- Update schema documentation

### 2. Backend Service Updates

#### Collector Earnings Service
- Modify `getAllTimeEarnings()` to calculate gross as sum of all collection fee amounts
- Update pending collections query to explicitly filter by `collection_fee_status='pending'`
- Update paid collections query to explicitly filter by `collection_fee_status='paid'`
- Modify net earnings calculation to use formula: Pending - Pending Penalties

#### Collector Penalty Service
- Update penalty calculation logic to exclude records with `penalty_status='paid'`
- Modify functions to include `penalty_status` in returned data

#### Mark as Paid Functionality
- Extend `markCollectionsAsPaid()` to also update `penalty_status` for related penalty records
- Identify which penalty records are associated with collections being marked as paid
- Ensure both `collection_fee_status` and `penalty_status` are updated to 'paid'

### 3. Frontend Updates

#### Data Model
- Update `CollectorPerformanceWithPenalties` interface to include `penalty_status` field
- Modify data fetching logic to include `penalty_status` in returned data

#### UI Components
- Add "Penalty Status" column to collectors table
- Add "Penalty Status" column to payment history modal
- Ensure proper display of penalty status information

### 4. Testing

#### Unit Tests
- Write unit tests for gross earnings calculation
- Write unit tests for pending collections filtering
- Write unit tests for paid collections filtering
- Write unit tests for net earnings calculation
- Write unit tests for penalty calculation exclusion logic

#### Integration Tests
- Create integration tests for markCollectionsAsPaid function
- Test that both collection_fee_status and penalty_status are updated
- Verify that paid penalties are excluded from calculations

#### End-to-End Tests
- Test gross, pending, paid, and net calculations with sample data
- Test mark as paid functionality updates both statuses
- Verify that paid penalties are not deducted in subsequent calculations
- Test edge cases and error conditions

## Implementation Steps

### Phase 1: Database Schema Updates
1. Design SQL migration scripts to add penalty_status column
2. Apply migrations to database
3. Update schema documentation

### Phase 2: Backend Service Updates
1. Update collector earnings service calculations
2. Update collector penalty service logic
3. Modify mark as paid functionality
4. Add unit tests for all updated functions

### Phase 3: Frontend Updates
1. Update data models and interfaces
2. Modify UI components to display penalty status
3. Add frontend component tests

### Phase 4: Integration and End-to-End Testing
1. Perform integration testing
2. Execute end-to-end testing with sample data
3. Test edge cases and error conditions
4. Validate backward compatibility

## Rollback Plan
If issues are encountered during implementation:
1. Revert database migrations
2. Restore previous versions of service files
3. Revert frontend changes
4. Validate system functionality with previous implementation

## Success Criteria
- Gross earnings accurately reflect sum of all collection fee amounts
- Pending and paid calculations correctly filter by collection_fee_status
- Net earnings calculated as Pending - Pending Penalties
- Penalty status properly tracked and displayed
- "Mark as Paid" button updates both collection and penalty statuses
- Paid penalties excluded from future calculations
- All existing functionality preserved
- Comprehensive test coverage achieved