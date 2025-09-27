import { useState } from "react";
import { Milk, TrendingUp, Calendar, DollarSign, LogOut, Eye, Award, MapPin, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const FarmerDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user] = useState(() => {
    const stored = localStorage.getItem('dairychain_user');
    return stored ? JSON.parse(stored) : null;
  });

  // Mock farmer data
  const farmerStats = {
    totalEarnings: "$2,847",
    monthlyAvg: "1,245L",
    qualityGrade: "A+",
    kycStatus: "verified"
  };

  const recentCollections = [
    { 
      id: "1", 
      date: "Today", 
      time: "06:30 AM", 
      amount: "125L", 
      quality: "A", 
      price: "$87.50",
      collector: "James Wilson"
    },
    { 
      id: "2", 
      date: "Yesterday", 
      time: "06:45 AM", 
      amount: "118L", 
      quality: "A", 
      price: "$82.60",
      collector: "James Wilson"
    },
    { 
      id: "3", 
      date: "2 days ago", 
      time: "06:30 AM", 
      amount: "132L", 
      quality: "A", 
      price: "$92.40",
      collector: "James Wilson"
    },
    { 
      id: "4", 
      date: "3 days ago", 
      time: "06:40 AM", 
      amount: "128L", 
      quality: "B", 
      price: "$84.00",
      collector: "Mary Johnson"
    },
  ];

  const upcomingPayments = [
    { date: "Dec 15", amount: "$1,247.50", status: "pending" },
    { date: "Dec 30", amount: "$1,380.25", status: "scheduled" },
  ];

  const monthlyData = [
    { month: "Jul", liters: 3420, earnings: 2394 },
    { month: "Aug", liters: 3680, earnings: 2576 },
    { month: "Sep", liters: 3520, earnings: 2464 },
    { month: "Oct", liters: 3890, earnings: 2723 },
    { month: "Nov", liters: 3745, earnings: 2621 },
    { month: "Dec", liters: 2845, earnings: 1991 }, // Partial month
  ];

  const handleLogout = () => {
    localStorage.removeItem('dairychain_user');
    toast({
      title: "Logged out successfully",
      description: "You have been signed out of your account",
    });
    navigate('/');
  };

  if (!user || user.role !== 'farmer') {
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
              <p className="text-xs text-muted-foreground">Farmer Portal</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium">{user?.name}</span>
              <Badge variant="secondary" className="flex items-center space-x-1">
                <span>Farmer</span>
                {farmerStats.kycStatus === 'verified' && (
                  <Award className="w-3 h-3 text-success" />
                )}
              </Badge>
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
            Track your milk production, earnings, and farm performance all in one place.
          </p>
        </div>

        {/* KYC Status Banner */}
        {farmerStats.kycStatus === 'verified' ? (
          <Card className="farm-card border-success bg-success/5">
            <CardContent className="p-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-success/10 rounded-full flex items-center justify-center">
                  <Award className="w-5 h-5 text-success" />
                </div>
                <div>
                  <p className="font-medium text-success">KYC Verified</p>
                  <p className="text-sm text-muted-foreground">Your account is fully verified and active</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="farm-card border-warning bg-warning/5">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-warning/10 rounded-full flex items-center justify-center">
                    <Eye className="w-5 h-5 text-warning" />
                  </div>
                  <div>
                    <p className="font-medium text-warning">KYC Pending</p>
                    <p className="text-sm text-muted-foreground">Please complete your verification</p>
                  </div>
                </div>
                <Button size="sm" variant="outline" className="border-warning text-warning">
                  Complete KYC
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="stat-card">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <DollarSign className="w-5 h-5 text-primary" />
              </div>
              <p className="text-xl font-bold">{farmerStats.totalEarnings}</p>
              <p className="text-xs text-muted-foreground">This Month</p>
            </CardContent>
          </Card>
          
          <Card className="stat-card">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-accent/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Milk className="w-5 h-5 text-accent" />
              </div>
              <p className="text-xl font-bold">{farmerStats.monthlyAvg}</p>
              <p className="text-xs text-muted-foreground">Monthly Avg</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-success/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <Award className="w-5 h-5 text-success" />
              </div>
              <p className="text-xl font-bold">{farmerStats.qualityGrade}</p>
              <p className="text-xs text-muted-foreground">Quality Grade</p>
            </CardContent>
          </Card>

          <Card className="stat-card">
            <CardContent className="p-4 text-center">
              <div className="w-10 h-10 bg-warning/10 rounded-lg flex items-center justify-center mx-auto mb-2">
                <TrendingUp className="w-5 h-5 text-warning" />
              </div>
              <p className="text-xl font-bold">+8%</p>
              <p className="text-xs text-muted-foreground">Growth</p>
            </CardContent>
          </Card>
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
                Your latest milk collection history
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentCollections.map((collection) => (
                  <div key={collection.id} className="p-3 rounded-lg bg-secondary/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{collection.date}</p>
                          <p className="text-sm text-muted-foreground flex items-center">
                            <Clock className="w-3 h-3 mr-1" />
                            {collection.time}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-primary">{collection.price}</p>
                        <p className="text-sm text-muted-foreground">{collection.amount}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-2">
                        <Badge variant={collection.quality === 'A' ? 'default' : 'outline'}>
                          Grade {collection.quality}
                        </Badge>
                      </div>
                      <p className="text-muted-foreground flex items-center">
                        <MapPin className="w-3 h-3 mr-1" />
                        {collection.collector}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Payments & Performance */}
          <div className="space-y-6">
            {/* Upcoming Payments */}
            <Card className="farm-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Calendar className="w-5 h-5" />
                  <span>Upcoming Payments</span>
                </CardTitle>
                <CardDescription>
                  Scheduled payment dates
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {upcomingPayments.map((payment, index) => (
                    <div key={index} className="flex items-center justify-between p-3 rounded-lg bg-gradient-to-r from-primary/10 to-accent/10">
                      <div>
                        <p className="font-medium">{payment.date}</p>
                        <Badge variant={payment.status === 'pending' ? 'default' : 'secondary'}>
                          {payment.status}
                        </Badge>
                      </div>
                      <p className="text-lg font-semibold text-primary">{payment.amount}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Monthly Performance */}
            <Card className="farm-card">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <TrendingUp className="w-5 h-5" />
                  <span>Monthly Performance</span>
                </CardTitle>
                <CardDescription>
                  Last 6 months comparison
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {monthlyData.slice(-3).map((month, index) => (
                    <div key={index} className="flex items-center justify-between p-2 rounded">
                      <span className="text-sm font-medium">{month.month}</span>
                      <div className="flex space-x-4 text-sm">
                        <span className="text-muted-foreground">{month.liters}L</span>
                        <span className="font-medium">${month.earnings}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Farm Information */}
        <Card className="farm-card">
          <CardHeader>
            <CardTitle>Farm Information</CardTitle>
            <CardDescription>
              Your farm details and contact information
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Farm ID</p>
                  <p className="font-medium">DAIRY-{user?.id?.slice(-6)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">Dairy Valley, Region 3</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Collection Route</p>
                  <p className="font-medium">Route A - Morning Collection</p>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <p className="text-sm text-muted-foreground">Contact Number</p>
                  <p className="font-medium">+1 (555) 123-4567</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-medium">john.farmer@dairychain.com</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Assigned Collector</p>
                  <p className="font-medium">James Wilson</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerDashboard;