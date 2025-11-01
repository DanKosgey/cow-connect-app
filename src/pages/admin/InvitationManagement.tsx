import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { AdminPortalLayout } from '@/components/admin/AdminPortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { UserPlus, Mail, Shield, X, Check } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useInvitationData } from '@/hooks/useInvitationData';

interface InvitationRecord {
  id: string;
  email: string;
  role: string;
  created_at: string;
  expires_at: string;
  accepted: boolean;
  invited_by_name?: string;
}

export default function InvitationManagement() {
  const { show, error: showError } = useToastNotifications();
  const { 
    useAllInvitations,
    resendInvitation,
    revokeInvitation
  } = useInvitationData();
  
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userName, setUserName] = useState<string>('');

  // Simulate fetching user data (in a real app, this would come from your auth context)
  useState(() => {
    const fetchUser = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          
          // Fetch user profile for display name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id);
            
          // Check if we have data and handle accordingly
          const profileData = profile && profile.length > 0 ? profile[0] : null;
          setUserName(profileData?.full_name || 'Unknown');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        showError('Error', 'Failed to load user data');
      }
    };

    fetchUser();
  });

  // Get all invitations with caching
  const { data: invitations = [], isLoading: invitationsLoading, refetch: refetchInvitations } = useAllInvitations(currentUser?.id || '');

  const handleRevokeInvitation = async (invitationId: string) => {
    try {
      await revokeInvitation.mutateAsync(invitationId);
      show({ 
        title: 'Success', 
        description: 'Invitation revoked successfully' 
      });
    } catch (error) {
      console.error('Error revoking invitation:', error);
      showError('Error', 'Failed to revoke invitation');
    }
  };

  const handleResendInvitation = async (invitation: InvitationRecord) => {
    try {
      await resendInvitation.mutateAsync(invitation.id);
      show({ 
        title: 'Success', 
        description: `Invitation resent to ${invitation.email}` 
      });
    } catch (error) {
      console.error('Error resending invitation:', error);
      showError('Error', 'Failed to resend invitation');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const isExpired = (expiresAt: string) => {
    return new Date(expiresAt) < new Date();
  };

  if (invitationsLoading) {
    return (
      <AdminPortalLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </AdminPortalLayout>
    );
  }

  return (
    <AdminPortalLayout>
      <div className="container mx-auto py-6">
        <PageHeader
          title="Invitation Management"
          description="Manage pending invitations and track invitation status"
          icon={<UserPlus className="h-8 w-8" />}
        />

        <Card>
          <CardHeader>
            <CardTitle>Pending Invitations</CardTitle>
            <CardDescription>
              View and manage all pending invitations sent by you
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.filter(inv => !inv.accepted).length === 0 ? (
              <div className="text-center py-12">
                <UserPlus className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-1">No pending invitations</h3>
                <p className="text-gray-500">You haven't sent any invitations yet</p>
                <Button 
                  className="mt-4"
                  onClick={() => window.location.hash = '/admin/invite'}
                >
                  Send New Invitation
                </Button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Sent Date</TableHead>
                      <TableHead>Expires</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations
                      .filter(inv => !inv.accepted)
                      .map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              <Shield className="h-3 w-3 mr-1" />
                              {invitation.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(invitation.created_at)}</TableCell>
                          <TableCell>{formatDate(invitation.expires_at)}</TableCell>
                          <TableCell>
                            {isExpired(invitation.expires_at) ? (
                              <Badge variant="destructive">Expired</Badge>
                            ) : (
                              <Badge variant="default">Pending</Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleResendInvitation(invitation)}
                                disabled={resendInvitation.isPending}
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Resend
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleRevokeInvitation(invitation.id)}
                                disabled={revokeInvitation.isPending}
                              >
                                <X className="h-4 w-4 mr-1" />
                                Revoke
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Accepted Invitations</CardTitle>
            <CardDescription>
              View invitations that have been accepted
            </CardDescription>
          </CardHeader>
          <CardContent>
            {invitations.filter(inv => inv.accepted).length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No accepted invitations yet
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Role</TableHead>
                      <TableHead>Accepted Date</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invitations
                      .filter(inv => inv.accepted)
                      .map((invitation) => (
                        <TableRow key={invitation.id}>
                          <TableCell className="font-medium">{invitation.email}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              <Shield className="h-3 w-3 mr-1" />
                              {invitation.role}
                            </Badge>
                          </TableCell>
                          <TableCell>{formatDate(invitation.created_at)}</TableCell>
                          <TableCell>
                            <Badge variant="default">
                              <Check className="h-3 w-3 mr-1" />
                              Accepted
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </AdminPortalLayout>
  );
}