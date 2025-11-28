import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  ClipboardList, 
  Users, 
  Wallet, 
  Route, 
  Beaker, 
  Package,
  FileText,
  BarChart3,
  TrendingUp,
  MapPin,
  Camera,
  Bell,
  Settings,
  Calendar,
  Truck
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

const CollectorQuickActions = () => {
  const navigate = useNavigate();

  const quickActions = [
    {
      title: "New Collection",
      description: "Record a new milk collection",
      icon: <ClipboardList className="h-6 w-6" />,
      color: "bg-blue-500",
      action: () => navigate('/collector/collections/new')
    },
    {
      title: "Farmer Directory",
      description: "View and manage farmers",
      icon: <Users className="h-6 w-6" />,
      color: "bg-green-500",
      action: () => navigate('/collector/farmers')
    },
    {
      title: "Payment Approval",
      description: "Approve farmer payments",
      icon: <Wallet className="h-6 w-6" />,
      color: "bg-purple-500",
      action: () => navigate('/collector/payments/approval')
    },
    {
      title: "Route Management",
      description: "Manage collection routes",
      icon: <Route className="h-6 w-6" />,
      color: "bg-teal-500",
      action: () => navigate('/collector/routes')
    },
    {
      title: "Quality Control",
      description: "Check milk quality parameters",
      icon: <Beaker className="h-6 w-6" />,
      color: "bg-yellow-500",
      action: () => navigate('/collector/quality-control')
    },
    {
      title: "Inventory",
      description: "Manage supplies and equipment",
      icon: <Package className="h-6 w-6" />,
      color: "bg-indigo-500",
      action: () => navigate('/collector/inventory')
    },
    {
      title: "Reports",
      description: "Generate detailed reports",
      icon: <FileText className="h-6 w-6" />,
      color: "bg-pink-500",
      action: () => navigate('/collector/reports')
    },
    {
      title: "Analytics",
      description: "View performance analytics",
      icon: <BarChart3 className="h-6 w-6" />,
      color: "bg-red-500",
      action: () => navigate('/collector/analytics')
    },
    {
      title: "Performance Tracking",
      description: "Monitor staff performance",
      icon: <TrendingUp className="h-6 w-6" />,
      color: "bg-cyan-500",
      action: () => navigate('/collector/performance-tracking')
    },
    {
      title: "GPS Tracking",
      description: "View location data",
      icon: <MapPin className="h-6 w-6" />,
      color: "bg-orange-500",
      action: () => navigate('/collector/gps-tracking')
    },
    {
      title: "Photo Documentation",
      description: "View collection photos",
      icon: <Camera className="h-6 w-6" />,
      color: "bg-lime-500",
      action: () => navigate('/collector/photos')
    },
    {
      title: "Notifications",
      description: "View alerts and messages",
      icon: <Bell className="h-6 w-6" />,
      color: "bg-rose-500",
      action: () => navigate('/collector/notifications')
    },
    {
      title: "Earnings",
      description: "View your earnings and payment history",
      icon: <Wallet className="h-6 w-6" />,
      color: "bg-indigo-500",
      action: () => navigate('/collector-only/earnings')
    }
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold">Quick Actions</h1>
        <p className="text-muted-foreground">Access frequently used features and tools</p>
      </div>

      {/* Quick Actions Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {quickActions.map((action, index) => (
          <Card 
            key={index} 
            className="hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer border-border"
            onClick={action.action}
          >
            <CardHeader className="pb-2">
              <div className={`w-12 h-12 rounded-lg ${action.color} flex items-center justify-center text-white mb-4`}>
                {action.icon}
              </div>
              <CardTitle className="text-xl">{action.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">{action.description}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Tools */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Additional Tools
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Button 
              variant="outline" 
              className="h-16 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/collector/schedule')}
            >
              <Calendar className="h-5 w-5" />
              <span>Schedule</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/collector/vehicle-tracking')}
            >
              <Truck className="h-5 w-5" />
              <span>Vehicle Tracking</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-16 flex flex-col items-center justify-center gap-2"
              onClick={() => navigate('/collector/settings')}
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectorQuickActions;