import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Mail, Send, Copy, CheckCircle, AlertCircle, Users } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface InvitationResult {
    success: boolean;
    invitation_id?: string;
    token?: string;
    expires_at?: string;
    message?: string;
}

const StaffInvitePage = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [suggestedRole, setSuggestedRole] = useState<string>('staff');
    const [isLoading, setIsLoading] = useState(false);
    const [invitationLink, setInvitationLink] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    const handleSendInvitation = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!user) {
            toast({
                title: 'Authentication Required',
                description: 'You must be logged in to send invitations',
                variant: 'destructive',
            });
            return;
        }

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            toast({
                title: 'Invalid Email',
                description: 'Please enter a valid email address',
                variant: 'destructive',
            });
            return;
        }

        setIsLoading(true);

        try {
            // Call RPC function to create invitation
            const { data, error } = await supabase.rpc('create_staff_invitation', {
                p_email: email,
                p_invited_by: user.id,
                p_suggested_role: suggestedRole,
            });

            if (error) throw error;

            const result = data as InvitationResult;

            if (!result.success) {
                toast({
                    title: 'Invitation Failed',
                    description: result.message || 'Failed to create invitation',
                    variant: 'destructive',
                });
                return;
            }

            // Generate invitation link
            const baseUrl = window.location.origin;
            const link = `${baseUrl}/staff/register/${result.token}`;
            setInvitationLink(link);

            toast({
                title: 'Invitation Sent!',
                description: `Invitation email sent to ${email}`,
            });

            // Reset form
            setEmail('');
            setSuggestedRole('staff');
        } catch (error: any) {
            console.error('Error sending invitation:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to send invitation',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleCopyLink = () => {
        if (invitationLink) {
            navigator.clipboard.writeText(invitationLink);
            setCopied(true);
            toast({
                title: 'Link Copied!',
                description: 'Invitation link copied to clipboard',
            });
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const handleSendAnother = () => {
        setInvitationLink(null);
        setCopied(false);
    };

    return (
        <div className="container mx-auto p-6 max-w-2xl">
            <div className="mb-6">
                <Button
                    variant="outline"
                    onClick={() => navigate('/admin/staff/pending')}
                    className="mb-4"
                >
                    <Users className="mr-2 h-4 w-4" />
                    View Pending Applications
                </Button>
                <h1 className="text-3xl font-bold text-gray-900">Invite Staff Member</h1>
                <p className="text-gray-600 mt-2">
                    Send an invitation email to a new staff member to join your organization
                </p>
            </div>

            {!invitationLink ? (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Mail className="h-5 w-5" />
                            Send Invitation
                        </CardTitle>
                        <CardDescription>
                            Enter the email address and select the suggested role for the new staff member
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <form onSubmit={handleSendInvitation} className="space-y-6">
                            <div className="space-y-2">
                                <Label htmlFor="email">Email Address *</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="john.doe@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                    disabled={isLoading}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="role">Suggested Role *</Label>
                                <Select value={suggestedRole} onValueChange={setSuggestedRole} disabled={isLoading}>
                                    <SelectTrigger id="role">
                                        <SelectValue placeholder="Select a role" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="staff">Staff</SelectItem>
                                        <SelectItem value="collector">Collector</SelectItem>
                                        <SelectItem value="creditor">Creditor</SelectItem>
                                    </SelectContent>
                                </Select>
                                <p className="text-sm text-gray-500">
                                    This is a suggestion. You can assign a different role during approval.
                                </p>
                            </div>

                            <Alert>
                                <AlertCircle className="h-4 w-4" />
                                <AlertDescription>
                                    The invitation link will expire in 7 days. The recipient must complete their
                                    registration before the link expires.
                                </AlertDescription>
                            </Alert>

                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Send className="mr-2 h-4 w-4 animate-spin" />
                                        Sending Invitation...
                                    </>
                                ) : (
                                    <>
                                        <Send className="mr-2 h-4 w-4" />
                                        Send Invitation
                                    </>
                                )}
                            </Button>
                        </form>
                    </CardContent>
                </Card>
            ) : (
                <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-green-800">
                            <CheckCircle className="h-5 w-5" />
                            Invitation Sent Successfully!
                        </CardTitle>
                        <CardDescription className="text-green-700">
                            The invitation has been sent to {email}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Invitation Link</Label>
                            <div className="flex gap-2">
                                <Input value={invitationLink} readOnly className="bg-white" />
                                <Button onClick={handleCopyLink} variant="outline" size="icon">
                                    {copied ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <Copy className="h-4 w-4" />
                                    )}
                                </Button>
                            </div>
                            <p className="text-sm text-gray-600">
                                You can also copy and share this link manually
                            </p>
                        </div>

                        <div className="flex gap-2">
                            <Button onClick={handleSendAnother} className="flex-1">
                                Send Another Invitation
                            </Button>
                            <Button
                                onClick={() => navigate('/admin/staff/pending')}
                                variant="outline"
                                className="flex-1"
                            >
                                View Pending Applications
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>
    );
};

export default StaffInvitePage;
