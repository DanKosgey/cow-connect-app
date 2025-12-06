import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { verifyCollectionPhoto, getLatestAIInstructions } from '@/services/ai/gemini-service';

interface AIVerificationResult {
  estimatedLiters: number;
  matchesRecorded: boolean;
  confidence: number;
  explanation: string;
  verificationPassed: boolean;
}

export const useAIVerification = () => {
  const [verifying, setVerifying] = useState(false);
  const [verificationResult, setVerificationResult] = useState<AIVerificationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [aiInstructions, setAiInstructions] = useState<any>(null);

  const fetchAIInstructions = async () => {
    try {
      const instructions = await getLatestAIInstructions();
      setAiInstructions(instructions);
      return instructions;
    } catch (err) {
      console.error('Error fetching AI instructions:', err);
      return null;
    }
  };

  const verifyCollection = async (photoUrl: string, recordedLiters: number) => {
    try {
      setVerifying(true);
      setError(null);
      
      // Call the Gemini service to verify the collection
      const result = await verifyCollectionPhoto(photoUrl, recordedLiters);
      
      if (!result.success) {
        throw new Error(result.error || 'Failed to verify collection');
      }
      
      setVerificationResult(result.analysis);
      return result.analysis;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
      setError(errorMessage);
      console.error('AI verification error:', err);
      
      // Show a more user-friendly error message for API key issues
      if (errorMessage.includes('API key')) {
        // This will be caught by the form and shown to the user
        throw new Error('AI service configuration error. Please contact system administrator.');
      }
      
      return null;
    } finally {
      setVerifying(false);
    }
  };

  const saveVerificationResult = async (collectionId: string, result: AIVerificationResult, recordedLiters: number) => {
    try {
      // Save the verification result to the database
      const { data, error } = await supabase
        .from('ai_verification_results')
        .insert([{
          collection_id: collectionId,
          estimated_liters: result.estimatedLiters,
          recorded_liters: recordedLiters,
          matches_recorded: result.matchesRecorded,
          confidence_score: result.confidence,
          explanation: result.explanation,
          verification_passed: result.verificationPassed,
          status: result.verificationPassed ? 'verified' : 'flagged'
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
    verificationResult,
    error,
    aiInstructions,
    fetchAIInstructions,
    verifyCollection,
    saveVerificationResult,
  };
};