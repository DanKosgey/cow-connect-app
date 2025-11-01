# Farmer Payment Charts Documentation

## Overview

The enhanced payment charts provide farmers with comprehensive insights into their milk collection and payment patterns through multiple interactive visualizations. These charts help farmers understand their collection trends, compare performance over time, and make informed decisions about their dairy operations.

## Chart Components

### 1. Main Payment Analytics Dashboard

**Features:**
- Dual-axis chart showing daily collection amounts (left axis) and liters collected (right axis)
- Cumulative collection trend area chart
- Interactive tooltips with detailed information
- Date range filtering capabilities
- Export functionality (PNG, SVG)
- Customizable colors and display options

**Data Points:**
- Daily collection amounts in KSh
- Daily liters collected
- Cumulative collection totals
- Data sampling indicators for large datasets

### 2. Rate Trend Analysis

**Features:**
- Line chart showing rate per liter over time
- Interactive tooltips with rate information
- Export functionality
- Customizable colors

**Data Points:**
- Rate per liter in KSh
- Collection dates

### 3. Cumulative Volume Trend

**Features:**
- Area chart showing total liters collected over time
- Interactive tooltips with volume information
- Export functionality
- Customizable colors

**Data Points:**
- Cumulative liters collected
- Collection dates

### 4. Year-over-Year Comparison

**Features:**
- Bar chart comparing current and previous year amounts
- Line chart showing growth rate percentage
- Interactive tooltips with comparison data
- Export functionality
- Customizable colors

**Data Points:**
- Monthly collection amounts (current year)
- Monthly collection amounts (previous year)
- Growth rate percentages

## Interactive Features

### Date Range Filtering

Users can filter chart data by specifying start and end dates:
- **From Date**: Select the beginning date for data display
- **To Date**: Select the ending date for data display
- **Clear Button**: Reset date filters to show all data

### Chart Customization

Users can customize chart appearance:
- **Color Pickers**: Change colors for different data series
- **Legend Toggle**: Show/hide chart legend
- **Grid Toggle**: Show/hide chart grid lines

### Export Options

Users can export charts in multiple formats:
- **PNG**: Export as raster image
- **SVG**: Export as vector image

### Tooltips

Interactive tooltips provide detailed information:
- Hover over data points to see exact values
- Tooltips show data sampling indicators when applicable
- Color-coded information matching chart series

## Performance Optimization

### Data Sampling

For large datasets:
- Automatic data sampling when >100 data points
- Visual indicator when data is sampled
- Preserved data integrity for trend analysis

### Memory Management

- Efficient data processing using React useMemo hooks
- Limited data processing for comparison charts
- Optimized rendering with React components

## Accessibility Features

### Screen Reader Support

- ARIA labels for all interactive elements
- Descriptive chart titles and labels
- Proper heading structure
- Role attributes for chart containers

### Keyboard Navigation

- Tab-accessible controls
- Keyboard-operable date pickers
- Focus indicators for interactive elements

### Color Contrast

- WCAG-compliant color schemes
- Customizable colors for user preferences
- Visual indicators beyond color coding

## Usage Instructions

### Viewing Charts

1. Navigate to the Payment History page
2. Scroll to the Payment Analytics Dashboard section
3. View the main chart and additional metric charts

### Filtering Data

1. Use the "From" and "To" date pickers to set a date range
2. Click "Clear" to reset filters and view all data

### Customizing Charts

1. Use color pickers to change chart colors
2. Toggle legend and grid visibility using checkboxes

### Exporting Charts

1. Click the export button (PNG or SVG icon) next to each chart title
2. Save the exported image to your device

### Interacting with Charts

1. Hover over data points to see detailed information
2. Use tooltips to understand data values
3. Compare different data series using the legend

## Technical Implementation

### Data Processing

- Chart data is processed using React useMemo hooks for performance
- Data is sorted chronologically for proper time series visualization
- Cumulative calculations are performed during data preparation

### Chart Libraries

- Built using Recharts library for React
- Responsive design using ResponsiveContainer components
- Accessibility features implemented through Recharts accessibilityLayer

### Performance Considerations

- Data sampling for large datasets (>100 points)
- Virtualized rendering for smooth performance
- Memoized calculations to prevent unnecessary re-renders

## Troubleshooting

### Charts Not Loading

- Refresh the page to reload chart data
- Check internet connection
- Verify data is available in the system

### Export Issues

- Ensure browser allows file downloads
- Check available disk space
- Try different export formats

### Performance Problems

- Apply date filters to reduce data volume
- Clear browser cache and cookies
- Use a modern browser for best performance

## Future Enhancements

### Planned Features

- Additional chart types (pie charts, scatter plots)
- Advanced filtering options
- Custom date range presets
- Data comparison tools
- Mobile-specific optimizations

### Performance Improvements

- Enhanced data virtualization
- Improved caching mechanisms
- Advanced data sampling algorithms

## Support

For issues or questions about the payment charts, contact the support team or refer to the main application documentation.