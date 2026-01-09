
import React, { useState, useEffect, useRef } from 'react';
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
import { collectorPerformanceService, CollectorPerformanceMetrics } from '../services/collector.performance.service';
import { useFocusEffect } from '@react-navigation/native';

const SCREEN_WIDTH = Dimensions.get('window').width;

const StatCard = ({ title, amount, subtext, badge, color, showProgress, progressValue }: any) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <Text style={styles.cardTitle}>{title}</Text>
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
    const [metrics, setMetrics] = useState<any>(null);
    const [chartMode, setChartMode] = useState<'earnings' | 'liters'>('earnings');
    const [selectedDay, setSelectedDay] = useState<any>(null);

    const loadData = async () => {
        if (!user?.staff?.id) return;
        setLoading(true);
        try {
            const data = await collectorPerformanceService.getPerformanceMetrics(user.staff.id);
            setMetrics(data);
            if (data.chartData?.length > 0) {
                // Select last day by default
                setSelectedDay(data.chartData[data.chartData.length - 1]);
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" color="#0EA5E9" />
                <Text style={{ marginTop: 10, color: '#64748B' }}>Gathering earnings data...</Text>
            </View>
        );
    }

    if (!metrics) return null;

    const maxChartValue = metrics.chartData.reduce((max: number, item: any) =>
        Math.max(max, chartMode === 'earnings' ? item.earnings : item.liters), 0);

    // Formatting helpers
    const formatCurrency = (val: number) => `KES ${val.toLocaleString()}`;

    // Dynamic strings
    const weekComparisonText = metrics.week.comparison
        ? `${metrics.week.comparison.isPositive ? '+' : ''}${metrics.week.comparison.earningsChange}% vs Last`
        : 'vs Last Week';

    // Dynamic progress (e.g., target 200L daily)
    const dailyTarget = metrics.dailyTarget || 200;
    const dailyProgress = Math.min((metrics.today.totalLiters / dailyTarget) * 100, 100);

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header */}
            <View style={styles.header}>
                <Text style={styles.greeting}>Performance Dashboard</Text>
                <Text style={styles.date}>{new Date().toDateString()}</Text>
            </View>

            {/* Hero Cards Scroll */}
            <ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.cardsScroll}
                snapToInterval={SCREEN_WIDTH - 40}
                decelerationRate="fast"
            >
                {/* Today */}
                <View style={styles.cardContainer}>
                    <StatCard
                        title="TODAY'S EARNINGS"
                        amount={formatCurrency(metrics.today.totalEarnings)}
                        subtext={`${metrics.today.totalLiters.toFixed(1)}L from ${metrics.today.uniqueFarmers} farmers`}
                        badge="Today"
                        color="#0EA5E9" // Blue
                        showProgress={true}
                        progressValue={`${dailyProgress}%`}
                    />
                </View>

                {/* Week */}
                <View style={styles.cardContainer}>
                    <StatCard
                        title="THIS WEEK"
                        amount={formatCurrency(metrics.week.totalEarnings)}
                        subtext={`${metrics.week.totalLiters.toFixed(1)}L • ${metrics.week.daysActive} days active`}
                        badge={weekComparisonText}
                        color="#10B981" // Green
                    />
                </View>

                {/* Month */}
                <View style={styles.cardContainer}>
                    <StatCard
                        title="THIS MONTH"
                        amount={formatCurrency(metrics.month.totalEarnings)}
                        subtext={`Projected: ${formatCurrency(metrics.month.projectedEarnings || 0)}`}
                        badge="On Track"
                        color="#8B5CF6" // Purple
                    />
                </View>
            </ScrollView>

            {/* Chart Section */}
            <View style={styles.sectionContainer}>
                <View style={styles.sectionHeader}>
                    <Text style={styles.sectionTitle}>Performance Trend</Text>
                    <View style={styles.toggleContainer}>
                        <TouchableOpacity
                            style={[styles.toggleBtn, chartMode === 'earnings' && styles.toggleBtnActive]}
                            onPress={() => setChartMode('earnings')}
                        >
                            <Text style={[styles.toggleText, chartMode === 'earnings' && styles.toggleTextActive]}>KES</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            style={[styles.toggleBtn, chartMode === 'liters' && styles.toggleBtnActive]}
                            onPress={() => setChartMode('liters')}
                        >
                            <Text style={[styles.toggleText, chartMode === 'liters' && styles.toggleTextActive]}>Liters</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {metrics.chartData.length > 0 ? (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.chartScroll}>
                        {/* Assuming the user intended to replace ChartBar with LineChart or add it */}
                        {/* The provided edit seems to be for a LineChart component configuration */}
                        <LineChart
                            data={{
                                labels: metrics.chartData.map((d: any) => d.label),
                                datasets: [
                                    {
                                        data: metrics.chartData.map((d: any) => chartMode === 'earnings' ? d.earnings : d.liters)
                                    }
                                ]
                            }}
                            width={SCREEN_WIDTH * 1.5} // Adjust width as needed for horizontal scroll
                            height={220}
                            chartConfig={{
                                backgroundColor: '#ffffff',
                                backgroundGradientFrom: '#ffffff',
                                backgroundGradientTo: '#ffffff',
                                decimalPlaces: 0, // optional, defaults to 2dp
                                color: (opacity = 1) => `rgba(22, 163, 74, ${opacity})`, // Green-600
                                labelColor: (opacity = 1) => `rgba(100, 116, 139, ${opacity})`,
                                style: {
                                    borderRadius: 16
                                },
                                propsForDots: {
                                    r: "6",
                                    strokeWidth: "2",
                                    stroke: "#16A34A"
                                }
                            }}
                            bezier
                            style={{
                                marginVertical: 8,
                                borderRadius: 16
                            }}
                        />
                    </ScrollView>
                ) : (
                    <View style={{ height: 100, alignItems: 'center', justifyContent: 'center' }}>
                        <Text style={{ color: '#94A3B8' }}>No data for charts yet</Text>
                    </View>
                )}

                {/* Selected Day Details */}
                {selectedDay && (
                    <View style={styles.detailBox}>
                        <View>
                            <Text style={styles.detailDate}>{new Date(selectedDay.date).toDateString()}</Text>
                            <Text style={styles.detailMain}>
                                {chartMode === 'earnings'
                                    ? formatCurrency(selectedDay.earnings)
                                    : `${selectedDay.liters.toFixed(1)} L`}
                            </Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                            <Text style={styles.detailLabel}>{selectedDay.farmers} farmers collected</Text>
                            <Text style={styles.detailLabel}>
                                {chartMode === 'earnings' ? 'Approx earnings' : 'Total Volume'}
                            </Text>
                        </View>
                    </View>
                )}
            </View>

            {/* Health Indicator */}
            <View style={styles.sectionContainer}>
                <Text style={styles.sectionTitle}>Performance Health</Text>

                <View style={styles.healthRow}>
                    <View style={styles.healthItem}>
                        <Text style={styles.healthLabel}>Avg/Farmer</Text>
                        <Text style={styles.healthValue}>
                            {metrics.month.avgLitersPerFarmer.toFixed(1)}L
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.healthItem}>
                        <Text style={styles.healthLabel}>Consistency</Text>
                        <Text style={styles.healthValue}>
                            {metrics.month.health?.consistency || 0}%
                        </Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.healthItem}>
                        <Text style={styles.healthLabel}>Effectiveness</Text>
                        <Text style={[styles.healthValue, { color: metrics.month.health?.effectiveness === 'High' ? '#10B981' : metrics.month.health?.effectiveness === 'Low' ? '#EF4444' : '#F59E0B' }]}>
                            {metrics.month.health?.effectiveness || 'Medium'}
                        </Text>
                    </View>
                </View>

                {/* Alert/Insight */}
                <TouchableOpacity
                    style={styles.alertBox}
                    onPress={() => navigation.navigate('FarmerPerformance')}
                >
                    <Ionicons name="bulb" size={24} color="#F59E0B" />
                    <View style={{ flex: 1, marginLeft: 12 }}>
                        <Text style={styles.alertTitle}>Performance Insight</Text>
                        <Text style={styles.alertText}>
                            {metrics.insight}
                        </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#94A3B8" />
                </TouchableOpacity>
            </View>

            {/* Action Buttons */}
            <View style={styles.actionGrid}>
                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('FarmerPerformance')}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#FEE2E2' }]}>
                        <Ionicons name="search" size={22} color="#EF4444" />
                    </View>
                    <Text style={styles.actionText}>Investigate{"\n"}Declines</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('CollectorGoals')}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#E0F2FE' }]}>
                        <Ionicons name="trophy" size={22} color="#0EA5E9" />
                    </View>
                    <Text style={styles.actionText}>View{"\n"}Goals</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.actionBtn}
                    onPress={() => navigation.navigate('EarningsReport')}
                >
                    <View style={[styles.iconCircle, { backgroundColor: '#F3E8FF' }]}>
                        <Ionicons name="document-text" size={22} color="#8B5CF6" />
                    </View>
                    <Text style={styles.actionText}>Earnings{"\n"}Report</Text>
                </TouchableOpacity>
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
    header: {
        padding: 20,
        paddingTop: 60,
        backgroundColor: '#fff',
    },
    greeting: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
    },
    date: {
        color: '#64748B',
        fontSize: 14,
        marginTop: 4,
    },
    // Cards
    cardsScroll: {
        paddingLeft: 20,
        paddingVertical: 20,
    },
    cardContainer: {
        width: SCREEN_WIDTH - 60,
        marginRight: 15,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
    },
    cardTitle: {
        fontSize: 12,
        fontWeight: '700',
        color: '#94A3B8',
        letterSpacing: 0.5,
    },
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    badgeText: {
        fontSize: 11,
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
    trendText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#16A34A', // Green-600
        marginLeft: 2,
    },
    chartContainer: {
        margin: 20,
        marginTop: 0,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    chartTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 20,
    },
    chart: {
        borderRadius: 16,
        marginVertical: 8,
    },

    // Restored & Themed Styles
    sectionContainer: {
        marginTop: 24,
        paddingHorizontal: 20,
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
        color: '#14532D', // Green-900
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: '#DCFCE7', // Green-100
        borderRadius: 8,
        padding: 4,
    },
    toggleBtn: {
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 6,
    },
    toggleBtnActive: {
        backgroundColor: '#16A34A', // Green-600
    },
    toggleText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#15803D', // Green-700
    },
    toggleTextActive: {
        color: '#fff',
    },
    chartScroll: {
        overflow: 'visible',
    },
    detailBox: {
        marginTop: 16,
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        padding: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    detailDate: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
    },
    detailMain: {
        fontSize: 20,
        fontWeight: '700',
        color: '#16A34A',
    },
    detailLabel: {
        fontSize: 12,
        color: '#64748B',
    },
    healthRow: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        justifyContent: 'space-between',
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    healthItem: {
        alignItems: 'center',
        flex: 1,
    },
    divider: {
        width: 1,
        height: 24,
        backgroundColor: '#E2E8F0',
    },
    healthLabel: { // Overrides previous definition if duplicate, or merge? 
        // Previous definition was: color: '#DCFCE7', fontSize: 14...
        // The one used in JSX is for the Row.
        fontSize: 12,
        color: '#64748B',
        marginBottom: 4,
        fontWeight: '500',
    },
    healthValue: { // Overrides
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    alertBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB', // Amber-50 (Insight/Alert usually yellow/orange)
        borderRadius: 12,
        padding: 16,
        marginTop: 20,
        borderWidth: 1,
        borderColor: '#FCD34D',
    },
    alertTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#B45309',
        marginBottom: 2,
    },
    alertText: {
        fontSize: 13,
        color: '#B45309',
        lineHeight: 18,
    },
    actionGrid: {
        flexDirection: 'row',
        gap: 12,
        paddingHorizontal: 20,
        marginTop: 24,
    },
    actionBtn: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
    },
    iconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 8,
    },
    actionText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#475569',
        textAlign: 'center',
        lineHeight: 16,
    },
});
