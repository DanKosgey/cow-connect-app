import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Milk, DollarSign, UserCog, AlertCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';

interface SystemStats {
  total_farmers: number;
  total_staff: number;
  today_collection: number;
  monthly_collection: number;
  pending_kyc: number;
}

interface PendingKYC {
  id: string;
  national_id: string;
  created_at: string;
  user_id: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

const AdminDashboard = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [stats, setStats] = useState<SystemStats>({
    total_farmers: 0,
    total_staff: 0,
    today_collection: 0,
    monthly_collection: 0,
    pending_kyc: 0,
  });
  const [pendingKYCs, setPendingKYCs] = useState<PendingKYC[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Get total farmers
      const { count: farmersCount } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true });

      // Get total staff
      const { count: staffCount } = await supabase
        .from('staff')
        .select('*', { count: 'exact', head: true });

      // Get today's collection
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const { data: todayCollections } = await supabase
        .from('collections')
        .select('liters')
        .gte('collection_date', today.toISOString());

      const todayTotal = todayCollections?.reduce((sum, c) => sum + Number(c.liters || 0), 0) || 0;

      // Get monthly collection
      const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      
      const { data: monthlyCollections } = await supabase
        .from('collections')
        .select('liters')
        .gte('collection_date', firstDayOfMonth.toISOString());

      const monthlyTotal = monthlyCollections?.reduce((sum, c) => sum + Number(c.liters || 0), 0) || 0;

      // Get pending KYC
      const { data: pendingKYC, count: pendingCount } = await supabase
        .from('farmers')
        .select('*, profiles!inner(full_name, phone)', { count: 'exact' })
        .eq('kyc_status', 'pending')
        .order('created_at', { ascending: false })
        .limit(5);

      setStats({
        total_farmers: farmersCount || 0,
        total_staff: staffCount || 0,
        today_collection: todayTotal,
        monthly_collection: monthlyTotal,
        pending_kyc: pendingCount || 0,
      });

      setPendingKYCs((pendingKYC as any) || []);
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-full">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-4xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            System overview and management
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Farmers</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_farmers}</div>
              <p className="text-xs text-muted-foreground">Registered farmers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Staff</CardTitle>
              <UserCog className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_staff}</div>
              <p className="text-xs text-muted-foreground">Collection agents</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Collection</CardTitle>
              <Milk className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.today_collection.toFixed(1)} L</div>
              <p className="text-xs text-muted-foreground">Collected today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Monthly Total</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.monthly_collection.toFixed(1)} L</div>
              <p className="text-xs text-muted-foreground">This month</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending KYC</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.pending_kyc}</div>
              <p className="text-xs text-muted-foreground">Awaiting approval</p>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/admin/farmers')}
              >
                <Users className="h-4 w-4 mr-2" />
                Manage Farmers
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/admin/staff')}
              >
                <UserCog className="h-4 w-4 mr-2" />
                Manage Staff
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/admin/kyc')}
              >
                <AlertCircle className="h-4 w-4 mr-2" />
                Review KYC Applications
              </Button>
              <Button 
                className="w-full justify-start" 
                variant="outline"
                onClick={() => navigate('/admin/analytics')}
              >
                <Milk className="h-4 w-4 mr-2" />
                View Analytics
              </Button>
            </CardContent>
          </Card>

          {/* Pending KYC Approvals */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Pending KYC Approvals</CardTitle>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => navigate('/admin/kyc')}
                >
                  View All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {pendingKYCs.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No pending KYC approvals
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Farmer</TableHead>
                      <TableHead>National ID</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {pendingKYCs.map((farmer) => (
                      <TableRow key={farmer.id}>
                        <TableCell className="font-medium">
                          {farmer.profiles?.full_name || 'Unknown'}
                        </TableCell>
                        <TableCell className="font-mono text-sm">
                          {farmer.national_id}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">Pending</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default AdminDashboard;
