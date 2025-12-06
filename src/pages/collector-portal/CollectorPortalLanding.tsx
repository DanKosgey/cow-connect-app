import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Milk, 
  Users, 
  ClipboardList, 
  Calendar, 
  TrendingUp, 
  Route, 
  Target,
  MapPin,
  Wallet,
  BarChart3
} from 'lucide-react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import RefreshButton from '@/components/ui/RefreshButton';

export default function CollectorPortalLanding() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const collectorFeatures = [
    {
      title: "Dashboard",
      description: "View your daily overview and key metrics",
      icon: <Milk className="h-8 w-8" />,
      path: "/collector-only/dashboard",
      color: "bg-blue-500"
    },
    {
      title: "New Collection",
      description: "Record a new milk collection from farmers",
      icon: <ClipboardList className="h-8 w-8" />,
      path: "/collector-only/collections/new",
      color: "bg-green-500"
    },
    {
      title: "Collection History",
      description: "View and manage all milk collections",
      icon: <Calendar className="h-8 w-8" />,
      path: "/collector-only/collections",
      color: "bg-purple-500"
    },
    {
      title: "Farmer Directory",
      description: "Manage and view farmer information",
      icon: <Users className="h-8 w-8" />,
      path: "/collector-only/farmers",
      color: "bg-yellow-500"
    },
    {
      title: "Performance",
      description: "View your performance metrics and analytics",
      icon: <TrendingUp className="h-8 w-8" />,
      path: "/collector-only/performance",
      color: "bg-pink-500"
    },
    {
      title: "Route Management",
      description: "Manage your collection routes and stops",
      icon: <Route className="h-8 w-8" />,
      path: "/collector-only/routes",
      color: "bg-teal-500"
    },
    {
      title: "Earnings",
      description: "View your earnings and payment history",
      icon: <Wallet className="h-8 w-8" />,
      path: "/collector-only/earnings",
      color: "bg-indigo-500"
    }
  ];

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-primary to-primary-light rounded-2xl p-6 text-primary-foreground shadow-lg">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Welcome, Field Collector!</h1>
            <div className="text-primary-foreground/90 mt-2">
              Manage milk collections, farmers, and routes all in one place.
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {collectorFeatures.map((feature, index) => (
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
              onClick={() => navigate('/collector-only/collections/new')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <ClipboardList className="h-4 w-4" />
              Record New Collection
            </Button>
            <Button 
              onClick={() => navigate('/collector-only/farmers')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Users className="h-4 w-4" />
              View Farmer Directory
            </Button>
            <Button 
              onClick={() => navigate('/collector-only/collections')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <Calendar className="h-4 w-4" />
              View Collection History
            </Button>
            <Button 
              onClick={() => navigate('/collector-only/performance')}
              className="w-full justify-start gap-2"
              variant="outline"
            >
              <BarChart3 className="h-4 w-4" />
              View Performance Metrics
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}