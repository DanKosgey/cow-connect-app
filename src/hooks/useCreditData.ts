import { useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { CreditServiceEssentials } from '@/services/credit-service-essentials';

export const useCreditData = () => {
    const [loading, setLoading] = useState(true);
    const [farmers, setFarmers] = useState<any[]>([]);
    const [filteredFarmers, setFilteredFarmers] = useState<any[]>([]);
    const [error, setError] = useState<string | null>(null);
    const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
    const [autoApproveInfo, setAutoApproveInfo] = useState<{ enabled: boolean; loading: boolean }>({
        enabled: false,
        loading: true
    });

    const fetchData = useCallback(async () => {
        try {
            setLoading(true);

            // Fetch Auto-Approve Setting
            const { data: settings } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'credit_config')
                .maybeSingle();

            if (settings?.value) {
                setAutoApproveInfo(prev => ({
                    ...prev,
                    enabled: settings.value.auto_approve === true,
                    loading: false
                }));
            } else {
                setAutoApproveInfo(prev => ({ ...prev, loading: false }));
            }

            // Get all farmers with their profiles
            const { data: farmersData, error: farmersError } = await supabase
                .from('farmers')
                .select(`
          id,
          profiles (full_name, phone)
        `);

            if (farmersError) throw farmersError;

            // Handle case when no farmers exist
            if (!farmersData || farmersData.length === 0) {
                setFarmers([]);
                setFilteredFarmers([]);
                return;
            }

            // For each farmer, get credit information
            const farmerCreditData = [];
            for (const farmer of farmersData || []) {
                try {
                    // Get credit profile
                    const creditProfile = await CreditServiceEssentials.getCreditProfile(farmer.id);

                    // Get pending payments from approved collections only
                    const { data: pendingCollections, error: collectionsError } = await supabase
                        .from('collections')
                        .select('total_amount')
                        .eq('farmer_id', farmer.id)
                        .eq('approved_for_company', true)
                        .neq('status', 'Paid');

                    if (collectionsError) {
                        console.warn(`Error fetching collections for farmer ${farmer.id}:`, collectionsError);
                        continue;
                    }

                    const pendingPayments = pendingCollections?.reduce((sum, collection) =>
                        sum + (collection.total_amount || 0), 0) || 0;

                    farmerCreditData.push({
                        farmer_id: farmer.id,
                        farmer_name: farmer.profiles?.full_name || 'Unknown Farmer',
                        farmer_phone: farmer.profiles?.phone || 'No phone',
                        credit_profile: creditProfile,
                        pending_payments: pendingPayments
                    });
                } catch (err) {
                    console.warn(`Error processing farmer ${farmer.id}:`, err);
                }
            }

            setFarmers(farmerCreditData);
            setFilteredFarmers(farmerCreditData);

            // Get pending requests count (only count truly pending, not auto-approved)
            const { count, error: countError } = await supabase
                .from('credit_requests')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'pending');

            if (!countError) {
                setPendingRequestsCount(count || 0);
            }
        } catch (err) {
            console.error("Error fetching credit management data:", err);
            setError("Failed to load credit management data");
        } finally {
            setLoading(false);
        }
    }, []);

    return {
        loading,
        farmers,
        filteredFarmers,
        setFilteredFarmers,
        error,
        pendingRequestsCount,
        autoApproveInfo,
        setAutoApproveInfo,
        fetchData
    };
};
