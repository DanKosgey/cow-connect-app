import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Milk, 
  Users, 
  DollarSign, 
  BarChart3, 
  Route, 
  Target,
  ClipboardList,
  Calendar,
  TrendingUp,
  MapPin,
  Wallet,
  AlertCircle,
  Scale,
  Award,
  CheckCircle
} from 'lucide-react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import RefreshButton from '@/components/ui/RefreshButton';
import { useStaffPortalData } from '@/hooks/useStaffPortalData';

interface StaffStats {
  total_collections_today: number;
  total_farmers_today: number;
  total_earnings_today: number;
}

const StaffPortalLanding: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { useStaffStats } = useStaffPortalData();
  
  const { data: staffStats, isLoading, refetch } = useStaffStats();

  const staffFeatures = [
    {
      title: "Dashboard",
      description: "View your daily overview and key metrics",
      icon: <Milk className="h-8 w-8" />,
      path: "/staff-only/dashboard",
      color: "bg-blue-500"
    },
    {
      title: "Milk Approval",
      description: "Approve milk collections and track variances",
      icon: <Scale className="h-8 w-8" />,
      path: "/staff-only/milk-approval",
      color: "bg-orange-500"
    },
    {
      title: "Variance Reports",
      description: "View detailed variance analytics and penalties",
      icon: <TrendingUp className="h-8 w-8" />,
      path: "/staff-only/variance-reports",
      color: "bg-red-500"
    },
    {
      title: "Collector Performance",
      description: "Monitor collector performance metrics and scores",
      icon: <Award className="h-8 w-8" />,
      path: "/staff-only/collector-performance",
      color: "bg-purple-500"
    },
    {
      title: "Farmer Directory",
      description: "Manage and view farmer information",
      icon: <Users className="h-8 w-8" />,
      path: "/collector/farmers",
      color: "bg-yellow-500"
    },
    {
      title: "Payment Approval",
      description: "Approve and manage farmer payments",
      icon: <DollarSign className="h-8 w-8" />,
      path: "/collector/payments/approval",
      color: "bg-indigo-500"
    },
    {
      title: "Performance",
      description: "View your performance metrics and analytics",
      icon: <TrendingUp className="h-8 w-8" />,
      path: "/collector/performance",
      color: "bg-pink-500"
    },
    {
      title: "Route Management",
      description: "Manage your collection routes and stops",
      icon: <Route className="h-8 w-8" />,
      path: "/collector/routes",
      color: "bg-teal-500"
    },
    {
      title: "Payment History",
      description: "View and manage payment records",
      icon: <Wallet className="h-8 w-8" />,
      path: "/collector/payments/history",
      color: "bg-indigo-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 text-primary-foreground shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome, {user?.email || 'Staff Member'}!</h1>
            <div className="text-primary-foreground/90 mt-2">
              Manage milk collections, farmers, and payments all in one place.
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <RefreshButton 
              isRefreshing={isLoading} 
              onRefresh={refetch} 
              className="bg-white/20 border-white/30 hover:bg-white/30 text-white rounded-md shadow-sm"
              variant="outline"
            />
          </div>
        </div>
      </div>

      {/* Quick Stats Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Today's Collections</div>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    staffStats?.total_collections_today || 0
                  )}
                </div>
              </div>
              <Milk className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Farmers Visited</div>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    staffStats?.total_farmers_today || 0
                  )}
                </div>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Earnings</div>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-6 w-20 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    `KSh ${(staffStats?.total_earnings_today || 0).toLocaleString()}`
                  )}
                </div>
              </div>
              <DollarSign className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {staffFeatures.map((feature, index) => (
          <Card 
            key={feature.title}
            className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border"
            style={{ animationDelay: `${index * 0.1}s` }}
          >
            <CardHeader className="pb-2">
              <div className={`w-12 h-12 rounded-lg ${feature.color} flex items-center justify-center text-white mb-4`}>
                {feature.icon}
              </div>
              <CardTitle className="text-xl">{feature.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-muted-foreground mb-4">{feature.description}</div>
              <Button 
                onClick={() => navigate(feature.path)}
                className="w-full"
                variant="outline"
              >
                Access
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tips & Resources */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              Daily Tips
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <span>Remember to verify farmer IDs before each collection</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <span>Check milk quality parameters for accurate grading</span>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <span>Submit collections before end of day for timely payments</span>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-primary" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate('/staff-only/milk-approval')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Scale className="h-4 w-4" />
              Approve Milk Collections
            </Button>
            <Button 
              onClick={() => navigate('/staff-only/variance-reports')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <TrendingUp className="h-4 w-4" />
              View Variance Reports
            </Button>
            <Button 
              onClick={() => navigate('/staff-only/collector-performance')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Award className="h-4 w-4" />
              Collector Performance
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Batch Processing
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button 
              onClick={() => navigate('/staff-only/batch-approval')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Users className="h-4 w-4" />
              Batch Approve Collections
            </Button>
            <Button 
              onClick={() => navigate('/staff-only/batch-variance-reports')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <TrendingUp className="h-4 w-4" />
              Batch Variance Reports
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffPortalLanding;
