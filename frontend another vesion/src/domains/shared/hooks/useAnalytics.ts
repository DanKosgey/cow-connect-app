import { useState } from 'react';
import { format, subDays, subMonths } from 'date-fns';

interface AnalyticsMetric {
  timestamp: Date;
  value: number;
}

interface FarmMetrics {
  production: number;
  quality: number;
  efficiency: number;
  revenue: number;
}

export function useAnalytics() {
  // Generate sample historical data
  const generateHistoricalData = (days: number, baseValue: number, volatility: number) => {
    return Array.from({ length: days }, (_, i) => ({
      timestamp: subDays(new Date(), days - i - 1),
      value: baseValue + Math.random() * volatility - volatility / 2,
    }));
  };

  // Generate daily farm metrics
  const generateFarmMetrics = (): Record<string, FarmMetrics> => {
    const farms: Record<string, FarmMetrics> = {};
    for (let i = 1; i <= 150; i++) {
      farms[`Farm ${i}`] = {
        production: 2000 + Math.random() * 1000,
        quality: 70 + Math.random() * 30,
        efficiency: 75 + Math.random() * 25,
        revenue: 100000 + Math.random() * 50000,
      };
    }
    return farms;
  };

  // Initialize state with generated data
  const [productionHistory] = useState<AnalyticsMetric[]>(
    generateHistoricalData(30, 2800, 200)
  );
  const [qualityHistory] = useState<AnalyticsMetric[]>(
    generateHistoricalData(30, 85, 5)
  );
  const [revenueHistory] = useState<AnalyticsMetric[]>(
    generateHistoricalData(30, 3200000, 200000)
  );
  const [farmMetrics] = useState(generateFarmMetrics());

  // Analysis functions
  const getProductionTrend = () => {
    const recent = productionHistory.slice(-7);
    const weekAgo = recent[0].value;
    const current = recent[recent.length - 1].value;
    return ((current - weekAgo) / weekAgo) * 100;
  };

  const getTopPerformers = (metric: keyof FarmMetrics, count: number = 5) => {
    return Object.entries(farmMetrics)
      .sort(([, a], [, b]) => b[metric] - a[metric])
      .slice(0, count);
  };

  const getQualityDistribution = () => {
    const distribution = {
      'Grade A': 0,
      'Grade B': 0,
      'Grade C': 0,
    };

    Object.values(farmMetrics).forEach(farm => {
      if (farm.quality >= 90) distribution['Grade A']++;
      else if (farm.quality >= 80) distribution['Grade B']++;
      else distribution['Grade C']++;
    });

    return distribution;
  };

  const getAggregateMetrics = () => {
    const farms = Object.values(farmMetrics);
    return {
      totalProduction: farms.reduce((sum, farm) => sum + farm.production, 0),
      averageQuality: farms.reduce((sum, farm) => sum + farm.quality, 0) / farms.length,
      totalRevenue: farms.reduce((sum, farm) => sum + farm.revenue, 0),
      averageEfficiency: farms.reduce((sum, farm) => sum + farm.efficiency, 0) / farms.length,
    };
  };

  // Anomaly detection
  const detectAnomalies = () => {
    const anomalies = [];
    const aggregates = getAggregateMetrics();

    Object.entries(farmMetrics).forEach(([farmId, metrics]) => {
      if (metrics.production < aggregates.totalProduction / 150 * 0.5) {
        anomalies.push({
          farm: farmId,
          type: 'production',
          description: 'Significant production drop',
          severity: 'high',
        });
      }
      if (metrics.quality < 70) {
        anomalies.push({
          farm: farmId,
          type: 'quality',
          description: 'Quality below threshold',
          severity: 'critical',
        });
      }
      if (metrics.efficiency < 60) {
        anomalies.push({
          farm: farmId,
          type: 'efficiency',
          description: 'Low operational efficiency',
          severity: 'medium',
        });
      }
    });

    return anomalies;
  };

  // Predictive analytics
  const generateForecast = (days: number = 7) => {
    const production = productionHistory.slice(-7);
    const trend = getProductionTrend();
    
    return Array.from({ length: days }, (_, i) => ({
      timestamp: subDays(new Date(), -i - 1),
      predicted: production[production.length - 1].value * (1 + trend / 100) ** (i + 1),
    }));
  };

  return {
    productionHistory,
    qualityHistory,
    revenueHistory,
    farmMetrics,
    getProductionTrend,
    getTopPerformers,
    getQualityDistribution,
    getAggregateMetrics,
    detectAnomalies,
    generateForecast,
  };
}
