import { getDatabase } from './database';
import { collectorRateService } from './collector.rate.service';

export interface ChartPoint {
    label: string;
    date: string;
    earnings: number;
    liters: number; // Added back
    farmers: number; // Unique farmers served count
    collections: number; // Frequency count
}

export interface RefinedPerformanceMetrics {
    overview: {
        totalEarnings: number;
        totalLiters: number;
        activeFarmers: number;
        totalCollections: number;
        efficiency: number; // Liters per collection average
    };
    today: {
        earnings: number;
        liters: number;
        farmers: number;
        collections: number;
    };
    thisMonth: {
        earnings: number;
        liters: number;
        farmers: number;
        collections: number;
        daysActive: number;
    };
    trends: {
        week: ChartPoint[]; // Last 7 days daily
        month: ChartPoint[]; // Last 30 days daily
        year: ChartPoint[]; // Last 12 months monthly
    };
    insights: {
        busiestTime: string;
        topFarmerName: string;
        growthRate: number; // % change in earnings vs last period
    };
    ath: {
        value: number;
        date: string;
        type: 'Earnings' | 'Liters';
    };
}

export const collectorPerformanceService = {

    async getPerformanceMetrics(collectorId: string): Promise<RefinedPerformanceMetrics> {
        const db = await getDatabase();
        const currentRate = await collectorRateService.getCurrentRate();
        const now = new Date();

        // 1. Fetch All Data for processing
        const allData = await db.getAllAsync(`
            SELECT 
                cq.liters, 
                cq.created_at, 
                cq.farmer_id,
                COALESCE(cq.farmer_name, f.full_name, 'Unknown') as farmer_name
            FROM collections_queue cq
            LEFT JOIN farmers_local f ON cq.farmer_id = f.id
            WHERE cq.collector_id = ? 
            ORDER BY cq.created_at ASC
        `, [collectorId]);

        // 2. Overview Calculations
        const totalLiters = allData.reduce((sum: number, item: any) => sum + item.liters, 0);
        const totalEarnings = totalLiters * currentRate;
        const totalCollections = allData.length;
        const uniqueFarmers = new Set(allData.map((item: any) => item.farmer_id)).size;
        const efficiency = totalCollections > 0 ? totalLiters / totalCollections : 0;

        // Helper for specific ranges
        const getMetricsForRange = (start: Date, end: Date) => {
            const items = allData.filter((d: any) => {
                const date = new Date(d.created_at);
                return date >= start && date <= end;
            });
            const l = items.reduce((sum: number, i: any) => sum + i.liters, 0);
            return {
                liters: l,
                earnings: l * currentRate,
                farmers: new Set(items.map((i: any) => i.farmer_id)).size,
                collections: items.length,
                daysActive: new Set(items.map((i: any) => i.created_at.split('T')[0])).size
            };
        };

        // Today's Metrics
        const startToday = new Date(now); startToday.setHours(0, 0, 0, 0);
        const endToday = new Date(now); endToday.setHours(23, 59, 59, 999);
        const todayMetrics = getMetricsForRange(startToday, endToday);

        // This Month's Metrics (1st to now)
        const startCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const thisMonthMetrics = getMetricsForRange(startCurrentMonth, endToday);

        // 3. Trend Processing
        const processTrend = (startDate: Date, endDate: Date, interval: 'day' | 'week' | 'month'): ChartPoint[] => {
            const points: { [key: string]: ChartPoint } = {};
            const rangeData = allData.filter((d: any) => {
                const date = new Date(d.created_at);
                return date >= startDate && date <= endDate;
            });

            // Iterate through every expected point in range to ensure continuity
            const current = new Date(startDate);
            // Safety break to prevent infinite loops if dates are messed up
            let loops = 0;
            const MAX_LOOPS = 50;

            while (current <= endDate && loops < MAX_LOOPS) {
                loops++;

                let key = '';
                let label = '';
                const year = current.getFullYear();

                if (interval === 'month') {
                    key = `${year}-${current.getMonth()}`;
                    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
                    label = monthNames[current.getMonth()];
                } else if (interval === 'week') {
                    // Key by Week Start Date
                    // Format: YYYY-Www? No, just use date string of start of week
                    const month = String(current.getMonth() + 1).padStart(2, '0');
                    const day = String(current.getDate()).padStart(2, '0');
                    key = `${year}-${month}-${day}`;
                    label = `${current.getDate()}/${current.getMonth() + 1}`;
                } else {
                    // Day
                    const month = String(current.getMonth() + 1).padStart(2, '0');
                    const day = String(current.getDate()).padStart(2, '0');
                    key = `${year}-${month}-${day}`;
                    label = `${current.getDate()}/${current.getMonth() + 1}`;
                }

                points[key] = {
                    label,
                    date: current.toISOString(),
                    earnings: 0,
                    liters: 0,
                    farmers: 0,
                    collections: 0
                };

                // Increment
                if (interval === 'month') current.setMonth(current.getMonth() + 1);
                else if (interval === 'week') current.setDate(current.getDate() + 7);
                else current.setDate(current.getDate() + 1);
            }

            // Populate Data
            // Generic Bucket Logic:
            const buckets = Object.values(points).map(p => ({
                ...p,
                startDate: new Date(p.date),
                endDate: new Date(p.date)
            }));

            // Set end dates
            buckets.forEach(b => {
                if (interval === 'day') b.endDate.setDate(b.startDate.getDate() + 1);
                if (interval === 'week') b.endDate.setDate(b.startDate.getDate() + 7);
                if (interval === 'month') b.endDate.setMonth(b.startDate.getMonth() + 1);
            });

            rangeData.forEach((item: any) => {
                const itemDate = new Date(item.created_at);
                // Find bucket
                const bucket = buckets.find(b => itemDate >= b.startDate && itemDate < b.endDate);
                if (bucket) {
                    bucket.earnings += (item.liters * currentRate);
                    bucket.liters += item.liters;
                    bucket.collections += 1;
                }
            });

            // Farmers count (needs re-loop or separate pass? Can do in finding bucket)
            buckets.forEach(bucket => {
                const binItems = rangeData.filter((d: any) => {
                    const dDate = new Date(d.created_at);
                    return dDate >= bucket.startDate && dDate < bucket.endDate;
                });
                bucket.farmers = new Set(binItems.map((b: any) => b.farmer_id)).size;
            });

            return buckets; // Returns ChartPoint[] directly
        };


        // Week: Last 7 Days
        const startWeek = new Date(now); startWeek.setDate(now.getDate() - 6); startWeek.setHours(0, 0, 0, 0);
        const weekTrend = processTrend(startWeek, endToday, 'day');

        // Month: Last 4 Weeks (28 Days) - Aggregated Weekly
        const startMonth = new Date(now); startMonth.setDate(now.getDate() - 27); startMonth.setHours(0, 0, 0, 0);
        // Align startMonth to something? No, passing 'week' interval will create 4 buckets of 7 days
        const monthTrend = processTrend(startMonth, endToday, 'week');

        // Year: Last 12 Months
        const startYear = new Date(now); startYear.setMonth(now.getMonth() - 11); startYear.setDate(1); startYear.setHours(0, 0, 0, 0);
        const yearTrend = processTrend(startYear, endToday, 'month');

        // 4. Insights
        // Busiest Time (Morning/Afternoon/Evening)
        const timeSlots = { Morning: 0, Afternoon: 0, Evening: 0 };
        allData.forEach((d: any) => {
            const hour = new Date(d.created_at).getHours();
            if (hour >= 5 && hour < 12) timeSlots.Morning++;
            else if (hour >= 12 && hour < 17) timeSlots.Afternoon++;
            else timeSlots.Evening++;
        });
        const busiestEntry = Object.entries(timeSlots).reduce((a, b) => a[1] > b[1] ? a : b);
        const busiestTime = busiestEntry[1] > 0 ? busiestEntry[0] : 'None';

        // Top Farmer
        const farmerMap: { [key: string]: number } = {};
        allData.forEach((d: any) => {
            // Using Name as ID might be risky if duplicates, but farmer_name comes from join
            const name = d.farmer_name;
            farmerMap[name] = (farmerMap[name] || 0) + d.liters;
        });
        const topFarmerName = Object.entries(farmerMap).length > 0
            ? Object.entries(farmerMap).reduce((a, b) => a[1] > b[1] ? a : b)[0]
            : 'None';

        // 5. ATH
        let athValue = 0;
        let athDate = now.toISOString();
        // Calculate daily sums
        const dailySums: { [key: string]: number } = {};
        allData.forEach((d: any) => {
            const date = new Date(d.created_at);
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            const k = `${year}-${month}-${day}`;

            dailySums[k] = (dailySums[k] || 0) + (d.liters * currentRate);
        });
        Object.entries(dailySums).forEach(([date, val]) => {
            if (val > athValue) {
                athValue = val;
                athDate = date;
            }
        });

        return {
            overview: {
                totalEarnings,
                totalLiters,
                activeFarmers: uniqueFarmers,
                totalCollections,
                efficiency
            },
            today: {
                earnings: todayMetrics.earnings,
                liters: todayMetrics.liters,
                farmers: todayMetrics.farmers,
                collections: todayMetrics.collections
            },
            thisMonth: {
                earnings: thisMonthMetrics.earnings,
                liters: thisMonthMetrics.liters,
                farmers: thisMonthMetrics.farmers,
                collections: thisMonthMetrics.collections,
                daysActive: thisMonthMetrics.daysActive
            },
            trends: {
                week: weekTrend,
                month: monthTrend,
                year: yearTrend
            },
            insights: {
                busiestTime,
                topFarmerName,
                growthRate: 0 // Placeholder or calculate diff
            },
            ath: {
                value: athValue,
                date: athDate,
                type: 'Earnings'
            }
        };
    }
};
