import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { AdminSidebar } from "@/components/AdminSidebar";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { 
  Users, 
  User,
  Milk, 
  DollarSign, 
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Clock,
  CheckCircle,
  XCircle,
  Wheat,
  Tractor,
  Leaf,
  BarChart3,
  Home,
  Bot,
  ArrowRight,
  Plus
} from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { logger } from '../lib/logger';
import { useEffect, useState } from 'react';
import apiService from '@/services/ApiService';
import { AddFarmerDialog } from '@/components/admin/AddFarmerDialog';
import { useAuth } from '@/contexts/AuthContext';
import { useToastContext } from '@/components/ToastWrapper';
import { AdminDashboardData } from '@/types/adminDashboard';

const AdminDashboard = () => {
  // TODO: Add dark mode support using context/theme provider
  // TODO: Implement user preferences saving to localStorage
  // TODO: Add performance monitoring hooks for dashboard metrics
  // TODO: Ensure consistent styling across all portals
  // TODO: Implement proper responsive design for all screen sizes
  // TODO: Add proper accessibility attributes (aria-label, role, etc.)
  // TODO: Ensure proper color contrast ratios for all UI elements
  // TODO: Add real-time updates using WebSocket connections
  // TODO: Implement dashboard layout persistence
  // TODO: Add customizable dashboard widgets
  // TODO: Implement dashboard filtering by date range
  const { isAuthenticated, user, loading: authLoading, userRole } = useAuth();
  const toast = useToastContext();
  const [stats, setStats] = useState<AdminDashboardData | null>(null);
  const [recentCollections, setRecentCollections] = useState<any[]>([]);
  const [pendingKYC, setPendingKYC] = useState<any[]>([]);
  const [pendingPayments, setPendingPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddFarmerDialog, setShowAddFarmerDialog] = useState(false);
  const [dataFetchAttempted, setDataFetchAttempted] = useState(false);

  // Check if user has the correct role
  const hasCorrectRole = userRole === 'admin';

  const fetchData = async () => {
    // TODO: Implement caching mechanism for dashboard data
    // TODO: Add error retry mechanism for failed API calls
    // TODO: Add loading state management for individual components
    // TODO: Implement pagination for large data sets
    // TODO: Add offline support with data synchronization
    // TODO: Implement request cancellation for obsolete requests
    // TODO: Add performance monitoring for API calls
    // TODO: Implement proper error logging
    try {
      setLoading(true);
      
      // Log user info for debugging
      console.log('Current user:', user);
      
      // Fetch dashboard stats with default parameters
      const dashboardStats = await apiService.Analytics.getAdminDashboard('30days', 'all');
      setStats(dashboardStats);
      
      // Fetch collections
      const collectionsResponse = await apiService.Collections.list(100, 0);
      console.log('Collections response:', collectionsResponse);
      setRecentCollections(collectionsResponse.items.slice(0, 5));
      
      // Fetch farmers for KYC
      const farmersResponse = await apiService.Farmers.list(100, 0);
      setPendingKYC(farmersResponse.items.filter((f: any) => f.kycStatus === 'pending'));
      
      // Fetch payments
      // Note: There's no direct API for payments in the current backend
      // We'll need to implement this or use a placeholder
      setPendingPayments([]);
      
      // Show success toast if this is a refresh
      if (stats) {
        toast.showSuccess('Data Refreshed', 'Dashboard data has been updated successfully');
      }
      
      logger.info('Dashboard data fetched successfully');
    } catch (err: any) {
      logger.error('Error fetching dashboard data', err);
      console.error('Full error details:', err);
      toast.showError('Data Load Failed', 'Failed to load dashboard data. Please try again later.');
      setError('Failed to load dashboard data');
    } finally {
      setLoading(false);
      setDataFetchAttempted(true);
    }
  };

  useEffect(() => {
    logger.info('Admin Dashboard page loaded');
    console.log('AdminDashboard: Auth state - authLoading:', authLoading, 'isAuthenticated:', isAuthenticated, 'user:', user);
    
    // Redirect if user doesn't have the correct role
    if (isAuthenticated && !hasCorrectRole) {
      toast.showError('Access Denied', 'You do not have permission to access the admin dashboard.');
      window.location.href = '/';
      return;
    }
    
    // Wait for authentication context to finish loading
    if (authLoading) {
      console.log('AdminDashboard: Waiting for auth context to finish loading');
      return;
    }
    
    // Only fetch data if user is authenticated
    if (isAuthenticated && user && !dataFetchAttempted) {
      console.log('AdminDashboard: User is authenticated, fetching data');
      fetchData();
    } else if (!isAuthenticated && !authLoading) {
      console.log('AdminDashboard: User is not authenticated, redirecting to login');
      // Don't show error toast for unauthenticated users, just redirect
      // Use a small delay to prevent rapid redirects
      setTimeout(() => {
        setError('You must be logged in to view this page');
        setLoading(false);
      }, 100);
    }

    return () => {
      logger.debug('Admin Dashboard page unmounted');
    };
  }, [isAuthenticated, user, authLoading, dataFetchAttempted, hasCorrectRole, toast]);

  // Add performance monitoring
  logger.time('Dashboard Render');
  logger.timeEnd('Dashboard Render');

  if (loading || authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Redirect unauthenticated users to login
  if (!isAuthenticated) {
    // Add a small delay to prevent rapid redirects
    setTimeout(() => {
      window.location.href = '/admin/login';
    }, 100);
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600"></div>
      </div>
    );
  }

  // Redirect users with incorrect role
  if (!hasCorrectRole) {
    return <Navigate to="/" replace />;
  }

  if (error && isAuthenticated) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-center">
          <p>Error loading dashboard: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>No data available</p>
      </div>
    );
  }

  // Helper function to render growth percentage with appropriate icon and color
  const renderGrowthPercentage = (percentage: number) => {
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

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
        <AdminSidebar />
        
        <SidebarInset className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="bg-white/90 backdrop-blur-sm border-b border-green-200 px-6 py-4 shadow-sm" role="banner">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold bg-gradient-to-r from-green-700 to-emerald-700 bg-clip-text text-transparent">
                  Farm Operations Dashboard
                </h1>
                {/* TODO: Make dashboard title customizable based on user preferences */}
                <p className="text-green-600 flex items-center gap-1 mt-1">
                  <Wheat className="h-4 w-4" aria-hidden="true" />
                  Comprehensive dairy farm management & analytics
                </p>
              </div>
              <div className="flex items-center space-x-3">
                <Badge className="bg-green-100 text-green-700 border-green-200 px-3 py-1">
                  <CheckCircle className="h-3 w-3 mr-1" aria-hidden="true" />
                  System Operational
                </Badge>
                <Link to="/">
                  <Button variant="outline" className="border-green-300 hover:bg-green-50 text-green-700" aria-label="Go to Home">
                    <Home className="h-4 w-4 mr-2" aria-hidden="true" />
                    Home
                  </Button>
                </Link>
              </div>
            </div>
          </header>

          {/* Main Content */}
          <main id="main-content" className="flex-1 overflow-auto p-6" role="main">
            {/* Key Metrics */}
            {/* TODO: Add customizable widgets - allow users to select which metrics to display */}
            {/* TODO: Implement real-time updates using WebSocket connections */}
            {/* TODO: Add export functionality for metrics data */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
              <Card className="border-green-200 hover:shadow-xl transition-all bg-gradient-to-br from-white to-green-50/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Registered Farmers</CardTitle>
                  <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-emerald-500 rounded-lg flex items-center justify-center">
                    <Users className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.farmer_stats.total}</div>
                  <p className="text-xs text-green-600 flex items-center">
                    {renderGrowthPercentage(stats.farmer_stats.growth_percentage)}
                    {" "}from last month
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-200 hover:shadow-xl transition-all bg-gradient-to-br from-white to-emerald-50/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Daily Collection</CardTitle>
                  <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-lg flex items-center justify-center">
                    <Milk className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">{stats.collection_stats.today}</div>
                  <p className="text-xs text-green-600 flex items-center">
                    {renderGrowthPercentage(stats.collection_stats.today_growth_percentage)}
                    {" "}from yesterday
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-200 hover:shadow-xl transition-all bg-gradient-to-br from-white to-teal-50/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Monthly Revenue</CardTitle>
                  <div className="w-8 h-8 bg-gradient-to-br from-teal-500 to-cyan-500 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    KSh {stats.payment_stats.total_revenue.toLocaleString()}
                  </div>
                  <p className="text-xs text-green-600 flex items-center">
                    {renderGrowthPercentage(stats.collection_stats.month_growth_percentage)}
                    {" "}growth
                  </p>
                </CardContent>
              </Card>

              <Card className="border-green-200 hover:shadow-xl transition-all bg-gradient-to-br from-white to-orange-50/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Pending Verification</CardTitle>
                  <div className="w-8 h-8 bg-gradient-to-br from-orange-500 to-amber-500 rounded-lg flex items-center justify-center">
                    <AlertTriangle className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">
                    {stats.quality_metrics.grade_distribution ? 
                      stats.quality_metrics.grade_distribution.A + stats.quality_metrics.grade_distribution.B + stats.quality_metrics.grade_distribution.C : 0}
                  </div>
                  <p className="text-xs text-orange-600">
                    Requires immediate attention
                  </p>
                </CardContent>
              </Card>
              
              <Card className="border-green-200 hover:shadow-xl transition-all bg-gradient-to-br from-white to-blue-50/30">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Active Staff</CardTitle>
                  <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center">
                    <User className="h-4 w-4 text-white" aria-hidden="true" />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-gray-900">2</div>
                  <p className="text-xs text-green-600 flex items-center">
                    <TrendingUp className="h-3 w-3 mr-1" aria-hidden="true" />
                    <span className="text-emerald-600">+2</span> from last month
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Row */}
            {/* TODO: Add interactive charts with drill-down capabilities */}
            {/* TODO: Implement data comparison with previous periods */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
              <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Tractor className="h-5 w-5 mr-2 text-green-600" aria-hidden="true" />
                    Farm Performance Metrics
                  </CardTitle>
                  <CardDescription>
                    Weekly production targets and quality achievements
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 flex items-center">
                          <Milk className="h-4 w-4 mr-1 text-green-600" aria-hidden="true" />
                          Weekly Collection Goal
                        </span>
                        <span className="text-gray-900 font-medium">
                          {stats.collection_stats.week_liters.toLocaleString()}L / 4000L
                        </span>
                      </div>
                      <Progress value={(stats.collection_stats.week_liters / 4000) * 100} className="h-3" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 flex items-center">
                          <BarChart3 className="h-4 w-4 mr-1 text-emerald-600" aria-hidden="true" />
                          Average Quality Score
                        </span>
                        <span className="text-gray-900 font-medium">
                          {stats.quality_metrics.avg_quality.toFixed(1)} /5.0
                        </span>
                      </div>
                      <Progress value={stats.quality_metrics.avg_quality * 20} className="h-3" />
                    </div>
                    <div>
                      <div className="flex justify-between text-sm mb-2">
                        <span className="text-gray-700 flex items-center">
                          <Users className="h-4 w-4 mr-1 text-teal-600" aria-hidden="true" />
                          Farmer Participation
                        </span>
                        <span className="text-gray-900 font-medium">
                          {stats.farmer_stats.active > 0 ? 
                            Math.round((stats.farmer_stats.active / stats.farmer_stats.total) * 100) : 0}%
                        </span>
                      </div>
                      <Progress 
                        value={stats.farmer_stats.active > 0 ? 
                          (stats.farmer_stats.active / stats.farmer_stats.total) * 100 : 0} 
                        className="h-3" 
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center">
                    <Leaf className="h-5 w-5 mr-2 text-emerald-600" aria-hidden="true" />
                    Real-time Farm Activity
                  </CardTitle>
                  <CardDescription>
                    Latest system activities and important alerts
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center space-x-3 text-sm p-3 bg-green-50 rounded-lg border border-green-200">
                      <CheckCircle className="h-4 w-4 text-green-600" aria-hidden="true" />
                      <span className="text-gray-700">KYC approved for Mary Wanjiku</span>
                      <span className="text-green-500 text-xs ml-auto">2m ago</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <Milk className="h-4 w-4 text-blue-600" aria-hidden="true" />
                      <span className="text-gray-700">Collection recorded: 28.5L Grade A</span>
                      <span className="text-blue-500 text-xs ml-auto">15m ago</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                      <DollarSign className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                      <span className="text-gray-700">Payment processed: KSh 45,408</span>
                      <span className="text-emerald-500 text-xs ml-auto">1h ago</span>
                    </div>
                    <div className="flex items-center space-x-3 text-sm p-3 bg-orange-50 rounded-lg border border-orange-200">
                      <XCircle className="h-4 w-4 text-orange-600" aria-hidden="true" />
                      <span className="text-gray-700">Quality review required for batch #247</span>
                      <span className="text-orange-500 text-xs ml-auto">3h ago</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* AI Assistant Promotion Section */}
            <div className="mb-8">
              <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 hover:shadow-xl transition-all">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-xl font-bold text-blue-900 flex items-center gap-2">
                        <Bot className="h-6 w-6 text-blue-600" aria-hidden="true" />
                        AI-Powered Executive Intelligence
                      </CardTitle>
                      <CardDescription className="text-blue-700 mt-2">
                        Access advanced analytics, predictive insights, and strategic decision support for optimal farm management
                      </CardDescription>
                    </div>
                    <Link to="/admin/ai">
                      <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white" aria-label="Launch AI Center">
                        Launch AI Center
                        <ArrowRight className="h-4 w-4 ml-2" aria-hidden="true" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                      <BarChart3 className="h-5 w-5 text-blue-600" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-blue-900">Strategic Analytics</p>
                        <p className="text-sm text-blue-700">Cross-farm performance insights</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                      <TrendingUp className="h-5 w-5 text-blue-600" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-blue-900">Predictive Intelligence</p>
                        <p className="text-sm text-blue-700">Revenue & production forecasts</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-white/60 rounded-lg">
                      <AlertTriangle className="h-5 w-5 text-blue-600" aria-hidden="true" />
                      <div>
                        <p className="font-medium text-blue-900">Risk Assessment</p>
                        <p className="text-sm text-blue-700">Anomaly detection & alerts</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Activity */}
            {/* TODO: Add keyboard shortcuts for common dashboard actions */}
            {/* TODO: Implement dashboard sharing capabilities */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <Card className="border-green-200 bg-white/70 backdrop-blur-sm lg:col-span-2">
                <CardHeader>
                  <CardTitle className="text-gray-900 flex items-center justify-between">
                    <span className="flex items-center">
                      <Milk className="h-5 w-5 mr-2 text-green-600" aria-hidden="true" />
                      Collection Management
                    </span>
                    <Link to="/admin/collections">
                      <Button variant="outline" size="sm" className="border-green-300 text-green-700 hover:bg-green-50" aria-label="View All Collections">
                        View All
                      </Button>
                    </Link>
                  </CardTitle>
                  <CardDescription>
                    Monitor and manage milk collection activities across all farmers
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg border border-green-200">
                        <div className="text-2xl font-bold text-green-700">{stats.collection_stats.today}</div>
                        <div className="text-sm text-green-600">Today's Collections</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
                        <div className="text-2xl font-bold text-emerald-700">{stats.collection_stats.week_liters.toLocaleString()}L</div>
                        <div className="text-sm text-emerald-600">This Week</div>
                      </div>
                      <div className="p-4 bg-gradient-to-br from-teal-50 to-cyan-50 rounded-lg border border-teal-200">
                        <div className="text-2xl font-bold text-teal-700">{stats.collection_stats.month_liters.toLocaleString()}L</div>
                        <div className="text-sm text-teal-600">This Month</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <h4 className="font-medium text-gray-900">Recent Collections</h4>
                      {recentCollections.slice(0, 5).map((collection: any) => (
                        <div key={collection.id} className="flex items-center justify-between p-3 border border-green-200 rounded-lg hover:bg-green-50 transition-colors">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                              <Milk className="h-5 w-5 text-green-600" aria-hidden="true" />
                            </div>
                            <div>
                              <p className="font-medium text-gray-900">{collection.farmer_name || collection.farmerName}</p>
                              <p className="text-sm text-gray-600">
                                {new Date(collection.timestamp).toLocaleDateString()} • {collection.liters}L
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Badge className="bg-green-100 text-green-700 border-green-200">
                              Grade {collection.quality_grade || collection.qualityGrade}
                            </Badge>
                            <span className="text-sm font-medium">{collection.liters}L</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>

              <div className="space-y-8">
                <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center justify-between">
                      <span className="flex items-center">
                        <Users className="h-5 w-5 mr-2 text-orange-600" aria-hidden="true" />
                        Farmer Applications
                      </span>
                      <Badge className="bg-orange-100 text-orange-700 border-orange-200">
                        {pendingKYC.length}
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pendingKYC.slice(0, 3).map((farmer: any) => (
                        <div key={farmer.id} className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-gradient-to-r from-green-50 to-emerald-50">
                          <div>
                            <p className="font-medium text-gray-900">{farmer.name}</p>
                            <p className="text-sm text-gray-600">{farmer.phone}</p>
                          </div>
                          <Badge variant="outline" className="border-orange-300 text-orange-700">
                            Review
                          </Badge>
                        </div>
                      ))}
                    </div>
                    <Link to="/admin/kyc">
                      <Button className="w-full mt-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700" aria-label="Process Applications">
                        Process Applications
                      </Button>
                    </Link>
                  </CardContent>
                </Card>

                <Card className="border-green-200 bg-white/70 backdrop-blur-sm">
                  <CardHeader>
                    <CardTitle className="text-gray-900 flex items-center justify-between">
                      <span className="flex items-center">
                        <DollarSign className="h-5 w-5 mr-2 text-blue-600" />
                        Staff Performance
                      </span>
                      <Badge className="bg-blue-100 text-blue-700 border-blue-200">
                        12 Active
                      </Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div>
                          <p className="font-medium text-gray-900">John Mwangi</p>
                          <p className="text-sm text-gray-600">Zone A - 24 collections</p>
                        </div>
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div>
                          <p className="font-medium text-gray-900">Sarah Kimani</p>
                          <p className="text-sm text-gray-600">Zone B - 18 collections</p>
                        </div>
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                          Active
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border border-green-200 rounded-lg bg-gradient-to-r from-blue-50 to-indigo-50">
                        <div>
                          <p className="font-medium text-gray-900">Peter Ochieng</p>
                          <p className="text-sm text-gray-600">Zone C - 21 collections</p>
                        </div>
                        <Badge variant="outline" className="border-blue-300 text-blue-700">
                          Active
                        </Badge>
                      </div>
                    </div>
                    <Button className="w-full mt-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700" aria-label="Manage Staff">
                      Manage Staff
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default AdminDashboard;