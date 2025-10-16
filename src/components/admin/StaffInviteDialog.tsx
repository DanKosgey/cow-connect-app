import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Shield, Send, Plus } from 'lucide-react';
import { invitationService } from '@/services/invitation-service';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';

interface StaffInviteDialogProps {
  onInviteSent?: () => void;
}

export const StaffInviteDialog: React.FC<StaffInviteDialogProps> = ({ onInviteSent }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  
  const { show, error: showError } = useToastNotifications();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendInvite = async () => {
    // Validate email
    if (!email) {
      showError('Validation Error', 'Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      showError('Validation Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Check if Resend API key is configured
      const resendApiKey = import.meta.env.VITE_RESEND_API_KEY;
      if (!resendApiKey) {
        throw new Error('Email service is not configured. Please add VITE_RESEND_API_KEY to your environment variables.');
      }

      // Get the current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[INVITE] Creating invitation for:', email);

      // Create the invitation
      const invitation = await invitationService.createInvitation({
        email,
        role,
        message: message.trim() || undefined,
        invitedBy: user.id
      });

      if (!invitation) {
        throw new Error('Failed to create invitation record');
      }

      console.log('[INVITE] Invitation created successfully:', invitation.id);
      console.log('[INVITE] Sending invitation email...');

      // Send the invitation email
      const emailSent = await invitationService.sendInvitationEmail(invitation);
      
      if (!emailSent) {
        throw new Error('Failed to send invitation email. Please check your Resend API configuration and ensure your domain is verified.');
      }

      console.log('[INVITE] Invitation email sent successfully');

      show({ 
        title: 'Invitation Sent!', 
        description: `Invitation email sent to ${email} for the ${role} role. They will receive instructions to join the system.` 
      });
      
      // Reset form
      setEmail('');
      setRole('staff');
      setMessage('');
      setOpen(false);
      
      // Notify parent component
      onInviteSent?.();
    } catch (err: any) {
      console.error('[INVITE] Error:', err);
      
      // Provide detailed error messages
      let errorTitle = 'Invitation Failed';
      let errorMessage = err?.message || 'Failed to send invitation';
      
      if (errorMessage.includes('not configured')) {
        errorTitle = 'Configuration Error';
        errorMessage = 'Email service is not configured. Please contact your system administrator.';
      } else if (errorMessage.includes('Resend API') || errorMessage.includes('domain')) {
        errorTitle = 'Email Service Error';
        errorMessage = 'There was a problem with the email service. Please verify your Resend API key and domain configuration.';
      } else if (errorMessage.includes('not authenticated')) {
        errorTitle = 'Authentication Error';
        errorMessage = 'Please log in again to send invitations.';
      }
      
      showError(errorTitle, errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!loading) {
      setOpen(newOpen);
      if (!newOpen) {
        // Reset form when closing
        setEmail('');
        setRole('staff');
        setMessage('');
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button 
          className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Staff
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-blue-600" />
            Invite New Staff Member
          </DialogTitle>
          <DialogDescription>
            Send an invitation to a new staff member via email. They will receive instructions to create their account.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-6 py-4">
          {/* Email Input */}
          <div className="space-y-2">
            <Label htmlFor="email" className="flex items-center gap-2">
              <Mail className="h-4 w-4" />
              Email Address
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="staff@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              className="w-full"
              autoComplete="email"
              required
            />
            {email && !validateEmail(email) && (
              <p className="text-sm text-red-600">Please enter a valid email address</p>
            )}
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role" className="flex items-center gap-2">
              <Shield className="h-4 w-4" />
              Role
            </Label>
            <Select value={role} onValueChange={(value: 'staff' | 'admin') => setRole(value)} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder="Select a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    Staff Member
                  </div>
                </SelectItem>
                <SelectItem value="admin">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                    Administrator
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-gray-500">
              {role === 'staff' 
                ? 'Staff members have standard access to the system' 
                : 'Administrators have full system access and management capabilities'}
            </p>
          </div>

          {/* Optional Message */}
          <div className="space-y-2">
            <Label htmlFor="message">
              Welcome Message (Optional)
            </Label>
            <Textarea
              id="message"
              placeholder="Add a personal welcome message for the new staff member..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              disabled={loading}
              rows={3}
              className="resize-none"
              maxLength={500}
            />
            {message && (
              <p className="text-xs text-gray-500 text-right">
                {message.length}/500 characters
              </p>
            )}
          </div>

          {/* Info Box */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <div className="w-2 h-2 bg-blue-500 rounded-full mt-2 flex-shrink-0"></div>
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">What happens next?</p>
                <ul className="space-y-1 text-blue-700">
                  <li>• An invitation email will be sent to {email || 'the specified address'}</li>
                  <li>• The recipient will receive a secure link to create their account</li>
                  <li>• The invitation link will expire after 7 days</li>
                  <li>• Once accepted, they'll have access with their assigned role</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button 
            variant="outline" 
            onClick={() => handleOpenChange(false)}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleSendInvite}
            disabled={loading || !email || !validateEmail(email)}
            className="bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Sending...
              </>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Send Invitation
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};