# Deduction System Documentation

## Overview

The Deduction System is a new feature that allows administrators to manage various types of deductions that can be applied to farmers' payments. This system supports both recurring deductions for individual farmers and immediate deductions that can be applied to all farmers at once.

## Features

1. **Deduction Types Management**
   - Create, update, and delete deduction types
   - Predefined types: System Maintenance, Taxes, Insurance, SACCO

2. **Farmer-Specific Deductions**
   - Configure recurring deductions for individual farmers
   - Manage active/inactive status of deductions
   - Set frequency (daily, weekly, monthly, yearly) for recurring deductions
   - Schedule next application date

3. **Immediate Deductions**
   - Apply one-time deductions to all farmers
   - Specify reason for the deduction

4. **Audit Logging**
   - All deduction activities are logged for compliance
   - Tracks creation, updates, and deletions

5. **Validation & Error Handling**
   - Comprehensive input validation
   - Proper error handling and user feedback

6. **Automatic Scheduling**
   - Recurring deductions are automatically applied on schedule
   - Hourly scheduler checks for due deductions
   - Automatic rescheduling after application

## Database Schema

### deduction_types
Stores different types of deductions that can be applied.

```sql
CREATE TABLE IF NOT EXISTS public.deduction_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### farmer_deductions
Links farmers to deduction types with specific amounts for recurring deductions.

```sql
CREATE TABLE IF NOT EXISTS public.farmer_deductions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  farmer_id uuid NOT NULL REFERENCES public.farmers(id) ON DELETE CASCADE,
  deduction_type_id uuid NOT NULL REFERENCES public.deduction_types(id) ON DELETE CASCADE,
  amount numeric NOT NULL DEFAULT 0,
  is_active boolean DEFAULT true,
  frequency text CHECK (frequency IN ('daily', 'weekly', 'monthly', 'yearly')) DEFAULT 'monthly',
  next_apply_date date DEFAULT CURRENT_DATE,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(farmer_id, deduction_type_id)
);
```

### deduction_records
Tracks when deductions are applied, including immediate deductions for all farmers.

```sql
CREATE TABLE IF NOT EXISTS public.deduction_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deduction_type_id uuid NOT NULL REFERENCES public.deduction_types(id) ON DELETE CASCADE,
  farmer_id uuid REFERENCES public.farmers(id) ON DELETE CASCADE, -- Nullable to support global deductions
  amount numeric NOT NULL,
  reason text,
  applied_by uuid REFERENCES public.profiles(id),
  applied_at timestamptz DEFAULT now()
);
```

## API Endpoints

### Deduction Types
- `GET /deduction-types` - Get all deduction types
- `POST /deduction-types` - Create a new deduction type
- `PUT /deduction-types/:id` - Update an existing deduction type
- `DELETE /deduction-types/:id` - Delete a deduction type

### Farmer Deductions
- `GET /farmer-deductions` - Get all farmer deductions
- `POST /farmer-deductions` - Create or update a farmer deduction

### Deduction Records
- `GET /deduction-records` - Get all deduction records
- `POST /immediate-deduction` - Apply an immediate deduction to all farmers

## Service Functions

### DeductionService
Located in `src/services/deduction-service.ts`

- `getDeductionTypes(): Promise<DeductionType[]>`
- `createDeductionType(name: string, description: string, userId?: string): Promise<DeductionType | null>`
- `updateDeductionType(id: string, name: string, description: string, userId?: string): Promise<DeductionType | null>`
- `deleteDeductionType(id: string, userId?: string): Promise<boolean>`
- `getFarmerDeductions(): Promise<any[]>`
- `saveFarmerDeduction(farmer_id: string, deduction_type_id: string, amount: number, frequency: 'daily' | 'weekly' | 'monthly' | 'yearly', next_apply_date: string, userId?: string): Promise<boolean>`
- `createRecurringDeductionForAllFarmers(deduction_type_id: string, amount: number, frequency: 'daily' | 'weekly' | 'monthly' | 'yearly', start_date: string, applied_by: string): Promise<{success: boolean, createdCount: number, errors: string[]}>`
- `getDeductionRecords(): Promise<any[]>`
- `applyImmediateDeduction(deduction_type_id: string, amount: number, reason: string, applied_by: string): Promise<boolean>`
- `getActiveDeductionsForFarmer(farmer_id: string): Promise<FarmerDeduction[]>`
- `calculateTotalDeductionsForFarmer(farmer_id: string): Promise<number>`
- `getAllFarmersWithDeductions(): Promise<any[]>`
- `applyDueRecurringDeductions(applied_by: string): Promise<{success: boolean, appliedCount: number, errors: string[]}>`

## Integration with Payment System

The deduction system integrates with the existing payment calculations in the collector earnings service and farmer payments. When calculating payments, the system will:

1. Calculate total earnings for collectors based on their collections
2. Apply any applicable penalties as before
3. Deduct any active farmer deductions from the final payment amount

This is implemented in the `calculateCollectorDeductions` function in `src/services/collector-earnings-service.ts`.

Additionally, when marking farmer payments as paid:

1. The system calculates total active deductions for the farmer
2. The deduction amount is subtracted from the total payment
3. The `deductions_used` field is populated in the payment record
4. The `net_payment` field reflects the amount after deductions

## Admin Interface

The Deduction Management page is accessible at `/admin/deductions` and provides:

1. **Deduction Types Management**
   - List all deduction types
   - Add new deduction types
   - Edit existing deduction types
   - Delete unused deduction types

2. **Farmer Deductions**
   - View all farmer-specific deductions
   - Add new farmer deductions with frequency selection
   - Set next apply dates for scheduling
   - See deduction status (active/inactive)
   - View frequency and next apply date information

3. **Deduction Records**
   - View history of all applied deductions
   - See who applied the deduction and when
   - View reasons for immediate deductions

4. **Immediate Deduction**
   - Apply a one-time deduction to all farmers
   - Specify deduction type, amount, and reason

## Usage Examples

### Creating a New Deduction Type
1. Navigate to Deduction Management page
2. Click "Add Deduction Type"
3. Enter name (e.g., "SACCO Contribution")
4. Add description (optional)
5. Click "Create"

### Adding a Farmer Deduction
1. Navigate to Deduction Management page
2. Click "Add Farmer Deduction"
3. Select farmer from dropdown
4. Select deduction type
5. Enter amount
6. Select frequency (daily, weekly, monthly, yearly)
7. Set next apply date
8. Click "Save Deduction"

### Applying Immediate Deduction
1. Navigate to Deduction Management page
2. Click "Immediate Deduction (All Farmers)"
3. Select deduction type
4. Enter amount
5. Enter reason
6. Click "Apply Deduction"

### Creating Recurring Service for All Farmers
1. Navigate to Deduction Management page
2. Click "Recurring Service (All Farmers)"
3. Select service type
4. Enter amount
5. Select frequency (daily, weekly, monthly, yearly)
6. Set start date
7. Click "Create Recurring Service"

## Security & Permissions

- Only administrators can access the deduction management system
- All actions are logged for audit purposes
- Proper validation prevents invalid data entry
- Row Level Security (RLS) policies ensure data isolation

## Future Enhancements

1. **Scheduled Deductions** - Automatically apply deductions on specific dates
2. **Deduction Reports** - Generate reports on deduction trends and patterns
3. **Percentage-Based Deductions** - Support for percentage-based rather than fixed amount deductions
4. **Deduction Categories** - Group deduction types for better organization
5. **Farmer Notification** - Notify farmers when deductions are applied
6. **Bulk Operations** - Support for bulk editing and management of recurring deductions
7. **Enhanced Scheduling** - More flexible scheduling options including custom intervals

## Troubleshooting

### Common Issues

1. **Cannot delete deduction type**
   - Ensure no farmers have active deductions of this type
   - Deactivate farmer deductions first, then delete the type

2. **Validation errors**
   - Check that all required fields are filled
   - Ensure amounts are positive and within limits
   - Verify reason field is not empty for immediate deductions

3. **Permission denied**
   - Ensure you are logged in as an administrator
   - Check that your account has the necessary permissions

### Logging
All deduction activities are logged in the `audit_logs` table with table_name = 'deductions'.