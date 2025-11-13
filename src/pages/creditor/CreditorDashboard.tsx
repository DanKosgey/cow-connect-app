import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  CreditCard, 
  TrendingUp, 
  User, 
  BarChart3,
  FileText,
  Calendar
} from 'lucide-react';
import RefreshButton from '@/components/ui/RefreshButton';

const CreditorDashboard = () => {
  const navigate = useNavigate();

  const features = [
    {
      title: "Credit Management",
      description: "Manage farmer credit applications and approvals",
      icon: <CreditCard className="h-8 w-8" />,
      path: "/creditor/credit-management",
      color: "bg-blue-500"
    },
    {
      title: "Credit Reports",
      description: "View detailed credit analytics and reports",
      icon: <TrendingUp className="h-8 w-8" />,
      path: "/creditor/credit-reports",
      color: "bg-orange-500"
    },
    {
      title: "Farmer Profiles",
      description: "View and manage farmer credit profiles",
      icon: <User className="h-8 w-8" />,
      path: "/creditor/farmer-profiles",
      color: "bg-purple-500"
    },
    {
      title: "Payment Tracking",
      description: "Track credit repayments and outstanding balances",
      icon: <BarChart3 className="h-8 w-8" />,
      path: "/creditor/payment-tracking",
      color: "bg-green-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 text-primary-foreground shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome, Agrovet Creditor!</h1>
            <div className="text-primary-foreground/90 mt-2">
              Manage farmer credits, applications, and repayments
            </div>
          </div>
          <div className="mt-4 md:mt-0">
            <RefreshButton 
              isRefreshing={false} 
              onRefresh={() => window.location.reload()} 
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
                <div className="text-sm font-medium text-muted-foreground">Pending Applications</div>
                <div className="text-2xl font-bold">12</div>
              </div>
              <CreditCard className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Total Credit Issued</div>
                <div className="text-2xl font-bold">KSh 420,000</div>
              </div>
              <TrendingUp className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-medium text-muted-foreground">Active Farmers</div>
                <div className="text-2xl font-bold">86</div>
              </div>
              <User className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CreditorDashboard;