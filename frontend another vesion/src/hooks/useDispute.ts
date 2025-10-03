import { useState } from 'react';
import apiService from '@/services/ApiService';

interface DisputeData {
  collectionId: string;
  reason: string;
  description: string;
}

interface DisputeResponse {
  id: string;
  collection_id: string;
  reason: string;
  description: string;
  farmer_id: string;
  status: string;
  created_at: string;
}

export const useDispute = (farmerId: string) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const submitDispute = async (disputeData: DisputeData) => {
    setLoading(true);
    setError(null);
    setSuccess(false);

    try {
      // Create the dispute payload
      const payload = {
        collection_id: disputeData.collectionId,
        reason: disputeData.reason,
        description: disputeData.description,
        farmer_id: farmerId
      };

      // Submit dispute to backend
      await apiService.Dispute.submit(payload);
      
      setSuccess(true);
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to submit dispute';
      setError(errorMessage);
      return false;
    } finally {
      setLoading(false);
    }
  };

  return {
    submitDispute,
    loading,
    error,
    success
  };
};