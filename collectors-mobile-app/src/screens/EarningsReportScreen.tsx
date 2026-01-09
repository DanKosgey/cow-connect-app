
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    Share,
    Alert
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { earningsReportService, EarningsReportData } from '../services/earnings.report.service';
import { useFocusEffect } from '@react-navigation/native';

const PeriodTab = ({ label, active, onPress }: any) => (
    <TouchableOpacity
        style={[styles.periodTab, active && styles.periodTabActive]}
        onPress={onPress}
    >
        <Text style={[styles.periodTabText, active && styles.periodTabTextActive]}>
            {label}
        </Text>
    </TouchableOpacity>
);

const SummaryCard = ({ icon, label, value, color, subtitle }: any) => (
    <View style={styles.summaryCard}>
        <View style={[styles.summaryIcon, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={20} color={color} />
        </View>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={[styles.summaryValue, { color }]}>{value}</Text>
        {subtitle && <Text style={styles.summarySubtitle}>{subtitle}</Text>}
    </View>
);

const DailyBreakdownRow = ({ item }: any) => {
    const date = new Date(item.date);
    const dayName = date.toLocaleDateString('en-US', { weekday: 'short' });
    const dayNum = date.getDate();

    return (
        <View style={styles.breakdownRow}>
            <View style={styles.breakdownDate}>
                <Text style={styles.breakdownDay}>{dayName}</Text>
                <Text style={styles.breakdownDayNum}>{dayNum}</Text>
            </View>
            <View style={styles.breakdownStats}>
                <View style={styles.breakdownStat}>
                    <Text style={styles.breakdownStatLabel}>Earnings</Text>
                    <Text style={styles.breakdownStatValue}>
                        KES {item.earnings.toLocaleString()}
                    </Text>
                </View>
                <View style={styles.breakdownStat}>
                    <Text style={styles.breakdownStatLabel}>Volume</Text>
                    <Text style={styles.breakdownStatValue}>{item.liters.toFixed(1)}L</Text>
                </View>
                <View style={styles.breakdownStat}>
                    <Text style={styles.breakdownStatLabel}>Farmers</Text>
                    <Text style={styles.breakdownStatValue}>{item.farmers}</Text>
                </View>
            </View>
        </View>
    );
};

const TopFarmerCard = ({ farmer, rank }: any) => {
    const rankColors = ['#FFD700', '#C0C0C0', '#CD7F32'];
    const rankColor = rank <= 3 ? rankColors[rank - 1] : '#64748B';

    return (
        <View style={styles.farmerCard}>
            <View style={styles.farmerRank}>
                <View style={[styles.rankBadge, { backgroundColor: rankColor + '20' }]}>
                    <Text style={[styles.rankText, { color: rankColor }]}>#{rank}</Text>
                </View>
            </View>
            <View style={styles.farmerInfo}>
                <Text style={styles.farmerName}>{farmer.farmerName}</Text>
                <Text style={styles.farmerSubtext}>
                    {farmer.collections} collections • {farmer.totalLiters.toFixed(1)}L
                </Text>
            </View>
            <View style={styles.farmerEarnings}>
                <Text style={styles.farmerEarningsValue}>
                    KES {farmer.totalEarnings.toLocaleString()}
                </Text>
                <Text style={styles.farmerContribution}>
                    {farmer.contribution.toFixed(1)}% of total
                </Text>
            </View>
        </View>
    );
};

const RateHistoryCard = ({ rate }: any) => {
    const startDate = new Date(rate.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const endDate = new Date(rate.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    return (
        <View style={styles.rateCard}>
            <View style={styles.rateHeader}>
                <View style={styles.rateAmount}>
                    <Text style={styles.rateValue}>KES {rate.rate.toFixed(2)}/L</Text>
                    <Text style={styles.ratePeriod}>{startDate} - {endDate}</Text>
                </View>
                <View style={styles.rateStats}>
                    <Text style={styles.rateStatValue}>{rate.liters.toFixed(0)}L</Text>
                    <Text style={styles.rateStatLabel}>Volume</Text>
                </View>
            </View>
            <View style={styles.rateEarnings}>
                <Text style={styles.rateEarningsLabel}>Total Earned</Text>
                <Text style={styles.rateEarningsValue}>KES {rate.earnings.toLocaleString()}</Text>
            </View>
        </View>
    );
};

export const EarningsReportScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [period, setPeriod] = useState<'today' | 'week' | 'month'>('month');
    const [reportData, setReportData] = useState<EarningsReportData | null>(null);

    const loadReport = async () => {
        if (!user?.staff?.id) return;
        setLoading(true);

        try {
            const now = new Date();
            let startDate = new Date();

            if (period === 'today') {
                startDate.setHours(0, 0, 0, 0);
            } else if (period === 'week') {
                startDate.setDate(now.getDate() - now.getDay());
                startDate.setHours(0, 0, 0, 0);
            } else {
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
            }

            const data = await earningsReportService.generateReport(
                user.staff.id,
                startDate,
                now
            );
            setReportData(data);
        } catch (e) {
            console.error(e);
            Alert.alert('Error', 'Failed to generate report');
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadReport();
        }, [period])
    );

    const handleShare = async () => {
        if (!reportData) return;

        const message = `
📊 Earnings Report (${period.toUpperCase()})

💰 Total Earnings: KES ${reportData.totalEarnings.toLocaleString()}
📦 Total Volume: ${reportData.totalLiters.toFixed(1)}L
👥 Farmers: ${reportData.uniqueFarmers}
📈 Collections: ${reportData.totalCollections}
💵 Avg Rate: KES ${reportData.averageRate.toFixed(2)}/L

Generated via Cow Connect App
        `.trim();

        try {
            await Share.share({ message });
        } catch (e) {
            console.error(e);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#16A34A" />
                <Text style={styles.loadingText}>Generating report...</Text>
            </View>
        );
    }

    if (!reportData) return null;

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Earnings Report</Text>
                <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                    <Ionicons name="share-outline" size={24} color="#16A34A" />
                </TouchableOpacity>
            </View>

            {/* Period Selector */}
            <View style={styles.periodSelector}>
                <PeriodTab label="Today" active={period === 'today'} onPress={() => setPeriod('today')} />
                <PeriodTab label="This Week" active={period === 'week'} onPress={() => setPeriod('week')} />
                <PeriodTab label="This Month" active={period === 'month'} onPress={() => setPeriod('month')} />
            </View>

            <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
                {/* Summary Cards */}
                <View style={styles.summaryGrid}>
                    <SummaryCard
                        icon="cash"
                        label="Total Earnings"
                        value={`KES ${reportData.totalEarnings.toLocaleString()}`}
                        color="#10B981"
                    />
                    <SummaryCard
                        icon="water"
                        label="Total Volume"
                        value={`${reportData.totalLiters.toFixed(1)}L`}
                        color="#0EA5E9"
                    />
                    <SummaryCard
                        icon="people"
                        label="Farmers"
                        value={reportData.uniqueFarmers.toString()}
                        subtitle={`${reportData.totalCollections} collections`}
                        color="#8B5CF6"
                    />
                    <SummaryCard
                        icon="trending-up"
                        label="Avg Rate"
                        value={`KES ${reportData.averageRate.toFixed(2)}`}
                        subtitle="per liter"
                        color="#F59E0B"
                    />
                </View>

                {/* Daily Breakdown */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="calendar-outline" size={20} color="#1E293B" />
                        <Text style={styles.sectionTitle}>Daily Breakdown</Text>
                    </View>
                    <View style={styles.breakdownContainer}>
                        {reportData.breakdown.length > 0 ? (
                            reportData.breakdown.reverse().map((item, index) => (
                                <DailyBreakdownRow key={index} item={item} />
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No collections in this period</Text>
                        )}
                    </View>
                </View>

                {/* Top Farmers */}
                <View style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="trophy-outline" size={20} color="#1E293B" />
                        <Text style={styles.sectionTitle}>Top Contributing Farmers</Text>
                    </View>
                    <View style={styles.farmersContainer}>
                        {reportData.topFarmers.length > 0 ? (
                            reportData.topFarmers.map((farmer, index) => (
                                <TopFarmerCard key={index} farmer={farmer} rank={index + 1} />
                            ))
                        ) : (
                            <Text style={styles.emptyText}>No farmer data available</Text>
                        )}
                    </View>
                </View>

                {/* Rate History */}
                {reportData.rateHistory.length > 0 && (
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Ionicons name="pricetag-outline" size={20} color="#1E293B" />
                            <Text style={styles.sectionTitle}>Rate History</Text>
                        </View>
                        <View style={styles.rateContainer}>
                            {reportData.rateHistory.map((rate, index) => (
                                <RateHistoryCard key={index} rate={rate} />
                            ))}
                        </View>
                    </View>
                )}

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 12,
        color: '#64748B',
        fontSize: 14,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingTop: 60,
        paddingBottom: 16,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backBtn: {
        padding: 8,
    },
    shareBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    periodSelector: {
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
    },
    periodTab: {
        flex: 1,
        paddingVertical: 10,
        borderRadius: 12,
        backgroundColor: '#F8FAFC',
        alignItems: 'center',
    },
    periodTabActive: {
        backgroundColor: '#16A34A', // Green-600
        elevation: 2,
    },
    periodTabText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    periodTabTextActive: {
        color: '#fff',
    },
    content: {
        flex: 1,
        padding: 20,
    },
    summaryGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 24,
    },
    summaryCard: {
        flex: 1,
        minWidth: '47%',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        elevation: 2,
    },
    summaryIcon: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 4,
        fontWeight: '600',
    },
    summaryValue: {
        fontSize: 18,
        fontWeight: '800',
        marginBottom: 2,
    },
    summarySubtitle: {
        fontSize: 11,
        color: '#94A3B8',
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    breakdownContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
    },
    breakdownRow: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    breakdownDate: {
        width: 50,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 16,
    },
    breakdownDay: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    breakdownDayNum: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
    },
    breakdownStats: {
        flex: 1,
        flexDirection: 'row',
        justifyContent: 'space-between',
    },
    breakdownStat: {
        flex: 1,
    },
    breakdownStatLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginBottom: 2,
    },
    breakdownStatValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    farmersContainer: {
        backgroundColor: '#fff',
        borderRadius: 16,
        overflow: 'hidden',
        elevation: 2,
    },
    farmerCard: {
        flexDirection: 'row',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
        alignItems: 'center',
    },
    farmerRank: {
        width: 40,
        marginRight: 12,
    },
    rankBadge: {
        width: 32,
        height: 32,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
    },
    rankText: {
        fontSize: 12,
        fontWeight: '800',
    },
    farmerInfo: {
        flex: 1,
    },
    farmerName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 2,
    },
    farmerSubtext: {
        fontSize: 12,
        color: '#94A3B8',
    },
    farmerEarnings: {
        alignItems: 'flex-end',
    },
    farmerEarningsValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#10B981',
        marginBottom: 2,
    },
    farmerContribution: {
        fontSize: 11,
        color: '#94A3B8',
    },
    rateContainer: {
        gap: 12,
    },
    rateCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        elevation: 2,
    },
    rateHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    rateAmount: {
        flex: 1,
    },
    rateValue: {
        fontSize: 18,
        fontWeight: '800',
        color: '#16A34A', // Green-600
        marginBottom: 4,
    },
    ratePeriod: {
        fontSize: 12,
        color: '#94A3B8',
    },
    rateStats: {
        alignItems: 'flex-end',
    },
    rateStatValue: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    rateStatLabel: {
        fontSize: 11,
        color: '#94A3B8',
    },
    rateEarnings: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    rateEarningsLabel: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '600',
    },
    rateEarningsValue: {
        fontSize: 15,
        fontWeight: '700',
        color: '#10B981',
    },
    emptyText: {
        textAlign: 'center',
        padding: 32,
        color: '#94A3B8',
        fontSize: 14,
    },
});
