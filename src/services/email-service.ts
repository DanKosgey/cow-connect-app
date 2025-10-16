import { supabase } from '@/integrations/supabase/client';

interface InvitationData {
  email: string;
  role: string;
  message?: string;
}

interface EmailData {
  to: string;
  subject: string;
  html: string;
  from?: string;
}

export class EmailService {
  private isSimulationMode: boolean = false;
  private supabaseUrl: string;
  
  constructor() {
    // Get Supabase URL from environment or use default
    this.supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321';
    
    // Check if we should use simulation mode (no Supabase URL configured)
    if (!this.supabaseUrl) {
      this.isSimulationMode = true;
      this.logDev('[EMAIL SERVICE] Using simulation mode - no Supabase URL configured');
    }
  }

  /**
   * Safely get environment variable
   */
  private getEnvVar(key: string): string | undefined {
    try {
      // Check if running in Vite environment
      if (typeof import.meta !== 'undefined' && import.meta.env) {
        return import.meta.env[key];
      }
      // Check if running in Node.js environment
      if (typeof process !== 'undefined' && process.env) {
        return process.env[key];
      }
    } catch (error) {
      // Ignore errors when accessing environment variables
    }
    return undefined;
  }

  /**
   * Safe development logging
   */
  private logDev(message: string, data?: unknown): void {
    try {
      const isDev = this.getEnvVar('DEV') === 'true' || 
                    this.getEnvVar('NODE_ENV') === 'development' ||
                    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.DEV === true) ||
                    (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.NODE_ENV === 'development');
      
      if (isDev) {
        if (data) {
          console.log(message, data);
        } else {
          console.log(message);
        }
      }
    } catch (error) {
      // Silently fail if logging is not available
    }
  }

  /**
   * Get the base URL for invitation links
   */
  private getBaseUrl(): string {
    try {
      if (typeof window !== 'undefined' && window.location) {
        return window.location.origin;
      }
    } catch (error) {
      // Ignore errors
    }
    
    // Fallback to environment variable or default
    return this.getEnvVar('VITE_APP_URL') || 
           this.getEnvVar('APP_URL') || 
           'http://localhost:3000';
  }

  /**
   * Send an email using Supabase Edge Function
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - HTML content of the email
   * @returns True if successful, false otherwise
   */
  async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
    try {
      // Validate inputs
      if (!to || !subject || !html) {
        console.error('[EMAIL SERVICE] Missing required parameters');
        return false;
      }

      // If no Supabase URL is configured, simulate email sending
      if (this.isSimulationMode) {
        this.logDev('[EMAIL SERVICE] Simulating email send');
        this.logDev(`[SIMULATED EMAIL] To: ${to}`);
        this.logDev(`[SIMULATED EMAIL] Subject: ${subject}`);
        this.logDev(`[SIMULATED EMAIL] Content: ${html.substring(0, 100)}...`);
        
        // Simulate network delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        return true;
      }

      this.logDev('[EMAIL SERVICE] Sending email via Supabase Edge Function');
      this.logDev('[EMAIL SERVICE] To:', to);
      this.logDev('[EMAIL SERVICE] Subject:', subject);
      this.logDev('[EMAIL SERVICE] HTML length:', html.length);

      // Prepare email data
      const emailData: EmailData = {
        to,
        subject,
        html,
        from: 'onboarding@resend.dev' // Using Resend sandbox domain
      };

      // Call the Supabase Edge Function to send the email
      const functionUrl = `${this.supabaseUrl}/functions/v1/send-email`;
      
      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // Include the Supabase auth header if available
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
        },
        body: JSON.stringify(emailData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('[EMAIL SERVICE] Error calling send-email function:', {
          status: response.status,
          statusText: response.statusText,
          errorData
        });
        return false;
      }

      const result = await response.json();
      
      if (result.error) {
        console.error('[EMAIL SERVICE] Error sending email:', result.error);
        return false;
      }

      this.logDev('[EMAIL SERVICE] Email sent successfully', result);
      return true;
      
    } catch (error) {
      console.error('[EMAIL SERVICE] Unexpected error sending email:', 
        error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : 'Unknown error'
      );
      return false;
    }
  }

  /**
   * Send an invitation email
   * @param invitationData - The invitation data
   * @param token - The invitation token
   * @returns True if successful, false otherwise
   */
  async sendInvitationEmail(
    invitationData: InvitationData, 
    token: string
  ): Promise<boolean> {
    const baseUrl = this.getBaseUrl();
    const invitationLink = `${baseUrl}/accept-invite?token=${encodeURIComponent(token)}`;
    
    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>You've been invited to join our system</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb; margin-bottom: 20px;">You've been invited to join our system</h1>
            
            <p>Hello,</p>
            
            <p>You've been invited to join our system as a <strong>${this.escapeHtml(invitationData.role)}</strong>.</p>
            
            ${invitationData.message ? `
            <p><strong>Message from the sender:</strong></p>
            <blockquote style="border-left: 4px solid #2563eb; padding-left: 16px; margin: 16px 0; color: #555;">
              ${this.escapeHtml(invitationData.message)}
            </blockquote>` : ''}
            
            <p>To accept this invitation, please click the button below:</p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${invitationLink}" 
                 style="background-color: #2563eb; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;
                        font-weight: bold;">
                Accept Invitation
              </a>
            </div>
            
            <p>Or copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2563eb;">${this.escapeHtml(invitationLink)}</p>
            
            <p style="color: #d97706; font-weight: 500;">This invitation will expire in 7 days.</p>
            
            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e5e7eb;">
            
            <p style="font-size: 14px; color: #6b7280;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;

    return this.sendEmail(
      invitationData.email,
      'You\'ve been invited to join our system',
      html
    );
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, char => map[char]);
  }
}

// Export singleton instance with default configuration
export const emailService = new EmailService();