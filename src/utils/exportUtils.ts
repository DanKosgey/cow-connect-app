// Utility functions for exporting data in various formats

// Export data to CSV
export const exportToCSV = (data: any[], filename: string, headers?: string[]) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Get headers from the first object if not provided
  const csvHeaders = headers || Object.keys(data[0]);
  
  // Create CSV content
  const csvContent = [
    csvHeaders.join(','),
    ...data.map(row => 
      csvHeaders.map(header => {
        const value = row[header];
        // Handle special characters and wrap in quotes if needed
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      }).join(',')
    )
  ].join('\n');

  // Create and download file
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export data to JSON
export const exportToJSON = (data: any[], filename: string) => {
  if (!data) {
    throw new Error('No data to export');
  }

  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Export data to Excel (using SheetJS library)
export const exportToExcel = (data: any[], filename: string, sheetName: string = 'Sheet1') => {
  // This would require the xlsx library which is already in the project
  // For now, we'll implement a basic version using CSV as Excel can open CSV files
  exportToCSV(data, filename);
};

// Export chart data to image
export const exportChartToImage = (chartRef: any, filename: string) => {
  if (!chartRef || !chartRef.container) {
    throw new Error('Invalid chart reference');
  }

  // This is a simplified version - in a real implementation, you would use
  // html2canvas or similar library to capture the chart as an image
  console.warn('Chart image export is not fully implemented');
  throw new Error('Chart image export not implemented');
};

// Export data with custom formatting
export const exportWithFormatting = (
  data: any[], 
  filename: string, 
  format: 'csv' | 'json' | 'excel',
  columnMapping?: Record<string, string>,
  dataTransformers?: Record<string, (value: any) => any>
) => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  // Apply column mapping and data transformations
  let processedData = data;
  if (columnMapping || dataTransformers) {
    processedData = data.map(row => {
      const newRow: any = {};
      
      // Apply column mapping
      Object.keys(row).forEach(key => {
        const newKey = columnMapping?.[key] || key;
        const value = row[key];
        
        // Apply data transformation if available
        newRow[newKey] = dataTransformers?.[key] 
          ? dataTransformers[key](value) 
          : value;
      });
      
      return newRow;
    });
  }

  // Export based on format
  switch (format) {
    case 'csv':
      exportToCSV(processedData, filename);
      break;
    case 'json':
      exportToJSON(processedData, filename);
      break;
    case 'excel':
      exportToExcel(processedData, filename);
      break;
    default:
      throw new Error(`Unsupported export format: ${format}`);
  }
};

// Generate report metadata
export const generateReportMetadata = (reportType: string, dataCount: number) => {
  return {
    reportType,
    generatedAt: new Date().toISOString(),
    dataCount,
    version: '1.0'
  };
};

// Export with metadata
export const exportWithMetadata = (
  data: any[], 
  filename: string, 
  reportType: string,
  format: 'csv' | 'json' = 'csv'
) => {
  const metadata = generateReportMetadata(reportType, data.length);
  
  if (format === 'json') {
    const dataWithMetadata = {
      ...metadata,
      data
    };
    exportToJSON([dataWithMetadata], filename);
  } else {
    // For CSV, we'll add metadata as comments at the top
    const csvContent = [
      `# Report Type: ${reportType}`,
      `# Generated At: ${new Date().toISOString()}`,
      `# Data Count: ${data.length}`,
      `# Version: 1.0`,
      '', // Empty line to separate metadata from data
      ...data.map(row => Object.values(row).join(','))
    ].join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};