import { useState, useEffect } from 'react';
import { milkRateService } from '@/services/milk-rate-service';
import { TrendingUp, TrendingDown } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export const MarketPriceDisplay = () => {
  const [marketPrice, setMarketPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAdminRate = async () => {
      try {
        setLoading(true);
        const rate = await milkRateService.getCurrentRate();
        setMarketPrice(rate);
        // No change data for admin rate, so set to null
        setPriceChange(null);
      } catch (error) {
        console.error('Error fetching admin rate:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchAdminRate();
    
    // Refresh every 5 minutes
    const interval = setInterval(fetchAdminRate, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-10 w-32">
        <div className="animate-pulse bg-gray-200 rounded h-4 w-24"></div>
      </div>
    );
  }

  if (marketPrice === null) {
    return null;
  }

  return (
    <Card className="bg-primary/5 border-0 shadow-none">
      <CardContent className="p-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Admin Rate:</span>
          <span className="text-sm font-bold">KSh {marketPrice.toFixed(2)}</span>
        </div>
      </CardContent>
    </Card>
  );
};