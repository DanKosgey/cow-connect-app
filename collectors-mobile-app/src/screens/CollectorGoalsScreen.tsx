
import React, { useState, useEffect } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ScrollView,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { collectorGoalsService, CollectorGoals } from '../services/collector.goals.service';
import { collectorPerformanceService } from '../services/collector.performance.service';
import { useAuth } from '../hooks/useAuth';
import { useFocusEffect } from '@react-navigation/native';

const ProgressCircle = ({ progress, color, size = 80 }: any) => {
    const radius = (size - 10) / 2;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
        <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
            <View style={[styles.progressCircleBg, { width: size, height: size, borderRadius: size / 2 }]} />
            <View style={[styles.progressCircleFill, {
                width: size - 8,
                height: size - 8,
                borderRadius: (size - 8) / 2,
                backgroundColor: color + '15'
            }]} />
            <Text style={[styles.progressText, { color }]}>{Math.round(progress)}%</Text>
        </View>
    );
};

const GoalProgressCard = ({
    title,
    current,
    target,
    unit,
    icon,
    color,
    subtitle
}: any) => {
    const progress = target > 0 ? Math.min((current / target) * 100, 100) : 0;
    const remaining = Math.max(target - current, 0);

    return (
        <View style={styles.progressCard}>
            <View style={styles.progressCardHeader}>
                <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                    <Ionicons name={icon} size={20} color={color} />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                    <Text style={styles.progressCardTitle}>{title}</Text>
                    <Text style={styles.progressCardSubtitle}>{subtitle}</Text>
                </View>
                <ProgressCircle progress={progress} color={color} size={60} />
            </View>

            <View style={styles.progressStats}>
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Current</Text>
                    <Text style={[styles.statValue, { color }]}>
                        {unit === 'KES' ? 'KES ' : ''}{current.toLocaleString()}{unit !== 'KES' ? ' ' + unit : ''}
                    </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Target</Text>
                    <Text style={styles.statValue}>
                        {unit === 'KES' ? 'KES ' : ''}{target.toLocaleString()}{unit !== 'KES' ? ' ' + unit : ''}
                    </Text>
                </View>
                <View style={styles.statDivider} />
                <View style={styles.statItem}>
                    <Text style={styles.statLabel}>Remaining</Text>
                    <Text style={[styles.statValue, { color: remaining > 0 ? '#F59E0B' : '#10B981' }]}>
                        {unit === 'KES' ? 'KES ' : ''}{remaining.toLocaleString()}{unit !== 'KES' ? ' ' + unit : ''}
                    </Text>
                </View>
            </View>

            {/* Progress Bar */}
            <View style={styles.progressBarContainer}>
                <View style={[styles.progressBar, { width: `${progress}%`, backgroundColor: color }]} />
            </View>
        </View>
    );
};

const GoalInputCard = ({
    title,
    value,
    onChange,
    unit,
    description,
    icon,
    color
}: any) => (
    <View style={styles.card}>
        <View style={styles.cardHeader}>
            <View style={[styles.iconBox, { backgroundColor: color + '20' }]}>
                <Ionicons name={icon} size={22} color={color} />
            </View>
            <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.cardTitle}>{title}</Text>
                <Text style={styles.cardDesc}>{description}</Text>
            </View>
        </View>

        <View style={styles.inputContainer}>
            <Text style={styles.inputUnit}>{unit === 'KES' ? 'KES' : ''}</Text>
            <TextInput
                style={styles.input}
                value={value.toString()}
                onChangeText={(text) => onChange(text.replace(/[^0-9.]/g, ''))}
                keyboardType="numeric"
                placeholder="0"
            />
            <Text style={styles.inputUnitSuffix}>{unit !== 'KES' ? unit : ''}</Text>
        </View>
    </View>
);

export const CollectorGoalsScreen = ({ navigation }: any) => {
    const { user } = useAuth();
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showConfig, setShowConfig] = useState(false);
    const [goals, setGoals] = useState<CollectorGoals>({
        dailyLiterTarget: 0,
        monthlyEarningsTarget: 0,
        dailyCollectionCountTarget: 0
    });
    const [performance, setPerformance] = useState<any>(null);

    const loadData = async () => {
        setLoading(true);
        try {
            const goalsData = await collectorGoalsService.getGoals();
            setGoals(goalsData);

            if (user?.staff?.id) {
                const perfData = await collectorPerformanceService.getPerformanceMetrics(user.staff.id);
                setPerformance(perfData);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadData();
        }, [])
    );

    const handleSave = async () => {
        setSaving(true);
        try {
            await collectorGoalsService.saveGoals(goals);
            Alert.alert('Success', 'Your goals have been updated!');
            setShowConfig(false);
            loadData(); // Refresh to show new progress
        } catch (e) {
            Alert.alert('Error', 'Failed to save goals.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#0EA5E9" />
            </View>
        );
    }

    // Calculate daily progress (today vs daily target)
    const todayLiters = performance?.today?.totalLiters || 0;
    const todayFarmers = performance?.today?.uniqueFarmers || 0;

    // Monthly progress
    const monthEarnings = performance?.month?.totalEarnings || 0;

    return (
        <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={styles.container}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1E293B" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Goals & Progress</Text>
                <TouchableOpacity onPress={() => setShowConfig(!showConfig)} style={styles.configBtn}>
                    <Ionicons name={showConfig ? "checkmark" : "settings-outline"} size={24} color="#0EA5E9" />
                </TouchableOpacity>
            </View>

            <ScrollView style={styles.content} contentContainerStyle={{ paddingBottom: 40 }}>
                {!showConfig ? (
                    <>
                        {/* Progress Overview */}
                        <View style={styles.overviewCard}>
                            <Text style={styles.overviewTitle}>Monthly Overview</Text>
                            <Text style={styles.overviewSubtitle}>
                                {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                            </Text>

                            <View style={styles.overviewStats}>
                                <View style={styles.overviewStatItem}>
                                    <Ionicons name="calendar" size={16} color="#64748B" />
                                    <Text style={styles.overviewStatText}>
                                        Day {new Date().getDate()} of {new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()}
                                    </Text>
                                </View>
                                <View style={styles.overviewStatItem}>
                                    <Ionicons name="trending-up" size={16} color="#10B981" />
                                    <Text style={styles.overviewStatText}>
                                        {performance?.month?.daysActive || 0} active days
                                    </Text>
                                </View>
                            </View>
                        </View>

                        {/* Goal Progress Cards */}
                        <Text style={styles.sectionTitle}>Your Progress</Text>

                        <GoalProgressCard
                            title="Daily Volume Goal"
                            subtitle="Today's collection progress"
                            current={todayLiters}
                            target={goals.dailyLiterTarget}
                            unit="L"
                            icon="water"
                            color="#0EA5E9"
                        />

                        <GoalProgressCard
                            title="Monthly Earnings Goal"
                            subtitle="This month's earnings"
                            current={monthEarnings}
                            target={goals.monthlyEarningsTarget}
                            unit="KES"
                            icon="cash"
                            color="#10B981"
                        />

                        <GoalProgressCard
                            title="Daily Farmers Goal"
                            subtitle="Farmers visited today"
                            current={todayFarmers}
                            target={goals.dailyCollectionCountTarget}
                            unit="Farmers"
                            icon="people"
                            color="#8B5CF6"
                        />

                        {/* Insights */}
                        <View style={styles.insightBox}>
                            <Ionicons name="bulb" size={24} color="#F59E0B" />
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={styles.insightTitle}>Smart Insight</Text>
                                <Text style={styles.insightText}>
                                    {monthEarnings >= goals.monthlyEarningsTarget
                                        ? "🎉 Congratulations! You've reached your monthly goal!"
                                        : `You need KES ${(goals.monthlyEarningsTarget - monthEarnings).toLocaleString()} more to reach your monthly target. Keep going!`}
                                </Text>
                            </View>
                        </View>

                        <TouchableOpacity
                            style={styles.editBtn}
                            onPress={() => setShowConfig(true)}
                        >
                            <Ionicons name="create-outline" size={20} color="#fff" />
                            <Text style={styles.editBtnText}>Edit Goals</Text>
                        </TouchableOpacity>
                    </>
                ) : (
                    <>
                        {/* Configuration Mode */}
                        <Text style={styles.introText}>
                            Define your targets to track your progress and stay motivated.
                        </Text>

                        <GoalInputCard
                            title="Daily Volume Target"
                            description="How many liters do you aim to collect each day?"
                            value={goals.dailyLiterTarget}
                            onChange={(v: string) => setGoals({ ...goals, dailyLiterTarget: Number(v) })}
                            unit="Liters"
                            icon="water"
                            color="#0EA5E9"
                        />

                        <GoalInputCard
                            title="Monthly Earnings Goal"
                            description="How much do you want to earn this month?"
                            value={goals.monthlyEarningsTarget}
                            onChange={(v: string) => setGoals({ ...goals, monthlyEarningsTarget: Number(v) })}
                            unit="KES"
                            icon="cash"
                            color="#10B981"
                        />

                        <GoalInputCard
                            title="Daily Farmers Goal"
                            description="Number of farmers you plan to visit daily."
                            value={goals.dailyCollectionCountTarget}
                            onChange={(v: string) => setGoals({ ...goals, dailyCollectionCountTarget: Number(v) })}
                            unit="Farmers"
                            icon="people"
                            color="#8B5CF6"
                        />

                        <TouchableOpacity
                            style={styles.saveBtn}
                            onPress={handleSave}
                            disabled={saving}
                        >
                            {saving ? (
                                <ActivityIndicator color="#fff" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-circle" size={20} color="#fff" />
                                    <Text style={styles.saveBtnText}>Save Targets</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    </>
                )}
            </ScrollView>
        </KeyboardAvoidingView>
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
        alignItems: 'center'
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
    configBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
    },
    content: {
        padding: 20,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        marginBottom: 16,
        marginTop: 8,
    },
    introText: {
        fontSize: 14,
        color: '#64748B',
        marginBottom: 24,
        textAlign: 'center',
    },
    // Overview Card
    overviewCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 24,
        elevation: 2,
    },
    overviewTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: '#1E293B',
    },
    overviewSubtitle: {
        fontSize: 14,
        color: '#64748B',
        marginTop: 4,
        marginBottom: 16,
    },
    overviewStats: {
        flexDirection: 'row',
        gap: 16,
    },
    overviewStatItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    overviewStatText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    // Progress Cards
    progressCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
    },
    progressCardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    progressCardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    progressCardSubtitle: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    progressStats: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statDivider: {
        width: 1,
        backgroundColor: '#F1F5F9',
    },
    statLabel: {
        fontSize: 11,
        color: '#94A3B8',
        marginBottom: 4,
        textTransform: 'uppercase',
        fontWeight: '600',
    },
    statValue: {
        fontSize: 14,
        fontWeight: '700',
        color: '#1E293B',
    },
    progressBarContainer: {
        height: 8,
        backgroundColor: '#F1F5F9',
        borderRadius: 4,
        overflow: 'hidden',
    },
    progressBar: {
        height: '100%',
        borderRadius: 4,
    },
    // Progress Circle
    progressCircleBg: {
        position: 'absolute',
        backgroundColor: '#F1F5F9',
    },
    progressCircleFill: {
        position: 'absolute',
        justifyContent: 'center',
        alignItems: 'center',
    },
    progressText: {
        fontSize: 16,
        fontWeight: '800',
        position: 'absolute',
    },
    // Input Cards
    card: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 20,
        marginBottom: 16,
        elevation: 2,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    iconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
    },
    cardDesc: {
        fontSize: 12,
        color: '#94A3B8',
        marginTop: 2,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingHorizontal: 16,
        height: 56,
    },
    input: {
        flex: 1,
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B',
        textAlign: 'center',
    },
    inputUnit: {
        fontSize: 16,
        fontWeight: '600',
        color: '#94A3B8',
        marginRight: 8,
    },
    inputUnitSuffix: {
        fontSize: 14,
        fontWeight: '600',
        color: '#94A3B8',
        marginLeft: 8,
    },
    // Insight Box
    insightBox: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFBEB',
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#FEF3C7',
        marginTop: 8,
    },
    insightTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#B45309',
        marginBottom: 4,
    },
    insightText: {
        fontSize: 13,
        color: '#B45309',
        lineHeight: 18,
    },
    // Buttons
    saveBtn: {
        backgroundColor: '#0EA5E9',
        borderRadius: 12,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        elevation: 4,
        gap: 8,
    },
    saveBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
    editBtn: {
        backgroundColor: '#8B5CF6',
        borderRadius: 12,
        height: 56,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 24,
        elevation: 4,
        gap: 8,
    },
    editBtnText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#fff',
    },
});
