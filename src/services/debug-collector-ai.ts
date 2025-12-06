import { supabase } from '@/integrations/supabase/client';

export const debugCollectorAI = async (staffId: string) => {
  try {
    console.log('Debugging collector AI with staffId:', staffId);
    
    // Check if the staff record exists
    const { data: staffData, error: staffError } = await supabase
      .from('staff')
      .select('id, user_id')
      .eq('id', staffId)
      .single();
    
    if (staffError) {
      console.error('Error fetching staff record:', staffError);
      return;
    }
    
    console.log('Staff record:', staffData);
    
    // Check the authenticated user
    const { data: { user } } = await supabase.auth.getUser();
    console.log('Authenticated user:', user?.id);
    
    // Check if the staff record's user_id matches the authenticated user
    if (staffData && user) {
      console.log('Staff user_id matches auth user:', staffData.user_id === user.id);
    }
    
    // Try to check if we can access collector_api_keys
    const { data: apiKeysData, error: apiKeysError } = await supabase
      .from('collector_api_keys')
      .select('*')
      .eq('staff_id', staffId);
    
    if (apiKeysError) {
      console.error('Error accessing collector_api_keys:', apiKeysError);
    } else {
      console.log('API keys data:', apiKeysData);
    }
    
  } catch (error) {
    console.error('Debug error:', error);
  }
};