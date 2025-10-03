import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Milk, DollarSign, TrendingUp, Award } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { format } from 'date-fns';

interface FarmerData {
  kyc_status: string;
  national_id: string;
  address: string;
}

interface Analytics {
  total_collections: number;
  total_liters: number;
  current_month_liters: number;
  current_month_earnings: number;
  avg_quality_score: number;
}

interface Collection {
  id: string;
  collection_date: string;
  liters: number;
  quality_grade: string;
  rate_per_liter: number;
  validation_code: string;
}

const FarmerDashboard = () => {
  const { user } = useAuth();
  const toast = useToastNotifications();
  const [farmerData, setFarmerData] = useState<FarmerData | null>(null);
  const [analytics, setAnalytics] = useState<Analytics | null>(null);
  const [recentCollections, setRecentCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFarmerData();
  }, [user]);

  const fetchFarmerData = async () => {
    if (!user) return;

    try {
      // Get farmer profile
      const { data: farmer, error: farmerError } = await supabase
        .from('farmers')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (farmerError) throw farmerError;
      setFarmerData(farmer);

      // Get analytics
      const { data: analyticsData, error: analyticsError } = await supabase
        .from('farmer_analytics')
        .select('*')
        .eq('farmer_id', farmer.id)
        .single();

      if (!analyticsError && analyticsData) {
        setAnalytics(analyticsData);
      }

      // Get recent collections
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select('*')
        .eq('farmer_id', farmer.id)
        .order('collection_date', { ascending: false })
        .limit(10);

      if (!collectionsError && collections) {
        setRecentCollections(collections);
      }
    } catch (error: any) {
      toast.error('Error', error.message);
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
          <h1 className="text-4xl font-bold">Welcome Back, Farmer!</h1>
          <p className="text-muted-foreground mt-2">
            Here's your milk collection overview
          </p>
        </div>

        {/* KYC Status Alert */}
        {farmerData?.kyc_status === 'pending' && (
          <Card className="border-yellow-500 bg-yellow-50 dark:bg-yellow-950">
            <CardContent className="pt-6">
              <p className="font-medium">
                Your KYC verification is pending. Please wait for admin approval.
              </p>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">This Month</CardTitle>
              <Milk className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.current_month_liters?.toFixed(1) || '0'} L
              </div>
              <p className="text-xs text-muted-foreground">
                Total milk collected
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                ₹{analytics?.current_month_earnings?.toFixed(2) || '0'}
              </div>
              <p className="text-xs text-muted-foreground">
                This month's earnings
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.total_collections || 0}
              </div>
              <p className="text-xs text-muted-foreground">
                All time collections
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Quality Score</CardTitle>
              <Award className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {analytics?.avg_quality_score?.toFixed(1) || 'N/A'}
              </div>
              <p className="text-xs text-muted-foreground">
                Average quality rating
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Recent Collections */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Collections</CardTitle>
          </CardHeader>
          <CardContent>
            {recentCollections.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">
                No collections yet. Wait for staff to record your first collection.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Quantity</TableHead>
                    <TableHead>Quality</TableHead>
                    <TableHead>Rate</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Validation Code</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentCollections.map((collection) => (
                    <TableRow key={collection.id}>
                      <TableCell>
                        {format(new Date(collection.collection_date), 'MMM dd, yyyy HH:mm')}
                      </TableCell>
                      <TableCell className="font-medium">
                        {collection.liters} L
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {collection.quality_grade || 'N/A'}
                        </Badge>
                      </TableCell>
                      <TableCell>₹{collection.rate_per_liter}</TableCell>
                      <TableCell className="font-medium">
                        ₹{((collection.liters || 0) * (collection.rate_per_liter || 0)).toFixed(2)}
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

export default FarmerDashboard;
