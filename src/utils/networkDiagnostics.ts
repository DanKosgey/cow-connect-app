import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class NetworkDiagnostics {
  static async testSupabaseConnection(): Promise<{ success: boolean; error?: any }> {
    try {
      logger.info('Testing Supabase connection...');
      
      // Test basic connectivity
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .limit(1);
      
      if (error) {
        logger.error('Supabase connection test failed:', error);
        return { success: false, error };
      }
      
      logger.info('Supabase connection test successful');
      return { success: true };
    } catch (error) {
      logger.error('Supabase connection test exception:', error);
      return { success: false, error };
    }
  }

  static async diagnose400Error(url: string, requestOptions: RequestInit): Promise<{ 
    isNetworkError: boolean; 
    isAuthError: boolean; 
    isBadRequest: boolean;
    details: any 
  }> {
    try {
      logger.info('Diagnosing 400 error for URL:', url);
      
      // Check if user is authenticated
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError) {
        logger.warn('Session error during diagnosis:', sessionError);
        return {
          isNetworkError: false,
          isAuthError: true,
          isBadRequest: false,
          details: { 
            type: 'SESSION_ERROR', 
            error: sessionError,
            message: 'Unable to retrieve session'
          }
        };
      }
      
      if (!session) {
        logger.warn('No active session found');
        return {
          isNetworkError: false,
          isAuthError: true,
          isBadRequest: false,
          details: { 
            type: 'NO_SESSION', 
            message: 'No active session found'
          }
        };
      }
      
      // Test a simple authenticated request
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('id')
          .limit(1);
          
        if (error) {
          logger.warn('Authenticated request failed:', error);
          
          // Check if it's an auth-related error
          if (error.message && (
            error.message.includes('Invalid Refresh Token') ||
            error.message.includes('JWT') ||
            error.message.includes('Unauthorized') ||
            error.message.includes('401')
          )) {
            return {
              isNetworkError: false,
              isAuthError: true,
              isBadRequest: false,
              details: { 
                type: 'AUTH_ERROR', 
                error,
                message: 'Authentication error detected'
              }
            };
          }
        }
      } catch (authTestError) {
        logger.warn('Auth test request failed:', authTestError);
        return {
          isNetworkError: false,
          isAuthError: true,
          isBadRequest: false,
          details: { 
            type: 'AUTH_TEST_ERROR', 
            error: authTestError,
            message: 'Authentication test failed'
          }
        };
      }
      
      // If we get here, it might be a network issue or specific to the request
      return {
        isNetworkError: true,
        isAuthError: false,
        isBadRequest: true,
        details: { 
          type: 'REQUEST_ERROR', 
          url,
          requestOptions,
          message: 'Request-specific error detected'
        }
      };
    } catch (error) {
      logger.error('Error during 400 error diagnosis:', error);
      return {
        isNetworkError: true,
        isAuthError: false,
        isBadRequest: true,
        details: { 
          type: 'DIAGNOSIS_ERROR', 
          error,
          message: 'Error during diagnosis'
        }
      };
    }
  }

  static async clearNetworkCache(): Promise<void> {
    try {
      logger.info('Clearing network cache...');
      
      // Clear service worker cache
      if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ command: 'clearCache' });
      }
      
      // Clear fetch cache headers
      // Note: This is handled at the client level in our supabase client configuration
      
      logger.info('Network cache cleared successfully');
    } catch (error) {
      logger.error('Error clearing network cache:', error);
    }
  }

  static async retryWithBackoff<T>(
    operation: () => Promise<T>,
    maxRetries: number = 3,
    baseDelay: number = 1000
  ): Promise<T> {
    let lastError: any;
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error;
        
        // If this is the last retry, throw the error
        if (i === maxRetries) {
          throw error;
        }
        
        // Calculate delay with exponential backoff
        const delay = baseDelay * Math.pow(2, i) + Math.random() * 1000;
        logger.warn(`Operation failed, retrying in ${delay}ms...`, { attempt: i + 1, error });
        
        // Wait before retrying
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    throw lastError;
  }
}