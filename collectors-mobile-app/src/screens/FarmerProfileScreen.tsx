
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const InfoRow = ({ icon, label, value, isLink, onPress }: any) => (
    <TouchableOpacity
        style={styles.infoRow}
        disabled={!onPress}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={[styles.iconBox, { backgroundColor: '#F1F5F9' }]}>
            <Ionicons name={icon} size={20} color="#64748B" />
        </View>
        <View style={styles.infoContent}>
            <Text style={styles.infoLabel}>{label}</Text>
            <Text style={[styles.infoValue, isLink && styles.linkText]}>
                {value || 'Not provided'}
            </Text>
        </View>
        {isLink && <Ionicons name="chevron-forward" size={16} color="#0EA5E9" />}
    </TouchableOpacity>
);

const Section = ({ title, children }: any) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionContent}>
            {children}
        </View>
    </View>
);

export const FarmerProfileScreen = ({ route, navigation }: any) => {
    const { farmer } = route.params;

    const getInitials = (name: string) => {
        return (name || 'Unknown').split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
    };

    const handleCall = () => {
        if (farmer.phone_number || farmer.phone) {
            Linking.openURL(`tel:${farmer.phone_number || farmer.phone}`);
        }
    };

    const handleEmail = () => {
        if (farmer.email) {
            Linking.openURL(`mailto:${farmer.email}`);
        }
    };

    const StatusBadge = ({ status }: { status: string }) => {
        let color = '#64748B';
        let bg = '#F1F5F9';
        let icon: any = 'help-circle';

        if (status === 'approved') { color = '#10B981'; bg = '#ECFDF5'; icon = 'checkmark-circle'; }
        else if (status === 'rejected') { color = '#EF4444'; bg = '#FEF2F2'; icon = 'close-circle'; }
        else if (status === 'pending') { color = '#F59E0B'; bg = '#FFFBEB'; icon = 'time'; }

        return (
            <View style={[styles.statusBadge, { backgroundColor: bg }]}>
                <Ionicons name={icon} size={14} color={color} style={{ marginRight: 6 }} />
                <Text style={[styles.statusText, { color }]}>{status?.toUpperCase() || 'UNKNOWN'}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Farmer Profile</Text>
                <TouchableOpacity style={styles.editButton}>
                    <Ionicons name="create-outline" size={24} color="#0EA5E9" />
                </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                {/* Profile Card */}
                <View style={styles.profileCard}>
                    <View style={styles.profileHeader}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>{getInitials(farmer.full_name)}</Text>
                        </View>
                        <View style={styles.profileMainInfo}>
                            <Text style={styles.name}>{farmer.full_name}</Text>
                            <Text style={styles.regNum}>{farmer.registration_number || 'No Reg ID'}</Text>
                            <StatusBadge status={farmer.kyc_status} />
                        </View>
                    </View>
                </View>

                {/* Contact Information */}
                <Section title="Contact Information">
                    <InfoRow
                        icon="call"
                        label="Phone Number"
                        value={farmer.phone_number || farmer.phone}
                        isLink={!!(farmer.phone_number || farmer.phone)}
                        onPress={handleCall}
                    />
                    <View style={styles.divider} />
                    <InfoRow
                        icon="mail"
                        label="Email Address"
                        value={farmer.email}
                        isLink={!!farmer.email}
                        onPress={handleEmail}
                    />
                    <View style={styles.divider} />
                    <InfoRow
                        icon="location"
                        label="Physical Address"
                        value={farmer.physical_address || farmer.address}
                    />
                </Section>

                {/* Farm Details */}
                <Section title="Farm Details">
                    <InfoRow
                        icon="map"
                        label="Farm Location"
                        value={farmer.farm_location || (farmer.gps_latitude ? `${farmer.gps_latitude}, ${farmer.gps_longitude}` : null)}
                    />
                    <View style={styles.divider} />
                    <View style={styles.row}>
                        <View style={{ flex: 1 }}>
                            <InfoRow
                                icon="paw"
                                label="Number of Cows"
                                value={farmer.number_of_cows ? `${farmer.number_of_cows} Cows` : null}
                            />
                        </View>
                        <View style={{ flex: 1 }}>
                            <InfoRow
                                icon="leaf"
                                label="Feeding Type"
                                value={farmer.feeding_type}
                            />
                        </View>
                    </View>
                </Section>



                {/* System Metadata */}
                <View style={styles.metaSection}>
                    <Text style={styles.metaText}>Registered: {new Date(farmer.created_at).toLocaleDateString()}</Text>
                    <Text style={styles.metaText}>Last Updated: {new Date(farmer.updated_at).toLocaleDateString()}</Text>
                    <Text style={styles.metaText}>System ID: {farmer.id}</Text>
                </View>

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
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingTop: 60,
        paddingBottom: 20,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    backButton: {
        padding: 8,
        marginLeft: -8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    editButton: {
        padding: 8,
        marginRight: -8,
    },
    scrollContent: {
        padding: 20,
    },
    profileCard: {
        backgroundColor: 'white',
        borderRadius: 24,
        padding: 24,
        marginBottom: 24,
        shadowColor: '#64748B',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 24,
        elevation: 4,
    },
    profileHeader: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    avatar: {
        width: 80,
        height: 80,
        borderRadius: 24,
        backgroundColor: '#F1F5F9',
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 20,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: '800',
        color: '#64748B',
    },
    profileMainInfo: {
        flex: 1,
    },
    name: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1E293B',
        marginBottom: 4,
    },
    regNum: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 12,
        fontWeight: '500',
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 12,
        alignSelf: 'flex-start',
    },
    statusText: {
        fontSize: 12,
        fontWeight: '700',
        letterSpacing: 0.5,
    },
    section: {
        marginBottom: 24,
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 16,
        borderWidth: 1,
        borderColor: '#F1F5F9',
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 16,
        marginLeft: 4,
    },
    sectionContent: {
        // paddingLeft: 10,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    iconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 14,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        color: '#94A3B8',
        fontWeight: '500',
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        color: '#334155',
        fontWeight: '600',
    },
    linkText: {
        color: '#0EA5E9',
    },
    divider: {
        height: 1,
        backgroundColor: '#F1F5F9',
        marginLeft: 50, // Indent past icon
    },
    row: {
        flexDirection: 'row',
        gap: 12
    },
    metaSection: {
        alignItems: 'center',
        marginBottom: 20,
    },
    metaText: {
        fontSize: 12,
        color: '#94A3B8',
        marginBottom: 4,
    }
});
