import { format } from 'date-fns';

// Format date
export const formatDate = (date: string) => {
  return format(new Date(date), 'dd/MM/yyyy HH:mm:ss');
};

// Format number
export const formatNumber = (num: number, decimalPlaces: number = 2) => {
  return num.toLocaleString(undefined, { minimumFractionDigits: decimalPlaces, maximumFractionDigits: decimalPlaces });
};

// Render variance type badge
export const renderVarianceType = (type: string) => {
  switch (type) {
    case 'positive':
      return { variant: 'default', text: 'Positive' };
    case 'negative':
      return { variant: 'destructive', text: 'Negative' };
    default:
      return { variant: 'default', text: 'Unknown' };
  }
};

// Render variance icon
export const renderVarianceIcon = (type: string) => {
  switch (type) {
    case 'positive':
      return 'TrendingUp';
    case 'negative':
      return 'TrendingDown';
    default:
      return 'Minus';
  }
};

// Calculate percentage change
export const calculatePercentageChange = (current: number, previous: number) => {
  if (previous === 0) return current > 0 ? 100 : 0;
  return ((current - previous) / previous) * 100;
};

// Get variance type color
export const getVarianceTypeColor = (varianceType: string) => {
  switch (varianceType) {
    case 'positive':
      return 'bg-green-100 text-green-800';
    case 'negative':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
};

// Get variance severity color
export const getVarianceSeverityColor = (percentage: number) => {
  const absPercentage = Math.abs(percentage);
  if (absPercentage >= 10) return 'bg-red-500 text-white';
  if (absPercentage >= 5) return 'bg-orange-500 text-white';
  if (absPercentage > 0) return 'bg-yellow-500 text-white';
  return 'bg-green-500 text-white';
};

// Prepare data for charts
export const prepareChartData = {
  varianceTypeData: (currentPeriodData: any) => {
    // Handle case where there are no variances at all
    if (currentPeriodData.positive_variances === 0 && currentPeriodData.negative_variances === 0) {
      return [
        { name: 'No Variances', value: 1 }
      ];
    }
    
    // Handle case where there are only negative variances
    if (currentPeriodData.positive_variances === 0 && currentPeriodData.negative_variances > 0) {
      return [
        { name: 'Positive', value: 0 },
        { name: 'Negative', value: currentPeriodData.negative_variances }
      ];
    }
    
    // Handle case where there are only positive variances
    if (currentPeriodData.positive_variances > 0 && currentPeriodData.negative_variances === 0) {
      return [
        { name: 'Positive', value: currentPeriodData.positive_variances },
        { name: 'Negative', value: 0 }
      ];
    }
    
    return [
      { name: 'Positive', value: currentPeriodData.positive_variances },
      { name: 'Negative', value: currentPeriodData.negative_variances }
    ];
  },
  
  collectorPerformanceData: (collectorPerformance: any[]) => 
    collectorPerformance
      .sort((a, b) => b.average_variance_percentage - a.average_variance_percentage)
      .slice(0, 10),
  
  trendChartData: (trendData: any[]) => trendData.map(item => ({
    date: format(new Date(item.date), 'MMM dd'),
    'Positive Variances': item.positive_variance_count,
    'Negative Variances': item.negative_variance_count,
    'Avg. Positive Variance %': item.average_positive_variance,
    'Avg. Negative Variance %': Math.abs(item.average_negative_variance),
    'Total Penalties': item.total_penalty_amount
  })),
  
  // Chart data keys
  chartKeys: {
    varianceType: [
      { key: 'Positive Variances', name: 'Positive Variances', color: '#10B981' },
      { key: 'Negative Variances', name: 'Negative Variances', color: '#EF4444' }
    ],
    
    variancePercentage: [
      { key: 'Avg. Positive Variance %', name: 'Avg. Positive Variance %', color: '#10B981' },
      { key: 'Avg. Negative Variance %', name: 'Avg. Negative Variance %', color: '#EF4444' }
    ],
    
    penalty: [
      { key: 'Total Penalties', name: 'Total Penalties (KSh)', color: '#8B5CF6' }
    ]
  }
};

// Handle chart interactions
export const handleChartInteractions = {
  pieChartSegmentClick: (data: any) => {
    console.log('Pie chart segment clicked:', data);
    // In a real implementation, you might filter the data based on the clicked segment
  },
  
  barChartClick: (data: any) => {
    console.log('Bar chart clicked:', data);
    // In a real implementation, you might drill down into the data
  }
};

// Pagination helpers
export const paginationHelpers = {
  goToPage: (page: number, currentPage: number, totalPages: number, setCurrentPage: (page: number) => void) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
    }
  }
};

// Sorting helpers
export const sortingHelpers = {
  handleSort: (column: string, sortBy: string, sortOrder: 'asc' | 'desc', setSortBy: (column: string) => void, setSortOrder: (order: 'asc' | 'desc') => void) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  },
  
  handleCollectorSort: (column: string, collectorSortBy: string, collectorSortOrder: 'asc' | 'desc', setCollectorSortBy: (column: string) => void, setCollectorSortOrder: (order: 'asc' | 'desc') => void) => {
    if (collectorSortBy === column) {
      setCollectorSortOrder(collectorSortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setCollectorSortBy(column);
      setCollectorSortOrder('asc');
    }
  }
};