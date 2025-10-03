import React, { useState, useEffect } from 'react';
import { usePerformance } from '@/contexts/PerformanceContext';

interface PerformanceData {
  id: string;
  name: string;
  value: number;
  timestamp: string;
  userAgent: string;
}

const PerformanceDashboard: React.FC = () => {
  const { metrics } = usePerformance();
  const [performanceData, setPerformanceData] = useState<PerformanceData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPerformanceData = async () => {
      try {
        // In a real implementation, this would fetch from your backend
        // const response = await fetch('/api/v1/analytics/performance-dashboard');
        // const data = await response.json();
        // setPerformanceData(data);
        
        // For now, we'll use mock data
        const mockData: PerformanceData[] = [
          {
            id: '1',
            name: 'LCP',
            value: 1200,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          },
          {
            id: '2',
            name: 'CLS',
            value: 0.05,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          },
          {
            id: '3',
            name: 'INP',
            value: 45,
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent
          }
        ];
        
        setPerformanceData(mockData);
        setLoading(false);
      } catch (error) {
        console.error('Failed to fetch performance data:', error);
        setLoading(false);
      }
    };

    fetchPerformanceData();
  }, []);

  const formatMetricValue = (name: string, value: number): string => {
    switch (name) {
      case 'LCP':
        return `${value}ms`;
      case 'CLS':
        return value.toFixed(3);
      case 'INP':
        return `${value}ms`;
      case 'FCP':
        return `${value}ms`;
      case 'TTFB':
        return `${value}ms`;
      default:
        return value.toString();
    }
  };

  const getMetricRating = (name: string, value: number): string => {
    switch (name) {
      case 'LCP':
        return value < 2500 ? 'good' : value < 4000 ? 'needs-improvement' : 'poor';
      case 'CLS':
        return value < 0.1 ? 'good' : value < 0.25 ? 'needs-improvement' : 'poor';
      case 'INP':
        return value < 200 ? 'good' : value < 500 ? 'needs-improvement' : 'poor';
      case 'FCP':
        return value < 1800 ? 'good' : value < 3000 ? 'needs-improvement' : 'poor';
      case 'TTFB':
        return value < 800 ? 'good' : value < 1800 ? 'needs-improvement' : 'poor';
      default:
        return 'unknown';
    }
  };

  const getRatingColor = (rating: string): string => {
    switch (rating) {
      case 'good':
        return 'text-green-600';
      case 'needs-improvement':
        return 'text-yellow-600';
      case 'poor':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <h2 className="text-2xl font-bold mb-4">Performance Dashboard</h2>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Performance Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {Object.entries(metrics).map(([name, value]) => {
          if (value === undefined) return null;
          
          const rating = getMetricRating(name, value);
          const color = getRatingColor(rating);
          
          return (
            <div key={name} className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-2">{name}</h3>
              <p className={`text-3xl font-bold ${color}`}>
                {formatMetricValue(name, value)}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Rating: <span className={color}>{rating}</span>
              </p>
            </div>
          );
        })}
      </div>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <h3 className="text-xl font-semibold p-4 border-b">Recent Performance Data</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Metric
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Value
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Timestamp
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User Agent
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {performanceData.map((data) => (
                <tr key={data.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {data.name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {formatMetricValue(data.name, data.value)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(data.timestamp).toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {data.userAgent.substring(0, 50)}...
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboard;