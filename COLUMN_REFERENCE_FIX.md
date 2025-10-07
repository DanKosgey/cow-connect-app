# Column Reference Fix

## Problem
The error "column farmers_1.farmer_id does not exist" was occurring because the database query was trying to select a column named [farmer_id](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\types\database.types.ts#L26-L26) from the farmers table, but the farmers table uses [id](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\types\database.types.ts#L26-L26) as its primary key, not [farmer_id](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\types\database.types.ts#L26-L26).

## Root Cause
The issue was in the SELECT queries where we were trying to fetch [farmers(farmer_id)](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\pages\admin\PaymentSystem.ts#L70-L75) instead of [farmers(id)](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\components\staff\EnhancedPerformanceDashboard.tsx#L27-L27). The farmers table schema is:

```sql
CREATE TABLE IF NOT EXISTS public.farmers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES public.profiles(id) ON DELETE CASCADE,
  registration_number text UNIQUE,
  national_id text UNIQUE,
  phone_number text,
  full_name text,
  address text,
  farm_location text,
  kyc_status kyc_status_enum DEFAULT 'pending',
  registration_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid,
  updated_by uuid
);
```

## Solution
I've fixed the column reference issues by updating the SELECT queries to use the correct column names:

### EnhancedStaffDashboard.tsx
1. **Fixed the SELECT query**:
   ```typescript
   // Before (incorrect)
   farmers (
     full_name,
     farmer_id
   )
   
   // After (correct)
   farmers (
     full_name,
     id
   )
   ```

2. **Updated the TypeScript interface**:
   ```typescript
   // Before (incorrect)
   farmers: {
     full_name: string;
     farmer_id: string;
   } | null;
   
   // After (correct)
   farmers: {
     full_name: string;
     id: string;
   } | null;
   ```

3. **Updated the display code**:
   ```typescript
   // Before (incorrect)
   {collection.farmers?.farmer_id}
   
   // After (correct)
   {collection.farmers?.id}
   ```

### PaymentSystem.tsx
1. **Fixed the SELECT queries**:
   ```typescript
   // Before (incorrect)
   farmers:farmer_id (
     id,
     user_id,
     bank_account_name,
     bank_account_number,
     bank_name,
     profiles:user_id (
       full_name,
       phone
     )
   )
   
   // After (correct)
   farmers:id (
     id,
     user_id,
     bank_account_name,
     bank_account_number,
     bank_name,
     profiles:user_id (
       full_name,
       phone
     )
   )
   ```

## How It Works
The fix ensures that:
1. Queries correctly reference the [id](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\types\database.types.ts#L26-L26) column in the farmers table instead of the non-existent [farmer_id](file://c:\Users\PC\OneDrive\Desktop\dairy%20new\cow-connect-app\src\types\database.types.ts#L26-L26) column
2. TypeScript interfaces match the actual data structure returned by the queries
3. Display code references the correct field names

## Benefits
- **Eliminates column reference errors** - No more "column farmers_1.farmer_id does not exist" errors
- **Maintains data integrity** - Proper relationships between tables are maintained
- **Improves type safety** - TypeScript interfaces match the actual data structure
- **Enhances reliability** - Components handle data correctly

## Testing
To verify the fix:
1. Navigate to the staff dashboard
2. Check that farmer information displays correctly
3. Verify that no column reference errors occur
4. Test the payment system to ensure farmer data loads properly

## Future Considerations
- Consider implementing a centralized type definition for database entities
- Add validation for database queries to catch column reference issues early
- Implement comprehensive testing for all database queries