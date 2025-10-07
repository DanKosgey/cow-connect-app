import { useState } from 'react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { DashboardLayout } from '@/components/DashboardLayout';
import { UserPlus, Mail, Shield } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { PageHeader } from '@/components/admin/PageHeader';
import { invitationService } from '@/services/invitation-service';
import { supabase } from '@/integrations/supabase/client';

export default function AdminInvite() {
  const { show, error: showError } = useToastNotifications();
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<'staff' | 'admin'>('staff');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const sendInvite = async () => {
    if (!email || !email.includes('@')) {
      showError('Validation Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      // Get the current user ID
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create the invitation
      const invitation = await invitationService.createInvitation({
        email,
        role,
        message,
        invitedBy: user.id
      });

      if (!invitation) {
        throw new Error('Failed to create invitation');
      }

      // Send the invitation email
      const emailSent = await invitationService.sendInvitationEmail(invitation);
      
      if (!emailSent) {
        throw new Error('Failed to send invitation email');
      }

      show({ 
        title: 'Invite Sent', 
        description: `Invitation email sent to ${email} for ${role} role.` 
      });
      setEmail('');
      setMessage('');
    } catch (err: any) {
      console.error('Invite error:', err);
      showError('Invite failed', String(err?.message || 'Failed to send invite'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        {/* Header */}
        <PageHeader
          title="Invite Users"
          description="Send invitations to new staff members or administrators"
          icon={<UserPlus className="h-8 w-8" />}
        />

        {/* Invite Card */}
        <div className="max-w-2xl mx-auto">
          <Card className="border-t-4 border-t-blue-500 shadow-lg">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserPlus className="h-5 w-5" />
                Send Invitation
              </CardTitle>
              <CardDescription>
                Invite new users to join the system with specific roles and permissions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email Input */}
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </Label>
                <Input 
                  id="email"
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  placeholder="user@example.com" 
                  type="email"
                  className="p-3"
                />
                <p className="text-sm text-gray-500">Enter the email address of the person you want to invite</p>
              </div>

              {/* Role Selection */}
              <div className="space-y-2">
                <Label htmlFor="role" className="flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Role
                </Label>
                <select 
                  id="role"
                  value={role} 
                  onChange={(e) => setRole(e.target.value as any)} 
                  className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="staff">Staff Member</option>
                  <option value="admin">Administrator</option>
                </select>
                <p className="text-sm text-gray-500">
                  {role === 'admin' 
                    ? 'Administrators have full access to all system features' 
                    : 'Staff members have limited access based on their responsibilities'}
                </p>
              </div>

              {/* Custom Message */}
              <div className="space-y-2">
                <Label htmlFor="message">Custom Message (Optional)</Label>
                <Textarea
                  id="message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Add a personal message to include in the invitation email..."
                  rows={4}
                />
              </div>

              {/* Action Button */}
              <Button 
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-700 hover:from-blue-700 hover:to-indigo-800 py-3"
                onClick={sendInvite} 
                disabled={loading || !email || !email.includes('@')}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Invitation...
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4 mr-2" />
                    Send Invitation
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Information Section */}
          <Card className="mt-6 border-t-4 border-t-amber-500">
            <CardHeader>
              <CardTitle>How Invitations Work</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-100 dark:bg-blue-900/30 p-2 rounded-full">
                  <Mail className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                </div>
                <div>
                  <h3 className="font-medium">Email Invitation</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    The invited user will receive an email with instructions to set up their account
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-green-100 dark:bg-green-900/30 p-2 rounded-full">
                  <Shield className="h-4 w-4 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <h3 className="font-medium">Role-Based Access</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    Users will only have access to features appropriate for their assigned role
                  </p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="bg-purple-100 dark:bg-purple-900/30 p-2 rounded-full">
                  <UserPlus className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                </div>
                <div>
                  <h3 className="font-medium">Account Setup</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-300">
                    New users must complete account setup before accessing the system
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}