import { useState } from 'react';
import { analyzeMilkCollectionPhoto } from '@/services/collector-gemini-service';
import { supabase } from '@/integrations/supabase/client';

interface CollectorAIVerificationResult {
  isValid: boolean;
  confidence: number;
  explanation: string;
  suggestedLiters?: number;
}

export const useCollectorAIVerification = () => {
  const [verifying, setVerifying] = useState(false);
  const [progress, setProgress] = useState<string>(''); // Track verification progress
  const [error, setError] = useState<string | null>(null);

  const verifyCollectionWithCollectorAI = async (
    staffId: string,
    imageData: string,
    recordedLiters: number
  ) => {
    try {
      setVerifying(true);
      setProgress('Initializing AI verification...');
      setError(null);
      
      // Update progress
      setProgress('Analyzing milk collection photo...');
      
      // Call the collector-specific Gemini service to verify the collection
      const result = await analyzeMilkCollectionPhoto(staffId, imageData, recordedLiters);
      
      setProgress('Analysis complete');
      
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('Collector AI verification error:', err);
      
      // Show more specific error messages for different types of issues
      if (errorMessage.includes('API key not valid') || errorMessage.includes('API_KEY_INVALID')) {
        throw new Error('Invalid API key. Please check your API keys in the AI settings panel.');
      } else if (errorMessage.includes('No valid API keys available')) {
        throw new Error('No valid API keys available. Please add your Gemini API keys in the AI settings panel.');
      } else if (errorMessage.includes('429') || errorMessage.includes('quota')) {
        throw new Error('API quota exceeded. Please add more API keys or wait for quota to reset.');
      } else if (errorMessage.includes('leaked') || errorMessage.includes('forbidden') || errorMessage.includes('403')) {
        throw new Error('API key has been blocked due to security concerns. Please add a new API key in the AI settings panel.');
      } else if (errorMessage.includes('API key')) {
        // Generic API key error
        throw new Error('AI service configuration error. Please check your API keys in the AI settings panel.');
      } else if (errorMessage.includes('parse') || errorMessage.includes('JSON') || errorMessage.includes('extract')) {
        // Parsing error - ask for clearer photo
        throw new Error('AI could not analyze your photo. Please retake a clearer photo and try again.');
      }
      
      // For other errors, re-throw the original error
      throw err;
    } finally {
      setVerifying(false);
      setProgress(''); // Clear progress message
    }
  };

  const saveVerificationResult = async (collectionId: string, result: CollectorAIVerificationResult, recordedLiters: number) => {
    try {
      // Save the verification result to the database
      const { data, error } = await supabase
        .from('ai_verification_results')
        .insert([{
          collection_id: collectionId,
          estimated_liters: result.suggestedLiters,
          recorded_liters: recordedLiters,
          matches_recorded: result.isValid,
          confidence_score: result.confidence,
          explanation: result.explanation,
          verification_passed: result.isValid,
          status: result.isValid ? 'verified' : 'flagged'
        }])
        .select()
        .single();

      if (error) throw error;

      // Link the verification result to the collection
      if (data) {
        await supabase
          .from('collections')
          .update({ ai_verification_id: data.id })
          .eq('id', collectionId);
      }

      return data;
    } catch (err) {
      console.error('Error saving verification result:', err);
      throw err;
    }
  };

  return {
    verifying,
    progress,
    error,
    verifyCollectionWithCollectorAI,
    saveVerificationResult,
  };
};