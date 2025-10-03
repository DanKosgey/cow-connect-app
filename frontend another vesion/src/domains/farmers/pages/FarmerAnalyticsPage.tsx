import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar,
  TrendingUp,
  Milk,
  DollarSign
} from 'lucide-react';
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
  ResponsiveContainer
} from 'recharts';

// Mock data for charts
const monthlyData = [
  { month: 'Jan', collections: 450, earnings: 22500 },
  { month: 'Feb', collections: 380, earnings: 19000 },
  { month: 'Mar', collections: 520, earnings: 26000 },
  { month: 'Apr', collections: 480, earnings: 24000 },
  { month: 'May', collections: 610, earnings: 30500 },
  { month: 'Jun', collections: 550, earnings: 27500 },
];

const weeklyData = [
  { week: 'Week 1', liters: 120, quality: 'A' },
  { week: 'Week 2', liters: 95, quality: 'B' },
  { week: 'Week 3', liters: 140, quality: 'A' },
  { week: 'Week 4', liters: 110, quality: 'A' },
];

const qualityData = [
  { name: 'Grade A', value: 65, color: '#10B981' },
  { name: 'Grade B', value: 25, color: '#3B82F6' },
  { name: 'Grade C', value: 10, color: '#F59E0B' },
];

const FarmerAnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('monthly');

  // Simple chart components using SVG for demonstration
  const SimpleBarChart = () => (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <div className="flex items-end justify-between h-full pt-4 border-b border-l border-gray-200">
          {monthlyData.map((item, index) => (
            <div key={index} className="flex flex-col items-center flex-1 px-1">
              <div className="text-xs text-gray-500 mb-1">{item.month}</div>
              <div 
                className="w-full bg-green-500 rounded-t hover:bg-green-600 transition-colors"
                style={{ height: `${(item.collections / 700) * 100}%` }}
              ></div>
              <div className="text-xs text-gray-500 mt-1">{item.collections}L</div>
            </div>
          ))}
        </div>
      </ResponsiveContainer>
    </div>
  );

  const SimpleLineChart = () => (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <div className="relative h-full pt-4 border-b border-l border-gray-200">
          {/* Grid lines */}
          <div className="absolute top-0 left-0 right-0 h-px bg-gray-200"></div>
          <div className="absolute top-1/2 left-0 right-0 h-px bg-gray-200"></div>
          <div className="absolute bottom-0 left-0 right-0 h-px bg-gray-200"></div>
          
          {/* Data line */}
          <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polyline
              fill="none"
              stroke="#10B981"
              strokeWidth="2"
              points="0,80 20,60 40,40 60,50 80,30 100,40"
            />
            {monthlyData.map((_, index) => {
              const x = (index / (monthlyData.length - 1)) * 100;
              const y = 100 - (monthlyData[index].earnings / 35000) * 100;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="2"
                  fill="#10B981"
                />
              );
            })}
          </svg>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 text-xs text-gray-500">KSh 35K</div>
          <div className="absolute left-0 top-1/2 text-xs text-gray-500 transform -translate-y-1/2">KSh 17.5K</div>
          <div className="absolute left-0 bottom-0 text-xs text-gray-500">KSh 0</div>
        </div>
      </ResponsiveContainer>
    </div>
  );

  const SimplePieChart = () => (
    <div className="h-64 flex items-center justify-center">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 100 100" className="w-full h-full">
          {/* Grade A - 65% */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#10B981"
            strokeWidth="10"
            strokeDasharray="calc(65 * 2.83) 283"
            strokeDashoffset="0"
            transform="rotate(-90 50 50)"
          />
          {/* Grade B - 25% */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#3B82F6"
            strokeWidth="10"
            strokeDasharray="calc(25 * 2.83) 283"
            strokeDashoffset="calc(-65 * 2.83)"
            transform="rotate(-90 50 50)"
          />
          {/* Grade C - 10% */}
          <circle
            cx="50"
            cy="50"
            r="45"
            fill="none"
            stroke="#F59E0B"
            strokeWidth="10"
            strokeDasharray="calc(10 * 2.83) 283"
            strokeDashoffset="calc(-(65 + 25) * 2.83)"
            transform="rotate(-90 50 50)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold text-gray-900">100%</div>
            <div className="text-sm text-gray-500">Quality</div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Analytics</h1>
          <p className="text-gray-600">Track your milk collection performance and earnings</p>
        </div>

        {/* Time Range Selector */}
        <div className="flex justify-end mb-6">
          <div className="inline-flex rounded-md shadow-sm">
            <Button
              variant={timeRange === 'weekly' ? 'default' : 'outline'}
              onClick={() => setTimeRange('weekly')}
              className="rounded-r-none border-r-0"
            >
              Weekly
            </Button>
            <Button
              variant={timeRange === 'monthly' ? 'default' : 'outline'}
              onClick={() => setTimeRange('monthly')}
              className="rounded-none border-r-0"
            >
              Monthly
            </Button>
            <Button
              variant={timeRange === 'yearly' ? 'default' : 'outline'}
              onClick={() => setTimeRange('yearly')}
              className="rounded-l-none"
            >
              Yearly
            </Button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collections</CardTitle>
              <Milk className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">2,590 L</div>
              <p className="text-xs text-green-600">
                <span className="text-green-600">+12%</span> from last period
              </p>
            </CardContent>
          </Card>

          <Card className="border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">KSh 129,500</div>
              <p className="text-xs text-blue-600">
                <span className="text-blue-600">+8%</span> from last period
              </p>
            </CardContent>
          </Card>

          <Card className="border-purple-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg. Quality</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">Grade A</div>
              <p className="text-xs text-purple-600">
                <span className="text-purple-600">Excellent</span> consistency
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Collections Volume Chart */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center">
                <BarChart className="h-5 w-5 mr-2 text-green-600" />
                Milk Collections Volume
              </CardTitle>
              <CardDescription>
                Track your daily milk collection volumes over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleBarChart />
            </CardContent>
          </Card>

          {/* Earnings Trend Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <LineChart className="h-5 w-5 mr-2 text-blue-600" />
                Earnings Trend
              </CardTitle>
              <CardDescription>
                Your earnings over the selected time period
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimpleLineChart />
            </CardContent>
          </Card>

          {/* Quality Distribution Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <PieChart className="h-5 w-5 mr-2 text-purple-600" />
                Quality Distribution
              </CardTitle>
              <CardDescription>
                Distribution of your milk quality grades
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SimplePieChart />
              <div className="mt-4 space-y-2">
                {qualityData.map((item, index) => (
                  <div key={index} className="flex items-center">
                    <div 
                      className="w-3 h-3 rounded-full mr-2" 
                      style={{ backgroundColor: item.color }}
                    ></div>
                    <span className="text-sm text-gray-600">{item.name}</span>
                    <span className="text-sm font-medium text-gray-900 ml-auto">{item.value}%</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detailed Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calendar className="h-5 w-5 mr-2 text-gray-600" />
              Detailed Statistics
            </CardTitle>
            <CardDescription>
              Breakdown of your performance metrics
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Best Day</div>
                <div className="text-lg font-semibold text-gray-900">65 L</div>
                <div className="text-sm text-gray-500">Jan 15, 2024</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Avg. Daily</div>
                <div className="text-lg font-semibold text-gray-900">48 L</div>
                <div className="text-sm text-gray-500">Last 30 days</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Consistency</div>
                <div className="text-lg font-semibold text-gray-900">92%</div>
                <div className="text-sm text-gray-500">On-time deliveries</div>
              </div>
              <div className="border border-gray-200 rounded-lg p-4">
                <div className="text-sm text-gray-500 mb-1">Top Quality</div>
                <div className="text-lg font-semibold text-gray-900">Grade A</div>
                <div className="text-sm text-gray-500">85% of collections</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default FarmerAnalyticsPage;