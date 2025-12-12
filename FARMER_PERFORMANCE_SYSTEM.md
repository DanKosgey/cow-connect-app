# Farmer Performance Tracking System

## Overview
This document describes the redesigned farmer performance tracking system that evaluates farmers based purely on their collection activities. The system removes all quality-based metrics and focuses exclusively on collection volume, frequency, and consistency.

## Key Changes from Previous System

### Issues with Old System
1. Farmers with zero collections received a score of 23 due to hardcoded quality metrics
2. Quality scores were not calculable and defaulted to 75
3. Performance scores didn't accurately reflect actual farmer activity

### Improvements in New System
1. Farmers with zero collections now receive a score of 0
2. Performance is based entirely on measurable collection metrics
3. Scoring is fair, transparent, and actionable

## Performance Calculation Methodology

### Core Metrics

#### 1. Collection Volume Score (40% weight)
Measures the total amount of milk collected from a farmer:
- 0L: 0 points
- 1-500L: 1-20 points (linear scaling)
- 501-1500L: 21-40 points
- 1501-3000L: 41-70 points
- 3001L+: 71-100 points (capped)

#### 2. Collection Frequency Score (35% weight)
Measures how often a farmer delivers milk:
- 0 collections/week: 0 points
- 0.1-0.5 collections/week: 10-25 points
- 0.6-1.5 collections/week: 26-50 points
- 1.6-3 collections/week: 51-75 points
- 3+ collections/week: 76-100 points (capped)

#### 3. Collection Consistency Score (25% weight)
Measures the regularity of collections:
- 0% consistency: 0 points
- 1-25% consistency: 5-20 points
- 26-50% consistency: 21-40 points
- 51-75% consistency: 41-65 points
- 76-100% consistency: 66-100 points (capped)

### Overall Performance Score
Calculated as a weighted average:
```
Performance Score = (Volume Score × 0.4) + (Frequency Score × 0.35) + (Consistency Score × 0.25)
```

Special case: If all component scores are 0, the performance score is 0.

### Performance Categories
- **0 points**: No Activity
- **1-30 points**: Poor performance
- **31-60 points**: Fair performance
- **61-85 points**: Good performance
- **86-100 points**: Excellent performance

### Risk Assessment
- **Critical Risk**: 0 points (no collections) OR < 30 points with long inactivity
- **High Risk**: 1-30 points
- **Medium Risk**: 31-60 points
- **Stable**: 61+ points

## Implementation Files

### 1. `src/hooks/useFarmerPerformanceData.ts`
- Contains the new scoring algorithms
- Calculates performance scores for all farmers
- Determines risk levels based on collection metrics
- Provides data for the dashboard

### 2. `src/pages/admin/FarmerPerformanceDashboard.tsx`
- Displays farmer performance metrics
- Shows risk categories and at-risk farmers
- Provides filtering and sorting capabilities
- Visualizes performance data

## Testing Results

The new system was tested with various scenarios:

1. **Zero Collections**: Farmers with no collections correctly receive a score of 0
2. **Low Volume**: Farmers with small volumes (100-500L) receive scores of 1-20
3. **High Volume**: Farmers with large volumes (5000L+) can achieve scores of 90+
4. **Edge Cases**: Mixed scenarios are handled appropriately

## Benefits

1. **Accuracy**: Scores truly reflect farmer activity
2. **Fairness**: No farmer gets points for inactivity
3. **Actionability**: Clear metrics help identify intervention needs
4. **Transparency**: Simple, understandable scoring system
5. **Focus**: Concentrates on what matters - actual collections

## Future Enhancements

Potential improvements for future versions:
1. Add seasonal adjustment factors
2. Include collector performance impact
3. Add trend analysis for performance improvement
4. Implement peer comparison benchmarks