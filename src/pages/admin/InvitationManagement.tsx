import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { UserPlus, Mail, Shield, X, Check } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { invitationService } from '@/services/invitation-service';

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
  const [invitations, setInvitations] = useState<InvitationRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    const fetchUserAndInvitations = async () => {
      try {
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setCurrentUser(user);
          
          // Fetch user profile for display name
          const { data: profile } = await supabase
            .from('profiles')
            .select('full_name')
            .eq('id', user.id)
            .single();
          
          // Fetch pending invitations
          await fetchInvitations(user.id, profile?.full_name || 'Unknown');
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
        showError('Error', 'Failed to load user data');
      } finally {
        setLoading(false);
      }
    };

    fetchUserAndInvitations();
  }, []);

  const fetchInvitations = async (userId: string, userName: string) => {
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
      //     invited_by:profiles(full_name)
      //   `)
      //   .eq('invited_by', userId)
      //   .order('created_at', { ascending: false });
      
      // Since we're simulating, we'll create mock data
      const mockInvitations: InvitationRecord[] = [
        {
          id: '1',
          email: 'john.doe@example.com',
          role: 'staff',
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          expires_at: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days from now
          accepted: false,
          invited_by_name: userName
        },
        {
          id: '2',
          email: 'jane.smith@example.com',
          role: 'admin',
          created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
          expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days from now
          accepted: false,
          invited_by_name: userName
        },
        {
          id: '3',
          email: 'bob.johnson@example.com',
          role: 'staff',
          created_at: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString(), // 10 days ago
          expires_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago (expired)
          accepted: false,
          invited_by_name: userName
        }
      ];
      
      setInvitations(mockInvitations);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      showError('Error', 'Failed to load invitations');
    }
  };

  const revokeInvitation = async (invitationId: string) => {
    try {
      // In a real implementation, you would:
      // const success = await invitationService.revokeInvitation(invitationId);
      
      // Since we're simulating, we'll just remove from local state
      setInvitations(prev => prev.filter(inv => inv.id !== invitationId));
      
      show({ 
        title: 'Success', 
        description: 'Invitation revoked successfully' 
      });
    } catch (error) {
      console.error('Error revoking invitation:', error);
      showError('Error', 'Failed to revoke invitation');
    }
  };

  const resendInvitation = async (invitation: InvitationRecord) => {
    try {
      // Create a new invitation object
      const newInvitation = {
        id: invitation.id,
        email: invitation.email,
        role: invitation.role as 'admin' | 'staff' | 'farmer',
        invitedBy: currentUser?.id || '',
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
        token: Math.random().toString(36).substring(2, 15),
        accepted: false
      };
      
      // Send the invitation email
      const emailSent = await invitationService.sendInvitationEmail(newInvitation);
      
      if (emailSent) {
        show({ 
          title: 'Success', 
          description: `Invitation resent to ${invitation.email}` 
        });
      } else {
        throw new Error('Failed to send invitation email');
      }
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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
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
                                onClick={() => resendInvitation(invitation)}
                              >
                                <Mail className="h-4 w-4 mr-1" />
                                Resend
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => revokeInvitation(invitation.id)}
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
    </DashboardLayout>
  );
}