import { supabase } from '../integrations/supabase/client';

// Cache to avoid repeated checks
let approvedForCompanyColumnExists: boolean | null = null;

/**
 * Checks if the approved_for_company column exists in the collections table
 */
export async function checkApprovedForCompanyColumn(): Promise<boolean> {
  if (approvedForCompanyColumnExists !== null) {
    return approvedForCompanyColumnExists;
  }

  try {
    const { data, error } = await supabase
      .from('collections')
      .select('approved_for_company')
      .limit(1);

    if (error) {
      console.warn('approved_for_company column check failed:', error);
      approvedForCompanyColumnExists = false;
    } else {
      approvedForCompanyColumnExists = true;
    }
  } catch (err) {
    console.warn('Error checking approved_for_company column:', err);
    approvedForCompanyColumnExists = false;
  }

  return approvedForCompanyColumnExists;
}

/**
 * Safely fetches collections with approved_for_company filter if the column exists
 */
export async function fetchCollectionsWithApprovalFilter(selectQuery: string) {
  try {
    const columnExists = await checkApprovedForCompanyColumn();
    
    if (columnExists) {
      // Try to fetch with the filter
      const { data, error } = await supabase
        .from('collections')
        .select(selectQuery)
        .eq('approved_for_company', true)
        .order('collection_date', { ascending: false });

      if (!error) {
        return { data, error: null };
      }
      
      // If filter fails, fall back to fetching without filter
      console.warn('Failed to fetch collections with approved_for_company filter, falling back:', error);
    }
    
    // Fetch without the filter
    const { data, error } = await supabase
      .from('collections')
      .select(selectQuery)
      .order('collection_date', { ascending: false });
      
    return { data, error };
  } catch (error) {
    console.error('Error in fetchCollectionsWithApprovalFilter:', error);
    return { data: null, error };
  }
}