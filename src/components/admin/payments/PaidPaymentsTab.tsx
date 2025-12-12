import React, { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import PaidCollectionsSection from '@/components/admin/payments/PaidCollectionsSection';

interface PaidPaymentsTabProps {
  timeFrame: string;
  customDateRange: { from: string; to: string };
  collections: any[];
  handleTimeFrameChange: (period: string) => void;
  resetFilters: () => void;
  handleCustomDateChange: (field: 'from' | 'to', value: string) => void;
  applyCustomDateRange: () => void;
}

const PaidPaymentsTab: React.FC<PaidPaymentsTabProps> = ({
  timeFrame,
  customDateRange,
  collections,
  handleTimeFrameChange,
  resetFilters,
  handleCustomDateChange,
  applyCustomDateRange
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  return (
    <div className="space-y-6">
      {/* Time Frame Filters */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h3 className="text-lg font-semibold text-gray-900">Filter by Time Period</h3>
          
          <div className="flex flex-wrap gap-2">
            {['all', 'daily', 'weekly', 'monthly', 'lastMonth'].map((period) => (
              <button
                key={period}
                onClick={() => handleTimeFrameChange(period)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  timeFrame === period
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {period === 'all' && 'All Time'}
                {period === 'daily' && 'Today'}
                {period === 'weekly' && 'This Week'}
                {period === 'monthly' && 'This Month'}
                {period === 'lastMonth' && 'Last Month'}
              </button>
            ))}
            
            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Reset Filters
            </button>
          </div>
        </div>
        
        {/* Custom Date Range */}
        <div className="mt-4 flex flex-col sm:flex-row gap-4 items-end">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
            <Input
              type="date"
              value={customDateRange.from}
              onChange={(e) => handleCustomDateChange('from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
            <Input
              type="date"
              value={customDateRange.to}
              onChange={(e) => handleCustomDateChange('to', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          
          <Button
            onClick={applyCustomDateRange}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
          >
            Apply Date Range
          </Button>
        </div>
        
        {/* Current Filter Display */}
        <div className="mt-4 text-sm text-gray-600">
          {timeFrame !== 'all' && (
            <p>
              Showing data for: 
              <span className="font-medium ml-1">
                {timeFrame === 'daily' && 'Today'}
                {timeFrame === 'weekly' && 'This Week'}
                {timeFrame === 'monthly' && 'This Month'}
                {timeFrame === 'lastMonth' && 'Last Month'}
                {timeFrame === 'custom' && `Custom Range: ${customDateRange.from} to ${customDateRange.to}`}
              </span>
            </p>
          )}
        </div>
      </div>

      <PaidCollectionsSection 
        collections={collections} 
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        filterStatus={filterStatus}
        setFilterStatus={setFilterStatus}
      />
    </div>
  );
};

export default PaidPaymentsTab;