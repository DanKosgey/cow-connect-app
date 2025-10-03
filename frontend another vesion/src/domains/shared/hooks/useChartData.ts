import { useState, useEffect, useMemo } from 'react';
import { Collection, Payment } from '@/types';

interface ChartDataPoint {
  date: string;
  value: number;
}

interface QualityDataPoint {
  grade: string;
  count: number;
}

interface PaymentProjection {
  currentMonthLiters: number;
  currentMonthAmount: number;
  projectedNextMonthLiters: number;
  projectedNextMonthAmount: number;
  growthRate: number;
  confidenceLevel: number;
}

export const useChartData = (collections: Collection[], payments: Payment[]) => {
  const [dailyData, setDailyData] = useState<ChartDataPoint[]>([]);
  const [weeklyData, setWeeklyData] = useState<ChartDataPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<ChartDataPoint[]>([]);
  const [qualityData, setQualityData] = useState<QualityDataPoint[]>([]);
  const [paymentProjection, setPaymentProjection] = useState<PaymentProjection | null>(null);

  // Process daily collection data
  useEffect(() => {
    if (collections.length === 0) return;

    const dailyMap: Record<string, number> = {};
    
    collections.forEach(collection => {
      const date = new Date(collection.timestamp).toISOString().split('T')[0];
      if (!dailyMap[date]) {
        dailyMap[date] = 0;
      }
      dailyMap[date] += collection.liters;
    });

    const dailyChartData = Object.entries(dailyMap)
      .map(([date, liters]) => ({ date, value: liters }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setDailyData(dailyChartData);
  }, [collections]);

  // Process weekly collection data
  useEffect(() => {
    if (collections.length === 0) return;

    const weeklyMap: Record<string, number> = {};
    
    collections.forEach(collection => {
      const date = new Date(collection.timestamp);
      // Get the Monday of the week
      const monday = new Date(date);
      const day = monday.getDay();
      const diff = monday.getDate() - day + (day === 0 ? -6 : 1);
      monday.setDate(diff);
      monday.setHours(0, 0, 0, 0);
      
      const weekKey = monday.toISOString().split('T')[0];
      
      if (!weeklyMap[weekKey]) {
        weeklyMap[weekKey] = 0;
      }
      weeklyMap[weekKey] += collection.liters;
    });

    const weeklyChartData = Object.entries(weeklyMap)
      .map(([date, liters]) => ({ date, value: liters }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setWeeklyData(weeklyChartData);
  }, [collections]);

  // Process monthly collection data
  useEffect(() => {
    if (collections.length === 0) return;

    const monthlyMap: Record<string, number> = {};
    
    collections.forEach(collection => {
      const date = new Date(collection.timestamp);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      
      if (!monthlyMap[monthKey]) {
        monthlyMap[monthKey] = 0;
      }
      monthlyMap[monthKey] += collection.liters;
    });

    const monthlyChartData = Object.entries(monthlyMap)
      .map(([date, liters]) => ({ date, value: liters }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    setMonthlyData(monthlyChartData);
  }, [collections]);

  // Process quality grade distribution
  useEffect(() => {
    if (collections.length === 0) return;

    const qualityMap: Record<string, number> = {
      'A': 0,
      'B': 0,
      'C': 0
    };
    
    collections.forEach(collection => {
      if (collection.qualityGrade in qualityMap) {
        qualityMap[collection.qualityGrade]++;
      }
    });

    const qualityChartData = Object.entries(qualityMap)
      .map(([grade, count]) => ({ grade, count }));

    setQualityData(qualityChartData);
  }, [collections]);

  // Calculate payment projections
  useEffect(() => {
    if (collections.length === 0) return;

    // Calculate current month data
    const now = new Date();
    const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    
    const currentMonthCollections = collections.filter(collection => {
      const collectionDate = new Date(collection.timestamp);
      const collectionMonth = `${collectionDate.getFullYear()}-${String(collectionDate.getMonth() + 1).padStart(2, '0')}`;
      return collectionMonth === currentMonth;
    });

    const currentMonthLiters = currentMonthCollections.reduce((sum, c) => sum + c.liters, 0);
    
    // Simple rate calculation (in a real app, this would come from the backend)
    const ratePerLiter = 50; // KES per liter
    const currentMonthAmount = currentMonthLiters * ratePerLiter;

    // Calculate previous month data for growth rate
    const previousDate = new Date(now);
    previousDate.setMonth(previousDate.getMonth() - 1);
    const previousMonth = `${previousDate.getFullYear()}-${String(previousDate.getMonth() + 1).padStart(2, '0')}`;
    
    const previousMonthCollections = collections.filter(collection => {
      const collectionDate = new Date(collection.timestamp);
      const collectionMonth = `${collectionDate.getFullYear()}-${String(collectionDate.getMonth() + 1).padStart(2, '0')}`;
      return collectionMonth === previousMonth;
    });

    const previousMonthLiters = previousMonthCollections.reduce((sum, c) => sum + c.liters, 0);
    
    let growthRate = 0;
    if (previousMonthLiters > 0) {
      growthRate = (currentMonthLiters - previousMonthLiters) / previousMonthLiters;
    } else if (currentMonthLiters > 0) {
      growthRate = 0.05; // Default 5% growth if no previous data
    }

    // Project next month
    const projectedNextMonthLiters = currentMonthLiters * (1 + growthRate);
    const projectedNextMonthAmount = currentMonthAmount * (1 + growthRate);
    
    // Confidence level based on data consistency
    const confidenceLevel = Math.min(0.95, 0.7 + (currentMonthCollections.length * 0.01));

    setPaymentProjection({
      currentMonthLiters: parseFloat(currentMonthLiters.toFixed(2)),
      currentMonthAmount: parseFloat(currentMonthAmount.toFixed(2)),
      projectedNextMonthLiters: parseFloat(projectedNextMonthLiters.toFixed(2)),
      projectedNextMonthAmount: parseFloat(projectedNextMonthAmount.toFixed(2)),
      growthRate: parseFloat(growthRate.toFixed(4)),
      confidenceLevel: parseFloat(confidenceLevel.toFixed(4))
    });
  }, [collections]);

  return {
    dailyData,
    weeklyData,
    monthlyData,
    qualityData,
    paymentProjection
  };
};