import { utils, writeFile } from 'xlsx';

export interface ExportData {
  [key: string]: any;
}

export interface ExportOptions {
  fileName: string;
  sheetName?: string;
  format?: 'xlsx' | 'csv';
}

export class DataExportService {
  /**
   * Export data to Excel format
   */
  static exportToExcel(data: ExportData[], options: ExportOptions): void {
    try {
      // Create a new workbook
      const wb = utils.book_new();
      
      // Convert data to worksheet
      const ws = utils.json_to_sheet(data);
      
      // Add worksheet to workbook
      utils.book_append_sheet(wb, ws, options.sheetName || 'Sheet1');
      
      // Generate file name with timestamp
      const fileName = options.fileName.includes('.') 
        ? options.fileName 
        : `${options.fileName}_${new Date().toISOString().split('T')[0]}.${options.format || 'xlsx'}`;
      
      // Export the file
      writeFile(wb, fileName);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
      throw new Error('Failed to export data to Excel');
    }
  }

  /**
   * Export data to CSV format
   */
  static exportToCSV(data: ExportData[], options: ExportOptions): void {
    try {
      // Create worksheet
      const ws = utils.json_to_sheet(data);
      
      // Generate CSV string
      const csv = utils.sheet_to_csv(ws);
      
      // Create blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      link.setAttribute('href', url);
      link.setAttribute('download', `${options.fileName}.csv`);
      link.style.visibility = 'hidden';
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error exporting to CSV:', error);
      throw new Error('Failed to export data to CSV');
    }
  }

  /**
   * Export data based on format
   */
  static exportData(data: ExportData[], options: ExportOptions): void {
    if (options.format === 'csv') {
      this.exportToCSV(data, options);
    } else {
      this.exportToExcel(data, options);
    }
  }

  /**
   * Format data for export
   */
  static formatDataForExport(data: any): ExportData[] {
    if (!Array.isArray(data)) {
      return [data];
    }
    
    return data.map(item => {
      const formattedItem: ExportData = {};
      
      for (const key in item) {
        if (item.hasOwnProperty(key)) {
          // Handle nested objects
          if (typeof item[key] === 'object' && item[key] !== null) {
            if (Array.isArray(item[key])) {
              formattedItem[key] = item[key].join(', ');
            } else {
              formattedItem[key] = JSON.stringify(item[key]);
            }
          } else if (item[key] instanceof Date) {
            formattedItem[key] = item[key].toISOString();
          } else {
            formattedItem[key] = item[key];
          }
        }
      }
      
      return formattedItem;
    });
  }
}