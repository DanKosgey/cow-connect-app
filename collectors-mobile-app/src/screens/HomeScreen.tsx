
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl, DeviceEventEmitter, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { collectionLocalService } from '../services/collection.local.service';
import { farmerSyncService } from '../services/farmer.sync.service';
import { collectorRateService } from '../services/collector.rate.service';
import { useAuth } from '../hooks/useAuth';

// Clean Summary Card
const SummaryCard = ({ title, value, color, icon }: any) => (
    <View style={styles.summaryCard}>
        <View style={[styles.iconCircle, { backgroundColor: color + '15' }]}>
            <Ionicons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.summaryValue}>{value}</Text>
        <Text style={styles.summaryLabel}>{title}</Text>
    </View>
);

// Collection Item with Avatar
// Collection Item with Avatar
const CollectionItem = ({ item }: any) => {
    const initials = (item.farmer_name || 'U').substring(0, 2).toUpperCase();

    // Fix: Parse SQLite UTC string "YYYY-MM-DD HH:MM:SS" as UTC
    const formatTime = (dateString: string) => {
        if (!dateString) return '';
        // Convert "YYYY-MM-DD HH:MM:SS" -> "YYYY-MM-DDTHH:MM:SSZ"
        const isoString = dateString.replace(' ', 'T') + 'Z';
        try {
            return new Date(isoString).toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit',
                hour12: true // e.g. 2:30 PM
            });
        } catch (e) {
            return dateString;
        }
    };

    const time = formatTime(item.created_at);

    return (
        <View style={styles.collectionCard}>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{initials}</Text>
            </View>
            <View style={styles.collectionInfo}>
                <Text style={styles.farmerName}>{item.farmer_name || 'Unknown Farmer'}</Text>
                <Text style={styles.collectionDetails}>{item.liters}L • {time}</Text>
            </View>
            <View style={styles.collectionRight}>
                <Text style={styles.amount}>KSH {(item.liters * item.rate).toFixed(0)}</Text>
                {item.status === 'uploaded' && (
                    <Ionicons name="checkmark-circle" size={16} color="#10B981" />
                )}
            </View>
        </View>
    );
};

export const HomeScreen = ({ navigation }: any) => {
    const { user, logout } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);
    const [todayTotal, setTodayTotal] = useState(0);
    const [recentCollections, setRecentCollections] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const syncFarmers = async () => {
        if (!user?.staff?.id) return;
        try {
            const res = await farmerSyncService.syncAllFarmers(user.staff.id);
            if (res.success) {
                console.log('✅ Farmers synced automatically');
            }
        } catch (e) {
            console.error('Farmer sync failed:', e);
        }
    };

    // Initial Sync on Mount
    useEffect(() => {
        // We still run this in background on mount for speed, 
        // but we trigger a reload after it finishes.
        syncFarmers().then(() => loadData());

        // Sync rates
        collectorRateService.init().then(() => {
            collectorRateService.syncRates();
        });
    }, []);

    const loadData = async () => {
        if (!user?.staff?.id) return;

        const count = await collectionLocalService.getPendingCount(user.staff.id);
        setPendingCount(count);

        const recent = await collectionLocalService.getRecentCollections(user.staff.id);
        setRecentCollections(recent);

        // Calculate today's total
        const today = recent.filter((c: any) => {
            const collectionDate = new Date(c.created_at).toDateString();
            const todayDate = new Date().toDateString();
            return collectionDate === todayDate;
        });
        const total = today.reduce((sum: number, c: any) => sum + c.liters, 0);
        setTodayTotal(total);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    useEffect(() => {
        const subscription = DeviceEventEmitter.addListener('SYNC_COMPLETED', () => {
            // Reload data whenever background sync finishes
            loadData();
        });
        return () => subscription.remove();
    }, []);

    const onRefresh = async () => {
        setRefreshing(true);
        // Sequential: Sync FIRST, then Load
        await syncFarmers();
        await loadData();
        setRefreshing(false);
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 18) return 'Good Afternoon';
        return 'Good Evening';
    };

    const handleLogout = () => {
        Alert.alert(
            'Logout',
            'Are you sure you want to logout?',
            [
                {
                    text: 'Cancel',
                    style: 'cancel',
                },
                {
                    text: 'Logout',
                    style: 'destructive',
                    onPress: async () => {
                        await logout();
                    },
                },
            ],
            { cancelable: true }
        );
    };

    return (
        <View style={styles.container}>
            {/* Clean Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>{getGreeting()}</Text>
                    <Text style={styles.userName}>{user?.staff?.full_name || 'Collector'}</Text>
                </View>
                <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout}>
                    <Ionicons name="log-out-outline" size={24} color="#DC2626" />
                </TouchableOpacity>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryContainer}>
                <SummaryCard
                    title="Pending Sync"
                    value={pendingCount}
                    color="#F59E0B"
                    icon="cloud-upload-outline"
                />
                <SummaryCard
                    title="Total Today"
                    value={`${todayTotal.toFixed(1)}L`}
                    color="#10B981"
                    icon="water-outline"
                />
            </View>

            {/* List Header */}
            <View style={styles.listHeader}>
                <Text style={styles.listTitle}>Recent Activity</Text>
                <TouchableOpacity onPress={() => navigation.navigate('RecentFarmers')}>
                    <Text style={styles.seeAll}>See All</Text>
                </TouchableOpacity>
            </View>

            {/* Collections List */}
            <FlatList
                data={recentCollections}
                renderItem={({ item }) => <CollectionItem item={item} />}
                keyExtractor={(item) => item.local_id}
                contentContainerStyle={styles.listContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No collections yet</Text>
                        <Text style={styles.emptySubtext}>Tap the + button to start</Text>
                    </View>
                }
            />

            {/* Floating Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('NewCollection')}
            >
                <Ionicons name="add" size={28} color="#fff" />
            </TouchableOpacity>

            {/* Bottom Navigation */}
            <View style={styles.bottomNav}>
                <TouchableOpacity style={styles.navItem} onPress={() => { }}>
                    <Ionicons name="home" size={24} color="#16A34A" />
                    <Text style={[styles.navLabel, styles.navLabelActive]}>Home</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('FarmerPerformance')}
                >
                    <Ionicons name="people-outline" size={24} color="#64748B" />
                    <Text style={styles.navLabel}>Farmers</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('CollectorPerformance')}
                >
                    <Ionicons name="stats-chart-outline" size={24} color="#64748B" />
                    <Text style={styles.navLabel}>Earnings</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={styles.navItem}
                    onPress={() => navigation.navigate('FarmersDirectory')}
                >
                    <Ionicons name="book-outline" size={24} color="#64748B" />
                    <Text style={styles.navLabel}>Directory</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0FDF4', // Green-50, was F8FAFC
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: '#fff',
    },
    greeting: {
        fontSize: 14,
        color: '#64748B',
        fontWeight: '500',
    },
    userName: {
        fontSize: 24,
        fontWeight: '800',
        color: '#14532D', // Green-900
        marginTop: 2,
    },
    profileBtn: {
        padding: 4,
    },
    logoutBtn: {
        padding: 8,
        borderRadius: 12,
        backgroundColor: '#FEE2E2', // Red-100
        justifyContent: 'center',
        alignItems: 'center',
    },
    summaryContainer: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 20,
        gap: 12,
    },
    summaryCard: {
        flex: 1,
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        alignItems: 'center',
        elevation: 2,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    iconCircle: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 12,
    },
    summaryValue: {
        fontSize: 28,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
    },
    summaryLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    listHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 20,
        marginBottom: 12,
    },
    listTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    seeAll: {
        fontSize: 14,
        color: '#16A34A', // Green
        fontWeight: '600',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 100, // Space for bottom nav + FAB
    },
    collectionCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        elevation: 1,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 4,
    },
    avatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: '#DCFCE7', // Green-100
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#16A34A', // Green-600
    },
    collectionInfo: {
        flex: 1,
    },
    farmerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    collectionDetails: {
        fontSize: 13,
        color: '#94A3B8',
        fontWeight: '500',
    },
    collectionRight: {
        alignItems: 'flex-end',
        gap: 4,
    },
    amount: {
        fontSize: 17,
        fontWeight: '800',
        color: '#16A34A', // Green-600
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 60,
    },
    emptyText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#64748B',
        marginTop: 16,
    },
    emptySubtext: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 4,
    },
    fab: {
        position: 'absolute',
        right: 20,
        bottom: 90,
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: '#16A34A', // Green-600
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 8,
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
    },
    bottomNav: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        backgroundColor: '#fff',
        paddingVertical: 12,
        paddingBottom: 20,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
        elevation: 8,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    navItem: {
        flex: 1,
        alignItems: 'center',
        gap: 4,
    },
    navLabel: {
        fontSize: 11,
        fontWeight: '600',
        color: '#94A3B8',
    },
    navLabelActive: {
        color: '#16A34A', // Green
    },
});
