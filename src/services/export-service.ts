import { supabase } from '@/integrations/supabase/client';

export interface ExportOptions {
  format: 'csv' | 'json' | 'xlsx';
  includeHeaders: boolean;
  delimiter: string;
}

class ExportService {
  private static instance: ExportService;

  private constructor() {}

  static getInstance(): ExportService {
    if (!ExportService.instance) {
      ExportService.instance = new ExportService();
    }
    return ExportService.instance;
  }

  /**
   * Export farmers data
   */
  async exportFarmers(options: ExportOptions = { format: 'csv', includeHeaders: true, delimiter: ',' }): Promise<string | Blob> {
    try {
      const { data, error } = await supabase
        .from('farmers')
        .select(`
          id,
          registration_number,
          national_id,
          phone_number,
          full_name,
          address,
          farm_location,
          kyc_status,
          registration_completed,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (options.format === 'json') {
        return JSON.stringify(data, null, 2);
      }

      return this.convertToCSV(data || [], options);
    } catch (error) {
      console.error('Error exporting farmers data:', error);
      throw error;
    }
  }

  /**
   * Export collections data
   */
  async exportCollections(options: ExportOptions = { format: 'csv', includeHeaders: true, delimiter: ',' }): Promise<string | Blob> {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          farmer_id,
          staff_id,
          liters,
          quality_grade,
          rate_per_liter,
          total_amount,
          gps_latitude,
          gps_longitude,
          collection_date,
          status,
          created_at,
          updated_at
        `)
        .order('collection_date', { ascending: false });

      if (error) throw error;

      if (options.format === 'json') {
        return JSON.stringify(data, null, 2);
      }

      return this.convertToCSV(data || [], options);
    } catch (error) {
      console.error('Error exporting collections data:', error);
      throw error;
    }
  }

  /**
   * Export payments data
   */
  async exportPayments(options: ExportOptions = { format: 'csv', includeHeaders: true, delimiter: ',' }): Promise<string | Blob> {
    try {
      const { data, error } = await supabase
        .from('farmer_payments')
        .select(`
          id,
          farmer_id,
          collection_ids,
          total_amount,
          approval_status,
          approved_at,
          paid_at,
          notes,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (options.format === 'json') {
        return JSON.stringify(data, null, 2);
      }

      return this.convertToCSV(data || [], options);
    } catch (error) {
      console.error('Error exporting payments data:', error);
      throw error;
    }
  }

  /**
   * Convert data to CSV format
   */
  private convertToCSV(data: any[], options: ExportOptions): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0]);
    let csv = '';

    if (options.includeHeaders) {
      csv += headers.join(options.delimiter) + '\n';
    }

    data.forEach(row => {
      const values = headers.map(header => {
        const value = row[header];
        // Handle special characters and null values
        if (value === null || value === undefined) return '';
        if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csv += values.join(options.delimiter) + '\n';
    });

    return csv;
  }

  /**
   * Download data as file
   */
  downloadFile(data: string | Blob, filename: string, format: 'csv' | 'json' | 'xlsx'): void {
    let blob: Blob;
    let mimeType: string;

    if (format === 'json') {
      blob = new Blob([data as string], { type: 'application/json' });
      mimeType = 'application/json';
    } else {
      blob = new Blob([data as string], { type: 'text/csv' });
      mimeType = 'text/csv';
    }

    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${filename}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  }

  /**
   * Export data with filters
   */
  async exportWithFilters(
    table: string,
    filters: Record<string, any>,
    options: ExportOptions
  ): Promise<string | Blob> {
    try {
      // Check if we have an authenticated session before proceeding
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) {
        throw new Error('Authentication required to export data');
      }

      let query = supabase.from(table).select('*');

      // Apply filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          query = query.eq(key, value);
        }
      });

      const { data, error } = await query;

      if (error) throw error;

      if (options.format === 'json') {
        return JSON.stringify(data, null, 2);
      }

      return this.convertToCSV(data || [], options);
    } catch (error) {
      console.error(`Error exporting ${table} data with filters:`, error);
      throw error;
    }
  }
}

export const exportService = ExportService.getInstance();