import { useEffect, useState, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useNotification } from '@/contexts/NotificationContext';

interface MarketPrice {
  id: string;
  product: string;
  region: string;
  price: number;
  previous_price: number;
  change: number;
  change_percent: number;
  updated_at: string;
}

export function useRealtimeMarketPrices() {
  const [prices, setPrices] = useState<MarketPrice[]>([]);
  const [latestPrice, setLatestPrice] = useState<MarketPrice | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { addNotification } = useNotification();

  // Memoize the fetch function to prevent unnecessary re-renders
  const fetchInitialPrices = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('market_prices')
        .select('*')
        .order('updated_at', { ascending: false })
        .limit(20);
      
      if (error) {
        console.error('Error fetching market prices:', error);
        setError(error.message);
        // Don't throw the error to prevent breaking the UI
        setPrices([]);
        return;
      }
      
      setPrices(data || []);
      setError(null);
    } catch (err) {
      console.error('Unexpected error fetching market prices:', err);
      setError('Failed to fetch market prices');
      setPrices([]);
    }
  }, []);

  useEffect(() => {
    fetchInitialPrices();

    // Subscribe to market price changes
    const subscription = supabase
      .channel('market_prices_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'market_prices',
        },
        (payload) => {
          const newPrice = payload.new as MarketPrice;
          setPrices((current) => [newPrice, ...current.slice(0, 19)]);
          setLatestPrice(newPrice);
          
          // Show notification for significant price changes
          if (Math.abs(newPrice.change_percent) > 5) {
            addNotification({
              type: newPrice.change_percent > 0 ? 'success' : 'warning',
              title: 'Significant Price Change',
              message: `${newPrice.product} price in ${newPrice.region} has ${newPrice.change_percent > 0 ? 'increased' : 'decreased'} by ${Math.abs(newPrice.change_percent).toFixed(2)}%`,
              autoDismiss: true,
            });
          }
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'market_prices',
        },
        (payload) => {
          const updatedPrice = payload.new as MarketPrice;
          setPrices((current) => 
            current.map(price => 
              price.id === updatedPrice.id ? updatedPrice : price
            )
          );
          setLatestPrice(updatedPrice);
          
          // Show notification for significant price changes
          if (Math.abs(updatedPrice.change_percent) > 5) {
            addNotification({
              type: updatedPrice.change_percent > 0 ? 'success' : 'warning',
              title: 'Significant Price Change',
              message: `${updatedPrice.product} price in ${updatedPrice.region} has ${updatedPrice.change_percent > 0 ? 'increased' : 'decreased'} by ${Math.abs(updatedPrice.change_percent).toFixed(2)}%`,
              autoDismiss: true,
            });
          }
        }
      )
      .subscribe();

    // Cleanup subscription
    return () => {
      subscription.unsubscribe();
    };
  }, [fetchInitialPrices, addNotification]);

  return { prices, latestPrice, error };
}