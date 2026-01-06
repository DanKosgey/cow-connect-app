/**
 * Verification Analytics Service
 * Tracks performance metrics for continuous optimization
 */

import { supabase } from '@/integrations/supabase/client';

export interface PerformanceMetrics {
    compressionTime: number;
    uploadDuration: number;
    verificationLatency: number;
    totalTime: number;
    cacheHit: boolean;
    imageSize: number;
    optimizedSize: number;
    compressionRatio: number;
}

export interface AnalyticsData {
    timestamp: number;
    metrics: PerformanceMetrics;
    collectionId: string;
    farmerId: string;
    success: boolean;
    error?: string;
}

class VerificationAnalytics {
    private metrics: AnalyticsData[] = [];
    private readonly MAX_METRICS = 1000;

    /**
     * Track a verification attempt
     */
    track(data: AnalyticsData): void {
        this.metrics.push(data);

        // Keep only recent metrics
        if (this.metrics.length > this.MAX_METRICS) {
            this.metrics = this.metrics.slice(-this.MAX_METRICS);
        }

        // Log to console in development
        if (import.meta.env.DEV) {
            console.log('📊 Verification Analytics:', {
                totalTime: `${data.metrics.totalTime}ms`,
                compression: `${data.metrics.compressionTime}ms`,
                upload: `${data.metrics.uploadDuration}ms`,
                ai: `${data.metrics.verificationLatency}ms`,
                cacheHit: data.metrics.cacheHit,
                compressionRatio: `${data.metrics.compressionRatio.toFixed(1)}%`,
            });
        }
    }

    /**
     * Get average metrics for recent verifications
     */
    getAverageMetrics(count: number = 10): {
        avgCompressionTime: number;
        avgUploadDuration: number;
        avgVerificationLatency: number;
        avgTotalTime: number;
        cacheHitRate: number;
        avgCompressionRatio: number;
        successRate: number;
    } {
        const recent = this.metrics.slice(-count);

        if (recent.length === 0) {
            return {
                avgCompressionTime: 0,
                avgUploadDuration: 0,
                avgVerificationLatency: 0,
                avgTotalTime: 0,
                cacheHitRate: 0,
                avgCompressionRatio: 0,
                successRate: 0,
            };
        }

        const sum = recent.reduce(
            (acc, data) => ({
                compressionTime: acc.compressionTime + data.metrics.compressionTime,
                uploadDuration: acc.uploadDuration + data.metrics.uploadDuration,
                verificationLatency: acc.verificationLatency + data.metrics.verificationLatency,
                totalTime: acc.totalTime + data.metrics.totalTime,
                cacheHits: acc.cacheHits + (data.metrics.cacheHit ? 1 : 0),
                compressionRatio: acc.compressionRatio + data.metrics.compressionRatio,
                successes: acc.successes + (data.success ? 1 : 0),
            }),
            {
                compressionTime: 0,
                uploadDuration: 0,
                verificationLatency: 0,
                totalTime: 0,
                cacheHits: 0,
                compressionRatio: 0,
                successes: 0,
            }
        );

        return {
            avgCompressionTime: Math.round(sum.compressionTime / recent.length),
            avgUploadDuration: Math.round(sum.uploadDuration / recent.length),
            avgVerificationLatency: Math.round(sum.verificationLatency / recent.length),
            avgTotalTime: Math.round(sum.totalTime / recent.length),
            cacheHitRate: (sum.cacheHits / recent.length) * 100,
            avgCompressionRatio: sum.compressionRatio / recent.length,
            successRate: (sum.successes / recent.length) * 100,
        };
    }

    /**
     * Get performance percentiles
     */
    getPercentiles(): {
        p50: number;
        p90: number;
        p95: number;
        p99: number;
    } {
        if (this.metrics.length === 0) {
            return { p50: 0, p90: 0, p95: 0, p99: 0 };
        }

        const sorted = [...this.metrics]
            .map(m => m.metrics.totalTime)
            .sort((a, b) => a - b);

        const getPercentile = (p: number) => {
            const index = Math.ceil((p / 100) * sorted.length) - 1;
            return sorted[Math.max(0, index)];
        };

        return {
            p50: getPercentile(50),
            p90: getPercentile(90),
            p95: getPercentile(95),
            p99: getPercentile(99),
        };
    }

    /**
     * Save analytics to database (batch)
     */
    async saveToDatabase(): Promise<void> {
        if (this.metrics.length === 0) return;

        try {
            const records = this.metrics.map(data => ({
                collection_id: data.collectionId,
                farmer_id: data.farmerId,
                compression_time: data.metrics.compressionTime,
                upload_duration: data.metrics.uploadDuration,
                verification_latency: data.metrics.verificationLatency,
                total_time: data.metrics.totalTime,
                cache_hit: data.metrics.cacheHit,
                original_size: data.metrics.imageSize,
                optimized_size: data.metrics.optimizedSize,
                compression_ratio: data.metrics.compressionRatio,
                success: data.success,
                error_message: data.error,
                created_at: new Date(data.timestamp).toISOString(),
            }));

            // Insert in batches of 100
            const batchSize = 100;
            for (let i = 0; i < records.length; i += batchSize) {
                const batch = records.slice(i, i + batchSize);
                await supabase.from('verification_analytics').insert(batch);
            }

            // Clear metrics after saving
            this.metrics = [];
        } catch (error) {
            console.error('Failed to save analytics:', error);
        }
    }

    /**
     * Get dashboard statistics
     */
    async getDashboardStats(days: number = 7): Promise<{
        totalVerifications: number;
        avgResponseTime: number;
        cacheHitRate: number;
        successRate: number;
        dailyStats: Array<{
            date: string;
            count: number;
            avgTime: number;
        }>;
    }> {
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - days);

            const { data, error } = await supabase
                .from('verification_analytics')
                .select('*')
                .gte('created_at', startDate.toISOString());

            if (error) throw error;

            if (!data || data.length === 0) {
                return {
                    totalVerifications: 0,
                    avgResponseTime: 0,
                    cacheHitRate: 0,
                    successRate: 0,
                    dailyStats: [],
                };
            }

            const totalVerifications = data.length;
            const avgResponseTime = data.reduce((sum, r) => sum + r.total_time, 0) / totalVerifications;
            const cacheHits = data.filter(r => r.cache_hit).length;
            const successes = data.filter(r => r.success).length;

            // Group by date
            const dailyMap = new Map<string, { count: number; totalTime: number }>();
            data.forEach(record => {
                const date = new Date(record.created_at).toISOString().split('T')[0];
                const existing = dailyMap.get(date) || { count: 0, totalTime: 0 };
                dailyMap.set(date, {
                    count: existing.count + 1,
                    totalTime: existing.totalTime + record.total_time,
                });
            });

            const dailyStats = Array.from(dailyMap.entries()).map(([date, stats]) => ({
                date,
                count: stats.count,
                avgTime: Math.round(stats.totalTime / stats.count),
            }));

            return {
                totalVerifications,
                avgResponseTime: Math.round(avgResponseTime),
                cacheHitRate: (cacheHits / totalVerifications) * 100,
                successRate: (successes / totalVerifications) * 100,
                dailyStats,
            };
        } catch (error) {
            console.error('Failed to get dashboard stats:', error);
            return {
                totalVerifications: 0,
                avgResponseTime: 0,
                cacheHitRate: 0,
                successRate: 0,
                dailyStats: [],
            };
        }
    }

    /**
     * Clear all metrics
     */
    clear(): void {
        this.metrics = [];
    }
}

// Export singleton
export const verificationAnalytics = new VerificationAnalytics();

// Auto-save metrics every 5 minutes
if (typeof window !== 'undefined') {
    setInterval(() => {
        verificationAnalytics.saveToDatabase();
    }, 5 * 60 * 1000);
}
