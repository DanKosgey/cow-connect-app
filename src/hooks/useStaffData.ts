import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { createStaffDataService } from '@/services/staff-data-service';
import { supabase } from '@/integrations/supabase/client';
import { format, subDays } from 'date-fns';

// Define interfaces at the top of the file
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

export const useStaffInfo = () => {
  const { user } = useAuth();
  const [staffInfo, setStaffInfo] = useState<StaffData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('useStaffInfo useEffect triggered with user:', user);
    const fetchStaffInfo = async () => {
      if (!user?.id) {
        console.log('No user.id, returning early');
        setLoading(false);
        return;
      }

      try {
        console.log('Starting staff info fetch');
        setLoading(true);
        const service = createStaffDataService(user.id);
        const data = await service.getStaffInfo();
        console.log('Staff info fetch completed', data);
        setStaffInfo(data);
      } catch (err: any) {
        console.error('Error fetching staff info:', err);
        setError(err.message || 'Failed to fetch staff information');
      } finally {
        console.log('Setting staff info loading to false');
        setLoading(false);
      }
    };

    fetchStaffInfo();
    
    // Add a timeout to ensure loading is set to false
    const timeoutId = setTimeout(() => {
      if (loading) {
        console.log('Staff info loading timeout, forcing completion');
        setLoading(false);
      }
    }, 15000); // 15 second timeout

    return () => clearTimeout(timeoutId);
  }, [user?.id]);

  console.log('useStaffInfo returning:', { staffInfo, loading, error });
  return { staffInfo, loading, error };
};

export const useStaffCollections = (staffId: string | null, dateRange: 'today' | 'week' | 'month' | 'all' = 'week', page: number = 1, pageSize: number = 10) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalCollections, setTotalCollections] = useState(0);

  useEffect(() => {
    const fetchCollections = async () => {
      if (!staffId) return;

      try {
        setLoading(true);
        const service = createStaffDataService(null);
        
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

        // For pagination, we need to fetch data differently
        // First get total count
        let countQuery = supabase
          .from('collections')
          .select('*', { count: 'exact', head: true })
          .eq('staff_id', staffId);
          
        // Only add date filters if they are defined
        if (fromDate) {
          countQuery = countQuery.gte('collection_date', fromDate);
        }
        if (toDate) {
          countQuery = countQuery.lte('collection_date', toDate);
        }

        const { count, error: countError } = await countQuery;

        if (countError) throw countError;
        setTotalCollections(count || 0);

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
            farmers (
              full_name,
              id
            )
          `)
          .eq('staff_id', staffId);
          
        // Only add date filters if they are defined
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
        setCollections(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch collections');
        console.error('Error fetching collections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCollections();
  }, [staffId, dateRange, page, pageSize]);

  return { collections, loading, error, totalCollections };
};

export const useApprovedFarmers = () => {
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFarmers = async () => {
      try {
        setLoading(true);
        console.log('useApprovedFarmers: Creating service and fetching data...');
        const service = createStaffDataService(null);
        
        // Clear cache to force fresh data fetch
        service.clearFarmerCache();
        
        const data = await service.getApprovedFarmers();
        console.log('useApprovedFarmers: Data received:', data);
        setFarmers(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch farmers');
        console.error('Error fetching farmers:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFarmers();
  }, []);

  return { farmers, loading, error };
};

export const useStaffPayments = (staffId: string | null, dateRange: 'week' | 'month' | 'all' = 'month') => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchPayments = async () => {
      if (!staffId) return;

      try {
        setLoading(true);
        const service = createStaffDataService(null);
        
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

        const data = await service.getPayments(staffId, fromDate, toDate);
        setPayments(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch payments');
        console.error('Error fetching payments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPayments();
  }, [staffId, dateRange]);

  return { payments, loading, error };
};

export const useQualityTests = (staffId: string | null, dateRange: 'week' | 'month' | 'all' = 'month') => {
  const [qualityTests, setQualityTests] = useState<QualityTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchQualityTests = async () => {
      if (!staffId) return;

      try {
        setLoading(true);
        const service = createStaffDataService(null);
        
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

        const data = await service.getQualityTests(staffId, fromDate, toDate);
        setQualityTests(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch quality tests');
        console.error('Error fetching quality tests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchQualityTests();
  }, [staffId, dateRange]);

  return { qualityTests, loading, error };
};

export const useInventoryData = () => {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInventoryData = async () => {
      try {
        setLoading(true);
        const service = createStaffDataService(null);
        
        // Fetch items and transactions in parallel
        const [itemsData, transactionsData] = await Promise.all([
          service.getInventoryItems(),
          service.getInventoryTransactions()
        ]);
        
        setItems(itemsData);
        setTransactions(transactionsData);
      } catch (err: any) {
        // Handle the case where inventory tables don't exist
        if (err.message && (err.message.includes('inventory_items') || err.message.includes('inventory_transactions'))) {
          // Set empty arrays and no error when tables don't exist
          setItems([]);
          setTransactions([]);
          setError(null); // Don't show error to user when tables don't exist
          console.warn('Inventory tables not found in database. Inventory features will be disabled.');
        } else {
          setError(err.message || 'Failed to fetch inventory data');
          console.error('Error fetching inventory data:', err);
        }
      } finally {
        setLoading(false);
      }
    };

    fetchInventoryData();
  }, []);

  return { items, transactions, loading, error };
};

export const useFarmerRelationshipData = (staffId: string | null) => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRelationshipData = async () => {
      if (!staffId) return;

      try {
        setLoading(true);
        const service = createStaffDataService(null);
        
        // Fetch communications and notes in parallel
        const [communicationsData, notesData] = await Promise.all([
          service.getFarmerCommunications(staffId),
          service.getFarmerNotes(staffId)
        ]);
        
        setCommunications(communicationsData);
        setNotes(notesData);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch relationship data');
        console.error('Error fetching relationship data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchRelationshipData();
  }, [staffId]);

  return { communications, notes, loading, error };
};

export const useFarmerDirectory = () => {
  const [farmers, setFarmers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchFarmerDirectory = async () => {
      try {
        setLoading(true);
        const service = createStaffDataService(null);
        const data = await service.getFarmerDirectory();
        setFarmers(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch farmer directory');
        console.error('Error fetching farmer directory:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchFarmerDirectory();
  }, []);

  return { farmers, loading, error };
};

export const useFarmerCollectionHistory = (farmerId: string | null, limit: number = 10) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCollectionHistory = async () => {
      if (!farmerId) return;

      try {
        setLoading(true);
        const service = createStaffDataService(null);
        const data = await service.getFarmerCollectionHistory(farmerId, limit);
        setCollections(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch collection history');
        console.error('Error fetching collection history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchCollectionHistory();
  }, [farmerId, limit]);

  return { collections, loading, error };
};

// Real-time hooks
export const useRealtimeCollections = (staffId: string | null) => {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffId) return;

    const service = createStaffDataService(null);
    
    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const data = await service.getStaffCollections(staffId);
        setCollections(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch collections');
        console.error('Error fetching collections:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Subscribe to real-time updates
    const subscription = service.subscribeToCollections(staffId, (newCollections) => {
      setCollections(prev => [...newCollections, ...prev]);
    });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [staffId]);

  return { collections, loading, error };
};

export const useRealtimePayments = (staffId: string | null) => {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffId) return;

    const service = createStaffDataService(null);
    
    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const data = await service.getPayments(staffId);
        setPayments(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch payments');
        console.error('Error fetching payments:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Subscribe to real-time updates
    const subscription = service.subscribeToPayments(staffId, (newPayments) => {
      setPayments(prev => [...newPayments, ...prev]);
    });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [staffId]);

  return { payments, loading, error };
};

export const useRealtimeQualityTests = (staffId: string | null) => {
  const [qualityTests, setQualityTests] = useState<QualityTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffId) return;

    const service = createStaffDataService(null);
    
    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const data = await service.getQualityTests(staffId);
        setQualityTests(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch quality tests');
        console.error('Error fetching quality tests:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Subscribe to real-time updates
    const subscription = service.subscribeToQualityTests(staffId, (newTests) => {
      setQualityTests(prev => [...newTests, ...prev]);
    });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [staffId]);

  return { qualityTests, loading, error };
};

export const useRealtimeInventoryTransactions = () => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const service = createStaffDataService(null);
    
    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const data = await service.getInventoryTransactions();
        setTransactions(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch inventory transactions');
        console.error('Error fetching inventory transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Subscribe to real-time updates
    const subscription = service.subscribeToInventoryTransactions((newTransactions) => {
      setTransactions(prev => [...newTransactions, ...prev]);
    });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  return { transactions, loading, error };
};

export const useRealtimeFarmerCommunications = (staffId: string | null) => {
  const [communications, setCommunications] = useState<Communication[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffId) return;

    const service = createStaffDataService(null);
    
    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const data = await service.getFarmerCommunications(staffId);
        setCommunications(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch communications');
        console.error('Error fetching communications:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Subscribe to real-time updates
    const subscription = service.subscribeToFarmerCommunications(staffId, (newCommunications) => {
      setCommunications(prev => [...newCommunications, ...prev]);
    });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [staffId]);

  return { communications, loading, error };
};

export const useRealtimeFarmerNotes = (staffId: string | null) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!staffId) return;

    const service = createStaffDataService(null);
    
    // Fetch initial data
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const data = await service.getFarmerNotes(staffId);
        setNotes(data);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch notes');
        console.error('Error fetching notes:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchInitialData();

    // Subscribe to real-time updates
    const subscription = service.subscribeToFarmerNotes(staffId, (newNotes) => {
      setNotes(prev => [...newNotes, ...prev]);
    });

    // Cleanup subscription on unmount
    return () => {
      supabase.removeChannel(subscription);
    };
  }, [staffId]);

  return { notes, loading, error };
};

export const useInventoryTransactions = (page: number = 1, pageSize: number = 10) => {
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalTransactions, setTotalTransactions] = useState(0);

  useEffect(() => {
    const fetchTransactions = async () => {
      try {
        setLoading(true);
        
        // First get total count
        const { count, error: countError } = await supabase
          .from('inventory_transactions')
          .select('*', { count: 'exact', head: true });

        if (countError) throw countError;
        setTotalTransactions(count || 0);

        // Then fetch paginated data
        const { data, error: dataError } = await supabase
          .from('inventory_transactions')
          .select(`
            *,
            inventory_items (name),
            staff!inventory_transactions_staff_id_fkey (profiles (full_name))
          `)
          .order('created_at', { ascending: false })
          .range((page - 1) * pageSize, page * pageSize - 1);

        if (dataError) throw dataError;
        setTransactions(data || []);
      } catch (err: any) {
        setError(err.message || 'Failed to fetch inventory transactions');
        console.error('Error fetching inventory transactions:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchTransactions();
  }, [page, pageSize]);

  return { transactions, loading, error, totalTransactions };
};