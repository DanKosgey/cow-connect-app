import { logger } from '@/utils/logger';
import { supabase } from '@/integrations/supabase/client';

export interface ErrorReport {
  id?: string;
  user_id?: string;
  error_message: string;
  error_stack?: string;
  error_context: string;
  error_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  component?: string;
  action?: string;
  additional_info?: Record<string, any>;
  reported_at?: string;
  resolved?: boolean;
  resolved_at?: string;
  resolved_by?: string;
}

export class ErrorReportingService {
  // Report an error to the database
  static async reportError(errorReport: Omit<ErrorReport, 'id' | 'reported_at'>): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_reports')
        .insert({
          ...errorReport,
          reported_at: new Date().toISOString()
        });

      if (error) {
        logger.warn('Failed to report error to database', error);
        // Log the error locally as fallback
        logger.errorWithContext(
          'ErrorReportingService - reportError', 
          error,
          { errorReport }
        );
      }
    } catch (err) {
      logger.warn('Failed to report error', err);
      // Log the error locally as fallback
      logger.errorWithContext(
        'ErrorReportingService - reportError (catch)', 
        err,
        { errorReport }
      );
    }
  }

  // Get error reports for admin dashboard
  static async getErrorReports(
    limit: number = 50,
    offset: number = 0,
    severity?: string,
    resolved?: boolean
  ): Promise<ErrorReport[]> {
    try {
      let query = supabase
        .from('error_reports')
        .select('*')
        .order('reported_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (severity) {
        query = query.eq('severity', severity);
      }

      if (resolved !== undefined) {
        query = query.eq('resolved', resolved);
      }

      const { data, error } = await query;

      if (error) {
        logger.errorWithContext('ErrorReportingService - getErrorReports', error);
        throw error;
      }

      return data || [];
    } catch (err) {
      logger.errorWithContext('ErrorReportingService - getErrorReports (catch)', err);
      throw err;
    }
  }

  // Mark an error as resolved
  static async resolveError(errorId: string, resolvedBy?: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_reports')
        .update({
          resolved: true,
          resolved_at: new Date().toISOString(),
          resolved_by: resolvedBy
        })
        .eq('id', errorId);

      if (error) {
        logger.errorWithContext('ErrorReportingService - resolveError', error);
        throw error;
      }
    } catch (err) {
      logger.errorWithContext('ErrorReportingService - resolveError (catch)', err);
      throw err;
    }
  }

  // Delete an error report
  static async deleteError(errorId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('error_reports')
        .delete()
        .eq('id', errorId);

      if (error) {
        logger.errorWithContext('ErrorReportingService - deleteError', error);
        throw error;
      }
    } catch (err) {
      logger.errorWithContext('ErrorReportingService - deleteError (catch)', err);
      throw err;
    }
  }

  // Get error statistics
  static async getErrorStatistics(): Promise<{
    total: number;
    bySeverity: Record<string, number>;
    byComponent: Record<string, number>;
    unresolved: number;
  }> {
    try {
      // Get total errors
      const { count: total, error: totalError } = await supabase
        .from('error_reports')
        .select('*', { count: 'exact', head: true });

      if (totalError) {
        logger.errorWithContext('ErrorReportingService - getErrorStatistics (total)', totalError);
        throw totalError;
      }

      // Get unresolved errors
      const { count: unresolved, error: unresolvedError } = await supabase
        .from('error_reports')
        .select('*', { count: 'exact', head: true })
        .eq('resolved', false);

      if (unresolvedError) {
        logger.errorWithContext('ErrorReportingService - getErrorStatistics (unresolved)', unresolvedError);
        throw unresolvedError;
      }

      // Get errors by severity
      const { data: bySeverityData, error: severityError } = await supabase
        .from('error_reports')
        .select('severity')
        .limit(1000); // Limit to avoid performance issues

      if (severityError) {
        logger.errorWithContext('ErrorReportingService - getErrorStatistics (severity)', severityError);
        throw severityError;
      }

      const bySeverity: Record<string, number> = {};
      bySeverityData?.forEach(item => {
        bySeverity[item.severity] = (bySeverity[item.severity] || 0) + 1;
      });

      // Get errors by component
      const { data: byComponentData, error: componentError } = await supabase
        .from('error_reports')
        .select('component')
        .limit(1000); // Limit to avoid performance issues

      if (componentError) {
        logger.errorWithContext('ErrorReportingService - getErrorStatistics (component)', componentError);
        throw componentError;
      }

      const byComponent: Record<string, number> = {};
      byComponentData?.forEach(item => {
        if (item.component) {
          byComponent[item.component] = (byComponent[item.component] || 0) + 1;
        }
      });

      return {
        total: total || 0,
        bySeverity,
        byComponent,
        unresolved: unresolved || 0
      };
    } catch (err) {
      logger.errorWithContext('ErrorReportingService - getErrorStatistics (catch)', err);
      throw err;
    }
  }
}