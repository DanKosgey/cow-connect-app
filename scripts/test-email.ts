import { Resend } from 'resend';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

async function testEmail() {
  console.log('Testing Resend API integration...');
  
  // Check if API key is configured
  const apiKey = process.env.VITE_RESEND_API_KEY || process.env.RESEND_API_KEY;
  console.log('API Key configured:', !!apiKey);
  
  if (!apiKey) {
    console.log('No API key found. Testing in simulation mode.');
    return;
  }
  
  try {
    const resend = new Resend(apiKey);
    
    console.log('Sending test email...');
    const { data, error } = await resend.emails.send({
      from: 'invitations@yourcompany.com',
      to: 'test@example.com',
      subject: 'Test Email',
      html: '<p>This is a test email from the Resend API integration.</p>',
    });
    
    if (error) {
      console.error('Error sending email:', error);
      return;
    }
    
    console.log('Email sent successfully:', data);
  } catch (error) {
    console.error('Unexpected error:', error);
  }
}

testEmail();