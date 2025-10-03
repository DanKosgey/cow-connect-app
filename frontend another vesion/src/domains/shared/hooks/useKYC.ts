import { useState, useCallback } from 'react';
import kycService from '@/services/kycService';

interface KYCUploadData {
  document_type: string;
  document_number: string;
  expiry_date: string;
  front_image: File;
  back_image?: File;
  selfie_image: File;
}

interface KYCResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  documents: Array<{
    id: string;
    type: string;
    url: string;
    uploaded_at: string;
  }>;
}

const useKYC = () => {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [kycStatus, setKycStatus] = useState<KYCResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const uploadDocuments = useCallback(async (
    farmerId: string, 
    data: KYCUploadData
  ) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await kycService.uploadDocuments(farmerId, data);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Small delay to show completion
      setTimeout(() => {
        setIsUploading(false);
        setKycStatus(response);
      }, 500);

      return response;
    } catch (err) {
      setIsUploading(false);
      setError(err instanceof Error ? err.message : 'Failed to upload documents');
      throw err;
    }
  }, []);

  const getKYCStatus = useCallback(async (farmerId: string) => {
    try {
      const response = await kycService.getKYCStatus(farmerId);
      setKycStatus(response);
      return response;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch KYC status');
      throw err;
    }
  }, []);

  const updateDocuments = useCallback(async (
    farmerId: string, 
    data: KYCUploadData
  ) => {
    setIsUploading(true);
    setError(null);
    setUploadProgress(0);

    try {
      // Simulate progress for better UX
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 90));
      }, 200);

      const response = await kycService.updateDocuments(farmerId, data);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      
      // Small delay to show completion
      setTimeout(() => {
        setIsUploading(false);
        setKycStatus(response);
      }, 500);

      return response;
    } catch (err) {
      setIsUploading(false);
      setError(err instanceof Error ? err.message : 'Failed to update documents');
      throw err;
    }
  }, []);

  const reset = useCallback(() => {
    setIsUploading(false);
    setUploadProgress(0);
    setKycStatus(null);
    setError(null);
  }, []);

  return {
    // State
    isUploading,
    uploadProgress,
    kycStatus,
    error,
    
    // Methods
    uploadDocuments,
    getKYCStatus,
    updateDocuments,
    reset
  };
};

export default useKYC;