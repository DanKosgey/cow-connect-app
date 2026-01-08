
import React, { useState, useEffect, useMemo } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    ActivityIndicator,
    TextInput,
    ScrollView,
    Modal,
    Platform
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../hooks/useAuth';
import { farmerPerformanceService, PerformanceMetrics } from '../services/farmer.performance.service';

// --- Improved Components ---

const InsightCard = ({ title, count, subtitle, color, icon, bg }: any) => (
    <View style={[styles.insightCard, { borderTopColor: color, backgroundColor: 'white' }]}>
        <View style={styles.insightHeader}>
            <View style={[styles.iconBox, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            {/* Optional Trend Indicator could go here */}
        </View>
        <Text style={styles.insightCount}>{count}</Text>
        <Text style={styles.insightTitle}>{title}</Text>
        <Text style={styles.insightSubtitle}>{subtitle}</Text>
    </View>
);

const FarmerPerformanceCard = ({ item }: { item: PerformanceMetrics }) => {
    const navigation = useNavigation<any>();

    // Determine colors based on category
    let badgeColor = '#607D8B';
    let badgeBg = '#ECEFF1';
    let scoreColor = '#607D8B';

    if (item.category === 'Elite') { badgeColor = '#059669'; badgeBg = '#D1FAE5'; scoreColor = '#059669'; } // emerald-600/100
    if (item.category === 'Strong') { badgeColor = '#65A30D'; badgeBg = '#ECFCCB'; scoreColor = '#65A30D'; } // lime-600/100
    if (item.category === 'Average') { badgeColor = '#D97706'; badgeBg = '#FEF3C7'; scoreColor = '#D97706'; } // amber-600/100
    if (item.category === 'Declining') { badgeColor = '#EA580C'; badgeBg = '#FFEDD5'; scoreColor = '#EA580C'; } // orange-600/100
    if (item.category === 'At-Risk') { badgeColor = '#DC2626'; badgeBg = '#FEE2E2'; scoreColor = '#DC2626'; } // red-600/100

    return (
        <TouchableOpacity
            style={styles.farmerCard}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('FarmerProfile', { farmer: item.details })}
        >
            <View style={styles.cardHeader}>
                <View style={[styles.avatarContainer, { backgroundColor: badgeBg }]}>
                    <Text style={[styles.avatarText, { color: badgeColor }]}>{item.fullName.charAt(0)}</Text>
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.farmerName}>{item.fullName}</Text>
                        <View style={[styles.badge, { backgroundColor: badgeBg }]}>
                            <Text style={[styles.badgeText, { color: badgeColor }]}>{item.category}</Text>
                        </View>
                    </View>
                    <Text style={styles.regNumber}>#{item.registrationNumber}</Text>
                </View>
            </View>

            <View style={styles.statGrid}>
                {/* Score */}
                <View style={styles.statCell}>
                    <Text style={styles.statLabel}>Smart Score</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'baseline' }}>
                        <Text style={[styles.statValueLarge, { color: scoreColor }]}>{item.score}</Text>
                        <Text style={styles.statValueSmall}>/100</Text>
                    </View>
                </View>

                {/* Liters */}
                <View style={[styles.statCell, { borderLeftWidth: 1, borderLeftColor: '#F3F4F6', paddingLeft: 12 }]}>
                    <Text style={styles.statLabel}>30-Day Volume</Text>
                    <Text style={styles.statValueDark}>{item.totalLiters30Days.toFixed(0)} L</Text>
                </View>

                {/* Trend */}
                <View style={[styles.statCell, { borderLeftWidth: 1, borderLeftColor: '#F3F4F6', paddingLeft: 12 }]}>
                    <Text style={styles.statLabel}>Trend</Text>
                    <View style={[styles.trendBadge, {
                        backgroundColor: item.trend === 'up' ? '#ECFDF5' : item.trend === 'down' ? '#FEF2F2' : '#F3F4F6'
                    }]}>
                        <Ionicons
                            name={item.trend === 'up' ? 'trending-up' : item.trend === 'down' ? 'trending-down' : 'remove'}
                            size={14}
                            color={item.trend === 'up' ? '#10B981' : item.trend === 'down' ? '#EF4444' : '#6B7280'}
                        />
                        <Text style={[styles.trendText, {
                            color: item.trend === 'up' ? '#10B981' : item.trend === 'down' ? '#EF4444' : '#6B7280'
                        }]}>
                            {item.trend === 'up' ? 'Rising' : item.trend === 'down' ? 'Falling' : 'Stable'}
                        </Text>
                    </View>
                </View>
            </View>

            {/* Footer */}
            <View style={styles.cardFooter}>
                <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}>
                    <Ionicons name="time-outline" size={14} color="#9CA3AF" />
                    <Text style={styles.lastSeen}>
                        {item.lastCollectionDate
                            ? `Last active ${new Date(item.lastCollectionDate).toLocaleDateString()}`
                            : 'No recent activity'}
                    </Text>
                </View>

                <TouchableOpacity
                    style={styles.viewProfileBtn}
                    onPress={() => navigation.navigate('FarmerProfile', { farmer: item.details })}
                >
                    <Text style={styles.viewProfileText}>View Profile</Text>
                    <Ionicons name="arrow-forward" size={14} color="#0EA5E9" />
                </TouchableOpacity>
            </View>
        </TouchableOpacity>
    );
};

export const FarmerPerformanceScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState<PerformanceMetrics[]>([]);
    const [insights, setInsights] = useState<any>(null);
    const [filterCategory, setFilterCategory] = useState<string>('All');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadData();
    }, []);

    const loadData = async () => {
        if (user?.staff?.id) {
            setLoading(true);
            try {
                const data = await farmerPerformanceService.getFarmerPerformanceStats(user.staff.id);
                setMetrics(data);
                setInsights(farmerPerformanceService.getOverallInsights(data));
            } catch (e) {
                console.error(e);
            } finally {
                setLoading(false);
            }
        }
    };

    const filteredData = useMemo(() => {
        return metrics.filter(m => {
            const name = m.fullName || '';
            const regValid = m.registrationNumber || '';
            const matchesSearch = name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                regValid.includes(searchQuery);
            let matchesCategory = true;
            if (filterCategory === 'Attention') {
                matchesCategory = ['Declining', 'At-Risk'].includes(m.category);
            } else if (filterCategory === 'Top') {
                matchesCategory = ['Elite', 'Strong'].includes(m.category);
            } else if (filterCategory !== 'All') {
                matchesCategory = m.category === filterCategory;
            }
            return matchesSearch && matchesCategory;
        });
    }, [metrics, searchQuery, filterCategory]);

    const FilterTab = ({ label, value }: any) => (
        <TouchableOpacity
            style={[styles.filterTab, filterCategory === value && styles.filterTabActive]}
            onPress={() => setFilterCategory(value)}
        >
            <Text style={[styles.filterText, filterCategory === value && styles.filterTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0EA5E9" />
                <Text style={styles.loadingText}>Analyzing Performance Data...</Text>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header Section with Search */}
            <View style={styles.headerContainer}>
                <Text style={styles.screenTitle}>Performance Dashboard</Text>
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={20} color="#94A3B8" />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search farmers..."
                        placeholderTextColor="#94A3B8"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                </View>
            </View>

            <ScrollView style={styles.contentContainer} showsVerticalScrollIndicator={false}>
                {/* Insights Section */}
                <Text style={styles.sectionTitle}>Overview</Text>
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.insightsScroll}
                >
                    <InsightCard
                        title="Elite Squad"
                        count={insights?.eliteCount || 0}
                        subtitle="Farmers"
                        color="#10B981" // Green
                        bg="#D1FAE5"
                        icon="trophy"
                    />
                    <InsightCard
                        title="High Risk"
                        count={insights?.atRiskCount || 0}
                        subtitle="Action Needed"
                        color="#EF4444" // Red
                        bg="#FEE2E2"
                        icon="alert-circle"
                    />
                    <InsightCard
                        title="Declining"
                        count={insights?.decliningCount || 0}
                        subtitle="Monitor"
                        color="#F59E0B" // Amber
                        bg="#FEF3C7"
                        icon="trending-down"
                    />
                    <InsightCard
                        title="Total Volume"
                        count={(insights?.totalVolume30 / 1000).toFixed(1) + 'k'}
                        subtitle="Liters (30d)"
                        color="#3B82F6" // Blue
                        bg="#DBEAFE"
                        icon="water"
                    />
                </ScrollView>

                {/* Filters */}
                <View style={styles.filterSection}>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 20 }}>
                        <FilterTab label="All Farmers" value="All" />
                        <FilterTab label="⚠️ Action Needed" value="Attention" />
                        <FilterTab label="🏆 Top Tier" value="Top" />
                        <FilterTab label="Rising" value="Strong" />
                    </ScrollView>
                </View>

                {/* List Header */}
                <View style={styles.listHeaderRow}>
                    <Text style={styles.listTitle}>Farmer Rankings</Text>
                    <Text style={styles.listSubtitle}>{filteredData.length} records found</Text>
                </View>

                {/* Farmers List */}
                <View style={styles.listContainer}>
                    {filteredData.map((item) => (
                        <FarmerPerformanceCard key={item.farmerId} item={item} />
                    ))}
                    <View style={{ height: 40 }} />
                </View>
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC', // Slate-50
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center'
    },
    loadingText: {
        marginTop: 12,
        color: '#64748B',
        fontSize: 14,
        fontWeight: '500'
    },
    headerContainer: {
        backgroundColor: 'white',
        paddingHorizontal: 20,
        paddingTop: 60, // Safe area
        paddingBottom: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    screenTitle: {
        fontSize: 24,
        fontWeight: '800', // Extra bold
        color: '#1E293B',
        marginBottom: 16,
        letterSpacing: -0.5,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F1F5F9',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 48,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 16,
        color: '#334155',
        fontWeight: '500',
    },
    contentContainer: {
        flex: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
        marginLeft: 20,
        marginTop: 20,
        marginBottom: 12,
    },
    insightsScroll: {
        paddingHorizontal: 20,
        paddingBottom: 10,
    },
    insightCard: {
        width: 140, // Slightly wider
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 16,
        marginRight: 12,
        borderTopWidth: 4,
        // Premium Shadow
        ...Platform.select({
            ios: {
                shadowColor: '#64748B',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.1,
                shadowRadius: 12,
            },
            android: {
                elevation: 4,
            },
        }),
    },
    insightHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    iconBox: {
        width: 32,
        height: 32,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
    },
    insightCount: {
        fontSize: 24,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    insightSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    filterSection: {
        marginTop: 10,
        marginBottom: 10,
    },
    filterTab: {
        paddingHorizontal: 20, // Wider pills
        paddingVertical: 10,
        borderRadius: 24, // Full pill
        backgroundColor: 'white',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    filterTabActive: {
        backgroundColor: '#0EA5E9', // Sky-500
        borderColor: '#0EA5E9',
        ...Platform.select({
            ios: {
                shadowColor: '#0EA5E9',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    filterText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#64748B',
    },
    filterTextActive: {
        color: 'white',
    },
    listHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        paddingHorizontal: 20,
        marginTop: 10,
        marginBottom: 10,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#334155',
    },
    listSubtitle: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    listContainer: {
        paddingHorizontal: 20,
    },
    farmerCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
        // Sophisticated shadow
        ...Platform.select({
            ios: {
                shadowColor: '#64748B',
                shadowOffset: { width: 0, height: 8 },
                shadowOpacity: 0.08,
                shadowRadius: 16,
            },
            android: {
                elevation: 3,
            },
        }),
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 20,
    },
    avatarContainer: {
        width: 52,
        height: 52,
        borderRadius: 18, // Squircle-ish
        justifyContent: 'center',
        alignItems: 'center',
    },
    avatarText: {
        fontSize: 22,
        fontWeight: '800',
    },
    farmerName: {
        fontSize: 17,
        fontWeight: '700',
        color: '#1E293B',
    },
    regNumber: {
        fontSize: 13,
        color: '#94A3B8',
        marginTop: 2,
        fontWeight: '500',
    },
    badge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 8,
        marginLeft: 8,
    },
    badgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    statGrid: {
        flexDirection: 'row',
        backgroundColor: '#F8FAFC', // Very slight contrast background for stats
        borderRadius: 16,
        padding: 16,
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statCell: {
        flex: 1,
    },
    statLabel: {
        fontSize: 12,
        color: '#64748B',
        marginBottom: 6,
        fontWeight: '600',
    },
    statValueLarge: {
        fontSize: 20,
        fontWeight: '800',
    },
    statValueSmall: {
        fontSize: 12,
        color: '#94A3B8',
        marginLeft: 2,
        fontWeight: '500',
    },
    statValueDark: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 2,
    },
    trendBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 20,
        alignSelf: 'flex-start',
    },
    trendText: {
        fontSize: 12,
        fontWeight: '700',
        marginLeft: 4,
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9', // Very subtle divider
        paddingTop: 14,
    },
    lastSeen: {
        fontSize: 13,
        color: '#94A3B8',
        marginLeft: 6,
        flex: 1,
    },
    streakContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF7ED', // Orange-50
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    streakText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#EA580C', // Orange-600
    },
    viewProfileBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        marginLeft: 8,
    },
    viewProfileText: {
        fontSize: 12,
        fontWeight: '600',
        color: '#0EA5E9',
        marginRight: 4,
    },
});
