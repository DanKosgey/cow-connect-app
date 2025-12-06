import { supabase } from '@/integrations/supabase/client';
// Define the collector_api_keys table structure inline since it's not in the generated types yet
interface CollectorApiKeys {
  id: string;
  staff_id: string;
  api_key_1: string | null;
  api_key_2: string | null;
  api_key_3: string | null;
  api_key_4: string | null;
  api_key_5: string | null;
  api_key_6: string | null;
  api_key_7: string | null;
  api_key_8: string | null;
  current_key_index: number | null;
  created_at: string;
  updated_at: string;
}

interface InsertCollectorApiKeys {
  id?: string;
  staff_id: string;
  api_key_1?: string | null;
  api_key_2?: string | null;
  api_key_3?: string | null;
  api_key_4?: string | null;
  api_key_5?: string | null;
  api_key_6?: string | null;
  api_key_7?: string | null;
  api_key_8?: string | null;
  current_key_index?: number | null;
  created_at?: string;
  updated_at?: string;
}

interface UpdateCollectorApiKeys {
  id?: string;
  staff_id?: string;
  api_key_1?: string | null;
  api_key_2?: string | null;
  api_key_3?: string | null;
  api_key_4?: string | null;
  api_key_5?: string | null;
  api_key_6?: string | null;
  api_key_7?: string | null;
  api_key_8?: string | null;
  current_key_index?: number | null;
  created_at?: string;
  updated_at?: string;
}

export class CollectorAIService {
  /**
   * Get API keys for the current collector
   */
  static async getApiKeys(staffId: string): Promise<CollectorApiKeys | null> {
    console.log('Fetching collector API keys for staff ID:', staffId);
    
    const { data, error } = await supabase
      .from('collector_api_keys')
      .select('*')
      .eq('staff_id', staffId)
      .single();

    if (error) {
      console.error('Error fetching collector API keys:', error);
      return null;
    }

    console.log('Successfully fetched collector API keys:', data);
    return data;
  }

  static async createOrUpdateApiKeys(
    staffId: string,
    keys: Partial<{
      api_key_1: string | null;
      api_key_2: string | null;
      api_key_3: string | null;
      api_key_4: string | null;
      api_key_5: string | null;
      api_key_6: string | null;
      api_key_7: string | null;
      api_key_8: string | null;
    }>
  ): Promise<CollectorApiKeys | null> {
    try {
      console.log('Creating/updating collector API keys for staff ID:', staffId);
      
      // First check if a record already exists for this staff
      const { data: existingData, error: selectError } = await supabase
        .from('collector_api_keys')
        .select('id')
        .eq('staff_id', staffId)
        .maybeSingle();

      if (selectError) {
        console.error('Error checking for existing collector API keys:', selectError);
        return null;
      }

      console.log('Existing API keys record:', existingData);

      if (existingData) {
        // Record exists, update it
        console.log('Updating existing collector API keys');
        const { data: updateData, error: updateError } = await supabase
          .from('collector_api_keys')
          .update({
            ...keys,
            updated_at: new Date().toISOString()
          })
          .eq('staff_id', staffId)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating collector API keys:', updateError);
          return null;
        }

        console.log('Successfully updated collector API keys:', updateData);
        return updateData;
      } else {
        // No record exists, insert a new one
        console.log('Inserting new collector API keys');
        const { data: insertData, error: insertError } = await supabase
          .from('collector_api_keys')
          .insert([
            {
              staff_id: staffId,
              ...keys,
              updated_at: new Date().toISOString()
            }
          ])
          .select()
          .single();

        if (insertError) {
          console.error('Error inserting collector API keys:', insertError);
          return null;
        }

        console.log('Successfully inserted collector API keys:', insertData);
        return insertData;
      }
    } catch (err) {
      console.error('Error creating/updating collector API keys:', err);
      return null;
    }
  }

  static async getCurrentApiKey(staffId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('get_current_api_key', {
      staff_uuid: staffId
    });

    if (error) {
      console.error('Error getting current API key:', error);
      return null;
    }

    return data;
  }

  static async rotateApiKey(staffId: string): Promise<boolean> {
    const { error } = await supabase.rpc('rotate_api_key', {
      staff_uuid: staffId
    });

    if (error) {
      console.error('Error rotating API key:', error);
      return false;
    }

    return true;
  }

  static async deleteApiKeys(staffId: string): Promise<boolean> {
    console.log('Deleting collector API keys for staff ID:', staffId);
    
    const { error } = await supabase
      .from('collector_api_keys')
      .delete()
      .eq('staff_id', staffId);

    if (error) {
      console.error('Error deleting collector API keys:', error);
      return false;
    }

    console.log('Successfully deleted collector API keys for staff ID:', staffId);
    return true;
  }

  static async testApiKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
    try {
      // Import GoogleGenerativeAI dynamically to avoid issues in non-browser environments
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      
      // Initialize Gemini AI with the provided API key
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      // Test with a simple prompt
      const result = await model.generateContent("Say hello world");
      const response = await result.response;
      const text = response.text();
      
      return { valid: true };
    } catch (error: any) {
      console.error('Error testing API key:', error);
      return { 
        valid: false, 
        error: error.message || 'Invalid API key' 
      };
    }
  }
}