
import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { collectionLocalService } from '../services/collection.local.service';
import { useAuth } from '../hooks/useAuth';
import { useBackgroundSync } from '../hooks/useBackgroundSync';

// Simple card component
const SummaryCard = ({ title, value, color }: { title: string, value: string | number, color: string }) => (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 4 }]}>
        <Text style={styles.cardTitle}>{title}</Text>
        <Text style={styles.cardValue}>{value}</Text>
    </View>
);

export const HomeScreen = ({ navigation }: any) => {
    const { user, logout } = useAuth();
    const [pendingCount, setPendingCount] = useState(0);
    const [recentCollections, setRecentCollections] = useState<any[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const loadData = async () => {
        if (!user?.staff?.id) return;
        const count = await collectionLocalService.getPendingCount(user.staff.id);
        setPendingCount(count);

        // Get simple list of local collections (pending)
        // Ideally we would also fetch "synced" ones if we stored them locally after sync
        const pending = await collectionLocalService.getRecentCollections(user.staff.id);
        setRecentCollections(pending);
    };

    useFocusEffect(
        useCallback(() => {
            loadData();
        }, [])
    );

    const onRefresh = async () => {
        setRefreshing(true);
        await loadData();
        setRefreshing(false);
    };

    const renderItem = ({ item }: { item: any }) => (
        <View style={styles.listItem}>
            <View style={styles.row}>
                <Text style={styles.farmerName}>{item.farmer_name || 'Unknown Farmer'}</Text>
                <Text style={styles.date}>{new Date(item.created_at).toLocaleTimeString()}</Text>
            </View>
            <View style={styles.row}>
                <Text style={styles.liters}>{item.liters} Ltr</Text>
                <Text style={styles.amount}>{(item.liters * item.rate).toFixed(2)} KSH</Text>
            </View>
            <Text style={[styles.status, item.status === 'pending_upload' ? styles.statusPending : styles.statusSynced]}>
                {item.status === 'pending_upload' ? '⏳ Pending Upload' : '✅ Synced'}
            </Text>
        </View>
    );

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <View>
                    <Text style={styles.greeting}>Hello, {user?.staff?.full_name || 'Collector'}</Text>
                    <Text style={styles.subtext}>Ready to collect milk?</Text>
                </View>
                <View style={{ flexDirection: 'row', gap: 10 }}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate('DatabaseInspector')}
                        style={styles.debugBtn}
                    >
                        <Text style={styles.debugText}>📊 DB</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={logout} style={styles.logoutBtn}>
                        <Text style={styles.logoutText}>Logout</Text>
                    </TouchableOpacity>
                </View>
            </View>

            {/* Summary */}
            <View style={styles.summaryContainer}>
                <SummaryCard
                    title="Pending Sync"
                    value={pendingCount}
                    color="#fbbf24"
                />
                <SummaryCard
                    title="Total Today"
                    // Placeholder for actual daily calculation
                    value={`${recentCollections.reduce((acc, curr) => acc + curr.liters, 0).toFixed(1)} L`}
                    color="#10b981"
                />
            </View>

            {/* Action Button */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => navigation.navigate('NewCollection')}
            >
                <Text style={styles.fabText}>+ New Collection</Text>
            </TouchableOpacity>

            {/* Recent List */}
            <Text style={styles.sectionTitle}>Recent Collections (Local)</Text>
            <FlatList
                data={recentCollections}
                renderItem={renderItem}
                keyExtractor={item => item.local_id}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
                ListEmptyComponent={
                    <Text style={styles.emptyText}>No collections recorded yet.</Text>
                }
                contentContainerStyle={styles.listContent}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f8fafc',
    },
    header: {
        padding: 20,
        backgroundColor: '#fff',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 10,
        elevation: 2,
    },
    greeting: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    subtext: {
        color: '#64748b',
        fontSize: 14,
    },
    logoutBtn: {
        padding: 8,
    },
    logoutText: {
        color: '#ef4444',
        fontWeight: '600',
    },
    debugBtn: {
        padding: 8,
        backgroundColor: '#0ea5e9',
        borderRadius: 4,
    },
    debugText: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 12,
    },
    summaryContainer: {
        flexDirection: 'row',
        padding: 20,
        gap: 15,
    },
    card: {
        flex: 1,
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        elevation: 2,
    },
    cardTitle: {
        fontSize: 12,
        color: '#64748b',
        marginBottom: 5,
        textTransform: 'uppercase',
    },
    cardValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1e293b',
    },
    fab: {
        backgroundColor: '#0ea5e9',
        margin: 20,
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
        elevation: 4,
    },
    fabText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#334155',
        marginLeft: 20,
        marginBottom: 10,
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    listItem: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        elevation: 1,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 5,
    },
    farmerName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1e293b',
    },
    date: {
        fontSize: 12,
        color: '#94a3b8',
    },
    liters: {
        fontSize: 14,
        color: '#0f172a',
        fontWeight: '500',
    },
    amount: {
        fontSize: 14,
        color: '#059669',
        fontWeight: '500',
    },
    status: {
        fontSize: 12,
        marginTop: 5,
        alignSelf: 'flex-start',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
        overflow: 'hidden',
    },
    statusPending: {
        backgroundColor: '#fef3c7',
        color: '#d97706',
    },
    statusSynced: {
        backgroundColor: '#d1fae5',
        color: '#059669',
    },
    emptyText: {
        textAlign: 'center',
        color: '#94a3b8',
        marginTop: 20,
        fontStyle: 'italic',
    },
});
