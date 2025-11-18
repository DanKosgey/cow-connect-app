# Variance Insights Dashboard Documentation

## Overview
The Variance Insights Dashboard provides comprehensive analytics and monitoring capabilities for milk collection variances across the organization. This feature is available in both the Staff Portal and Admin Portal with different levels of access and detail.

## Staff Portal - Variance Analytics Dashboard

### Location
`/staff-only/variance-reports`

### Features
- **Real-time Variance Monitoring**: View recent milk collection variances with detailed information
- **Performance Summary**: Key metrics including total collections, positive/negative variances, and penalties
- **Time-based Filtering**: Analyze data by week, month, or quarter
- **Top Collector Performance**: See how collectors are performing based on variance metrics
- **Detailed Records**: Access to individual collection variance records

### Data Displayed
- Total collections in the selected timeframe
- Count of positive and negative variances
- Average variance percentage
- Total penalty amounts applied
- Top performing collectors by variance metrics
- Detailed variance records with farmer and collector information

## Admin Portal - Variance Insights Dashboard

### Location
`/admin/variance-insights`

### Features
- **Advanced Filtering**: Filter by date range and specific collectors
- **Comprehensive Analytics**: Detailed charts and graphs for variance distribution
- **Collector Performance Rankings**: Performance scores and detailed metrics for all collectors
- **Variance Type Distribution**: Pie chart showing the distribution of positive vs negative variances
- **Collector Comparison**: Bar chart comparing top collectors by average variance percentage
- **Detailed Reporting**: Complete table of variance records with all relevant information

### Data Displayed
- Summary cards for total variances, positive/negative counts, average variance %, and total penalties
- Pie chart showing variance type distribution
- Bar chart comparing top 10 collectors by average variance percentage
- Detailed collector performance table with performance scores
- Complete variance records table with filtering capabilities

## Technical Implementation

### Database Schema
The variance tracking system uses the following tables:
- `milk_approvals`: Stores approval data including variance calculations
- `collector_performance`: Tracks collector performance metrics over time
- `variance_penalty_config`: Configuration for penalty calculations based on variance percentages

### Key Functions
- `calculateVariance()`: Calculates the difference between collected and received milk amounts
- `calculatePenalty()`: Determines penalty amounts based on variance and configuration
- `get_top_collectors_by_performance()`: Database function to retrieve top performing collectors

### Data Flow
1. Collector records milk collections for farmers
2. Staff member approves collections and enters company-received amounts
3. System automatically calculates variances and penalties
4. Performance metrics are updated in real-time
5. Data is displayed in dashboards for monitoring and analysis

## Access Control
- **Staff Portal**: Available to staff members with `STAFF` role
- **Admin Portal**: Available to administrators with `ADMIN` role

## Future Enhancements
- Export functionality for variance reports
- Automated alerts for significant variances
- Historical trend analysis
- Comparative analysis between time periods