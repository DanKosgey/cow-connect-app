import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { collectionLocalService } from '../services/collection.local.service';

export const OfflineIndicator = () => {
    const [isOnline, setIsOnline] = React.useState(true);
    const [pendingCount, setPendingCount] = React.useState(0);
    const netInfo = useNetInfo();

    React.useEffect(() => {
        // Load pending count initially and every 5 seconds
        loadPendingCount();
        const interval = setInterval(loadPendingCount, 5000);
        return () => clearInterval(interval);
    }, []);

    React.useEffect(() => {
        if (Platform.OS === 'web') {
            setIsOnline(window.navigator.onLine);
            const handleOnline = () => setIsOnline(true);
            const handleOffline = () => setIsOnline(false);

            window.addEventListener('online', handleOnline);
            window.addEventListener('offline', handleOffline);

            return () => {
                window.removeEventListener('online', handleOnline);
                window.removeEventListener('offline', handleOffline);
            };
        } else {
            setIsOnline(!!(netInfo.isConnected && netInfo.isInternetReachable));
        }
    }, [netInfo.isConnected, netInfo.isInternetReachable]);

    const loadPendingCount = async () => {
        try {
            const count = await collectionLocalService.getPendingCount();
            setPendingCount(count);
        } catch (error) {
            console.error('Failed to load pending count:', error);
        }
    };

    if (isOnline && pendingCount === 0) return null;

    return (
        <View style={[styles.container, isOnline ? styles.syncing : styles.offline]}>
            <Text style={styles.text}>
                {isOnline
                    ? `📤 Syncing ${pendingCount} collection(s)...`
                    : `📴 Offline Mode • ${pendingCount} pending upload(s)`
                }
            </Text>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        padding: 12,
        alignItems: 'center',
        width: '100%',
    },
    offline: {
        backgroundColor: '#fbbf24',
    },
    syncing: {
        backgroundColor: '#60a5fa',
    },
    text: {
        color: '#fff',
        fontWeight: '600',
        fontSize: 14,
    },
});
