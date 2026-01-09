import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LineChart } from 'react-native-chart-kit';
import { useAuth } from '../hooks/useAuth';
import { collectorPerformanceService, RefinedPerformanceMetrics, ChartPoint } from '../services/collector.performance.service';
import { useFocusEffect } from '@react-navigation/native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const StatCard = ({ title, amount, subtext, badge, color, showProgress, progressValue, icon }: any) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {icon && <Ionicons name={icon} size={18} color={color} />}
                <Text style={styles.cardTitle}>{title}</Text>
            </View>
            {badge && (
                <View style={[styles.badge, { backgroundColor: color + '20' }]}>
                    <Text style={[styles.badgeText, { color: color }]}>{badge}</Text>
                </View>
            )}
        </View>
        <Text style={[styles.mainValue, { color }]}>{amount}</Text>
        <Text style={styles.subtext}>{subtext}</Text>

        {showProgress && (
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: progressValue || '0%', backgroundColor: color }]} />
            </View>
        )}
    </View>
);

export const CollectorPerformanceScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<RefinedPerformanceMetrics | null>(null);
    const [chartMode, setChartMode] = useState<'earnings' | 'farmers' | 'collections'>('earnings');
    const [period, setPeriod] = useState<'week' | 'month' | 'year'>('week');
    const [selectedPoint, setSelectedPoint] = useState<ChartPoint | null>(null);

    const loadData = async () => {
        if (!user?.staff?.id) return;
        setLoading(true);
        try {
            const data = await collectorPerformanceService.getPerformanceMetrics(user.staff.id);
            setMetrics(data);
            if (data.trends.week.length > 0) {
                setSelectedPoint(data.trends.week[data.trends.week.length - 1]);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    if (loading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#0EA5E9" />
                <Text style={styles.loadingText}>Analyzing performance...</Text>
            </View>
        );
    }

    if (!metrics) return null;

    // Chart Data Preparation
    const activeTrend = metrics.trends[period];
    const chartLabels = activeTrend.map(d => d.label);
    const chartValues = activeTrend.map(d => {
        if (chartMode === 'farmers') return d.farmers;
        if (chartMode === 'collections') return d.collections;
        return d.earnings;
    });

    const formatCurrency = (val: number) => `KES ${val.toLocaleString()}`;

    // Dynamic Trend Coloring
    const getTrendColor = () => {
        if (chartValues.length < 2) return '#0EA5E9'; // Default Blue

        const start = chartValues[0];
        const end = chartValues[chartValues.length - 1];

        if (start === 0 && end === 0) return '#64748B'; // Gray for no activity
        if (end > start) return '#10B981'; // Green for Increase
        if (end < start) return '#EF4444'; // Red for Decrease
        return '#F59E0B'; // Orange for Neutral/Equal
    };

    const trendColor = getTrendColor();

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Performance Dashboard</Text>
                    <Text style={styles.date}>Insights & Analytics</Text>
                </View>
                <TouchableOpacity onPress={loadData} style={styles.refreshBtn}>
                    <Ionicons name="refresh" size={20} color="#64748B" />
                </TouchableOpacity>
            </View>

            {/* Hero Cards Scroll */}
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardsScroll}
                snapToInterval={SCREEN_WIDTH - 32}
                decelerationRate="fast"
            >
                {/* Total Earnings */}
                <View style={styles.cardContainer}>
                    <StatCard
                        title="TOTAL EARNINGS"
                        amount={formatCurrency(metrics.overview.totalEarnings)}
                        subtext={`${metrics.overview.totalLiters.toFixed(0)} Liters Collected`}
                        badge="Lifetime"
                        color="#0EA5E9" // Blue
                        icon="cash-outline"
                    />
                </View>

                {/* Active Farmers */}
                <View style={styles.cardContainer}>
                    <StatCard
                        title="ACTIVE FARMERS"
                        amount={metrics.overview.activeFarmers.toString()}
                        subtext="Unique farmers served"
                        badge="Network"
                        color="#10B981" // Green
                        icon="people-outline"
                    />
                </View>

                {/* Efficiency/Collections */}
                <View style={styles.cardContainer}>
                    <StatCard
                        title="COLLECTIONS"
                        amount={metrics.overview.totalCollections.toString()}
                        subtext={`${metrics.overview.efficiency.toFixed(1)}L per collection avg`}
                        badge="Efficiency"
                        color="#8B5CF6" // Purple
                        icon="analytics-outline"
                    />
                </View>

                {/* ATH Card */}
                <View style={styles.cardContainer}>
                    <StatCard
                        title="ALL TIME HIGH"
                        amount={formatCurrency(metrics.ath.value)}
                        subtext={`Record set on ${new Date(metrics.ath.date).toDateString()}`}
                        badge="ATH"
                        color="#F59E0B" // Amber
                        icon="trophy-outline"
                    />
                </View>
            </ScrollView>

            {/* Chart Section */}
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Trends</Text>
                </View>

                {/* Metric Toggles */}
                <View style={styles.metricToggles}>
                    {(['earnings', 'farmers', 'collections'] as const).map((m) => (
                        <TouchableOpacity
                            key={m}
                            style={[styles.metricToggle, chartMode === m && styles.metricToggleActive]}
                            onPress={() => setChartMode(m)}
                        >
                            <Text style={[styles.metricText, chartMode === m && styles.metricTextActive]}>
                                {m.charAt(0).toUpperCase() + m.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {/* Time Period Tabs */}
                <View style={styles.periodTabs}>
                    {(['week', 'month', 'year'] as const).map((p) => (
                        <TouchableOpacity
                            key={p}
                            style={[styles.periodTab, period === p && styles.periodTabActive]}
                            onPress={() => setPeriod(p)}
                        >
                            <Text style={[styles.periodText, period === p && styles.periodTextActive]}>
                                {p.charAt(0).toUpperCase() + p.slice(1)}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </View>

                {activeTrend.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                        <LineChart
                            data={{
                                labels: chartLabels,
                                datasets: [{ data: chartValues }]
                            }}
                            width={Math.max(SCREEN_WIDTH - 40, chartLabels.length * 50)}
                            height={220}
                            yAxisLabel={chartMode === 'earnings' ? 'K' : ''}
                            yAxisInterval={1}
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 0,
                                color: (opacity = 1) => {
                                    // Parse hex color to rgb for opacity
                                    const hex = trendColor.replace('#', '');
                                    const r = parseInt(hex.substring(0, 2), 16);
                                    const g = parseInt(hex.substring(2, 4), 16);
                                    const b = parseInt(hex.substring(4, 6), 16);
                                    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
                                },
                                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                                style: { borderRadius: 16 },
                                propsForDots: { r: "4", strokeWidth: "2", stroke: "#fff" }
                            }}
                            bezier
                            style={{ marginVertical: 8, borderRadius: 16 }}
                            onDataPointClick={({ index }) => setSelectedPoint(activeTrend[index])}
                        />
                    </ScrollView>
                ) : ( // ...
                    <View style={styles.emptyChart}>
                        <Text style={{ color: '#94A3B8' }}>No data available for this period</Text>
                    </View>
                )}

                {/* Selected Point Detail */}
                {selectedPoint && (
                    <View style={styles.detailBox}>
                        <Text style={styles.detailDate}>{new Date(selectedPoint.date).toDateString()}</Text>
                        <View style={styles.detailRow}>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Earnings</Text>
                                <Text style={styles.detailValue}>{formatCurrency(selectedPoint.earnings)}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Farmers</Text>
                                <Text style={styles.detailValue}>{selectedPoint.farmers}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Text style={styles.detailLabel}>Collections</Text>
                                <Text style={styles.detailValue}>{selectedPoint.collections}</Text>
                            </View>
                        </View>
                    </View>
                )}
            </View>

            {/* Insights Board */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Key Insights</Text>

                <View style={styles.insightCard}>
                    <View style={styles.insightIconBg}>
                        <Ionicons name="time" size={24} color="#F59E0B" />
                    </View>
                    <View style={styles.insightContent}>
                        <Text style={styles.insightTitle}>Busiest Time</Text>
                        <Text style={styles.insightDesc}>
                            Most of your collections happen in the <Text style={{ fontWeight: '700', color: '#1E293B' }}>{metrics.insights.busiestTime}</Text>.
                        </Text>
                    </View>
                </View>

                <View style={styles.insightCard}>
                    <View style={[styles.insightIconBg, { backgroundColor: '#DBEAFE' }]}>
                        <Ionicons name="star" size={24} color="#2563EB" />
                    </View>
                    <View style={styles.insightContent}>
                        <Text style={styles.insightTitle}>Top Farmer</Text>
                        <Text style={styles.insightDesc}>
                            <Text style={{ fontWeight: '700', color: '#1E293B' }}>{metrics.insights.topFarmerName}</Text> contributes the most to your volume.
                        </Text>
                    </View>
                </View>
            </View>

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 10,
        color: '#64748B',
    },
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    greeting: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
    },
    date: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
    },
    refreshBtn: {
        padding: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 50,
    },
    cardsScroll: {
        paddingHorizontal: 20,
        paddingVertical: 20,
    },
    cardContainer: {
        width: SCREEN_WIDTH - 40,
        marginRight: 10,
    },
    card: {
        backgroundColor: '#fff',
        padding: 20,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 1,
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '700',
    },
    mainValue: {
        fontSize: 32,
        fontWeight: '800',
        letterSpacing: -1,
        marginBottom: 8,
    },
    subtext: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    progressBarBg: {
        height: 6,
        backgroundColor: '#F1F5F9',
        borderRadius: 3,
        marginTop: 16,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        borderRadius: 3,
    },
    sectionContainer: {
        padding: 20,
        backgroundColor: '#fff',
        marginTop: 8,
        marginHorizontal: 16,
        borderRadius: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.04,
        shadowRadius: 12,
        elevation: 2,
        marginBottom: 16,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    chartScroll: {
        marginTop: 16,
    },
    emptyChart: {
        height: 200,
        justifyContent: 'center',
        alignItems: 'center',
    },
    metricToggles: {
        flexDirection: 'row',
        marginBottom: 12,
        gap: 8,
    },
    metricToggle: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        backgroundColor: '#F1F5F9',
        borderWidth: 1,
        borderColor: 'transparent',
    },
    metricToggleActive: {
        backgroundColor: '#F0F9FF',
        borderColor: '#BAE6FD',
    },
    metricText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#64748B',
    },
    metricTextActive: {
        color: '#0284C7',
    },
    periodTabs: {
        flexDirection: 'row',
        marginBottom: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 4,
    },
    periodTab: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 8,
    },
    periodTabActive: {
        backgroundColor: '#fff',
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    periodText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    periodTextActive: {
        color: '#0F172A',
    },
    detailBox: {
        marginTop: 16,
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
    },
    detailDate: {
        fontSize: 14,
        fontWeight: '600',
        color: '#475569',
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    detailItem: {
        alignItems: 'center',
    },
    detailLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginBottom: 4,
    },
    detailValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    insightCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#F8FAFC',
        borderRadius: 16,
        marginBottom: 12,
    },
    insightIconBg: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#FEF3C7',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    insightContent: {
        flex: 1,
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    insightDesc: {
        fontSize: 13,
        color: '#64748B',
        lineHeight: 18,
    },
});
