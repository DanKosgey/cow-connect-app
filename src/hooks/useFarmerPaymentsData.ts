import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { CACHE_KEYS } from '@/services/cache-utils';
import { CreditService } from '@/services/credit-service';
import { subDays, subWeeks, subMonths, subYears, isValid } from 'date-fns';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

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

type TimeframeType = 'day' | 'week' | 'month' | 'quarter' | 'year';

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_TIMEFRAME: TimeframeType = 'week';
const STALE_TIME = 1000 * 60 * 5; // 5 minutes
const GC_TIME = 1000 * 60 * 15; // 15 minutes

// Payment status constants
const PAYMENT_STATUS = {
  PAID: 'Paid',
  PENDING: 'Pending',
  CANCELLED: 'Cancelled',
} as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Calculate the start date based on the selected timeframe
 */
const calculateStartDate = (timeframe: string): Date => {
  const now = new Date();
  
  // Validate current date
  if (!isValid(now)) {
    throw new Error('Invalid current date');
  }
  
  switch (timeframe) {
    case 'day':
      return subDays(now, 1);
    case 'week':
      return subWeeks(now, 1);
    case 'month':
      return subMonths(now, 1);
    case 'quarter':
      return subMonths(now, 3);
    case 'year':
      return subYears(now, 1);
    default:
      console.warn(`Unknown timeframe: ${timeframe}, defaulting to week`);
      return subWeeks(now, 1);
  }
};

/**
 * Safe number conversion with fallback
 */
const safeNumber = (value: number | null | undefined, defaultValue: number = 0): number => {
  if (typeof value === 'number' && !isNaN(value) && isFinite(value)) {
    return value;
  }
  return defaultValue;
};

/**
 * Validate collection data
 */
const isValidCollection = (collection: any): collection is Collection => {
  return (
    collection &&
    typeof collection.id === 'string' &&
    typeof collection.collection_id === 'string' &&
    typeof collection.liters === 'number' &&
    typeof collection.rate_per_liter === 'number' &&
    typeof collection.total_amount === 'number' &&
    typeof collection.collection_date === 'string' &&
    typeof collection.status === 'string'
  );
};

/**
 * Calculate payment statistics from collections
 */
const calculatePaymentStats = (collections: Collection[]) => {
  let totalCollections = 0;
  let paidCollections = 0;
  let pendingCollections = 0;

  collections.forEach(collection => {
    const amount = safeNumber(collection.total_amount);
    
    totalCollections += amount;
    
    if (collection.status === PAYMENT_STATUS.PAID) {
      paidCollections += amount;
    } else if (collection.status === PAYMENT_STATUS.PENDING) {
      pendingCollections += amount;
    } else {
      // Treat any other status (including Cancelled) as pending
      pendingCollections += amount;
    }
  });

  return {
    totalCollections: safeNumber(totalCollections),
    paidCollections: safeNumber(paidCollections),
    pendingCollections: safeNumber(pendingCollections),
  };
};

/**
 * Fetch credit information with error handling
 */
const fetchCreditInfo = async (farmerId: string): Promise<{
  creditInfo: CreditInfo | null;
  availableCredit: number;
  creditLimit: number;
}> => {
  try {
    const creditInfo = await CreditService.getCreditStatus(farmerId);
    
    if (!creditInfo) {
      console.info('No credit information found for farmer:', farmerId);
      return {
        creditInfo: null,
        availableCredit: 0,
        creditLimit: 0,
      };
    }

    const availableCredit = safeNumber(creditInfo.current_credit_balance);
    const creditLimit = safeNumber(creditInfo.max_credit_amount);

    console.log('Credit status retrieved:', {
      farmerId,
      availableCredit,
      creditLimit,
      isActive: creditInfo.is_active,
    });

    return {
      creditInfo,
      availableCredit,
      creditLimit,
    };
  } catch (error) {
    console.error('Error fetching credit information:', error);
    
    // Return default values instead of throwing
    return {
      creditInfo: null,
      availableCredit: 0,
      creditLimit: 0,
    };
  }
};

/**
 * Fetch farmer profile
 */
const fetchFarmerProfile = async (userId: string): Promise<{ id: string }> => {
  const { data: farmerData, error: farmerError } = await supabase
    .from('farmers')
    .select('id')
    .eq('user_id', userId)
    .maybeSingle();

  if (farmerError) {
    console.error('Error fetching farmer profile:', farmerError);
    throw new Error(`Failed to fetch farmer profile: ${farmerError.message}`);
  }

  if (!farmerData) {
    throw new Error('Farmer profile not found. Please complete your registration.');
  }

  return farmerData;
};

/**
 * Fetch collections with date filtering
 */
const fetchCollections = async (
  farmerId: string,
  startDate: Date
): Promise<Collection[]> => {
  // Validate dates
  if (!isValid(startDate)) {
    throw new Error('Invalid start date provided');
  }

  // Fetch collections from the collections table for this farmer WITHOUT date filtering
  // Let the component handle filtering for better UX
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
    .order('collection_date', { ascending: false });

  if (collectionsError) {
    console.error('Error fetching collections:', collectionsError);
    throw new Error(`Failed to fetch collections: ${collectionsError.message}`);
  }

  // Validate and filter collections
  const collections = (collectionsData || []).filter(collection => {
    const isValid = isValidCollection(collection);
    if (!isValid) {
      console.warn('Invalid collection data detected:', collection);
    }
    return isValid;
  });

  console.log(`Fetched ${collections.length} valid collections for farmer ${farmerId}`);

  return collections;
};

// ============================================================================
// MAIN HOOK
// ============================================================================

/**
 * Custom hook to fetch farmer payments data with credit information
 * 
 * @param timeframe - Time period to filter collections ('day' | 'week' | 'month' | 'quarter' | 'year')
 * @returns Query result with farmer payments data
 * 
 * @example
 * ```tsx
 * const { data, isLoading, error } = useFarmerPaymentsData('week');
 * ```
 */
export const useFarmerPaymentsData = (timeframe: string = 'week') => {
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

      // Fetch collections from the collections table for this farmer WITHOUT date filtering
      // Let the component handle filtering for better UX
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
        .order('collection_date', { ascending: false });

      if (collectionsError) {
        throw collectionsError;
      }

      const collections = (collectionsData || []).filter(collection => {
        const isValid = isValidCollection(collection);
        if (!isValid) {
          console.warn('Invalid collection data detected:', collection);
        }
        return isValid;
      });

      const paymentStats = calculatePaymentStats(collections);

      const result: FarmerPaymentsData = {
        collections,
        farmer: farmerData,
        creditInfo: creditInfo,
        totalCollections: paymentStats.totalCollections,
        paidCollections: paymentStats.paidCollections,
        pendingCollections: paymentStats.pendingCollections,
        availableCredit: availableCredit,
        creditLimit: creditLimit,
      };

      return result;
    },
    staleTime: STALE_TIME,
    gcTime: GC_TIME,
    
    // Retry configuration
    retry: (failureCount, error) => {
      // Don't retry on authentication errors
      if (error instanceof Error) {
        const errorMessage = error.message.toLowerCase();
        if (
          errorMessage.includes('authentication') ||
          errorMessage.includes('not authenticated') ||
          errorMessage.includes('log in')
        ) {
          return false;
        }
      }
      
      // Retry up to 2 times for other errors
      return failureCount < 2;
    },
    
    retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    
    // Enable refetching on window focus for real-time updates
    refetchOnWindowFocus: true,
    
    // Enable refetching on reconnect
    refetchOnReconnect: true,
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

export type {
  Collection,
  CreditInfo,
  FarmerPaymentsData,
  TimeframeType,
};

export {
  DEFAULT_TIMEFRAME,
  PAYMENT_STATUS,
  calculateStartDate,
  safeNumber,
};