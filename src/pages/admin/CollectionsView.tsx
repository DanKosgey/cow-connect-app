import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
// DashboardLayout is provided by AdminPortalLayout; avoid double wrapping

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';


import { useRealtimeAllCollections } from '@/hooks/useRealtimeCollections';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Milk, 
  Search, 
  Filter, 
  Download, 
  AlertCircle,
  Eye,
  BarChart3,
  TrendingUp,
  Users,
  DollarSign,
  Activity,
  Calendar,
  Award,
  Target,
  Zap,
  Droplet
} from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { format } from 'date-fns';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  ComposedChart
} from 'recharts';

// Types for our collections data
interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  staff_id: string;
  liters: number;
  quality_grade: string;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
  gps_latitude: number | null;
  gps_longitude: number | null;
  farmers?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
      phone: string;
    };
  };
  staff?: {
    id: string;
    user_id: string;
    profiles: {
      full_name: string;
    };
  };
}

interface DailyStats {
  date: string;
  collections: number;
  liters: number;
  amount: number;
  avgQuality: number;
}

interface QualityDistribution {
  name: string;
  value: number;
  percentage: number;
}

interface FarmerStats {
  id: string;
  name: string;
  collections: number;
  liters: number;
  amount: number;
  avgQuality: number;
}

interface StaffStats {
  id: string;
  name: string;
  collections: number;
  liters: number;
  farmers: number;
}

const CollectionsAnalyticsDashboard = () => {
  const toast = useToastNotifications();
  const toastRef = useRef(toast);
  const { collections: realtimeCollections, totalLiters: realTimeTotalLiters, totalAmount: realTimeTotalAmount, isLoading: realtimeLoading } = useRealtimeAllCollections();
  const [filteredCollections, setFilteredCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedCollection, setSelectedCollection] = useState<Collection | null>(null);
  const [dateRange, setDateRange] = useState('all'); // Changed default to 'all' to show all data
  const [selectedFarmer, setSelectedFarmer] = useState('all');
  const [selectedStaff, setSelectedStaff] = useState('all');
  const [currentView, setCurrentView] = useState('overview');
  const [farmers, setFarmers] = useState<any[]>([]);
  const [staff, setStaff] = useState<any[]>([]);

  // Analytics data - using useMemo for performance
  const { dailyTrends, qualityDistribution, topFarmers, staffPerformance } = useMemo(() => {
    // Calculate daily trends
    const dailyData: Record<string, any> = {};
    filteredCollections.forEach(c => {
      const date = new Date(c.collection_date).toLocaleDateString();
      if (!dailyData[date]) {
        dailyData[date] = { date, collections: 0, liters: 0, amount: 0, qualitySum: 0, qualityCount: 0 };
      }
      dailyData[date].collections += 1;
      dailyData[date].liters += parseFloat(c.liters?.toString() || '0');
      dailyData[date].amount += parseFloat(c.total_amount?.toString() || '0');
      const gradeValues = { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 };
      dailyData[date].qualitySum += gradeValues[c.quality_grade as keyof typeof gradeValues] || 0;
      dailyData[date].qualityCount += 1;
    });

    const dailyTrendsData = Object.values(dailyData).map(d => ({
      ...d,
      avgQuality: d.qualityCount > 0 ? (d.qualitySum / d.qualityCount) : 0
    })).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate quality distribution
    const qualityCounts: Record<string, number> = { 'A+': 0, 'A': 0, 'B': 0, 'C': 0 };
    filteredCollections.forEach(c => {
      if (c.quality_grade && qualityCounts.hasOwnProperty(c.quality_grade)) {
        qualityCounts[c.quality_grade]++;
      }
    });

    const total = filteredCollections.length || 1;
    const qualityDist = Object.entries(qualityCounts).map(([grade, count]) => ({
      name: `Grade ${grade}`,
      value: count,
      percentage: Math.round((count / total) * 100)
    }));

    // Calculate top farmers
    const farmerStats: Record<string, any> = {};
    filteredCollections.forEach(c => {
      const farmerId = c.farmer_id;
      if (!farmerStats[farmerId]) {
        farmerStats[farmerId] = {
          id: farmerId,
          name: c.farmers?.profiles?.full_name || 'Unknown',
          collections: 0,
          liters: 0,
          amount: 0,
          qualitySum: 0
        };
      }
      farmerStats[farmerId].collections += 1;
      farmerStats[farmerId].liters += parseFloat(c.liters?.toString() || '0');
      farmerStats[farmerId].amount += parseFloat(c.total_amount?.toString() || '0');
      const gradeValues = { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 };
      farmerStats[farmerId].qualitySum += gradeValues[c.quality_grade as keyof typeof gradeValues] || 0;
    });

    const topFarmersData = Object.values(farmerStats)
      .map(f => ({
        ...f,
        avgQuality: f.collections > 0 ? (f.qualitySum / f.collections) : 0
      }))
      .sort((a, b) => b.liters - a.liters)
      .slice(0, 10);

    // Calculate staff performance
    const staffStats: Record<string, any> = {};
    filteredCollections.forEach(c => {
      const staffId = c.staff?.id;
      if (!staffStats[staffId]) {
        staffStats[staffId] = {
          id: staffId,
          name: c.staff?.profiles?.full_name || 'Unknown',
          collections: 0,
          liters: 0,
          farmers: new Set()
        };
      }
      staffStats[staffId].collections += 1;
      staffStats[staffId].liters += parseFloat(c.liters?.toString() || '0');
      staffStats[staffId].farmers.add(c.farmer_id);
    });

    const staffPerformanceData = Object.values(staffStats)
      .map(s => ({
        ...s,
        farmers: s.farmers.size
      }))
      .sort((a, b) => b.collections - a.collections)
      .slice(0, 10);

    return {
      dailyTrends: dailyTrendsData,
      qualityDistribution: qualityDist,
      topFarmers: topFarmersData,
      staffPerformance: staffPerformanceData
    };
  }, [filteredCollections]);

  const COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#8b5cf6'];
  const GRADE_COLORS = { 'A+': '#10b981', 'A': '#3b82f6', 'B': '#f59e0b', 'C': '#ef4444' };

  // Update toast ref whenever toast changes
  useEffect(() => {
    toastRef.current = toast;
  }, [toast]);

  // Remove redundant fetchInitialData since we're using the hook
  useEffect(() => {
    const fetchDropdownData = async () => {
      try {
        setLoading(true);
        
        // Fetch farmers for filter dropdown
        const { data: farmersData, error: farmersError } = await supabase
          .from('farmers')
          .select(`
            id,
            profiles!user_id (
              full_name
            )
          `)
          .eq('kyc_status', 'approved');

        if (farmersError) throw farmersError;

        // Fetch staff for filter dropdown
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select(`
            id,
            profiles!user_id (
              full_name
            )
          `);

        if (staffError) throw staffError;

        setFarmers(farmersData || []);
        setStaff(staffData || []);
      } catch (error: any) {
        console.error('Error fetching dropdown data:', error);
        toastRef.current.error('Error', error.message || 'Failed to fetch dropdown data');
      } finally {
        setLoading(false);
      }
    };

    fetchDropdownData();
  }, []);

  // Optimized filter function with useCallback
  const filterCollections = useCallback(() => {
    let filtered = [...realtimeCollections];

    // Add date filtering based on dateRange
    if (dateRange !== 'all') {
      const now = new Date();
      let cutoffDate = new Date();
      
      switch(dateRange) {
        case '7days':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
          break;
        case '30days':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30);
          break;
        case '90days':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90);
          break;
        case '180days':
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 180);
          break;
        default:
          cutoffDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7); // Default to 7 days
      }
      
      // Apply date filter
      filtered = filtered.filter(c => {
        const collectionDate = new Date(c.collection_date);
        return collectionDate >= cutoffDate;
      });
    }

    if (searchTerm) {
      filtered = filtered.filter(c => 
        c.farmers?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.collection_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.staff?.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || false)
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter(c => c.status === filterStatus);
    }

    if (selectedFarmer !== 'all') {
      filtered = filtered.filter(c => c.farmer_id === selectedFarmer);
    }

    if (selectedStaff !== 'all') {
      filtered = filtered.filter(c => c.staff?.id === selectedStaff);
    }

    setFilteredCollections(filtered);
  }, [realtimeCollections, searchTerm, filterStatus, selectedFarmer, selectedStaff, dateRange]);

  useEffect(() => {
    // Only filter when data is loaded
    if (!realtimeLoading) {
      filterCollections();
    }
  }, [realtimeCollections, searchTerm, filterStatus, selectedFarmer, selectedStaff, dateRange, realtimeLoading, filterCollections]);

  const getDateFilter = () => {
    const now = new Date();
    let startDate = new Date();
    
    switch(dateRange) {
      case '7days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0);
        break;
      case '30days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 30, 0, 0, 0, 0);
        break;
      case '90days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 90, 0, 0, 0, 0);
        break;
      case '180days':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 180, 0, 0, 0, 0);
        break;
      case 'all':
        startDate = new Date('2020-01-01');
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0); // Default to 7 days
    }
    
    return startDate.toISOString();
  };

  const exportToCSV = () => {
    const csvData = filteredCollections.map(c => ({
      'Collection ID': c.collection_id,
      'Date': new Date(c.collection_date).toLocaleDateString(),
      'Farmer': c.farmers?.profiles?.full_name || 'N/A',
      'Staff': c.staff?.profiles?.full_name || 'N/A',
      'Liters': c.liters,
      'Quality Grade': c.quality_grade,
      'Rate per Liter': c.rate_per_liter,
      'Total Amount': c.total_amount,
      'Status': c.status,
      'GPS Latitude': c.gps_latitude || 'N/A',
      'GPS Longitude': c.gps_longitude || 'N/A'
    }));

    if (csvData.length === 0) {
      toastRef.current.show({ title: 'Warning', description: 'No data to export' });
      return;
    }

    const headers = Object.keys(csvData[0]).join(',');
    const rows = csvData.map(row => Object.values(row).join(','));
    const csv = [headers, ...rows].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `collections_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'Paid': return 'default';
      case 'Verified': return 'secondary';
      case 'Cancelled': return 'destructive';
      default: return 'outline';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  if (loading || realtimeLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-indigo-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 font-medium">Loading collections analytics...</p>
        </div>
      </div>
    );
  }

  // Calculate key metrics using useMemo
  const { totalCollections, totalLiters, totalAmount, avgRate, uniqueFarmers, uniqueStaff } = useMemo(() => {
    const totalCollections = filteredCollections.length;
    const totalLiters = filteredCollections.reduce((sum, c) => sum + (c.liters || 0), 0);
    const totalAmount = filteredCollections.reduce((sum, c) => sum + (c.total_amount || 0), 0);
    const avgRate = totalLiters > 0 ? totalAmount / totalLiters : 0;
    const uniqueFarmers = new Set(filteredCollections.map(c => c.farmer_id)).size;
    const uniqueStaff = new Set(filteredCollections.map(c => c.staff?.id)).size;
    
    return {
      totalCollections,
      totalLiters,
      totalAmount,
      avgRate,
      uniqueFarmers,
      uniqueStaff
    };
  }, [filteredCollections]);

  // Lazy load chart components only when needed
  const renderOverviewCharts = () => {
    if (currentView !== 'overview') return null;
    
    return (
      <>
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Droplet className="h-10 w-10 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Total Collections</p>
            <p className="text-3xl font-bold">{totalCollections}</p>
            <p className="text-xs opacity-75 mt-2">{uniqueFarmers} active farmers</p>
          </div>

          <div className="bg-gradient-to-br from-green-500 to-green-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Activity className="h-10 w-10 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Total Liters</p>
            <p className="text-3xl font-bold">{totalLiters.toFixed(2)}L</p>
            <p className="text-xs opacity-75 mt-2">Avg: {(totalLiters / totalCollections || 0).toFixed(2)}L/collection</p>
          </div>

          <div className="bg-gradient-to-br from-yellow-500 to-yellow-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <DollarSign className="h-10 w-10 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Total Revenue</p>
            <p className="text-3xl font-bold">{formatCurrency(totalAmount)}</p>
            <p className="text-xs opacity-75 mt-2">Avg rate: {formatCurrency(avgRate)}/L</p>
          </div>

          <div className="bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Users className="h-10 w-10 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Active Farmers</p>
            <p className="text-3xl font-bold">{uniqueFarmers}</p>
            <p className="text-xs opacity-75 mt-2">{uniqueStaff} active staff</p>
          </div>

          <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg shadow-lg p-6 text-white">
            <div className="flex items-center justify-between mb-4">
              <Zap className="h-10 w-10 opacity-80" />
            </div>
            <p className="text-sm opacity-90 mb-1">Avg Quality</p>
            <p className="text-3xl font-bold">
              {filteredCollections.length > 0 
                ? (filteredCollections.reduce((sum, c) => {
                    const gradeValues = { 'A+': 4, 'A': 3, 'B': 2, 'C': 1 };
                    return sum + (gradeValues[c.quality_grade as keyof typeof gradeValues] || 0);
                  }, 0) / filteredCollections.length).toFixed(1)
                : '0.0'}
            </p>
            <p className="text-xs opacity-75 mt-2">Quality Score</p>
          </div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Daily Collection Trends</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis yAxisId="left" />
                  <YAxis yAxisId="right" orientation="right" />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'liters') return [`${value}L`, 'Liters'];
                      if (name === 'amount') return [formatCurrency(Number(value)), 'Revenue'];
                      if (name === 'avgQuality') return [`${Number(value).toFixed(2)}`, 'Avg Quality'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area yAxisId="left" type="monotone" dataKey="liters" fill="#3b82f6" stroke="#3b82f6" fillOpacity={0.3} name="Liters" />
                  <Line yAxisId="right" type="monotone" dataKey="amount" stroke="#10b981" strokeWidth={2} name="Revenue" />
                  <Line yAxisId="right" type="monotone" dataKey="avgQuality" stroke="#f59e0b" strokeWidth={2} name="Avg Quality" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Grade Distribution</h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={qualityDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percentage }) => `${name}: ${percentage}%`}
                    outerRadius={100}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {qualityDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => [value, 'Collections']} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      </>
    );
  };

  // Render only the active tab content
  const renderActiveTab = () => {
    switch (currentView) {
      case 'overview':
        return renderOverviewCharts();
      case 'trends':
        return (
          <div className="bg-white rounded-lg shadow-lg p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Collection Trends Over Time</h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dailyTrends}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip 
                    formatter={(value, name) => {
                      if (name === 'liters') return [`${value}L`, 'Liters'];
                      if (name === 'amount') return [formatCurrency(Number(value)), 'Revenue'];
                      if (name === 'avgQuality') return [`${Number(value).toFixed(2)}`, 'Avg Quality'];
                      return [value, name];
                    }}
                  />
                  <Legend />
                  <Area type="monotone" dataKey="liters" stackId="1" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Liters" />
                  <Area type="monotone" dataKey="amount" stackId="2" stroke="#10b981" fill="#10b981" fillOpacity={0.6} name="Revenue" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        );
      case 'farmers':
        return (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <h3 className="text-lg font-semibold text-gray-900">Top Performing Farmers</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collections</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Liters</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Revenue</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg Quality</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {topFarmers.map((farmer, idx) => (
                    <tr key={farmer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className={`text-sm font-bold ${
                          idx === 0 ? 'text-yellow-500' : 
                          idx === 1 ? 'text-gray-400' :
                          idx === 2 ? 'text-orange-600' : 'text-gray-900'
                        }`}>
                          {idx + 1}
                          {idx < 3 && <Award className="inline h-4 w-4 ml-1" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{farmer.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{farmer.collections}</td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{farmer.liters.toFixed(2)}L</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(farmer.amount)}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          farmer.avgQuality >= 3.5 ? 'bg-green-100 text-green-800' :
                          farmer.avgQuality >= 2.5 ? 'bg-blue-100 text-blue-800' :
                          'bg-yellow-100 text-yellow-800'
                        }`}>
                          {farmer.avgQuality.toFixed(1)}/4.0
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {topFarmers.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No farmer data available for the selected filters
                </div>
              )}
            </div>
          </div>
        );
      case 'staff':
        return (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-green-50 to-emerald-50">
              <h3 className="text-lg font-semibold text-gray-900">Staff Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rank</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Collections</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total Liters</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmers Served</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Avg/Collection</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {staffPerformance.map((staff, idx) => (
                    <tr key={staff.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className={`text-sm font-bold ${
                          idx === 0 ? 'text-yellow-500' : 
                          idx === 1 ? 'text-gray-400' :
                          idx === 2 ? 'text-orange-600' : 'text-gray-900'
                        }`}>
                          {idx + 1}
                          {idx < 3 && <Award className="inline h-4 w-4 ml-1" />}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{staff.name}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{staff.collections}</td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{staff.liters.toFixed(2)}L</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{staff.farmers}</td>
                      <td className="px-6 py-4 text-sm text-gray-900">{(staff.liters / staff.collections || 0).toFixed(2)}L</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {staffPerformance.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  No staff data available for the selected filters
                </div>
              )}
            </div>
          </div>
        );
      case 'quality':
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Distribution</h3>
              <div className="h-80">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={qualityDistribution}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      label={({ name, percentage, value }) => `${name}: ${value} (${percentage}%)`}
                      outerRadius={100}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {qualityDistribution.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [value, 'Collections']} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Quality Insights</h3>
              <div className="space-y-4">
                {qualityDistribution.map((grade, idx) => (
                  <div key={idx} className="border-l-4 pl-4 py-2" style={{ borderColor: COLORS[idx % COLORS.length] }}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-medium text-gray-900">{grade.name}</span>
                      <span className="text-sm text-gray-600">{grade.value} collections</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="h-2 rounded-full transition-all duration-500"
                        style={{ 
                          width: `${grade.percentage}%`,
                          backgroundColor: COLORS[idx % COLORS.length]
                        }}
                      ></div>
                    </div>
                    <span className="text-xs text-gray-500">{grade.percentage}% of total</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'collections':
        return (
          <div className="bg-white rounded-lg shadow-lg overflow-hidden">
            <div className="px-6 py-4 border-b bg-gradient-to-r from-blue-50 to-indigo-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">All Collections</h3>
                <span className="text-sm text-gray-600">
                  Showing {filteredCollections.length} of {realtimeCollections.length} collections
                </span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Farmer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Staff</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Liters</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rate</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredCollections.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-sm font-mono text-gray-900">{c.collection_id}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div>{format(new Date(c.collection_date), 'MMM dd, yyyy')}</div>
                        <div className="text-xs text-gray-500">{format(new Date(c.collection_date), 'HH:mm')}</div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        {c.farmers?.profiles?.full_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {c.staff?.profiles?.full_name || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-blue-600">{c.liters}L</td>
                      <td className="px-6 py-4">
                        <span className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                              style={{ backgroundColor: GRADE_COLORS[c.quality_grade as keyof typeof GRADE_COLORS] || '#6b7280' }}>
                          {c.quality_grade}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">{formatCurrency(c.rate_per_liter)}</td>
                      <td className="px-6 py-4 text-sm font-medium text-green-600">{formatCurrency(c.total_amount)}</td>
                      <td className="px-6 py-4">
                        <Badge variant={getStatusVariant(c.status)}>
                          {c.status}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setSelectedCollection(c)}
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-2xl">
                            <DialogHeader>
                              <DialogTitle>Collection Details</DialogTitle>
                            </DialogHeader>
                            {selectedCollection && selectedCollection.id === c.id && (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-4">
                                <div>
                                  <h3 className="font-semibold text-gray-900 mb-3">Collection Information</h3>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Collection ID:</span>
                                      <span className="font-medium">{selectedCollection.collection_id}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Date:</span>
                                      <span className="font-medium">{format(new Date(selectedCollection.collection_date), 'MMM dd, yyyy HH:mm')}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Status:</span>
                                      <Badge variant={getStatusVariant(selectedCollection.status)}>
                                        {selectedCollection.status}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Quality Grade:</span>
                                      <Badge variant={selectedCollection.quality_grade === 'A+' ? 'default' : selectedCollection.quality_grade === 'A' ? 'secondary' : selectedCollection.quality_grade === 'B' ? 'outline' : 'destructive'}>
                                        {selectedCollection.quality_grade}
                                      </Badge>
                                    </div>
                                  </div>
                                </div>
                                <div>
                                  <h3 className="font-semibold text-gray-900 mb-3">Quantity & Payment</h3>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Liters:</span>
                                      <span className="font-medium">{selectedCollection.liters}L</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Rate per Liter:</span>
                                      <span className="font-medium">{formatCurrency(selectedCollection.rate_per_liter)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Total Amount:</span>
                                      <span className="font-medium text-green-600">{formatCurrency(selectedCollection.total_amount)}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="md:col-span-2">
                                  <h3 className="font-semibold text-gray-900 mb-3">Farmer Information</h3>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Name:</span>
                                      <span className="font-medium">{selectedCollection.farmers?.profiles?.full_name || 'N/A'}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Phone:</span>
                                      <span className="font-medium">{selectedCollection.farmers?.profiles?.phone || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                                <div className="md:col-span-2">
                                  <h3 className="font-semibold text-gray-900 mb-3">Staff Information</h3>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-gray-600">Name:</span>
                                      <span className="font-medium">{selectedCollection.staff?.profiles?.full_name || 'N/A'}</span>
                                    </div>
                                  </div>
                                </div>
                                {selectedCollection.gps_latitude && selectedCollection.gps_longitude && (
                                  <div className="md:col-span-2">
                                    <h3 className="font-semibold text-gray-900 mb-3">Location</h3>
                                    <div className="space-y-2">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Latitude:</span>
                                        <span className="font-medium">{selectedCollection.gps_latitude}</span>
                                      </div>
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Longitude:</span>
                                        <span className="font-medium">{selectedCollection.gps_longitude}</span>
                                      </div>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </DialogContent>
                        </Dialog>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredCollections.length === 0 && (
                <div className="text-center py-12">
                  <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-1">No collections found</h3>
                  <p className="text-gray-500">Try adjusting your search or filter criteria</p>
                </div>
              )}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-4xl font-bold text-gray-900 mb-2">Collections Analytics</h1>
                <p className="text-gray-600">Advanced insights and performance metrics</p>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow">
                <Activity className="h-5 w-5 text-green-500 animate-pulse" />
                <span className="text-sm font-medium text-gray-700">Live Data</span>
              </div>
            </div>
            
            {/* Tab Navigation */}
            <div className="flex gap-2 mt-6 border-b bg-white rounded-t-lg px-4">
              {[
                { id: 'overview', label: 'Overview', icon: BarChart3 },
                { id: 'trends', label: 'Trends', icon: TrendingUp },
                { id: 'farmers', label: 'Farmers', icon: Users },
                { id: 'staff', label: 'Staff', icon: Award },
                { id: 'quality', label: 'Quality', icon: Target },
                { id: 'collections', label: 'All Collections', icon: Droplet }
              ].map(({ id, label, icon: Icon }) => (
                <button
                  key={id}
                  onClick={() => setCurrentView(id)}
                  className={`px-4 py-3 font-medium transition flex items-center gap-2 ${
                    currentView === id
                      ? 'border-b-2 border-blue-600 text-blue-600'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <Input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <select
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="7days">Last 7 Days</option>
                <option value="30days">Last 30 Days</option>
                <option value="90days">Last 90 Days</option>
                <option value="180days">Last 6 Months</option>
                <option value="all">All Time</option>
              </select>
              <select
                value={selectedFarmer}
                onChange={(e) => {
                  setSelectedFarmer(e.target.value);
                  // Reset staff filter when farmer is selected
                  if (e.target.value !== 'all') {
                    setSelectedStaff('all');
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Farmers ({farmers.length})</option>
                {farmers.map(f => (
                  <option key={f.id} value={f.id}>{f.profiles?.full_name || 'Unknown'}</option>
                ))}
              </select>
              <select
                value={selectedStaff}
                onChange={(e) => {
                  setSelectedStaff(e.target.value);
                  // Reset farmer filter when staff is selected
                  if (e.target.value !== 'all') {
                    setSelectedFarmer('all');
                  }
                }}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Staff ({staff.length})</option>
                {staff.map(s => (
                  <option key={s.id} value={s.id}>{s.profiles?.full_name || 'Unknown'}</option>
                ))}
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="Collected">Collected</option>
                <option value="Verified">Verified</option>
                <option value="Paid">Paid</option>
                <option value="Cancelled">Cancelled</option>
              </select>
              <Button
                onClick={exportToCSV}
                className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
            </div>
          </div>

          {/* Render only the active tab */}
          {renderActiveTab()}
        </div>
      </div>
  );
};

export default CollectionsAnalyticsDashboard;