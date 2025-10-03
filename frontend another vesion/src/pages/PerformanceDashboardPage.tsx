import React from 'react';
import PerformanceDashboard from '@/components/PerformanceDashboard';
import { usePerformance } from '@/contexts/PerformanceContext';

const PerformanceDashboardPage: React.FC = () => {
  const { checkPerformanceBudgets } = usePerformance();

  const handleCheckBudgets = () => {
    checkPerformanceBudgets();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="flex justify-between items-center mb-6">
            <h1 className="text-3xl font-bold text-gray-900">Performance Dashboard</h1>
            <button
              onClick={handleCheckBudgets}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
            >
              Check Performance Budgets
            </button>
          </div>
          
          <div className="bg-white shadow overflow-hidden sm:rounded-lg">
            <PerformanceDashboard />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PerformanceDashboardPage;