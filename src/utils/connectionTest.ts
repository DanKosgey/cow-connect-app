// Simple connection test utility
export const testSupabaseConnection = async () => {
  try {
    // Dynamically import to avoid issues with server-side rendering
    const { supabase } = await import('@/integrations/supabase/client');
    
    if (import.meta.env.DEV) {
      console.log('Testing Supabase connection...');
    }
    
    // Test 1: Get session
    if (import.meta.env.DEV) {
      console.log('Test 1: Getting session...');
    }
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    if (import.meta.env.DEV) {
      console.log('Session result:', { 
        hasData: !!sessionData, 
        hasError: !!sessionError,
        errorType: sessionError ? typeof sessionError : null
      });
    }
    
    // Test 2: Try a simple query
    if (import.meta.env.DEV) {
      console.log('Test 2: Simple query...');
    }
    const { data: queryData, error: queryError } = await supabase
      .from('user_roles')
      .select('role')
      .limit(1);
    if (import.meta.env.DEV) {
      console.log('Query result:', { 
        dataLength: queryData ? queryData.length : 0, 
        hasError: !!queryError,
        errorType: queryError ? typeof queryError : null
      });
    }
    
    // Test 3: Health check using the Supabase URL from environment
    if (import.meta.env.DEV) {
      console.log('Test 3: Health check...');
    }
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      if (supabaseUrl) {
        const response = await fetch(`${supabaseUrl}/rest/v1/`, {
          method: 'GET',
          headers: {
            'apikey': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? '[REDACTED]' : undefined,
            'Authorization': import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? `Bearer [REDACTED]` : undefined,
            'Content-Type': 'application/json'
          }
        });
        
        if (import.meta.env.DEV) {
          console.log('Health check response status:', response.status);
          console.log('Health check response ok:', response.ok);
        }
        
        if (response.ok) {
          if (import.meta.env.DEV) {
            console.log('Health check successful');
          }
        }
      } else {
        if (import.meta.env.DEV) {
          console.log('Supabase URL not found in environment variables');
        }
      }
    } catch (healthError) {
      if (import.meta.env.DEV) {
        console.error('Health check error:', healthError instanceof Error ? healthError.message : 'Unknown error');
      }
    }
    
    return {
      session: { hasData: !!sessionData, hasError: !!sessionError },
      query: { hasData: !!queryData, hasError: !!queryError }
    };
  } catch (error) {
    if (import.meta.env.DEV) {
      console.error('Connection test failed:', error instanceof Error ? error.message : 'Unknown error');
    }
    return { error: error instanceof Error ? error.message : 'Unknown error' };
  }
};