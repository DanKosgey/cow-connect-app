import { authService } from './src/lib/supabase/auth-service';

async function testEnhancedAuthService() {
  try {
    // Get current user
    const user = await authService.getCurrentUser();
    
    if (!user) {
      console.log('No user logged in');
      return;
    }
    
    console.log('Testing enhanced auth service for user:', user.id);
    
    // Test getUserRole with enhanced timeout/retry logic
    console.log('Calling getUserRole with enhanced timeout/retry logic...');
    const startTime = Date.now();
    const role = await authService.getUserRole(user.id);
    const endTime = Date.now();
    
    console.log('Role result:', role);
    console.log('Time taken:', endTime - startTime, 'ms');
    
    // Test multiple times to check consistency
    console.log('\n--- Testing multiple calls ---');
    for (let i = 0; i < 3; i++) {
      console.log(`\nCall ${i + 1}:`);
      const start = Date.now();
      const result = await authService.getUserRole(user.id);
      const end = Date.now();
      console.log(`  Result: ${result}`);
      console.log(`  Time: ${end - start}ms`);
    }
    
  } catch (error) {
    console.error('Test error:', error);
  }
}

testEnhancedAuthService();