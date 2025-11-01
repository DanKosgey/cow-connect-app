import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { AgrovetService, AgrovetInventory, AgrovetPurchase } from '@/services/agrovet-service';
import { CreditService } from '@/services/credit-service';

// Define interfaces for our data structures
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

interface AgrovetProduct {
  id: string;
  name: string;
  description: string;
  category: string;
  unit: string;
  selling_price: number;
  current_stock: number;
  is_credit_eligible: boolean;
}

interface CreditRequest {
  id: string;
  farmer_id: string;
  product_id: string;
  quantity: number;
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
  product_name: string;
  unit_price: number;
  approved_by?: string;
  approved_at?: string;
  rejection_reason?: string;
}

// Cache keys for different data types
export const INVENTORY_CACHE_KEYS = {
  INVENTORY_ITEMS: 'inventory-items',
  INVENTORY_TRANSACTIONS: 'inventory-transactions',
  AGROVET_INVENTORY: 'agrovet-inventory',
  AGROVET_PURCHASES: 'agrovet-purchases',
  CREDIT_REQUESTS: 'credit-requests'
};

// Main hook for Inventory/Agrovet data
export const useInventoryData = () => {
  const queryClient = useQueryClient();

  // Get inventory items
  const useInventoryItems = () => {
    return useQuery<InventoryItem[]>({
      queryKey: [INVENTORY_CACHE_KEYS.INVENTORY_ITEMS],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('inventory_items')
          .select('*')
          .order('name');

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get inventory transactions
  const useInventoryTransactions = () => {
    return useQuery<InventoryTransaction[]>({
      queryKey: [INVENTORY_CACHE_KEYS.INVENTORY_TRANSACTIONS],
      queryFn: async () => {
        const { data, error } = await supabase
          .from('inventory_transactions')
          .select(`
            *,
            inventory_items (name),
            staff!inventory_transactions_staff_id_fkey (profiles (full_name))
          `)
          .order('created_at', { ascending: false })
          .limit(50);

        if (error) throw error;
        return data || [];
      },
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get agrovet inventory
  const useAgrovetInventory = () => {
    return useQuery<AgrovetProduct[]>({
      queryKey: [INVENTORY_CACHE_KEYS.AGROVET_INVENTORY],
      queryFn: () => AgrovetService.getInventory(),
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get agrovet purchase history for a farmer
  const useAgrovetPurchaseHistory = (farmerId: string) => {
    return useQuery<AgrovetPurchase[]>({
      queryKey: [INVENTORY_CACHE_KEYS.AGROVET_PURCHASES, farmerId],
      queryFn: () => AgrovetService.getPurchaseHistory(farmerId),
      enabled: !!farmerId,
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Get credit requests for a farmer
  const useCreditRequests = (farmerId: string) => {
    return useQuery<CreditRequest[]>({
      queryKey: [INVENTORY_CACHE_KEYS.CREDIT_REQUESTS, farmerId],
      queryFn: async () => {
        if (!farmerId) return [];

        const { data, error } = await supabase
          .from('credit_requests')
          .select('*')
          .eq('farmer_id', farmerId)
          .order('created_at', { ascending: false });

        if (error) throw error;
        return data || [];
      },
      enabled: !!farmerId,
      staleTime: 1000 * 60 * 3, // 3 minutes
      gcTime: 1000 * 60 * 15, // 15 minutes
    });
  };

  // Add inventory item
  const addInventoryItemMutation = useMutation({
    mutationFn: async (itemData: Omit<InventoryItem, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .insert([itemData])
        .select();

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    onSuccess: () => {
      // Invalidate inventory items cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.INVENTORY_ITEMS] });
    }
  });

  // Update inventory item
  const updateInventoryItemMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<InventoryItem> }) => {
      const { data, error } = await supabase
        .from('inventory_items')
        .update(updates)
        .eq('id', id)
        .select();

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    onSuccess: () => {
      // Invalidate inventory items cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.INVENTORY_ITEMS] });
    }
  });

  // Delete inventory item
  const deleteInventoryItemMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('inventory_items')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate inventory items cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.INVENTORY_ITEMS] });
    }
  });

  // Add inventory transaction
  const addInventoryTransactionMutation = useMutation({
    mutationFn: async (transactionData: Omit<InventoryTransaction, 'id' | 'created_at'>) => {
      const { data, error } = await supabase
        .from('inventory_transactions')
        .insert([transactionData])
        .select();

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    onSuccess: () => {
      // Invalidate inventory transactions cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.INVENTORY_TRANSACTIONS] });
      // Also invalidate inventory items as transactions affect stock levels
      queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.INVENTORY_ITEMS] });
    }
  });

  // Create agrovet purchase
  const createAgrovetPurchaseMutation = useMutation({
    mutationFn: async ({ 
      farmerId, 
      itemId, 
      quantity, 
      paymentMethod, 
      purchasedBy 
    }: { 
      farmerId: string; 
      itemId: string; 
      quantity: number; 
      paymentMethod: 'cash' | 'credit'; 
      purchasedBy?: string; 
    }) => {
      return AgrovetService.createPurchase(farmerId, itemId, quantity, paymentMethod, purchasedBy);
    },
    onSuccess: () => {
      // Invalidate agrovet purchases cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.AGROVET_PURCHASES] });
      // Also invalidate agrovet inventory as purchases affect stock levels
      queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.AGROVET_INVENTORY] });
    }
  });

  // Create credit request
  const createCreditRequestMutation = useMutation({
    mutationFn: async ({ 
      farmerId, 
      productId, 
      quantity, 
      productName, 
      unitPrice 
    }: { 
      farmerId: string; 
      productId: string; 
      quantity: number; 
      productName: string; 
      unitPrice: number; 
    }) => {
      const { data, error } = await supabase
        .from('credit_requests')
        .insert([{
          farmer_id: farmerId,
          product_id: productId,
          quantity: quantity,
          total_amount: quantity * unitPrice,
          status: 'pending',
          product_name: productName,
          unit_price: unitPrice
        }])
        .select();

      if (error) throw error;
      return data && data.length > 0 ? data[0] : null;
    },
    onSuccess: () => {
      // Invalidate credit requests cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.CREDIT_REQUESTS] });
    }
  });

  // Cancel credit request
  const cancelCreditRequestMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('credit_requests')
        .delete()
        .eq('id', requestId);

      if (error) throw error;
    },
    onSuccess: () => {
      // Invalidate credit requests cache to refresh the data
      queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.CREDIT_REQUESTS] });
    }
  });

  // Mutation to invalidate all inventory caches
  const invalidateInventoryCache = () => {
    queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.INVENTORY_ITEMS] });
    queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.INVENTORY_TRANSACTIONS] });
    queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.AGROVET_INVENTORY] });
    queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.AGROVET_PURCHASES] });
    queryClient.invalidateQueries({ queryKey: [INVENTORY_CACHE_KEYS.CREDIT_REQUESTS] });
  };

  return {
    useInventoryItems,
    useInventoryTransactions,
    useAgrovetInventory,
    useAgrovetPurchaseHistory,
    useCreditRequests,
    addInventoryItem: addInventoryItemMutation,
    updateInventoryItem: updateInventoryItemMutation,
    deleteInventoryItem: deleteInventoryItemMutation,
    addInventoryTransaction: addInventoryTransactionMutation,
    createAgrovetPurchase: createAgrovetPurchaseMutation,
    createCreditRequest: createCreditRequestMutation,
    cancelCreditRequest: cancelCreditRequestMutation,
    invalidateInventoryCache
  };
};