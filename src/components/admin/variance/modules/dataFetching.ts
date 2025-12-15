import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

// Define interfaces
interface VarianceRecord {
  id: string;
  collection_id: string;
  collection_details: {
    collection_id: string;
    liters: number;
    collection_date: string;
    staff_id?: string;
    staff?: {
      profiles: {
        full_name: string;
      } | null;
    } | null;
    farmers: {
      full_name: string;
    } | null;
  } | null;
  staff_id: string;
  staff_details: {
    profiles: {
      full_name: string;
    } | null;
  } | null;
  company_received_liters: number;
  variance_liters: number;
  variance_percentage: number;
  variance_type: string;
  penalty_amount: number;
  approval_notes: string | null;
  approved_at: string;
}

interface CollectorPerformance {
  collector_id: string;
  collector_name: string;
  total_collections: number;
  total_variance: number;
  average_variance_percentage: number;
  total_penalty_amount: number;
  positive_variances: number;
  negative_variances: number;
  performance_score: number;
  last_collection_date: string;
}

interface VarianceSummary {
  total_variances: number;
  positive_variances: number;
  negative_variances: number;
  total_penalty_amount: number;
  average_variance_percentage: number;
}

interface VarianceTrendData {
  date: string;
  positive_variance_count: number;
  negative_variance_count: number;
  average_positive_variance: number;
  average_negative_variance: number;
  total_penalty_amount: number;
}

// Fetch collectors
export const fetchCollectors = async () => {
  try {
    const { data, error } = await supabase
      .from('staff')
      .select('id, profiles (full_name)')
      .order('full_name', { foreignTable: 'profiles' });

    if (error) {
      console.error('Error fetching collectors:', error);
      return [];
    }

    return (data || []).map((staff: any) => ({
      id: staff.id,
      full_name: staff.profiles?.full_name || 'Unknown Collector'
    }));
  } catch (error: any) {
    console.error('Error fetching collectors:', error);
    return [];
  }
};

// Fetch variance data
export const fetchVarianceData = async (
  user: any,
  currentPage: number,
  pageSize: number,
  dateRange: { from: string; to: string },
  filterCollector: string,
  filterVarianceType: string,
  searchTerm: string,
  showError: (title: string, message: string) => void
) => {
  if (!user?.id) return { data: [], count: 0 };

  try {
    // Calculate the range for pagination
    const from = (currentPage - 1) * pageSize;
    const to = from + pageSize - 1;

    // Build the query - simplified to avoid joins that cause schema cache issues
    let query = supabase
      .from('milk_approvals')
      .select(`
        id,
        collection_id,
        staff_id,
        company_received_liters,
        variance_liters,
        variance_percentage,
        variance_type,
        penalty_amount,
        approval_notes,
        approved_at
      `, { count: 'exact' })
      .gte('approved_at', `${dateRange.from}T00:00:00Z`)
      .lte('approved_at', `${dateRange.to}T23:59:59Z`)
      .order('approved_at', { ascending: false }); // Sort by approved date descending for latest first

    // Apply filters
    if (filterCollector && filterCollector !== 'all') {
      query = query.eq('staff_id', filterCollector);
    }
    
    if (filterVarianceType && filterVarianceType !== 'all') {
      query = query.eq('variance_type', filterVarianceType);
    }

    // Apply pagination
    const { data, error, count } = await query.range(from, to);

    if (error) {
      throw error;
    }

    // If no data, return early
    if (!data || data.length === 0) {
      return { data: [], count: 0 };
    }

    // Extract collection IDs and staff IDs
    const collectionIds = [...new Set(data.map(item => item.collection_id).filter(Boolean))] as string[];
    const staffIds = [...new Set([...data.map(item => item.staff_id).filter(Boolean)])] as string[];

    // Fetch collections data
    let collectionsData: any[] = [];
    if (collectionIds.length > 0) {
      const { data: collections, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          collection_id,
          liters,
          collection_date,
          staff_id,
          farmer_id
        `)
        .in('collection_id', collectionIds);

      if (collectionsError) {
        console.warn('Error fetching collections data:', collectionsError);
      } else {
        collectionsData = collections || [];
      }
    }

    // Fetch farmers data for the collections
    let farmersData: any[] = [];
    if (collectionsData.length > 0) {
      const farmerIds = [...new Set(collectionsData.map(c => c.farmer_id).filter(Boolean))] as string[];
      if (farmerIds.length > 0) {
        const { data: farmers, error: farmersError } = await supabase
          .from('farmers')
          .select(`
            id,
            full_name
          `)
          .in('id', farmerIds);

        if (farmersError) {
          console.warn('Error fetching farmers data:', farmersError);
        } else {
          farmersData = farmers || [];
        }
      }
    }

    // Fetch staff data for collections
    let collectionStaffData: any[] = [];
    if (collectionsData.length > 0) {
      const collectionStaffIds = [...new Set(collectionsData.map(c => c.staff_id).filter(Boolean))] as string[];
      if (collectionStaffIds.length > 0) {
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select(`
            id,
            profiles (full_name)
          `)
          .in('id', collectionStaffIds);

        if (staffError) {
          console.warn('Error fetching collection staff data:', staffError);
        } else {
          collectionStaffData = staff || [];
        }
      }
    }

    // Fetch staff data for approvals
    let approvalStaffData: any[] = [];
    if (staffIds.length > 0) {
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          profiles (full_name)
        `)
        .in('id', staffIds);

      if (staffError) {
        console.warn('Error fetching approval staff data:', staffError);
      } else {
        approvalStaffData = staff || [];
      }
    }

    // Create maps for quick lookup
    const collectionsMap = collectionsData.reduce((acc, collection) => {
      acc[collection.collection_id] = collection;
      return acc;
    }, {} as Record<string, any>);

    const farmersMap = farmersData.reduce((acc, farmer) => {
      acc[farmer.id] = farmer;
      return acc;
    }, {} as Record<string, any>);

    const collectionStaffMap = collectionStaffData.reduce((acc, staff) => {
      acc[staff.id] = staff;
      return acc;
    }, {} as Record<string, any>);

    const approvalStaffMap = approvalStaffData.reduce((acc, staff) => {
      acc[staff.id] = staff;
      return acc;
    }, {} as Record<string, any>);

    // Transform the data to match our interface
    let transformedData = (data || []).map((item: any) => {
      const collection = collectionsMap[item.collection_id];
      const farmer = collection && farmersMap[collection.farmer_id];
      const collectionStaff = collection && collectionStaffMap[collection.staff_id];
      const approvalStaff = approvalStaffMap[item.staff_id];

      return {
        ...item,
        collection_details: collection ? {
          collection_id: collection.collection_id,
          liters: collection.liters,
          collection_date: collection.collection_date,
          staff_id: collection.staff_id,
          staff: collectionStaff ? {
            profiles: {
              full_name: collectionStaff.profiles?.full_name || 'Unknown Staff'
            }
          } : null,
          farmers: farmer ? {
            full_name: farmer.full_name || 'Unknown Farmer'
          } : null
        } : null,
        staff_details: approvalStaff ? {
          profiles: {
            full_name: approvalStaff.profiles?.full_name || 'Unknown Staff'
          }
        } : null
      };
    });

    // Apply search term filter on client side
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      transformedData = transformedData.filter((variance: VarianceRecord) => 
        (variance.collection_details?.collection_id?.toLowerCase().includes(term)) ||
        (variance.collection_details?.farmers?.full_name?.toLowerCase().includes(term)) ||
        (variance.collection_details?.staff?.profiles?.full_name?.toLowerCase().includes(term)) ||
        (variance.staff_details?.profiles?.full_name?.toLowerCase().includes(term))
      );
    }

    return { data: transformedData, count: count || 0 };
  } catch (error: any) {
    console.error('Error fetching variances:', error);
    showError('Error', String(error?.message || 'Failed to fetch variances'));
    return { data: [], count: 0 };
  }
};

// Fetch summary data
export const fetchSummaryData = async (
  dateRange: { from: string; to: string },
  filterCollector: string,
  filterVarianceType: string,
  collectorPerformance: CollectorPerformance[],
  showError: (title: string, message: string) => void
) => {
  try {
    // Get summary statistics
    let summaryQuery = supabase
      .from('milk_approvals')
      .select('variance_type, variance_percentage, penalty_amount')
      .gte('approved_at', `${dateRange.from}T00:00:00Z`)
      .lte('approved_at', `${dateRange.to}T23:59:59Z`);

    if (filterCollector && filterCollector !== 'all') {
      summaryQuery = summaryQuery.eq('staff_id', filterCollector);
    }
    
    if (filterVarianceType && filterVarianceType !== 'all') {
      summaryQuery = summaryQuery.eq('variance_type', filterVarianceType);
    }

    const { data, error } = await summaryQuery;

    if (error) throw error;

    const summary: VarianceSummary = {
      total_variances: data?.length || 0,
      positive_variances: data?.filter((v: any) => v.variance_type === 'positive').length || 0,
      negative_variances: data?.filter((v: any) => v.variance_type === 'negative').length || 0,
      total_penalty_amount: data?.reduce((sum: number, v: any) => sum + (v.penalty_amount || 0), 0) || 0,
      average_variance_percentage: data?.length ? 
        data.reduce((sum: number, v: any) => sum + (v.variance_percentage || 0), 0) / data.length : 0
    };

    // Calculate performance metrics
    const totalCollections = data?.length || 0;
    const totalPenalties = data?.reduce((sum: number, v: any) => sum + (v.penalty_amount || 0), 0) || 0;
    const negativeVariances = data?.filter((v: any) => v.variance_type === 'negative').length || 0;
    
    const collectionAccuracy = totalCollections > 0 ? 
      ((totalCollections - negativeVariances) / totalCollections) * 100 : 0;
    const penaltyRate = totalCollections > 0 ? 
      (totalPenalties / totalCollections) : 0;
    const varianceConsistency = summary.average_variance_percentage;
    const collectorEfficiency = collectorPerformance.length > 0 ? 
      (collectorPerformance.reduce((sum, c) => sum + c.performance_score, 0) / collectorPerformance.length) : 0;
    
    const performanceMetrics = {
      collection_accuracy: parseFloat(collectionAccuracy.toFixed(2)),
      penalty_rate: parseFloat(penaltyRate.toFixed(2)),
      variance_consistency: parseFloat(varianceConsistency.toFixed(2)),
      collector_efficiency: parseFloat(collectorEfficiency.toFixed(2))
    };

    return { summary, performanceMetrics };
  } catch (error: any) {
    console.error('Error fetching summary data:', error);
    showError('Error', String(error?.message || 'Failed to fetch summary data'));
    return { 
      summary: {
        total_variances: 0,
        positive_variances: 0,
        negative_variances: 0,
        total_penalty_amount: 0,
        average_variance_percentage: 0
      },
      performanceMetrics: {
        collection_accuracy: 0,
        penalty_rate: 0,
        variance_consistency: 0,
        collector_efficiency: 0
      }
    };
  }
};

// Fetch collector performance
export const fetchCollectorPerformance = async (
  dateRange: { from: string; to: string },
  timeframe: string,
  filterCollector: string,
  filterVarianceType: string,
  collectorSortBy: string,
  collectorSortOrder: 'asc' | 'desc',
  showError: (title: string, message: string) => void
) => {
  try {
    // Calculate date range based on selected timeframe
    let startDate = new Date(dateRange.from);
    let endDate = new Date(dateRange.to);
    
    // Adjust dates based on timeframe selection
    switch (timeframe) {
      case 'daily':
        // For daily, we'll use the to date as the specific day
        startDate = new Date(dateRange.to);
        endDate = new Date(dateRange.to);
        break;
      case 'weekly':
        // For weekly, we'll use the to date as the end of the week
        endDate = new Date(dateRange.to);
        startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - 6); // 7 days including end date
        break;
      case 'monthly':
        // For monthly, we'll use the to date as the end of the month
        endDate = new Date(dateRange.to);
        startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
        break;
    }

    // Prepare parameters for the RPC call
    const rpcParams: any = {
      p_start_date: startDate.toISOString().split('T')[0],
      p_end_date: endDate.toISOString().split('T')[0]
    };
    
    // Add filter parameters if applicable
    if (filterCollector && filterCollector !== 'all') {
      rpcParams.p_staff_id = filterCollector;
    }
    
    if (filterVarianceType && filterVarianceType !== 'all') {
      rpcParams.p_variance_type = filterVarianceType;
    }

    // Use the new database function to calculate collector performance
    const { data: performanceData, error: performanceError } = await supabase
      .rpc('calculate_collector_performance', rpcParams);

    if (performanceError) {
      console.warn('Error calculating collector performance:', performanceError);
      return [];
    }

    // Transform the data to match our interface
    let transformedData = (performanceData || []).map((item: any) => ({
      collector_id: item.collector_id,
      collector_name: item.collector_name || 'Unknown Collector',
      total_collections: item.total_collections || 0,
      total_variance: parseFloat(item.total_variance?.toFixed(2) || '0.00'),
      average_variance_percentage: parseFloat(item.average_variance_percentage?.toFixed(2) || '0.00'),
      total_penalty_amount: parseFloat(item.total_penalty_amount?.toFixed(2) || '0.00'),
      positive_variances: item.positive_variances || 0,
      negative_variances: item.negative_variances || 0,
      performance_score: parseFloat(item.performance_score?.toFixed(0) || '0'),
      last_collection_date: item.last_collection_date || ''
    }));

    // Sort the data based on collectorSortBy and collectorSortOrder
    if (collectorSortBy) {
      transformedData.sort((a, b) => {
        let aValue: any = a[collectorSortBy as keyof CollectorPerformance];
        let bValue: any = b[collectorSortBy as keyof CollectorPerformance];
        
        // Handle special cases for sorting
        if (collectorSortBy === 'collector_name') {
          aValue = aValue?.toString().toLowerCase();
          bValue = bValue?.toString().toLowerCase();
        }
        
        if (aValue < bValue) {
          return collectorSortOrder === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return collectorSortOrder === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }

    return transformedData;
  } catch (error: any) {
    console.error('Error calculating collector performance:', error);
    return [];
  }
};

// Fetch trend data
export const fetchTrendData = async (
  dateRange: { from: string; to: string },
  showError: (title: string, message: string) => void
) => {
  try {
    const { data, error } = await supabase
      .from('milk_approvals')
      .select(`
        approved_at,
        variance_type,
        variance_liters,
        penalty_amount
      `, { count: 'exact' })
      .gte('approved_at', `${dateRange.from}T00:00:00Z`)
      .lte('approved_at', `${dateRange.to}T23:59:59Z`);

    if (error) throw error;

    const dailyData = data.reduce((acc: any, item: any) => {
      const date = format(new Date(item.approved_at), 'yyyy-MM-dd');
      if (!acc[date]) {
        acc[date] = {
          date,
          positive_variance_count: 0,
          negative_variance_count: 0,
          average_positive_variance: 0,
          average_negative_variance: 0,
          total_penalty_amount: 0,
          positive_variance_sum: 0,
          negative_variance_sum: 0,
        };
      }

      if (item.variance_type === 'positive') {
        acc[date].positive_variance_count += 1;
        acc[date].positive_variance_sum += item.variance_liters;
      } else if (item.variance_type === 'negative') {
        acc[date].negative_variance_count += 1;
        acc[date].negative_variance_sum += item.variance_liters;
      }

      acc[date].total_penalty_amount += item.penalty_amount;

      return acc;
    }, {});

    const trendData = Object.values(dailyData).map((item: any) => ({
      date: item.date,
      positive_variance_count: item.positive_variance_count,
      negative_variance_count: item.negative_variance_count,
      average_positive_variance: item.positive_variance_count > 0 ? 
        item.positive_variance_sum / item.positive_variance_count : 0,
      average_negative_variance: item.negative_variance_count > 0 ? 
        item.negative_variance_sum / item.negative_variance_count : 0,
      total_penalty_amount: item.total_penalty_amount,
    }));

    return trendData;
  } catch (error: any) {
    console.error('Error fetching trend data:', error);
    showError('Error', String(error?.message || 'Failed to fetch trend data'));
    return [];
  }
};

// Fetch comparison data
export const fetchComparisonData = async (
  dateRange: { from: string; to: string },
  comparisonPeriod: { from: string; to: string },
  showError: (title: string, message: string) => void
) => {
  try {
    const { data: currentData, error } = await supabase
      .from('milk_approvals')
      .select(`
        variance_type,
        variance_liters,
        penalty_amount
      `, { count: 'exact' })
      .gte('approved_at', `${dateRange.from}T00:00:00Z`)
      .lte('approved_at', `${dateRange.to}T23:59:59Z`);

    if (error) throw error;

    const currentSummary: VarianceSummary = {
      total_variances: currentData?.length || 0,
      positive_variances: currentData?.filter((v: any) => v.variance_type === 'positive').length || 0,
      negative_variances: currentData?.filter((v: any) => v.variance_type === 'negative').length || 0,
      total_penalty_amount: currentData?.reduce((sum: number, v: any) => sum + (v.penalty_amount || 0), 0) || 0,
      average_variance_percentage: currentData?.length ? 
        currentData.reduce((sum: number, v: any) => sum + (v.variance_percentage || 0), 0) / currentData.length : 0
    };

    const { data: previousData, error: previousError } = await supabase
      .from('milk_approvals')
      .select(`
        variance_type,
        variance_liters,
        penalty_amount
      `, { count: 'exact' })
      .gte('approved_at', `${comparisonPeriod.from}T00:00:00Z`)
      .lte('approved_at', `${comparisonPeriod.to}T23:59:59Z`);

    if (previousError) throw previousError;

    const previousSummary: VarianceSummary = {
      total_variances: previousData?.length || 0,
      positive_variances: previousData?.filter((v: any) => v.variance_type === 'positive').length || 0,
      negative_variances: previousData?.filter((v: any) => v.variance_type === 'negative').length || 0,
      total_penalty_amount: previousData?.reduce((sum: number, v: any) => sum + (v.penalty_amount || 0), 0) || 0,
      average_variance_percentage: previousData?.length ? 
        previousData.reduce((sum: number, v: any) => sum + (v.variance_percentage || 0), 0) / previousData.length : 0
    };

    return { currentSummary, previousSummary };
  } catch (error: any) {
    console.error('Error fetching comparison data:', error);
    showError('Error', String(error?.message || 'Failed to fetch comparison data'));
    return { 
      currentSummary: {
        total_variances: 0,
        positive_variances: 0,
        negative_variances: 0,
        total_penalty_amount: 0,
        average_variance_percentage: 0
      },
      previousSummary: {
        total_variances: 0,
        positive_variances: 0,
        negative_variances: 0,
        total_penalty_amount: 0,
        average_variance_percentage: 0
      }
    };
  }
};

// Fetch farmer history
export const fetchFarmerHistory = async (
  collectionId: string,
  showError: (title: string, message: string) => void
) => {
  try {
    const { data, error } = await supabase
      .from('milk_approvals')
      .select(`
        id,
        collection_id,
        staff_id,
        company_received_liters,
        variance_liters,
        variance_percentage,
        variance_type,
        penalty_amount,
        approval_notes,
        approved_at
      `)
      .eq('collection_id', collectionId);

    if (error) {
      throw error;
    }

    // If no data, return early
    if (!data || data.length === 0) {
      return [];
    }

    // Extract staff IDs
    const staffIds = [...new Set([...data.map(item => item.staff_id).filter(Boolean)])] as string[];

    // Fetch collections data
    let collectionsData: any[] = [];
    const { data: collections, error: collectionsError } = await supabase
      .from('collections')
      .select(`
        collection_id,
        liters,
        collection_date,
        staff_id,
        farmer_id
      `)
      .eq('collection_id', collectionId);

    if (collectionsError) {
      console.warn('Error fetching collections data:', collectionsError);
    } else {
      collectionsData = collections || [];
    }

    // Fetch farmers data for the collections
    let farmersData: any[] = [];
    if (collectionsData.length > 0) {
      const farmerIds = [...new Set(collectionsData.map(c => c.farmer_id).filter(Boolean))] as string[];
      if (farmerIds.length > 0) {
        const { data: farmers, error: farmersError } = await supabase
          .from('farmers')
          .select(`
            id,
            full_name
          `)
          .in('id', farmerIds);

        if (farmersError) {
          console.warn('Error fetching farmers data:', farmersError);
        } else {
          farmersData = farmers || [];
        }
      }
    }

    // Fetch staff data for collections
    let collectionStaffData: any[] = [];
    if (collectionsData.length > 0) {
      const collectionStaffIds = [...new Set(collectionsData.map(c => c.staff_id).filter(Boolean))] as string[];
      if (collectionStaffIds.length > 0) {
        const { data: staff, error: staffError } = await supabase
          .from('staff')
          .select(`
            id,
            profiles (full_name)
          `)
          .in('id', collectionStaffIds);

        if (staffError) {
          console.warn('Error fetching collection staff data:', staffError);
        } else {
          collectionStaffData = staff || [];
        }
      }
    }

    // Fetch staff data for approvals
    let approvalStaffData: any[] = [];
    if (staffIds.length > 0) {
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select(`
          id,
          profiles (full_name)
        `)
        .in('id', staffIds);

      if (staffError) {
        console.warn('Error fetching approval staff data:', staffError);
      } else {
        approvalStaffData = staff || [];
      }
    }

    // Create maps for quick lookup
    const collectionsMap = collectionsData.reduce((acc, collection) => {
      acc[collection.collection_id] = collection;
      return acc;
    }, {} as Record<string, any>);

    const farmersMap = farmersData.reduce((acc, farmer) => {
      acc[farmer.id] = farmer;
      return acc;
    }, {} as Record<string, any>);

    const collectionStaffMap = collectionStaffData.reduce((acc, staff) => {
      acc[staff.id] = staff;
      return acc;
    }, {} as Record<string, any>);

    const approvalStaffMap = approvalStaffData.reduce((acc, staff) => {
      acc[staff.id] = staff;
      return acc;
    }, {} as Record<string, any>);

    // Transform the data to match our interface
    const transformedData = (data || []).map((item: any) => {
      const collection = collectionsMap[item.collection_id];
      const farmer = collection && farmersMap[collection.farmer_id];
      const collectionStaff = collection && collectionStaffMap[collection.staff_id];
      const approvalStaff = approvalStaffMap[item.staff_id];

      return {
        ...item,
        collection_details: collection ? {
          collection_id: collection.collection_id,
          liters: collection.liters,
          collection_date: collection.collection_date,
          staff_id: collection.staff_id,
          staff: collectionStaff ? {
            profiles: {
              full_name: collectionStaff.profiles?.full_name || 'Unknown Staff'
            }
          } : null,
          farmers: farmer ? {
            full_name: farmer.full_name || 'Unknown Farmer'
          } : null
        } : null,
        staff_details: approvalStaff ? {
          profiles: {
            full_name: approvalStaff.profiles?.full_name || 'Unknown Staff'
          }
        } : null
      };
    });

    return transformedData;
  } catch (error: any) {
    console.error('Error fetching farmer history:', error);
    showError('Error', String(error?.message || 'Failed to fetch farmer history'));
    return [];
  }
};