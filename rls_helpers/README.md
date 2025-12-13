# RLS Helper Functions

This directory contains helper functions that simplify the implementation of Row Level Security (RLS) policies.

## Purpose

RLS helper functions are designed to:

1. Reduce duplication in policy definitions
2. Simplify complex policy logic
3. Improve maintainability of RLS policies
4. Provide consistent role checking across all policies

## Functions

### Role Checking Functions

- `is_admin()` - Returns true if the current user is an admin
- `is_farmer()` - Returns true if the current user is a farmer
- `is_staff()` - Returns true if the current user is staff
- `is_collector()` - Returns true if the current user is a collector
- `is_creditor()` - Returns true if the current user is a creditor

### User Identity Functions

- `get_farmer_id()` - Returns the farmer ID for the current user
- `get_staff_id()` - Returns the staff ID for the current user
- `get_agrovet_staff_id()` - Returns the agrovet staff ID for the current user

### Relationship Checking Functions

- `is_farmer_of_staff(farmer_uuid)` - Returns true if the specified farmer is associated with the current staff user
- `is_collection_of_staff(collection_uuid)` - Returns true if the specified collection is associated with the current staff user
- `has_credit_profile(farmer_uuid)` - Returns true if the specified farmer has a credit profile
- `is_purchase_of_farmer(purchase_uuid)` - Returns true if the specified purchase belongs to the current farmer user

## Usage

These functions can be used in RLS policies to simplify the policy definitions:

```sql
-- Instead of complex EXISTS clauses
CREATE POLICY "Farmers can read their own collections" 
  ON public.collections FOR SELECT 
  TO authenticated
  USING (farmer_id = get_farmer_id());

-- Instead of checking user roles manually
CREATE POLICY "Admins can manage inventory" 
  ON public.inventory_items FOR ALL
  TO authenticated
  USING (is_admin());
```

## Security Considerations

1. All functions are created with `SECURITY DEFINER` to ensure they execute with the proper permissions
2. Functions are restricted to the `public` schema
3. Execute permissions are granted only to `authenticated` users
4. Functions should be regularly reviewed for security vulnerabilities

## Maintenance

When adding new roles or modifying existing ones:

1. Update the appropriate role checking functions
2. Create new helper functions as needed for complex logic
3. Test all functions thoroughly
4. Update this documentation with any changes