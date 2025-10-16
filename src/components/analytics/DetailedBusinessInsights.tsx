import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3, TrendingUp, TrendingDown, Users, DollarSign, Activity, Award, ChevronUp, ChevronDown } from 'lucide-react';
import { businessIntelligenceService } from '@/services/business-intelligence-service';
import { trendService } from '@/services/trend-service';
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

  const roi = detailedMetrics.totalOperatingCosts > 0
    ? ((detailedMetrics.totalRevenue - (detailedMetrics.actualCollectionVolume * detailedMetrics.costPerLiter)) / detailedMetrics.totalOperatingCosts) * 100
    : 0;

  const revenuePerLiter = detailedMetrics.actualCollectionVolume > 0
    ? detailedMetrics.totalRevenue / detailedMetrics.actualCollectionVolume
    : 0;

  const grossProfitPerLiter = revenuePerLiter - detailedMetrics.costPerLiter;

  // Determine ratings
  const efficiencyRating = collectionEfficiency >= 95 ? 'Excellent' : 
                          collectionEfficiency >= 80 ? 'Good' : 
                          collectionEfficiency >= 65 ? 'Fair' : 'Needs Improvement';
  
  const retentionRating = farmerRetention >= 90 ? 'Excellent' : 
                         farmerRetention >= 75 ? 'Good' : 
                         farmerRetention >= 60 ? 'Fair' : 'Needs Attention';

  const qualityRating = qualityIndex >= 95 ? 'Excellent' : 
                       qualityIndex >= 85 ? 'Good' : 
                       qualityIndex >= 70 ? 'Fair' : 'Needs Improvement';

  // Determine rating colors
  const getRatingColor = (rating: string) => {
    switch (rating) {
      case 'Excellent': return 'text-green-600';
      case 'Good': return 'text-blue-600';
      case 'Fair': return 'text-yellow-600';
      case 'Needs Improvement':
      case 'Needs Attention': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  // Determine status colors
  const getStatusColor = (value: number, thresholds: number[]) => {
    if (value >= thresholds[0]) return 'bg-green-500';
    if (value >= thresholds[1]) return 'bg-blue-500';
    if (value >= thresholds[2]) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <Card className="shadow-xl hover:shadow-2xl transition-all duration-300">
      <CardHeader>
        <div className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-xl font-bold">Detailed Business Insights</CardTitle>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-muted-foreground">Live Data</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Operational Efficiency Table */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                Operational Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Metric</th>
                      <th className="text-left py-3 px-4 font-medium">Value</th>
                      <th className="text-left py-3 px-4 font-medium">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium">Collection Efficiency</td>
                      <td className="py-3 px-4">{formatPercentage(collectionEfficiency)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(collectionEfficiency, [95, 80, 65])}`}></div>
                          <span className={`text-sm ${getRatingColor(efficiencyRating)}`}>{efficiencyRating}</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium">Farmer Retention</td>
                      <td className="py-3 px-4">{formatPercentage(farmerRetention)}</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(farmerRetention, [90, 75, 60])}`}></div>
                          <span className={`text-sm ${getRatingColor(retentionRating)}`}>{retentionRating}</span>
                        </div>
                      </td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium">Quality Index</td>
                      <td className="py-3 px-4">{qualityIndex.toFixed(1)}/100</td>
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2">
                          <div className={`w-3 h-3 rounded-full ${getStatusColor(qualityIndex, [95, 85, 70])}`}></div>
                          <span className={`text-sm ${getRatingColor(qualityRating)}`}>{qualityRating}</span>
                        </div>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Financial Performance Table */}
          <Card className="shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-green-500" />
                Financial Performance
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-3 px-4 font-medium">Metric</th>
                      <th className="text-left py-3 px-4 font-medium">Value</th>
                      <th className="text-left py-3 px-4 font-medium">Benchmark</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium">Admin Rate per Liter</td>
                      <td className="py-3 px-4">{formatCurrency(detailedMetrics.costPerLiter)}</td>
                      <td className="py-3 px-4 text-muted-foreground">KES 45-55</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium">Revenue per Farmer</td>
                      <td className="py-3 px-4">{formatCurrency(detailedMetrics.revenuePerFarmer)}</td>
                      <td className="py-3 px-4 text-muted-foreground">KES 15,000</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium">Profit Margin</td>
                      <td className={`py-3 px-4 font-medium ${
                        profitMargin >= 25 ? 'text-green-600' : 
                        profitMargin >= 15 ? 'text-blue-600' :
                        profitMargin >= 8 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(profitMargin)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">15-25%</td>
                    </tr>
                    <tr className="border-b hover:bg-gray-50 transition-colors">
                      <td className="py-3 px-4 font-medium">ROI</td>
                      <td className={`py-3 px-4 font-medium ${
                        roi >= 30 ? 'text-green-600' : 
                        roi >= 20 ? 'text-blue-600' :
                        roi >= 10 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        {formatPercentage(roi)}
                      </td>
                      <td className="py-3 px-4 text-muted-foreground">20-30%</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>

          {/* Market Trends Table */}
          <Card className="lg:col-span-2 shadow-lg hover:shadow-xl transition-shadow">
            <CardHeader>
              <div className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <TrendingUp className="h-5 w-5 text-purple-500" />
                  Market Trends & Analysis
                </CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Seasonal Trend</h3>
                    {seasonalTrend > 0 ? (
                      <TrendingUp className="h-5 w-5 text-green-500" />
                    ) : seasonalTrend < 0 ? (
                      <TrendingDown className="h-5 w-5 text-red-500" />
                    ) : (
                      <Activity className="h-5 w-5 text-gray-500" />
                    )}
                  </div>
                  <div className={`text-2xl font-bold mt-2 flex items-center ${
                    seasonalTrend > 0 ? 'text-green-600' : 
                    seasonalTrend < 0 ? 'text-red-600' : 'text-gray-600'
                  }`}>
                    {seasonalTrend > 0 ? <ChevronUp className="h-5 w-5" /> : seasonalTrend < 0 ? <ChevronDown className="h-5 w-5" /> : null}
                    {seasonalTrend > 0 ? '+' : ''}{formatPercentage(Math.abs(seasonalTrend))}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {seasonalTrend > 5 
                      ? 'Strong growth trend' 
                      : seasonalTrend > 0 
                        ? 'Moderate growth' 
                        : seasonalTrend < -5
                          ? 'Significant decline'
                          : seasonalTrend < 0
                            ? 'Slight decline'
                            : 'Stable conditions'}
                  </p>
                </div>

                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Operational Benchmark</h3>
                    <Award className="h-5 w-5 text-blue-500" />
                  </div>
                  <div className="text-2xl font-bold mt-2 text-blue-600">
                    {collectionEfficiency >= 95 ? 'Top Tier' : 
                     collectionEfficiency >= 80 ? 'Above Average' :
                     collectionEfficiency >= 65 ? 'Average' : 'Below Target'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {collectionEfficiency >= 95 
                      ? 'Exceptional performance' 
                      : collectionEfficiency >= 80
                        ? 'Strong performance'
                        : 'Room for improvement'}
                  </p>
                </div>

                <div className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">Farmer Satisfaction</h3>
                    <Users className="h-5 w-5 text-green-500" />
                  </div>
                  <div className="text-2xl font-bold mt-2 text-green-600">
                    {farmerRetention >= 90 ? 'High' : 
                     farmerRetention >= 75 ? 'Moderate' : 
                     farmerRetention >= 60 ? 'Fair' : 'Low'}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    {farmerRetention >= 90 
                      ? 'Excellent retention' 
                      : farmerRetention >= 75 
                        ? 'Stable relationships' 
                        : 'Needs attention'}
                  </p>
                </div>
              </div>

              <div className="mt-6">
                <Button className="w-full gradient-primary text-primary-foreground hover:opacity-90">
                  <BarChart3 className="h-4 w-4 mr-2" />
                  View Detailed Financial Report
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Key Insights Summary */}
        <div className="mt-6 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
          <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
            <Award className="h-4 w-4 mr-2" />
            Key Business Insights
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-3 bg-white rounded border">
              <span className="font-medium">Operational Health:</span> 
              <span className={`font-semibold ${getRatingColor(efficiencyRating)}`}>
                {' '}{efficiencyRating}
              </span>
            </div>
            <div className="p-3 bg-white rounded border">
              <span className="font-medium">Financial Performance:</span> 
              <span className={`font-semibold ${
                profitMargin >= 25 ? 'text-green-600' : 
                profitMargin >= 15 ? 'text-blue-600' :
                profitMargin >= 8 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {' '}{formatPercentage(profitMargin)} margin
              </span>
            </div>
            <div className="p-3 bg-white rounded border">
              <span className="font-medium">Market Position:</span> 
              <span className={`font-semibold ${seasonalTrend > 0 ? 'text-green-600' : seasonalTrend < 0 ? 'text-red-600' : 'text-gray-600'}`}>
                {' '}{seasonalTrend > 0 ? 'Growing' : seasonalTrend < 0 ? 'Declining' : 'Stable'}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailedBusinessInsights;