import { invitationService } from '../src/services/invitation-service';

async function testInvitationService() {
  console.log('=== Testing Invitation Service ===\n');
  
  try {
    // Test generating a token
    const token = Math.random().toString(36).substring(2, 15);
    console.log('Generated test token:', token);
    
    // Test validating a non-existent token
    const isValid = await invitationService.validateInvitationToken('non-existent-token');
    console.log('Validation result for non-existent token:', isValid);
    
    console.log('\n=== Test Complete ===');
  } catch (error) {
    console.error('Error testing invitation service:', error);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testInvitationService().catch(console.error);
}

export { testInvitationService };