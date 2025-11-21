// Utility functions for querying approved collections
import { supabase } from '@/integrations/supabase/client';

/**
 * Get approved collections with farmer and staff information
 */
export const getApprovedCollections = async (startDate?: string, endDate?: string) => {
  let query = supabase
    .from('collections')
    .select(`
      id,
      collection_id,
      farmer_id,
      staff_id,
      liters,
      quality_grade,
      rate_per_liter,
      total_amount,
      collection_date,
      status,
      approved_for_company,
      farmers (
        id,
        user_id,
        profiles (
          full_name,
          phone
        )
      ),
      staff (
        id,
        user_id,
        profiles (
          full_name
        )
      )
    `)
    .eq('approved_for_company', true); // Only fetch approved collections

  if (startDate) {
    query = query.gte('collection_date', startDate);
  }

  if (endDate) {
    query = query.lte('collection_date', endDate);
  }

  const { data, error } = await query.order('collection_date', { ascending: false });
  
  if (error) {
    throw error;
  }
  
  return data;
};

/**
 * Get approved collections summary statistics
 */
export const getApprovedCollectionsSummary = async (startDate?: string, endDate?: string) => {
  let query = supabase
    .from('collections')
    .select(`
      count(),
      sum(liters),
      sum(total_amount)
    `)
    .eq('approved_for_company', true); // Only count approved collections

  if (startDate) {
    query = query.gte('collection_date', startDate);
  }

  if (endDate) {
    query = query.lte('collection_date', endDate);
  }

  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  return {
    totalCollections: data[0]?.count || 0,
    totalLiters: data[0]?.sum?.liters || 0,
    totalAmount: data[0]?.sum?.total_amount || 0
  };
};

/**
 * Get daily approved collections trends
 */
export const getApprovedCollectionsTrends = async (startDate?: string, endDate?: string) => {
  let query = supabase
    .from('collections')
    .select(`
      collection_date,
      liters,
      total_amount,
      status
    `)
    .eq('approved_for_company', true) // Only fetch approved collections
    .order('collection_date', { ascending: true });

  if (startDate) {
    query = query.gte('collection_date', startDate);
  }

  if (endDate) {
    query = query.lte('collection_date', endDate);
  }

  const { data, error } = await query;
  
  if (error) {
    throw error;
  }
  
  return data;
};