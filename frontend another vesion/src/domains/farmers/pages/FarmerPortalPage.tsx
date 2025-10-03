import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Link } from "react-router-dom";
import { 
  Milk, 
  DollarSign, 
  Calendar,
  TrendingUp,
  CheckCircle,
  Camera,
  MapPin,
  Clock,
  Bot,
  Wheat,
  Tractor,
  BarChart3,
  Download,
  AlertCircle,
  FileText,
  PieChart,
  TrendingDown
} from "lucide-react";
import FarmAI from "@/components/FarmAI";
import { logger } from '../lib/logger';
import { useEffect, useState, useCallback } from 'react';
import apiService from '@/services/ApiService';
import { useAuth } from '@/contexts/AuthContext';
import { useFarmerNotifications } from '@/hooks/useFarmerNotifications';
import { Collection, Payment } from '@/types';
import { useChartData } from '@/hooks/useChartData';
import { DisputeForm } from '@/components/DisputeForm';
import { QualityDashboard } from '@/components/QualityDashboard';
import { PaymentProjections } from '@/components/PaymentProjections';
import { TrendAnalysis } from '@/components/TrendAnalysis';

const FarmerPortal = () => {
  const { user } = useAuth();
  const [farmer, setFarmer] = useState<any>(null);
  const [farmerCollections, setFarmerCollections] = useState<Collection[]>([]);
  const [farmerPayments, setFarmerPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connected' | 'disconnected' | 'connecting'>('connecting');
  const [showDisputeForm, setShowDisputeForm] = useState(false);
  const [selectedCollectionForDispute, setSelectedCollectionForDispute] = useState<string | null>(null);

  // Use the farmer notifications hook
  const {
    collections: realtimeCollections,
    kycStatus: realtimeKycStatus,
    isConnected,
    isLoading: notificationsLoading,
    error: notificationsError
  } = useFarmerNotifications({
    farmerId: farmer?.id || '',
    onNewCollection: (collection) => {
      // Add new collection to the top of the list
      setFarmerCollections(prev => [collection, ...prev]);
      logger.info(`New collection received via WebSocket: ${collection.liters}L`);
    },
    onKycStatusUpdate: (updatedFarmer) => {
      // Update farmer KYC status
      setFarmer(prev => ({
        ...prev,
        kyc_status: updatedFarmer.kyc_status
      }));
      logger.info(`KYC status updated via WebSocket: ${updatedFarmer.kyc_status}`);
    },
    onConnectionChange: (connected) => {
      setConnectionStatus(connected ? 'connected' : 'disconnected');
    }
  });

  // Use chart data hook (without paymentProjection since we'll fetch it from API)
  const { dailyData, weeklyData, monthlyData, qualityData } = useChartData(farmerCollections, farmerPayments);
  const [paymentProjection, setPaymentProjection] = useState<any>(null);

  // Function to merge collections avoiding duplicates
  const mergeCollections = useCallback((existingCollections: Collection[], newCollections: Collection[]) => {
    const existingIds = new Set(existingCollections.map(c => c.id));
    const uniqueNewCollections = newCollections.filter(c => !existingIds.has(c.id));
    return [...uniqueNewCollections, ...existingCollections];
  }, []);

  useEffect(() => {
    logger.info('Farmer Portal page loaded');
    
    const fetchFarmerData = async () => {
      try {
        setLoading(true);
        // For now, we'll assume the logged-in user is associated with a farmer
        // In a real implementation, you'd have a proper mapping between users and farmers
        const farmers = await apiService.Farmers.list(100, 0);
        if (farmers.items.length > 0) {
          const firstFarmer = farmers.items[0];
          setFarmer(firstFarmer);
          
          // Fetch collections for this farmer
          const collections = await apiService.Collections.list(100, 0, firstFarmer.id);
          setFarmerCollections(collections.items);
          
          // Fetch payments for this farmer
          const payments = await apiService.Payments.list(100, 0, firstFarmer.id);
          setFarmerPayments(payments);
          
          // Fetch payment projections for this farmer
          try {
            const projections = await apiService.Payments.getProjections(firstFarmer.id);
            setPaymentProjection(projections);
          } catch (projectionError) {
            console.error('Error fetching payment projections:', projectionError);
            // Set default projections if API fails
            setPaymentProjection(null);
          }
        }
        logger.info('Farmer data fetched successfully');
      } catch (err) {
        logger.error('Error fetching farmer data', err);
        setError('Failed to load farmer data');
      } finally {
        setLoading(false);
      }
    };

    fetchFarmerData();

    return () => {
      logger.debug('Farmer Portal page unmounted');
    };
  }, []);

  // Update collections when we receive real-time updates
  useEffect(() => {
    if (realtimeCollections.length > 0) {
      // Merge real-time collections with existing ones, avoiding duplicates
      setFarmerCollections(prev => mergeCollections(prev, realtimeCollections));
    }
  }, [realtimeCollections, mergeCollections]);

  if (loading || notificationsLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-center">
          <p>Error loading farmer portal: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!farmer) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>No farmer data available</p>
      </div>
    );
  }

  // Filter today's collections
  const today = new Date().toDateString();
  const todaysCollections = farmerCollections.filter(
    collection => new Date(collection.timestamp).toDateString() === today
  );

  const recentCollections = farmerCollections.slice(0, 5);
  const totalLitersThisMonth = farmerCollections
    .filter(c => new Date(c.timestamp).getMonth() === new Date().getMonth())
    .reduce((sum, c) => sum + c.liters, 0);

  // Function to download collection receipt
  const downloadReceipt = async (collectionId: string) => {
    try {
      // Use the API service to download the receipt
      const blob = await apiService.Collections.downloadReceipt(collectionId);
      
      // Create a download link
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `collection-receipt-${collectionId}.pdf`;
      document.body.appendChild(a);
      a.click();
      
      // Clean up
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      logger.info(`Receipt downloaded for collection ${collectionId}`);
    } catch (error) {
      console.error('Error downloading receipt:', error);
      alert('Failed to download receipt. Please try again.');
    }
  };

  // Function to open dispute form
  const openDisputeForm = (collectionId: string) => {
    setSelectedCollectionForDispute(collectionId);
    setShowDisputeForm(true);
  };

  // Function to handle dispute submission
  const handleDisputeSubmitted = () => {
    setShowDisputeForm(false);
    setSelectedCollectionForDispute(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      {/* Header */}
      <header className="border-b border-green-200 bg-white/90 backdrop-blur-sm sticky top-0 z-50 shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <Milk className="h-7 w-7 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                  Farmer Dashboard
                </h1>
                <p className="text-green-600 flex items-center gap-1">
                  <Wheat className="h-3 w-3" />
                  Welcome back, {farmer.name}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-3">
              <Badge className={`${
                isConnected 
                  ? 'bg-green-100 text-green-700 border-green-200' 
                  : 'bg-red-100 text-red-700 border-red-200'
              }`}>
                {isConnected ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1" />
                    Live Updates
                  </>
                ) : (
                  <>
                    <Clock className="h-3 w-3 mr-1" />
                    Connecting...
                  </>
                )}
              </Badge>
              <Badge className="bg-green-100 text-green-700 border-green-200">
                <CheckCircle className="h-3 w-3 mr-1" />
                {realtimeKycStatus || farmer.kycStatus || 'pending'}
              </Badge>
              <Link to="/farmer/dashboard">
                <Button variant="outline" className="border-green-300 hover:bg-green-50 text-green-700">
                  New Dashboard
                </Button>
              </Link>
              <Link to="/">
                <Button variant="outline" className="border-green-300 hover:bg-green-50 text-green-700">
                  Back to Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="border-green-200 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-green-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">This Month</CardTitle>
              <Milk className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{totalLitersThisMonth}L</div>
              <p className="text-xs text-green-600">
                <span className="text-emerald-600">+12%</span> from last month
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-emerald-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-emerald-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">
                KSh {farmerPayments.reduce((sum, p) => sum + (p.total_amount || 0), 0).toLocaleString()}
              </div>
              <p className="text-xs text-green-600">
                <span className="text-emerald-600">+8%</span> growth rate
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-teal-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Average Quality</CardTitle>
              <TrendingUp className="h-4 w-4 text-teal-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">Grade A</div>
              <p className="text-xs text-green-600">
                <span className="text-emerald-600">Excellent</span> quality score
              </p>
            </CardContent>
          </Card>

          <Card className="border-green-200 hover:shadow-lg transition-shadow bg-gradient-to-br from-white to-blue-50/30">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Deliveries</CardTitle>
              <Calendar className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{farmerCollections.length}</div>
              <p className="text-xs text-green-600">Total collections</p>
            </CardContent>
          </Card>
        </div>

        {/* Today's Collections - NEW SECTION */}
        {todaysCollections.length > 0 && (
          <Card className="border-green-200 bg-white/70 backdrop-blur-sm mb-8">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center">
                <Milk className="h-5 w-5 mr-2 text-green-600" />
                Today's Collections
              </CardTitle>
              <CardDescription>
                {todaysCollections.length} collection{todaysCollections.length !== 1 ? 's' : ''} today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {todaysCollections.map((collection: Collection) => (
                  <div key={collection.id} className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50 hover:shadow-md transition-shadow">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <Milk className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{collection.liters}L delivered</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Clock className="h-3 w-3" />
                          <span>{new Date(collection.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                          <MapPin className="h-3 w-3 ml-2" />
                          <span>Collection Center</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-700 border-green-200">
                        Grade {collection.quality_grade}
                      </Badge>
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => downloadReceipt(collection.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Charts and Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Trend Analysis Chart */}
          <TrendAnalysis 
            dailyData={dailyData} 
            weeklyData={weeklyData} 
            monthlyData={monthlyData} 
          />

          {/* Quality Dashboard */}
          <QualityDashboard qualityData={qualityData} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Recent Collections */}
          <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center">
                <Tractor className="h-5 w-5 mr-2 text-green-600" />
                Recent Collections
              </CardTitle>
              <CardDescription>Your latest milk deliveries and quality grades</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCollections.map((collection: Collection) => (
                  <div key={collection.id} className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                        <Milk className="h-5 w-5 text-white" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{collection.liters}L delivered</p>
                        <div className="flex items-center space-x-2 text-sm text-gray-600">
                          <Calendar className="h-3 w-3" />
                          <span>{new Date(collection.timestamp).toLocaleDateString()}</span>
                          <MapPin className="h-3 w-3 ml-2" />
                          <span>Collection Center</span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className="bg-green-100 text-green-700 border-green-200 mb-1">
                        Grade {collection.quality_grade}
                      </Badge>
                      <div className="flex flex-col space-y-1">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-green-300 text-green-700 hover:bg-green-50"
                          onClick={() => downloadReceipt(collection.id)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="border-red-300 text-red-700 hover:bg-red-50"
                          onClick={() => openDisputeForm(collection.id)}
                        >
                          <AlertCircle className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              <Button variant="outline" className="w-full mt-4 border-green-300 text-green-700 hover:bg-green-50">
                View All Collections
              </Button>
            </CardContent>
          </Card>

          {/* Payment History and Projections */}
          <div className="space-y-8">
            {/* Payment Projections */}
            {paymentProjection && (
              <PaymentProjections projection={paymentProjection} />
            )}

            {/* Payment History */}
            <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-gray-900 flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-emerald-600" />
                  Payment History
                </CardTitle>
                <CardDescription>Track your earnings and payment status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {farmerPayments.slice(0, 4).map((payment: any) => (
                    <div key={payment.id} className="flex items-center justify-between p-4 border border-green-200 rounded-lg bg-gradient-to-r from-emerald-50 to-teal-50">
                      <div className="flex items-center space-x-3">
                        <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                          <DollarSign className="h-5 w-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">
                            KSh {payment.total_amount?.toLocaleString() || '0'}
                          </p>
                          <div className="flex items-center space-x-2 text-sm text-gray-600">
                            <Clock className="h-3 w-3" />
                            <span>{payment.paid_at ? new Date(payment.paid_at).toLocaleDateString() : 'Pending'}</span>
                            <span>•</span>
                            <span>{payment.total_liters}L @ KSh {payment.rate_per_liter}/L</span>
                          </div>
                        </div>
                      </div>
                      <Badge 
                        className={
                          (payment.status === 'paid' || payment.status === 'completed') 
                            ? "bg-green-100 text-green-700 border-green-200"
                            : "bg-yellow-100 text-yellow-700 border-yellow-200"
                        }
                      >
                        {payment.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4 border-green-300 text-green-700 hover:bg-green-50">
                  View Payment Details
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Performance Overview */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center">
                <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                Monthly Performance
              </CardTitle>
              <CardDescription>Track your progress and goals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700">Monthly Target</span>
                    <span className="text-gray-900 font-medium">{totalLitersThisMonth}L / 800L</span>
                  </div>
                  <Progress value={(totalLitersThisMonth / 800) * 100} className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700">Quality Score</span>
                    <span className="text-gray-900 font-medium">
                      {farmerCollections.length > 0 
                        ? (farmerCollections.reduce((sum, c) => sum + (c.quality_grade === 'A' ? 5 : c.quality_grade === 'B' ? 4 : 3), 0) / farmerCollections.length).toFixed(1)
                        : '0'}/5.0
                    </span>
                  </div>
                  <Progress value={
                    farmerCollections.length > 0 
                      ? (farmerCollections.reduce((sum, c) => sum + (c.quality_grade === 'A' ? 100 : c.quality_grade === 'B' ? 80 : 60), 0) / farmerCollections.length)
                      : 0
                  } className="h-3" />
                </div>
                <div>
                  <div className="flex justify-between text-sm mb-2">
                    <span className="text-gray-700">Consistency</span>
                    <span className="text-gray-900 font-medium">
                      {farmerCollections.length} days
                    </span>
                  </div>
                  <Progress value={farmerCollections.length > 0 ? Math.min(100, (farmerCollections.length / 30) * 100) : 0} className="h-3" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Farm Insights */}
          <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center">
                <TrendingUp className="h-5 w-5 mr-2 text-green-600" />
                Farm Insights
              </CardTitle>
              <CardDescription>AI-powered recommendations for your farm</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-green-600" />
                    <span className="font-medium text-green-800">Production Trending Up</span>
                  </div>
                  <p className="text-sm text-green-700">
                    Your milk production has increased by 12% this month. Keep up the excellent work!
                  </p>
                </div>
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <BarChart3 className="h-4 w-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Quality Excellence</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Consistent Grade A quality. Your feeding practices are showing great results.
                  </p>
                </div>
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg">
                  <div className="flex items-center space-x-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-emerald-600" />
                    <span className="font-medium text-emerald-800">Payment On Track</span>
                  </div>
                  <p className="text-sm text-emerald-700">
                    All payments processed on time. No outstanding balances.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Dispute Form Modal */}
        {showDisputeForm && selectedCollectionForDispute && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <Card className="w-full max-w-md max-h-[90vh] overflow-y-auto">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-red-600" />
                  Submit Dispute
                </CardTitle>
                <CardDescription>
                  Report an issue with your collection
                </CardDescription>
              </CardHeader>
              <CardContent>
                <DisputeForm 
                  collectionId={selectedCollectionForDispute}
                  farmerId={farmer.id}
                  onDisputeSubmitted={handleDisputeSubmitted}
                />
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={() => setShowDisputeForm(false)}
                >
                  Cancel
                </Button>
              </CardContent>
            </Card>
          </div>
        )}

        {/* AI Assistant */}
        <div className="mb-8">
          <div className="text-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
              <Bot className="h-6 w-6 text-green-600" />
              Your Personal Farm AI Assistant
            </h2>
            <p className="text-gray-600">Get personalized farming advice and insights powered by advanced AI</p>
          </div>
          <FarmAI />
        </div>
      </main>
    </div>
  );
};

export default FarmerPortal;