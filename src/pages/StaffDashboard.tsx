import { useState } from "react";
import { MapPin, Milk, Clock, CheckCircle, User, LogOut, Search, Navigation, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const StaffDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user] = useState(() => {
    const stored = localStorage.getItem('dairychain_user');
    return stored ? JSON.parse(stored) : null;
  });

  // Mock data for staff dashboard
  const todayStats = {
    collections: 23,
    totalLiters: "2,845L",
    farmerVisits: 18,
    avgQuality: "A"
  };

  const assignedFarmers = [
    { id: "1", name: "John Smith", distance: "0.8 km", lastCollection: "2 days ago", avgDaily: "125L" },
    { id: "2", name: "Mary Johnson", distance: "1.2 km", lastCollection: "1 day ago", avgDaily: "89L" },
    { id: "3", name: "Robert Brown", distance: "2.1 km", lastCollection: "3 hours ago", avgDaily: "156L" },
    { id: "4", name: "Sarah Davis", distance: "0.5 km", lastCollection: "5 hours ago", avgDaily: "203L" },
    { id: "5", name: "Michael Wilson", distance: "1.8 km", lastCollection: "1 day ago", avgDaily: "78L" },
  ];

  const recentCollections = [
    { id: "1", farmer: "John Smith", amount: "125L", time: "08:30 AM", quality: "A", location: "Farm A-1" },
    { id: "2", farmer: "Mary Johnson", amount: "89L", time: "09:15 AM", quality: "A", location: "Farm B-2" },
    { id: "3", farmer: "Robert Brown", amount: "156L", time: "10:00 AM", quality: "B", location: "Farm C-3" },
  ];

  const [searchTerm, setSearchTerm] = useState("");

  const filteredFarmers = assignedFarmers.filter(farmer =>
    farmer.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleLogout = () => {
    localStorage.removeItem('dairychain_user');
    toast({
      title: "Logged out successfully",
      description: "You have been signed out of your account",
    });
    navigate('/');
  };

  const handleStartCollection = (farmerId: string, farmerName: string) => {
    toast({
      title: "Collection Started",
      description: `Starting milk collection for ${farmerName}`,
    });
    // Navigate to collection form or start GPS tracking
  };

  if (!user || user.role !== 'staff') {
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
              <p className="text-xs text-muted-foreground">Field Agent Dashboard</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <Button variant="ghost" size="icon">
              <Navigation className="w-4 h-4" />
            </Button>
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{user?.name}</span>
              <Badge variant="secondary">Staff</Badge>
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
          <h2 className="text-2xl font-heading font-bold">Good morning, {user?.name}</h2>
          <p className="text-muted-foreground">
            Ready to start your collection route? You have {assignedFarmers.length} farmers assigned today.
          </p>
        </div>

        {/* Today's Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <CheckCircle className="w-5 h-5 text-success" />
              </div>
              <p className="text-xl font-bold">{todayStats.collections}</p>
              <p className="text-xs text-muted-foreground">Collections</p>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Milk className="w-5 h-5 text-accent" />
              </div>
              <p className="text-xl font-bold">{todayStats.totalLiters}</p>
              <p className="text-xs text-muted-foreground">Total Liters</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <User className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xl font-bold">{todayStats.farmerVisits}</p>
              <p className="text-xs text-muted-foreground">Visits</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Badge className="w-5 h-5 text-warning bg-transparent border-0 p-0">A</Badge>
              </div>
              <p className="text-xl font-bold">{todayStats.avgQuality}</p>
              <p className="text-xs text-muted-foreground">Avg Quality</p>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Assigned Farmers */}
          <Card className="farm-card">
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Today's Route</span>
                </div>
                <Button size="sm" variant="primary">
                  <Plus className="w-4 h-4 mr-2" />
                  New Collection
                </Button>
              </CardTitle>
              <CardDescription>
                Farmers assigned to your collection route
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    placeholder="Search farmers..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <div className="space-y-3 max-h-64 overflow-y-auto custom-scrollbar">
                  {filteredFarmers.map((farmer) => (
                    <div key={farmer.id} className="mobile-collection-card">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{farmer.name}</p>
                          <div className="flex items-center space-x-4 text-sm text-muted-foreground mt-1">
                            <span className="flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {farmer.distance}
                            </span>
                            <span className="flex items-center">
                              <Clock className="w-3 h-3 mr-1" />
                              {farmer.lastCollection}
                            </span>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{farmer.avgDaily}</p>
                          <p className="text-xs text-muted-foreground">avg/day</p>
                        </div>
                      </div>
                      <Button 
                        size="sm" 
                        variant="primary"
                        className="w-full"
                        onClick={() => handleStartCollection(farmer.id, farmer.name)}
                      >
                        Start Collection
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recent Collections */}
          <Card className="farm-card">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <CheckCircle className="w-5 h-5" />
                <span>Today's Collections</span>
              </CardTitle>
              <CardDescription>
                Completed collections for today
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCollections.map((collection) => (
                  <div key={collection.id} className="p-3 rounded-lg bg-success/10 border border-success/20">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-medium">{collection.farmer}</p>
                      <Badge variant={collection.quality === 'A' ? 'default' : 'outline'}>
                        Grade {collection.quality}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-sm text-muted-foreground">
                      <span>{collection.location}</span>
                      <div className="flex items-center space-x-3">
                        <span>{collection.amount}</span>
                        <span>{collection.time}</span>
                      </div>
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
              Common field operations
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Button variant="outline" className="h-20 flex-col space-y-2 farm">
                <Plus className="w-6 h-6" />
                <span>Bulk Entry</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2 farm">
                <MapPin className="w-6 h-6" />
                <span>Route Map</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2 farm">
                <Clock className="w-6 h-6" />
                <span>Sync Data</span>
              </Button>
              <Button variant="outline" className="h-20 flex-col space-y-2 farm">
                <Navigation className="w-6 h-6" />
                <span>GPS Status</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StaffDashboard;