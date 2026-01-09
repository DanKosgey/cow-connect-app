
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    FlatList,
    TouchableOpacity,
    TextInput,
    Linking,
    Alert,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../services/database';
import { useFocusEffect } from '@react-navigation/native';

interface Farmer {
    id: string;
    full_name: string;
    phone_number: string | null;
    email: string | null;
    registration_number: string | null;
    number_of_cows: number | null;
    kyc_status: string;
    farm_location: string | null;
    physical_address: string | null;
}

const FarmerCard = ({ farmer }: { farmer: Farmer }) => {
    const initials = (farmer.full_name || 'Unknown').substring(0, 2).toUpperCase();
    const hasPhone = farmer.phone_number && farmer.phone_number.trim() !== '';

    const handleCall = () => {
        if (hasPhone) {
            Linking.openURL(`tel:${farmer.phone_number}`);
        } else {
            Alert.alert('No Phone', 'This farmer has no phone number on record.');
        }
    };

    const handleSMS = () => {
        if (hasPhone) {
            Linking.openURL(`sms:${farmer.phone_number}`);
        } else {
            Alert.alert('No Phone', 'This farmer has no phone number on record.');
        }
    };

    return (
        <View style={styles.farmerCard}>
            <View style={styles.farmerHeader}>
                <View style={styles.avatarLarge}>
                    <Text style={styles.avatarTextLarge}>{initials}</Text>
                </View>
                <View style={styles.farmerInfo}>
                    <Text style={styles.farmerName}>{farmer.full_name || 'Unknown Farmer'}</Text>
                    {farmer.registration_number && (
                        <Text style={styles.regNumber}>#{farmer.registration_number}</Text>
                    )}
                    <View style={styles.statusRow}>
                        <View style={[
                            styles.statusBadge,
                            { backgroundColor: farmer.kyc_status === 'approved' ? '#D1FAE5' : '#FEE2E2' }
                        ]}>
                            <Text style={[
                                styles.statusText,
                                { color: farmer.kyc_status === 'approved' ? '#059669' : '#DC2626' }
                            ]}>
                                {farmer.kyc_status === 'approved' ? 'Verified' : 'Unverified'}
                            </Text>
                        </View>
                        {farmer.number_of_cows && (
                            <Text style={styles.cowCount}>🐄 {farmer.number_of_cows} cows</Text>
                        )}
                    </View>
                </View>
            </View>

            {/* Contact Info */}
            <View style={styles.contactSection}>
                {hasPhone ? (
                    <View style={styles.contactRow}>
                        <Ionicons name="call-outline" size={16} color="#64748B" />
                        <Text style={styles.contactText}>{farmer.phone_number}</Text>
                    </View>
                ) : (
                    <View style={styles.contactRow}>
                        <Ionicons name="call-outline" size={16} color="#CBD5E1" />
                        <Text style={styles.contactTextMissing}>No phone number</Text>
                    </View>
                )}

                {farmer.email ? (
                    <View style={styles.contactRow}>
                        <Ionicons name="mail-outline" size={16} color="#64748B" />
                        <Text style={styles.contactText}>{farmer.email}</Text>
                    </View>
                ) : null}

                {farmer.physical_address ? (
                    <View style={styles.contactRow}>
                        <Ionicons name="location-outline" size={16} color="#64748B" />
                        <Text style={styles.contactText}>{farmer.physical_address}</Text>
                    </View>
                ) : farmer.farm_location ? (
                    <View style={styles.contactRow}>
                        <Ionicons name="location-outline" size={16} color="#64748B" />
                        <Text style={styles.contactText}>{farmer.farm_location}</Text>
                    </View>
                ) : null}
            </View>

            {/* Action Buttons */}
            {hasPhone && (
                <View style={styles.actionButtons}>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.callBtn]}
                        onPress={handleCall}
                    >
                        <Ionicons name="call" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>Call</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.smsBtn]}
                        onPress={handleSMS}
                    >
                        <Ionicons name="chatbubble" size={18} color="#fff" />
                        <Text style={styles.actionBtnText}>SMS</Text>
                    </TouchableOpacity>
                </View>
            )}
        </View>
    );
};

export const FarmersDirectoryScreen = ({ navigation }: any) => {
    const [farmers, setFarmers] = useState<Farmer[]>([]);
    const [filteredFarmers, setFilteredFarmers] = useState<Farmer[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'verified' | 'with_phone'>('all');

    const loadFarmers = async () => {
        setLoading(true);
        try {
            const db = await getDatabase();
            const result = await db.getAllAsync(`
                SELECT 
                    id, 
                    full_name, 
                    phone_number, 
                    email,
                    registration_number,
                    number_of_cows,
                    kyc_status,
                    farm_location,
                    physical_address
                FROM farmers_local
                ORDER BY full_name ASC
            `);
            setFarmers(result as Farmer[]);
            setFilteredFarmers(result as Farmer[]);
        } catch (e) {
            console.error('Failed to load farmers', e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadFarmers();
        }, [])
    );

    useEffect(() => {
        let filtered = farmers;

        // Apply filter
        if (filter === 'verified') {
            filtered = filtered.filter(f => f.kyc_status === 'approved');
        } else if (filter === 'with_phone') {
            filtered = filtered.filter(f => f.phone_number && f.phone_number.trim() !== '');
        }

        // Apply search
        if (searchQuery.trim() !== '') {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(f =>
                (f.full_name && f.full_name.toLowerCase().includes(query)) ||
                (f.phone_number && f.phone_number.includes(query)) ||
                (f.registration_number && f.registration_number.toLowerCase().includes(query))
            );
        }

        setFilteredFarmers(filtered);
    }, [searchQuery, filter, farmers]);

    const FilterChip = ({ label, value, icon }: any) => (
        <TouchableOpacity
            style={[styles.filterChip, filter === value && styles.filterChipActive]}
            onPress={() => setFilter(value)}
        >
            <Ionicons
                name={icon}
                size={16}
                color={filter === value ? '#fff' : '#64748B'}
            />
            <Text style={[styles.filterChipText, filter === value && styles.filterChipTextActive]}>
                {label}
            </Text>
        </TouchableOpacity>
    );

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Farmers Directory</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Search */}
            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#94A3B8" />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Search by name, phone, or ID..."
                    placeholderTextColor="#94A3B8"
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                />
                {searchQuery !== '' && (
                    <TouchableOpacity onPress={() => setSearchQuery('')}>
                        <Ionicons name="close-circle" size={20} color="#94A3B8" />
                    </TouchableOpacity>
                )}
            </View>

            {/* Filters */}
            <View style={styles.filterRow}>
                <FilterChip label="All" value="all" icon="people-outline" />
                <FilterChip label="Verified" value="verified" icon="checkmark-circle-outline" />
                <FilterChip label="With Phone" value="with_phone" icon="call-outline" />
            </View>

            {/* Stats */}
            <View style={styles.statsBar}>
                <Text style={styles.statsText}>
                    Showing {filteredFarmers.length} of {farmers.length} farmers
                </Text>
            </View>

            {/* List */}
            <FlatList
                data={filteredFarmers}
                renderItem={({ item }) => <FarmerCard farmer={item} />}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                ListEmptyComponent={
                    <View style={styles.emptyState}>
                        <Ionicons name="people-outline" size={48} color="#CBD5E1" />
                        <Text style={styles.emptyText}>No farmers found</Text>
                        <Text style={styles.emptySubtext}>Try adjusting your filters</Text>
                    </View>
                }
            />
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
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        marginHorizontal: 20,
        marginTop: 16,
        paddingHorizontal: 16,
        height: 48,
        borderRadius: 12,
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    searchInput: {
        flex: 1,
        marginLeft: 10,
        fontSize: 15,
        color: '#1E293B',
    },
    filterRow: {
        flexDirection: 'row',
        paddingHorizontal: 20,
        paddingVertical: 12,
        gap: 8,
    },
    filterChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#fff',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        gap: 6,
    },
    filterChipActive: {
        backgroundColor: '#0EA5E9',
        borderColor: '#0EA5E9',
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: '#64748B',
    },
    filterChipTextActive: {
        color: '#fff',
    },
    statsBar: {
        paddingHorizontal: 20,
        paddingVertical: 8,
    },
    statsText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    listContent: {
        paddingHorizontal: 20,
        paddingBottom: 20,
    },
    farmerCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
    },
    farmerHeader: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    avatarLarge: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: '#E0F2FE',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    avatarTextLarge: {
        fontSize: 20,
        fontWeight: '800',
        color: '#0EA5E9',
    },
    farmerInfo: {
        flex: 1,
    },
    farmerName: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 4,
    },
    regNumber: {
        fontSize: 13,
        color: '#64748B',
        marginBottom: 6,
    },
    statusRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    statusBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    cowCount: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
    },
    contactSection: {
        gap: 8,
        marginBottom: 16,
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: '#F1F5F9',
    },
    contactRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    contactText: {
        fontSize: 14,
        color: '#475569',
        flex: 1,
    },
    contactTextMissing: {
        fontSize: 14,
        color: '#CBD5E1',
        fontStyle: 'italic',
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 12,
    },
    actionBtn: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 12,
        borderRadius: 12,
        gap: 6,
    },
    callBtn: {
        backgroundColor: '#10B981',
    },
    smsBtn: {
        backgroundColor: '#0EA5E9',
    },
    actionBtnText: {
        fontSize: 14,
        fontWeight: '700',
        color: '#fff',
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
});
