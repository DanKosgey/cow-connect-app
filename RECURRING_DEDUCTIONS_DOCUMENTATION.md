# Recurring Deductions System Documentation

## Overview

The Recurring Deductions System is an enhancement to the existing deduction system that allows administrators to set up automatic, recurring deductions for farmers. These deductions can be scheduled to occur daily, weekly, monthly, or yearly and are automatically applied to farmer payments.

## Features

1. **Recurring Deduction Scheduling**
   - Set up deductions with daily, weekly, monthly, or yearly frequencies
   - Specify the next application date for each deduction
   - Automatic rescheduling after each deduction is applied

2. **Automatic Deduction Application**
   - Scheduled job that runs hourly to check for due deductions
   - Automatic application of deductions on their scheduled dates
   - Proper logging and audit trail for all deduction activities

3. **Integration with Payment System**
   - Deductions are automatically calculated and applied when marking payments as paid
   - Deduction amounts are displayed in farmer payment details
   - Net payment amounts are adjusted to reflect deduction totals

4. **Admin Interface**
   - Enhanced Deductions Management page with frequency selection
   - Next apply date selection for scheduling
   - Visual indicators for recurring deductions

## Database Schema Changes

### farmer_deductions Table Enhancements

The `farmer_deductions` table has been enhanced with two new columns:

- `frequency`: Defines how often the deduction should be applied (daily, weekly, monthly, yearly)
- `next_apply_date`: Specifies the next date when the deduction should be applied

### farmer_payments Table Enhancement

The `farmer_payments` table has a new column:

- `deductions_used`: Stores the total amount of deductions applied to a payment

## How It Works

### 1. Setting Up Recurring Deductions

Administrators can set up recurring deductions through the Deductions Management page:

1. Navigate to the "Farmer Deductions" section
2. Click "Add Farmer Deduction"
3. Select the farmer and deduction type
4. Enter the deduction amount
5. Choose the frequency (daily, weekly, monthly, yearly)
6. Set the next apply date
7. Save the deduction

### 2. Setting Up Recurring Services for All Farmers

Administrators can set up recurring services for all farmers:

1. Navigate to the Deductions Management page
2. Click "Recurring Service (All Farmers)"
3. Select the service type
4. Enter the service amount
5. Choose the frequency (daily, weekly, monthly, yearly)
6. Set the start date
7. Click "Create Recurring Service"

This will create the same recurring deduction for all farmers in the system with the specified parameters.

### 2. Automatic Application Process

The system automatically applies recurring deductions through a background scheduler:

1. An hourly job checks for deductions due for application
2. For each due deduction:
   - A deduction record is created in the `deduction_records` table
   - The next apply date is calculated based on the frequency
   - The farmer deduction record is updated with the new next apply date

### 3. Payment Integration

When payments are marked as paid:

1. The system calculates the total active deductions for the farmer
2. The deduction amount is subtracted from the total payment
3. The `deductions_used` field is populated in the payment record
4. The `net_payment` field reflects the amount after deductions

### 4. Farmer Payment Display

The farmer payment details page now shows:

- Total deduction amounts in the statistics cards
- Individual deduction records in the deduction history

## Frequency Calculation Logic

- **Daily**: Next date is set to tomorrow
- **Weekly**: Next date is set to 7 days from now
- **Monthly**: Next date is set to the same day next month
- **Yearly**: Next date is set to the same day next year

## Error Handling

The system includes comprehensive error handling:

- Failed deduction applications are logged and retried
- Invalid frequencies are rejected with clear error messages
- Database errors are properly caught and logged
- Partial failures don't affect other deductions

## Audit Trail

All deduction activities are logged in the `audit_logs` table:

- Creation of recurring deductions
- Updates to deduction schedules
- Automatic application of deductions
- Deletion of deductions

## Security

- Only administrators can manage recurring deductions
- All operations are logged for audit purposes
- Proper validation prevents invalid data entry
- Row Level Security (RLS) policies ensure data isolation

## Testing

The system includes automated tests for:

- Frequency calculation logic
- Deduction application scheduling
- Payment integration
- Error handling scenarios

## Deployment

To deploy the recurring deduction system:

1. Apply the database migrations
2. Deploy the updated service files
3. Deploy the updated UI components
4. Restart the application to initialize the scheduler

## Monitoring

The system logs all activities for monitoring:

- Successful deduction applications
- Failed deduction attempts
- Scheduler status
- Performance metrics

## Troubleshooting

Common issues and solutions:

1. **Deductions not applying**: Check the scheduler logs and ensure the application is running
2. **Incorrect next apply dates**: Verify the frequency settings and date calculations
3. **Payment amounts not reflecting deductions**: Confirm the payment service integration is working
4. **Database errors**: Check the database logs and ensure all migrations have been applied

## Future Enhancements

Planned improvements:

1. Custom frequency intervals (e.g., every 2 weeks)
2. End dates for recurring deductions
3. Notification system for upcoming deductions
4. Bulk scheduling operations
5. Advanced reporting on deduction patterns
6. Enhanced UI for managing recurring services for all farmers
7. Bulk editing capabilities for recurring deductions