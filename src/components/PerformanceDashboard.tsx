import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { performanceMonitor } from '@/utils/performanceMonitor';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from 'recharts';

export function PerformanceDashboard() {
  const [metrics, setMetrics] = useState<any>({});
  const [componentRenders, setComponentRenders] = useState<any>({});
  const [apiStats, setApiStats] = useState<any>({});
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchMetrics = () => {
    setMetrics(performanceMonitor.getMetrics());
    setComponentRenders(performanceMonitor.getComponentRenders());
    setApiStats(performanceMonitor.getApiStats());
  };

  useEffect(() => {
    fetchMetrics();
    
    // Set up auto-refresh
    const interval = setInterval(fetchMetrics, 5000);
    setRefreshInterval(interval);
    
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, []);

  const clearMetrics = () => {
    performanceMonitor.clearMetrics();
    fetchMetrics();
  };

  const logSummary = () => {
    performanceMonitor.logSummary();
  };

  // Prepare data for charts
  const operationData = Object.entries(metrics).map(([operation, data]: [string, any]) => ({
    name: operation,
    average: data.average,
    count: data.count,
    min: data.min,
    max: data.max
  }));

  const componentData = Object.entries(componentRenders).map(([component, count]: [string, number]) => ({
    name: component,
    count
  }));

  const apiData = Object.entries(apiStats).map(([api, stats]: [string, any]) => ({
    name: api,
    averageTime: stats.averageTime,
    errorRate: stats.errorRate * 100,
    count: stats.count
  }));

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Performance Dashboard</h2>
        <div className="space-x-2">
          <Button onClick={fetchMetrics} variant="outline">Refresh</Button>
          <Button onClick={clearMetrics} variant="outline">Clear Metrics</Button>
          <Button onClick={logSummary}>Log Summary</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Operation Metrics */}
        <Card>
          <CardHeader>
            <CardTitle>Operation Metrics</CardTitle>
            <CardDescription>Performance of various operations</CardDescription>
          </CardHeader>
          <CardContent>
            {operationData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={operationData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="average" fill="#8884d8" name="Average Time (ms)" />
                  <Bar dataKey="max" fill="#82ca9d" name="Max Time (ms)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No operation metrics available
              </div>
            )}
          </CardContent>
        </Card>

        {/* Component Renders */}
        <Card>
          <CardHeader>
            <CardTitle>Component Renders</CardTitle>
            <CardDescription>Number of times components have rendered</CardDescription>
          </CardHeader>
          <CardContent>
            {componentData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={componentData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="count" fill="#ffc658" name="Render Count" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No component render data available
              </div>
            )}
          </CardContent>
        </Card>

        {/* API Statistics */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>API Statistics</CardTitle>
            <CardDescription>Performance and error rates of API calls</CardDescription>
          </CardHeader>
          <CardContent>
            {apiData.length > 0 ? (
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={apiData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip />
                  <Legend />
                  <Line 
                    yAxisId="left" 
                    type="monotone" 
                    dataKey="averageTime" 
                    stroke="#8884d8" 
                    name="Average Time (ms)" 
                  />
                  <Line 
                    yAxisId="right" 
                    type="monotone" 
                    dataKey="errorRate" 
                    stroke="#ff0000" 
                    name="Error Rate (%)" 
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                No API statistics available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Raw Data Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Operation Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(metrics).map(([operation, data]: [string, any]) => (
                <div key={operation} className="border-b pb-2">
                  <div className="font-medium">{operation}</div>
                  <div className="text-sm text-muted-foreground">
                    Count: {data.count}, Avg: {data.average.toFixed(2)}ms, 
                    Min: {data.min.toFixed(2)}ms, Max: {data.max.toFixed(2)}ms
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Component Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(componentRenders).map(([component, count]: [string, number]) => (
                <div key={component} className="border-b pb-2">
                  <div className="font-medium">{component}</div>
                  <div className="text-sm text-muted-foreground">
                    Renders: {count}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>API Details</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {Object.entries(apiStats).map(([api, stats]: [string, any]) => (
                <div key={api} className="border-b pb-2">
                  <div className="font-medium">{api}</div>
                  <div className="text-sm text-muted-foreground">
                    Calls: {stats.count}, Avg: {stats.averageTime.toFixed(2)}ms, 
                    Error Rate: {(stats.errorRate * 100).toFixed(2)}%
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}