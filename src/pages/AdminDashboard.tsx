import { useState } from "react";
import { Users, Milk, TrendingUp, MapPin, Bell, Settings, LogOut, BarChart3, Shield, Calendar } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user] = useState(() => {
    const stored = localStorage.getItem('dairychain_user');
    return stored ? JSON.parse(stored) : null;
  });

  // Mock data for dashboard
  const stats = [
    {
      title: "Total Farmers",
      value: "1,247",
      change: "+12%",
      icon: Users,
      color: "text-success",
      bgColor: "bg-success/10"
    },
    {
      title: "Daily Collection",
      value: "45,230L",
      change: "+8%",
      icon: Milk,
      color: "text-accent",
      bgColor: "bg-accent/10"
    },
    {
      title: "Revenue (Month)",
      value: "$324,567",
      change: "+15%",
      icon: TrendingUp,
      color: "text-primary",
      bgColor: "bg-primary/10"
    },
    {
      title: "Active Staff",
      value: "89",
      change: "+2%",
      icon: MapPin,
      color: "text-warning",
      bgColor: "bg-warning/10"
    }
  ];

  const recentCollections = [
    { id: "1", farmer: "John Smith", amount: "125L", time: "2 mins ago", status: "completed", quality: "A" },
    { id: "2", farmer: "Mary Johnson", amount: "89L", time: "5 mins ago", status: "completed", quality: "A" },
    { id: "3", farmer: "Robert Brown", amount: "156L", time: "8 mins ago", status: "pending", quality: "B" },
    { id: "4", farmer: "Sarah Davis", amount: "203L", time: "12 mins ago", status: "completed", quality: "A" },
    { id: "5", farmer: "Michael Wilson", amount: "78L", time: "15 mins ago", status: "completed", quality: "B" },
  ];

  const pendingKYC = [
    { id: "1", name: "Alice Cooper", submitted: "2 days ago", documents: 3 },
    { id: "2", name: "Tom Anderson", submitted: "1 day ago", documents: 4 },
    { id: "3", name: "Lisa Martinez", submitted: "3 hours ago", documents: 2 },
  ];

  const handleLogout = () => {
    localStorage.removeItem('dairychain_user');
    toast({
      title: "Logged out successfully",
      description: "You have been signed out of your account",
    });
    navigate('/');
  };

  if (!user || user.role !== 'admin') {
    navigate('/login');
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="flex h-16 items-center justify-between px-6">
          <div className="flex items-center space-x-4">
            <div className="w-8 h-8 gradient-primary rounded-lg flex items-center justify-center">
              <Milk className="w-5 h-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">DairyChain Pro</h1>
              <p className="text-xs text-muted-foreground">Administrator Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Bell className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon">
              <Settings className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{user?.name}</span>
              <Badge variant="secondary">Admin</Badge>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      <div className="p-6 space-y-6">
        {/* Welcome Section */}
        <div className="space-y-2">
          <h2 className="text-2xl font-heading font-bold">Welcome back, {user?.name}</h2>
          <p className="text-muted-foreground">
            Here's what's happening with your dairy operations today.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="dashboard-grid">
          {stats.map((stat, index) => {
            const Icon = stat.icon;
            return (
              <Card key={index} className="stat-card">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">{stat.title}</p>
                      <p className="text-2xl font-bold">{stat.value}</p>
                      <p className={`text-sm ${stat.color} font-medium`}>
                        {stat.change} from last month
                      </p>
                    </div>
                    <div className={`w-12 h-12 ${stat.bgColor} rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-6 h-6 ${stat.color}`} />
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Recent Collections */}
          <Card className="farm-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Milk className="w-5 h-5" />
                <span>Recent Collections</span>
              </CardTitle>
              <CardDescription>
                Latest milk collection activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCollections.map((collection) => (
                  <div key={collection.id} className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
                    <div className="flex-1">
                      <p className="font-medium">{collection.farmer}</p>
                      <p className="text-sm text-muted-foreground">{collection.time}</p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-semibold">{collection.amount}</p>
                      <div className="flex items-center space-x-2">
                        <Badge variant={collection.status === 'completed' ? 'default' : 'secondary'}>
                          {collection.status}
                        </Badge>
                        <Badge variant={collection.quality === 'A' ? 'default' : 'outline'}>
                          Grade {collection.quality}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Pending KYC Reviews */}
          <Card className="farm-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Shield className="w-5 h-5" />
                <span>Pending KYC Reviews</span>
              </CardTitle>
              <CardDescription>
                Farmers awaiting verification
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {pendingKYC.map((farmer) => (
                  <div key={farmer.id} className="flex items-center justify-between p-3 rounded-lg bg-warning/10 border border-warning/20">
                    <div className="flex-1">
                      <p className="font-medium">{farmer.name}</p>
                      <p className="text-sm text-muted-foreground">
                        Submitted {farmer.submitted} • {farmer.documents} documents
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        Review
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <Card className="farm-card">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>
              Frequently used administrative functions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Users className="w-6 h-6" />
                <span>Manage Farmers</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <BarChart3 className="w-6 h-6" />
                <span>Analytics</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Calendar className="w-6 h-6" />
                <span>Schedules</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2">
                <Settings className="w-6 h-6" />
                <span>Settings</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AdminDashboard;