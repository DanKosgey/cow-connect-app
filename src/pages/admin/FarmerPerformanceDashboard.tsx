import React, { useState } from 'react';
import { useFarmerPerformanceData } from '@/hooks/useFarmerPerformanceData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Activity, 
  Users, 
  AlertTriangle, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  BarChart3, 
  Filter, 
  Search,
  Phone,
  Mail,
  Award,
  Target,
  Calendar,
  Clock,
  RefreshCw
} from 'lucide-react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

const FarmerPerformanceDashboard = () => {
  const [selectedTab, setSelectedTab] = useState('overview');
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('risk');
  
  const { 
    useFarmerPerformanceDashboard,
    refreshDashboardData
  } = useFarmerPerformanceData();
  
  // Get farmer performance dashboard data with caching
  const { 
    data: dashboardData, 
    isLoading: dashboardLoading, 
    refetch: refetchDashboard 
  } = useFarmerPerformanceDashboard();
  
  const stats = dashboardData?.stats || {
    totalFarmers: 0,
    activeFarmers: 0,
    atRiskFarmers: 0,
    criticalRisk: 0,
    highRisk: 0,
    mediumRisk: 0,
    avgPerformanceScore: 0,
    churnRate: 0,
    retentionRate: 0,
    collectionsTrend: { value: 0, isPositive: true },
    litersTrend: { value: 0, isPositive: true },
    revenueTrend: { value: 0, isPositive: true },
    qualityTrend: { value: 0, isPositive: true }
  };
  
  const atRiskFarmers = dashboardData?.atRiskFarmers || [];
  const topPerformers = dashboardData?.topPerformers || [];
  const inactiveStats = dashboardData?.inactiveStats || {
    slightly: 0,
    moderately: 0,
    highly: 0,
    dormant: 0,
    lost: 0
  };
  
  const lastRefreshed = dashboardData?.lastRefreshed || new Date();
  
  const loading = dashboardLoading || refreshDashboardData.isPending;

  const handleRefresh = async () => {
    try {
      await refetchDashboard();
    } catch (error) {
      console.error('Error refreshing dashboard:', error);
    }
  };

  const getRiskColor = (risk) => {
    const colors = {
      critical: 'bg-red-100 text-red-800 border-red-200',
      high: 'bg-orange-100 text-orange-800 border-orange-200',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      stable: 'bg-green-100 text-green-800 border-green-200'
    };
    return colors[risk] || colors.stable;
  };

  const getActionColor = (action) => {
    const colors = {
      pending: 'bg-gray-100 text-gray-700',
      'in-progress': 'bg-blue-100 text-blue-700',
      resolved: 'bg-green-100 text-green-700'
    };
    return colors[action] || colors.pending;
  };

  const filteredFarmers = atRiskFarmers.filter(farmer => {
    const matchesRisk = riskFilter === 'all' || farmer.risk === riskFilter;
    const matchesSearch = farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         farmer.id.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesRisk && matchesSearch;
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-card rounded-lg shadow p-6 border">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
                <Activity className="w-8 h-8 text-primary" />
                Farmer Performance & Retention
              </h1>
              <p className="text-muted-foreground mt-2">
                Monitor farmer health, identify risks, and boost retention
                <span className="text-xs block mt-1">Last updated: {lastRefreshed.toLocaleTimeString()}</span>
              </p>
            </div>
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                className="flex items-center gap-2"
                onClick={handleRefresh}
                disabled={loading}
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Filter className="w-4 h-4" />
                Filters
              </Button>
            </div>
          </div>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Active Farmers */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Users className="w-8 h-8 text-blue-500" />
                <span className="text-sm font-medium text-blue-500">Active</span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{stats.activeFarmers}</p>
                <p className="text-sm text-muted-foreground">of {stats.totalFarmers} total farmers</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-blue-500">
                <TrendingUp className="w-4 h-4" />
                <span>{stats.retentionRate}% retention rate</span>
              </div>
            </CardContent>
          </Card>

          {/* At Risk Farmers */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <AlertTriangle className="w-8 h-8 text-orange-500" />
                <span className="text-sm font-medium text-orange-500">At Risk</span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{stats.atRiskFarmers}</p>
                <p className="text-sm text-muted-foreground">require intervention</p>
              </div>
              <div className="mt-4 grid grid-cols-3 gap-2 text-xs">
                <div className="bg-orange-100 rounded-lg p-2">
                  <p className="font-bold">{stats.criticalRisk}</p>
                  <p className="text-orange-700">Critical</p>
                </div>
                <div className="bg-orange-100 rounded-lg p-2">
                  <p className="font-bold">{stats.highRisk}</p>
                  <p className="text-orange-700">High</p>
                </div>
                <div className="bg-orange-100 rounded-lg p-2">
                  <p className="font-bold">{stats.mediumRisk}</p>
                  <p className="text-orange-700">Medium</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Average Performance Score */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <Target className="w-8 h-8 text-green-500" />
                <span className="text-sm font-medium text-green-500">Performance</span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{stats.avgPerformanceScore}</p>
                <p className="text-sm text-muted-foreground">average score</p>
              </div>
              <div className="mt-4">
                <div className="w-full bg-muted rounded-full h-2">
                  <div 
                    className="bg-green-500 rounded-full h-2" 
                    style={{ width: `${stats.avgPerformanceScore}%` }}
                  ></div>
                </div>
                <p className="text-xs text-muted-foreground mt-2">Target: 80+</p>
              </div>
            </CardContent>
          </Card>

          {/* Churn Rate */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between mb-4">
                <TrendingDown className="w-8 h-8 text-purple-500" />
                <span className="text-sm font-medium text-purple-500">Churn</span>
              </div>
              <div className="space-y-1">
                <p className="text-3xl font-bold">{stats.churnRate}%</p>
                <p className="text-sm text-muted-foreground">monthly churn rate</p>
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-purple-500">
                <TrendingDown className="w-4 h-4" />
                <span>Below 3% target</span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Inactivity Status Cards */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-primary" />
              Inactivity Status Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Activity className="w-5 h-5 text-yellow-600" />
                  <span className="text-2xl font-bold text-yellow-700">{inactiveStats.slightly}</span>
                </div>
                <p className="text-sm font-medium text-yellow-800">Slightly Inactive</p>
                <p className="text-xs text-yellow-600 mt-1">7-14 days</p>
              </div>
              <div className="bg-orange-50 border-2 border-orange-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <span className="text-2xl font-bold text-orange-700">{inactiveStats.moderately}</span>
                </div>
                <p className="text-sm font-medium text-orange-800">Moderately Inactive</p>
                <p className="text-xs text-orange-600 mt-1">15-30 days</p>
              </div>
              <div className="bg-red-50 border-2 border-red-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <span className="text-2xl font-bold text-red-700">{inactiveStats.highly}</span>
                </div>
                <p className="text-sm font-medium text-red-800">Highly Inactive</p>
                <p className="text-xs text-red-600 mt-1">31-60 days</p>
              </div>
              <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Calendar className="w-5 h-5 text-purple-600" />
                  <span className="text-2xl font-bold text-purple-700">{inactiveStats.dormant}</span>
                </div>
                <p className="text-sm font-medium text-purple-800">Dormant</p>
                <p className="text-xs text-purple-600 mt-1">61-90 days</p>
              </div>
              <div className="bg-gray-50 border-2 border-gray-300 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <Users className="w-5 h-5 text-gray-600" />
                  <span className="text-2xl font-bold text-gray-700">{inactiveStats.lost}</span>
                </div>
                <p className="text-sm font-medium text-gray-800">Lost</p>
                <p className="text-xs text-gray-600 mt-1">90+ days</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Card>
          <div className="border-b">
            <div className="flex overflow-x-auto">
              {[
                { id: 'overview', label: 'Risk Overview', icon: BarChart3 },
                { id: 'critical', label: 'Critical & High Risk', icon: AlertTriangle },
                { id: 'performers', label: 'Top Performers', icon: Star }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`px-6 py-4 font-medium text-sm whitespace-nowrap flex items-center gap-2 border-b-2 transition-colors ${
                    selectedTab === tab.id
                      ? 'border-primary text-primary bg-muted'
                      : 'border-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          <CardContent className="p-6">
            {selectedTab === 'overview' && (
              <div className="space-y-6">
                {/* Search and Filter Bar */}
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1 relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder="Search by farmer name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    />
                  </div>
                  <div className="flex gap-2">
                    {['all', 'critical', 'high', 'medium'].map((filter) => (
                      <button
                        key={filter}
                        onClick={() => setRiskFilter(filter)}
                        className={`px-4 py-2 rounded-lg font-medium text-sm capitalize transition-colors ${
                          riskFilter === filter
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        }`}
                      >
                        {filter}
                      </button>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <select 
                      value={sortBy}
                      onChange={(e) => setSortBy(e.target.value)}
                      className="px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                    >
                      <option value="risk">Sort by Risk</option>
                      <option value="name">Sort by Name</option>
                      <option value="score">Sort by Score</option>
                      <option value="collections">Sort by Collections</option>
                    </select>
                  </div>
                </div>

                {/* At-Risk Farmers Table */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b bg-muted">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Farmer</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Score</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Risk Level</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Primary Issue</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Volume Change</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Last Collection</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Action Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-muted-foreground uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {filteredFarmers.map((farmer) => (
                        <tr key={farmer.id} className="hover:bg-muted/50">
                          <td className="px-4 py-4">
                            <div>
                              <p className="font-medium">{farmer.name}</p>
                              <p className="text-sm text-muted-foreground">{farmer.id}</p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1 mt-1">
                                {farmer.staff}
                              </p>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <div className="text-2xl font-bold">{farmer.score}</div>
                              <div className="text-xs text-muted-foreground">/100</div>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(farmer.risk)}`}>
                              {farmer.risk.toUpperCase()}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div>
                              <p className="text-sm font-medium">{farmer.issue}</p>
                              {farmer.riskFactors && farmer.riskFactors.length > 0 && (
                                <div className="text-xs text-muted-foreground mt-1">
                                  {farmer.riskFactors.join(', ')}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-1">
                              <TrendingDown className="w-4 h-4 text-red-500" />
                              <span className="text-sm font-semibold text-red-600">{farmer.volume}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm">{farmer.lastCollection}</p>
                          </td>
                          <td className="px-4 py-4">
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getActionColor(farmer.action)}`}>
                              {farmer.action}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex items-center gap-2">
                              <Button variant="ghost" size="sm" title="Call Farmer">
                                <Phone className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" title="Send Message">
                                <Mail className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {selectedTab === 'critical' && (
              <div className="space-y-6">
                <div className="bg-destructive/10 border-l-4 border-destructive p-6 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="w-6 h-6 text-destructive flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-destructive mb-2">Immediate Action Required</h3>
                      <p className="text-destructive/80 mb-4">
                        {stats.criticalRisk} farmers in critical status and {stats.highRisk} in high-risk status require urgent intervention.
                      </p>
                      <Button className="bg-destructive hover:bg-destructive/90">
                        Start Intervention Campaign
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Critical Risk Cards */}
                <div className="grid md:grid-cols-2 gap-6">
                  {filteredFarmers.filter(f => f.risk === 'critical' || f.risk === 'high').map((farmer) => (
                    <Card key={farmer.id} className="border-2 border-destructive/20">
                      <CardContent className="p-6">
                        <div className="flex items-start justify-between mb-4">
                          <div>
                            <h3 className="text-xl font-bold">{farmer.name}</h3>
                            <p className="text-sm text-muted-foreground">{farmer.id}</p>
                          </div>
                          <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getRiskColor(farmer.risk)}`}>
                            {farmer.risk.toUpperCase()}
                          </span>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 mb-4">
                          <div className="bg-muted rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Performance Score</p>
                            <p className="text-2xl font-bold">{farmer.score}</p>
                          </div>
                          <div className="bg-muted rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">Volume Change</p>
                            <p className="text-2xl font-bold text-destructive">{farmer.volume}%</p>
                          </div>
                        </div>

                        <div className="space-y-2 mb-4">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Primary Issue:</span>
                            <span className="font-semibold">{farmer.issue}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Last Collection:</span>
                            <span className="font-semibold">{farmer.lastCollection}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Quality Score:</span>
                            <span className="font-semibold">N/A</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Assigned Staff:</span>
                            <span className="font-semibold">{farmer.staff}</span>
                          </div>
                        </div>

                        <div className="flex gap-2">
                          <Button className="flex-1 flex items-center justify-center gap-2">
                            <Phone className="w-4 h-4" />
                            Call Now
                          </Button>
                          <Button variant="outline" className="flex-1 flex items-center justify-center gap-2">
                            <Mail className="w-4 h-4" />
                            Send SMS
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {selectedTab === 'performers' && (
              <div className="space-y-6">
                <div className="bg-yellow-50 border-l-4 border-yellow-500 p-6 rounded-r-lg">
                  <div className="flex items-start gap-3">
                    <Star className="w-6 h-6 text-yellow-600 flex-shrink-0 mt-1" />
                    <div>
                      <h3 className="text-lg font-bold text-foreground mb-2">Star Performers</h3>
                      <p className="text-muted-foreground">
                        These farmers are excelling in performance, quality, and consistency. Consider them for mentorship programs.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {topPerformers.map((farmer, index) => (
                    <Card key={farmer.id} className="border-2 border-yellow-200 relative overflow-hidden">
                      {/* Rank Badge */}
                      <div className="absolute top-4 right-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-bold text-sm">#{index + 1}</span>
                        </div>
                      </div>

                      {/* Badge */}
                      <div className="mb-4 pt-4 px-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                          farmer.badge === 'Gold' 
                            ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white' 
                            : 'bg-gradient-to-r from-gray-300 to-gray-500 text-white'
                        }`}>
                          {farmer.badge} Member
                        </span>
                      </div>

                      <CardContent>
                        <div className="mb-4">
                          <h3 className="text-xl font-bold">{farmer.name}</h3>
                          <p className="text-sm text-muted-foreground">{farmer.id}</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Performance Score</span>
                            <span className="font-bold text-foreground">{farmer.score}/100</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Monthly Volume</span>
                            <span className="font-bold text-primary">{farmer.volume}L</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Quality Score</span>
                            <span className="font-bold text-green-600">N/A</span>
                          </div>
                          <div className="flex items-center justify-between p-2 bg-muted rounded-lg">
                            <span className="text-sm text-muted-foreground">Collections</span>
                            <span className="font-bold text-purple-600">{farmer.collections}</span>
                          </div>
                        </div>

                        <Button className="w-full mt-4 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
                          <Award className="w-4 h-4 mr-2" />
                          View Full Profile
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerPerformanceDashboard;