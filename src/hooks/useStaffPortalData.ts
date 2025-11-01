import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

// Define interfaces for our data structures
interface StaffData {
  id: string;
  employee_id: string;
  user_id: string;
}

interface StaffStats {
  total_collections_today: number;
  total_farmers_today: number;
  total_earnings_today: number;
}

interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  liters: number;
  quality_grade: string;
  rate_per_liter: number;
  total_amount: number;
  collection_date: string;
  status: string;
  notes: string | null;
  farmers: {
    full_name: string;
    id: string;
  } | null;
}

interface Farmer {
  id: string;
  full_name: string;
  kyc_status: string;
}

interface FarmerPayment {
  id: string;
  farmer_id: string;
  collection_ids: string[];
  total_amount: number;
  approval_status: string;
  approved_at: string | null;
  paid_at: string | null;
  notes: string | null;
  created_at: string;
  farmers: {
    full_name: string;
    id: string;
    phone_number: string;
  } | null;
}

interface QualityTest {
  id: string;
  collection_id: string;
  test_type: string;
  test_result: string;
  test_date: string;
  performed_by: string;
  notes: string | null;
  collection: {
    collection_id: string;
    farmers: {
      full_name: string;
    } | null;
  } | null;
}

interface InventoryItem {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  current_stock: number;
  reorder_level: number;
  supplier: string | null;
  cost_per_unit: number | null;
  created_at: string;
  updated_at: string;
}

interface InventoryTransaction {
  id: string;
  item_id: string;
  transaction_type: 'in' | 'out';
  quantity: number;
  unit_cost: number | null;
  total_cost: number | null;
  reason: string | null;
  performed_by: string;
  created_at: string;
  inventory_items: {
    name: string;
  } | null;
  staff: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

interface Communication {
  id: string;
  farmer_id: string;
  staff_id: string;
  message: string;
  direction: 'sent' | 'received';
  created_at: string;
  farmer: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
}

interface Note {
  id: string;
  farmer_id: string;
  staff_id: string;
  note: string;
  created_at: string;
}

// Cache keys for different data types
export const CACHE_KEYS = {
  STAFF_INFO: 'staff-info',
  STAFF_STATS: 'staff-stats',
  STAFF_COLLECTIONS: 'staff-collections',
  APPROVED_FARMERS: 'approved-farmers',
  STAFF_PAYMENTS: 'staff-payments',
  QUALITY_TESTS: 'quality-tests',
  INVENTORY_DATA: 'inventory-data',
  FARMER_RELATIONSHIP_DATA: 'farmer-relationship-data',
  FARMER_DIRECTORY: 'farmer-directory',
  FARMER_COLLECTION_HISTORY: 'farmer-collection-history'
};

// Main hook for Staff Portal data
export const useStaffPortalData = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Get staff information
  const useStaffInfo = () => {
    return useQuery<StaffData | null>({
      queryKey: [CACHE_KEYS.STAFF_INFO, user?.id],
      queryFn: async () => {
        if (!user?.id) return null;

        const { data, error } = await supabase
          .from('staff')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (error) throw error;
        return data;
      },
      enabled: !!user?.id,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get staff stats for dashboard
  const useStaffStats = () => {
    return useQuery<StaffStats>({
      queryKey: [CACHE_KEYS.STAFF_STATS, user?.id],
      queryFn: async () => {
        if (!user?.id) {
          return {
            total_collections_today: 0,
            total_farmers_today: 0,
            total_earnings_today: 0
          };
        }

        // Get today's date range
        const today = new Date();
        const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
        const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();

        // First, get staff ID
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (staffError) throw staffError;
        
        if (!staffData) {
          return {
            total_collections_today: 0,
            total_farmers_today: 0,
            total_earnings_today: 0
          };
        }

        const staffId = staffData.id;

        // Fetch today's collections for this staff member
        const { data: collectionsData, error: collectionsError } = await supabase
          .from('collections')
          .select(`
            id,
            farmer_id,
            liters,
            total_amount
          `)
          .eq('staff_id', staffId)
          .gte('collection_date', startOfDay)
          .lte('collection_date', endOfDay);

        if (collectionsError) throw collectionsError;

        // Calculate stats
        const totalCollections = collectionsData?.length || 0;
        const totalFarmers = new Set(collectionsData?.map(c => c.farmer_id)).size || 0;
        const totalEarnings = collectionsData?.reduce((sum, c) => sum + (c.total_amount || 0), 0) || 0;

        return {
          total_collections_today: totalCollections,
          total_farmers_today: totalFarmers,
          total_earnings_today: parseFloat(totalEarnings.toFixed(2))
        };
      },
      enabled: !!user?.id,
      staleTime: 1000 * 60 * 2, // 2 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes
    });
  };

  // Get staff collections with filtering
  const useStaffCollections = (dateRange: 'today' | 'week' | 'month' | 'all' = 'week', page: number = 1, pageSize: number = 10) => {
    return useQuery<{ collections: Collection[]; totalCollections: number }>({
      queryKey: [CACHE_KEYS.STAFF_COLLECTIONS, user?.id, dateRange, page, pageSize],
      queryFn: async () => {
        if (!user?.id) {
          return { collections: [], totalCollections: 0 };
        }

        // Get staff ID
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (staffError) throw staffError;
        if (!staffData) {
          return { collections: [], totalCollections: 0 };
        }

        const staffId = staffData.id;

        // Calculate date range
        const now = new Date();
        let fromDate: string | undefined;
        let toDate: string | undefined = now.toISOString();

        switch (dateRange) {
          case 'today':
            fromDate = new Date(now.setHours(0, 0, 0, 0)).toISOString();
            break;
          case 'week':
            fromDate = subDays(now, 7).toISOString();
            break;
          case 'month':
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            break;
          case 'all':
            fromDate = undefined;
            toDate = undefined;
            break;
        }

        // First get total count
        let countQuery = supabase
          .from('collections')
          .select('*', { count: 'exact', head: true })
          .eq('staff_id', staffId);
          
        if (fromDate) {
          countQuery = countQuery.gte('collection_date', fromDate);
        }
        if (toDate) {
          countQuery = countQuery.lte('collection_date', toDate);
        }

        const { count, error: countError } = await countQuery;
        if (countError) throw countError;

        // Then fetch paginated data
        let dataQuery = supabase
          .from('collections')
          .select(`
            id,
            collection_id,
            farmer_id,
            liters,
            quality_grade,
            rate_per_liter,
            total_amount,
            collection_date,
            status,
            notes,
            farmers!fk_collections_farmer_id (
              full_name,
              id
            )
          `)
          .eq('staff_id', staffId);
          
        if (fromDate) {
          dataQuery = dataQuery.gte('collection_date', fromDate);
        }
        if (toDate) {
          dataQuery = dataQuery.lte('collection_date', toDate);
        }

        const { data, error: dataError } = await dataQuery
          .order('collection_date', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (dataError) throw dataError;

        return {
          collections: data || [],
          totalCollections: count || 0
        };
      },
      enabled: !!user?.id,
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get approved farmers
  const useApprovedFarmers = () => {
    return useQuery<Farmer[]>({
      queryKey: [CACHE_KEYS.APPROVED_FARMERS],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('farmers')
          .select('id, full_name, kyc_status')
          .eq('kyc_status', 'approved')
          .order('full_name');

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    });
  };

  // Get staff payments with filtering
  const useStaffPayments = (dateRange: 'week' | 'month' | 'all' = 'month') => {
    return useQuery<FarmerPayment[]>({
      queryKey: [CACHE_KEYS.STAFF_PAYMENTS, user?.id, dateRange],
      queryFn: async () => {
        // Fetch payment history with increased limit to show more records
        const { data, error } = await supabase
          .from('farmer_payments')
          .select(`
            id,
            farmer_id,
            collection_ids,
            total_amount,
            approval_status,
            approved_at,
            paid_at,
            notes,
            created_at,
            farmers!farmer_payments_farmer_id_fkey (
              full_name,
              id,
              phone_number
            )
          `)
          .order('created_at', { ascending: false })
          .limit(1000); // Increased limit to show more payment records

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get quality tests with filtering
  const useQualityTests = (dateRange: 'week' | 'month' | 'all' = 'month') => {
    return useQuery<QualityTest[]>({
      queryKey: [CACHE_KEYS.QUALITY_TESTS, user?.id, dateRange],
      queryFn: async () => {
        if (!user?.id) return [];

        // Get staff ID
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (staffError) throw staffError;
        if (!staffData) return [];

        const staffId = staffData.id;

        // Calculate date range
        const now = new Date();
        let fromDate: string | undefined;
        let toDate: string | undefined = now.toISOString();

        switch (dateRange) {
          case 'week':
            fromDate = subDays(now, 7).toISOString();
            break;
          case 'month':
            fromDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
            break;
          case 'all':
            fromDate = undefined;
            toDate = undefined;
            break;
        }

        let dataQuery = supabase
          .from('quality_tests')
          .select(`
            id,
            collection_id,
            test_type,
            test_result,
            test_date,
            performed_by,
            notes,
            collection (
              collection_id,
              farmers (
                full_name
              )
            )
          `)
          .eq('performed_by', staffId);
          
        if (fromDate) {
          dataQuery = dataQuery.gte('test_date', fromDate);
        }
        if (toDate) {
          dataQuery = dataQuery.lte('test_date', toDate);
        }

        const { data, error } = await dataQuery.order('test_date', { ascending: false });
        if (error) throw error;

        return data || [];
      },
      enabled: !!user?.id,
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    });
  };

  // Get inventory data
  const useInventoryData = () => {
    return useQuery<{ items: InventoryItem[]; transactions: InventoryTransaction[] }>({
      queryKey: [CACHE_KEYS.INVENTORY_DATA],
      queryFn: async () => {
        // Fetch items and transactions in parallel
        const [itemsResult, transactionsResult] = await Promise.all([
          supabase
            .from('inventory_items')
            .select('*')
            .order('name'),
          supabase
            .from('inventory_transactions')
            .select(`
              *,
              inventory_items (name),
              staff!inventory_transactions_staff_id_fkey (profiles (full_name))
            `)
            .order('created_at', { ascending: false })
            .limit(50)
        ]);

        if (itemsResult.error) throw itemsResult.error;
        if (transactionsResult.error) throw transactionsResult.error;

        return {
          items: itemsResult.data || [],
          transactions: transactionsResult.data || []
        };
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get farmer relationship data
  const useFarmerRelationshipData = () => {
    return useQuery<{ communications: Communication[]; notes: Note[] }>({
      queryKey: [CACHE_KEYS.FARMER_RELATIONSHIP_DATA, user?.id],
      queryFn: async () => {
        if (!user?.id) {
          return { communications: [], notes: [] };
        }

        // Get staff ID
        const { data: staffData, error: staffError } = await supabase
          .from('staff')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (staffError) throw staffError;
        if (!staffData) {
          return { communications: [], notes: [] };
        }

        const staffId = staffData.id;

        // Fetch communications and notes in parallel
        const [communicationsResult, notesResult] = await Promise.all([
          supabase
            .from('farmer_communications')
            .select(`
              id,
              farmer_id,
              staff_id,
              message,
              direction,
              created_at,
              farmer (
                profiles (
                  full_name
                )
              )
            `)
            .eq('staff_id', staffId)
            .order('created_at', { ascending: false }),
          supabase
            .from('farmer_notes')
            .select(`
              id,
              farmer_id,
              staff_id,
              note,
              created_at
            `)
            .eq('staff_id', staffId)
            .order('created_at', { ascending: false })
        ]);

        if (communicationsResult.error) throw communicationsResult.error;
        if (notesResult.error) throw notesResult.error;

        return {
          communications: communicationsResult.data || [],
          notes: notesResult.data || []
        };
      },
      enabled: !!user?.id,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get farmer directory
  const useFarmerDirectory = () => {
    return useQuery<any[]>({
      queryKey: [CACHE_KEYS.FARMER_DIRECTORY],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('farmers')
          .select(`
            id,
            full_name,
            phone_number,
            email,
            kyc_status,
            created_at
          `)
          .order('full_name');

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 10, // 10 minutes
      gcTime: 1000 * 60 * 30, // 30 minutes
    });
  };

  // Get farmer collection history
  const useFarmerCollectionHistory = (farmerId: string | null, limit: number = 10) => {
    return useQuery<Collection[]>({
      queryKey: [CACHE_KEYS.FARMER_COLLECTION_HISTORY, farmerId, limit],
      queryFn: async () => {
        if (!farmerId) return [];

        const { data, error } = await supabase
          .from('collections')
          .select(`
            id,
            collection_id,
            farmer_id,
            liters,
            quality_grade,
            rate_per_liter,
            total_amount,
            collection_date,
            status,
            notes,
            farmers!fk_collections_farmer_id (
              full_name,
              id
            )
          `)
          .eq('farmer_id', farmerId)
          .order('collection_date', { ascending: false })
          .limit(limit);

        if (error) throw error;
        return data || [];
      },
      enabled: !!farmerId,
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Mutation to invalidate all staff portal caches
  const invalidateStaffPortalCache = () => {
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.STAFF_INFO] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.STAFF_STATS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.STAFF_COLLECTIONS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.APPROVED_FARMERS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.STAFF_PAYMENTS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.QUALITY_TESTS] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.INVENTORY_DATA] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_RELATIONSHIP_DATA] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_DIRECTORY] });
    queryClient.invalidateQueries({ queryKey: [CACHE_KEYS.FARMER_COLLECTION_HISTORY] });
  };

  return {
    useStaffInfo,
    useStaffStats,
    useStaffCollections,
    useApprovedFarmers,
    useStaffPayments,
    useQualityTests,
    useInventoryData,
    useFarmerRelationshipData,
    useFarmerDirectory,
    useFarmerCollectionHistory,
    invalidateStaffPortalCache
  };
};