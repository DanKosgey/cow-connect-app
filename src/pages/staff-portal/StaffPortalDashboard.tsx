import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Scale, 
  TrendingUp, 
  User, 
  BarChart3,
  FileText,
  Calendar,
  Wallet,
  Award
} from 'lucide-react';
import RefreshButton from '@/components/ui/RefreshButton';
import { useDashboardStats } from '@/hooks/useDashboardStats';

const StaffPortalDashboard = () => {
  const navigate = useNavigate();
  
  const { data: dashboardStats, isLoading, refetch } = useDashboardStats();

  const features = [
    {
      title: "Milk Approval",
      description: "Review and approve collected milk quantities",
      icon: <Scale className="h-8 w-8" />,
      path: "/staff-only/milk-approval",
      color: "bg-blue-500"
    },
    {
      title: "Variance Reports",
      description: "Analyze collection variances and generate reports",
      icon: <TrendingUp className="h-8 w-8" />,
      path: "/staff-only/variance-reports",
      color: "bg-orange-500"
    },
    {
      title: "Staff Performance",
      description: "Monitor staff performance and approval metrics",
      icon: <User className="h-8 w-8" />,
      path: "/staff-only/staff-performance",
      color: "bg-purple-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 text-primary-foreground shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Office Administration</h1>
            <div className="text-primary-foreground/90 mt-2">
              Manage milk approvals, variance reports, and collector performance
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

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {features.map((feature, index) => (
          <Card 
            key={feature.title}
            className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 border-border"
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

      {/* Quick Stats Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Pending Reviews</div>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    dashboardStats?.pendingReviews || 0
                  )}
                </div>
              </div>
              <Scale className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Variance Today</div>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-6 w-12 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    `${dashboardStats?.varianceToday >= 0 ? '+' : ''}${dashboardStats?.varianceToday || 0}%`
                  )}
                </div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Collectors</div>
                <div className="text-2xl font-bold">
                  {isLoading ? (
                    <div className="h-6 w-8 bg-gray-200 rounded animate-pulse"></div>
                  ) : (
                    dashboardStats?.fieldStaff || 0
                  )}
                </div>
              </div>
              <User className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffPortalDashboard;