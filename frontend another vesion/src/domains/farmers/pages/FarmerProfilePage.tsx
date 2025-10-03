import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { 
  Milk, 
  Calendar, 
  DollarSign, 
  MapPin, 
  Tractor, 
  CheckCircle, 
  Clock, 
  TrendingUp,
  BarChart3,
  CreditCard,
  Users
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';

interface CollectionRecord {
  id: string;
  date: string;
  liters: number;
  quality: string;
  amount: number;
  status: 'completed' | 'pending' | 'disputed';
}

interface FarmStats {
  totalMilk: number;
  thisMonth: number;
  totalEarnings: number;
  pendingPayment: number;
  lastCollection: string;
  cowCount: number;
}

export default function FarmerProfile() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<FarmStats>({
    totalMilk: 2450.5,
    thisMonth: 345.2,
    totalEarnings: 245000,
    pendingPayment: 34500,
    lastCollection: '2024-01-15',
    cowCount: 25
  });

  const [collections, setCollections] = useState<CollectionRecord[]>([
    {
      id: '1',
      date: '2024-01-15',
      liters: 45.2,
      quality: 'A',
      amount: 2260,
      status: 'completed'
    },
    {
      id: '2',
      date: '2024-01-14',
      liters: 38.8,
      quality: 'A',
      amount: 1940,
      status: 'completed'
    },
    {
      id: '3',
      date: '2023-12-20',
      liters: 890.5,
      quality: 'A',
      amount: 44525,
      status: 'pending'
    }
  ]);

  useEffect(() => {
    // Redirect if not farmer or not authenticated
    if (!user || !user.is_admin) {
      // In a real app, we would check for a farmer role
      // For now, we'll allow access if user is authenticated
    }
  }, [user, navigate]);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <div className="h-8 w-8 bg-green-600 rounded-lg flex items-center justify-center mr-3">
                <Milk className="h-5 w-5 text-white" />
              </div>
              <h1 className="text-xl font-semibold text-gray-900">DairyChain Pro</h1>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-600">
                Welcome, {user.full_name || user.username}
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 hover:text-red-800 hover:bg-red-50"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          {/* Profile Header */}
          <div className="bg-white overflow-hidden shadow rounded-lg mb-6">
            <div className="px-4 py-5 sm:p-6">
              <div className="flex items-center">
                <div className="h-16 w-16 bg-green-100 rounded-full flex items-center justify-center">
                  <Users className="h-8 w-8 text-green-600" />
                </div>
                <div className="ml-4">
                  <h2 className="text-2xl font-bold text-gray-900">
                    {user.full_name || user.username}
                  </h2>
                  <p className="text-gray-600">
                    Doe Dairy Farm
                  </p>
                  <p className="text-sm text-gray-500">
                    <MapPin className="inline h-4 w-4 mr-1" />
                    Nairobi, Kenya
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Milk Delivered</CardTitle>
                <Milk className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalMilk.toLocaleString()} L</div>
                <p className="text-xs text-muted-foreground">+12% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">This Month</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.thisMonth} L</div>
                <p className="text-xs text-muted-foreground">+5% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">KES {stats.totalEarnings.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">+8% from last month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Cow Count</CardTitle>
                <Tractor className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.cowCount} Cows</div>
                <p className="text-xs text-muted-foreground">2 new this month</p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity and Quick Actions */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent Collections */}
            <Card>
              <CardHeader>
                <CardTitle>Recent Collections</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {collections.map((collection) => (
                    <div key={collection.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-center">
                        {collection.status === 'completed' ? (
                          <CheckCircle className="h-5 w-5 text-green-500 mr-3" />
                        ) : collection.status === 'pending' ? (
                          <Clock className="h-5 w-5 text-yellow-500 mr-3" />
                        ) : (
                          <TrendingUp className="h-5 w-5 text-red-500 mr-3" />
                        )}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {collection.date}
                          </p>
                          <p className="text-sm text-gray-500">
                            {collection.liters} liters • Grade {collection.quality}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">
                          KES {collection.amount.toLocaleString()}
                        </p>
                        <Badge 
                          variant={collection.status === 'completed' ? 'default' : 'secondary'}
                          className={collection.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        >
                          {collection.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button variant="outline" className="w-full justify-start">
                    <BarChart3 className="mr-2 h-4 w-4" />
                    View Analytics
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <CreditCard className="mr-2 h-4 w-4" />
                    Payment History
                  </Button>
                  <Button variant="outline" className="w-full justify-start">
                    <Tractor className="mr-2 h-4 w-4" />
                    Manage Cattle
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Farm Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Farm Size</span>
                    <span className="text-sm font-medium">50.5 acres</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Last Collection</span>
                    <span className="text-sm font-medium">{stats.lastCollection}</span>
                  </div>
                  <Separator />
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500">Status</span>
                    <Badge variant="default">Active Farmer</Badge>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}