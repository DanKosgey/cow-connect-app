import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { collectionLocalService } from '../services/collection.local.service';
import { collectionSyncService } from '../services/collection.sync.service';
import { useAuth } from '../hooks/useAuth';

export const CollectionHistoryScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [collections, setCollections] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [syncing, setSyncing] = useState(false);

    const loadHistory = async () => {
        if (!user?.staff?.id) return;
        setLoading(true);
        try {
            const history = await collectionLocalService.getAllHistory(user.staff.id, 100);
            setCollections(history);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadHistory();
        }, [])
    );

    const handleManualUpload = async () => {
        Alert.alert(
            "Upload Collections",
            "Are you sure you want to manually upload all pending collections?",
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Upload",
                    onPress: async () => {
                        setSyncing(true);
                        try {
                            const result = await collectionSyncService.uploadPendingCollections();
                            if (result.success > 0) {
                                Alert.alert("Success", `Uploaded ${result.success} collections.`);
                            } else if (result.failed > 0) {
                                Alert.alert("Issues Found", `Failed to upload ${result.failed} items. Check connectivity.`);
                            } else {
                                Alert.alert("Up to Date", "No pending collections found.");
                            }
                            loadHistory(); // Reload list
                        } catch (e: any) {
                            Alert.alert("Error", e.message || "Upload failed");
                        } finally {
                            setSyncing(false);
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: any) => {
        const isPending = item.status === 'pending_upload';
        const isFailed = item.status === 'failed' || (item.retry_count > 0 && isPending);

        return (
            <View style={styles.card}>
                <View style={[styles.statusStrip,
                { backgroundColor: item.status === 'uploaded' ? '#4CAF50' : isFailed ? '#F44336' : '#FF9800' }
                ]} />
                <View style={styles.content}>
                    <View style={styles.row}>
                        <Text style={styles.farmerName}>{item.farmer_name}</Text>
                        <Text style={styles.amount}>{item.liters} L</Text>
                    </View>
                    <View style={styles.row}>
                        <Text style={styles.date}>{new Date(item.created_at).toLocaleString()}</Text>
                        <View style={[styles.badge,
                        { backgroundColor: item.status === 'uploaded' ? '#E8F5E9' : '#FFF3E0' }
                        ]}>
                            <Text style={[styles.badgeText,
                            { color: item.status === 'uploaded' ? '#2E7D32' : '#EF6C00' }
                            ]}>
                                {isFailed ? 'Retry Needed' : item.status === 'uploaded' ? 'Synced' : 'Pending'}
                            </Text>
                        </View>
                    </View>
                    {item.error_message && (
                        <Text style={styles.errorText} numberOfLines={1}>Error: {item.error_message}</Text>
                    )}
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.title}>All Collections</Text>
                <TouchableOpacity
                    style={styles.uploadButton}
                    onPress={handleManualUpload}
                    disabled={syncing}
                >
                    {syncing ? (
                        <ActivityIndicator color="#FFF" size="small" />
                    ) : (
                        <Ionicons name="cloud-upload" size={20} color="#FFF" />
                    )}
                    <Text style={styles.uploadButtonText}>Upload Pending</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2563EB" />
                </View>
            ) : (
                <FlatList
                    data={collections}
                    renderItem={renderItem}
                    keyExtractor={item => item.local_id}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.center}>
                            <Text style={styles.emptyText}>No collections found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8FAFC' },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: '#FFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E2E8F0',
        elevation: 2,
    },
    backButton: { marginRight: 16 },
    title: { fontSize: 18, fontWeight: '600', color: '#1E293B', flex: 1 },
    uploadButton: {
        flexDirection: 'row',
        backgroundColor: '#2563EB',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        alignItems: 'center',
        gap: 6
    },
    uploadButtonText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    list: { padding: 16 },
    card: {
        flexDirection: 'row',
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 12,
        overflow: 'hidden',
        elevation: 2,
        shadowColor: '#000',
        shadowOpacity: 0.05,
        shadowRadius: 4,
        shadowOffset: { width: 0, height: 2 },
    },
    statusStrip: { width: 6 },
    content: { flex: 1, padding: 12 },
    row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    farmerName: { fontSize: 16, fontWeight: '600', color: '#334155' },
    amount: { fontSize: 16, fontWeight: 'bold', color: '#1E293B' },
    date: { fontSize: 12, color: '#64748B' },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12 },
    badgeText: { fontSize: 10, fontWeight: 'bold' },
    errorText: { color: '#EF4444', fontSize: 11, marginTop: 4 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: 50 },
    emptyText: { color: '#94A3B8' }
});
