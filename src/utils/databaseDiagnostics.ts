import { supabase } from '@/integrations/supabase/client';
import AdminDebugLogger from './adminDebugLogger';

// Utility for database diagnostics
export class DatabaseDiagnostics {
  static async testConnection(): Promise<boolean> {
    try {
      AdminDebugLogger.database('Testing database connection...');
      const { data, error } = await supabase.rpc('get_user_role_secure', { user_id_param: '00000000-0000-0000-0000-000000000000' });
      
      if (error) {
        AdminDebugLogger.error('Database connection test failed:', error);
        return false;
      }
      
      AdminDebugLogger.database('Database connection test successful');
      return true;
    } catch (error) {
      AdminDebugLogger.error('Database connection test error:', error);
      return false;
    }
  }
  
  static async checkUserRolesTable(): Promise<boolean> {
    try {
      AdminDebugLogger.database('Checking user_roles table accessibility...');
      const { data, error } = await supabase
        .from('user_roles')
        .select('count()', { count: 'exact' })
        .limit(1);
      
      if (error) {
        AdminDebugLogger.error('user_roles table check failed:', error);
        return false;
      }
      
      AdminDebugLogger.database('user_roles table check successful', { rowCount: data?.length });
      return true;
    } catch (error) {
      AdminDebugLogger.error('user_roles table check error:', error);
      return false;
    }
  }
  
  static async checkFunctionExists(functionName: string): Promise<boolean> {
    try {
      AdminDebugLogger.database(`Checking if function ${functionName} exists...`);
      const { data, error } = await supabase
        .from('pg_proc')
        .select('proname')
        .eq('proname', functionName)
        .limit(1);
      
      if (error) {
        AdminDebugLogger.error(`Function ${functionName} check failed:`, error);
        return false;
      }
      
      const exists = data && data.length > 0;
      AdminDebugLogger.database(`Function ${functionName} exists:`, exists);
      return exists;
    } catch (error) {
      AdminDebugLogger.error(`Function ${functionName} check error:`, error);
      return false;
    }
  }
  
  static async runAllDiagnostics(): Promise<void> {
    AdminDebugLogger.database('Running comprehensive database diagnostics...');
    
    const tests = [
      { name: 'Connection Test', test: () => this.testConnection() },
      { name: 'User Roles Table', test: () => this.checkUserRolesTable() },
      { name: 'get_user_role_secure Function', test: () => this.checkFunctionExists('get_user_role_secure') }
    ];
    
    const results: Record<string, boolean> = {};
    
    for (const { name, test } of tests) {
      try {
        AdminDebugLogger.database(`Running diagnostic: ${name}`);
        results[name] = await test();
        AdminDebugLogger.database(`Diagnostic ${name}: ${results[name] ? 'PASSED' : 'FAILED'}`);
      } catch (error) {
        AdminDebugLogger.error(`Diagnostic ${name} error:`, error);
        results[name] = false;
      }
    }
    
    const allPassed = Object.values(results).every(result => result);
    AdminDebugLogger.database('Database diagnostics completed', { 
      allPassed, 
      results 
    });
    
    return allPassed;
  }
}

export default DatabaseDiagnostics;