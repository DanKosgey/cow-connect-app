import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { businessIntelligenceService } from '@/services/business-intelligence-service';
import { milkRateService } from '@/services/milk-rate-service';

interface DetailedBusinessInsightsProps {
  metrics: any;
  timeRange?: string;
}

const DetailedBusinessInsights = ({ metrics, timeRange = 'week' }: DetailedBusinessInsightsProps) => {
  const [detailedMetrics, setDetailedMetrics] = useState<any>({
    costPerLiter: 0,
    revenuePerFarmer: 0,
    totalCollectionTarget: 0,
    actualCollectionVolume: 0,
    totalFarmers: 0,
    activeFarmers: 0,
    totalQualityTests: 0,
    passedQualityTests: 0,
    currentPeriodVolume: 0,
    previousPeriodVolume: 0,
    totalRevenue: 0,
    totalOperatingCosts: 0
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedTimeRange, setSelectedTimeRange] = useState(timeRange);

  useEffect(() => {
    const fetchDetailedMetrics = async () => {
      try {
        setIsLoading(true);
        const metrics = await businessIntelligenceService.calculateBusinessIntelligenceMetrics(selectedTimeRange);
        
        // Find the cost per liter metric and update the detailed metrics
        const costPerLiterMetric = metrics.find(m => m.id === 'cost-per-liter');
        if (costPerLiterMetric) {
          setDetailedMetrics(prev => ({
            ...prev,
            costPerLiter: parseFloat(costPerLiterMetric.value.toString().replace('KES ', ''))
          }));
        }
        
        // Also fetch the current admin rate for more detailed information
        const currentRate = await milkRateService.getCurrentRate();
        setDetailedMetrics(prev => ({
          ...prev,
          costPerLiter: currentRate
        }));
      } catch (err) {
        console.error('Error fetching detailed metrics:', err);
        setError('Failed to load detailed business insights');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDetailedMetrics();
  }, [selectedTimeRange]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      minimumFractionDigits: 2
    }).format(amount);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  if (isLoading) {
    return (
      <Card className="shadow-xl">
        <CardHeader>
          <div className="flex flex-row items-center justify-between space-y-0 pb-2">
            <div className="h-6 bg-gray-200 rounded animate-pulse w-1/3"></div>
            <div className="h-4 bg-gray-200 rounded animate-pulse w-20"></div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 bg-gray-200 rounded animate-pulse"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Calculate derived metrics
  const collectionEfficiency = detailedMetrics.totalCollectionTarget > 0
    ? (detailedMetrics.actualCollectionVolume / detailedMetrics.totalCollectionTarget) * 100
    : 0;

  const farmerRetention = detailedMetrics.totalFarmers > 0
    ? (detailedMetrics.activeFarmers / detailedMetrics.totalFarmers) * 100
    : 0;

  const qualityIndex = detailedMetrics.totalQualityTests > 0
    ? (detailedMetrics.passedQualityTests / detailedMetrics.totalQualityTests) * 100
    : 0;

  const seasonalTrend = detailedMetrics.previousPeriodVolume > 0
    ? ((detailedMetrics.currentPeriodVolume - detailedMetrics.previousPeriodVolume) / detailedMetrics.previousPeriodVolume) * 100
    : 0;

  const profitMargin = detailedMetrics.totalRevenue > 0
    ? ((detailedMetrics.totalRevenue - (detailedMetrics.actualCollectionVolume * detailedMetrics.costPerLiter)) / detailedMetrics.totalRevenue) * 100
    : 0;

  const revenuePerLiter = detailedMetrics.actualCollectionVolume > 0
    ? detailedMetrics.totalRevenue / detailedMetrics.actualCollectionVolume
    : 0;

  const grossProfitPerLiter = revenuePerLiter - detailedMetrics.costPerLiter;

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Business Insights Summary</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h3 className="font-semibold text-blue-900">Collection Efficiency</h3>
            <p className="text-2xl font-bold text-blue-600">{formatPercentage(collectionEfficiency)}</p>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <h3 className="font-semibold text-green-900">Farmer Retention</h3>
            <p className="text-2xl font-bold text-green-600">{formatPercentage(farmerRetention)}</p>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h3 className="font-semibold text-purple-900">Quality Index</h3>
            <p className="text-2xl font-bold text-purple-600">{qualityIndex.toFixed(1)}/100</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailedBusinessInsights;