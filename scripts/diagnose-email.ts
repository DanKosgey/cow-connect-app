import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function diagnoseEmail() {
  console.log('=== Email Service Diagnosis ===\n');
  
  // Check environment variables
  console.log('1. Environment Variables Check:');
  const viteApiKey = process.env.VITE_RESEND_API_KEY;
  const regularApiKey = process.env.RESEND_API_KEY;
  
  console.log('   VITE_RESEND_API_KEY:', viteApiKey ? `${viteApiKey.substring(0, 10)}...` : 'NOT SET');
  console.log('   RESEND_API_KEY:', regularApiKey ? `${regularApiKey.substring(0, 10)}...` : 'NOT SET');
  
  const apiKey = viteApiKey || regularApiKey;
  if (!apiKey) {
    console.log('   ❌ No API key found. Email service will run in simulation mode.\n');
    return;
  }
  
  console.log('   ✅ API key found.\n');
  
  // Test Resend client creation
  console.log('2. Resend Client Creation:');
  try {
    const resend = new Resend(apiKey);
    console.log('   ✅ Resend client created successfully.\n');
    
    // Test sending a minimal email
    console.log('3. Sending Test Email:');
    // Use the account email address for testing (from the error message)
    const testEmail = 'kosgeidan3@gmail.com';
    console.log(`   Sending to: ${testEmail}`);
    
    const { data, error } = await resend.emails.send({
      from: 'onboarding@resend.dev', // Resend sandbox domain
      to: testEmail,
      subject: 'Test Email - Diagnosis',
      html: '<p>This is a test email to diagnose the Resend API integration.</p>',
    });
    
    if (error) {
      console.log('   ❌ Error sending email:');
      console.log('   Error Name:', error.name);
      console.log('   Error Message:', error.message);
      console.log('   Error Details:', JSON.stringify(error, null, 2));
      console.log('\n   Possible solutions:');
      console.log('   - Check if your API key is valid and active');
      console.log('   - Verify your domain with Resend if not using sandbox');
      console.log('   - Check network connectivity');
      console.log('   - Ensure the recipient email is valid');
    } else {
      console.log('   ✅ Email sent successfully!');
      console.log('   Email ID:', data?.id);
    }
    
  } catch (clientError) {
    console.log('   ❌ Error creating Resend client:', clientError);
  }
  
  console.log('\n=== Diagnosis Complete ===');
}

diagnoseEmail().catch(console.error);