import React from 'react';
import { useState, useEffect, useMemo, Fragment } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Pagination, PaginationContent, PaginationItem, PaginationLink, PaginationNext, PaginationPrevious } from '@/components/ui/pagination';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { 
  Users, 
  DollarSign, 
  TrendingUp, 
  Clock,
  CheckCircle,
  BarChart3,
  PieChart,
  FileText,
  Search,
  ArrowUpDown,
  Download,
  AlertTriangle,
  FileBarChart,
  ChevronRightIcon,
  ChevronDownIcon,
  ListIcon,
  Loader2Icon,
  Calendar as CalendarIcon
} from 'lucide-react';
import { formatCurrency } from '@/utils/formatters';
import { subMonths } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { collectorEarningsService } from '@/services/collector-earnings-service';
import { collectorRateService } from '@/services/collector-rate-service';
import { collectorPenaltyService } from '@/services/collector-penalty-service';
import useToastNotifications from '@/hooks/useToastNotifications';
import FixPaymentRecordsButton from '@/components/admin/FixPaymentRecordsButton';

// Add recharts imports for the dual-axis chart
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart as RechartsPieChart,
  Pie,
  Cell
} from 'recharts';

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
  // Add penalty account information
  pendingPenalties?: number;
  totalPenaltiesIncurred?: number;
  totalPenaltiesPaid?: number;
  // Add collections breakdown data
  collectionsBreakdown?: {
    date: string;
    liters: number;
    status: string;
    approved: boolean;
    feeStatus?: string;
  }[];
}

// PaymentData interface removed - using collections table directly

// Add new interfaces for penalty analytics
interface PenaltyAnalyticsData {
  overallPenaltyStats: {
    totalPenalties: number;
    avgPenaltyPerCollector: number;
    highestPenaltyCollector: string;
    highestPenaltyAmount: number;
  };
  collectorPenaltyData: CollectorPenaltyAnalytics[];
}

interface CollectorPenaltyAnalytics {
  collectorId: string;
  collectorName: string;
  totalPenalties: number;
  pendingPenalties: number;
  paidPenalties: number;
  penaltyBreakdown: {
    positiveVariancePenalties: number;
    negativeVariancePenalties: number;
    totalPositiveVariances: number;
    totalNegativeVariances: number;
  };
  recentPenalties: any[];
  penaltyTrend: {
    date: string;
    penalties: number;
  }[];
}

export default function CollectorsPage() {
  const { success, error: showError } = useToastNotifications();
  const [collectors, setCollectors] = useState<CollectorData[]>([]);
  // payments state removed - using collections table directly
  const payments: any[] = [];
  const setPayments: any = () => {};
  const [collectorRate, setCollectorRate] = useState(0);
  const [loading, setLoading] = useState(true);
  const [dataFetchError, setDataFetchError] = useState(false);
  const [activeTab, setActiveTab] = useState<'payments' | 'analytics' | 'penalty-analytics'>('payments');
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

  // Add state for penalty analytics data
  const [penaltyAnalytics, setPenaltyAnalytics] = useState<PenaltyAnalyticsData | null>(null);
  const [penaltyAnalyticsLoading, setPenaltyAnalyticsLoading] = useState(false);
  
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
  
  // Payment history modal state
  const [selectedCollector, setSelectedCollector] = useState<CollectorData | null>(null);
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    const fetchDataWithRetry = async (retries = 3) => {
      for (let i = 0; i < retries; i++) {
        try {
          setLoading(true);
          
          // Check cache first
          const now = Date.now();
          if (cache.collectors && 
              cache.timestamp && 
              (now - cache.timestamp) < cache.expiryMinutes * 60 * 1000) {
            console.log('Using cached data');
            // Use cached data
            const collectorsData = cache.collectors;
            
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
            const avgCollectionsPerCollector = totalCollectors > 0 ? totalCollections / totalCollectors : 0;
            
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
          const avgCollectionsPerCollector = totalCollectors > 0 ? totalCollections / totalCollectors : 0;
          
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
            // Use the error function from useToastNotifications hook
            try {
              showError('Error', `Failed to fetch collector data after ${retries} attempts`);
            } catch (toastError) {
              console.error('Error showing toast notification:', toastError);
              // Fallback to alert if toast fails
              alert(`Error: Failed to fetch collector data after ${retries} attempts`);
            }
          } else {
            // Wait before retrying
            await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
          }
        } finally {
          setLoading(false);
        }
      }
    };
    
    // Wrapper function to maintain existing API
    const fetchData = async () => {
      await fetchDataWithRetry();
    };
    
    fetchDataWithRetry();
  }, [page, pageSize, searchTerm, paymentFilter, filters]);
  
  // Fetch penalty analytics when the penalty analytics tab is selected
  useEffect(() => {
    const fetchPenaltyAnalytics = async () => {
      if (activeTab === 'penalty-analytics' && !penaltyAnalytics) {
        try {
          setPenaltyAnalyticsLoading(true);
          const analyticsData = await collectorPenaltyService.getPenaltyAnalytics();
          setPenaltyAnalytics(analyticsData);
        } catch (error) {
          console.error('Error fetching penalty analytics:', error);
          showError('Error', 'Failed to fetch penalty analytics data');
        } finally {
          setPenaltyAnalyticsLoading(false);
        }
      }
    };
    
    fetchPenaltyAnalytics();
  }, [activeTab, penaltyAnalytics]);

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

    return () => {
      supabase.removeChannel(collectionsSubscription);
    };
  }, []);
  
  // Memoized filtered payments - removed as we're using collections directly

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

  // Function to mark all pending collections for a collector as paid
  const handleMarkAsPaid = async (collectorId: string, collectorName: string) => {
    try {
      // Mark all pending collections for this collector as paid
      const successResult = await collectorEarningsService.markCollectionsAsPaid(collectorId);
      
      if (successResult) {
        // Refresh the collectors data to update the UI
        const collectorsData = await collectorEarningsService.getCollectorsWithEarnings();
        setCollectors(collectorsData);
        
        // Recalculate stats
        const totalPendingAmount = collectorsData.reduce((sum, collector) => sum + (collector.pendingPayments || 0), 0);
        const totalPaidAmount = collectorsData.reduce((sum, collector) => sum + (collector.paidPayments || 0), 0);
        
        setStats(prev => ({
          ...prev,
          totalPendingAmount,
          totalPaidAmount
        }));
        
        success('Success', `All pending collections for ${collectorName} marked as paid`);
        // Clear cache after operation
        clearCache();
      } else {
        throw new Error('Failed to mark collections as paid');
      }
    } catch (markAsPaidError) {
      console.error('Error marking collections as paid:', markAsPaidError);
      // Use the error function from useToastNotifications hook
      try {
        showError('Error', 'Failed to mark collections as paid');
      } catch (toastError) {
        console.error('Error showing toast notification:', toastError);
        // Fallback to alert if toast fails
        alert('Error: Failed to mark collections as paid');
      }
    }
  };

  // Function to clear cache
  const clearCache = () => {
    setCache({
      collectors: null,
      timestamp: null,
      expiryMinutes: 5
    });
  };

  // Function to handle sorting
  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Function to fetch payment history for a collector
  const fetchPaymentHistory = async (collectorId: string) => {
    try {
      setHistoryLoading(true);
      const { data, error: supabaseError } = await supabase
        .from('collections')
        .select(`
          id,
          collection_date,
          liters,
          total_amount,
          collection_fee_status,
          status,
          approved_for_payment
        `)
        .eq('staff_id', collectorId)
        .order('collection_date', { ascending: false });
        
      if (supabaseError) {
        throw supabaseError;
      }
      
      setPaymentHistory(data || []);
    } catch (fetchError) {
      console.error('Error fetching payment history:', fetchError);
      // Use the error function from useToastNotifications hook
      try {
        showError('Error', 'Failed to fetch payment history');
      } catch (toastError) {
        console.error('Error showing toast notification:', toastError);
        // Fallback to alert if toast fails
        alert('Error: Failed to fetch payment history');
      }
      setPaymentHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Function to show payment history modal
  const showPaymentHistory = async (collector: CollectorData) => {
    setSelectedCollector(collector);
    setShowHistoryModal(true);
    await fetchPaymentHistory(collector.id);
  };

  // Memoized sorted collectors
  const sortedCollectors = useMemo(() => {
    const sortableCollectors = [...collectors];
    if (sortConfig.key) {
      sortableCollectors.sort((a, b) => {
        // Special handling for nested properties
        let aValue, bValue;
        
        switch (sortConfig.key) {
          case 'name':
            aValue = a.name?.toLowerCase() || '';
            bValue = b.name?.toLowerCase() || '';
            break;
          case 'performanceScore':
            aValue = a.performanceScore || 0;
            bValue = b.performanceScore || 0;
            break;
          case 'totalEarnings':
            aValue = (a.totalEarnings - a.totalPenalties) || 0;
            bValue = (b.totalEarnings - b.totalPenalties) || 0;
            break;
          case 'pendingPayments':
            aValue = a.pendingPayments || 0;
            bValue = b.pendingPayments || 0;
            break;
          case 'totalCollections':
            aValue = a.totalCollections || 0;
            bValue = b.totalCollections || 0;
            break;
          case 'totalLiters':
            aValue = a.totalLiters || 0;
            bValue = b.totalLiters || 0;
            break;
          default:
            aValue = a[sortConfig.key as keyof CollectorData];
            bValue = b[sortConfig.key as keyof CollectorData];
        }
        
        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableCollectors;
  }, [collectors, sortConfig]);

  // Function to handle bulk mark as paid with progress tracking
  const handleBulkMarkAsPaid = async () => {
    const pendingCollectors = collectors.filter(c => c.pendingPayments > 0);
    
    if (pendingCollectors.length === 0) {
      showError('Error', 'No collectors with pending payments found');
      return;
    }
    
    if (!window.confirm(`Are you sure you want to mark all pending collections as paid for ${pendingCollectors.length} collectors?`)) {
      return;
    }

    setProcessing(true);
    setProgress(0);
    
    try {
      for (let i = 0; i < pendingCollectors.length; i++) {
        await collectorEarningsService.markCollectionsAsPaid(
          pendingCollectors[i].id
        );
        setProgress(((i + 1) / pendingCollectors.length) * 100);
      }
      
      // Refresh data after all operations complete
      const collectorsData = await collectorEarningsService.getCollectorsWithEarnings();
      setCollectors(collectorsData);
      
      // Recalculate stats
      const totalPendingAmount = collectorsData.reduce((sum, collector) => sum + (collector.pendingPayments || 0), 0);
      const totalPaidAmount = collectorsData.reduce((sum, collector) => sum + (collector.paidPayments || 0), 0);
      
      setStats(prev => ({
        ...prev,
        totalPendingAmount,
        totalPaidAmount
      }));
      
      success('Success', `All pending collections marked as paid for ${pendingCollectors.length} collectors`);
      // Clear cache after bulk operation
      clearCache();
    } catch (bulkError) {
      console.error('Error in bulk mark as paid:', bulkError);
      // Use the error function from useToastNotifications hook
      try {
        showError('Error', 'Failed to mark all collections as paid');
      } catch (toastError) {
        console.error('Error showing toast notification:', toastError);
        // Fallback to alert if toast fails
        alert('Error: Failed to mark all collections as paid');
      }
    } finally {
      setProcessing(false);
      setProgress(0);
    }
  };

  // Group payments by collector - removed as we're using collections directly

  // State for expanded collector rows
  const [expandedCollectors, setExpandedCollectors] = useState<Record<string, boolean>>({});
  // Bulk operation state
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  
  // Function to toggle collector expansion
  const toggleCollectorExpansion = (collectorId: string) => {
    setExpandedCollectors(prev => ({
      ...prev,
      [collectorId]: !prev[collectorId]
    }));
  };
  
  // Function to fetch collections breakdown for a collector
  const fetchCollectionsBreakdown = async (collectorId: string) => {
    try {
      const { data, error } = await supabase
        .from('collections')
        .select('id, collection_date, liters, status, approved_for_payment, collection_fee_status')
        .eq('staff_id', collectorId)
        .order('collection_date', { ascending: false })
        .limit(20); // Limit to last 20 collections for performance
      
      if (error) {
        console.error('Error fetching collections breakdown:', error);
        return [];
      }
      
      return data.map(collection => ({
        date: collection.collection_date,
        liters: collection.liters,
        status: collection.status,
        approved: collection.approved_for_payment,
        feeStatus: collection.collection_fee_status
      }));
    } catch (error) {
      console.error('Error fetching collections breakdown:', error);
      return [];
    }
  };
  
  // Function to load collections breakdown for a collector when expanded
  const loadCollectionsBreakdown = async (collectorId: string) => {
    // Only load if not already loaded
    const collector = collectors.find(c => c.id === collectorId);
    if (collector && (!collector.collectionsBreakdown || collector.collectionsBreakdown.length === 0)) {
      const breakdown = await fetchCollectionsBreakdown(collectorId);
      setCollectors(prev => prev.map(c => 
        c.id === collectorId ? { ...c, collectionsBreakdown: breakdown } : c
      ));
    }
  };
  
  // Enhanced collectors table with breakdown
  const renderCollectorsTable = () => {
    return (
      <div className="rounded-md border">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[40px]"></TableHead>
                <TableHead 
                  className="w-[120px] cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('name')}
                >
                  Collector
                  <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                </TableHead>
                <TableHead 
                  className="text-right w-[80px] cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('totalCollections')}
                >
                  Collections
                  <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                </TableHead>
                <TableHead 
                  className="text-right w-[80px] cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('totalLiters')}
                >
                  Liters
                  <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                </TableHead>
                <TableHead className="text-right w-[90px]">Rate/Liter</TableHead>
                <TableHead 
                  className="text-right w-[100px] cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('totalEarnings')}
                >
                  Gross
                  <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                </TableHead>
                <TableHead className="text-right w-[90px]">Penalties</TableHead>
                <TableHead 
                  className="text-right w-[100px] cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('pendingPayments')}
                >
                  Pending
                  <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                </TableHead>
                <TableHead className="text-right w-[100px]">Mark as Paid</TableHead>
                <TableHead className="text-right w-[100px]">Net</TableHead>
                <TableHead 
                  className="text-right w-[100px] cursor-pointer hover:bg-muted"
                  onClick={() => handleSort('performanceScore')}
                >
                  Performance
                  <ArrowUpDown className="ml-2 h-4 w-4 inline" />
                </TableHead>
                <TableHead className="text-right w-[120px]">Status</TableHead>
                <TableHead className="text-right w-[120px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedCollectors.map((collector) => (
                <Fragment key={collector.id}>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => {
                      toggleCollectorExpansion(collector.id);
                      if (!expandedCollectors[collector.id]) {
                        loadCollectionsBreakdown(collector.id);
                      }
                    }}
                  >
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleCollectorExpansion(collector.id);
                          if (!expandedCollectors[collector.id]) {
                            loadCollectionsBreakdown(collector.id);
                          }
                        }}
                      >
                        {expandedCollectors[collector.id] ? (
                          <ChevronDownIcon className="h-4 w-4" />
                        ) : (
                          <ChevronRightIcon className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                    <TableCell className="font-medium max-w-[120px] truncate">{collector.name}</TableCell>
                    <TableCell className="text-right">{collector.totalCollections}</TableCell>
                    <TableCell className="text-right">{collector.totalLiters.toFixed(0)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(collector.ratePerLiter)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(collector.totalEarnings)}</TableCell>
                    <TableCell className="text-right text-red-600">
                      {formatCurrency(collector.totalPenalties)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(collector.pendingPayments)}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      {collector.pendingPayments > 0 ? (
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsPaid(collector.id, collector.name);
                          }}
                          className="h-8 px-2 text-xs bg-green-600 hover:bg-green-700"
                        >
                          Mark as Paid
                        </Button>
                      ) : (
                        <Button 
                          size="sm" 
                          disabled
                          className="h-8 px-2 text-xs bg-gray-300 cursor-not-allowed"
                        >
                          Mark as Paid
                        </Button>
                      )}
                    </TableCell>
                    <TableCell className={`text-right font-bold ${collector.totalEarnings - collector.totalPenalties < 0 ? 'text-red-600' : ''}`}>
                      {formatCurrency(collector.totalEarnings - collector.totalPenalties)}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col items-end">
                        <span>{collector.performanceScore.toFixed(0)}</span>
                        <Badge 
                          variant={collector.performanceScore >= 80 ? 'default' : 
                                 collector.performanceScore >= 60 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {collector.performanceScore >= 80 ? 'Excellent' : 
                           collector.performanceScore >= 60 ? 'Good' : 'Poor'}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {collector.pendingPayments > 0 ? (
                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                          Pending Payments
                        </Badge>
                      ) : collector.paidPayments > 0 ? (
                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                          All Paid
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          No Payments
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right py-2">
                      <div className="flex gap-1 justify-end">
                        <Button 
                          size="sm" 
                          onClick={(e) => {
                            e.stopPropagation();
                            showPaymentHistory(collector);
                          }}
                          className="h-8 px-2 text-xs bg-blue-600 hover:bg-blue-700"
                        >
                          History
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                  {expandedCollectors[collector.id] && (
                    <TableRow>
                      <TableCell colSpan={13} className="p-0 bg-muted/50">
                        <div className="p-4">
                          <h4 className="font-medium mb-3 flex items-center gap-2">
                            <ListIcon className="h-4 w-4" />
                            Recent Collections Breakdown (Last 20)
                          </h4>
                          {collector.collectionsBreakdown && collector.collectionsBreakdown.length > 0 ? (
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead className="w-[100px]">Date</TableHead>
                                  <TableHead className="text-right w-[80px]">Liters</TableHead>
                                  <TableHead className="w-[100px]">Status</TableHead>
                                  <TableHead className="w-[120px]">Payment Approval</TableHead>
                                  <TableHead className="w-[100px]">Fee Status</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {collector.collectionsBreakdown.map((collection, index) => (
                                  <TableRow key={index}>
                                    <TableCell className="text-xs">
                                      {new Date(collection.date).toLocaleDateString()}
                                    </TableCell>
                                    <TableCell className="text-right text-xs">
                                      {collection.liters.toFixed(2)}
                                    </TableCell>
                                    <TableCell>
                                      <Badge 
                                        variant={collection.status === 'Collected' ? 'default' : 'secondary'}
                                        className="text-xs"
                                      >
                                        {collection.status}
                                      </Badge>
                                    </TableCell>
                                    <TableCell>
                                      {collection.approved ? (
                                        <Badge variant="default" className="text-xs">Approved</Badge>
                                      ) : (
                                        <Badge variant="secondary" className="text-xs">Pending</Badge>
                                      )}
                                    </TableCell>
                                    <TableCell>
                                      {(collection as any).feeStatus === 'paid' ? (
                                        <Badge variant="default" className="bg-green-100 text-green-800 text-xs">
                                          Paid
                                        </Badge>
                                      ) : (
                                        <Badge variant="secondary" className="bg-orange-100 text-orange-800 text-xs">
                                          Pending
                                        </Badge>
                                      )}
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          ) : (
                            <div className="text-center py-4 text-muted-foreground">
                              <Loader2Icon className="h-4 w-4 animate-spin mx-auto mb-2" />
                              Loading collections data...
                            </div>
                          )}
                          {/* Show collections summary for this collector */}
                          <div className="mt-6">
                            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-3">
                              <h5 className="font-medium">Collections Summary</h5>
                              <Button 
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (collector.pendingPayments > 0) {
                                    handleMarkAsPaid(collector.id, collector.name);
                                  }
                                }}
                                className={`text-xs h-8 ${collector.pendingPayments > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
                                disabled={collector.pendingPayments === 0}
                              >
                                Mark All Pending as Paid
                              </Button>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Total Collections</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold">{collector.totalCollections}</div>
                                  <p className="text-xs text-muted-foreground">All time collections</p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Total Liters</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold">{collector.totalLiters?.toFixed(0)}</div>
                                  <p className="text-xs text-muted-foreground">All time liters collected</p>
                                </CardContent>
                              </Card>
                              <Card>
                                <CardHeader className="pb-2">
                                  <CardTitle className="text-sm">Net Earnings</CardTitle>
                                </CardHeader>
                                <CardContent>
                                  <div className="text-2xl font-bold text-green-600">{formatCurrency(collector.totalEarnings - collector.totalPenalties)}</div>
                                  <p className="text-xs text-muted-foreground">After penalty deductions</p>
                                </CardContent>
                              </Card>
                            </div>
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </Fragment>
              ))}
            </TableBody>
          </Table>
        </div>
        {/* Add Mark All Pending Payments as Paid button at the end of the table */}
        
        {/* Add pagination controls */}
        {renderPagination()}
        <div className="p-4 border-t bg-gray-50">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="text-sm text-muted-foreground">
              {stats.totalPendingAmount > 0 
                ? `${collectors.filter(c => c.pendingPayments > 0).length} collectors with pending payments` 
                : 'No pending payments'}
            </div>
            <div className="w-full sm:w-auto">
              <Button 
                onClick={handleBulkMarkAsPaid}
                className={`w-full sm:w-auto ${stats.totalPendingAmount > 0 ? 'bg-green-600 hover:bg-green-700' : 'bg-gray-300 cursor-not-allowed'}`}
                size="sm"
                disabled={stats.totalPendingAmount === 0 || processing}
              >
                {processing ? `Processing... ${Math.round(progress)}%` : 'Mark All Pending Payments as Paid (All Collectors)'}
              </Button>
            </div>
          </div>
        </div>
        
        {/* Add pagination controls */}
        {renderPagination()}
      </div>
    );
  };

  // Render pagination controls
  const renderPagination = () => {
    const totalPages = Math.ceil(totalCount / pageSize);
    
    if (totalPages <= 1) return null;
    
    const getPageNumbers = () => {
      const pages = [];
      const maxVisiblePages = 5;
      
      if (totalPages <= maxVisiblePages) {
        for (let i = 1; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        if (page <= 3) {
          for (let i = 1; i <= 4; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        } else if (page >= totalPages - 2) {
          pages.push(1);
          pages.push('...');
          for (let i = totalPages - 3; i <= totalPages; i++) {
            pages.push(i);
          }
        } else {
          pages.push(1);
          pages.push('...');
          for (let i = page - 1; i <= page + 1; i++) {
            pages.push(i);
          }
          pages.push('...');
          pages.push(totalPages);
        }
      }
      
      return pages;
    };
    
    return (
      <div className="flex justify-center mt-6">
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (page > 1) setPage(page - 1);
                }}
                className={page === 1 ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
            
            {getPageNumbers().map((pageNum, index) => (
              <PaginationItem key={index}>
                {pageNum === '...' ? (
                  <span className="px-3 py-1">...</span>
                ) : (
                  <PaginationLink
                    href="#"
                    onClick={(e) => {
                      e.preventDefault();
                      setPage(pageNum as number);
                    }}
                    isActive={page === pageNum}
                  >
                    {pageNum}
                  </PaginationLink>
                )}
              </PaginationItem>
            ))}
            
            <PaginationItem>
              <PaginationNext 
                href="#" 
                onClick={(e) => {
                  e.preventDefault();
                  if (page < totalPages) setPage(page + 1);
                }}
                className={page === totalPages ? "pointer-events-none opacity-50" : ""}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    );
  };

  // Update the payments tab rendering to include the enhanced collectors table
  const renderPaymentsTab = () => {
    return (
      <div className="space-y-6">
        {/* Summary Cards - Made responsive */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Payments</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-orange-600">
                {formatCurrency(stats.totalPendingAmount)}
              </div>
              <p className="text-xs text-muted-foreground">Awaiting payment</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Gross Earnings</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-blue-600">
                {formatCurrency(totalGrossEarnings)}
              </div>
              <p className="text-xs text-muted-foreground">Before penalties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-red-600">
                {formatCurrency(stats.totalPenalties)}
              </div>
              <p className="text-xs text-muted-foreground">Deducted from earnings</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Net Earnings</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-xl font-bold ${totalGrossEarnings - stats.totalPenalties < 0 ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(totalGrossEarnings - stats.totalPenalties)}
              </div>
              <p className="text-xs text-muted-foreground">After penalties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Amount</CardTitle>
              <CheckCircle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(stats.totalPaidAmount)}
              </div>
              <p className="text-xs text-muted-foreground">Completed payments</p>
            </CardContent>
          </Card>
        </div>

        {/* Payment Filters - Made responsive */}
        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
            <Input
              placeholder="Search payments by collector name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <div className="flex gap-2">
            <Select value={paymentFilter} onValueChange={(value) => setPaymentFilter(value as any)}>
              <SelectTrigger className="w-[120px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="paid">Paid</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Button onClick={exportPaymentsToCSV} className="flex items-center gap-1 h-10 px-3" size="sm">
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Select onValueChange={(value) => exportData(value as 'csv' | 'excel' | 'pdf')}>
                <SelectTrigger className="w-[120px] h-10">
                  <span className="hidden sm:inline">More Formats</span>
                  <span className="sm:hidden">Export</span>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="excel">Export Excel</SelectItem>
                  <SelectItem value="pdf">Export PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>
        
        {/* Advanced Filters */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
          <div>
            <label className="text-sm font-medium mb-1 block">Min Earnings</label>
            <Input
              type="number"
              placeholder="0"
              value={filters.minEarnings || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, minEarnings: e.target.value ? Number(e.target.value) : null }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Max Earnings</label>
            <Input
              type="number"
              placeholder="10000"
              value={filters.maxEarnings || ''}
              onChange={(e) => setFilters(prev => ({ ...prev, maxEarnings: e.target.value ? Number(e.target.value) : null }))}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Performance</label>
            <Select value={filters.performanceRange} onValueChange={(value) => setFilters(prev => ({ ...prev, performanceRange: value as any }))}>
              <SelectTrigger>
                <SelectValue placeholder="Performance Range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                <SelectItem value="excellent">Excellent (80%+)</SelectItem>
                <SelectItem value="good">Good (60-79%)</SelectItem>
                <SelectItem value="poor">Poor (&lt;60%)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Date Range</label>
            <div className="flex gap-2">
              <div className="flex-1">
                <Input
                  type="date"
                  value={filters.dateRange.from || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, from: e.target.value || null } }))}
                />
              </div>
              <div className="flex-1">
                <Input
                  type="date"
                  value={filters.dateRange.to || ''}
                  onChange={(e) => setFilters(prev => ({ ...prev, dateRange: { ...prev.dateRange, to: e.target.value || null } }))}
                />
              </div>
            </div>
          </div>
          <div className="flex items-end">
            <Button 
              variant="outline" 
              onClick={() => setFilters({
                minEarnings: null,
                maxEarnings: null,
                performanceRange: 'all',
                dateRange: { from: null, to: null }
              })}
              className="w-full"
            >
              Clear Filters
            </Button>
          </div>
        </div>

        {/* Enhanced Collectors Table with Breakdown */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Collector Performance Overview
            </CardTitle>
            <CardDescription>
              Detailed breakdown of collections and earnings per collector (All-time data)
            </CardDescription>
          </CardHeader>
          <CardContent>
            {collectors.length > 0 ? (
              renderCollectorsTable()
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No collectors found</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add pagination controls */}
        {renderPagination()}
      </div>
    );
  };

  // Payment History Modal Component
  const renderPaymentHistoryModal = () => {
    if (!showHistoryModal || !selectedCollector) return null;
    
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Payment History for {selectedCollector.name}
              </CardTitle>
              <CardDescription>
                Detailed collection history and payment status
              </CardDescription>
            </div>
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => setShowHistoryModal(false)}
            >
              Close
            </Button>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto">
            {historyLoading ? (
              <div className="flex items-center justify-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Collections</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{selectedCollector.totalCollections}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Total Liters</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">{selectedCollector.totalLiters?.toFixed(0)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Gross Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-blue-600">{formatCurrency(selectedCollector.totalEarnings)}</div>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Net Earnings</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-green-600">{formatCurrency(selectedCollector.totalEarnings - selectedCollector.totalPenalties)}</div>
                    </CardContent>
                  </Card>
                </div>
                
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Liters</TableHead>
                      <TableHead className="text-right">Rate</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paymentHistory.map((collection) => (
                      <TableRow key={collection.id}>
                        <TableCell>
                          {new Date(collection.collection_date).toLocaleDateString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {collection.liters?.toFixed(2)}
                        </TableCell>
                        <TableCell className="text-right">
                          {collection.liters && collection.liters > 0 && collection.total_amount ? formatCurrency(collection.total_amount / collection.liters) : 'N/A'}
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {formatCurrency(collection.total_amount)}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={collection.status === 'Collected' ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {collection.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={collection.collection_fee_status === 'paid' ? 'default' : 'secondary'}
                            className={collection.collection_fee_status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-orange-100 text-orange-800'}
                          >
                            {collection.collection_fee_status === 'paid' ? 'Paid' : 'Pending'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                
                {paymentHistory.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No collection history found for this collector</p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
          <div className="p-4 border-t bg-gray-50 flex justify-end">
            <Button 
              onClick={() => setShowHistoryModal(false)}
              variant="outline"
            >
              Close
            </Button>
          </div>
        </Card>
      </div>
    );
  };

  // Export collector data to multiple formats
  const exportPaymentsToCSV = () => {
    try {
      const headers = ['Collector Name', 'Total Collections', 'Total Liters', 'Rate Per Liter', 'Gross Earnings', 'Total Penalties', 'Pending Amount', 'Paid Amount'];
      const rows = collectors.map(collector => [
        collector.name || 'Unknown Collector',
        collector.totalCollections,
        collector.totalLiters?.toFixed(2) || '0.00',
        formatCurrency(collector.ratePerLiter),
        formatCurrency(collector.totalEarnings),
        formatCurrency(collector.totalPenalties),
        formatCurrency(collector.pendingPayments),
        formatCurrency(collector.paidPayments)
      ]);
      
      const csvContent = [
        headers.join(','),
        ...rows.map(row => row.join(','))
      ].join('\n');
      
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', `collector-payments-${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      success('Success', 'Collector data exported successfully');
    } catch (error) {
      console.error('Error exporting collector data:', error);
      showError('Error', 'Failed to export collector data');
    }
  };

  // Enhanced export with multiple formats
  const exportData = async (format: 'csv' | 'excel' | 'pdf') => {
    try {
      // Fetch complete data for export (not just visible)
      const { data: allCollectors, error: fetchError } = await supabase
        .from('staff')
        .select(`
          id,
          profiles!inner (full_name),
          collections (
            collection_date,
            liters,
            collection_fee_amount,
            collection_fee_status
          )
        `)
        .eq('role', 'collector');

      if (fetchError) {
        console.error('Error fetching collector data:', fetchError);
        // Use the error function from useToastNotifications hook
        try {
          showError('Error', `Failed to fetch collector data for export: ${fetchError.message || 'Unknown error'}`);
        } catch (toastError) {
          console.error('Error showing toast notification:', toastError);
          // Fallback to alert if toast fails
          alert(`Error: Failed to fetch collector data for export: ${fetchError.message || 'Unknown error'}`);
        }
        return;
      }

      // Ensure we have data to work with
      const collectorsData = allCollectors || [];

      // Check if we have data
      if (collectorsData.length === 0) {
        // Use the error function from useToastNotifications hook
        try {
          showError('Error', 'No collector data found to export');
        } catch (toastError) {
          console.error('Error showing toast notification:', toastError);
          // Fallback to alert if toast fails
          alert('Error: No collector data found to export');
        }
        return;
      }

      if (format === 'excel') {
        // Use XLSX library for Excel export
        const XLSX = await import('xlsx');
        
        const worksheet = XLSX.utils.json_to_sheet(
          collectorsData.map((c: any) => {
            // Ensure collections is an array
            const collections = Array.isArray(c.collections) ? c.collections : [];
            
            return {
              'Collector': c.profiles?.full_name || 'Unknown Collector',
              'Total Collections': collections.length || 0,
              'Total Liters': collections.reduce((sum: number, col: any) => sum + (col.liters || 0), 0).toFixed(2) || '0.00',
              'Gross Earnings': formatCurrency(collections.reduce((sum: number, col: any) => sum + (col.collection_fee_amount || 0), 0) || 0),
              'Penalties': formatCurrency(collections.filter((col: any) => col.collection_fee_status === 'paid').reduce((sum: number, col: any) => sum + (col.collection_fee_amount || 0), 0) || 0),
              'Net Earnings': formatCurrency((collections.reduce((sum: number, col: any) => sum + (col.collection_fee_amount || 0), 0) || 0) - (collections.filter((col: any) => col.collection_fee_status === 'paid').reduce((sum: number, col: any) => sum + (col.collection_fee_amount || 0), 0) || 0)),
              'Performance': ((collections.length || 0) > 0 ? (collections.filter((col: any) => col.collection_fee_status === 'paid').length / collections.length) * 100 : 0).toFixed(0) + '%'
            };
          })
        );
        
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Collectors');
        XLSX.writeFile(workbook, `collectors_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else if (format === 'csv') {
        exportPaymentsToCSV();
        return;
      } else if (format === 'pdf') {
        // For PDF export, we'll create a simple CSV-like format for now
        // In a full implementation, we would use a library like jsPDF
        const headers = ['Collector Name', 'Total Collections', 'Total Liters', 'Gross Earnings', 'Penalties', 'Net Earnings', 'Performance'];
        const rows = collectorsData.map((c: any) => {
          // Ensure collections is an array
          const collections = Array.isArray(c.collections) ? c.collections : [];
          
          return [
            c.profiles?.full_name || 'Unknown Collector',
            collections.length || 0,
            collections.reduce((sum: number, col: any) => sum + (col.liters || 0), 0).toFixed(2) || '0.00',
            formatCurrency(collections.reduce((sum: number, col: any) => sum + (col.collection_fee_amount || 0), 0) || 0),
            formatCurrency(collections.filter((col: any) => col.collection_fee_status === 'paid').reduce((sum: number, col: any) => sum + (col.collection_fee_amount || 0), 0) || 0),
            formatCurrency((collections.reduce((sum: number, col: any) => sum + (col.collection_fee_amount || 0), 0) || 0) - (collections.filter((col: any) => col.collection_fee_status === 'paid').reduce((sum: number, col: any) => sum + (col.collection_fee_amount || 0), 0) || 0)),
            (collections.length || 0) > 0 ? (collections.filter((col: any) => col.collection_fee_status === 'paid').length / collections.length) * 100 : 0 + '%'
          ];
        });
        
        const csvContent = [
          headers.join(','),
          ...rows.map(row => row.join(','))
        ].join('\n');
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `collectors_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
      
      success('Success', `Collector data exported as ${format.toUpperCase()} successfully`);
    } catch (exportError: any) {
      console.error('Error exporting collector data:', exportError);
      // Use the error function from useToastNotifications hook
      try {
        showError('Error', `Failed to export collector data as ${format.toUpperCase()}: ${exportError.message || 'Unknown error'}`);
      } catch (toastError) {
        console.error('Error showing toast notification:', toastError);
        // Fallback to alert if toast fails
        alert(`Error: Failed to export collector data as ${format.toUpperCase()}: ${exportError.message || 'Unknown error'}`);
      }
    }
  };

  // Update the analytics tab to include enhanced analytics and visualizations
  const renderAnalyticsTab = () => {
    // Prepare data for the charts
    const chartData = collectors.map(collector => ({
      period: collector.name || 'Unknown Collector',
      variance: collector.totalPenalties, // Using penalties as a proxy for variance
      earnings: collector.totalEarnings - collector.totalPenalties,
      collector: collector.name || 'Unknown Collector',
      collections: collector.totalCollections,
      liters: collector.totalLiters,
      performance: collector.performanceScore
    }));

    // Prepare data for payment status distribution chart
    const statusDistributionData = [
      { name: 'Pending', value: collectors.filter(c => c.pendingPayments > 0).length },
      { name: 'Paid', value: collectors.filter(c => c.paidPayments > 0 && c.pendingPayments === 0).length }
    ];

    // Prepare data for top collectors chart
    const topCollectorsData = collectors
      .map(collector => ({
        name: collector.name || 'Unknown Collector',
        earnings: collector.totalEarnings - collector.totalPenalties,
        collections: collector.totalCollections,
        liters: collector.totalLiters,
        performance: collector.performanceScore
      }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, 10);

    // Prepare data for performance score distribution
    const performanceDistributionData = [
      { name: 'Excellent (80%+)', value: collectors.filter(c => c.performanceScore >= 80).length },
      { name: 'Good (60-79%)', value: collectors.filter(c => c.performanceScore >= 60 && c.performanceScore < 80).length },
      { name: 'Poor (<60%)', value: collectors.filter(c => c.performanceScore < 60).length }
    ];

    // Calculate additional metrics
    const avgCollectionsPerCollector = stats.totalCollectors > 0 ? 
      Math.round((collectors.reduce((sum, c) => sum + c.totalCollections, 0) / stats.totalCollectors)) : 0;
    
    const avgLitersPerCollector = stats.totalCollectors > 0 ? 
      Math.round(collectors.reduce((sum, c) => sum + c.totalLiters, 0) / stats.totalCollectors) : 0;
    
    const bestPerformanceScore = collectors.length > 0 ? 
      Math.max(...collectors.map(c => c.performanceScore)) : 0;

    return (
      <div className="space-y-6">

        {/* Enhanced KPI Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Total Collectors */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Collectors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {stats.totalCollectors}
              </div>
              <p className="text-xs text-muted-foreground">Active collectors</p>
            </CardContent>
          </Card>

          {/* Avg Collections per Collector */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Collections</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgCollectionsPerCollector}
              </div>
              <p className="text-xs text-muted-foreground">Per collector</p>
            </CardContent>
          </Card>

          {/* Avg Liters per Collector */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Liters</CardTitle>
              <DollarSign className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {avgLitersPerCollector.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">Per collector</p>
            </CardContent>
          </Card>

          {/* Best Performance Score */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best Performance</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bestPerformanceScore.toFixed(0)}%
              </div>
              <p className="text-xs text-muted-foreground">Top collector score</p>
            </CardContent>
          </Card>
        </div>

        {/* Performance Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Variance vs Earnings Chart - Dual Axis */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Collector Performance Overview
              </CardTitle>
              <CardDescription>
                Comparison of penalties and net earnings by collector
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {chartData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={chartData}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      dataKey="period" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <YAxis 
                      yAxisId="left" 
                      orientation="left" 
                      stroke="#ef4444" 
                      tickFormatter={(value) => `Ksh${value.toLocaleString()}`}
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      yAxisId="right" 
                      orientation="right" 
                      stroke="#10b981" 
                      tickFormatter={(value) => `Ksh${value.toLocaleString()}`}
                      tick={{ fill: '#6b7280' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'variance') {
                          return [`Ksh${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Penalties'];
                        } else if (name === 'earnings') {
                          return [`Ksh${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Net Earnings'];
                        }
                        return [value, name];
                      }}
                      labelFormatter={(label) => `Collector: ${label}`}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                    />
                    <Bar 
                      yAxisId="left" 
                      dataKey="variance" 
                      name="Penalties" 
                      fill="#ef4444" 
                      opacity={0.7}
                      radius={[4, 4, 0, 0]}
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="earnings" 
                      name="Net Earnings" 
                      stroke="#10b981" 
                      strokeWidth={3}
                      dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }}
                      activeDot={{ r: 8, fill: '#10b981', stroke: '#fff', strokeWidth: 2 }}
                      strokeLinecap="round"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available for chart
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Collectors by Net Earnings Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Collectors by Net Earnings
              </CardTitle>
              <CardDescription>
                Highest earning collectors after penalty deductions
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {topCollectorsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={topCollectorsData}
                    layout="vertical"
                    margin={{
                      top: 20,
                      right: 30,
                      left: 100,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis 
                      type="number" 
                      tickFormatter={(value) => `Ksh${value.toLocaleString()}`}
                      tick={{ fill: '#6b7280' }}
                    />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      scale="band" 
                      width={90}
                      tick={{ fontSize: 12, fill: '#6b7280' }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'earnings') {
                          return [`Ksh${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Net Earnings'];
                        }
                        return [value, name];
                      }}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                    />
                    <Legend 
                      wrapperStyle={{ paddingTop: '10px' }}
                    />
                    <Bar 
                      dataKey="earnings" 
                      name="Net Earnings" 
                      fill="#8b5cf6" 
                      barSize={20}
                      radius={[0, 4, 4, 0]}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance Score Distribution */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Performance Score Distribution
              </CardTitle>
              <CardDescription>
                Distribution of collectors by performance rating
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {performanceDistributionData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={performanceDistributionData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      stroke="#fff"
                      strokeWidth={2}
                    >
                      {performanceDistributionData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={
                            entry.name.includes('Excellent') ? '#10b981' : 
                            entry.name.includes('Good') ? '#f59e0b' : '#ef4444'
                          } 
                        />
                      ))}
                    </Pie>
                    <Tooltip 
                      formatter={(value) => [value, 'Collectors']}
                      contentStyle={{ backgroundColor: '#fff', borderRadius: '0.5rem', border: '1px solid #e5e7eb' }}
                    />
                    <Legend 
                      layout="horizontal"
                      verticalAlign="bottom"
                      align="center"
                      wrapperStyle={{ paddingTop: '20px' }}
                    />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No performance data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Additional Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Total Penalties */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Total Penalties
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-center text-red-600">
                {formatCurrency(stats.totalPenalties)}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Deducted from gross earnings
              </p>
            </CardContent>
          </Card>

          {/* Avg Earnings per Collector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Avg Net Earnings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-center">
                {formatCurrency(stats.totalCollectors > 0 ? (stats.totalPaidAmount + stats.totalPendingAmount) / stats.totalCollectors : 0)}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Average net earnings per collector
              </p>
            </CardContent>
          </Card>

          {/* Collection Efficiency */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Collection Efficiency
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-center">
                {stats.totalCollectors > 0 && (stats.totalPendingAmount + stats.totalPaidAmount) > 0 ? 
                  ((stats.totalPaidAmount / (stats.totalPendingAmount + stats.totalPaidAmount)) * 100).toFixed(1) : '0.0'}%
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                Percentage of payments processed
              </p>
            </CardContent>
          </Card>

          {/* Top Performing Collector */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Top Performer
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-bold text-center truncate">
                {collectors.length > 0 
                  ? [...collectors]
                      .sort((a, b) => (Math.max(0, b.totalEarnings - b.totalPenalties) - Math.max(0, a.totalEarnings - a.totalPenalties)))[0].name 
                  : 'N/A'}
              </div>
              <p className="text-sm text-muted-foreground text-center mt-2">
                {collectors.length > 0 
                  ? formatCurrency(Math.max(0, [...collectors]
                      .sort((a, b) => (Math.max(0, b.totalEarnings - b.totalPenalties) - Math.max(0, a.totalEarnings - a.totalPenalties)))[0].totalEarnings - 
                    [...collectors]
                      .sort((a, b) => (Math.max(0, b.totalEarnings - b.totalPenalties) - Math.max(0, a.totalEarnings - a.totalPenalties)))[0].totalPenalties))
                  : 'No data'}
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Collector Comparison Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Collector Comparison
            </CardTitle>
            <CardDescription>
              Detailed performance metrics for all collectors
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collector</TableHead>
                    <TableHead className="text-right">Collections</TableHead>
                    <TableHead className="text-right">Liters</TableHead>
                    <TableHead className="text-right">Gross Earnings</TableHead>
                    <TableHead className="text-right">Penalties</TableHead>
                    <TableHead className="text-right">Net Earnings</TableHead>
                    <TableHead className="text-right">Performance</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {collectors.map((collector) => (
                    <TableRow key={collector.id}>
                      <TableCell className="font-medium max-w-[150px] truncate">{collector.name}</TableCell>
                      <TableCell className="text-right">{collector.totalCollections}</TableCell>
                      <TableCell className="text-right">{collector.totalLiters?.toFixed(0)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(collector.totalEarnings)}</TableCell>
                      <TableCell className="text-right text-red-600">{formatCurrency(collector.totalPenalties)}</TableCell>
                      <TableCell className="text-right font-bold">
                        {formatCurrency(collector.totalEarnings - collector.totalPenalties)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Badge 
                          variant={collector.performanceScore >= 80 ? 'default' : 
                                 collector.performanceScore >= 60 ? 'secondary' : 'destructive'}
                          className="text-xs"
                        >
                          {collector.performanceScore.toFixed(0)}%
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  // Create an enhanced function to render the penalty analytics tab
  const renderPenaltyAnalyticsTab = () => {
    if (penaltyAnalyticsLoading) {
      return (
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      );
    }

    if (!penaltyAnalytics) {
      return (
        <div className="text-center py-12 text-muted-foreground">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p className="text-lg">No penalty analytics data available</p>
        </div>
      );
    }

    // Prepare data for charts
    const penaltyBreakdownData = [
      { 
        name: 'Positive Variance', 
        value: penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector > 0 ? 
          (penaltyAnalytics.collectorPenaltyData.reduce((sum, c) => sum + c.penaltyBreakdown.positiveVariancePenalties, 0) / penaltyAnalytics.collectorPenaltyData.length) : 0 
      },
      { 
        name: 'Negative Variance', 
        value: penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector > 0 ? 
          (penaltyAnalytics.collectorPenaltyData.reduce((sum, c) => sum + c.penaltyBreakdown.negativeVariancePenalties, 0) / penaltyAnalytics.collectorPenaltyData.length) : 0 
      }
    ];

    const COLORS = ['#ef4444', '#3b82f6'];

    // Top penalty collectors (top 5)
    const topPenaltyCollectors = [...penaltyAnalytics.collectorPenaltyData]
      .sort((a, b) => b.totalPenalties - a.totalPenalties)
      .slice(0, 5)
      .map(collector => ({
        name: collector.collectorName,
        penalties: collector.totalPenalties,
        positive: collector.penaltyBreakdown.positiveVariancePenalties,
        negative: collector.penaltyBreakdown.negativeVariancePenalties
      }));

    // Prepare data for penalty trend analysis
    // Aggregate penalty trends across all collectors
    const aggregatedPenaltyTrend = penaltyAnalytics.collectorPenaltyData
      .flatMap(c => c.penaltyTrend)
      .reduce((acc, curr) => {
        const existing = acc.find(item => item.date === curr.date);
        if (existing) {
          existing.penalties += curr.penalties;
        } else {
          acc.push({ ...curr });
        }
        return acc;
      }, [] as { date: string; penalties: number }[])
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    // Calculate additional metrics
    const highPenaltyCollectors = penaltyAnalytics.collectorPenaltyData
      .filter(c => c.totalPenalties > penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector)
      .length;

    const lowPenaltyCollectors = penaltyAnalytics.collectorPenaltyData
      .filter(c => c.totalPenalties < penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector * 0.5)
      .length;

    return (
      <div className="space-y-6">
        {/* Enhanced Penalty Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Penalties</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {formatCurrency(penaltyAnalytics.overallPenaltyStats.totalPenalties)}
              </div>
              <p className="text-xs text-muted-foreground">Across all collectors</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Penalty per Collector</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {formatCurrency(penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector)}
              </div>
              <p className="text-xs text-muted-foreground">Average penalties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">High Penalty Collectors</CardTitle>
              <AlertTriangle className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                {highPenaltyCollectors}
              </div>
              <p className="text-xs text-muted-foreground">Above average penalties</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Low Penalty Collectors</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {lowPenaltyCollectors}
              </div>
              <p className="text-xs text-muted-foreground">Below 50% of average</p>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Penalty Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Penalty Trend Analysis */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Penalty Trend Analysis
              </CardTitle>
              <CardDescription>
                Total penalties over time across all collectors
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {aggregatedPenaltyTrend.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={aggregatedPenaltyTrend}
                    margin={{
                      top: 20,
                      right: 30,
                      left: 20,
                      bottom: 60,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="date" 
                      angle={-45} 
                      textAnchor="end" 
                      height={60}
                      tick={{ fontSize: 12 }}
                      tickFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <YAxis 
                      orientation="left" 
                      stroke="#ef4444" 
                      tickFormatter={(value) => `Ksh${value.toLocaleString()}`}
                    />
                    <Tooltip 
                      formatter={(value) => [`Ksh${Number(value).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, 'Penalties']}
                      labelFormatter={(label) => `Date: ${new Date(label).toLocaleDateString()}`}
                    />
                    <Legend />
                    <Bar 
                      dataKey="penalties" 
                      name="Daily Penalties" 
                      fill="#ef4444" 
                      opacity={0.7}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="penalties" 
                      name="Trend" 
                      stroke="#10b981" 
                      strokeWidth={2}
                      dot={{ r: 4 }}
                      activeDot={{ r: 6 }}
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No penalty trend data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Penalty Breakdown Pie Chart */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <PieChart className="h-5 w-5" />
                Penalty Breakdown (Average)
              </CardTitle>
              <CardDescription>
                Distribution of penalties by variance type
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {penaltyBreakdownData.some(item => item.value > 0) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <RechartsPieChart>
                    <Pie
                      data={penaltyBreakdownData}
                      cx="50%"
                      cy="50%"
                      labelLine={true}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {penaltyBreakdownData.map((entry, index) => (
                        <Cell 
                          key={`cell-${index}`} 
                          fill={entry.name.includes('Positive') ? '#ef4444' : '#3b82f6'} 
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatCurrency(Number(value)), 'Amount']} />
                    <Legend />
                  </RechartsPieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No penalty data available
                </div>
              )}
            </CardContent>
          </Card>

          {/* Top Penalty Collectors with Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Top Penalty Collectors
              </CardTitle>
              <CardDescription>
                Collectors with highest penalties (with breakdown)
              </CardDescription>
            </CardHeader>
            <CardContent className="h-80">
              {topPenaltyCollectors.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={topPenaltyCollectors}
                    layout="vertical"
                    margin={{
                      top: 20,
                      right: 30,
                      left: 120,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" tickFormatter={(value) => formatCurrency(value)} />
                    <YAxis 
                      type="category" 
                      dataKey="name" 
                      scale="band" 
                      width={110}
                      tick={{ fontSize: 10 }}
                    />
                    <Tooltip 
                      formatter={(value, name) => {
                        if (name === 'penalties') {
                          return [formatCurrency(Number(value)), 'Total Penalties'];
                        } else if (name === 'positive') {
                          return [formatCurrency(Number(value)), 'Positive Variance'];
                        } else if (name === 'negative') {
                          return [formatCurrency(Number(value)), 'Negative Variance'];
                        }
                        return [value, name];
                      }}
                    />
                    <Legend />
                    <Bar 
                      dataKey="positive" 
                      name="Positive Variance" 
                      fill="#ef4444" 
                      stackId="a"
                    />
                    <Bar 
                      dataKey="negative" 
                      name="Negative Variance" 
                      fill="#3b82f6" 
                      stackId="a"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full text-muted-foreground">
                  No penalty data available
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Collector-Specific Penalty Details with Enhanced Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileBarChart className="h-5 w-5" />
              Collector Penalty Analysis
            </CardTitle>
            <CardDescription>
              Detailed penalty information and performance insights for each collector
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Collector</TableHead>
                    <TableHead className="text-right">Total Penalties</TableHead>
                    <TableHead className="text-right">Positive Penalties</TableHead>
                    <TableHead className="text-right">Negative Penalties</TableHead>
                    <TableHead className="text-right">Positive Variances</TableHead>
                    <TableHead className="text-right">Negative Variances</TableHead>
                    <TableHead className="text-right">Penalty Ratio</TableHead>
                    <TableHead className="text-right">Performance Impact</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {penaltyAnalytics.collectorPenaltyData.map((collector) => {
                    const totalVariances = collector.penaltyBreakdown.totalPositiveVariances + collector.penaltyBreakdown.totalNegativeVariances;
                    const penaltyRatio = totalVariances > 0 ? 
                      ((collector.totalPenalties / totalVariances) * 100).toFixed(1) : '0.0';
                    
                    return (
                      <TableRow key={collector.collectorId}>
                        <TableCell className="font-medium max-w-[150px] truncate">{collector.collectorName}</TableCell>
                        <TableCell className="text-right font-bold text-red-600">
                          {formatCurrency(collector.totalPenalties)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(collector.penaltyBreakdown.positiveVariancePenalties)}
                        </TableCell>
                        <TableCell className="text-right text-red-600">
                          {formatCurrency(collector.penaltyBreakdown.negativeVariancePenalties)}
                        </TableCell>
                        <TableCell className="text-right">
                          {collector.penaltyBreakdown.totalPositiveVariances}
                        </TableCell>
                        <TableCell className="text-right">
                          {collector.penaltyBreakdown.totalNegativeVariances}
                        </TableCell>
                        <TableCell className="text-right">
                          {penaltyRatio}%
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge 
                            variant={collector.totalPenalties > penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector ? 'destructive' : 
                                   collector.totalPenalties < penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector * 0.5 ? 'default' : 'secondary'}
                            className="text-xs"
                          >
                            {collector.totalPenalties > penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector ? 'High' : 
                             collector.totalPenalties < penaltyAnalytics.overallPenaltyStats.avgPenaltyPerCollector * 0.5 ? 'Low' : 'Average'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Recent Penalties with Enhanced Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              Recent Penalty Records
            </CardTitle>
            <CardDescription>
              Most recent penalty records across all collectors with detailed information
            </CardDescription>
          </CardHeader>
          <CardContent>
            {penaltyAnalytics.collectorPenaltyData.some(c => c.recentPenalties.length > 0) ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Collector</TableHead>
                      <TableHead>Variance Type</TableHead>
                      <TableHead className="text-right">Variance %</TableHead>
                      <TableHead className="text-right">Variance Liters</TableHead>
                      <TableHead className="text-right">Penalty Amount</TableHead>
                      <TableHead>Notes</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {penaltyAnalytics.collectorPenaltyData.flatMap(collector => 
                      collector.recentPenalties.map((penalty, index) => (
                        <TableRow key={`${collector.collectorId}-${index}`}>
                          <TableCell>
                            {penalty.collection_date ? new Date(penalty.collection_date).toLocaleDateString() : 
                             penalty.approved_at ? new Date(penalty.approved_at).toLocaleDateString() : 'N/A'}
                          </TableCell>
                          <TableCell className="max-w-[120px] truncate">{collector.collectorName}</TableCell>
                          <TableCell>
                            <Badge 
                              variant={penalty.variance_type === 'positive' ? 'default' : 
                                     penalty.variance_type === 'negative' ? 'destructive' : 'secondary'}
                              className={penalty.variance_type === 'positive' ? 'bg-blue-100 text-blue-800' : 
                                        penalty.variance_type === 'negative' ? 'bg-red-100 text-red-800' : ''}
                            >
                              {penalty.variance_type || 'None'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            {penalty.variance_percentage ? `${penalty.variance_percentage.toFixed(2)}%` : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right">
                            {penalty.variance_liters ? penalty.variance_liters.toFixed(2) : 'N/A'}
                          </TableCell>
                          <TableCell className="text-right font-bold text-red-600">
                            {formatCurrency(penalty.total_penalty_amount || penalty.penalty_amount || 0)}
                          </TableCell>
                          <TableCell className="max-w-xs truncate">
                            {penalty.notes || penalty.approval_notes || 'N/A'}
                          </TableCell>
                        </TableRow>
                      ))
                    ).sort((a, b) => {
                      // Sort by date descending
                      const dateA = a.props.children[0].props.children;
                      const dateB = b.props.children[0].props.children;
                      return new Date(dateB).getTime() - new Date(dateA).getTime();
                    }).slice(0, 15)}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No recent penalties found
              </div>
            )}
          </CardContent>
        </Card>

        {/* Actionable Insights */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Actionable Insights
            </CardTitle>
            <CardDescription>
              Recommendations based on penalty analysis
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Training Opportunities</h3>
                <p className="text-sm text-blue-700">
                  {highPenaltyCollectors > 0 ? 
                    `${highPenaltyCollectors} collectors have above-average penalties and may benefit from additional training.` : 
                    "Most collectors are performing within acceptable penalty ranges."}
                </p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Recognition</h3>
                <p className="text-sm text-green-700">
                  {lowPenaltyCollectors > 0 ? 
                    `${lowPenaltyCollectors} collectors have exceptionally low penalties and deserve recognition.` : 
                    "Several collectors are demonstrating excellent performance with minimal penalties."}
                </p>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg">
                <h3 className="font-semibold text-yellow-800 mb-2">Process Improvement</h3>
                <p className="text-sm text-yellow-700">
                  {penaltyBreakdownData[0].value > penaltyBreakdownData[1].value ? 
                    "Focus on reducing positive variance penalties through better collection practices." : 
                    "Address negative variance penalties by improving accuracy in measurements."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header - Made responsive */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold">Collector Payments</h1>
        <p className="text-muted-foreground text-sm sm:text-base">Manage collector payments and track disbursements</p>
      </div>

      {/* Navigation Tabs - Simplified and responsive */}
      <div className="bg-white rounded-xl shadow-lg">
        <div className="flex overflow-x-auto">
          {(['payments', 'analytics', 'penalty-analytics'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-4 py-3 sm:px-6 sm:py-4 font-medium capitalize transition-colors whitespace-nowrap ${
                activeTab === tab
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-gray-600 hover:text-gray-900'
              }`}
            >
              {tab === 'payments' && <DollarSign className="w-4 h-4 inline mr-2" />}
              {tab === 'analytics' && <BarChart3 className="w-4 h-4 inline mr-2" />}
              {tab === 'penalty-analytics' && <FileBarChart className="w-4 h-4 inline mr-2" />}
              <span className="hidden sm:inline">{tab === 'penalty-analytics' ? 'Penalty Analytics' : tab}</span>
              <span className="sm:hidden">
                {tab === 'payments' && 'Pay'}
                {tab === 'analytics' && 'Charts'}
                {tab === 'penalty-analytics' && 'Penalty'}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Payments Tab - Simplified and Focused */}
      {activeTab === 'payments' && renderPaymentsTab()}

      {/* Analytics Tab - Keep existing functionality */}
      {activeTab === 'analytics' && renderAnalyticsTab()}

      {/* Penalty Analytics Tab - New functionality */}
      {activeTab === 'penalty-analytics' && renderPenaltyAnalyticsTab()}

      {/* Payment History Modal */}
      {renderPaymentHistoryModal()}

    </div>
  );
}