import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database.types';

export interface InvitationData {
  email: string;
  role: 'admin' | 'staff' | 'farmer';
  message?: string;
  invitedBy: string; // User ID of the admin who sent the invitation
}

export interface Invitation extends InvitationData {
  id: string;
  created_at: string;
  expires_at: string;
  token: string;
  accepted: boolean;
  accepted_at?: string;
}

export interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  accepted: boolean;
  accepted_at?: string;
  invited_by: string;
  invited_by_name?: string;
}

export class InvitationService {
  /**
   * Create a new invitation
   * @param invitationData - The invitation data
   * @returns The created invitation or null if failed
   */
  async createInvitation(invitationData: InvitationData): Promise<Invitation | null> {
    try {
      // Generate a unique token for the invitation
      const token = this.generateToken();
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      // In a real implementation with an invitations table, you would do something like:
      // const { data, error } = await supabase
      //   .from('invitations')
      //   .insert({
      //     email: invitationData.email,
      //     role: invitationData.role,
      //     message: invitationData.message,
      //     invited_by: invitationData.invitedBy,
      //     token: token,
      //     expires_at: expiresAt.toISOString(),
      //     accepted: false
      //   })
      //   .select()
      //   .single();
      
      // Since we don't have an invitations table, we'll simulate the process
      // and store the role in user_roles table with a temporary user_id
      const tempUserId = `invite_${token.substring(0, 8)}`;
      
      const { data: roleData, error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: tempUserId,
          role: invitationData.role,
          created_at: new Date().toISOString()
        })
        .select()
        .single();

      if (roleError) {
        console.error('Error creating user role:', roleError);
        return null;
      }

      // Create a mock invitation object
      const invitation: Invitation = {
        id: roleData.id,
        email: invitationData.email,
        role: invitationData.role,
        message: invitationData.message,
        invitedBy: invitationData.invitedBy,
        created_at: new Date().toISOString(),
        expires_at: expiresAt.toISOString(),
        token,
        accepted: false
      };

      return invitation;
    } catch (error) {
      console.error('Error creating invitation:', error);
      return null;
    }
  }

  /**
   * Send invitation email using a simulated email service
   * In a real implementation, you would integrate with an actual email service
   * @param invitation - The invitation to send
   * @returns True if successful, false otherwise
   */
  async sendInvitationEmail(invitation: Invitation): Promise<boolean> {
    try {
      // Simulate email sending by logging to console
      if (import.meta.env.DEV) {
        console.log(`Sending invitation email to ${invitation.email}`);
        console.log(`Invitation link: ${window.location.origin}/accept-invite?token=[REDACTED]`);
      }
      
      if (invitation.message && import.meta.env.DEV) {
        console.log(`Custom message: ${invitation.message}`);
      }
      
      // In a real implementation, you could integrate with:
      // 1. Supabase Functions (if you set up a function to send emails)
      // 2. Third-party service like SendGrid, Mailgun, etc.
      
      // Example of how you might call a Supabase function:
      // const { data, error } = await supabase.functions.invoke('send-invitation-email', {
      //   body: {
      //     to: invitation.email,
      //     subject: 'You\'ve been invited to join our system',
      //     template: 'invitation',
      //     data: {
      //       invitationLink: `${window.location.origin}/accept-invite?token=[REDACTED]`,
      //       roleName: invitation.role,
      //       customMessage: invitation.message
      //     }
      //   }
      // });
      
      // For now, we'll simulate email sending delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      return true;
    } catch (error) {
      if (import.meta.env.DEV) {
        console.error('Error sending invitation email:', error instanceof Error ? error.message : 'Unknown error');
      }
      return false;
    }
  }

  /**
   * Accept an invitation
   * @param token - The invitation token
   * @param userId - The user ID who is accepting the invitation
   * @returns True if successful, false otherwise
   */
  async acceptInvitation(token: string, userId: string): Promise<boolean> {
    try {
      // In a real implementation with an invitations table, you would:
      // 1. Find the invitation by token
      // 2. Check if it's expired
      // 3. Update the user_roles table with the actual user_id
      // 4. Mark the invitation as accepted
      // 5. Update the invitation's accepted_at timestamp
      
      // Since we're simulating, we'll just update the user_roles table
      // Find the temporary user role entry
      const tempUserId = `invite_${token.substring(0, 8)}`;
      
      const { data: roleData, error: fetchError } = await supabase
        .from('user_roles')
        .select('*')
        .eq('user_id', tempUserId)
        .single();

      if (fetchError || !roleData) {
        console.error('Invitation not found or already accepted');
        return false;
      }

      // Update the user role with the actual user ID
      const { error: updateError } = await supabase
        .from('user_roles')
        .update({ 
          user_id: userId,
          created_at: new Date().toISOString()
        })
        .eq('id', roleData.id);

      if (updateError) {
        console.error('Error updating user role:', updateError);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error accepting invitation:', error);
      return false;
    }
  }

  /**
   * Generate a unique token for the invitation
   * @returns A unique token
   */
  private generateToken(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Validate if an invitation token is still valid
   * @param token - The invitation token
   * @returns True if valid, false otherwise
   */
  async validateInvitationToken(token: string): Promise<boolean> {
    try {
      // In a real implementation, you would check the database for the token
      // and verify it hasn't expired and hasn't been used
      
      // Since we're simulating, we'll just check if the temp user exists
      const tempUserId = `invite_${token.substring(0, 8)}`;
      
      const { data, error } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', tempUserId)
        .single();

      // If we found the temp user, the invitation is still valid
      return !error && !!data;
    } catch (error) {
      console.error('Error validating invitation token:', error);
      return false;
    }
  }
  
  /**
   * Get all pending invitations sent by a specific admin
   * @param adminId - The admin user ID
   * @returns Array of pending invitations
   */
  async getPendingInvitations(adminId: string): Promise<InvitationRecord[]> {
    try {
      // In a real implementation with an invitations table, you would:
      // const { data, error } = await supabase
      //   .from('invitations')
      //   .select(`
      //     id,
      //     email,
      //     role,
      //     created_at,
      //     expires_at,
      //     accepted,
      //     accepted_at,
      //     invited_by:profiles(full_name)
      //   `)
      //   .eq('invited_by', adminId)
      //   .eq('accepted', false)
      //   .gt('expires_at', new Date().toISOString())
      //   .order('created_at', { ascending: false });
      
      // Since we're simulating, we'll return mock data
      const mockInvitations: InvitationRecord[] = [
        {
          id: '1',
          email: 'john.doe@example.com',
          role: 'staff',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
          accepted: false,
          invited_by: adminId
        },
        {
          id: '2',
          email: 'jane.smith@example.com',
          role: 'admin',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          accepted: false,
          invited_by: adminId
        }
      ];
      
      return mockInvitations;
    } catch (error) {
      console.error('Error fetching pending invitations:', error);
      return [];
    }
  }
  
  /**
   * Get all invitations (pending and accepted) sent by a specific admin
   * @param adminId - The admin user ID
   * @returns Array of all invitations
   */
  async getAllInvitations(adminId: string): Promise<InvitationRecord[]> {
    try {
      // In a real implementation with an invitations table, you would:
      // const { data, error } = await supabase
      //   .from('invitations')
      //   .select(`
      //     id,
      //     email,
      //     role,
      //     created_at,
      //     expires_at,
      //     accepted,
      //     accepted_at,
      //     invited_by:profiles(full_name)
      //   `)
      //   .eq('invited_by', adminId)
      //   .order('created_at', { ascending: false });
      
      // Since we're simulating, we'll return mock data
      const mockInvitations: InvitationRecord[] = [
        {
          id: '1',
          email: 'john.doe@example.com',
          role: 'staff',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
          accepted: false,
          invited_by: adminId
        },
        {
          id: '2',
          email: 'jane.smith@example.com',
          role: 'admin',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          accepted: false,
          invited_by: adminId
        },
        {
          id: '3',
          email: 'bob.johnson@example.com',
          role: 'staff',
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          expires_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago (expired)
          accepted: true,
          accepted_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          invited_by: adminId
        }
      ];
      
      return mockInvitations;
    } catch (error) {
      console.error('Error fetching all invitations:', error);
      return [];
    }
  }
  
  /**
   * Revoke an invitation
   * @param invitationId - The invitation ID
   * @returns True if successful, false otherwise
   */
  async revokeInvitation(invitationId: string): Promise<boolean> {
    try {
      // In a real implementation with an invitations table, you would:
      // const { error } = await supabase
      //   .from('invitations')
      //   .delete()
      //   .eq('id', invitationId);
      
      // Since we're simulating, we'll just return true
      return true;
    } catch (error) {
      console.error('Error revoking invitation:', error);
      return false;
    }
  }
  
  /**
   * Send email using a third-party email service
   * This is an example of how you might integrate with SendGrid or similar
   * @param to - Recipient email address
   * @param subject - Email subject
   * @param html - HTML content of the email
   * @returns True if successful, false otherwise
   */
  async sendEmailWithService(to: string, subject: string, html: string): Promise<boolean> {
    try {
      // This is a placeholder for actual email service integration
      // You would typically make an API call to your email service here
      
      // Example using fetch to call an email service API:
      // const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      //   method: 'POST',
      //   headers: {
      //     'Authorization': `Bearer ${import.meta.env.VITE_SENDGRID_API_KEY}`,
      //     'Content-Type': 'application/json'
      //   },
      //   body: JSON.stringify({
      //     personalizations: [{
      //       to: [{ email: to }],
      //       subject: subject
      //     }],
      //     from: {
      //       email: 'noreply@yourcompany.com'
      //     },
      //     content: [{
      //       type: 'text/html',
      //       value: html
      //     }]
      //   })
      // });
      
      // For now, we'll just log to console
      console.log(`Sending email to ${to} with subject: ${subject}`);
      console.log(`Email content: ${html}`);
      
      return true;
    } catch (error) {
      console.error('Error sending email:', error);
      return false;
    }
  }
  
  /**
   * Generate HTML email template for invitations
   * @param invitation - The invitation data
   * @returns HTML email template
   */
  generateInvitationEmailTemplate(invitation: Invitation): string {
    const invitationLink = `${window.location.origin}/accept-invite?token=${invitation.token}`;
    
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>You've been invited to join our system</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <h1 style="color: #2563eb;">You've been invited to join our system</h1>
            
            <p>Hello,</p>
            
            <p>You've been invited to join our system as a <strong>${invitation.role}</strong>.</p>
            
            ${invitation.message ? `<p><strong>Message from the sender:</strong></p>
            <blockquote style="border-left: 4px solid #2563eb; padding-left: 16px; margin: 16px 0;">
              ${invitation.message}
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
            <p style="word-break: break-all; color: #2563eb;">${invitationLink}</p>
            
            <p>This invitation will expire in 7 days.</p>
            
            <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e5e7eb;">
            
            <p style="font-size: 14px; color: #6b7280;">
              If you didn't expect this invitation, you can safely ignore this email.
            </p>
          </div>
        </body>
      </html>
    `;
  }
}

export const invitationService = new InvitationService();