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
  Wallet
} from 'lucide-react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';

export default function StaffPortalLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const staffFeatures = [
    {
      title: "Dashboard",
      description: "View your daily overview and key metrics",
      icon: <Milk className="h-8 w-8" />,
      path: "/staff/dashboard",
      color: "bg-blue-500"
    },
    {
      title: "New Collection",
      description: "Record a new milk collection from farmers",
      icon: <ClipboardList className="h-8 w-8" />,
      path: "/staff/collections/new",
      color: "bg-green-500"
    },
    {
      title: "Collection History",
      description: "View and manage all milk collections",
      icon: <Calendar className="h-8 w-8" />,
      path: "/staff/collections",
      color: "bg-purple-500"
    },
    {
      title: "Farmer Directory",
      description: "Manage and view farmer information",
      icon: <Users className="h-8 w-8" />,
      path: "/staff/farmers",
      color: "bg-yellow-500"
    },
    {
      title: "Payment Approval",
      description: "Approve and manage farmer payments",
      icon: <DollarSign className="h-8 w-8" />,
      path: "/staff/payments/approval",
      color: "bg-indigo-500"
    },
    {
      title: "Performance",
      description: "View your performance metrics and analytics",
      icon: <TrendingUp className="h-8 w-8" />,
      path: "/staff/performance",
      color: "bg-pink-500"
    },
    {
      title: "Route Management",
      description: "Manage your collection routes and stops",
      icon: <Route className="h-8 w-8" />,
      path: "/staff/routes",
      color: "bg-teal-500"
    },
    {
      title: "Payment History",
      description: "View and manage payment records",
      icon: <Wallet className="h-8 w-8" />,
      path: "/staff/payments/history",
      color: "bg-indigo-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 text-primary-foreground shadow-lg">
        <h1 className="text-3xl font-bold">Welcome, {user?.email || 'Staff Member'}!</h1>
        <p className="text-primary-foreground/90 mt-2">
          Manage milk collections, farmers, and payments all in one place.
        </p>
      </div>

      {/* Quick Stats Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-l-4 border-l-blue-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Today's Collections</p>
                <p className="text-2xl font-bold">12</p>
              </div>
              <Milk className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-green-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Farmers Visited</p>
                <p className="text-2xl font-bold">8</p>
              </div>
              <Users className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card className="border-l-4 border-l-purple-500 hover:shadow-lg transition-shadow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Earnings</p>
                <p className="text-2xl font-bold">KSh 24,500</p>
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
              <p className="text-muted-foreground mb-4">{feature.description}</p>
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
            <ul className="space-y-2">
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <span>Remember to verify farmer IDs before each collection</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <span>Check milk quality parameters for accurate grading</span>
              </li>
              <li className="flex items-start gap-2">
                <div className="w-2 h-2 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                <span>Submit collections before end of day for timely payments</span>
              </li>
            </ul>
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
              onClick={() => navigate('/staff/collections/new')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <ClipboardList className="h-4 w-4" />
              Record New Collection
            </Button>
            <Button 
              onClick={() => navigate('/staff/farmers')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Users className="h-4 w-4" />
              View Farmer Directory
            </Button>
            <Button 
              onClick={() => navigate('/staff/payments/approval')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <DollarSign className="h-4 w-4" />
              Approve Payments
            </Button>
            <Button 
              onClick={() => navigate('/staff/payments/history')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Wallet className="h-4 w-4" />
              View Payment History
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}