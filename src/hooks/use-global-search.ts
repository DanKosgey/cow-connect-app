import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface GlobalSearchResult {
  id: string;
  type: 'farmer' | 'product' | 'credit_request' | 'transaction';
  title: string;
  description: string;
  url: string;
}

export const useGlobalSearch = () => {
  const [searchResults, setSearchResults] = useState<GlobalSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const search = useCallback(async (query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Search farmers
      const { data: farmers, error: farmersError } = await supabase
        .from('farmers')
        .select('id, profiles:user_id(full_name, phone)')
        .ilike('profiles.full_name', `%${query}%`)
        .limit(5);

      if (farmersError) throw farmersError;

      // Search products
      const { data: products, error: productsError } = await supabase
        .from('agrovet_inventory')
        .select('id, name, category')
        .ilike('name', `%${query}%`)
        .limit(5);

      if (productsError) throw productsError;

      // Search credit requests
      const { data: creditRequests, error: requestsError } = await supabase
        .from('credit_requests')
        .select('id, farmer_id, product_name, total_amount, status')
        .or(`product_name.ilike.%${query}%,status.ilike.%${query}%`)
        .limit(5);

      if (requestsError) throw requestsError;

      // Search transactions
      const { data: transactions, error: transactionsError } = await supabase
        .from('credit_transactions')
        .select('id, transaction_type, amount, description')
        .or(`transaction_type.ilike.%${query}%,description.ilike.%${query}%`)
        .limit(5);

      if (transactionsError) throw transactionsError;

      // Transform results
      const results: GlobalSearchResult[] = [];

      // Add farmers
      farmers?.forEach(farmer => {
        results.push({
          id: farmer.id,
          type: 'farmer',
          title: farmer.profiles?.full_name || 'Unknown Farmer',
          description: farmer.profiles?.phone || 'No phone',
          url: `/creditor/farmer-profiles/${farmer.id}`
        });
      });

      // Add products
      products?.forEach(product => {
        results.push({
          id: product.id,
          type: 'product',
          title: product.name,
          description: product.category || 'No category',
          url: `/creditor/product-management`
        });
      });

      // Add credit requests
      creditRequests?.forEach(request => {
        results.push({
          id: request.id,
          type: 'credit_request',
          title: request.product_name || 'Unknown Product',
          description: `Amount: ${request.total_amount}, Status: ${request.status}`,
          url: `/creditor/credit-management`
        });
      });

      // Add transactions
      transactions?.forEach(transaction => {
        results.push({
          id: transaction.id,
          type: 'transaction',
          title: transaction.transaction_type,
          description: transaction.description || `Amount: ${transaction.amount}`,
          url: `/creditor/payment-tracking`
        });
      });

      setSearchResults(results);
    } catch (err) {
      console.error('Global search error:', err);
      setError('Failed to perform search');
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    searchResults,
    loading,
    error,
    search
  };
};