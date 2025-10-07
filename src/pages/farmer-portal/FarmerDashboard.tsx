import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Milk, 
  BarChart3, 
  DollarSign, 
  Award, 
  Clock, 
  CheckCircle, 
  Calendar,
  TrendingUp
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';

const FarmerDashboard = () => {
  const toast = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [upcomingTasks, setUpcomingTasks] = useState<any[]>([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error('Error', 'User not found');
        return;
      }

      // Get farmer profile
      const { data: farmer, error: farmerError } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (farmerError) throw farmerError;
      if (!farmer) {
        toast.error('Error', 'Farmer profile not found');
        return;
      }

      // Get today's collections
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      const { data: todayCollections, error: todayCollectionsError } = await supabase
        .from('collections')
        .select('liters, collection_date')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', today.toISOString())
        .lt('collection_date', tomorrow.toISOString());

      if (todayCollectionsError) throw todayCollectionsError;

      const todayLiters = todayCollections.reduce((sum, c) => sum + (c.liters || 0), 0);

      // Get this month's collections
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const { data: monthCollections, error: monthCollectionsError } = await supabase
        .from('collections')
        .select('liters, total_amount, collection_date')
        .eq('farmer_id', farmer.id)
        .gte('collection_date', startOfMonth.toISOString());

      if (monthCollectionsError) throw monthCollectionsError;

      const monthLiters = monthCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
      const monthEarnings = monthCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);

      // Get quality score (average of quality grades)
      const qualityScores: Record<string, number> = { 'A+': 100, 'A': 90, 'B': 75, 'C': 60 };
      const avgQuality = monthCollections.length > 0
        ? monthCollections.reduce((sum, c) => sum + (qualityScores[c.quality_grade] || 0), 0) / monthCollections.length
        : 0;

      // Set stats with real data
      const realStats = [
        {
          title: "Today's Collection",
          value: `${todayLiters.toFixed(1)} L`,
          change: "Based on today's collections",
          icon: <Milk className="h-6 w-6 text-blue-500" />,
          color: "bg-blue-100"
        },
        {
          title: "This Month",
          value: `${monthLiters.toFixed(0)} L`,
          change: "Current month total",
          icon: <BarChart3 className="h-6 w-6 text-green-500" />,
          color: "bg-green-100"
        },
        {
          title: "Payments",
          value: `KES ${monthEarnings.toFixed(0)}`,
          change: "This month earnings",
          icon: <DollarSign className="h-6 w-6 text-yellow-500" />,
          color: "bg-yellow-100"
        },
        {
          title: "Quality Score",
          value: `${avgQuality.toFixed(1)}`,
          change: avgQuality >= 90 ? "Excellent" : avgQuality >= 75 ? "Good" : "Needs improvement",
          icon: <Award className="h-6 w-6 text-purple-500" />,
          color: "bg-purple-100"
        }
      ];

      setStats(realStats);

      // Set recent activities (last 4 collections)
      const recentCollections = [...monthCollections]
        .sort((a, b) => new Date(b.collection_date).getTime() - new Date(a.collection_date).getTime())
        .slice(0, 4);

      const activities = recentCollections.map((collection, index) => ({
        id: index + 1,
        action: `Collection recorded: ${collection.liters}L`,
        time: new Date(collection.collection_date).toLocaleDateString(),
        status: "completed"
      }));

      setRecentActivities(activities);

      // Set upcoming tasks (mock data for now)
      const tasks = [
        { id: 1, task: "Morning collection", time: "7:00 AM - 9:00 AM", status: "pending" },
        { id: 2, task: "Quality testing", time: "10:00 AM - 11:00 AM", status: "pending" }
      ];

      setUpcomingTasks(tasks);

    } catch (error: any) {
      console.error('Error fetching dashboard data:', error);
      toast.error('Error', error.message || 'Failed to fetch dashboard data');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="container mx-auto py-6">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Farmer Dashboard</h1>
            <p className="text-gray-600 mt-2">Welcome back! Here's your dairy operations overview.</p>
          </div>
          <div className="mt-4 md:mt-0">
            <Button className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule Collection
            </Button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {stats.map((stat, index) => (
            <Card key={index} className="border border-border hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-gray-600">{stat.title}</CardTitle>
                <div className={`p-2 rounded-full ${stat.color}`}>
                  {stat.icon}
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
                <p className="text-xs text-gray-500 mt-1">{stat.change}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Activities */}
          <div className="lg:col-span-2">
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5 text-primary" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {recentActivities.map((activity) => (
                    <div key={activity.id} className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                      <div className="mt-1 p-1.5 rounded-full bg-green-100">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{activity.action}</p>
                        <p className="text-sm text-gray-500">{activity.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Upcoming Tasks */}
          <div>
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  Upcoming Tasks
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingTasks.map((task) => (
                    <div key={task.id} className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
                      <div className="mt-1 p-1.5 rounded-full bg-blue-100">
                        <Clock className="h-4 w-4 text-blue-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{task.task}</p>
                        <p className="text-sm text-gray-500">{task.time}</p>
                      </div>
                    </div>
                  ))}
                  <Button variant="outline" className="w-full">
                    View Full Schedule
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default FarmerDashboard;