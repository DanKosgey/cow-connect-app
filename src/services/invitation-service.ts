import { supabase } from '@/integrations/supabase/client';
import type { Database } from '@/types/database.types';
import { emailService } from './email-service';

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
   * Generate a cryptographically secure token for the invitation
   * @returns A secure unique token
   */
  private generateToken(): string {
    // Use crypto.randomUUID for better security and uniqueness
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      return crypto.randomUUID();
    }
    
    // Fallback to a more secure random string
    const array = new Uint8Array(32);
    crypto.getRandomValues(array);
    return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
  }

  /**
   * Validate email format
   * @param email - Email address to validate
   * @returns True if valid, false otherwise
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Create a new invitation
   * @param invitationData - The invitation data
   * @returns The created invitation or null if failed
   */
  async createInvitation(invitationData: InvitationData): Promise<Invitation | null> {
    try {
      // Validate email
      if (!this.isValidEmail(invitationData.email)) {
        console.error('[INVITATION] Invalid email format:', invitationData.email);
        return null;
      }

      // Check if there's already a pending invitation for this email
      const { data: existingInvitation, error: checkError } = await supabase
        .from('invitations')
        .select('id, expires_at, accepted')
        .eq('email', invitationData.email)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();

      if (existingInvitation) {
        console.warn('[INVITATION] Active invitation already exists for:', invitationData.email);
        // Return the existing invitation instead of creating a new one
        const { data: fullInvitation } = await supabase
          .from('invitations')
          .select('*')
          .eq('id', existingInvitation.id)
          .single();
        
        if (fullInvitation) {
          return {
            id: fullInvitation.id,
            email: fullInvitation.email,
            role: fullInvitation.role,
            message: fullInvitation.message,
            invitedBy: fullInvitation.invited_by,
            created_at: fullInvitation.created_at,
            expires_at: fullInvitation.expires_at,
            token: fullInvitation.token,
            accepted: fullInvitation.accepted,
            accepted_at: fullInvitation.accepted_at
          };
        }
      }

      // Generate a unique token for the invitation
      const token = this.generateToken();
      
      // Set expiration to 7 days from now
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7);
      
      console.log('[INVITATION] Creating invitation for:', invitationData.email);

      // Insert the invitation into the database
      const { data, error } = await supabase
        .from('invitations')
        .insert({
          email: invitationData.email.toLowerCase().trim(),
          role: invitationData.role,
          message: invitationData.message?.trim() || null,
          invited_by: invitationData.invitedBy,
          token: token,
          expires_at: expiresAt.toISOString(),
          accepted: false
        })
        .select()
        .single();

      if (error) {
        console.error('[INVITATION] Error creating invitation:', error);
        return null;
      }

      console.log('[INVITATION] Invitation created successfully:', data.id);

      // Convert the database record to our Invitation interface
      const invitation: Invitation = {
        id: data.id,
        email: data.email,
        role: data.role as 'admin' | 'staff' | 'farmer',
        message: data.message,
        invitedBy: data.invited_by,
        created_at: data.created_at,
        expires_at: data.expires_at,
        token: data.token,
        accepted: data.accepted,
        accepted_at: data.accepted_at
      };

      return invitation;
    } catch (error) {
      console.error('[INVITATION] Unexpected error creating invitation:', error);
      return null;
    }
  }

  /**
   * Send invitation email using the email service
   * @param invitation - The invitation to send
   * @returns True if successful, false otherwise
   */
  async sendInvitationEmail(invitation: Invitation): Promise<boolean> {
    try {
      console.log('[INVITATION] Sending invitation email to:', invitation.email);

      // Use the email service to send the invitation
      const success = await emailService.sendInvitationEmail(
        {
          email: invitation.email,
          role: invitation.role,
          message: invitation.message
        },
        invitation.token
      );
      
      if (success) {
        console.log('[INVITATION] Email sent successfully to:', invitation.email);
      } else {
        console.error('[INVITATION] Failed to send email to:', invitation.email);
      }
      
      return success;
    } catch (error) {
      console.error('[INVITATION] Error sending invitation email:', 
        error instanceof Error ? error.message : 'Unknown error'
      );
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
      console.log('[INVITATION] Accepting invitation with token:', token.substring(0, 8) + '...');

      // Find the invitation by token
      const { data: invitationData, error: fetchError } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single();

      if (fetchError || !invitationData) {
        console.error('[INVITATION] Invitation not found:', fetchError);
        return false;
      }

      // Check if invitation is expired
      const now = new Date();
      const expiresAt = new Date(invitationData.expires_at);
      if (now > expiresAt) {
        console.error('[INVITATION] Invitation has expired');
        return false;
      }

      // Check if invitation is already accepted
      if (invitationData.accepted) {
        console.error('[INVITATION] Invitation already accepted');
        return false;
      }

      console.log('[INVITATION] Assigning role:', invitationData.role);

      // Assign the role to the user using the Edge Function
      const { data: functionData, error: functionError } = await supabase
        .functions
        .invoke('assign-role', {
          body: {
            userId: userId,
            role: invitationData.role
          }
        });

      if (functionError) {
        console.error('[INVITATION] Error assigning role via Edge Function:', functionError);
        return false;
      }

      if (!functionData?.success) {
        console.error('[INVITATION] Role assignment failed:', functionData?.error);
        return false;
      }

      console.log('[INVITATION] Role assigned successfully, updating invitation status');

      // Update the invitation as accepted
      const { error: updateError } = await supabase
        .from('invitations')
        .update({ 
          accepted: true,
          accepted_at: new Date().toISOString()
        })
        .eq('id', invitationData.id);

      if (updateError) {
        console.error('[INVITATION] Error updating invitation:', updateError);
        // Role was assigned but we couldn't update the invitation status
        // This is not critical, so we still return true
        return true;
      }

      console.log('[INVITATION] Invitation accepted successfully');
      return true;
    } catch (error) {
      console.error('[INVITATION] Unexpected error accepting invitation:', error);
      return false;
    }
  }

  /**
   * Validate if an invitation token is still valid
   * @param token - The invitation token
   * @returns True if valid, false otherwise
   */
  async validateInvitationToken(token: string): Promise<boolean> {
    try {
      // Find the invitation by token
      const { data, error } = await supabase
        .from('invitations')
        .select('expires_at, accepted')
        .eq('token', token)
        .single();

      // If invitation not found, it's invalid
      if (error || !data) {
        console.log('[INVITATION] Token validation failed: not found');
        return false;
      }

      // Check if invitation is expired
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      if (now > expiresAt) {
        console.log('[INVITATION] Token validation failed: expired');
        return false;
      }

      // Check if invitation is already accepted
      if (data.accepted) {
        console.log('[INVITATION] Token validation failed: already accepted');
        return false;
      }

      // Invitation is valid
      return true;
    } catch (error) {
      console.error('[INVITATION] Error validating invitation token:', error);
      return false;
    }
  }
  
  /**
   * Get invitation details by token
   * @param token - The invitation token
   * @returns Invitation details or null if not found
   */
  async getInvitationByToken(token: string): Promise<Invitation | null> {
    try {
      // Find the invitation by token
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('token', token)
        .single();

      // If invitation not found, return null
      if (error || !data) {
        console.log('[INVITATION] Invitation not found for token');
        return null;
      }

      // Convert the database record to our Invitation interface
      const invitation: Invitation = {
        id: data.id,
        email: data.email,
        role: data.role as 'admin' | 'staff' | 'farmer',
        message: data.message,
        invitedBy: data.invited_by,
        created_at: data.created_at,
        expires_at: data.expires_at,
        token: data.token,
        accepted: data.accepted,
        accepted_at: data.accepted_at
      };

      return invitation;
    } catch (error) {
      console.error('[INVITATION] Error fetching invitation by token:', error);
      return null;
    }
  }
  
  /**
   * Get all pending invitations sent by a specific admin
   * @param adminId - The admin user ID
   * @returns Array of pending invitations
   */
  async getPendingInvitations(adminId: string): Promise<InvitationRecord[]> {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('invited_by', adminId)
        .eq('accepted', false)
        .gt('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[INVITATION] Error fetching pending invitations:', error);
        return [];
      }

      // Transform the data to match InvitationRecord interface
      return (data || []).map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
        accepted: inv.accepted,
        accepted_at: inv.accepted_at,
        invited_by: inv.invited_by,
      }));
    } catch (error) {
      console.error('[INVITATION] Error fetching pending invitations:', error);
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
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('invited_by', adminId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('[INVITATION] Error fetching all invitations:', error);
        return [];
      }

      // Transform the data to match InvitationRecord interface
      return (data || []).map(inv => ({
        id: inv.id,
        email: inv.email,
        role: inv.role,
        created_at: inv.created_at,
        expires_at: inv.expires_at,
        accepted: inv.accepted,
        accepted_at: inv.accepted_at,
        invited_by: inv.invited_by,
      }));
    } catch (error) {
      console.error('[INVITATION] Error fetching all invitations:', error);
      return [];
    }
  }
  
  /**
   * Resend an invitation email
   * @param invitationId - The invitation ID
   * @returns True if successful, false otherwise
   */
  async resendInvitation(invitationId: string): Promise<boolean> {
    try {
      console.log('[INVITATION] Resending invitation:', invitationId);

      // Get the invitation details
      const { data, error } = await supabase
        .from('invitations')
        .select('*')
        .eq('id', invitationId)
        .single();

      if (error || !data) {
        console.error('[INVITATION] Error fetching invitation for resend:', error);
        return false;
      }

      // Check if invitation is still valid
      const now = new Date();
      const expiresAt = new Date(data.expires_at);
      
      if (data.accepted) {
        console.error('[INVITATION] Cannot resend: invitation already accepted');
        return false;
      }

      if (now > expiresAt) {
        console.error('[INVITATION] Cannot resend: invitation has expired');
        return false;
      }

      // Send the invitation email
      const invitation: Invitation = {
        id: data.id,
        email: data.email,
        role: data.role as 'admin' | 'staff' | 'farmer',
        message: data.message,
        invitedBy: data.invited_by,
        created_at: data.created_at,
        expires_at: data.expires_at,
        token: data.token,
        accepted: data.accepted,
        accepted_at: data.accepted_at
      };

      return await this.sendInvitationEmail(invitation);
    } catch (error) {
      console.error('[INVITATION] Error resending invitation:', error);
      return false;
    }
  }

  /**
   * Revoke an invitation
   * @param invitationId - The invitation ID
   * @returns True if successful, false otherwise
   */
  async revokeInvitation(invitationId: string): Promise<boolean> {
    try {
      console.log('[INVITATION] Revoking invitation:', invitationId);

      const { error } = await supabase
        .from('invitations')
        .delete()
        .eq('id', invitationId);

      if (error) {
        console.error('[INVITATION] Error revoking invitation:', error);
        return false;
      }

      console.log('[INVITATION] Invitation revoked successfully');
      return true;
    } catch (error) {
      console.error('[INVITATION] Error revoking invitation:', error);
      return false;
    }
  }

  /**
   * Clean up expired invitations (for maintenance)
   * @returns Number of invitations deleted
   */
  async cleanupExpiredInvitations(): Promise<number> {
    try {
      const { data, error } = await supabase
        .from('invitations')
        .delete()
        .lt('expires_at', new Date().toISOString())
        .eq('accepted', false)
        .select('id');

      if (error) {
        console.error('[INVITATION] Error cleaning up expired invitations:', error);
        return 0;
      }

      const count = data?.length || 0;
      console.log(`[INVITATION] Cleaned up ${count} expired invitations`);
      return count;
    } catch (error) {
      console.error('[INVITATION] Error cleaning up expired invitations:', error);
      return 0;
    }
  }
}

export const invitationService = new InvitationService();