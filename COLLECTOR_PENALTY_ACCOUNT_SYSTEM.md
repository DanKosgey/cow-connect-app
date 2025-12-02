# Collector Penalty Account System

## Overview

This document describes the new collector penalty account system that mirrors the farmer credit system. The system tracks penalties incurred by collectors and deducts them when payments are processed, similar to how credits are deducted from farmer accounts.

## Key Features

1. **Penalty Account Tracking**: Each collector now has a dedicated penalty account that tracks:
   - Pending penalties (penalties awaiting deduction)
   - Total penalties incurred (lifetime total)
   - Total penalties paid (lifetime total)
   - Account freeze status

2. **Penalty Transaction History**: All penalty movements are tracked with detailed transaction records:
   - Penalty incurred transactions
   - Penalty paid transactions
   - Penalty adjustment transactions

3. **Integration with Payment Processing**: When collector payments are marked as paid, applicable penalties are automatically deducted from their penalty accounts.

## Database Schema

### New Tables

#### collector_penalty_accounts
Tracks penalty balances for each collector.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| collector_id | UUID | Foreign key to staff table |
| pending_penalties | NUMERIC(10,2) | Penalties awaiting deduction (default: 0) |
| total_penalties_incurred | NUMERIC(10,2) | Total penalties ever incurred (default: 0) |
| total_penalties_paid | NUMERIC(10,2) | Total penalties actually paid (default: 0) |
| is_frozen | BOOLEAN | Account freeze status (default: false) |
| created_at | TIMESTAMPTZ | Record creation timestamp |
| updated_at | TIMESTAMPTZ | Record last update timestamp |

#### collector_penalty_transactions
Tracks all penalty movements with detailed records.

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| collector_id | UUID | Foreign key to staff table |
| transaction_type | TEXT | Type of transaction (penalty_incurred, penalty_paid, penalty_adjusted) |
| amount | NUMERIC(10,2) | Transaction amount |
| balance_after | NUMERIC(10,2) | Account balance after transaction |
| reference_type | TEXT | Reference type (optional) |
| reference_id | UUID | Reference ID (optional) |
| description | TEXT | Transaction description (optional) |
| created_by | UUID | User who created transaction (optional) |
| created_at | TIMESTAMPTZ | Transaction timestamp |

## Services

### CollectorPenaltyAccountService
Manages collector penalty accounts and transactions.

#### Key Methods

- `getOrCreatePenaltyAccount(collectorId: string)`: Gets or creates a penalty account for a collector
- `incurPenalty(...)`: Adds a penalty to a collector's account
- `deductPenalty(...)`: Deducts a penalty from a collector's account
- `getPenaltyBalance(collectorId: string)`: Gets penalty balance information
- `getTransactionHistory(collectorId: string)`: Gets penalty transaction history
- `setAccountFrozenStatus(...)`: Freezes/unfreezes a collector's penalty account

### CollectorEarningsService
Modified to integrate with the penalty account system.

#### Modified Method

- `markPaymentAsPaid(paymentId: string)`: Now deducts applicable penalties from collector's penalty account when marking payments as paid

## Integration with Existing Systems

### Payment Processing
When `markPaymentAsPaid` is called:
1. The system calculates applicable penalties for the payment period
2. Checks the collector's penalty account for pending penalties
3. Deducts penalties from the collector's account
4. Creates transaction records for the deduction
5. Proceeds with normal payment processing

### UI Components
Updated UI components to display penalty information:
- Collector portal payment pages show penalty details
- Admin collector management pages show penalty account information
- Payment history tables include penalty columns

## Migration

### Database Migration
The system requires the new database tables to be created:
- `collector_penalty_accounts`
- `collector_penalty_transactions`

These tables are created via the migration script: `20251202001_create_collector_penalty_accounts.sql`

### Backward Compatibility
The system maintains backward compatibility with existing data and processes. Existing collector payments will continue to function normally, with the new penalty deduction feature only applying to new payment processing.

## Testing

### Unit Tests
Comprehensive unit tests have been created for:
- `CollectorPenaltyAccountService`
- Modified `CollectorEarningsService` methods

### Integration Tests
End-to-end tests verify the complete penalty deduction workflow.

## Future Enhancements

1. **Penalty Reporting**: Detailed penalty reporting and analytics
2. **Automated Penalty Processing**: Automatic penalty deduction during payment generation
3. **Collector Notifications**: Notifications to collectors about penalty deductions
4. **Admin Controls**: Enhanced admin controls for penalty account management