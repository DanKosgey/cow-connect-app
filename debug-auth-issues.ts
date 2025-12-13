import { supabase } from './src/integrations/supabase/client';
import { authService } from './src/lib/supabase/auth-service';

// Debug script to identify authentication issues
async function debugAuthIssues() {
  console.log('=== AUTH DEBUG START ===');
  
  // 1. Log Supabase client configuration
  console.log('1. Supabase Client Configuration:');
  console.log('   URL:', (supabase as any).supabaseUrl);
  console.log('   Key present:', !!((supabase as any).settings?.auth?.storageKey));
  
  // 2. Check localStorage availability
  console.log('\n2. Storage Availability:');
  try {
    const testKey = '__storage_test__';
    localStorage.setItem(testKey, 'test');
    localStorage.removeItem(testKey);
    console.log('   localStorage: Available');
  } catch (e) {
    console.log('   localStorage: Not available', e);
  }
  
  // 3. Check current auth state
  console.log('\n3. Current Auth State:');
  try {
    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    console.log('   Session error:', sessionError);
    console.log('   Has session:', !!session);
    console.log('   Session user ID:', session?.user?.id ? '[REDACTED]' : null);
    console.log('   Session expires at:', session?.expires_at ? new Date(session.expires_at * 1000).toISOString() : null);
  } catch (e) {
    console.log('   Session check error:', e);
  }
  
  try {
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    console.log('   User error:', userError);
    console.log('   Has user:', !!user);
    console.log('   User ID:', user?.id ? '[REDACTED]' : null);
  } catch (e) {
    console.log('   User check error:', e);
  }
  
  // 4. Add detailed auth logging
  console.log('\n4. Adding Auth State Change Listener:');
  const subscription = supabase.auth.onAuthStateChange((event, session) => {
    console.group('[Auth Debug]');
    console.log('Event:', event);
    console.log('Session exists:', !!session);
    console.log('User ID:', session?.user?.id ? '[REDACTED]' : null);
    try {
      const token = localStorage.getItem('sb-oevxapmcmcaxpaluehyg-auth-token');
      console.log('Local storage token exists:', !!token);
      if (token) {
        const parsed = JSON.parse(token);
        console.log('Token expires at:', parsed.expires_at ? new Date(parsed.expires_at * 1000).toISOString() : null);
      }
    } catch (e) {
      console.log('Storage access error:', e);
    }
    console.groupEnd();
  });
  
  // 5. Test authService methods
  console.log('\n5. Testing AuthService:');
  try {
    const currentUser = await authService.getCurrentUser();
    console.log('   Current user from authService:', !!currentUser);
    console.log('   Current user ID:', currentUser?.id ? '[REDACTED]' : null);
  } catch (e) {
    console.log('   AuthService getCurrentUser error:', e);
  }
  
  try {
    const currentSession = await authService.getCurrentSession();
    console.log('   Current session from authService:', !!currentSession);
    console.log('   Session user ID:', currentSession?.user?.id ? '[REDACTED]' : null);
  } catch (e) {
    console.log('   AuthService getCurrentSession error:', e);
  }
  
  console.log('\n=== AUTH DEBUG END ===');
  console.log('Listener is active. Try signing in and observe the logs.');
  
  // Return cleanup function
  return () => {
    subscription.data.subscription.unsubscribe();
    console.log('Auth listener unsubscribed');
  };
}

// Run the debug script
debugAuthIssues().then(cleanup => {
  // Optionally call cleanup() to unsubscribe
  // cleanup();
}).catch(console.error);