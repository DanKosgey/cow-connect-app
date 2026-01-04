import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle, XCircle, Search, RefreshCw, UserCheck, AlertTriangle, Eye } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const PendingStaffDashboard = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const { toast } = useToast();

    const [data, setData] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    // Action States
    const [selectedStaff, setSelectedStaff] = useState<any>(null);
    const [approveDialogOpen, setApproveDialogOpen] = useState(false);
    const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);

    // Form States
    const [assignedRole, setAssignedRole] = useState('staff');
    const [adminNotes, setAdminNotes] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');

    useEffect(() => {
        fetchPendingStaff();
    }, []);

    const fetchPendingStaff = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('pending_staff')
                .select(`
          *,
          staff_invitations (
             invited_by,
             suggested_role
          )
        `)
                .eq('status', 'pending')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setData(data || []);
        } catch (error: any) {
            console.error('Error fetching pending staff:', error);
            toast({
                title: 'Error',
                description: 'Failed to load pending staff applications',
                variant: 'destructive'
            });
        } finally {
            setLoading(false);
        }
    };

    const handleApproveClick = (staff: any) => {
        setSelectedStaff(staff);
        setAssignedRole(staff.requested_role || staff.staff_invitations?.suggested_role || 'staff');
        setAdminNotes('');
        setApproveDialogOpen(true);
    };

    const handleRejectClick = (staff: any) => {
        setSelectedStaff(staff);
        setRejectionReason('');
        setAdminNotes('');
        setRejectDialogOpen(true);
    };

    const handleApproveConfirm = async () => {
        if (!selectedStaff || !user) return;
        setActionLoading(true);

        try {
            const { data, error } = await supabase.rpc('approve_pending_staff', {
                p_pending_staff_id: selectedStaff.id,
                p_admin_id: user.id,
                p_assigned_role: assignedRole,
                p_admin_notes: adminNotes
            });

            if (error) throw error;

            const result = data as any;
            if (!result.success) throw new Error(result.message);

            toast({
                title: 'Approved',
                description: `Staff member approved as ${assignedRole}`,
            });

            setApproveDialogOpen(false);
            fetchPendingStaff(); // Refresh list
        } catch (error: any) {
            console.error('Error approving staff:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to approve staff',
                variant: 'destructive'
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleRejectConfirm = async () => {
        if (!selectedStaff || !user) return;

        if (!rejectionReason.trim()) {
            toast({
                title: 'Validation Error',
                description: 'Please provide a reason for rejection',
                variant: 'destructive'
            });
            return;
        }

        setActionLoading(true);

        try {
            const { data, error } = await supabase.rpc('reject_pending_staff', {
                p_pending_staff_id: selectedStaff.id,
                p_admin_id: user.id,
                p_rejection_reason: rejectionReason,
                p_admin_notes: adminNotes
            });

            if (error) throw error;

            const result = data as any;
            if (!result.success) throw new Error(result.message);

            toast({
                title: 'Rejected',
                description: 'Staff application rejected',
            });

            setRejectDialogOpen(false);
            fetchPendingStaff(); // Refresh list
        } catch (error: any) {
            console.error('Error rejecting staff:', error);
            toast({
                title: 'Error',
                description: error.message || 'Failed to reject staff',
                variant: 'destructive'
            });
        } finally {
            setActionLoading(false);
        }
    };

    const filteredData = data.filter(item =>
        item.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.national_id?.includes(searchQuery)
    );

    return (
        <div className="container mx-auto p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Pending Staff Approvals</h1>
                    <p className="text-muted-foreground mt-2">
                        Review and approve new staff invitations and applications.
                    </p>
                </div>
                <Button onClick={fetchPendingStaff} variant="outline" size="sm" className="gap-2">
                    <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <div className="relative flex-1 max-w-sm">
                            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search staff..."
                                className="pl-8"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center p-8">
                            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : filteredData.length === 0 ? (
                        <div className="text-center py-12 text-muted-foreground">
                            <UserCheck className="mx-auto h-12 w-12 opacity-50 mb-3" />
                            <p className="text-lg font-medium">No pending staff applications</p>
                            <p className="text-sm">New registrations via invitation links will appear here.</p>
                        </div>
                    ) : (
                        <div className="rounded-md border">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Date</TableHead>
                                        <TableHead>Name / Email</TableHead>
                                        <TableHead>Contact Info</TableHead>
                                        <TableHead>Requested Role</TableHead>
                                        <TableHead>Status</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredData.map((staff) => (
                                        <TableRow key={staff.id}>
                                            <TableCell>{new Date(staff.created_at).toLocaleDateString()}</TableCell>
                                            <TableCell>
                                                <div className="font-medium">{staff.full_name}</div>
                                                <div className="text-sm text-muted-foreground">{staff.email}</div>
                                            </TableCell>
                                            <TableCell>
                                                <div className="text-sm">{staff.phone_number}</div>
                                                <div className="text-xs text-muted-foreground">ID: {staff.national_id}</div>
                                            </TableCell>
                                            <TableCell>
                                                <Badge variant="outline" className="capitalize">
                                                    {staff.requested_role || 'Staff'}
                                                </Badge>
                                            </TableCell>
                                            <TableCell>
                                                <Badge className="bg-yellow-500 hover:bg-yellow-600">
                                                    {staff.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-2">
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                        onClick={() => navigate(`/admin/staff/pending/${staff.id}`)}
                                                    >
                                                        <Eye className="h-4 w-4 lg:mr-2" />
                                                        <span className="hidden lg:inline">View</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                                                        onClick={() => handleApproveClick(staff)}
                                                    >
                                                        <CheckCircle className="h-4 w-4 lg:mr-2" />
                                                        <span className="hidden lg:inline">Approve</span>
                                                    </Button>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                                        onClick={() => handleRejectClick(staff)}
                                                    >
                                                        <XCircle className="h-4 w-4 lg:mr-2" />
                                                        <span className="hidden lg:inline">Reject</span>
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

            {/* Approve Dialog */}
            <Dialog open={approveDialogOpen} onOpenChange={setApproveDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Approve Staff Member</DialogTitle>
                        <DialogDescription>
                            Confirm role assignment for {selectedStaff?.full_name}. This will grant them access to the dashboard.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Role to Assign</Label>
                            <div className="p-3 bg-muted rounded-md border font-medium capitalize text-foreground">
                                {assignedRole}
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Admin Notes (Optional)</Label>
                            <Textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Any internal notes about this approval..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setApproveDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleApproveConfirm} disabled={actionLoading} className="bg-green-600 hover:bg-green-700">
                            {actionLoading ? 'Approving...' : 'Confirm Approval'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Reject Dialog */}
            <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Reject Application</DialogTitle>
                        <DialogDescription>
                            Please provide a reason for rejecting {selectedStaff?.full_name}'s application.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label>Rejection Reason *</Label>
                            <Textarea
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                placeholder="Why is this application being rejected?"
                                className="min-h-[100px]"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Admin Notes (Optional)</Label>
                            <Textarea
                                value={adminNotes}
                                onChange={(e) => setAdminNotes(e.target.value)}
                                placeholder="Internal notes..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setRejectDialogOpen(false)}>Cancel</Button>
                        <Button onClick={handleRejectConfirm} variant="destructive" disabled={actionLoading}>
                            {actionLoading ? 'Rejecting...' : 'Confirm Rejection'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default PendingStaffDashboard;
