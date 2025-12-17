import { supabase } from '@/integrations/supabase/client';

/**
 * Analyze a milk collection photo to verify it matches the recorded liters
 * This function calls our secure Edge Function instead of the Google API directly
 * @param staffId - The collector's staff ID
 * @param imageBase64 - Base64 encoded image
 * @param recordedLiters - The liters recorded by the collector
 * @returns Analysis result with verification status
 */
export const analyzeMilkCollectionPhoto = async (
  staffId: string,
  imageBase64: string,
  recordedLiters: number
): Promise<{
  isValid: boolean;
  confidence: number;
  explanation: string;
  suggestedLiters?: number;
}> => {
  try {
    // Call our secure Edge Function
    const { data, error } = await supabase.functions.invoke('ai-verification', {
      body: {
        staffId,
        imageBase64,
        recordedLiters
      }
    });

    if (error) {
      throw new Error(error.message || 'Failed to call AI verification service');
    }

    return data as {
      isValid: boolean;
      confidence: number;
      explanation: string;
      suggestedLiters?: number;
    };
  } catch (error) {
    console.error('Error analyzing milk collection photo:', error);
    throw error;
  }
};

/**
 * Get general AI assistance for collectors
 * @param staffId - The collector's staff ID
 * @param prompt - The user's question or request
 * @returns AI-generated response
 */
export const getCollectorAIAssistance = async (
  staffId: string,
  prompt: string
): Promise<string> => {
  // This function would need to be implemented similarly if we want to move it to the Edge Function
  // For now, we'll keep it as a placeholder
  throw new Error('This feature is not yet implemented in the secure backend version');
};