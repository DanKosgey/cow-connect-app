import { emailService } from '../src/services/email-service';

async function testBackendEmail() {
  console.log('=== Testing Backend Email Service ===\n');
  
  try {
    console.log('Sending test email...');
    
    // Test sending a simple email
    const success = await emailService.sendEmail(
      'kosgeidan3@gmail.com',
      'Test Email from Backend Service',
      '<p>This is a test email sent through the Supabase Edge Function.</p>'
    );
    
    if (success) {
      console.log('✅ Email sent successfully!');
    } else {
      console.log('❌ Failed to send email.');
    }
  } catch (error) {
    console.error('Error testing email service:', error);
  }
  
  console.log('\n=== Test Complete ===');
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBackendEmail().catch(console.error);
}

export { testBackendEmail };