import React, { useState, useEffect } from 'react';
import {
    View, Text, TextInput, TouchableOpacity, Image, Alert, ScrollView, StyleSheet, ActivityIndicator, Platform, KeyboardAvoidingView, DeviceEventEmitter
} from 'react-native';
import * as Location from 'expo-location';
import * as ImagePicker from 'expo-image-picker';
import { useNetInfo } from '@react-native-community/netinfo';
import { Ionicons } from '@expo/vector-icons';
import { collectionLocalService } from '../services/collection.local.service';
import { collectionSyncService } from '../services/collection.sync.service';
import { farmerSyncService } from '../services/farmer.sync.service';
import { collectorRateService } from '../services/collector.rate.service';
import { milkRateService } from '../services/milk.rate.service';
import { useAuth } from '../hooks/useAuth';

export const NewCollectionScreen = ({ navigation, route }: any) => {
    const netInfo = useNetInfo();
    const { user } = useAuth();

    // Form State
    const [searchQuery, setSearchQuery] = useState('');
    const [farmers, setFarmers] = useState<any[]>([]);
    const [selectedFarmer, setSelectedFarmer] = useState<any>(null);
    const [liters, setLiters] = useState('');
    const [collectorRate, setCollectorRate] = useState('0.00'); // Collector earnings per liter
    const [milkRate, setMilkRate] = useState('0.00'); // Farmer earnings per liter (saved to DB)
    const [notes, setNotes] = useState('');
    const [photoUri, setPhotoUri] = useState<string | null>(null);
    const [isCancelled, setIsCancelled] = useState(false);

    // System State
    const [location, setLocation] = useState<any>(null);
    const [locationStatus, setLocationStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'denied'>('idle');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [recentCollections, setRecentCollections] = useState<any[]>([]);
    const [recentFarmers, setRecentFarmers] = useState<any[]>([]);
    const [pendingCount, setPendingCount] = useState(0);
    const [isSyncing, setIsSyncing] = useState(false);
    const [farmerCount, setFarmerCount] = useState(0);
    const [isLoadingFarmers, setIsLoadingFarmers] = useState(false);

    const isOnline = netInfo.isConnected && netInfo.isInternetReachable;

    // Helper for avatars
    const getInitials = (name: string) => {
        if (!name) return '??';
        return name
            .split(' ')
            .map(n => n[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    useEffect(() => {
        // Handle selection from RecentFarmersScreen
        if (route.params?.selectedFarmer) {
            selectFarmer(route.params.selectedFarmer);
            // Clear params to avoid sticky selection if needed, though mostly harmless here
            navigation.setParams({ selectedFarmer: undefined });
        }
    }, [route.params?.selectedFarmer]);

    useEffect(() => {
        initializeScreen();

        // Listen for sync events
        const subscription = DeviceEventEmitter.addListener('SYNC_COMPLETED', () => {
            console.log('🔄 [UI - NewCollection] Sync completed, refreshing data...');
            refreshData();
        });

        return () => subscription.remove();
    }, []);

    const initializeScreen = async () => {
        await requestPermissions();

        // Fetch both rates
        const currentCollectorRate = await collectorRateService.getCurrentRate();
        setCollectorRate(currentCollectorRate.toFixed(2));

        const currentMilkRate = await milkRateService.getCurrentRate();
        setMilkRate(currentMilkRate.toFixed(2));

        await refreshData();

        // Auto-sync farmers in background (INCREMENTAL ONLY)
        if (user?.staff?.id && isOnline) {
            console.log('[UI] Auto-syncing updated farmers...');
            farmerSyncService.syncFarmerUpdates().then(res => {
                if (res.success && res.count > 0) {
                    console.log(`✅ Background sync added ${res.count} new/updated farmers`);
                    refreshData(); // Refresh counts and recent lists
                }
            });
        }
    };

    const refreshData = async () => {
        try {
            if (!user?.staff?.id) return;
            const recent = await collectionLocalService.getRecentCollections(user.staff.id);
            setRecentCollections(recent);
            const count = await collectionLocalService.getPendingCount(user.staff.id);
            setPendingCount(count);

            const fCount = await farmerSyncService.getFarmerCount();
            setFarmerCount(fCount);

            // Load Recent Farmers
            const quickFarmers = await collectionLocalService.getRecentFarmers(user.staff.id);
            setRecentFarmers(quickFarmers);

            console.log(`[REFRESH] Pending: ${count}, Farmers: ${fCount}, Recent: ${quickFarmers.length}`);
        } catch (error) {
            console.error('Failed to refresh data', error);
        }
    };

    const requestPermissions = async () => {
        try {
            const locationStatus = await Location.requestForegroundPermissionsAsync();
            await ImagePicker.requestCameraPermissionsAsync();
            return locationStatus.status === 'granted';
        } catch (error) {
            console.error('Permission request error:', error);
            return false;
        }
    };

    const getCurrentLocation = async () => {
        setLocationStatus('loading');
        try {
            const hasPermission = await requestPermissions();
            if (!hasPermission) {
                setLocationStatus('denied');
                Alert.alert(
                    'Permission Required',
                    'Location permission is needed to tag collections. Please enable it in your device settings.',
                    [{ text: 'OK' }]
                );
                return;
            }

            console.log('[LOCATION] Attempting to get current position (Balanced)...');

            // Race between location request and 10s timeout
            const timeoutWarning = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Location request timed out')), 10000)
            );

            const loc: any = await Promise.race([
                Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced }),
                timeoutWarning
            ]);

            console.log('[LOCATION] Success:', loc.coords);
            setLocation(loc.coords);
            setLocationStatus('success');

        } catch (error) {
            console.warn('[LOCATION] Primary request failed:', error);

            // Fallback to last known position
            try {
                console.log('[LOCATION] Trying last known position...');
                const lastLoc = await Location.getLastKnownPositionAsync({});
                if (lastLoc && lastLoc.coords) {
                    console.log('[LOCATION] Using last known:', lastLoc.coords);
                    setLocation(lastLoc.coords);
                    setLocationStatus('success');

                    Alert.alert(
                        'Location Acquired',
                        `Using last known location (GPS signal weak).`,
                        [{ text: 'OK' }]
                    );
                } else {
                    throw new Error('No last known location available');
                }
            } catch (fallbackError) {
                console.error('[LOCATION] All attempts failed:', fallbackError);
                setLocationStatus('error');
                Alert.alert(
                    'Location Error',
                    'Unable to get your location. Please check if GPS is enabled.',
                    [{ text: 'Retry', onPress: getCurrentLocation }, { text: 'Cancel', style: 'cancel' }]
                );
            }
        }
    };

    const searchFarmers = async (query: string) => {
        setSearchQuery(query);
        if (query.length > 1) {
            setIsLoadingFarmers(true);
            try {
                const results = await farmerSyncService.searchFarmersLocal(query);
                setFarmers(results);
            } catch (error) {
                console.error('[SEARCH] Error:', error);
                setFarmers([]);
            } finally {
                setIsLoadingFarmers(false);
            }
        } else {
            setFarmers([]);
        }
    };

    const selectFarmer = (farmer: any) => {
        setSelectedFarmer(farmer);
        setSearchQuery(farmer.full_name);
        setFarmers([]);
    };

    const clearFarmerSelection = () => {
        setSelectedFarmer(null);
        setSearchQuery('');
        setFarmers([]);
    };

    const takePhoto = async () => {
        try {
            const { status } = await ImagePicker.requestCameraPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert('Permission Required', 'Camera permission is needed to take photos.');
                return;
            }

            const result = await ImagePicker.launchCameraAsync({
                mediaTypes: ImagePicker.MediaTypeOptions.Images,
                quality: 0.8,
                allowsEditing: false,
            });

            if (!result.canceled && result.assets[0]) {
                setPhotoUri(result.assets[0].uri);
            }
        } catch (error) {
            console.error('[PHOTO] Error:', error);
            Alert.alert('Error', 'Failed to take photo. Please try again.');
        }
    };

    const removePhoto = () => {
        setPhotoUri(null);
    };

    const handleSync = async () => {
        if (!isOnline) {
            Alert.alert('Offline', 'You need an internet connection to upload pending collections.');
            return;
        }

        setIsSyncing(true);
        try {
            const result = await collectionSyncService.uploadPendingCollections();
            let message = `Successfully uploaded: ${result.success}`;
            if (result.failed > 0) message += `\nFailed: ${result.failed}`;

            Alert.alert('Sync Complete', message);
            await refreshData();
        } catch (error: any) {
            Alert.alert('Sync Error', error.message || 'Failed to sync collections');
        } finally {
            setIsSyncing(false);
        }
    };

    // Manual Refresh Button (Force Full Download)
    const handleFarmerSync = async () => {
        if (!isOnline) {
            Alert.alert('Offline', 'You need an internet connection to download farmers.');
            return;
        }

        setIsSyncing(true);
        try {
            // Explicitly force full refresh
            const result = await farmerSyncService.forceRefreshFarmers();
            Alert.alert('Success', `Database refreshed. Total farmers: ${result.count}`);
            await refreshData();
        } catch (error: any) {
            Alert.alert('Download Error', error.message || 'Failed to download farmers');
        } finally {
            setIsSyncing(false);
        }
    };

    const handleSubmit = async () => {
        // Validation
        if (!selectedFarmer) {
            Alert.alert('Validation Error', 'Please select a farmer');
            return;
        }

        if (!isCancelled && (!liters || parseFloat(liters) <= 0)) {
            Alert.alert('Validation Error', 'Please enter valid liters (must be greater than 0)');
            return;
        }

        if (locationStatus !== 'success' || !location) {
            Alert.alert(
                'Location Required',
                'Please acquire your GPS location before submitting the collection.',
                [{ text: 'OK' }]
            );
            return;
        }

        setIsSubmitting(true);

        try {
            if (!user?.staff?.id) {
                Alert.alert('Error', 'Unable to identify collector. Please log in again.');
                return;
            }

            await collectionLocalService.createCollectionLocal({
                farmerId: selectedFarmer.id,
                farmerName: selectedFarmer.full_name, // Pass name explicitly
                collectorId: user.staff.id,
                liters: isCancelled ? 0 : parseFloat(liters),
                rate: parseFloat(milkRate), // Use milk rate (farmer rate) for database
                gpsLatitude: location.latitude,
                gpsLongitude: location.longitude,
                notes: isCancelled ? `[CANCELLED] ${notes}` : notes,
                photoUri: photoUri || undefined,
            });

            await refreshData();

            Alert.alert(
                'Success',
                'Collection recorded successfully!',
                [{
                    text: 'OK',
                    onPress: resetForm
                }]
            );

        } catch (error: any) {
            console.error('[SUBMIT] Error:', error);
            Alert.alert('Error', error.message || 'Failed to record collection');
        } finally {
            setIsSubmitting(false);
        }
    };

    const resetForm = () => {
        setLiters('');
        setPhotoUri(null);
        setNotes('');
        setSelectedFarmer(null);
        setSearchQuery('');
        setIsCancelled(false);
        setFarmers([]);
        setLocationStatus('idle');
        setLocation(null);
    };

    const collectorEarnings = isCancelled ? 0 : (parseFloat(liters || '0') * parseFloat(collectorRate || '0'));
    const farmerEarnings = isCancelled ? 0 : (parseFloat(liters || '0') * parseFloat(milkRate || '0'));

    const getLocationButtonColor = () => {
        switch (locationStatus) {
            case 'success': return '#4CAF50';
            case 'error': return '#F44336';
            case 'denied': return '#FF9800';
            case 'loading': return '#2196F3';
            default: return '#2196F3';
        }
    };

    const getLocationButtonText = () => {
        switch (locationStatus) {
            case 'loading': return 'Getting Location...';
            case 'success': return 'Location Acquired ✓';
            case 'error': return 'Retry Location';
            case 'denied': return 'Permission Denied';
            default: return 'Get My Location';
        }
    };

    return (
        <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
            <ScrollView
                style={styles.container}
                contentContainerStyle={{ paddingBottom: 40 }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
            >
                {/* Header */}
                <View style={styles.header}>
                    <View style={{ flex: 1 }}>
                        <Text style={styles.headerTitle}>New Milk Collection</Text>
                        <Text style={styles.headerSubtitle}>Record a new collection from a farmer</Text>
                    </View>
                    <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                        <Ionicons name="arrow-back" size={20} color="#333" />
                    </TouchableOpacity>
                </View>

                {/* Connection Status Banner */}
                {!isOnline && (
                    <View style={styles.offlineBanner}>
                        <Ionicons name="cloud-offline-outline" size={18} color="#fff" />
                        <Text style={styles.offlineBannerText}>
                            Working Offline - Collections will sync when online
                        </Text>
                    </View>
                )}

                {/* Sync Status Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="sync-outline" size={22} color="#2196F3" />
                        <Text style={styles.cardTitle}>Sync Status</Text>
                    </View>

                    <View style={styles.syncStatusContainer}>
                        <View style={styles.syncStatItem}>
                            <Text style={styles.syncStatLabel}>Pending Uploads</Text>
                            <Text style={[
                                styles.syncStatValue,
                                { color: pendingCount > 0 ? '#F57C00' : '#4CAF50' }
                            ]}>
                                {pendingCount}
                            </Text>
                        </View>

                        <View style={styles.syncStatDivider} />

                        <View style={styles.syncStatItem}>
                            <Text style={styles.syncStatLabel}>Farmers Downloaded</Text>
                            <Text style={[styles.syncStatValue, { color: '#2196F3' }]}>
                                {farmerCount}
                            </Text>
                        </View>
                    </View>

                    {pendingCount > 0 && (
                        <TouchableOpacity
                            style={[
                                styles.syncBtn,
                                (isSyncing || !isOnline) && styles.syncBtnDisabled
                            ]}
                            onPress={handleSync}
                            disabled={isSyncing || !isOnline}
                        >
                            {isSyncing ? (
                                <ActivityIndicator color="white" size="small" />
                            ) : (
                                <>
                                    <Ionicons name="cloud-upload-outline" size={18} color="white" />
                                    <Text style={styles.syncBtnText}>
                                        {isOnline ? 'Upload Now' : 'Offline'}
                                    </Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}
                </View>

                {/* Farmer Information Card */}
                <View style={[styles.card, { zIndex: 2000, overflow: 'visible' }]}>
                    <View style={styles.cardHeader}>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Ionicons name="person" size={22} color="#2196F3" />
                            <Text style={[styles.cardTitle, { marginLeft: 8 }]}>Farmer Selection</Text>
                            <View style={styles.requiredBadge}>
                                <Text style={styles.requiredText}>*</Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            onPress={handleFarmerSync}
                            disabled={isSyncing || !isOnline}
                            style={{ padding: 4 }}
                        >
                            {isSyncing ? (
                                <ActivityIndicator size="small" color="#2196F3" />
                            ) : (
                                <Ionicons name="refresh" size={20} color={isOnline ? "#2196F3" : "#ccc"} />
                            )}
                        </TouchableOpacity>
                    </View>

                    {farmerCount === 0 && (
                        <TouchableOpacity
                            style={[styles.downloadFarmersBtn, isSyncing && { opacity: 0.6 }]}
                            onPress={handleFarmerSync}
                            disabled={isSyncing || !isOnline}
                        >
                            {isSyncing ? (
                                <ActivityIndicator size="small" color="#2196F3" />
                            ) : (
                                <Ionicons name="cloud-download" size={20} color="#2196F3" />
                            )}
                            <Text style={styles.downloadFarmersText}>
                                {isSyncing ? 'Downloading Database...' : 'Download Farmer DB'}
                            </Text>
                        </TouchableOpacity>
                    )}

                    {selectedFarmer ? (
                        <View style={styles.selectedFarmerCard}>
                            <View style={styles.avatarLarge}>
                                <Text style={styles.avatarTextLarge}>{getInitials(selectedFarmer.full_name)}</Text>
                            </View>
                            <View style={styles.selectedFarmerInfo}>
                                <Text style={styles.selectedFarmerName}>
                                    {selectedFarmer.full_name}
                                </Text>
                                <Text style={styles.selectedFarmerReg}>
                                    NO: {selectedFarmer.registration_number || 'Not Assigned'}
                                </Text>
                                <Text style={styles.selectedFarmerPhone}>
                                    {selectedFarmer.phone || 'No Phone'}
                                </Text>
                            </View>
                            <TouchableOpacity
                                style={styles.clearFarmerBtn}
                                onPress={clearFarmerSelection}
                            >
                                <Ionicons name="close-circle" size={28} color="#FF5252" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View>
                            {/* Search Bar */}
                            <View style={styles.searchBox}>
                                <Ionicons name="search" size={20} color="#909090" style={styles.searchIcon} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Search by name or number..."
                                    value={searchQuery}
                                    onChangeText={searchFarmers}
                                    editable={farmerCount > 0}
                                    placeholderTextColor="#909090"
                                />
                                {isLoadingFarmers && (
                                    <ActivityIndicator size="small" color="#2196F3" style={{ marginRight: 10 }} />
                                )}
                            </View>

                            {/* Search Results Dropdown */}
                            {farmers.length > 0 && searchQuery.length > 0 && (
                                <View style={styles.searchResultsContainer}>
                                    <ScrollView style={{ maxHeight: 220 }} keyboardShouldPersistTaps="handled">
                                        {farmers.map(f => (
                                            <TouchableOpacity
                                                key={f.id}
                                                style={styles.searchResultItem}
                                                onPress={() => selectFarmer(f)}
                                            >
                                                <View style={styles.avatarSmall}>
                                                    <Text style={styles.avatarTextSmall}>{getInitials(f.full_name)}</Text>
                                                </View>
                                                <View style={{ flex: 1 }}>
                                                    <Text style={styles.resultName}>{f.full_name}</Text>
                                                    <Text style={styles.resultMeta}>{f.registration_number || 'No ID'}</Text>
                                                </View>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Recent Farmers Section */}
                            {!searchQuery && recentFarmers.length > 0 && (
                                <View style={styles.recentFarmersSection}>
                                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                                        <Text style={[styles.sectionLabel, { marginBottom: 0 }]}>Recent Farmers</Text>
                                        <TouchableOpacity
                                            onPress={() => navigation.navigate('RecentFarmers')}
                                            style={{ padding: 4 }}
                                        >
                                            <Text style={{ color: '#2196F3', fontSize: 13, fontWeight: '600' }}>See All</Text>
                                        </TouchableOpacity>
                                    </View>
                                    <ScrollView
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        contentContainerStyle={{ paddingVertical: 10 }}
                                    >
                                        {recentFarmers.map((f, i) => (
                                            <TouchableOpacity
                                                key={f.id || i}
                                                style={styles.recentFarmerCard}
                                                onPress={() => selectFarmer(f)}
                                            >
                                                <View style={styles.avatarMedium}>
                                                    <Text style={styles.avatarTextMedium}>{getInitials(f.full_name)}</Text>
                                                </View>
                                                <Text style={styles.recentFarmerName} numberOfLines={1}>
                                                    {f.full_name.split(' ')[0]}
                                                </Text>
                                                <Text style={styles.recentFarmerId}>
                                                    {f.registration_number || 'No ID'}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </ScrollView>
                                </View>
                            )}

                            {/* Empty State / Hint */}
                            {!searchQuery && recentFarmers.length === 0 && (
                                <Text style={styles.helperText}>
                                    Start typing to search for a farmer from the downloaded database.
                                </Text>
                            )}
                        </View>
                    )}
                </View>

                {/* Location Card - More Prominent */}
                <View style={[styles.card, styles.locationCard]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="location" size={22} color="#4CAF50" />
                        <Text style={styles.cardTitle}>GPS Location</Text>
                        {locationStatus === 'success' && (
                            <View style={styles.requiredBadge}>
                                <Ionicons name="checkmark-circle" size={16} color="#4CAF50" />
                            </View>
                        )}
                    </View>

                    {location && locationStatus === 'success' ? (
                        <View style={styles.locationInfoContainer}>
                            <View style={styles.locationInfoRow}>
                                <Text style={styles.locationLabel}>Latitude:</Text>
                                <Text style={styles.locationValue}>
                                    {location.latitude.toFixed(6)}°
                                </Text>
                            </View>
                            <View style={styles.locationInfoRow}>
                                <Text style={styles.locationLabel}>Longitude:</Text>
                                <Text style={styles.locationValue}>
                                    {location.longitude.toFixed(6)}°
                                </Text>
                            </View>
                            {location.accuracy && (
                                <View style={styles.locationInfoRow}>
                                    <Text style={styles.locationLabel}>Accuracy:</Text>
                                    <Text style={styles.locationValue}>
                                        ±{location.accuracy.toFixed(0)}m
                                    </Text>
                                </View>
                            )}
                        </View>
                    ) : (
                        <Text style={styles.locationHint}>
                            {locationStatus === 'denied'
                                ? 'Location permission denied. Please enable in settings.'
                                : locationStatus === 'error'
                                    ? 'Failed to get location. Please try again.'
                                    : 'Click the button below to acquire your current GPS coordinates'}
                        </Text>
                    )}

                    <TouchableOpacity
                        style={[
                            styles.getLocationBtn,
                            { backgroundColor: getLocationButtonColor() },
                            locationStatus === 'loading' && styles.getLocationBtnLoading
                        ]}
                        onPress={getCurrentLocation}
                        disabled={locationStatus === 'loading'}
                    >
                        {locationStatus === 'loading' ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Ionicons
                                name={locationStatus === 'success' ? 'checkmark-circle' : 'locate'}
                                size={20}
                                color="white"
                            />
                        )}
                        <Text style={styles.getLocationBtnText}>
                            {getLocationButtonText()}
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Collection Details Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="water" size={22} color="#2196F3" />
                        <Text style={styles.cardTitle}>Collection Details</Text>
                    </View>

                    <Text style={styles.label}>Liters Collected *</Text>
                    <TextInput
                        style={[styles.input, isCancelled && styles.inputDisabled]}
                        placeholder="Enter liters (e.g., 25.5)"
                        keyboardType="decimal-pad"
                        value={liters}
                        onChangeText={setLiters}
                        editable={!isCancelled}
                    />

                    <Text style={styles.label}>Rate per Liter (KSh)</Text>
                    <TextInput
                        style={[styles.input, styles.inputDisabled]}
                        placeholder="Rate"
                        keyboardType="decimal-pad"
                        value={collectorRate}
                        editable={false}
                    />

                    {/* Cancel Collection Toggle */}
                    <TouchableOpacity
                        style={styles.checkboxContainer}
                        onPress={() => setIsCancelled(!isCancelled)}
                    >
                        <View style={[styles.checkbox, isCancelled && styles.checkboxChecked]}>
                            {isCancelled && <Ionicons name="checkmark" size={18} color="white" />}
                        </View>
                        <Text style={styles.checkboxLabel}>
                            Mark as cancelled collection (0 liters)
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Payment Summary */}
                <View style={[styles.card, styles.summaryCard]}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="cash" size={22} color="#4CAF50" />
                        <Text style={styles.cardTitle}>Earnings Summary</Text>
                    </View>

                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Liters:</Text>
                        <Text style={styles.summaryValue}>
                            {isCancelled ? '0.00' : (liters || '0')} L
                        </Text>
                    </View>
                    <View style={styles.summaryRow}>
                        <Text style={styles.summaryLabel}>Your Rate:</Text>
                        <Text style={styles.summaryValue}>KSh {collectorRate}/L</Text>
                    </View>
                    <View style={styles.divider} />
                    <View style={styles.summaryRow}>
                        <Text style={styles.totalLabel}>Your Earnings:</Text>
                        <Text style={[styles.totalValue, { color: '#16A34A' }, isCancelled && { color: '#999' }]}>
                            KSh {collectorEarnings.toFixed(2)}
                        </Text>
                    </View>
                </View>

                {/* Notes Card */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="document-text" size={22} color="#FF9800" />
                        <Text style={styles.cardTitle}>Additional Notes</Text>
                    </View>
                    <TextInput
                        style={[styles.input, styles.textArea]}
                        placeholder={isCancelled
                            ? "Reason for cancellation..."
                            : "Add any notes about this collection..."}
                        multiline
                        numberOfLines={4}
                        value={notes}
                        onChangeText={setNotes}
                    />
                </View>

                {/* Photo Documentation */}
                <View style={styles.card}>
                    <View style={styles.cardHeader}>
                        <Ionicons name="camera" size={22} color="#9C27B0" />
                        <Text style={styles.cardTitle}>Photo Documentation</Text>
                        <Text style={styles.optionalText}>(Optional)</Text>
                    </View>

                    {photoUri ? (
                        <View style={styles.photoPreviewContainer}>
                            <Image source={{ uri: photoUri }} style={styles.previewImage} resizeMode="cover" />
                            <TouchableOpacity style={styles.removePhotoBtn} onPress={removePhoto}>
                                <Ionicons name="close-circle" size={32} color="#F44336" />
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <TouchableOpacity style={styles.uploadBox} onPress={takePhoto}>
                            <Ionicons name="camera-outline" size={48} color="#9C27B0" />
                            <Text style={styles.uploadText}>Take Photo</Text>
                            <Text style={styles.uploadHint}>Tap to open camera</Text>
                        </TouchableOpacity>
                    )}
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                    style={[
                        styles.submitBtn,
                        isSubmitting && styles.submitBtnDisabled,
                        (!selectedFarmer || locationStatus !== 'success') && styles.submitBtnDisabled
                    ]}
                    onPress={handleSubmit}
                    disabled={isSubmitting || !selectedFarmer || locationStatus !== 'success'}
                >
                    {isSubmitting ? (
                        <ActivityIndicator color="white" size="small" />
                    ) : (
                        <>
                            <Ionicons name="checkmark-circle" size={24} color="white" />
                            <Text style={styles.submitBtnText}>Record Collection</Text>
                        </>
                    )}
                </TouchableOpacity>

                {/* Recent Collections */}
                {recentCollections.length > 0 && (
                    <View style={styles.recentSection}>
                        <View style={styles.recentHeader}>
                            <Ionicons name="time" size={20} color="#666" />
                            <Text style={styles.recentTitle}>Recent Collections</Text>
                        </View>

                        {recentCollections.map((col, index) => (
                            <View key={index} style={styles.recentItem}>
                                <View style={styles.recentItemHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.recentFarmerName}>
                                            {col.farmer_name || 'Unknown Farmer'}
                                        </Text>
                                        <Text style={styles.recentMeta}>
                                            {col.collection_id} • {(() => {
                                                const isoString = col.created_at.replace(' ', 'T') + 'Z';
                                                try {
                                                    return new Date(isoString).toLocaleString('en-KE', {
                                                        month: 'short',
                                                        day: 'numeric',
                                                        hour: '2-digit',
                                                        minute: '2-digit'
                                                    });
                                                } catch (e) {
                                                    return col.created_at;
                                                }
                                            })()}
                                        </Text>
                                    </View>
                                    <View style={{ alignItems: 'flex-end' }}>
                                        <Text style={styles.recentAmount}>
                                            KSh {((col.liters || 0) * parseFloat(collectorRate || '0')).toFixed(0)}
                                        </Text>
                                        <Text style={styles.recentLiters}>{col.liters}L</Text>
                                    </View>
                                </View>
                                <View style={[
                                    styles.statusBadge,
                                    col.status === 'uploaded'
                                        ? styles.statusBadgeSuccess
                                        : styles.statusBadgePending
                                ]}>
                                    <Ionicons
                                        name={col.status === 'uploaded' ? 'cloud-done' : 'cloud-upload-outline'}
                                        size={12}
                                        color="white"
                                    />
                                    <Text style={styles.statusText}>
                                        {col.status === 'uploaded' ? 'Synced' : 'Pending'}
                                    </Text>
                                </View>
                            </View>
                        ))}
                    </View>
                )}

            </ScrollView>
        </KeyboardAvoidingView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F0FDF4', // Green-50, was #F5F7FA
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 20,
        paddingBottom: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#14532D', // Green-900
    },
    headerSubtitle: {
        fontSize: 14,
        color: '#166534', // Green-800
        marginTop: 4,
    },
    backBtn: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
        justifyContent: 'center',
    },
    offlineBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F59E0B',
        paddingVertical: 10,
        paddingHorizontal: 16,
        gap: 8,
    },
    offlineBannerText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '600',
    },
    card: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 20,
        marginHorizontal: 16,
        marginTop: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 3,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
        marginLeft: 10,
        flex: 1,
    },
    requiredBadge: {
        backgroundColor: '#DCFCE7',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    requiredText: {
        color: '#16A34A',
        fontSize: 12,
        fontWeight: 'bold',
    },
    optionalText: {
        fontSize: 12,
        color: '#999',
        fontStyle: 'italic',
    },
    syncStatusContainer: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    syncStatItem: {
        flex: 1,
        alignItems: 'center',
    },
    syncStatLabel: {
        fontSize: 12,
        color: '#666',
        marginBottom: 8,
    },
    syncStatValue: {
        fontSize: 28,
        fontWeight: 'bold',
    },
    syncStatDivider: {
        width: 1,
        backgroundColor: '#E0E0E0',
        marginHorizontal: 16,
    },
    syncBtn: {
        backgroundColor: '#16A34A',
        paddingVertical: 12,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    syncBtnDisabled: {
        backgroundColor: '#94A3B8',
        opacity: 0.6,
    },
    syncBtnText: {
        color: 'white',
        fontWeight: '700',
        fontSize: 15,
    },
    locationCard: {
        borderLeftWidth: 4,
        borderLeftColor: '#16A34A',
    },
    locationInfoContainer: {
        backgroundColor: '#F1F8F4',
        borderRadius: 8,
        padding: 12,
        marginBottom: 12,
    },
    locationInfoRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingVertical: 6,
    },
    locationLabel: {
        fontSize: 14,
        color: '#666',
        fontWeight: '500',
    },
    locationValue: {
        fontSize: 14,
        color: '#1A1A1A',
        fontWeight: '700',
    },
    locationHint: {
        fontSize: 14,
        color: '#666',
        marginBottom: 12,
        textAlign: 'center',
        lineHeight: 20,
    },
    getLocationBtn: {
        backgroundColor: '#16A34A',
        paddingVertical: 14,
        borderRadius: 8,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    getLocationBtnLoading: {
        opacity: 0.7,
    },
    getLocationBtnText: {
        color: 'white',
        fontSize: 16,
        fontWeight: '700',
    },
    downloadFarmersBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 14,
        backgroundColor: '#E3F2FD',
        borderRadius: 8,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#90CAF9',
        gap: 10,
    },
    downloadFarmersText: {
        color: '#2196F3',
        fontWeight: '600',
        fontSize: 14,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#444',
        marginBottom: 8,
    },
    selectedFarmerCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0FDF4',
        borderRadius: 8,
        padding: 12,
        borderWidth: 1,
        borderColor: '#86EFAC',
    },
    selectedFarmerInfo: {
        flex: 1,
        justifyContent: 'center'
    },
    selectedFarmerName: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1A1A1A',
        marginBottom: 4,
    },
    selectedFarmerReg: {
        fontSize: 13,
        color: '#666',
    },
    clearFarmerBtn: {
        padding: 4,
    },
    searchContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        backgroundColor: '#FAFAFA',
        paddingHorizontal: 12,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        height: 48,
        fontSize: 15,
        color: '#333',
    },
    dropdown: {
        position: 'absolute',
        top: 60,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        maxHeight: 200,
        zIndex: 5000,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    dropdownItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 14,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    dropdownText: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    dropdownSubText: {
        fontSize: 13,
        color: '#888',
        marginTop: 2,
    },
    input: {
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 14,
        fontSize: 15,
        backgroundColor: '#FAFAFA',
        marginBottom: 16,
        color: '#333',
    },
    inputDisabled: {
        backgroundColor: '#F0F0F0',
        color: '#999',
    },
    textArea: {
        height: 100,
        textAlignVertical: 'top',
        paddingTop: 12,
    },
    checkboxContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FEF2F2',
        padding: 12,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#FECACA',
    },
    checkbox: {
        width: 24,
        height: 24,
        borderWidth: 2,
        borderColor: '#EF4444',
        borderRadius: 6,
        marginRight: 12,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'white',
    },
    checkboxChecked: {
        backgroundColor: '#EF4444',
        borderColor: '#EF4444',
    },
    checkboxLabel: {
        fontSize: 14,
        color: '#B91C1C',
        fontWeight: '600',
        flex: 1,
    },
    summaryCard: {
        backgroundColor: '#ECFDF5',
        borderLeftWidth: 4,
        borderLeftColor: '#16A34A',
    },
    summaryRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10,
    },
    summaryLabel: {
        fontSize: 14,
        color: '#666',
    },
    summaryValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#E0E0E0',
        marginVertical: 10,
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#333',
    },
    totalValue: {
        fontSize: 20,
        fontWeight: '800',
        color: '#16A34A',
    },
    uploadBox: {
        borderWidth: 2,
        borderColor: '#8B5CF6',
        borderStyle: 'dashed',
        borderRadius: 12,
        padding: 32,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F3E5F5',
    },
    uploadText: {
        fontSize: 16,
        color: '#7B1FA2',
        marginTop: 12,
        fontWeight: '600',
    },
    uploadHint: {
        fontSize: 12,
        color: '#999',
        marginTop: 8,
    },
    photoPreviewContainer: {
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
    },
    previewImage: {
        width: '100%',
        height: 220,
        borderRadius: 12,
    },
    removePhotoBtn: {
        position: 'absolute',
        top: 10,
        right: 10,
        backgroundColor: 'white',
        borderRadius: 16,
        padding: 2,
    },
    submitBtn: {
        backgroundColor: '#16A34A',
        paddingVertical: 16,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        marginHorizontal: 16,
        marginTop: 24,
        gap: 10,
        shadowColor: '#16A34A',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5,
    },
    submitBtnDisabled: {
        backgroundColor: '#A5D6A7',
        shadowOpacity: 0,
        elevation: 0,
    },
    submitBtnText: {
        color: 'white',
        fontSize: 17,
        fontWeight: '700',
    },
    recentSection: {
        marginHorizontal: 16,
        marginTop: 24,
        marginBottom: 16,
    },
    recentHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        gap: 8,
    },
    recentTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#666',
    },
    recentItem: {
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        marginBottom: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
    },
    recentItemHeader: {
        flexDirection: 'row',
        marginBottom: 10,
    },
    recentFarmerName: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    recentMeta: {
        fontSize: 12,
        color: '#999',
    },
    recentAmount: {
        fontSize: 16,
        fontWeight: '700',
        color: '#16A34A',
    },
    recentLiters: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginTop: 2,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
        alignSelf: 'flex-start',
        gap: 5,
    },
    statusBadgeSuccess: {
        backgroundColor: '#16A34A',
    },
    statusBadgePending: {
        backgroundColor: '#F59E0B',
    },
    statusText: {
        color: 'white',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    // NEW STYLES
    avatarLarge: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: '#16A34A',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarTextLarge: {
        color: 'white',
        fontSize: 20,
        fontWeight: 'bold',
    },
    selectedFarmerPhone: {
        fontSize: 13,
        color: '#2196F3',
        marginTop: 2,
    },
    searchBox: {
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        backgroundColor: '#FAFAFA',
        paddingHorizontal: 12,
        height: 50,
    },
    searchResultsContainer: {
        position: 'absolute',
        top: 55,
        left: 0,
        right: 0,
        backgroundColor: 'white',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#E0E0E0',
        zIndex: 5000,
        elevation: 10,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
    },
    searchResultItem: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    avatarSmall: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    avatarTextSmall: {
        color: '#2196F3',
        fontSize: 14,
        fontWeight: 'bold',
    },
    resultName: {
        fontSize: 15,
        fontWeight: '600',
        color: '#333',
    },
    resultMeta: {
        fontSize: 12,
        color: '#999',
    },
    recentFarmersSection: {
        marginTop: 16,
    },
    sectionLabel: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 8,
    },
    recentFarmerCard: {
        width: 100,
        backgroundColor: '#F5F9FA',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginRight: 10,
        borderWidth: 1,
        borderColor: '#E1E8EB',
    },
    avatarMedium: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E0F7FA',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 8,
    },
    avatarTextMedium: {
        color: '#006064',
        fontSize: 18,
        fontWeight: 'bold',
    },
    recentFarmerId: {
        fontSize: 11,
        color: '#999',
    },
    helperText: {
        marginTop: 12,
        fontSize: 13,
        color: '#999',
        textAlign: 'center',
        fontStyle: 'italic',
    },
});