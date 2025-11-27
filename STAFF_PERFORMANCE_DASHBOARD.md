# Staff Performance Dashboard

## Overview

The Staff Performance Dashboard replaces the previous Collector Performance Dashboard. Instead of tracking collector performance metrics, this dashboard focuses on monitoring the performance of staff members who approve milk collections.

## Key Changes

1. **Replaced Collector Performance Dashboard** with Staff Performance Dashboard
2. **Focus Shift**: From tracking collectors to tracking staff members with the "staff" role
3. **Metrics Focus**: Performance of staff members approving milk collections rather than collecting them

## Database Schema

### New Tables

#### staff_performance

Tracks performance metrics for staff members who approve milk collections.

```sql
CREATE TABLE public.staff_performance (
  id BIGSERIAL PRIMARY KEY,
  staff_id UUID REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_approvals INTEGER DEFAULT 0,
  total_collections_approved INTEGER DEFAULT 0,
  total_liters_approved NUMERIC(10,2) DEFAULT 0,
  total_variance_handled NUMERIC(10,2) DEFAULT 0,
  average_variance_percentage NUMERIC(5,2) DEFAULT 0,
  positive_variances INTEGER DEFAULT 0,
  negative_variances INTEGER DEFAULT 0,
  total_penalty_amount NUMERIC(10,2) DEFAULT 0,
  accuracy_score NUMERIC(5,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(staff_id, period_start, period_end)
);
```

### Functions

#### calculate_staff_performance

Calculates performance metrics for a staff member over a specified period.

#### update_staff_performance

Inserts or updates a staff performance record based on calculated metrics.

#### trigger_update_staff_performance

Trigger function that automatically updates staff performance when a new approval is made.

## Frontend Components

### StaffPerformanceDashboard.tsx

React component that displays staff performance metrics in the staff portal.

Location: `src/pages/staff-portal/StaffPerformanceDashboard.tsx`

## Routes

The dashboard is accessible at: `/staff-only/staff-performance`

Updated in: `src/routes/staff-only.routes.tsx`

## Migration Files

1. `20251127000200_create_staff_performance_table.sql` - Creates the staff_performance table
2. `20251127000300_create_staff_performance_functions.sql` - Creates functions for calculating and updating performance metrics
3. `20251127000300_create_staff_performance_functions_fixed.sql` - Fixed version with proper date handling
4. `20251127000400_fix_staff_performance_data.sql` - Fixes existing data and adds constraints
5. `20251127000500_fix_staff_rls_policies.sql` - Fixes RLS policies for staff access

## Scripts

1. `scripts/populate-staff-performance.ts` - Populates initial staff performance data
2. `scripts/test-staff-performance.ts` - Tests staff performance functions
3. `scripts/test-staff-performance-fixed.ts` - Tests fixed staff performance functions with proper date handling
4. `scripts/debug-staff-performance.ts` - Debug script to diagnose staff performance issues
5. `scripts/test-staff-rls-policies.ts` - Tests RLS policies for staff members
6. `scripts/diagnose-staff-permissions.ts` - Diagnoses staff permission issues

## Access Control

- Staff members can view their own performance records
- Admins can view, insert, update, and delete all performance records