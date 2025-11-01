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

interface CreditLimit {
  id: string;
  farmer_id: string;
  credit_limit_percentage: number;
  max_credit_amount: number;
  current_credit_balance: number;
  total_credit_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  farmers: {
    profiles: {
      full_name: string;
      phone: string;
    };
  };
}

interface CreditManagementData {
  farmers: FarmerCreditSummary[];
  creditLimits: CreditLimit[];
}

export const useCreditManagementData = (searchTerm: string, filterStatus: string) => {
  return useQuery<CreditManagementData>({
    queryKey: [CACHE_KEYS.ADMIN_CREDIT, searchTerm, filterStatus],
    queryFn: async () => {
      // Get all farmers with their profiles
      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          profiles:user_id (full_name, phone)
        `);

      if (farmersError) {
        throw farmersError;
      }

      // Get all credit limits
      const { data: creditLimitsData, error: creditLimitsError } = await supabase
        .from('farmer_credit_limits')
        .select(`
          *,
          farmers!inner(
            profiles:user_id (full_name, phone)
          )
        `)
        .eq('is_active', true);

      if (creditLimitsError) {
        throw creditLimitsError;
      }

      const creditLimits = creditLimitsData as CreditLimit[];

      // For each farmer, calculate credit information
      const farmerSummaries: FarmerCreditSummary[] = [];
      
      for (const farmer of farmersData || []) {
        try {
          // Get pending payments
          const { data: pendingCollections, error: collectionsError } = await supabase
            .from('collections')
            .select('total_amount')
            .eq('farmer_id', farmer.id)
            .neq('status', 'Paid');

          if (collectionsError) {
            console.warn(`Error fetching collections for farmer ${farmer.id}:`, collectionsError);
            continue;
          }

          const pendingPayments = pendingCollections?.reduce((sum, collection) => 
            sum + (collection.total_amount || 0), 0) || 0;

          // Get credit limit for this farmer
          const creditLimit = creditLimitsData?.find((cl: any) => cl.farmer_id === farmer.id);
          
          let creditLimitAmount = 0;
          let availableCredit = 0;
          let creditUsed = 0;
          let creditPercentage = 0;

          if (creditLimit) {
            creditLimitAmount = creditLimit.max_credit_amount;
            availableCredit = creditLimit.current_credit_balance;
            creditUsed = creditLimit.total_credit_used;
            creditPercentage = creditLimit.credit_limit_percentage;
          } else {
            // Calculate default credit limit (70% of pending payments, max 100,000)
            creditLimitAmount = Math.min(pendingPayments * 0.7, 100000);
            availableCredit = 0;
            creditUsed = 0;
            creditPercentage = 70;
          }

          farmerSummaries.push({
            farmer_id: farmer.id,
            farmer_name: farmer.profiles?.full_name || 'Unknown Farmer',
            farmer_phone: farmer.profiles?.phone || 'No phone',
            credit_limit: creditLimitAmount,
            available_credit: availableCredit,
            credit_used: creditUsed,
            pending_payments: pendingPayments,
            credit_percentage: creditPercentage
          });
        } catch (err) {
          console.warn(`Error processing farmer ${farmer.id}:`, err);
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