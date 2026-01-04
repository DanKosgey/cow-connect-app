import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ArrowLeft, CheckCircle, XCircle, User, Phone, MapPin, Calendar, Mail, Shield, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const PendingStaffDetails = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { toast } = useToast();

    const [staff, setStaff] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    // Action States
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Form States
    const [assignedRole, setAssignedRole] = useState('staff');
    const [adminNotes, setAdminNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        if (id) fetchStaffDetails();
    }, [id]);

    const fetchStaffDetails = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pending_staff')
                .select(`
                    *,
                    staff_invitations (
                        invited_by,
                        suggested_role,
                        created_at
                    )
                `)
                .eq('id', id)
                .single();

            if (error) throw error;
            setStaff(data);
            setAssignedRole(data.requested_role || data.staff_invitations?.suggested_role || 'staff');
        } catch (error: any) {
            console.error('Error fetching staff details:', error);
            toast({
                title: 'Error',
                description: 'Failed to find staff application',
                variant: 'destructive'
            });
            navigate('/admin/staff/pending');
        } finally {
            setLoading(false);
        }
    };

    const handleApproveConfirm = async () => {
        if (!staff || !user) return;
        setActionLoading(true);

        try {
            const { data, error } = await supabase.rpc('approve_pending_staff', {
                p_pending_staff_id: staff.id,
                p_admin_id: user.id,
                p_assigned_role: assignedRole,
                p_admin_notes: adminNotes
            });

            if (error) throw error;
            const result = data as any;
            if (!result.success) throw new Error(result.message);

            toast({ title: 'Approved', description: `Staff member approved as ${assignedRole}` });
            setApproveDialogOpen(false);
            navigate('/admin/staff/pending');
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectConfirm = async () => {
        if (!staff || !user) return;
        if (!rejectionReason.trim()) {
            toast({ title: 'Validation Error', description: 'Please provide a reason', variant: 'destructive' });
            return;
        }

        setActionLoading(true);
        try {
            const { data, error } = await supabase.rpc('reject_pending_staff', {
                p_pending_staff_id: staff.id,
                p_admin_id: user.id,
                p_rejection_reason: rejectionReason,
                p_admin_notes: adminNotes
            });

            if (error) throw error;
            const result = data as any;
            if (!result.success) throw new Error(result.message);

            toast({ title: 'Rejected', description: 'Staff application rejected' });
            setRejectDialogOpen(false);
            navigate('/admin/staff/pending');
        } catch (error: any) {
            toast({ title: 'Error', description: error.message, variant: 'destructive' });
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return <div className="flex justify-center p-12"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
    if (!staff) return <div className="p-8 text-center">Application not found</div>;

    return (
        <div className="container mx-auto p-6 space-y-6 max-w-4xl">
            <Button variant="ghost" onClick={() => navigate('/admin/staff/pending')} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" /> Back to List
            </Button>

            <div className="flex justify-between items-start">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">{staff.full_name}</h1>
                    <div className="flex items-center gap-2 mt-2 text-muted-foreground">
                        <Mail className="h-4 w-4" /> {staff.email}
                        <span className="mx-2">•</span>
                        <Phone className="h-4 w-4" /> {staff.phone_number || 'N/A'}
                    </div>
                </div>
                <div className="flex gap-2">
                    <Badge className={staff.status === 'pending' ? 'bg-yellow-500' : 'bg-gray-500'}>
                        {staff.status.toUpperCase()}
                    </Badge>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Main Details */}
                <div className="md:col-span-2 space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle>Personal Information</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">National ID</Label>
                                    <p className="font-medium">{staff.national_id || 'N/A'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Gender</Label>
                                    <p className="font-medium capitalize">{staff.gender || 'N/A'}</p>
                                </div>
                                <div className="col-span-2">
                                    <Label className="text-muted-foreground">Address</Label>
                                    <div className="flex items-center gap-2">
                                        <MapPin className="h-4 w-4 text-muted-foreground" />
                                        <p className="font-medium">{staff.address || 'N/A'}</p>
                                    </div>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Date of Birth</Label>
                                    <p className="font-medium">{staff.date_of_birth || 'N/A'}</p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Application Details</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Label className="text-muted-foreground">Suggested Role</Label>
                                    <p className="font-medium capitalize">{staff.staff_invitations?.suggested_role || 'None'}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Requested Role</Label>
                                    <p className="font-medium capitalize font-bold text-primary">{staff.requested_role}</p>
                                </div>
                                <div>
                                    <Label className="text-muted-foreground">Application Date</Label>
                                    <div className="flex items-center gap-2">
                                        <Calendar className="h-4 w-4 text-muted-foreground" />
                                        <p className="font-medium">{new Date(staff.created_at).toLocaleString()}</p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Sidebar Actions */}
                <div className="space-y-6">
                    <Card className="border-l-4 border-l-blue-500">
                        <CardHeader>
                            <CardTitle>Actions</CardTitle>
                            <CardDescription>Review and make a decision</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {staff.status === 'pending' ? (
                                <>
                                    <Button onClick={() => setApproveDialogOpen(true)} className="w-full bg-green-600 hover:bg-green-700">
                                        <CheckCircle className="mr-2 h-4 w-4" /> Approve Application
                                    </Button>
                                    <Button onClick={() => setRejectDialogOpen(true)} variant="destructive" className="w-full">
                                        <XCircle className="mr-2 h-4 w-4" /> Reject Application
                                    </Button>
                                </>
                            ) : (
                                <div className="text-center p-4 bg-muted rounded-lg">
                                    <p className="text-muted-foreground">This application has already been processed.</p>
                                </div>
                            )}
                        </CardContent>
                        <CardFooter className="text-xs text-muted-foreground">
                            Processing this application will automatically update user roles and notify the staff member.
                        </CardFooter>
                    </Card>
                </div>
            </div>

            {/* Approve Dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Staff Member</DialogTitle>
                        <DialogDescription>Confirm role assignment for {staff.full_name}.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Role to Assign</Label>
                            <div className="p-3 bg-muted rounded-md border font-medium capitalize text-foreground">
                                {assignedRole}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Admin Notes</Label>
                            <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Internal notes..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleApproveConfirm} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">Confirm Approval</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Application</DialogTitle>
                        <DialogDescription>Please provide a reason for rejection.</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Rejection Reason *</Label>
                            <Textarea value={rejectionReason} onChange={(e) => setRejectionReason(e.target.value)} placeholder="Reason..." required />
                        </div>
                        <div className="space-y-2">
                            <Label>Admin Notes</Label>
                            <Textarea value={adminNotes} onChange={(e) => setAdminNotes(e.target.value)} placeholder="Internal notes..." />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleRejectConfirm} variant="destructive" disabled={actionLoading}>Confirm Rejection</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PendingStaffDetails;
