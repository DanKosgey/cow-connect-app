import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CreditService } from '@/services/credit-service';
import { CACHE_KEYS } from '@/services/cache-utils';
import { subDays, subWeeks, subMonths, subYears } from 'date-fns';

interface CreditStatus {
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

interface CreditTransaction {
  id: string;
  farmer_id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  reference_type?: string;
  reference_id?: string;
  description?: string;
  created_by?: string;
  created_at: string;
}

interface AgrovetPurchase {
  id: string;
  farmer_id: string;
  item_id: string;
  quantity: number;
  unit_price: number;
  total_amount: number;
  payment_method: string;
  credit_transaction_id?: string;
  status: string;
  purchased_by?: string;
  created_at: string;
  agrovet_inventory?: {
    name: string;
    category: string;
  };
}

interface FarmerCreditData {
  creditStatus: CreditStatus | null;
  creditHistory: CreditTransaction[];
  purchaseHistory: AgrovetPurchase[];
  pendingPayments: number;
  creditLimit: number;
  availableCredit: number;
  creditUsed: number;
  creditPercentage: number;
}

export const useFarmerCreditData = (timeframe: string = 'month') => {
  return useQuery<FarmerCreditData>({
    queryKey: [CACHE_KEYS.FARMER_CREDIT, timeframe],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("Not authenticated");
      }

      // Get farmer profile
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (farmerError) throw farmerError;
      if (!farmerData) {
        throw new Error("Farmer profile not found");
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

      // Get credit status
      const creditStatus = await CreditService.getCreditStatus(farmerId);

      // Get credit history with date filtering
      let creditHistory = await CreditService.getCreditHistory(farmerId);
      creditHistory = creditHistory.filter(transaction => 
        new Date(transaction.created_at) >= startDate
      );

      // Get purchase history with date filtering
      let purchaseHistory = await CreditService.getPurchaseHistory(farmerId);
      purchaseHistory = purchaseHistory.filter(purchase => 
        new Date(purchase.created_at) >= startDate
      );

      // Get pending payments (no date filtering needed as these are current)
      const { data: pendingCollections, error: collectionsError } = await supabase
        .from('collections')
        .select('total_amount')
        .eq('farmer_id', farmerId)
        .neq('status', 'Paid');

      if (collectionsError) throw collectionsError;
      const pendingPayments = pendingCollections?.reduce((sum, collection) => 
        sum + (collection.total_amount || 0), 0) || 0;

      const creditLimit = creditStatus?.max_credit_amount || 0;
      const availableCredit = creditStatus?.current_credit_balance || 0;
      const creditUsed = creditStatus?.total_credit_used || 0;
      const creditPercentage = creditLimit > 0 ? (availableCredit / creditLimit) * 100 : 0;

      return {
        creditStatus,
        creditHistory,
        purchaseHistory,
        pendingPayments,
        creditLimit,
        availableCredit,
        creditUsed,
        creditPercentage
      };
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 15, // 15 minutes
  });
};