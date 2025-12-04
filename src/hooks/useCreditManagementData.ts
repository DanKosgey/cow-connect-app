import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';

interface FarmerCreditSummary {
  farmer_id: string;
  farmer_name: string;
  farmer_phone: string;
  credit_limit: number;
  available_credit: number;
  credit_used: number;
  pending_payments: number;
  credit_percentage: number;
}

interface CreditProfile {
  id: string;
  farmer_id: string;
  credit_limit_percentage: number;
  max_credit_amount: number;
  current_credit_balance: number;
  total_credit_used: number;
  is_frozen: boolean;
  created_at: string;
  updated_at: string;
}

interface CreditManagementData {
  farmers: FarmerCreditSummary[];
  creditLimits: CreditProfile[];
}

export const useCreditManagementData = (searchTerm: string, filterStatus: string) => {
  return useQuery<CreditManagementData>({
    queryKey: [CACHE_KEYS.ADMIN_CREDIT, searchTerm, filterStatus],
    queryFn: async () => {
      // Get all credit profiles with farmer information
      const { data: creditProfiles, error: profilesError } = await supabase
        .from('farmer_credit_profiles')
        .select(`
          id,
          farmer_id,
          credit_limit_percentage,
          max_credit_amount,
          current_credit_balance,
          total_credit_used,
          is_frozen,
          updated_at,
          farmers!farmer_credit_profiles_farmer_id_fkey (
            id,
            full_name,
            phone_number
          )
        `)
        .eq('is_frozen', false);

      if (profilesError) {
        throw profilesError;
      }

      const creditLimits = (creditProfiles || []) as CreditProfile[];

      // For each credit profile, calculate credit information
      const farmerSummaries: FarmerCreditSummary[] = [];
      
      for (const profile of creditProfiles || []) {
        try {
          // Get pending payments from approved collections only
          const { data: pendingCollections, error: collectionsError } = await supabase
            .from('collections')
            .select('total_amount')
            .eq('farmer_id', profile.farmer_id)
            .eq('approved_for_company', true) // Only consider approved collections
            .neq('status', 'Paid');

          if (collectionsError) {
            console.warn(`Error fetching collections for farmer ${profile.farmer_id}:`, collectionsError);
            continue;
          }

          const pendingPayments = pendingCollections?.reduce((sum, collection) => 
            sum + (collection.total_amount || 0), 0) || 0;

          // Calculate credit information
          const creditLimitAmount = profile.max_credit_amount;
          const availableCredit = profile.current_credit_balance;
          const creditUsed = profile.total_credit_used;
          const creditPercentage = profile.credit_limit_percentage;

          farmerSummaries.push({
            farmer_id: profile.farmer_id,
            farmer_name: profile.farmers?.full_name || 'Unknown Farmer',
            farmer_phone: profile.farmers?.phone_number || 'No phone',
            credit_limit: creditLimitAmount,
            available_credit: availableCredit,
            credit_used: creditUsed,
            pending_payments: pendingPayments,
            credit_percentage: creditPercentage
          });
        } catch (err) {
          console.warn(`Error processing credit profile ${profile.id}:`, err);
        }
      }

      // Filter farmers based on search term and status
      let filtered = farmerSummaries;

      if (searchTerm) {
        filtered = filtered.filter(farmer => 
          farmer.farmer_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          farmer.farmer_phone.includes(searchTerm)
        );
      }

      if (filterStatus !== "all") {
        if (filterStatus === "high_credit") {
          filtered = filtered.filter(farmer => farmer.available_credit > 50000);
        } else if (filterStatus === "low_credit") {
          filtered = filtered.filter(farmer => farmer.available_credit < 10000);
        } else if (filterStatus === "no_credit") {
          filtered = filtered.filter(farmer => farmer.available_credit === 0);
        }
      }

      return {
        farmers: filtered,
        creditLimits: creditLimits
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};