
import React, { useState, useEffect } from 'react';
import {
    View, Text, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, TextInput, FlatList
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collectionLocalService } from '../services/collection.local.service';
import { useAuth } from '../hooks/useAuth';

export const RecentFarmersScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [farmers, setFarmers] = useState<any[]>([]);
    const [filteredFarmers, setFilteredFarmers] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadFarmers();
    }, []);

    const loadFarmers = async () => {
        try {
            if (user?.staff?.id) {
                setLoading(true);
                // Fetch up to 100 recent farmers
                const data = await collectionLocalService.getRecentFarmers(user.staff.id, 100);
                setFarmers(data);
                setFilteredFarmers(data);
            }
        } catch (error) {
            console.error('Failed to load recent farmers:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = (text: string) => {
        setSearchQuery(text);
        if (text) {
            const lower = text.toLowerCase();
            const filtered = farmers.filter(f =>
                f.full_name.toLowerCase().includes(lower) ||
                f.registration_number?.toLowerCase().includes(lower)
            );
            setFilteredFarmers(filtered);
        } else {
            setFilteredFarmers(farmers);
        }
    };

    const handleSelect = (farmer: any) => {
        // Navigate back to NewCollection with the selected farmer
        navigation.navigate('NewCollection', { selectedFarmer: farmer });
    };

    const getInitials = (name: string) => {
        if (!name) return '??';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    const renderItem = ({ item, index }: { item: any, index: number }) => (
        <TouchableOpacity style={styles.itemCard} onPress={() => handleSelect(item)}>
            <View style={styles.rankBadge}>
                <Text style={styles.rankText}>#{index + 1}</Text>
            </View>
            <View style={styles.avatar}>
                <Text style={styles.avatarText}>{getInitials(item.full_name)}</Text>
            </View>
            <View style={styles.info}>
                <Text style={styles.name}>{item.full_name}</Text>
                <Text style={styles.details}>Reg: {item.registration_number}</Text>
                <Text style={styles.lastInteraction}>
                    Last: {new Date(item.last_interaction).toLocaleDateString()}
                </Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
    );

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Recent Farmers</Text>
            </View>

            <View style={styles.searchContainer}>
                <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    style={styles.searchInput}
                    placeholder="Filter recent list..."
                    value={searchQuery}
                    onChangeText={handleSearch}
                />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#2196F3" />
                </View>
            ) : (
                <FlatList
                    data={filteredFarmers}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <Text style={styles.emptyText}>No recent farmers found.</Text>
                        </View>
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
        paddingTop: 50, // Status bar spacing
    },
    backButton: {
        padding: 8,
        marginRight: 8,
    },
    title: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1A1A1A',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#DDD',
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
    },
    listContent: {
        paddingHorizontal: 16,
        paddingBottom: 20,
    },
    itemCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'white',
        padding: 12,
        marginBottom: 10,
        borderRadius: 12,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    rankBadge: {
        backgroundColor: '#E3F2FD',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
        marginRight: 10,
    },
    rankText: {
        fontSize: 12,
        fontWeight: '700',
        color: '#2196F3',
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F1F8E9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#558B2F',
    },
    info: {
        flex: 1,
    },
    name: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
    },
    details: {
        fontSize: 13,
        color: '#666',
    },
    lastInteraction: {
        fontSize: 11,
        color: '#999',
        marginTop: 2,
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
    },
    emptyText: {
        color: '#999',
        fontSize: 16,
    },
});
