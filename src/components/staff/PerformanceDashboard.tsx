import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, TrendingUp, TrendingDown, Minus, Award, Calendar, Truck, Beaker, Users } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { supabase } from '@/integrations/supabase/client';
import type { DailyStats, WeeklyStats, MonthlyStats } from '@/types/staff.types';

export default function PerformanceDashboard() {
  const { show, error: showError } = useToastNotifications();
  const [loading, setLoading] = useState(true);
  const [dailyStats, setDailyStats] = useState<DailyStats | null>(null);
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyStats | null>(null);

  useEffect(() => {
    const loadStats = async () => {
      try {
        const user = await supabase.auth.getUser();
        if (!user.data.user?.id) throw new Error('Not authenticated');

        // Load performance data
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

        // Daily stats
        const { data: dailyData } = await supabase
          .from('staff_performance')
          .select('*')
          .eq('staff_id', user.data.user.id)
          .eq('collection_date', today.toISOString().split('T')[0])
          .single();

        // Weekly stats
        const { data: weeklyData } = await supabase
          .from('staff_performance')
          .select('*')
          .eq('staff_id', user.data.user.id)
          .gte('collection_date', weekStart.toISOString().split('T')[0])
          .lte('collection_date', today.toISOString().split('T')[0]);

        // Monthly stats
        const { data: monthlyData } = await supabase
          .from('staff_performance')
          .select('*')
          .eq('staff_id', user.data.user.id)
          .gte('collection_date', monthStart.toISOString().split('T')[0])
          .lte('collection_date', today.toISOString().split('T')[0]);

        // Process daily stats
        if (dailyData) {
          setDailyStats({
            total_collections: dailyData.total_collections,
            total_quantity: dailyData.total_quantity,
            farmers_served: dailyData.farmers_served,
            quality_score: dailyData.quality_score,
            quantity_rank: dailyData.quantity_rank,
            quality_rank: dailyData.quality_rank,
            completion_rate: 0, // Calculate based on route data
            efficiency_score: 0, // Calculate based on time data
          });
        }

        // Process weekly stats
        if (weeklyData?.length) {
          const weeklyAvg = {
            total_collections: Math.round(
              weeklyData.reduce((sum, d) => sum + d.total_collections, 0) / weeklyData.length
            ),
            total_quantity: Math.round(
              weeklyData.reduce((sum, d) => sum + d.total_quantity, 0) / weeklyData.length
            ),
            farmers_served: Math.round(
              weeklyData.reduce((sum, d) => sum + d.farmers_served, 0) / weeklyData.length
            ),
            quality_score: parseFloat(
              (weeklyData.reduce((sum, d) => sum + d.quality_score, 0) / weeklyData.length).toFixed(2)
            ),
            quantity_rank: Math.round(
              weeklyData.reduce((sum, d) => sum + d.quantity_rank, 0) / weeklyData.length
            ),
            quality_rank: Math.round(
              weeklyData.reduce((sum, d) => sum + d.quality_rank, 0) / weeklyData.length
            ),
            completion_rate: 0,
            efficiency_score: 0,
            trend: 'stable' as const,
            target_achievement: 0,
          };

          // Calculate trend
          const prevWeek = weeklyData.slice(0, weeklyData.length / 2);
          const currWeek = weeklyData.slice(weeklyData.length / 2);
          const prevAvg = prevWeek.reduce((sum, d) => sum + d.total_quantity, 0) / prevWeek.length;
          const currAvg = currWeek.reduce((sum, d) => sum + d.total_quantity, 0) / currWeek.length;
          weeklyAvg.trend = currAvg > prevAvg ? 'up' : currAvg < prevAvg ? 'down' : 'stable';

          setWeeklyStats(weeklyAvg);
        }

        // Process monthly stats
        if (monthlyData?.length) {
          const monthlyAvg = {
            ...weeklyStats!,
            total_collections: Math.round(
              monthlyData.reduce((sum, d) => sum + d.total_collections, 0) / monthlyData.length
            ),
            total_quantity: Math.round(
              monthlyData.reduce((sum, d) => sum + d.total_quantity, 0) / monthlyData.length
            ),
            farmers_served: Math.round(
              monthlyData.reduce((sum, d) => sum + d.farmers_served, 0) / monthlyData.length
            ),
            quality_score: parseFloat(
              (monthlyData.reduce((sum, d) => sum + d.quality_score, 0) / monthlyData.length).toFixed(2)
            ),
            bonus_achievement: 85, // TODO: Calculate based on targets
            performance_rating: 4, // TODO: Calculate based on metrics
          };

          setMonthlyStats(monthlyAvg);
        }
      } catch (error: any) {
        console.error('Error loading stats:', error);
        showError('Error', String(error?.message || 'Failed to load stats'));
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    // Refresh stats every 5 minutes
    const interval = setInterval(loadStats, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4">
      {/* Daily Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Today's Collections
            </CardTitle>
            <Truck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyStats?.total_collections || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dailyStats?.total_quantity || 0}L total volume
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Quality Score
            </CardTitle>
            <Beaker className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyStats?.quality_score.toFixed(1) || '0.0'}
            </div>
            <p className="text-xs text-muted-foreground">
              Rank #{dailyStats?.quality_rank || '-'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Farmers Served
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyStats?.farmers_served || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              {dailyStats?.completion_rate || 0}% completion
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Efficiency Score
            </CardTitle>
            <Award className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {dailyStats?.efficiency_score || 0}%
            </div>
            <p className="text-xs text-muted-foreground">
              Based on route completion
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Weekly & Monthly Stats */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Weekly Overview</CardTitle>
              <Badge variant={
                weeklyStats?.trend === 'up' ? 'default' :
                weeklyStats?.trend === 'down' ? 'destructive' : 'secondary'
              }>
                {weeklyStats?.trend === 'up' && <TrendingUp className="h-4 w-4 mr-1" />}
                {weeklyStats?.trend === 'down' && <TrendingDown className="h-4 w-4 mr-1" />}
                {weeklyStats?.trend === 'stable' && <Minus className="h-4 w-4 mr-1" />}
                {weeklyStats?.trend || 'No data'}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Avg. Collections</p>
                  <p className="text-lg font-semibold">
                    {weeklyStats?.total_collections || 0}/day
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Target Progress</p>
                  <p className="text-lg font-semibold">
                    {weeklyStats?.target_achievement || 0}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Monthly Performance</CardTitle>
              <Badge>
                <Calendar className="h-4 w-4 mr-1" />
                {new Date().toLocaleString('default', { month: 'short' })}
              </Badge>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Bonus Progress</p>
                  <p className="text-lg font-semibold">
                    {monthlyStats?.bonus_achievement || 0}%
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Performance Rating</p>
                  <div className="flex items-center">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Award
                        key={star}
                        className={`h-4 w-4 ${
                          star <= (monthlyStats?.performance_rating || 0)
                            ? 'text-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}