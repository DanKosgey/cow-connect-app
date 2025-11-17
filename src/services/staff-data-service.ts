import { supabase } from '@/integrations/supabase/client';

// Simple in-memory cache
class DataCache {
  private cache: Map<string, { data: any; timestamp: number }> = new Map();
  private readonly TTL = 5 * 60 * 1000; // 5 minutes TTL

  set(key: string, data: any) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  get(key: string) {
    const cached = this.cache.get(key);
    if (!cached) return null;

    // Check if cache is expired
    if (Date.now() - cached.timestamp > this.TTL) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  clear() {
    this.cache.clear();
  }

  clearKey(key: string) {
    this.cache.delete(key);
  }
  
  // Method to clear all farmer-related cache
  clearFarmerCache() {
    this.clearKey('approvedFarmers');
  }
}

const cache = new DataCache();

// Define the StaffData interface at the top of the file
interface StaffData {
  id: string;
  employee_id: string;
  user_id: string;
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
  registration_number?: string;
  phone_number?: string;
}

interface Payment {
  id: string;
  farmer_id: string;
  amount: number;
  payment_date: string;
  status: string;
  payment_method: string;
  farmers: {
    full_name: string;
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

export class StaffDataService {
  private userId: string | null = null;
  private subscriptions: any[] = [];

  constructor(userId: string | null) {
    this.userId = userId;
  }

  // Method to clear farmer cache
  clearFarmerCache() {
    cache.clearFarmerCache();
  }

  async getStaffInfo(): Promise<StaffData | null> {
    console.log('getStaffInfo called with userId:', this.userId);
    if (!this.userId) {
      console.log('No userId, returning null');
      return null;
    }

    const cacheKey = `staffInfo_${this.userId}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      console.log('Returning cached staff info');
      return cached;
    }

    try {
      console.log('Fetching staff info from Supabase');
      const { data, error } = await supabase
        .from('staff')
        .select('id, employee_id, user_id')
        .eq('user_id', this.userId)
        .maybeSingle();

      console.log('Supabase response:', { data, error });
      
      if (error) {
        console.error('Error fetching staff info:', error);
        // Don't throw error, just return null to prevent infinite loading
        return null;
      }

      // If no data found, that's okay - we'll still return null but log it
      if (!data) {
        console.log('No staff record found for user, returning null');
        return null;
      }

      if (data) {
        console.log('Caching staff info');
        cache.set(cacheKey, data);
      }

      return data;
    } catch (error: any) {
      console.error('Error in getStaffInfo:', error);
      // Don't throw error, just return null to prevent infinite loading
      return null;
    }
  }

  async getStaffCollections(staffId: string, fromDate?: string, toDate?: string) {
    const cacheKey = `collections_${staffId}_${fromDate || 'all'}_${toDate || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let query = supabase
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
        .eq('staff_id', staffId)
        .order('collection_date', { ascending: false });

      if (fromDate) {
        query = query.gte('collection_date', fromDate);
      }

      if (toDate) {
        query = query.lte('collection_date', toDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching collections:', error);
        throw new Error(`Failed to fetch collections: ${error.message}`);
      }

      if (data) {
        cache.set(cacheKey, data);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getStaffCollections:', error);
      throw new Error(`Failed to fetch collections: ${error.message || 'Unknown error'}`);
    }
  }

  async getApprovedFarmers() {
    const cacheKey = 'approvedFarmers';
    const cached = cache.get(cacheKey);
    
    // Log cache status for debugging
    console.log('getApprovedFarmers called');
    console.log('Cache hit:', !!cached);
    if (cached) {
      console.log('Cached data:', cached);
    }

    if (cached) {
      return cached;
    }

    try {
      console.log('Fetching farmers from database...');
      const { data, error } = await supabase
        .from('farmers')
        .select(`
          id,
          full_name,
          kyc_status
        `)
        .eq('kyc_status', 'approved')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching farmers:', error);
        throw new Error(`Failed to fetch farmers: ${error.message}`);
      }

      console.log('Database response:', data);

      const result = (data || []).map(farmer => ({
        id: farmer.id,
        full_name: farmer.full_name || 'Unknown Farmer',
        kyc_status: farmer.kyc_status
      }));

      console.log('Processed result:', result);

      cache.set(cacheKey, result);
      return result;
    } catch (error: any) {
      console.error('Error in getApprovedFarmers:', error);
      throw new Error(`Failed to fetch farmers: ${error.message || 'Unknown error'}`);
    }
  }

  // New method that matches admin farmers page query pattern
  async getFarmersData(currentPage: number, pageSize: number) {
    try {
      // For pagination, we need to get the total count first
      const { count, error: countError } = await supabase
        .from('farmers')
        .select('*', { count: 'exact', head: true });
      
      if (countError) {
        throw countError;
      }
      
      // Then fetch the paginated data
      const { data, error } = await supabase
        .from('farmers')
        .select('id, registration_number, full_name, phone_number, kyc_status')
        .order('created_at', { ascending: false })
        .range((currentPage - 1) * pageSize, currentPage * pageSize - 1);
        
      if (error) {
        throw error;
      }
      
      return {
        farmers: data || [],
        totalCount: count || 0
      };
    } catch (error: any) {
      console.error('Error in getFarmersData:', error);
      throw new Error(`Failed to fetch farmers data: ${error.message || 'Unknown error'}`);
    }
  }

  // Simplified method for all farmers without pagination
  async getAllFarmers() {
    try {
      const { data, error } = await supabase
        .from('farmers')
        .select('id, registration_number, full_name, phone_number, kyc_status')
        .order('created_at', { ascending: false });
        
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error: any) {
      console.error('Error in getAllFarmers:', error);
      throw new Error(`Failed to fetch all farmers: ${error.message || 'Unknown error'}`);
    }
  }

  // Method for approved farmers only (used in collector portal)
  async getApprovedFarmersData() {
    try {
      const { data, error } = await supabase
        .from('farmers')
        .select('id, registration_number, full_name, phone_number, kyc_status')
        .eq('kyc_status', 'approved')
        .order('full_name', { ascending: true });
        
      if (error) {
        throw error;
      }
      
      return data || [];
    } catch (error: any) {
      console.error('Error in getApprovedFarmersData:', error);
      throw new Error(`Failed to fetch approved farmers: ${error.message || 'Unknown error'}`);
    }
  }

  async getPayments(staffId: string, fromDate?: string, toDate?: string) {
    const cacheKey = `payments_${staffId}_${fromDate || 'all'}_${toDate || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let query = supabase
        .from('payments')
        .select(`
          id,
          farmer_id,
          amount,
          payment_date,
          status,
          payment_method,
          farmers!farmer_id (
            full_name
          )
        `)
        .eq('processed_by', staffId)
        .order('payment_date', { ascending: false });

      if (fromDate) {
        query = query.gte('payment_date', fromDate);
      }

      if (toDate) {
        query = query.lte('payment_date', toDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching payments:', error);
        throw new Error(`Failed to fetch payments: ${error.message}`);
      }

      if (data) {
        cache.set(cacheKey, data);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getPayments:', error);
      throw new Error(`Failed to fetch payments: ${error.message || 'Unknown error'}`);
    }
  }

  async getQualityTests(staffId: string, fromDate?: string, toDate?: string) {
    const cacheKey = `qualityTests_${staffId}_${fromDate || 'all'}_${toDate || 'all'}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let query = supabase
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
        .eq('performed_by', staffId)
        .order('test_date', { ascending: false });

      if (fromDate) {
        query = query.gte('test_date', fromDate);
      }

      if (toDate) {
        query = query.lte('test_date', toDate);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching quality tests:', error);
        throw new Error(`Failed to fetch quality tests: ${error.message}`);
      }

      if (data) {
        cache.set(cacheKey, data);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getQualityTests:', error);
      throw new Error(`Failed to fetch quality tests: ${error.message || 'Unknown error'}`);
    }
  }

  async getInventoryItems() {
    const cacheKey = 'inventoryItems';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('inventory_items')
        .select('*')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching inventory items:', error);
        // Check if the error is due to table not existing
        if (error.message && error.message.includes('inventory_items')) {
          // Return empty array when table doesn't exist
          return [];
        }
        throw new Error(`Failed to fetch inventory items: ${error.message}`);
      }

      if (data) {
        cache.set(cacheKey, data);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getInventoryItems:', error);
      // Check if the error is due to table not existing
      if (error.message && error.message.includes('inventory_items')) {
        // Return empty array when table doesn't exist
        return [];
      }
      throw new Error(`Failed to fetch inventory items: ${error.message || 'Unknown error'}`);
    }
  }

  async getInventoryTransactions(limit: number = 20) {
    const cacheKey = `inventoryTransactions_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          *,
          inventory_items (name),
          staff!inventory_transactions_staff_id_fkey (profiles (full_name))
        `)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching inventory transactions:', error);
        // Check if the error is due to table not existing
        if (error.message && error.message.includes('inventory_transactions')) {
          // Return empty array when table doesn't exist
          return [];
        }
        throw new Error(`Failed to fetch inventory transactions: ${error.message}`);
      }

      if (data) {
        cache.set(cacheKey, data);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getInventoryTransactions:', error);
      // Check if the error is due to table not existing
      if (error.message && error.message.includes('inventory_transactions')) {
        // Return empty array when table doesn't exist
        return [];
      }
      throw new Error(`Failed to fetch inventory transactions: ${error.message || 'Unknown error'}`);
    }
  }

  async getFarmerCommunications(staffId: string, limit: number = 20) {
    const cacheKey = `farmerCommunications_${staffId}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
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
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching communications:', error);
        throw new Error(`Failed to fetch communications: ${error.message}`);
      }

      if (data) {
        cache.set(cacheKey, data);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getFarmerCommunications:', error);
      throw new Error(`Failed to fetch communications: ${error.message || 'Unknown error'}`);
    }
  }

  async getFarmerNotes(staffId: string, limit: number = 20) {
    const cacheKey = `farmerNotes_${staffId}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
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
        .limit(limit);

      if (error) {
        console.error('Error fetching notes:', error);
        throw new Error(`Failed to fetch notes: ${error.message}`);
      }

      if (data) {
        cache.set(cacheKey, data);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getFarmerNotes:', error);
      throw new Error(`Failed to fetch notes: ${error.message || 'Unknown error'}`);
    }
  }

  async getFarmerDirectory() {
    const cacheKey = 'farmerDirectory';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('farmers')
        .select(`
          id,
          registration_number,
          national_id,
          full_name,
          phone_number,
          address,
          farm_location,
          kyc_status,
          created_at,
          farmer_analytics!farmer_analytics_farmer_id_fkey(
            total_collections,
            total_liters,
            current_month_liters,
            current_month_earnings,
            avg_quality_score,
            updated_at
          )
        `)
        .eq('kyc_status', 'approved')
        .order('full_name', { ascending: true });

      if (error) {
        console.error('Error fetching farmer directory:', error);
        throw new Error(`Failed to fetch farmer directory: ${error.message}`);
      }

      if (data) {
        cache.set(cacheKey, data);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getFarmerDirectory:', error);
      throw new Error(`Failed to fetch farmer directory: ${error.message || 'Unknown error'}`);
    }
  }

  async getFarmerCollectionHistory(farmerId: string, limit: number = 10) {
    const cacheKey = `farmerCollectionHistory_${farmerId}_${limit}`;
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          farmer_id,
          liters,
          quality_grade,
          total_amount,
          collection_date,
          status
        `)
        .eq('farmer_id', farmerId)
        .order('collection_date', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('Error fetching farmer collection history:', error);
        throw new Error(`Failed to fetch collection history: ${error.message}`);
      }

      if (data) {
        cache.set(cacheKey, data);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getFarmerCollectionHistory:', error);
      throw new Error(`Failed to fetch collection history: ${error.message || 'Unknown error'}`);
    }
  }

  async getMilkQualityParameters() {
    const cacheKey = 'milkQualityParameters';
    const cached = cache.get(cacheKey);
    if (cached) {
      return cached;
    }

    try {
      let query = supabase
        .from('milk_quality_parameters')
        .select(`
          id,
          parameter_name,
          parameter_value,
          parameter_unit,
          parameter_type
        `)
        .order('parameter_name', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching milk quality parameters:', error);
        throw new Error(`Failed to fetch milk quality parameters: ${error.message}`);
      }

      if (data) {
        cache.set(cacheKey, data);
      }

      return data || [];
    } catch (error: any) {
      console.error('Error in getMilkQualityParameters:', error);
      throw new Error(`Failed to fetch milk quality parameters: ${error.message || 'Unknown error'}`);
    }
  }

  // Add real-time subscription methods
  subscribeToCollections(staffId: string, callback: (data: any[]) => void) {
    const subscription = supabase
      .channel('collections-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'collections',
          filter: `staff_id=eq.${staffId}`
        },
        (payload) => {
          // Clear cache when new data is inserted
          cache.clearKey(`collections_${staffId}_all_all`);
          callback([payload.new]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'collections',
          filter: `staff_id=eq.${staffId}`
        },
        (payload) => {
          // Clear cache when data is updated
          cache.clearKey(`collections_${staffId}_all_all`);
          callback([payload.new]);
        }
      )
      .subscribe();

    this.subscriptions.push(subscription);
    return subscription;
  }

  subscribeToPayments(staffId: string, callback: (data: any[]) => void) {
    const subscription = supabase
      .channel('payments-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'payments',
          filter: `processed_by=eq.${staffId}`
        },
        (payload) => {
          // Clear cache when new data is inserted
          cache.clearKey(`payments_${staffId}_all_all`);
          callback([payload.new]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'payments',
          filter: `processed_by=eq.${staffId}`
        },
        (payload) => {
          // Clear cache when data is updated
          cache.clearKey(`payments_${staffId}_all_all`);
          callback([payload.new]);
        }
      )
      .subscribe();

    this.subscriptions.push(subscription);
    return subscription;
  }

  subscribeToQualityTests(staffId: string, callback: (data: any[]) => void) {
    const subscription = supabase
      .channel('quality-tests-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'quality_tests',
          filter: `performed_by=eq.${staffId}`
        },
        (payload) => {
          // Clear cache when new data is inserted
          cache.clearKey(`qualityTests_${staffId}_all_all`);
          callback([payload.new]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'quality_tests',
          filter: `performed_by=eq.${staffId}`
        },
        (payload) => {
          // Clear cache when data is updated
          cache.clearKey(`qualityTests_${staffId}_all_all`);
          callback([payload.new]);
        }
      )
      .subscribe();

    this.subscriptions.push(subscription);
    return subscription;
  }

  subscribeToInventoryTransactions(callback: (data: any[]) => void) {
    const subscription = supabase
      .channel('inventory-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'inventory_transactions'
        },
        (payload) => {
          // Clear cache when new data is inserted
          cache.clearKey('inventoryTransactions_20');
          callback([payload.new]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'inventory_transactions'
        },
        (payload) => {
          // Clear cache when data is updated
          cache.clearKey('inventoryTransactions_20');
          callback([payload.new]);
        }
      )
      .subscribe();

    this.subscriptions.push(subscription);
    return subscription;
  }

  subscribeToFarmerCommunications(staffId: string, callback: (data: any[]) => void) {
    const subscription = supabase
      .channel('farmer-communications-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'farmer_communications',
          filter: `staff_id=eq.${staffId}`
        },
        (payload) => {
          // Clear cache when new data is inserted
          cache.clearKey(`farmerCommunications_${staffId}_20`);
          callback([payload.new]);
        }
      )
      .subscribe();

    this.subscriptions.push(subscription);
    return subscription;
  }

  subscribeToFarmerNotes(staffId: string, callback: (data: any[]) => void) {
    const subscription = supabase
      .channel('farmer-notes-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'farmer_notes',
          filter: `staff_id=eq.${staffId}`
        },
        (payload) => {
          // Clear cache when new data is inserted
          cache.clearKey(`farmerNotes_${staffId}_20`);
          callback([payload.new]);
        }
      )
      .subscribe();

    this.subscriptions.push(subscription);
    return subscription;
  }

  subscribeToMilkQualityParameters(staffId: string, callback: (data: any[]) => void) {
    const subscription = supabase
      .channel('milk-quality-parameters-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'milk_quality_parameters',
          filter: `performed_by=eq.${staffId}`
        },
        (payload) => {
          // Clear cache when new data is inserted
          cache.clearKey('milkQualityParameters');
          callback([payload.new]);
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'milk_quality_parameters',
          filter: `performed_by=eq.${staffId}`
        },
        (payload) => {
          // Clear cache when data is updated
          cache.clearKey('milkQualityParameters');
          callback([payload.new]);
        }
      )
      .subscribe();

    this.subscriptions.push(subscription);
    return subscription;
  }

  // Cleanup method to unsubscribe from all channels
  cleanup() {
    this.subscriptions.forEach(subscription => {
      supabase.removeChannel(subscription);
    });
    this.subscriptions = [];
    cache.clear();
  }
}

export const createStaffDataService = (userId: string | null) => {
  return new StaffDataService(userId);
};