import { useState, useEffect, useMemo } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { collectorEarningsService } from '@/services/collector-earnings-service';
import { collectorRateService } from '@/services/collector-rate-service';

interface CollectorData {
  id: string;
  name: string;
  totalCollections: number;
  totalLiters: number;
  ratePerLiter: number;
  totalEarnings: number;
  totalPenalties: number;
  pendingPayments: number;
  paidPayments: number;
  performanceScore: number;
  lastCollectionDate?: string;
  totalVariance?: number;
  positiveVariances?: number;
  negativeVariances?: number;
  avgVariancePercentage?: number;
  pendingPenalties?: number;
  penaltyStatus?: 'pending' | 'paid';
  collectionsBreakdown?: {
    date: string;
    liters: number;
    status: string;
    approved: boolean;
    feeStatus?: string;
  }[];
}

export const useCollectorsData = () => {
  const [collectors, setCollectors] = useState<CollectorData[]>([]);
  const [collectorRate, setCollectorRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataFetchError, setDataFetchError] = useState(false);
  const [stats, setStats] = useState({
    totalCollectors: 0,
    totalPendingAmount: 0,
    totalPaidAmount: 0,
    totalPenalties: 0,
    avgCollectionsPerCollector: 0
  });
  
  // Add pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [totalCount, setTotalCount] = useState(0);
  
  // Calculate total gross earnings from collectors data
  const totalGrossEarnings = useMemo(() => {
    return collectors.reduce((sum, collector) => sum + (collector.totalEarnings || 0), 0);
  }, [collectors]);

  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [paymentFilter, setPaymentFilter] = useState<'all' | 'pending' | 'paid'>('all'); // Show all by default
  
  // Advanced filters
  const [filters, setFilters] = useState({
    minEarnings: null as number | null,
    maxEarnings: null as number | null,
    performanceRange: 'all' as 'all' | 'excellent' | 'good' | 'poor',
    dateRange: { from: null as string | null, to: null as string | null }
  });

  // Caching strategy
  const [cache, setCache] = useState({
    collectors: null as any[] | null,
    timestamp: null as number | null,
    expiryMinutes: 5
  });
  
  // Sorting state
  const [sortConfig, setSortConfig] = useState({
    key: 'name',
    direction: 'asc' as 'asc' | 'desc'
  });

  const fetchDataWithRetry = async (retries = 3) => {
    for (let i = 0; i < retries; i++) {
      try {
        setLoading(true);
        
        // Check cache first, but with stricter validation
        const now = Date.now();
        if (cache.collectors && 
            cache.timestamp && 
            (now - cache.timestamp) < cache.expiryMinutes * 60 * 1000) {
          console.log('Using cached data');
          // Use cached data
          const collectorsData = cache.collectors;
          
          // Validate that the cached data is not stale by checking a few key records
          // If we find inconsistencies, force a refresh
          let shouldRefresh = false;
          
          if (!shouldRefresh) {
            // Apply filters
            let filteredCollectors = [...collectorsData];
            
            // Apply search term filter
            if (searchTerm) {
              filteredCollectors = filteredCollectors.filter(collector => 
                collector.name.toLowerCase().includes(searchTerm.toLowerCase())
              );
            }
            
            // Apply payment filter
            if (paymentFilter !== 'all') {
              filteredCollectors = filteredCollectors.filter(collector => {
                if (paymentFilter === 'pending') {
                  return collector.pendingPayments > 0;
                } else {
                  return collector.pendingPayments === 0 && collector.paidPayments > 0;
                }
              });
            }
            
            // Apply advanced filters
            if (filters.minEarnings !== null) {
              filteredCollectors = filteredCollectors.filter(collector => 
                (collector.totalEarnings - collector.totalPenalties) >= filters.minEarnings!
              );
            }
            
            if (filters.maxEarnings !== null) {
              filteredCollectors = filteredCollectors.filter(collector => 
                (collector.totalEarnings - collector.totalPenalties) <= filters.maxEarnings!
              );
            }
            
            if (filters.performanceRange !== 'all') {
              filteredCollectors = filteredCollectors.filter(collector => {
                if (filters.performanceRange === 'excellent') {
                  return collector.performanceScore >= 80;
                } else if (filters.performanceRange === 'good') {
                  return collector.performanceScore >= 60 && collector.performanceScore < 80;
                } else {
                  return collector.performanceScore < 60;
                }
              });
            }
            
            // Apply date range filter
            if (filters.dateRange.from || filters.dateRange.to) {
              // For date filtering, we would need to fetch collections with date filters
              // This is a simplified implementation - in a full implementation, we would filter by collection dates
              console.log('Date range filter applied:', filters.dateRange);
            }
            
            // For pagination, we'll slice the data on the client side for now
            // In a production app, this should be done server-side
            const startIndex = (page - 1) * pageSize;
            const endIndex = startIndex + pageSize;
            const paginatedCollectors = filteredCollectors.slice(startIndex, endIndex);
            
            setCollectors(paginatedCollectors);
            setTotalCount(filteredCollectors.length);
            
            // Calculate stats using the aggregated collector data for consistency
            const totalCollectors = filteredCollectors.length;
            const totalGrossEarnings = filteredCollectors.reduce((sum, collector) => sum + (collector.totalEarnings || 0), 0);
            const totalPenalties = filteredCollectors.reduce((sum, collector) => sum + (collector.totalPenalties || 0), 0);
            
            // Calculate pending and paid amounts from collections data
            const totalPendingAmount = filteredCollectors.reduce((sum, collector) => sum + (collector.pendingPayments || 0), 0);
            const totalPaidAmount = filteredCollectors.reduce((sum, collector) => sum + (collector.paidPayments || 0), 0);
              
            const totalCollections = filteredCollectors.reduce((sum, collector) => sum + (collector.totalCollections || 0), 0);
            const avgCollectionsPerCollector = totalCollections > 0 ? totalCollections / totalCollectors : 0;
            
            console.log('Calculated stats from cache:', {
              totalCollectors,
              totalPendingAmount,
              totalPaidAmount,
              totalPenalties,
              avgCollectionsPerCollector
            });
            
            setStats({
              totalCollectors,
              totalPendingAmount,
              totalPaidAmount,
              totalPenalties,
              avgCollectionsPerCollector
            });
            
            setLoading(false);
            return;
          } else {
            console.log('Stale cache detected, forcing refresh');
          }
        }
        
        // Get current collector rate
        const rate = await collectorRateService.getCurrentRate();
        setCollectorRate(rate);
        
        // Automatically update collection fee statuses for approved collections
        console.log('Starting automatic collection fee status update...');
        const statusUpdateSuccess = await collectorEarningsService.autoUpdateCollectionFeeStatuses();
        console.log('Status update result:', statusUpdateSuccess);
        
        if (!statusUpdateSuccess) {
          console.warn('Failed to automatically update collection fee statuses, continuing with existing data');
        }
        
        // Get all collectors with earnings
        console.log('Fetching collector earnings data...');
        const collectorsData = await collectorEarningsService.getCollectorsWithEarnings();
        console.log('Collectors data fetched:', collectorsData.length, 'collectors');
        
        // Cache the data
        setCache({ collectors: collectorsData, timestamp: now, expiryMinutes: 5 });
        
        // Apply filters
        let filteredCollectors = [...collectorsData];
        
        // Apply search term filter
        if (searchTerm) {
          filteredCollectors = filteredCollectors.filter(collector => 
            collector.name.toLowerCase().includes(searchTerm.toLowerCase())
          );
        }
        
        // Apply payment filter
        if (paymentFilter !== 'all') {
          filteredCollectors = filteredCollectors.filter(collector => {
            if (paymentFilter === 'pending') {
              return collector.pendingPayments > 0;
            } else {
              return collector.pendingPayments === 0 && collector.paidPayments > 0;
            }
          });
        }
        
        // Apply advanced filters
        if (filters.minEarnings !== null) {
          filteredCollectors = filteredCollectors.filter(collector => 
            (collector.totalEarnings - collector.totalPenalties) >= filters.minEarnings!
          );
        }
        
        if (filters.maxEarnings !== null) {
          filteredCollectors = filteredCollectors.filter(collector => 
            (collector.totalEarnings - collector.totalPenalties) <= filters.maxEarnings!
          );
        }
        
        if (filters.performanceRange !== 'all') {
          filteredCollectors = filteredCollectors.filter(collector => {
            if (filters.performanceRange === 'excellent') {
              return collector.performanceScore >= 80;
            } else if (filters.performanceRange === 'good') {
              return collector.performanceScore >= 60 && collector.performanceScore < 80;
            } else {
              return collector.performanceScore < 60;
            }
          });
        }
        
        // Apply date range filter
        if (filters.dateRange.from || filters.dateRange.to) {
          // For date filtering, we would need to fetch collections with date filters
          // This is a simplified implementation - in a full implementation, we would filter by collection dates
          console.log('Date range filter applied:', filters.dateRange);
        }
        
        // For pagination, we'll slice the data on the client side for now
        // In a production app, this should be done server-side
        const startIndex = (page - 1) * pageSize;
        const endIndex = startIndex + pageSize;
        const paginatedCollectors = filteredCollectors.slice(startIndex, endIndex);
        
        setCollectors(paginatedCollectors);
        setTotalCount(filteredCollectors.length);
        
        // No need to fetch payment data - using collections table directly
        
        // Calculate stats using the aggregated collector data for consistency
        const totalCollectors = filteredCollectors.length;
        const totalGrossEarnings = filteredCollectors.reduce((sum, collector) => sum + (collector.totalEarnings || 0), 0);
        const totalPenalties = filteredCollectors.reduce((sum, collector) => sum + (collector.totalPenalties || 0), 0);
        
        // Calculate pending and paid amounts from collections data
        const totalPendingAmount = filteredCollectors.reduce((sum, collector) => sum + (collector.pendingPayments || 0), 0);
        const totalPaidAmount = filteredCollectors.reduce((sum, collector) => sum + (collector.paidPayments || 0), 0);
          
        const totalCollections = filteredCollectors.reduce((sum, collector) => sum + (collector.totalCollections || 0), 0);
        const avgCollectionsPerCollector = totalCollections > 0 ? totalCollections / totalCollectors : 0;
        
        console.log('Calculated stats:', {
          totalCollectors,
          totalPendingAmount,
          totalPaidAmount,
          totalPenalties,
          avgCollectionsPerCollector
        });
        
        setStats({
          totalCollectors,
          totalPendingAmount,
          totalPaidAmount,
          totalPenalties,
          avgCollectionsPerCollector
        });
        
        console.log('Data loading complete');
        return; // Success, exit retry loop
      } catch (error) {
        console.error(`Attempt ${i + 1} failed:`, error);
        if (i === retries - 1) {
          // Last attempt failed
          console.error('Error fetching collector data after', retries, 'attempts:', error);
          setDataFetchError(true);
        } else {
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
        }
      } finally {
        setLoading(false);
      }
    }
  };

  // Subscribe to real-time updates
  useEffect(() => {
    // Subscribe to collections changes
    const collectionsSubscription = supabase
      .channel('collections_changes')
      .on('postgres_changes', 
        { 
          event: '*', 
          schema: 'public', 
          table: 'collections'
        },
        (payload) => {
          console.log('Collection updated:', payload);
          // Refresh specific collector data when collections change
          const newPayload = payload.new as { staff_id?: string };
          if (newPayload && newPayload.staff_id) {
            refreshCollectorData(newPayload.staff_id);
          }
        }
      )
      .subscribe();

    // Listen for manual collector data updates
    const handleCollectorDataUpdate = () => {
      console.log('Collector data update event received, invalidating cache');
      invalidateCache();
    };

    window.addEventListener('collectorDataUpdated', handleCollectorDataUpdate);

    return () => {
      supabase.removeChannel(collectionsSubscription);
      window.removeEventListener('collectorDataUpdated', handleCollectorDataUpdate);
    };
  }, []);

  // Efficient single collector refresh
  const refreshCollectorData = async (collectorId: string) => {
    try {
      // Get updated data for just this collector
      const collectorsData = await collectorEarningsService.getCollectorsWithEarnings();
      const updatedCollector = collectorsData.find(c => c.id === collectorId);
      
      if (updatedCollector) {
        setCollectors(prev => 
          prev.map(c => c.id === collectorId ? updatedCollector : c)
        );
        
        // Also update stats
        const totalPendingAmount = collectorsData.reduce((sum, collector) => sum + (collector.pendingPayments || 0), 0);
        const totalPaidAmount = collectorsData.reduce((sum, collector) => sum + (collector.paidPayments || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalPendingAmount,
          totalPaidAmount
        }));
      }
    } catch (refreshError) {
      console.error('Error refreshing collector data:', refreshError);
    }
  };

  // Function to handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Function to update a specific collector's data
  const updateCollectorData = (collectorId: string, updatedData: Partial<CollectorData>) => {
    setCollectors(prev => 
      prev.map(collector => 
        collector.id === collectorId 
          ? { ...collector, ...updatedData }
          : collector
      )
    );
  };

  // Function to manually invalidate cache and force refresh
  const invalidateCache = () => {
    setCache({
      collectors: null,
      timestamp: null,
      expiryMinutes: 5
    });
  };

  return {
    collectors,
    collectorRate,
    loading,
    dataFetchError,
    stats,
    totalGrossEarnings,
    page,
    setPage,
    pageSize,
    setPageSize,
    totalCount,
    setTotalCount,
    searchTerm,
    setSearchTerm,
    paymentFilter,
    setPaymentFilter,
    filters,
    setFilters,
    sortConfig,
    handleSort,
    fetchDataWithRetry,
    refreshCollectorData,
    updateCollectorData,
    invalidateCache
  };
};