# Usage Examples for Modular Variance Reporting Components

## 1. Using Data Fetching Modules

```typescript
import * as dataFetching from './modules/dataFetching';

// Example: Fetch collectors
const collectors = await dataFetching.fetchCollectors();

// Example: Fetch variance data with filters
const { data, count } = await dataFetching.fetchVarianceData(
  user,
  currentPage,
  pageSize,
  dateRange,
  filterCollector,
  filterVarianceType,
  searchTerm,
  showError
);
```

## 2. Using Helper Functions

```typescript
import * as helpers from './modules/helpers';

// Example: Format numbers
const formattedValue = helpers.formatNumber(1234.56, 2); // Returns "1,234.56"

// Example: Calculate percentage change
const percentageChange = helpers.calculatePercentageChange(120, 100); // Returns 20

// Example: Prepare chart data
const chartData = helpers.prepareChartData.varianceTypeData(currentPeriodData);

// Example: Handle sorting
helpers.sortingHelpers.handleSort(
  'approved_at', 
  sortBy, 
  sortOrder, 
  setSortBy, 
  setSortOrder
);
```

## 3. Using Dashboard Sections

```typescript
import * as dashboardSections from './modules/dashboardSections';

// Example: Using HeaderSection
<dashboardSections.HeaderSection 
  isLoading={isLoading} 
  fetchVarianceData={refreshData} 
/>

// Example: Using FiltersSection
<dashboardSections.FiltersSection 
  searchTerm={searchTerm}
  setSearchTerm={setSearchTerm}
  dateRange={dateRange}
  setDateRange={setDateRange}
  // ... other props
/>
```

## 4. Using VarianceSummaryCard

```typescript
import VarianceSummaryCard from './VarianceSummaryCard';

// Example: Total Penalties card (without KSh prefix)
<VarianceSummaryCard
  title="Total Penalties"
  value={300.00}
  previousValue={0.00}
  changePercentage={100.0}
  valueType="currency"
  icon={<Banknote className="h-5 w-5" />}
  colorScheme="negative"
  benchmarkValue={5000}
  benchmarkLabel="Budget Limit"
  isGood={false}
/>
```

## 5. Complete Modular Component Example

```typescript
import React, { useState, useEffect } from 'react';
import * as dataFetching from './modules/dataFetching';
import * as helpers from './modules/helpers';
import * as dashboardSections from './modules/dashboardSections';

const MyVarianceDashboard: React.FC = () => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const result = await dataFetching.fetchVarianceData(/* params */);
      setData(result.data);
      setLoading(false);
    };
    
    loadData();
  }, []);
  
  return (
    <div className="space-y-6">
      <dashboardSections.HeaderSection 
        isLoading={loading} 
        fetchVarianceData={() => {}} 
      />
      
      {data.map(item => (
        <VarianceSummaryCard
          key={item.id}
          title={item.title}
          value={item.value}
          valueType="currency"
        />
      ))}
    </div>
  );
};
```

## 6. Custom Hook Implementation (Future Enhancement)

```typescript
// hooks/useVarianceData.ts
import { useState, useEffect } from 'react';
import * as dataFetching from '../components/admin/variance/modules/dataFetching';

export const useVarianceData = (filters: any) => {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const result = await dataFetching.fetchVarianceData(/* params */);
        setData(result.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [filters]);
  
  return { data, loading, error };
};
```

These examples demonstrate how the modular approach makes the code more maintainable, reusable, and easier to understand.