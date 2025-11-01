import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';
import { CreditService } from '@/services/credit-service';
import { subDays, subWeeks, subMonths, subYears } from 'date-fns';

interface Collection {
  id: string;
  collection_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
}

interface CreditInfo {
  id: string;
  farmer_id: string;
  credit_limit_percentage: number;
  max_credit_amount: number;
  current_credit_balance: number;
  total_credit_used: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

interface FarmerPaymentsData {
  collections: Collection[];
  farmer: { id: string } | null;
  creditInfo: CreditInfo | null;
  totalCollections: number;
  paidCollections: number;
  pendingCollections: number;
  availableCredit: number;
  creditLimit: number;
}

export const useFarmerPaymentsData = (timeframe: string = 'month') => {
  return useQuery<FarmerPaymentsData>({
    queryKey: [CACHE_KEYS.FARMER_PAYMENTS, timeframe],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Fetch farmer profile
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (farmerError) {
        throw farmerError;
      }

      if (!farmerData) {
        throw new Error('Farmer profile not found. Please complete your registration.');
      }

      const farmerId = farmerData.id;

      // Calculate date range based on timeframe
      const now = new Date();
      let startDate: Date;
      
      switch (timeframe) {
        case 'day':
          startDate = subDays(now, 1);
          break;
        case 'week':
          startDate = subDays(now, 7);
          break;
        case 'month':
          startDate = subDays(now, 30);
          break;
        case 'quarter':
          startDate = subDays(now, 90);
          break;
        case 'year':
          startDate = subDays(now, 365);
          break;
        default:
          startDate = subDays(now, 30);
      }

      // Fetch credit information using the same logic as credit dashboard
      let availableCredit = 0;
      let creditLimit = 0;
      let creditInfo = null;
      
      try {
        // Get credit status directly like the credit dashboard does
        creditInfo = await CreditService.getCreditStatus(farmerId);
        console.log('Credit status from CreditService:', creditInfo);
        
        // Use the actual current balance directly from credit status
        availableCredit = creditInfo?.current_credit_balance || 0;
        creditLimit = creditInfo?.max_credit_amount || 0;
      } catch (error) {
        console.error('Error fetching credit data:', error);
        // Don't throw error for credit data, as it might not exist yet
      }

      // Fetch collections from the collections table for this farmer with date filtering
      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          liters,
          rate_per_liter,
          total_amount,
          collection_date,
          status
        `)
        .eq('farmer_id', farmerId)
        .gte('collection_date', startDate.toISOString())
        .order('collection_date', { ascending: false });

      if (collectionsError) {
        throw collectionsError;
      }
      
      const collections = collectionsData || [];
      
      // Calculate payment statistics
      const totalCollections = collections.reduce((sum, collection) => sum + collection.total_amount, 0);
      const paidCollections = collections.filter(c => c.status === 'Paid').reduce((sum, collection) => sum + collection.total_amount, 0);
      const pendingCollections = collections.filter(c => c.status !== 'Paid').reduce((sum, collection) => sum + collection.total_amount, 0);

      const result = {
        collections,
        farmer: farmerData,
        creditInfo,
        totalCollections,
        paidCollections,
        pendingCollections,
        availableCredit,
        creditLimit
      };
      
      console.log('useFarmerPaymentsData result:', result);
      
      return result;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};