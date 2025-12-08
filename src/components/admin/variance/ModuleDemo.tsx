import React, { useState, useEffect } from 'react';
import * as dataFetching from './modules/dataFetching';
import * as helpers from './modules/helpers';

const ModuleDemo: React.FC = () => {
  const [collectors, setCollectors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [formattedValue, setFormattedValue] = useState('');
  const [chartData, setChartData] = useState<any[]>([]);

  useEffect(() => {
    // Demo data fetching module
    const loadDemoData = async () => {
      // Simulate fetching collectors
      const demoCollectors = [
        { id: '1', full_name: 'John Doe' },
        { id: '2', full_name: 'Jane Smith' },
        { id: '3', full_name: 'Bob Johnson' }
      ];
      setCollectors(demoCollectors);
      
      // Demo helper functions
      const formatted = helpers.formatNumber(1234.56, 2);
      setFormattedValue(formatted);
      
      // Demo chart data preparation
      const demoTrendData = [
        { date: '2023-01-01', positive: 10, negative: 5 },
        { date: '2023-01-02', positive: 15, negative: 3 },
        { date: '2023-01-03', positive: 8, negative: 7 }
      ];
      
      const preparedData = helpers.prepareChartData.trendChartData(demoTrendData);
      setChartData(preparedData);
      
      setLoading(false);
    };
    
    loadDemoData();
  }, []);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-center">Module Demonstration</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-blue-600">Data Fetching Module</h2>
          <p className="mb-4">This module handles all data operations:</p>
          <ul className="list-disc pl-5 space-y-2">
            <li>fetchCollectors</li>
            <li>fetchVarianceData</li>
            <li>fetchSummaryData</li>
            <li>fetchCollectorPerformance</li>
            <li>fetchTrendData</li>
            <li>fetchComparisonData</li>
            <li>fetchFarmerHistory</li>
          </ul>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-4 text-green-600">Helper Functions Module</h2>
          <p className="mb-4">This module provides utility functions:</p>
          <div className="space-y-3">
            <div>
              <strong>Format Number:</strong> {formattedValue}
            </div>
            <div>
              <strong>Calculate Percentage Change:</strong> {helpers.calculatePercentageChange(120, 100).toFixed(2)}%
            </div>
            <div>
              <strong>Variance Type Color:</strong> 
              <span className={`ml-2 px-2 py-1 rounded ${helpers.getVarianceTypeColor('positive')}`}>Positive</span>
              <span className={`ml-2 px-2 py-1 rounded ${helpers.getVarianceTypeColor('negative')}`}>Negative</span>
            </div>
          </div>
        </div>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4 text-purple-600">Dashboard Sections Module</h2>
        <p className="mb-4">Reusable UI components for dashboard sections:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>HeaderSection</li>
          <li>FiltersSection</li>
          <li>SummaryCardsSection</li>
          <li>PerformanceMetricsSection</li>
          <li>ChartsSection</li>
        </ul>
      </div>
      
      <div className="bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-4 text-yellow-600">Implementation Benefits</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border-l-4 border-blue-500 pl-4">
            <h3 className="font-semibold">Maintainability</h3>
            <p className="text-sm text-gray-600">Smaller, focused files are easier to understand and modify</p>
          </div>
          <div className="border-l-4 border-green-500 pl-4">
            <h3 className="font-semibold">Reusability</h3>
            <p className="text-sm text-gray-600">Modules can be reused across different components</p>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h3 className="font-semibold">Testability</h3>
            <p className="text-sm text-gray-600">Individual modules can be tested in isolation</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ModuleDemo;