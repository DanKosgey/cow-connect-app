import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';

interface Collection {
  id: string;
  collection_id: string;
  liters: number;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
}

interface FarmerPaymentsData {
  collections: Collection[];
  farmer: any;
  creditInfo: any;
  totalCollections: number;
  paidCollections: number;
  pendingCollections: number;
  availableCredit: number;
  creditLimit: number;
}

export const useFarmerPaymentsData = () => {
  return useQuery<FarmerPaymentsData>({
    queryKey: [CACHE_KEYS.FARMER_PAYMENTS],
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

      // Fetch credit information
      const { data: creditData, error: creditError } = await supabase
        .from('farmer_credit_limits')
        .select('*')
        .eq('farmer_id', farmerData.id)
        .eq('is_active', true)
        .maybeSingle();

      // Fetch collections from the collections table for this farmer
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
        .eq('farmer_id', farmerData.id)
        .order('collection_date', { ascending: false });

      if (collectionsError) {
        throw collectionsError;
      }
      
      const collections = collectionsData || [];
      
      // Calculate payment statistics
      const totalCollections = collections.reduce((sum, collection) => sum + collection.total_amount, 0);
      const paidCollections = collections.filter(c => c.status === 'Paid').reduce((sum, collection) => sum + collection.total_amount, 0);
      const pendingCollections = collections.filter(c => c.status !== 'Paid').reduce((sum, collection) => sum + collection.total_amount, 0);
      const availableCredit = creditData?.current_credit_balance || 0;
      const creditLimit = creditData?.max_credit_amount || 0;

      return {
        collections,
        farmer: farmerData,
        creditInfo: creditData,
        totalCollections,
        paidCollections,
        pendingCollections,
        availableCredit,
        creditLimit
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};