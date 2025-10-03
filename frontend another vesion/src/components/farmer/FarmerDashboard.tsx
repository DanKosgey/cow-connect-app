import React, { useState, useEffect, lazy, Suspense, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Milk, 
  DollarSign, 
  Calendar,
  TrendingUp,
  TrendingDown,
  CheckCircle,
  Clock,
  AlertCircle,
  RefreshCw
} from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useWebSocket } from '@/hooks/useWebSocket';
import { VisuallyHidden } from '@/components/ui/VisuallyHidden';
import { SkipLink } from '@/components/ui/SkipLink';
import SkeletonLoader from '@/components/ui/SkeletonLoader';
import { useQueryClient } from '@tanstack/react-query';
import { useCollections, usePayments, usePaymentProjections } from '@/hooks/queries';
import { Payment } from '@/types';
import apiService from '@/services/ApiService';
import { useAuth } from '@/contexts/AuthContext';

// Lazy load heavy chart components
const ResponsiveContainer = lazy(() => import('recharts').then(module => ({ default: module.ResponsiveContainer })));
const LineChart = lazy(() => import('recharts').then(module => ({ default: module.LineChart })));
const Line = lazy(() => import('recharts').then(module => ({ default: module.Line })));
const BarChart = lazy(() => import('recharts').then(module => ({ default: module.BarChart })));
const Bar = lazy(() => import('recharts').then(module => ({ default: module.Bar })));
const CartesianGrid = lazy(() => import('recharts').then(module => ({ default: module.CartesianGrid })));
const XAxis = lazy(() => import('recharts').then(module => ({ default: module.XAxis })));
const YAxis = lazy(() => import('recharts').then(module => ({ default: module.YAxis })));
const Tooltip = lazy(() => import('recharts').then(module => ({ default: module.Tooltip })));

// TypeScript interfaces
interface PaymentSummary {
  id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  dueDate: string;
}

interface Collection {
  id: string;
  volume: number;
  quality: string;
  timestamp: string;
  pricePerLiter: number;
}

interface ChartData {
  date: string;
  quality: number;
  volume: number;
}

const FarmerDashboard: React.FC<{ farmerId: string }> = ({ farmerId }) => {
  // TODO: Add dark mode support using context/theme provider
  // TODO: Implement user preferences saving to localStorage
  // TODO: Add performance monitoring hooks for dashboard metrics
  // TODO: Add real-time updates using WebSocket connections
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { session } = useAuth(); // Add this to get the session
  
  // Use React Query hooks for data fetching
  const { data: collectionsData, isLoading: collectionsLoading, error: collectionsError, refetch: refetchCollections } = useCollections(50, 0, farmerId);
  const { data: paymentsData, isLoading: paymentsLoading, error: paymentsError, refetch: refetchPayments } = usePayments(50, 0, farmerId);
  const { data: projectionsData, isLoading: projectionsLoading, error: projectionsError } = usePaymentProjections(farmerId);
  
  // WebSocket connection for real-time updates - FIXED AUTHENTICATION
  const getWsUrl = useCallback(() => {
    // Get the current session access token
    const accessToken = session?.access_token;
    
    if (!accessToken) {
      console.error('No access token available for WebSocket connection');
      return null;
    }
    
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const hostname = window.location.hostname;
    const port = window.location.port ? `:${window.location.port}` : '';
    
    // Include the token as a query parameter
    return `${protocol}//${hostname}${port}/api/v1/ws/notifications/${farmerId}?token=${encodeURIComponent(accessToken)}`;
  }, [session, farmerId]);

  const wsUrl = getWsUrl();
  const { ws: socket, isConnected } = useWebSocket(wsUrl);
  
  // Local state for real-time updates
  const [realTimeCollections, setRealTimeCollections] = useState<Collection[]>([]);
  const [realTimePayments, setRealTimePayments] = useState<PaymentSummary[]>([]);
  const [dashboardStats, setDashboardStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  
  // Fetch dashboard stats with growth percentages
  useEffect(() => {
    const fetchDashboardStats = async () => {
      try {
        setStatsLoading(true);
        const stats = await apiService.Analytics.getDashboardStats();
        setDashboardStats(stats);
      } catch (error) {
        console.error('Error fetching dashboard stats:', error);
        toast({
          title: "Error",
          description: "Failed to load dashboard statistics",
          variant: "destructive"
        });
      } finally {
        setStatsLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, [farmerId, toast]);
  
  // Handle WebSocket events
  useEffect(() => {
    if (!socket) return;
    
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        
        // Handle different event types
        if (data.type === 'collection_recorded') {
          const newCollection: Collection = {
            id: data.collection_id,
            volume: data.volume,
            quality: data.quality,
            timestamp: data.timestamp,
            pricePerLiter: data.price_per_liter || 0
          };
          
          setRealTimeCollections(prev => [newCollection, ...prev.slice(0, 4)]);
          
          toast({
            title: "New Collection Recorded",
            description: `Collection of ${data.volume}L with ${data.quality} quality recorded`,
          });
          
          // Invalidate collections query to refetch with new data
          queryClient.invalidateQueries({ queryKey: ['collections', 50, 0, farmerId] });
        } else if (data.type === 'payment_processed') {
          const updatedPayment: PaymentSummary = {
            id: data.payment_id,
            amount: data.amount,
            status: data.status,
            dueDate: data.date
          };
          
          setRealTimePayments(prev => 
            prev.map(p => p.id === data.payment_id ? updatedPayment : p)
          );
          
          toast({
            title: "Payment Status Updated",
            description: `Payment ${data.status} for KSh ${data.amount}`,
          });
          
          // Invalidate payments query to refetch with new data
          queryClient.invalidateQueries({ queryKey: ['payments', 50, 0, farmerId] });
        } else if (data.type === 'quality_alert') {
          toast({
            title: "Quality Alert",
            description: data.message,
            variant: data.severity === 'high' ? 'destructive' : 'default',
          });
        }
      } catch (e) {
        console.error('Error parsing WebSocket message:', e);
      }
    };
    
    // Attach event listener
    socket.addEventListener('message', handleMessage);
    
    return () => {
      // Remove event listener
      socket.removeEventListener('message', handleMessage);
    };
  }, [socket, toast, queryClient, farmerId]);
  
  // Combine real-time data with fetched data
  const combinedCollections = useMemo(() => {
    return realTimeCollections.length > 0 
      ? [...realTimeCollections, ...(collectionsData?.items || []).slice(realTimeCollections.length)]
      : collectionsData?.items || [];
  }, [realTimeCollections, collectionsData]);
    
  const combinedPayments = useMemo(() => {
    return realTimePayments.length > 0
      ? realTimePayments.map(rp => {
          const existing = (paymentsData || []).find(p => p.id === rp.id);
          return existing ? { ...existing, ...rp } : rp;
        })
      : paymentsData || [];
  }, [realTimePayments, paymentsData]);

  // Type guard functions
  const isPaymentSummary = (payment: any): payment is PaymentSummary => {
    return 'amount' in payment;
  };
  
  const isCollectionLocal = (collection: any): collection is Collection => {
    return 'volume' in collection;
  };
  
  // Helper functions to normalize data
  const getPaymentAmount = (payment: PaymentSummary | Payment): number => {
    return isPaymentSummary(payment) ? payment.amount : payment.total_amount;
  };
  
  const getCollectionVolume = (collection: Collection | any): number => {
    return isCollectionLocal(collection) ? collection.volume : collection.liters;
  };
  
  const getCollectionQuality = (collection: Collection | any): string => {
    return isCollectionLocal(collection) ? collection.quality : collection.quality_grade;
  };
  
  const getCollectionTimestamp = (collection: Collection | any): string => {
    return isCollectionLocal(collection) ? collection.timestamp : collection.timestamp || '';
  };
  
  const getCollectionPricePerLiter = (collection: Collection | any): number => {
    return isCollectionLocal(collection) ? collection.pricePerLiter : 50; // Default value
  };
  
  // Helper function to render growth percentage with appropriate icon and color
  const renderGrowthPercentage = (percentage: number | undefined) => {
    if (percentage === undefined) return <span className="text-gray-600">N/A</span>;
    
    if (percentage > 0) {
      return (
        <span className="text-emerald-600 flex items-center">
          <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
          <span>+{percentage}%</span>
        </span>
      );
    } else if (percentage < 0) {
      return (
        <span className="text-red-600 flex items-center">
          <TrendingDown className="h-3 w-3 mr-1" aria-hidden="true" />
          <span>{percentage}%</span>
        </span>
      );
    } else {
      return <span className="text-gray-600">0%</span>;
    }
  };
  
  // Calculate dashboard metrics
  const totalCollections = useMemo(() => {
    return combinedCollections.length;
  }, [combinedCollections]);
  
  const monthlyEarnings = useMemo(() => {
    return combinedPayments
      .filter(p => p.status === 'processed')
      .reduce((sum, p) => sum + getPaymentAmount(p), 0);
  }, [combinedPayments]);
    
  const averageQuality = useMemo(() => {
    return combinedCollections.length > 0
      ? combinedCollections.reduce((sum, c) => {
          const qualityValue = getCollectionQuality(c) === 'A' ? 5 : getCollectionQuality(c) === 'B' ? 4 : 3;
          return sum + qualityValue;
        }, 0) / combinedCollections.length
      : 0;
  }, [combinedCollections]);
    
  // Prepare chart data
  const qualityTrends = useMemo(() => {
    return combinedCollections.slice(0, 10).map(c => ({
      date: new Date(getCollectionTimestamp(c)).toISOString().split('T')[0],
      quality: getCollectionQuality(c) === 'A' ? 5 : getCollectionQuality(c) === 'B' ? 4 : 3,
      volume: getCollectionVolume(c)
    })).reverse();
  }, [combinedCollections]);

  const isLoading = collectionsLoading || paymentsLoading || projectionsLoading || statsLoading;
  const error = collectionsError || paymentsError || projectionsError;

  const refreshDashboard = useCallback(() => {
    refetchCollections();
    refetchPayments();
  }, [refetchCollections, refetchPayments]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          {/* Loading skeleton */}
          <div className="animate-pulse space-y-6">
            <div className="h-8 bg-gray-200 rounded w-1/3"></div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
              ))}
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="h-80 bg-gray-200 rounded-lg"></div>
              <div className="h-80 bg-gray-200 rounded-lg"></div>
            </div>
            <div className="h-64 bg-gray-200 rounded-lg"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-red-500" />
              Error Loading Dashboard
            </CardTitle>
            <CardDescription>
              {error.message || 'An error occurred while loading dashboard data'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={refreshDashboard} className="w-full">
              <RefreshCw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <SkipLink targetId="main-content">Skip to main content</SkipLink>
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <header className="flex justify-between items-center mb-6" role="banner">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
            <p className="text-gray-600">Track your collections, earnings, and payments</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge 
              variant={isConnected ? "default" : "destructive"}
              className="flex items-center gap-1"
            >
              {isConnected ? (
                <>
                  <CheckCircle className="h-3 w-3" aria-hidden="true" />
                  Live Updates
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" aria-hidden="true" />
                  Connecting...
                </>
              )}
            </Badge>
            <Button onClick={refreshDashboard} variant="outline" aria-label="Refresh dashboard">
              <RefreshCw className="h-4 w-4 mr-2" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </header>

        <main id="main-content" role="main">
          {/* Stats Cards */}
          <section aria-labelledby="stats-heading">
            <VisuallyHidden as="h2" id="stats-heading">Dashboard Statistics</VisuallyHidden>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
                  <Milk className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {totalCollections.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    {renderGrowthPercentage(dashboardStats?.collection_growth_percentage)}
                    {" "}from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Monthly Earnings</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    KSh {monthlyEarnings.toLocaleString() || 0}
                  </div>
                  <p className="text-xs text-muted-foreground flex items-center">
                    {renderGrowthPercentage(dashboardStats?.revenue_growth_percentage)}
                    {" "}from last month
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg. Quality</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {averageQuality.toFixed(1) || '0.0'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Grade {averageQuality ? 
                      averageQuality >= 4 ? 'A' : 
                      averageQuality >= 3 ? 'B' : 'C' : 'N/A'}
                  </p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Upcoming Payments</CardTitle>
                  <Calendar className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {combinedPayments.filter(p => p.status === 'pending').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    KSh {combinedPayments
                      .filter(p => p.status === 'pending')
                      .reduce((sum, p) => sum + ('amount' in p ? p.amount : p.total_amount), 0)
                      .toLocaleString()} pending
                  </p>
                </CardContent>
              </Card>
            </div>
          </section>

          {/* Charts */}
          <section aria-labelledby="charts-heading" className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            <VisuallyHidden as="h2" id="charts-heading">Performance Charts</VisuallyHidden>
            
            {/* Quality Trends Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Quality Trends</CardTitle>
                <CardDescription>
                  Historical quality scores for your collections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><SkeletonLoader type="chart" /></div>}>
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={qualityTrends || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={useCallback((value) => {
                            const date = new Date(value);
                            return `${date.getMonth()+1}/${date.getDate()}`;
                          }, [])}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={useCallback((value) => [value, 'Quality Score'], [])}
                          labelFormatter={useCallback((value) => `Date: ${value}`, [])}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="quality" 
                          stroke="#10b981" 
                          activeDot={{ r: 8 }} 
                          name="Quality Score"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </Suspense>
                </div>
              </CardContent>
            </Card>
            
            {/* Collection Volume Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Collection Volume</CardTitle>
                <CardDescription>
                  Daily collection volumes in liters
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <Suspense fallback={<div className="h-full flex items-center justify-center"><SkeletonLoader type="chart" /></div>}>
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={qualityTrends || []}
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={useCallback((value) => {
                            const date = new Date(value);
                            return `${date.getMonth()+1}/${date.getDate()}`;
                          }, [])}
                        />
                        <YAxis />
                        <Tooltip 
                          formatter={useCallback((value) => [value, 'Liters'], [])}
                          labelFormatter={useCallback((value) => `Date: ${value}`, [])}
                        />
                        <Bar 
                          dataKey="volume" 
                          fill="#0ea5e9" 
                          name="Volume (L)"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </Suspense>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Recent Collections and Upcoming Payments */}
          <section aria-labelledby="activity-heading" className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <VisuallyHidden as="h2" id="activity-heading">Activity</VisuallyHidden>
            
            {/* Recent Collections */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Collections</CardTitle>
                <CardDescription>
                  Your latest milk collections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {combinedCollections.slice(0, 5).map((collection) => (
                    <div key={collection.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{getCollectionVolume(collection)}L</p>
                        <p className="text-sm text-muted-foreground">
                          Grade {getCollectionQuality(collection)} • {new Date(getCollectionTimestamp(collection)).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">KSh {(getCollectionVolume(collection) * getCollectionPricePerLiter(collection)).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          {getCollectionPricePerLiter(collection)}/L
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
            {/* Upcoming Payments */}
            <Card>
              <CardHeader>
                <CardTitle>Upcoming Payments</CardTitle>
                <CardDescription>
                  Scheduled payments for your collections
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {combinedPayments.slice(0, 5).map((payment) => (
                    <div key={payment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">KSh {getPaymentAmount(payment).toLocaleString()}</p>
                        <p className="text-sm text-muted-foreground">
                          Due {new Date(isPaymentSummary(payment) ? payment.dueDate : payment.paid_at || '').toLocaleDateString()}
                        </p>
                      </div>
                      <Badge 
                        variant={payment.status === 'pending' ? 'default' : 'secondary'}
                        className={payment.status === 'processed' ? 'bg-green-100 text-green-800' : ''}
                      >
                        {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </section>
        </main>
      </div>
    </div>
  );
};

export default FarmerDashboard;