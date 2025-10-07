import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts';
import { TrendingUp, Clock, Zap, Activity } from '@/utils/iconImports';

export function PerformanceDashboard() {
  const [routePerformance, setRoutePerformance] = useState<any[]>([]);
  const [averageLoadTimes, setAverageLoadTimes] = useState<any[]>([]);

  useEffect(() => {
    // Get route performance data
    const performanceData = performanceMonitor.getRoutePerformance();
    setRoutePerformance(performanceData);
    
    // Calculate average load times by route
    const routes = [...new Set(performanceData.map(data => data.route))];
    const averages = routes.map(route => {
      const routeData = performanceData.filter(data => data.route === route);
      const averageLoadTime = routeData.reduce((sum, data) => sum + data.loadTime, 0) / routeData.length;
      return {
        route,
        averageLoadTime: parseFloat(averageLoadTime.toFixed(2))
      };
    });
    
    setAverageLoadTimes(averages);
  }, []);

  // Format performance data for charts
  const chartData = routePerformance.slice(-20).map((data, index) => ({
    name: data.route,
    loadTime: parseFloat(data.loadTime.toFixed(2)),
    timestamp: new Date(data.timestamp).toLocaleTimeString()
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
        <p className="text-gray-600 mt-2">Monitor application performance and user experience metrics</p>
      </div>

      {/* Performance Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-t-4 border-t-blue-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Page Loads</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{routePerformance.length}</div>
            <p className="text-xs text-muted-foreground">Page load events recorded</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-green-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Load Time</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {routePerformance.length > 0 
                ? `${(routePerformance.reduce((sum, data) => sum + data.loadTime, 0) / routePerformance.length).toFixed(2)}ms` 
                : '0ms'}
            </div>
            <p className="text-xs text-muted-foreground">Average page load time</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-yellow-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Fastest Route</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageLoadTimes.length > 0 
                ? averageLoadTimes.reduce((min, data) => 
                    data.averageLoadTime < min.averageLoadTime ? data : min, 
                    averageLoadTimes[0]
                  ).route 
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Best performing route</p>
          </CardContent>
        </Card>

        <Card className="border-t-4 border-t-purple-500">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Slowest Route</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {averageLoadTimes.length > 0 
                ? averageLoadTimes.reduce((max, data) => 
                    data.averageLoadTime > max.averageLoadTime ? data : max, 
                    averageLoadTimes[0]
                  ).route 
                : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">Needs optimization</p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Load Time by Route */}
        <Card>
          <CardHeader>
            <CardTitle>Average Load Time by Route</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={averageLoadTimes}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="route" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="averageLoadTime" fill="#3b82f6" name="Load Time (ms)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Recent Page Loads */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Page Loads</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="timestamp" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="loadTime" 
                    stroke="#10b981" 
                    name="Load Time (ms)" 
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Route Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Route Performance Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4">Route</th>
                  <th className="text-left py-3 px-4">Load Time (ms)</th>
                  <th className="text-left py-3 px-4">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {routePerformance.slice(-10).map((data, index) => (
                  <tr key={index} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4 font-medium">{data.route}</td>
                    <td className="py-3 px-4">{data.loadTime.toFixed(2)}</td>
                    <td className="py-3 px-4">{new Date(data.timestamp).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}