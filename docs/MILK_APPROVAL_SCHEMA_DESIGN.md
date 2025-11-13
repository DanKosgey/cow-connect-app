# Milk Approval Workflow Schema Design

## Overview
This document outlines the database schema design for the milk approval workflow with variance tracking. The system will track the difference between milk collected by collectors and milk received at the company, with penalties for both positive and negative variances.

## Current Collections Table Structure
The existing [collections](file:///d:/dairy%20new/cow-connect-app/src/services/analytics-service.ts#L335-L377) table has the following relevant fields:
- `id` (uuid)
- `collection_id` (text)
- `farmer_id` (uuid)
- `staff_id` (uuid)
- `liters` (numeric) - Amount collected by collector
- `quality_grade` (quality_grade_enum)
- `rate_per_liter` (numeric)
- `total_amount` (numeric)
- `status` (collection_status_enum: 'Collected', 'Verified', 'Paid', 'Cancelled')
- `created_at`, `updated_at` (timestamps)

## New Tables Required

### 1. Milk Approvals Table
This table will track the approval process when milk is received at the company.

```sql
CREATE TABLE IF NOT EXISTS public.milk_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  collection_id uuid NOT NULL REFERENCES public.collections(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.staff(id) ON DELETE SET NULL,
  company_received_liters numeric NOT NULL,
  variance_liters numeric GENERATED ALWAYS AS (company_received_liters - (SELECT liters FROM public.collections WHERE id = collection_id)) STORED,
  variance_percentage numeric GENERATED ALWAYS AS (CASE WHEN (SELECT liters FROM public.collections WHERE id = collection_id) > 0 THEN (company_received_liters - (SELECT liters FROM public.collections WHERE id = collection_id)) / (SELECT liters FROM public.collections WHERE id = collection_id) * 100 ELSE 0 END) STORED,
  variance_type varchar(10) GENERATED ALWAYS AS (CASE 
    WHEN company_received_liters > (SELECT liters FROM public.collections WHERE id = collection_id) THEN 'positive' 
    WHEN company_received_liters < (SELECT liters FROM public.collections WHERE id = collection_id) THEN 'negative' 
    ELSE 'none' 
  END) STORED,
  penalty_amount numeric DEFAULT 0,
  approval_notes text,
  approved_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

### 2. Collector Performance Metrics Table
This table will track collector performance based on variances.

```sql
CREATE TABLE IF NOT EXISTS public.collector_performance (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id uuid NOT NULL REFERENCES public.staff(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  total_collections integer DEFAULT 0,
  total_liters_collected numeric DEFAULT 0,
  total_liters_received numeric DEFAULT 0,
  total_variance numeric DEFAULT 0,
  average_variance_percentage numeric DEFAULT 0,
  positive_variances integer DEFAULT 0,
  negative_variances integer DEFAULT 0,
  total_penalty_amount numeric DEFAULT 0,
  performance_score numeric DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(staff_id, period_start, period_end)
);
```

### 3. Penalty Configuration Table
This table will store configurable penalty rates for variances.

```sql
CREATE TABLE IF NOT EXISTS public.variance_penalty_config (
  id bigserial PRIMARY KEY,
  variance_type varchar(10) NOT NULL, -- 'positive' or 'negative'
  min_variance_percentage numeric NOT NULL,
  max_variance_percentage numeric NOT NULL,
  penalty_rate_per_liter numeric NOT NULL,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

## Modifications to Existing Tables

### Collections Table Enhancement
We need to add a field to track if a collection has been approved:

```sql
ALTER TABLE public.collections 
ADD COLUMN IF NOT EXISTS approved_for_company boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS company_approval_id uuid REFERENCES public.milk_approvals(id) ON DELETE SET NULL;
```

## Indexes for Performance

```sql
CREATE INDEX IF NOT EXISTS idx_milk_approvals_collection ON public.milk_approvals (collection_id);
CREATE INDEX IF NOT EXISTS idx_milk_approvals_staff ON public.milk_approvals (staff_id);
CREATE INDEX IF NOT EXISTS idx_milk_approvals_date ON public.milk_approvals (approved_at);
CREATE INDEX IF NOT EXISTS idx_collector_performance_staff ON public.collector_performance (staff_id);
CREATE INDEX IF NOT EXISTS idx_collector_performance_period ON public.collector_performance (period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_collections_approved ON public.collections (approved_for_company);
```

## Enum Types

We may need to add a new enum for variance types:

```sql
DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'variance_type_enum') THEN
        CREATE TYPE variance_type_enum AS ENUM ('positive', 'negative', 'none');
    END IF;
END$$;
```

## Relationships

1. Each [collections](file:///d:/dairy%20new/cow-connect-app/src/services/analytics-service.ts#L335-L377) record can have at most one [milk_approvals](file:///d:/dairy%20new/cow-connect-app/src/types/database.types.ts#L306-L356) record
2. Each [milk_approvals](file:///d:/dairy%20new/cow-connect-app/src/types/database.types.ts#L306-L356) record belongs to one [collections](file:///d:/dairy%20new/cow-connect-app/src/services/analytics-service.ts#L335-L377) record
3. Each [milk_approvals](file:///d:/dairy%20new/cow-connect-app/src/types/database.types.ts#L306-L356) record is processed by one [staff](file:///d:/dairy%20new/cow-connect-app/supabase/migrations/20240001_create_base_tables.sql#L57-L97) member
4. Each [collector_performance](file:///d:/dairy%20new/cow-connect-app/src/types/database.types.ts#L306-L356) record belongs to one [staff](file:///d:/dairy%20new/cow-connect-app/supabase/migrations/20240001_create_base_tables.sql#L57-L97) member
5. Multiple [variance_penalty_config](file:///d:/dairy%20new/cow-connect-app/src/types/database.types.ts#L306-L356) records can exist for different variance ranges

## Workflow Description

1. Collector records milk collection in the system (existing functionality)
2. Milk is transported to the company
3. Staff member weighs the milk at the company and records the actual received amount
4. System calculates variance between collected and received amounts
5. System applies penalties based on configured rates
6. System updates collector performance metrics
7. System sends notifications about approval status