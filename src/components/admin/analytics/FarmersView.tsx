import React, { memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ResponsiveContainer 
} from 'recharts';
import { Users, Droplet, DollarSign, Award, TrendingUp } from '@/utils/iconImports';

interface FarmersViewProps {
  topFarmers: any[];
  farmers: any[];
  selectedFarmer: string;
  setSelectedFarmer: (farmerId: string) => void;
}

// Memoized chart components to prevent unnecessary re-renders
const CollectionsOverTimeChart = memo(({ data }: { data: any[] }) => {
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} 
          formatter={(value) => [value, 'Collections']}
        />
        <Bar dataKey="collections" fill="#3b82f6" name="Collections" />
      </BarChart>
    </ResponsiveContainer>
  );
});

const VolumeVsRevenueChart = memo(({ data, formatCurrency }: { data: any[]; formatCurrency: (amount: number) => string }) => {
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} 
          formatter={(value, name) => [
            name === 'liters' ? `${value}L` : formatCurrency(Number(value)),
            name === 'liters' ? 'Volume' : 'Revenue'
          ]}
        />
        <Legend />
        <Line 
          type="monotone" 
          dataKey="liters" 
          stroke="#10b981" 
          strokeWidth={3} 
          dot={{ fill: '#10b981', r: 5 }} 
          activeDot={{ r: 8 }} 
          name="Volume (Liters)"
        />
        <Line 
          type="monotone" 
          dataKey="amount" 
          stroke="#f59e0b" 
          strokeWidth={3} 
          dot={{ fill: '#f59e0b', r: 5 }} 
          activeDot={{ r: 8 }} 
          name="Revenue (KES)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

const FarmersView: React.FC<FarmersViewProps> = memo(({
  topFarmers,
  farmers,
  selectedFarmer,
  setSelectedFarmer
}) => {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES'
    }).format(amount);
  };

  // Get detailed data for selected farmer
  const selectedFarmerData = topFarmers.find(f => f.id === selectedFarmer) || topFarmers[0];

  return (
    <div className="space-y-6">
      {/* Farmer Selection */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <CardHeader>
          <CardTitle className="text-text-light dark:text-text-dark">Select Farmer</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {farmers.map((farmer) => (
              <button
                key={farmer.id}
                onClick={() => setSelectedFarmer(farmer.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedFarmer === farmer.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {farmer.profiles?.full_name || 'Unknown'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedFarmerData && (
        <>
          {/* Farmer Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Collections</CardTitle>
                <Droplet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{selectedFarmerData.collections}</div>
                <p className="text-xs text-blue-700 dark:text-blue-300">This period</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 border border-green-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Total Volume</CardTitle>
                <Droplet className="h-5 w-5 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">{selectedFarmerData.liters.toFixed(0)}L</div>
                <p className="text-xs text-green-700 dark:text-green-300">This period</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-900 border border-amber-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-amber-800 dark:text-amber-200">Total Revenue</CardTitle>
                <DollarSign className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-amber-900 dark:text-amber-100">{formatCurrency(selectedFarmerData.amount)}</div>
                <p className="text-xs text-amber-700 dark:text-amber-300">This period</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-gray-800 dark:to-gray-900 border border-purple-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-200">Avg Quality</CardTitle>
                <Award className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{selectedFarmerData.avgQuality.toFixed(1)}</div>
                <p className="text-xs text-purple-700 dark:text-purple-300">Grade equivalent</p>
              </CardContent>
            </Card>
          </div>

          {/* Farmer Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Collections Over Time */}
            <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
              <CardHeader>
                <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-blue-500" />
                  Collections Over Time
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <CollectionsOverTimeChart data={topFarmers.slice(0, 10)} />
              </CardContent>
            </Card>

            {/* Volume vs Revenue */}
            <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
              <CardHeader>
                <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
                  <DollarSign className="h-5 w-5 text-green-500" />
                  Volume vs Revenue
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <VolumeVsRevenueChart data={topFarmers.slice(0, 10)} formatCurrency={formatCurrency} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* All Farmers List */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <CardHeader>
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-500" />
            All Farmers
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark">
                  <th className="text-left py-3 px-4 text-subtle-text-light dark:text-subtle-text-dark">Farmer</th>
                  <th className="text-left py-3 px-4 text-subtle-text-light dark:text-subtle-text-dark">Collections</th>
                  <th className="text-left py-3 px-4 text-subtle-text-light dark:text-subtle-text-dark">Volume</th>
                  <th className="text-left py-3 px-4 text-subtle-text-light dark:text-subtle-text-dark">Revenue</th>
                  <th className="text-left py-3 px-4 text-subtle-text-light dark:text-subtle-text-dark">Avg Quality</th>
                </tr>
              </thead>
              <tbody>
                {topFarmers.map((farmer, idx) => (
                  <tr 
                    key={idx} 
                    className="border-b border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => setSelectedFarmer(farmer.id)}
                  >
                    <td className="py-3 px-4 font-medium text-text-light dark:text-text-dark">{farmer.name}</td>
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">{farmer.collections}</td>
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">{farmer.liters.toFixed(0)}L</td>
                    <td className="py-3 px-4 text-green-600">{formatCurrency(farmer.amount)}</td>
                    <td className="py-3 px-4">
                      <Badge variant="secondary">{farmer.avgQuality.toFixed(1)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});

export default FarmersView;