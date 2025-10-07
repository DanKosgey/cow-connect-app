# `.single()` Query Fixes

## Overview
This document summarizes the fixes made to resolve 406 Not Acceptable errors caused by incorrect usage of `.single()` in Supabase queries. The issue occurs when a query with `.single()` returns multiple rows or no rows, causing PostgREST to fail to produce a response matching the `application/vnd.pgrst.object+json` Accept header.

## Issues Fixed

### 1. EnhancedCollectionForm Component
**File**: `src/components/staff/EnhancedCollectionForm.tsx`

**Issue**:
- The milk_rates query was using `.single()` but could return multiple active rates or no active rates
- This caused a 406 Not Acceptable error when the query returned more than one row or no rows

**Fix**:
```javascript
// Before (incorrect)
const { data: rateData, error: rateError } = await supabase
  .from('milk_rates')
  .select('rate_per_liter')
  .eq('is_active', true)
  .single();

// After (correct)
const { data: rateData, error: rateError } = await supabase
  .from('milk_rates')
  .select('rate_per_liter')
  .eq('is_active', true)
  .order('effective_from', { ascending: false })
  .limit(1);

if (!rateError && rateData && rateData.length > 0) {
  setCurrentRate(rateData[0].rate_per_liter);
}
```

## Root Cause Analysis

### When to Use `.single()`
The `.single()` method should only be used when:
1. You are certain the query will return exactly one row
2. The table has a unique constraint that guarantees only one result
3. You are querying by a primary key or unique identifier

### When NOT to Use `.single()`
Avoid `.single()` when:
1. The query might return multiple rows
2. The query might return zero rows
3. There's no unique constraint guaranteeing a single result

## Best Practices

### 1. For Queries Expected to Return One Row
```javascript
// When querying by primary key or unique constraint
const { data, error } = await supabase
  .from('users')
  .select('id, name, email')
  .eq('id', userId)
  .single();

// Handle the case where no row is found
if (error && error.code === 'PGRST116') {
  // No user found
  console.log('User not found');
} else if (error) {
  // Other error
  console.error('Error:', error);
} else {
  // User found
  console.log('User:', data);
}
```

### 2. For Queries That Might Return Multiple or Zero Rows
```javascript
// Use limit(1) instead of single() when you want the first result
const { data, error } = await supabase
  .from('milk_rates')
  .select('rate_per_liter')
  .eq('is_active', true)
  .order('effective_from', { ascending: false })
  .limit(1);

if (!error && data && data.length > 0) {
  const currentRate = data[0].rate_per_liter;
  // Use the rate
} else {
  // Handle no active rates found
  console.log('No active rates found');
}
```

### 3. Error Handling for `.single()` Queries
```javascript
try {
  const { data, error } = await supabase
    .from('table')
    .select('column')
    .eq('condition', value)
    .single();
    
  if (error) {
    if (error.code === 'PGRST116') {
      // No rows returned
      console.log('No data found');
    } else {
      // Other error
      throw error;
    }
  } else {
    // Process data
    console.log('Data:', data);
  }
} catch (error) {
  console.error('Query failed:', error);
}
```

## Verification

The fixes ensure that:
1. Queries that might return multiple or zero rows use `limit(1)` instead of `.single()`
2. Proper error handling is implemented for all query results
3. No more 406 Not Acceptable errors should occur due to `.single()` misuse

These changes maintain the functionality of the staff portal while ensuring proper database access patterns and error handling.