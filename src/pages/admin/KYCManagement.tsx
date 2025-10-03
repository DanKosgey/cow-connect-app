import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '@/components/DashboardLayout';
import { PageHeader } from '@/components/admin/PageHeader';
import { DataCard } from '@/components/admin/DataCard';
import { DataTable } from '@/components/admin/DataTable';
import { LoadingState } from '@/components/admin/LoadingState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import useToastNotifications from '@/hooks/useToastNotifications';
import { supabase } from '@/integrations/supabase/client';
import { useRealtimeKYC } from '@/hooks/use-realtime';
import { exportToExcel } from '@/lib/export';
import { Users, FileCheck, FileX, Download } from 'lucide-react';
import { ColumnDef } from '@tanstack/react-table';

import { Database } from '@/types/database.types';

type KYCApplication = Database['public']['Tables']['farmers']['Row'];
type KYCAnalytics = Database['public']['Views']['admin_kyc_analytics']['Row'];

const KYCManagement = () => {
  const navigate = useNavigate();
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [applications, setApplications] = useState<KYCApplication[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    avgProcessingHours: 0,
  });
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const pendingCount = useRealtimeKYC();
  const columns: ColumnDef<KYCApplication>[] = [
    {
      accessorKey: 'registration_number',
      header: 'Registration No.',
    },
    {
      accessorKey: 'full_name',
      header: 'Farmer Name',
    },
    {
      accessorKey: 'phone_number',
      header: 'Phone',
    },
  {
    accessorKey: 'kyc_status',
      header: 'Status',
      cell: ({ row }) => {
        const status = row.getValue('kyc_status') as string;
        return (
          <Badge variant={
            status === 'approved' ? 'secondary' :
            status === 'rejected' ? 'destructive' :
            'default'
          }>
            {status}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Submitted Date',
      cell: ({ row }) => {
        return new Date(row.getValue('created_at')).toLocaleDateString();
      },
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const application = row.original;
        return (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleApprove(application.farmer_id)}
              disabled={application.kyc_status !== 'pending'}
            >
              <FileCheck className="w-4 h-4 mr-1" />
              Approve
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectedIds([application.farmer_id]);
                setDialogOpen(true);
              }}
              disabled={application.kyc_status !== 'pending'}
            >
              <FileX className="w-4 h-4 mr-1" />
              Reject
            </Button>
          </div>
        );
      },
    },
  ];

  const fetchData = async () => {
    try {
      // Fetch applications
      const { data: applicationsData, error: applicationsError } = await supabase
        .from('farmers')
        .select(`
          id,
          registration_number,
          full_name,
          phone_number,
          kyc_status,
          kyc_documents,
          kyc_rejection_reason,
          created_at,
          updated_at
        `)
        .order('created_at', { ascending: false });

      if (applicationsError) throw applicationsError;

      // Fetch KYC analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('admin_kyc_analytics')
        .select(`
          total_applications,
          pending_count,
          approved_count,
          rejected_count,
          avg_processing_hours
        `)
        .limit(1)
        .single();

      if (analyticsError) throw analyticsError;

      setApplications(applicationsData as KYCApplication[]);
      setStats({
        total: analyticsData.total_applications,
        pending: analyticsData.pending_count,
        approved: analyticsData.approved_count,
        rejected: analyticsData.rejected_count,
        avgProcessingHours: analyticsData.avg_processing_hours,
      });
    } catch (err: any) {
      setError(err);
      toast.error('Error', err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) throw new Error('User not authenticated');

      const { error } = await supabase.rpc('approve_kyc', {
        farmer_id: id,
        admin_id: user.data.user.id,
      });

      if (error) throw error;

      toast.success('Success', 'KYC application approved successfully');

      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  const handleReject = async () => {
    try {
      const user = await supabase.auth.getUser();
      if (!user.data.user?.id) throw new Error('User not authenticated');

      for (const farmerId of selectedIds) {
        const { error } = await supabase.rpc('reject_kyc', {
          farmer_id: farmerId,
          reason: rejectionReason,
          admin_id: user.data.user.id,
        });

        if (error) throw error;
      }

      toast.success('Success', 'KYC application(s) rejected successfully');

      setDialogOpen(false);
      setRejectionReason('');
      setSelectedIds([]);
      fetchData();
    } catch (err: any) {
      toast.error('Error', err.message);
    }
  };

  const handleExport = () => {
    const exportData = applications.map(app => ({
      'Registration Number': app.registration_number,
      'Farmer Name': app.full_name,
      'Phone Number': app.phone_number,
      'Status': app.kyc_status,
      'Submission Date': new Date(app.created_at).toLocaleDateString(),
      'Rejection Reason': app.kyc_rejection_reason || '',
    }));

    exportToExcel(exportData, {
      fileName: 'kyc-applications',
      sheetName: 'KYC Applications',
    });
  };

  return (
    <DashboardLayout>
      <LoadingState isLoading={loading} error={error}>
        <div className="p-8 space-y-8">
          <PageHeader
            title="KYC Management"
            subtitle="Review and manage farmer KYC applications"
            actions={
              <Button onClick={handleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            }
          />

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-4">
            <DataCard
              title="Total Applications"
              value={stats.total}
              icon={<Users className="w-4 h-4" />}
            />
            <DataCard
              title="Pending Review"
              value={stats.pending}
              icon={<FileCheck className="w-4 h-4" />}
              className="bg-yellow-50"
            />
            <DataCard
              title="Approved"
              value={stats.approved}
              icon={<FileCheck className="w-4 h-4" />}
              className="bg-green-50"
            />
            <DataCard
              title="Rejected"
              value={stats.rejected}
              icon={<FileX className="w-4 h-4" />}
              className="bg-red-50"
            />
          </div>

          {/* Applications Table */}
          <DataTable
            columns={columns}
            data={applications}
            searchKey="full_name"
            searchPlaceholder="Search by farmer name..."
          />

          {/* Rejection Dialog */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Reject KYC Application</DialogTitle>
                <DialogDescription>
                  Please provide a reason for rejecting the KYC application(s).
                </DialogDescription>
              </DialogHeader>
              <Input
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                placeholder="Enter rejection reason"
              />
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleReject}
                  disabled={!rejectionReason}
                >
                  Reject
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </LoadingState>
    </DashboardLayout>
  );
};

export default KYCManagement;