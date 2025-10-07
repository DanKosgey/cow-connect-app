# Dashboard Trends Implementation Guide

This document explains how to implement real-time trend calculations for the Admin Dashboard metrics.

## Overview

The dashboard currently shows hardcoded trend percentages (12%, 8%, 5%, 3%). This guide shows how to replace these with actual calculated trends based on comparing current period data with previous period data.

## Implementation Steps

### 1. Import the Utility Functions

First, import the trend calculation utilities:

```typescript
import { 
  getCurrentPeriodFilter, 
  getPreviousPeriodFilter, 
  calculateMetricsWithTrends 
} from '@/utils/dashboardTrends';
```

### 2. Update the Metrics State

Update the metrics state to include trend information:

```typescript
const [metrics, setMetrics] = useState({
  totalFarmers: 0,
  activeFarmers: 0,
  totalCollections: 0,
  todayCollections: 0,
  totalLiters: 0,
  todayLiters: 0,
  totalRevenue: 0,
  pendingPayments: 0,
  averageQuality: '0',
  staffMembers: 0,
  // Trend data
  farmersTrend: { value: 0, isPositive: true },
  litersTrend: { value: 0, isPositive: true },
  revenueTrend: { value: 0, isPositive: true },
  qualityTrend: { value: 0, isPositive: true }
});
```

### 3. Fetch Previous Period Data

Add a function to fetch data for the previous period:

```typescript
const fetchPreviousPeriodData = useCallback(async () => {
  try {
    const { startDate, endDate } = getPreviousPeriodFilter(timeRange);
    
    // Fetch collections for previous period
    const { data: prevCollectionsData, error: collectionsError } = await supabase
      .from('collections')
      .select('*')
      .gte('collection_date', startDate)
      .lte('collection_date', endDate)
      .order('collection_date', { ascending: false })
      .limit(1000);

    if (collectionsError) throw collectionsError;

    // Fetch farmers for previous period
    const { data: prevFarmersData, error: farmersError } = await supabase
      .from('farmers')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(200);

    if (farmersError) throw farmersError;

    // Fetch payments for previous period
    const { data: prevPaymentsData, error: paymentsError } = await supabase
      .from('collections')
      .select('id, farmer_id, total_amount, collection_date, status')
      .gte('collection_date', startDate)
      .lte('collection_date', endDate)
      .limit(1000);

    if (paymentsError) throw paymentsError;

    return {
      collections: prevCollectionsData || [],
      farmers: prevFarmersData || [],
      payments: prevPaymentsData || []
    };
  } catch (error) {
    console.error('Error fetching previous period data:', error);
    return null;
  }
}, [timeRange]);
```

### 4. Update the Data Processing Function

Modify the data processing function to calculate trends:

```typescript
const processData = useCallback((
  rawCollections: any[],
  farmers: any[],
  staff: any[],
  payments: any[],
  // ... other parameters
) => {
  // ... existing data processing code ...
  
  // Fetch previous period data for trend calculation
  fetchPreviousPeriodData().then(previousData => {
    // Calculate metrics with trends
    const metricsWithTrends = calculateMetricsWithTrends(
      {
        collections: rawCollections,
        farmers,
        staff,
        payments
      },
      previousData
    );
    
    setMetrics(metricsWithTrends);
  });
}, [fetchPreviousPeriodData]);
```

### 5. Update the MetricCard Component Usage

Update the MetricCard components to use the trend data:

```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
  <MetricCard
    icon={Users}
    title="Total Farmers"
    value={formatNumber(metrics.totalFarmers)}
    subtitle={`${metrics.activeFarmers} active`}
    color="#3b82f6"
    trend={metrics.farmersTrend}
  />
  <MetricCard
    icon={Droplets}
    title="Total Liters"
    value={formatNumber(metrics.totalLiters)}
    subtitle={`${formatNumber(metrics.todayLiters)} today`}
    color="#10b981"
    trend={metrics.litersTrend}
  />
  <MetricCard
    icon={DollarSign}
    title="Revenue"
    value={formatCurrency(metrics.totalRevenue)}
    subtitle={formatCurrency(metrics.pendingPayments) + ' pending'}
    color="#f59e0b"
    trend={metrics.revenueTrend}
  />
  <MetricCard
    icon={Award}
    title="Avg Quality"
    value={metrics.averageQuality + '%'}
    subtitle="Quality Score"
    color="#8b5cf6"
    trend={metrics.qualityTrend}
  />
</div>
```

## How It Works

1. **Time Period Comparison**: The system compares the current selected time period with the equivalent previous period (e.g., this week vs. last week).

2. **Trend Calculation**: For each metric, it calculates the percentage change between the current and previous periods:
   ```
   trend = ((current - previous) / previous) * 100
   ```

3. **Direction Indication**: The trend shows whether the change is positive (↑) or negative (↓).

## Example Scenarios

- If current period has 100 farmers and previous period had 80 farmers:
  - Trend = ((100 - 80) / 80) * 100 = 25%
  - Display: ↑ 25% from last period

- If current period has 1000 liters and previous period had 1200 liters:
  - Trend = ((1000 - 1200) / 1200) * 100 = -16.67% → 17%
  - Display: ↓ 17% from last period

## Benefits

1. **Real Data**: Trends are based on actual historical data, not hardcoded values
2. **Dynamic**: Trends update automatically when time periods change
3. **Accurate**: Precise percentage calculations provide meaningful insights
4. **User-Friendly**: Clear visual indication of improvement or decline