import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserPlus, Mail, Shield, Send, Plus, Copy, CheckCircle, AlertCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import useToastNotifications from '@/hooks/useToastNotifications';

interface StaffInviteDialogProps {
  onInviteSent?: () => void;
}

export const StaffInviteDialog: React.FC<StaffInviteDialogProps> = ({ onInviteSent }) => {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'staff' | 'admin' | 'collector' | 'creditor'>('staff');
  const [loading, setLoading] = useState(false);
  const [invitationLink, setInvitationLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { show, error: showError } = useToastNotifications();

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSendInvite = async () => {
    if (!email) {
      showError('Validation Error', 'Please enter an email address');
      return;
    }

    if (!validateEmail(email)) {
      showError('Validation Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    setInvitationLink(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[INVITE] Creating invitation for:', email);

      const { data, error } = await supabase.rpc('create_staff_invitation', {
        p_email: email,
        p_invited_by: user.id,
        p_suggested_role: role
      });

      if (error) throw error;

      const result = data as any;

      if (!result.success) {
        throw new Error(result.message || 'Failed to create invitation');
      }

      console.log('[INVITE] Invitation created successfully');

      // Generate invitation link
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/staff/register/${result.token}`;
      setInvitationLink(link);

      show({
        title: 'Invitation Created!',
        description: `Invitation created for ${email}. You can copy the link below.`
      });

      onInviteSent?.();

    } catch (err: any) {
      console.error('[INVITE] Error:', err);
      showError('Invitation Failed', err?.message || 'Failed to create invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyLink = () => {
    if (invitationLink) {
      navigator.clipboard.writeText(invitationLink);
      setCopied(true);
      show({
        title: 'Link Copied',
        description: 'Invitation link copied to clipboard'
      });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setEmail('');
    setRole('staff');
    setInvitationLink(null);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
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
            Generate an invitation link for a new staff member.
          </DialogDescription>
        </DialogHeader>

        {!invitationLink ? (
          <div className="space-y-6 py-4">
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
                autoComplete="email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="role" className="flex items-center gap-2">
                <Shield className="h-4 w-4" />
                Role
              </Label>
              <Select value={role} onValueChange={(value: any) => setRole(value)} disabled={loading}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">Staff Member</SelectItem>
                  <SelectItem value="collector">Collector</SelectItem>
                  <SelectItem value="creditor">Creditor</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm text-blue-800">
              <p className="font-medium mb-1 flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                Note
              </p>
              <p>The system will generate a unique link that expires in 7 days.</p>
            </div>
          </div>
        ) : (
          <div className="space-y-6 py-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-2" />
              <h3 className="text-lg font-medium text-green-800">Invitation Ready!</h3>
              <p className="text-green-700">The invitation for {email} has been created.</p>
            </div>

            <div className="space-y-2">
              <Label>Invitation Link</Label>
              <div className="flex gap-2">
                <Input value={invitationLink} readOnly className="bg-gray-50" />
                <Button onClick={handleCopyLink} variant="outline" size="icon">
                  {copied ? <CheckCircle className="h-4 w-4 text-green-600" /> : <Copy className="h-4 w-4" />}
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Copy this link and send it to the staff member.
              </p>
            </div>
          </div>
        )}

        <DialogFooter>
          {!invitationLink ? (
            <>
              <Button variant="outline" onClick={() => setOpen(false)} disabled={loading}>
                Cancel
              </Button>
              <Button
                onClick={handleSendInvite}
                disabled={loading || !email}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {loading ? 'Generating...' : 'Generate Link'}
              </Button>
            </>
          ) : (
            <div className="flex gap-2 w-full">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Close
              </Button>
              <Button onClick={() => setInvitationLink(null)} className="flex-1">
                Send Another
              </Button>
            </div>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};