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
import { UserCog, Droplet, Users, BarChart3 } from '@/utils/iconImports';

interface StaffViewProps {
  staffPerformance: any[];
  staff: any[];
  selectedStaff: string;
  setSelectedStaff: (staffId: string) => void;
}

// Memoized chart components to prevent unnecessary re-renders
const CollectionsPerformanceChart = memo(({ data }: { data: any[] }) => {
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

const VolumeVsFarmersChart = memo(({ data }: { data: any[] }) => {
  if (data.length === 0) return <div className="flex items-center justify-center h-full text-gray-500">No data available</div>;
  
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
        <XAxis dataKey="name" stroke="#9ca3af" />
        <YAxis stroke="#9ca3af" />
        <Tooltip 
          contentStyle={{ backgroundColor: '#1f2937', border: 'none' }} 
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
          dataKey="farmers" 
          stroke="#8b5cf6" 
          strokeWidth={3} 
          dot={{ fill: '#8b5cf6', r: 5 }} 
          activeDot={{ r: 8 }} 
          name="Farmers Served"
        />
      </LineChart>
    </ResponsiveContainer>
  );
});

const StaffView: React.FC<StaffViewProps> = memo(({
  staffPerformance,
  staff,
  selectedStaff,
  setSelectedStaff
}) => {
  // Get detailed data for selected staff
  const selectedStaffData = staffPerformance.find(s => s.id === selectedStaff) || staffPerformance[0];

  return (
    <div className="space-y-6">
      {/* Staff Selection */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <CardHeader>
          <CardTitle className="text-text-light dark:text-text-dark">Select Staff</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {staff.map((staffMember) => (
              <button
                key={staffMember.id}
                onClick={() => setSelectedStaff(staffMember.id)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  selectedStaff === staffMember.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {staffMember.profiles?.full_name || 'Unknown'}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedStaffData && (
        <>
          {/* Staff Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-900 border border-blue-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-blue-800 dark:text-blue-200">Total Collections</CardTitle>
                <Droplet className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-900 dark:text-blue-100">{selectedStaffData.collections}</div>
                <p className="text-xs text-blue-700 dark:text-blue-300">This period</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-gray-800 dark:to-gray-900 border border-green-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-green-800 dark:text-green-200">Total Volume</CardTitle>
                <Droplet className="h-5 w-5 text-green-600 dark:text-green-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-900 dark:text-green-100">{selectedStaffData.liters.toFixed(0)}L</div>
                <p className="text-xs text-green-700 dark:text-green-300">This period</p>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-gray-800 dark:to-gray-900 border border-purple-100 dark:border-gray-700">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium text-purple-800 dark:text-purple-200">Farmers Served</CardTitle>
                <Users className="h-5 w-5 text-purple-600 dark:text-purple-400" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-900 dark:text-purple-100">{selectedStaffData.farmers}</div>
                <p className="text-xs text-purple-700 dark:text-purple-300">Unique farmers</p>
              </CardContent>
            </Card>
          </div>

          {/* Staff Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Collections Performance */}
            <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
              <CardHeader>
                <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
                  <BarChart3 className="h-5 w-5 text-blue-500" />
                  Collections Performance
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <CollectionsPerformanceChart data={staffPerformance.slice(0, 10)} />
              </CardContent>
            </Card>

            {/* Volume vs Farmers Served */}
            <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
              <CardHeader>
                <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
                  <Users className="h-5 w-5 text-green-500" />
                  Volume vs Farmers Served
                </CardTitle>
              </CardHeader>
              <CardContent className="h-80">
                <VolumeVsFarmersChart data={staffPerformance.slice(0, 10)} />
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {/* All Staff List */}
      <Card className="bg-card-light dark:bg-card-dark border border-border-light dark:border-border-dark">
        <CardHeader>
          <CardTitle className="text-text-light dark:text-text-dark flex items-center gap-2">
            <UserCog className="h-5 w-5 text-blue-500" />
            All Staff
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark">
                  <th className="text-left py-3 px-4 text-subtle-text-light dark:text-subtle-text-dark">Staff</th>
                  <th className="text-left py-3 px-4 text-subtle-text-light dark:text-subtle-text-dark">Collections</th>
                  <th className="text-left py-3 px-4 text-subtle-text-light dark:text-subtle-text-dark">Volume</th>
                  <th className="text-left py-3 px-4 text-subtle-text-light dark:text-subtle-text-dark">Farmers Served</th>
                </tr>
              </thead>
              <tbody>
                {staffPerformance.map((staffMember, idx) => (
                  <tr 
                    key={idx} 
                    className="border-b border-border-light dark:border-border-dark hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    onClick={() => setSelectedStaff(staffMember.id)}
                  >
                    <td className="py-3 px-4 font-medium text-text-light dark:text-text-dark">{staffMember.name}</td>
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">{staffMember.collections}</td>
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">{staffMember.liters.toFixed(0)}L</td>
                    <td className="py-3 px-4 text-text-light dark:text-text-dark">{staffMember.farmers}</td>
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

export default StaffView;