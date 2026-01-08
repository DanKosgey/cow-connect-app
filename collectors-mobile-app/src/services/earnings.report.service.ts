
import { getDatabase } from './database';

export interface EarningsReportData {
    period: 'today' | 'week' | 'month' | 'custom';
    startDate: string;
    endDate: string;
    totalEarnings: number;
    totalLiters: number;
    totalCollections: number;
    uniqueFarmers: number;
    averageRate: number;
    breakdown: {
        date: string;
        earnings: number;
        liters: number;
        collections: number;
        farmers: number;
        avgRate: number;
    }[];
    topFarmers: {
        farmerId: string;
        farmerName: string;
        totalLiters: number;
        totalEarnings: number;
        collections: number;
        contribution: number; // Percentage
    }[];
    rateHistory: {
        rate: number;
        startDate: string;
        endDate: string;
        liters: number;
        earnings: number;
    }[];
}

export const earningsReportService = {
    async generateReport(
        collectorId: string,
        startDate: Date,
        endDate: Date
    ): Promise<EarningsReportData> {
        const db = await getDatabase();

        // Fetch all collections in range
        const collections = await db.getAllAsync(`
            SELECT 
                c.liters, 
                c.rate, 
                c.total_amount, 
                c.created_at, 
                c.farmer_id,
                f.full_name as farmer_name
            FROM collections_queue c
            LEFT JOIN farmers_local f ON c.farmer_id = f.id
            WHERE c.collector_id = ? 
            AND c.created_at >= ? 
            AND c.created_at <= ?
            ORDER BY c.created_at ASC
        `, [collectorId, startDate.toISOString(), endDate.toISOString()]);

        // Calculate totals
        const totalEarnings = collections.reduce((sum: number, c: any) => sum + (c.total_amount || 0), 0);
        const totalLiters = collections.reduce((sum: number, c: any) => sum + (c.liters || 0), 0);
        const uniqueFarmers = new Set(collections.map((c: any) => c.farmer_id)).size;
        const weightedRateSum = collections.reduce((sum: number, c: any) => sum + (c.rate * c.liters), 0);
        const averageRate = totalLiters > 0 ? (weightedRateSum / totalLiters) : 0;

        // Daily breakdown
        const dailyMap: { [key: string]: any } = {};
        collections.forEach((c: any) => {
            const dateKey = c.created_at.split('T')[0];
            if (!dailyMap[dateKey]) {
                dailyMap[dateKey] = {
                    date: dateKey,
                    earnings: 0,
                    liters: 0,
                    collections: 0,
                    farmers: new Set(),
                    rateSum: 0
                };
            }
            dailyMap[dateKey].earnings += c.total_amount;
            dailyMap[dateKey].liters += c.liters;
            dailyMap[dateKey].collections += 1;
            dailyMap[dateKey].farmers.add(c.farmer_id);
            dailyMap[dateKey].rateSum += (c.rate * c.liters);
        });

        const breakdown = Object.values(dailyMap).map((d: any) => ({
            date: d.date,
            earnings: d.earnings,
            liters: d.liters,
            collections: d.collections,
            farmers: d.farmers.size,
            avgRate: d.liters > 0 ? (d.rateSum / d.liters) : 0
        }));

        // Top farmers
        const farmerMap: { [key: string]: any } = {};
        collections.forEach((c: any) => {
            if (!farmerMap[c.farmer_id]) {
                farmerMap[c.farmer_id] = {
                    farmerId: c.farmer_id,
                    farmerName: c.farmer_name || 'Unknown',
                    totalLiters: 0,
                    totalEarnings: 0,
                    collections: 0
                };
            }
            farmerMap[c.farmer_id].totalLiters += c.liters;
            farmerMap[c.farmer_id].totalEarnings += c.total_amount;
            farmerMap[c.farmer_id].collections += 1;
        });

        const topFarmers = Object.values(farmerMap)
            .map((f: any) => ({
                ...f,
                contribution: totalEarnings > 0 ? (f.totalEarnings / totalEarnings) * 100 : 0
            }))
            .sort((a: any, b: any) => b.totalEarnings - a.totalEarnings)
            .slice(0, 10);

        // Rate history
        const rateMap: { [key: number]: any } = {};
        collections.forEach((c: any) => {
            const rate = c.rate;
            if (!rateMap[rate]) {
                rateMap[rate] = {
                    rate,
                    dates: [],
                    liters: 0,
                    earnings: 0
                };
            }
            rateMap[rate].dates.push(c.created_at);
            rateMap[rate].liters += c.liters;
            rateMap[rate].earnings += c.total_amount;
        });

        const rateHistory = Object.values(rateMap).map((r: any) => {
            const sortedDates = r.dates.sort();
            return {
                rate: r.rate,
                startDate: sortedDates[0],
                endDate: sortedDates[sortedDates.length - 1],
                liters: r.liters,
                earnings: r.earnings
            };
        }).sort((a: any, b: any) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());

        return {
            period: 'custom',
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            totalEarnings,
            totalLiters,
            totalCollections: collections.length,
            uniqueFarmers,
            averageRate,
            breakdown,
            topFarmers,
            rateHistory
        };
    }
};
