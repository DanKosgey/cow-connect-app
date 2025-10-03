import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Milk, Users, TrendingUp, Plus } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useNavigate } from 'react-router-dom';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface TodayStats {
  total_collections: number;
  total_liters: number;
  farmers_visited: number;
}

interface RecentCollection {
  id: string;
  collection_date: string;
  liters: number;
  validation_code: string;
  farmers: {
    national_id: string;
  };
  profiles: {
    full_name: string;
  };
}

const StaffDashboard = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const navigate = useNavigate();
  const [todayStats, setTodayStats] = useState<TodayStats>({
    total_collections: 0,
    total_liters: 0,
    farmers_visited: 0,
  });
  const [recentCollections, setRecentCollections] = useState<RecentCollection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStaffData();
  }, [user]);

  const fetchStaffData = async () => {
    if (!user) return;

    try {
      // Get staff record
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (staffError) throw staffError;

      // Get today's collections
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          *,
          farmers (
            national_id,
            user_id
          )
        `)
        .eq('staff_id', staff.id)
        .gte('collection_date', today.toISOString())
        .order('collection_date', { ascending: false });

      if (collectionsError) throw collectionsError;

      // Calculate today's stats
      const stats = {
        total_collections: collections?.length || 0,
        total_liters: collections?.reduce((sum, c) => sum + (Number(c.liters) || 0), 0) || 0,
        farmers_visited: new Set(collections?.map(c => c.farmer_id)).size || 0,
      };
      setTodayStats(stats);

      // Fetch profile data for collections
      if (collections && collections.length > 0) {
        const userIds = collections
          .map(c => c.farmers?.user_id)
          .filter(Boolean);

        const { data: profiles } = await supabase
          .from('profiles')
          .select('id, full_name')
          .in('id', userIds);

        const collectionsWithProfiles = collections.map(c => ({
          ...c,
          profiles: profiles?.find(p => p.id === c.farmers?.user_id) || { full_name: 'Unknown' }
        }));

        setRecentCollections(collectionsWithProfiles as any);
      }
    } catch (error: any) {
      showError('Error', String(error?.message || 'An error occurred'));
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
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Staff Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Today's collection activity
            </p>
          </div>
          <Button
            onClick={() => navigate('/staff/new-collection')}
            size="lg"
            className="gap-2"
          >
            <Plus className="h-5 w-5" />
            New Collection
          </Button>
        </div>

        {/* Today's Stats */}
        <div className="grid gap-6 md:grid-cols-3">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
              <Milk className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.total_collections}</div>
              <p className="text-xs text-muted-foreground">
                Total collections recorded
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Liters</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {todayStats.total_liters.toFixed(1)} L
              </div>
              <p className="text-xs text-muted-foreground">
                Milk collected today
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Farmers Visited</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.farmers_visited}</div>
              <p className="text-xs text-muted-foreground">
                Unique farmers today
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Collections */}
        <Card>
          <CardHeader>
            <CardTitle>Today's Collections</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCollections.length === 0 ? (
              <div className="text-center py-12">
                <Milk className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">
                  No collections recorded yet today. Start by recording your first collection!
                </p>
                <Button
                  onClick={() => navigate('/staff/new-collection')}
                  className="mt-4"
                >
                  Record Collection
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Farmer</TableHead>
                    <TableHead>Farmer ID</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Validation Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCollections.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell>
                        {format(new Date(collection.collection_date), 'HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {collection.profiles?.full_name || 'Unknown'}
                      </TableCell>
                      <TableCell className="font-mono text-sm">
                        {collection.farmers?.national_id}
                      </TableCell>
                      <TableCell className="font-medium">
                        {collection.liters} L
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {collection.validation_code}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
};

export default StaffDashboard;
