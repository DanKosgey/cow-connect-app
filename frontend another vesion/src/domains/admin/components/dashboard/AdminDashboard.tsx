import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  LineChart, 
  Line, 
  BarChart as RechartsBarChart, 
  Bar, 
  PieChart, 
  Pie, 
  Cell, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { 
  Calendar, 
  Download, 
  AlertTriangle, 
  CheckCircle, 
  XCircle,
  Info,
  TrendingUp,
  Users,
  Droplets,
  DollarSign
} from 'lucide-react';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { SystemAlert } from '@/types/adminDashboard';

const AdminDashboard: React.FC = () => {
  const [period, setPeriod] = useState<string>('30days');
  const [region, setRegion] = useState<string>('all');
  const {
    data,
    isLoading,
    error,
    alerts,
    isConnected,
    refetch,
    acknowledgeAlert,
    clearAcknowledgedAlerts,
    changeDateRange,
    changeRegion,
    exportData,
  } = useAdminDashboard({ period, region });

  // Handle date range change
  const handlePeriodChange = (newPeriod: string) => {
    setPeriod(newPeriod);
    changeDateRange(newPeriod);
  };

  // Handle region change
  const handleRegionChange = (newRegion: string) => {
    setRegion(newRegion);
    changeRegion(newRegion);
  };

  // Get alert icon based on level
  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error':
        return <XCircle className="h-4 w-4 text-red-500" />;
      case 'warning':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info':
        return <Info className="h-4 w-4 text-blue-500" />;
      default:
        return <Info className="h-4 w-4 text-gray-500" />;
    }
  };

  // Get alert variant based on level
  const getAlertVariant = (level: string) => {
    switch (level) {
      case 'critical':
      case 'error':
        return 'destructive';
      case 'warning':
        return 'default';
      case 'info':
        return 'default';
      default:
        return 'default';
    }
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  // Render KPI cards
  const renderKPICards = () => {
    if (!data?.overview) return null;

    const kpiData = [
      {
        title: "Total Farmers",
        metric: data.overview.total_farmers.toLocaleString(),
        icon: <Users className="h-6 w-6 text-green-500" />,
        color: "bg-green-100",
      },
      {
        title: "Active Collections",
        metric: data.overview.active_collections.toLocaleString(),
        icon: <Droplets className="h-6 w-6 text-blue-500" />,
        color: "bg-blue-100",
      },
      {
        title: "Monthly Revenue",
        metric: `KSh ${data.overview.monthly_revenue.toLocaleString()}`,
        icon: <DollarSign className="h-6 w-6 text-purple-500" />,
        color: "bg-purple-100",
      },
      {
        title: "Avg Quality",
        metric: `${data.overview.quality_average.toFixed(1)}/5.0`,
        icon: <TrendingUp className="h-6 w-6 text-yellow-500" />,
        color: "bg-yellow-100",
      },
    ];

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <Card key={index}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{kpi.title}</CardTitle>
              <div className={`p-2 rounded-full ${kpi.color}`}>
                {kpi.icon}
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{kpi.metric}</div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  // Render trend charts
  const renderTrendCharts = () => {
    if (!data?.trends) return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Farmer Growth</CardTitle>
            <CardDescription>Number of farmers over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends.farmer_growth}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="count"
                    stroke="#16a34a"
                    strokeWidth={2}
                    dot={{ fill: '#16a34a' }}
                    name="Farmers"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Collection Volume</CardTitle>
            <CardDescription>Liters collected over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={data.trends.collection_volume}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="volume" fill="#16a34a" name="Volume (L)" />
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Quality Trends</CardTitle>
            <CardDescription>Average quality over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends.quality_trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis domain={[0, 5]} />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="avg_quality"
                    stroke="#f59e0b"
                    strokeWidth={2}
                    dot={{ fill: '#f59e0b' }}
                    name="Avg Quality"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue Trends</CardTitle>
            <CardDescription>Revenue generated over time</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={data.trends.revenue_trends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#8b5cf6"
                    strokeWidth={2}
                    dot={{ fill: '#8b5cf6' }}
                    name="Revenue (KSh)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Render regional data
  const renderRegionalData = () => {
    if (!data?.regional_breakdown) return null;

    // Generate colors for the pie chart
    const COLORS = ['#16a34a', '#22c55e', '#4ade80', '#86efac', '#bbf7d0', '#dcfce7'];

    return (
      <Card>
        <CardHeader>
          <CardTitle>Regional Breakdown</CardTitle>
          <CardDescription>Farmers, collections, and revenue by region</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] mb-6">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data.regional_breakdown}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  fill="#16a34a"
                  paddingAngle={5}
                  dataKey="farmers"
                  nameKey="region"
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                >
                  {data.regional_breakdown.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [value, 'Farmers']} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Region</TableHead>
                <TableHead>Farmers</TableHead>
                <TableHead>Collections</TableHead>
                <TableHead>Revenue (KSh)</TableHead>
                <TableHead>Avg Quality</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.regional_breakdown.map((regionData, index) => (
                <TableRow key={index}>
                  <TableCell className="font-medium">{regionData.region}</TableCell>
                  <TableCell>{regionData.farmers.toLocaleString()}</TableCell>
                  <TableCell>{regionData.collections.toLocaleString()}</TableCell>
                  <TableCell>{regionData.revenue.toLocaleString()}</TableCell>
                  <TableCell>{regionData.avg_quality.toFixed(1)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    );
  };

  // Render alerts
  const renderAlerts = () => {
    if (alerts.length === 0) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center">
              <AlertTriangle className="h-5 w-5 mr-2 text-yellow-500" />
              System Alerts
            </span>
            <Button variant="outline" size="sm" onClick={clearAcknowledgedAlerts}>
              Clear Acknowledged
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {alerts.map((alert) => (
              <Alert 
                key={alert.id} 
                variant={getAlertVariant(alert.level) as any}
                className={alert.acknowledged ? "opacity-70" : ""}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start">
                    {getAlertIcon(alert.level)}
                    <div className="ml-3">
                      <AlertTitle className="flex items-center">
                        {alert.level.charAt(0).toUpperCase() + alert.level.slice(1)} Alert
                        {alert.acknowledged && (
                          <Badge variant="secondary" className="ml-2">
                            Acknowledged
                          </Badge>
                        )}
                      </AlertTitle>
                      <AlertDescription>
                        <p>{alert.message}</p>
                        <p className="text-xs mt-1 text-muted-foreground">
                          Affected: {alert.affected_components.join(', ')}
                        </p>
                        <p className="text-xs mt-1 text-muted-foreground">
                          {formatDate(alert.timestamp)}
                        </p>
                      </AlertDescription>
                    </div>
                  </div>
                  {!alert.acknowledged && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => acknowledgeAlert(alert.id)}
                    >
                      <CheckCircle className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Alert>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-green-500"></div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="p-6">
        <Alert variant="destructive">
          <AlertTitle>Error Loading Dashboard</AlertTitle>
          <AlertDescription>
            {error instanceof Error ? error.message : 'An unknown error occurred'}
            <div className="mt-4">
              <Button onClick={() => refetch()}>Retry</Button>
            </div>
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header with controls */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
          <p className="text-muted-foreground">
            Overview of system performance and key metrics
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Select value={period} onValueChange={handlePeriodChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="90days">Last 90 Days</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Select value={region} onValueChange={handleRegionChange}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Select region" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Regions</SelectItem>
              <SelectItem value="north">North Region</SelectItem>
              <SelectItem value="south">South Region</SelectItem>
              <SelectItem value="east">East Region</SelectItem>
              <SelectItem value="west">West Region</SelectItem>
              <SelectItem value="central">Central Region</SelectItem>
            </SelectContent>
          </Select>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={exportData}
            disabled={!data}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          
          <div className="flex items-center">
            <div className={`h-2 w-2 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
            <span className="text-sm text-muted-foreground">
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      {renderKPICards()}

      {/* Trend Charts */}
      {renderTrendCharts()}

      {/* Regional Data */}
      {renderRegionalData()}

      {/* System Alerts */}
      {renderAlerts()}
    </div>
  );
};

export default AdminDashboard;