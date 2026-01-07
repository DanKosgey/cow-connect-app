import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { getDatabase } from '../services/database';

export const DatabaseInspectorScreen = ({ navigation }: any) => {
    const [authCache, setAuthCache] = useState<any[]>([]);
    const [farmers, setFarmers] = useState<any[]>([]);
    const [collections, setCollections] = useState<any[]>([]);
    const [syncMeta, setSyncMeta] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDatabaseData();
    }, []);

    const loadDatabaseData = async () => {
        setLoading(true);
        try {
            const db = await getDatabase();

            // Get auth cache
            const authData = await db.getAllAsync('SELECT * FROM auth_cache');
            setAuthCache(authData);

            // Get farmers count
            const farmersData = await db.getAllAsync(
                'SELECT COUNT(*) as count FROM farmers_local'
            );
            setFarmers(farmersData);

            // Get collections
            const collectionsData = await db.getAllAsync(
                'SELECT * FROM collections_queue ORDER BY created_at DESC LIMIT 10'
            );
            setCollections(collectionsData);

            // Get sync metadata
            const syncData = await db.getAllAsync('SELECT * FROM sync_metadata');
            setSyncMeta(syncData);

            console.log('✅ Database inspection complete');
            console.log('Auth cache entries:', authData.length);
            console.log('Farmers count:', farmersData[0]?.count || 0);
            console.log('Collections:', collectionsData.length);
        } catch (error) {
            console.error('Database inspection error:', error);
            Alert.alert('Error', 'Failed to load database data: ' + error.message);
        } finally {
            setLoading(false);
        }
    };

    const clearAuthCache = async () => {
        Alert.alert(
            'Clear Auth Cache',
            'This will delete all cached login credentials. You will need to login online again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            const db = await getDatabase();
                            await db.runAsync('DELETE FROM auth_cache');
                            Alert.alert('Success', 'Auth cache cleared');
                            loadDatabaseData();
                        } catch (error) {
                            Alert.alert('Error', error.message);
                        }
                    },
                },
            ]
        );
    };

    if (loading) {
        return (
            <View style={styles.container}>
                <Text style={styles.loading}>Loading database...</Text>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <Text style={styles.title}>📊 Database Inspector</Text>
                <TouchableOpacity onPress={loadDatabaseData} style={styles.refreshBtn}>
                    <Text style={styles.refreshText}>🔄 Refresh</Text>
                </TouchableOpacity>
            </View>

            {/* Auth Cache Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    🔐 Auth Cache ({authCache.length} entries)
                </Text>
                {authCache.length === 0 ? (
                    <Text style={styles.emptyText}>
                        ❌ No cached credentials found.{'\n'}
                        You need to login online first!
                    </Text>
                ) : (
                    authCache.map((auth: any, index) => (
                        <View key={index} style={styles.card}>
                            <Text style={styles.label}>Email:</Text>
                            <Text style={styles.value}>{auth.email}</Text>

                            <Text style={styles.label}>User ID:</Text>
                            <Text style={styles.value}>{auth.user_id}</Text>

                            <Text style={styles.label}>Staff ID:</Text>
                            <Text style={styles.value}>{auth.staff_id}</Text>

                            <Text style={styles.label}>Full Name:</Text>
                            <Text style={styles.value}>{auth.full_name}</Text>

                            <Text style={styles.label}>Role:</Text>
                            <Text style={styles.value}>{auth.role}</Text>

                            <Text style={styles.label}>Last Login:</Text>
                            <Text style={styles.value}>{auth.last_login || 'Never'}</Text>

                            <Text style={styles.label}>Password Hash:</Text>
                            <Text style={styles.valueSmall}>
                                {auth.password_hash ? auth.password_hash.substring(0, 30) + '...' : 'None'}
                            </Text>

                            <Text style={styles.label}>Synced At:</Text>
                            <Text style={styles.value}>{auth.synced_at || 'Never'}</Text>
                        </View>
                    ))
                )}
                {authCache.length > 0 && (
                    <TouchableOpacity onPress={clearAuthCache} style={styles.dangerBtn}>
                        <Text style={styles.dangerText}>🗑️ Clear Auth Cache</Text>
                    </TouchableOpacity>
                )}
            </View>

            {/* Farmers Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    👨‍🌾 Farmers ({farmers[0]?.count || 0} cached)
                </Text>
                {(farmers[0]?.count || 0) === 0 ? (
                    <Text style={styles.emptyText}>
                        ❌ No farmers cached.{'\n'}
                        Farmers sync on first online login.
                    </Text>
                ) : (
                    <View style={styles.card}>
                        <Text style={styles.successText}>
                            ✅ {farmers[0]?.count} farmers cached locally
                        </Text>
                    </View>
                )}
            </View>

            {/* Collections Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    📦 Collections Queue ({collections.length} shown)
                </Text>
                {collections.length === 0 ? (
                    <Text style={styles.emptyText}>No collections in queue</Text>
                ) : (
                    collections.map((col: any, index) => (
                        <View key={index} style={styles.card}>
                            <Text style={styles.label}>Collection ID:</Text>
                            <Text style={styles.valueSmall}>{col.collection_id}</Text>

                            <Text style={styles.label}>Farmer ID:</Text>
                            <Text style={styles.valueSmall}>{col.farmer_id}</Text>

                            <Text style={styles.label}>Liters:</Text>
                            <Text style={styles.value}>{col.liters} L</Text>

                            <Text style={styles.label}>Status:</Text>
                            <Text style={[styles.value, col.status === 'pending_upload' ? styles.pending : styles.success]}>
                                {col.status}
                            </Text>

                            <Text style={styles.label}>Created:</Text>
                            <Text style={styles.value}>{col.created_at}</Text>
                        </View>
                    ))
                )}
            </View>

            {/* Sync Metadata Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    🔄 Sync Metadata ({syncMeta.length} entities)
                </Text>
                {syncMeta.length === 0 ? (
                    <Text style={styles.emptyText}>No sync metadata</Text>
                ) : (
                    syncMeta.map((meta: any, index) => (
                        <View key={index} style={styles.card}>
                            <Text style={styles.label}>Entity:</Text>
                            <Text style={styles.value}>{meta.entity_type}</Text>

                            <Text style={styles.label}>Last Sync:</Text>
                            <Text style={styles.value}>{meta.last_sync || 'Never'}</Text>

                            <Text style={styles.label}>Total Synced:</Text>
                            <Text style={styles.value}>{meta.total_synced}</Text>

                            <Text style={styles.label}>Status:</Text>
                            <Text style={styles.value}>{meta.sync_status}</Text>
                        </View>
                    ))
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f5f5f5',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        backgroundColor: '#fff',
        borderBottomWidth: 1,
        borderBottomColor: '#e0e0e0',
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    refreshBtn: {
        padding: 8,
        backgroundColor: '#0ea5e9',
        borderRadius: 6,
    },
    refreshText: {
        color: '#fff',
        fontWeight: '600',
    },
    loading: {
        textAlign: 'center',
        marginTop: 50,
        fontSize: 16,
        color: '#666',
    },
    section: {
        margin: 15,
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 10,
    },
    card: {
        backgroundColor: '#fff',
        padding: 15,
        borderRadius: 8,
        marginBottom: 10,
        elevation: 2,
    },
    label: {
        fontSize: 12,
        color: '#666',
        marginTop: 8,
        fontWeight: '600',
    },
    value: {
        fontSize: 14,
        color: '#333',
        marginTop: 2,
    },
    valueSmall: {
        fontSize: 12,
        color: '#333',
        marginTop: 2,
        fontFamily: 'monospace',
    },
    emptyText: {
        textAlign: 'center',
        color: '#999',
        fontStyle: 'italic',
        padding: 20,
        backgroundColor: '#fff',
        borderRadius: 8,
    },
    successText: {
        color: '#059669',
        fontSize: 16,
        fontWeight: '600',
    },
    pending: {
        color: '#d97706',
    },
    success: {
        color: '#059669',
    },
    dangerBtn: {
        marginTop: 10,
        padding: 12,
        backgroundColor: '#ef4444',
        borderRadius: 6,
        alignItems: 'center',
    },
    dangerText: {
        color: '#fff',
        fontWeight: '600',
    },
});
