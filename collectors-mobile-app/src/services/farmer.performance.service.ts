
import { getDatabase } from './database';

export interface PerformanceMetrics {
    farmerId: string;
    fullName: string;
    registrationNumber: string;
    score: number;
    category: 'Elite' | 'Strong' | 'Average' | 'Declining' | 'At-Risk';
    streakDays: number;
    trend: 'up' | 'stable' | 'down';
    last7DaysAvg: number;
    lastCollectionDate: string | null;
    totalLiters30Days: number;
    details: any; // Full farmer object for profile view
}

export const farmerPerformanceService = {
    // Get aggregated performance for all farmers
    async getFarmerPerformanceStats(collectorId?: string): Promise<PerformanceMetrics[]> {
        const db = await getDatabase();

        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30); // Last 30 days window

        // 1. Get all farmers (fetch ALL fields for profile view)
        const farmers = await db.getAllAsync('SELECT * FROM farmers_local');

        // 2. Get all collections in window (optimized: one query)
        // We'll process in JS because SQLite on Expo lacks some analytical window functions
        let query = `
            SELECT farmer_id, liters, created_at 
            FROM collections_queue 
            WHERE created_at >= ? 
            ORDER BY created_at DESC
        `;
        let params = [startDate.toISOString()];

        if (collectorId) {
            query = `
            SELECT farmer_id, liters, created_at 
            FROM collections_queue 
            WHERE created_at >= ? AND collector_id = ?
            ORDER BY created_at DESC
            `;
            params = [startDate.toISOString(), collectorId];
        }

        const collections = await db.getAllAsync(query, params);

        // 3. Process metrics per farmer
        const metrics: PerformanceMetrics[] = farmers.map((farmer: any) => {
            const farmerCollections = collections.filter((c: any) => c.farmer_id === farmer.id);

            // --- Metrics Calculation ---

            // A. Streak (Consecutive days ending today/yesterday)
            const sortedDates = [...new Set(farmerCollections.map((c: any) => c.created_at.split('T')[0]))].sort().reverse();
            let streak = 0;
            const today = new Date().toISOString().split('T')[0];
            const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

            // Check if active today or yesterday to start streak counting
            let checkDate = new Date();
            let hasCollectionTodayOrYesterday = false;

            if (sortedDates.includes(today)) {
                hasCollectionTodayOrYesterday = true;
                checkDate = new Date(); // Start checking backwards from today
            } else if (sortedDates.includes(yesterday)) {
                hasCollectionTodayOrYesterday = true;
                checkDate = new Date(Date.now() - 86400000); // Start checking backwards from yesterday
            }

            if (hasCollectionTodayOrYesterday) {
                // Simple loop to count backwards
                for (let i = 0; i < 30; i++) {
                    const dateStr = checkDate.toISOString().split('T')[0];
                    if (sortedDates.includes(dateStr)) {
                        streak++;
                        checkDate.setDate(checkDate.getDate() - 1);
                    } else {
                        break;
                    }
                }
            } else {
                streak = 0; // Broken streak
            }


            // B. Volume Trend (Last 7 days vs Previous 7 days)
            const now = new Date();
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);

            let volLast7 = 0;
            let volPrev7 = 0;
            let daysLast7 = 0;

            farmerCollections.forEach((c: any) => {
                const d = new Date(c.created_at);
                if (d >= sevenDaysAgo) {
                    volLast7 += c.liters;
                    daysLast7++;
                } else if (d >= fourteenDaysAgo) {
                    volPrev7 += c.liters;
                }
            });

            const avgLast7 = daysLast7 > 0 ? (volLast7 / daysLast7) : 0; // Avg per collection day

            let trend: 'up' | 'stable' | 'down' = 'stable';
            if (volLast7 > volPrev7 * 1.1) trend = 'up';
            else if (volLast7 < volPrev7 * 0.9) trend = 'down';


            // C. Consistency Score (Days present / 30)
            // Adjust for new farmers who joined < 30 days ago
            const joinedDate = new Date(farmer.created_at);
            const daysSinceJoin = Math.min(30, Math.max(1, Math.ceil((now.getTime() - joinedDate.getTime()) / (1000 * 3600 * 24))));
            const uniqueDays = sortedDates.length;
            const consistencyRate = uniqueDays / daysSinceJoin; // 0 to 1


            // D. Smart Score Algorithm (0 - 100)
            // Consistency: 50%
            // Volume Trend: 30% (Up=100, Stable=70, Down=40)
            // Recent Activity: 20% (Collected in last 3 days?)

            let score = (consistencyRate * 50);

            if (trend === 'up') score += 30;
            else if (trend === 'stable') score += 21; // 70% of 30
            else score += 12; // 40% of 30

            const lastCollection = sortedDates[0];
            if (lastCollection) {
                const daysSinceLast = Math.floor((now.getTime() - new Date(lastCollection).getTime()) / (1000 * 3600 * 24));
                if (daysSinceLast <= 1) score += 20; // Perfect
                else if (daysSinceLast <= 3) score += 10;
                else score += 0;
            }

            score = Math.min(100, Math.round(score));

            // E. Categorization
            let category: PerformanceMetrics['category'] = 'Average';
            if (score >= 90) category = 'Elite';
            else if (score >= 75) category = 'Strong';
            else if (score >= 60) category = 'Average';
            else if (score >= 40) category = 'Declining';
            else category = 'At-Risk';


            return {
                farmerId: farmer.id,
                fullName: farmer.full_name,
                registrationNumber: farmer.registration_number,
                score,
                category,
                streakDays: streak,
                trend,
                last7DaysAvg: parseFloat(avgLast7.toFixed(1)),
                lastCollectionDate: lastCollection || null,
                totalLiters30Days: farmerCollections.reduce((acc: number, c: any) => acc + c.liters, 0),
                details: farmer // Pass full object
            };
        });

        // 4. Default Sort: Score DESC
        return metrics.sort((a, b) => b.score - a.score);
    },

    getOverallInsights(metrics: PerformanceMetrics[]) {
        const total = metrics.length;
        if (total === 0) return null;

        return {
            eliteCount: metrics.filter(m => m.category === 'Elite').length,
            strongCount: metrics.filter(m => m.category === 'Strong').length,
            averageCount: metrics.filter(m => m.category === 'Average').length,
            decliningCount: metrics.filter(m => m.category === 'Declining').length, // Warning
            atRiskCount: metrics.filter(m => m.category === 'At-Risk').length, // Critical

            totalVolume30: metrics.reduce((acc, m) => acc + m.totalLiters30Days, 0),
            improvingCount: metrics.filter(m => m.trend === 'up').length,
            decliningTrendCount: metrics.filter(m => m.trend === 'down').length,
        };
    }
};
