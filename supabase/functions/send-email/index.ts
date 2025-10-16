// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { Resend } from 'resend';

// Define types
interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

// @ts-ignore: Deno is available in Supabase Edge Functions runtime
Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      },
    });
  }

  try {
    // Get the request body
    const emailData: EmailData = await req.json();

    // Validate required fields
    if (!emailData.to || !emailData.subject || !emailData.html) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, and html are required' }),
        { 
          status: 400,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // Get Resend API key from environment variables
    // @ts-ignore: Deno is available in Supabase Edge Functions runtime
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (!resendApiKey) {
      console.error('RESEND_API_KEY environment variable is not set');
      return new Response(
        JSON.stringify({ error: 'Email service is not configured properly' }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // Create Resend client
    const resend = new Resend(resendApiKey);

    // Set default from email if not provided
    const fromEmail = emailData.from || 'onboarding@resend.dev';

    // Send email using Resend
    const { data, error } = await resend.emails.send({
      from: fromEmail,
      to: emailData.to,
      subject: emailData.subject,
      html: emailData.html,
    });

    if (error) {
      console.error('Error sending email:', error);
      return new Response(
        JSON.stringify({ 
          error: 'Failed to send email',
          details: error.message
        }),
        { 
          status: 500,
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        }
      );
    }

    // Return success response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Email sent successfully',
        emailId: data?.id
      }),
      { 
        status: 200,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  } catch (error) {
    console.error('Unexpected error in send-email function:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error'
      }),
      { 
        status: 500,
        headers: { 
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*"
        }
      }
    );
  }
});