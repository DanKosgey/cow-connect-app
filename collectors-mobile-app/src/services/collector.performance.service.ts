
import { getDatabase } from './database';

export interface CollectorPerformanceMetrics {
    period: 'today' | 'week' | 'month';
    totalEarnings: number;
    totalLiters: number;
    totalCollections: number;
    uniqueFarmers: number;
    avgLitersPerFarmer: number;
    averageRate: number;
    daysActive: number;
    projectedEarnings?: number;
    comparison?: {
        earningsChange: number; // Percentage
        litersChange: number;   // Percentage
        isPositive: boolean;
    };
    health?: {
        effectiveness: 'High' | 'Medium' | 'Low';
        consistency: number; // 0-100
    };
    dailyTarget?: number;
}

export const collectorPerformanceService = {

    async getPerformanceMetrics(collectorId: string): Promise<{
        today: CollectorPerformanceMetrics;
        week: CollectorPerformanceMetrics;
        month: CollectorPerformanceMetrics;
        chartData: any[];
        insight: string;
        dailyTarget: number;
    }> {
        const db = await getDatabase();

        // Fetch User Goal
        let dailyTarget = 200; // Default
        try {
            const goalSetting = await db.getFirstAsync('SELECT value FROM app_settings WHERE key = "goal_dailyLiterTarget"') as any;
            if (goalSetting && goalSetting.value) {
                dailyTarget = parseFloat(goalSetting.value);
            }
        } catch (e) {
            // Ignore, use default
        }

        const now = new Date();

        // --- Helper: Get Data ---
        const getRawData = async (start: Date, end: Date) => {
            return await db.getAllAsync(`
                SELECT liters, rate, total_amount, created_at, farmer_id
                FROM collections_queue
                WHERE collector_id = ? AND created_at >= ? AND created_at <= ?
                ORDER BY created_at ASC
            `, [collectorId, start.toISOString(), end.toISOString()]);
        };

        // --- Today ---
        const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
        const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
        const todayData = await getRawData(startToday, endToday);
        const todayMetrics = this.calculateMetrics(todayData, 'today');
        todayMetrics.dailyTarget = dailyTarget;

        // ... rest of logic (This Week)
        // actually user asked for "This Week", let's use actual week start (Sunday)
        const startWeek = new Date(now);
        startWeek.setDate(now.getDate() - now.getDay()); // Go back to Sunday
        startWeek.setHours(0, 0, 0, 0);

        const weekData = await getRawData(startWeek, endToday);

        // --- Last Week (for comparison) ---
        const startLastWeek = new Date(startWeek);
        startLastWeek.setDate(startLastWeek.getDate() - 7);
        const endLastWeek = new Date(startWeek);
        endLastWeek.setSeconds(endLastWeek.getSeconds() - 1); // Just before this week start

        const lastWeekData = await getRawData(startLastWeek, endLastWeek);
        const lastWeekMetrics = this.calculateMetrics(lastWeekData, 'week');

        const weekMetrics = this.calculateMetrics(weekData, 'week');
        weekMetrics.comparison = this.calculateComparison(weekMetrics, lastWeekMetrics);


        // --- This Month ---
        const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthData = await getRawData(startMonth, endToday);
        const monthMetrics = this.calculateMetrics(monthData, 'month');

        // Projection
        const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
        const dayOfMonth = now.getDate();
        if (dayOfMonth > 0) {
            const dailyAvg = monthMetrics.totalEarnings / dayOfMonth;
            monthMetrics.projectedEarnings = dailyAvg * daysInMonth;
        }

        // --- Health & Consistency ---
        // Consistency: Active days vs elapsed days in month
        const consistency = Math.round((monthMetrics.daysActive / dayOfMonth) * 100);
        // Effectiveness: Avg Liters per Collection (or per Farmer)
        // Heuristic: >15L combined avg is High, 10-15 Medium, <10 Low
        const effectivenessVal = monthMetrics.avgLitersPerFarmer;
        let effectiveness: 'High' | 'Medium' | 'Low' = 'Medium';
        if (effectivenessVal >= 15) effectiveness = 'High';
        else if (effectivenessVal < 8) effectiveness = 'Low';

        monthMetrics.health = { consistency, effectiveness };


        // --- Chart Data (Last 30 Days) ---
        const startChart = new Date(now);
        startChart.setDate(now.getDate() - 30);
        const chartRawData = await getRawData(startChart, endToday);
        const chartData = this.processChartData(chartRawData);


        // --- Dynamic Insight ---
        let insight = "Keep up the consistent work!";
        if (weekMetrics.comparison?.isPositive && weekMetrics.comparison.earningsChange > 20) {
            insight = `Great job! Your earnings are up ${weekMetrics.comparison.earningsChange}% compared to last week.`;
        } else if (weekMetrics.comparison && !weekMetrics.comparison.isPositive) {
            insight = `Earnings down ${Math.abs(weekMetrics.comparison.earningsChange)}% vs last week. Check "Farmers" screen for declining volumes.`;
        } else if (todayMetrics.totalLiters > (monthMetrics.totalLiters / monthMetrics.daysActive) * 1.2) {
            insight = "Excellent! You collected 20% more today than your monthly average.";
        }

        return {
            today: todayMetrics,
            week: weekMetrics,
            month: monthMetrics,
            chartData,
            insight,
            dailyTarget
        };
    },

    calculateMetrics(data: any[], period: 'today' | 'week' | 'month'): CollectorPerformanceMetrics {
        const totalLiters = data.reduce((sum, item) => sum + (item.liters || 0), 0);
        const totalEarnings = data.reduce((sum, item) => sum + (item.total_amount || 0), 0);
        const uniqueFarmers = new Set(data.map((item: any) => item.farmer_id)).size;

        const weightedRateSum = data.reduce((sum, item) => sum + (item.rate * item.liters), 0);
        const averageRate = totalLiters > 0 ? (weightedRateSum / totalLiters) : 0;
        const uniqueDates = new Set(data.map((item: any) => item.created_at.split('T')[0])).size;

        return {
            period,
            totalEarnings,
            totalLiters,
            totalCollections: data.length,
            uniqueFarmers,
            avgLitersPerFarmer: uniqueFarmers > 0 ? (totalLiters / uniqueFarmers) : 0,
            averageRate,
            daysActive: uniqueDates
        };
    },

    calculateComparison(current: CollectorPerformanceMetrics, previous: CollectorPerformanceMetrics) {
        if (previous.totalEarnings === 0) return { earningsChange: 100, litersChange: 100, isPositive: true };

        const change = ((current.totalEarnings - previous.totalEarnings) / previous.totalEarnings) * 100;
        const litersChange = ((current.totalLiters - previous.totalLiters) / previous.totalLiters) * 100;

        return {
            earningsChange: Math.round(change),
            litersChange: Math.round(litersChange),
            isPositive: change >= 0
        };
    },

    processChartData(data: any[]) {
        const groupByDate: { [key: string]: any } = {};
        data.forEach((item: any) => {
            const dateStr = item.created_at.split('T')[0];
            if (!groupByDate[dateStr]) {
                groupByDate[dateStr] = { date: dateStr, liters: 0, earnings: 0, farmers: new Set() };
            }
            groupByDate[dateStr].liters += item.liters;
            groupByDate[dateStr].earnings += item.total_amount;
            groupByDate[dateStr].farmers.add(item.farmer_id);
        });

        // Ensure last 7 days exist at least with 0 if empty? 
        // For now just show active days
        return Object.values(groupByDate).map((d: any) => ({
            label: `${new Date(d.date).getDate()}/${new Date(d.date).getMonth() + 1}`,
            date: d.date,
            liters: d.liters,
            earnings: d.earnings,
            farmers: d.farmers.size
        })).sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    }
};
