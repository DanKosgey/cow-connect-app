import { useState, useCallback } from 'react';
import { generateValidationCode, validateQuantity, validateCoordinates, isDuplicateCollection } from '@/utils/validation';
import { generateGPSValidationCode } from '@/utils/gpsValidation';
import { useIndexedDB } from './useIndexedDB';
import { Collection } from '@/types';

interface CollectionSubmissionData {
  farmerId: string;
  farmerName: string;
  staffId: string;
  liters: number;
  gpsLatitude: number;
  gpsLongitude: number;
  temperature: number;
  fatContent?: number;
  proteinContent?: number;
  notes?: string;
}

interface UseCollectionSubmissionReturn {
  submitCollection: (data: CollectionSubmissionData) => Promise<{ success: boolean; validationCode?: string; error?: string }>;
  loading: boolean;
  error: string | null;
}

export const useCollectionSubmission = (apiService: any): UseCollectionSubmissionReturn => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { addCollection: saveToIndexedDB, isInitialized: dbInitialized } = useIndexedDB();

  const submitCollection = useCallback(async (data: CollectionSubmissionData) => {
    setLoading(true);
    setError(null);

    try {
      // Validate inputs
      if (!validateQuantity(data.liters.toString())) {
        throw new Error('Invalid quantity. Please enter a positive number.');
      }

      if (!validateCoordinates(data.gpsLatitude, data.gpsLongitude)) {
        throw new Error('Invalid GPS coordinates.');
      }

      // Check for duplicate collection
      const isDuplicate = await isDuplicateCollection(data.farmerId, new Date().toISOString(), apiService);
      if (isDuplicate) {
        throw new Error('A collection has already been recorded for this farmer today.');
      }

      // Generate validation code with GPS coordinates for enhanced verification
      const validationCode = generateGPSValidationCode(data.gpsLatitude, data.gpsLongitude);

      // Prepare collection payload
      const collectionPayload = {
        farmer_id: data.farmerId,
        staff_id: data.staffId,
        liters: data.liters,
        gps_latitude: data.gpsLatitude,
        gps_longitude: data.gpsLongitude,
        temperature: data.temperature,
        fat_content: data.fatContent,
        protein_content: data.proteinContent,
        validation_code: validationCode,
        quality_grade: 'A', // Will be calculated by backend
        timestamp: new Date().toISOString()
      };

      // Save to IndexedDB for offline capability
      if (dbInitialized) {
        try {
          await saveToIndexedDB({
            id: `offline-${Date.now()}`,
            farmerId: data.farmerId,
            farmerName: data.farmerName,
            staffId: data.staffId,
            liters: data.liters,
            gpsLatitude: data.gpsLatitude,
            gpsLongitude: data.gpsLongitude,
            validationCode,
            qualityGrade: 'A',
            temperature: data.temperature,
            fatContent: data.fatContent,
            proteinContent: data.proteinContent,
            timestamp: new Date().toISOString(),
            synced: false
          });
        } catch (err) {
          console.error('Failed to save to IndexedDB:', err);
        }
      }

      // Submit to backend
      await apiService.Collections.create(collectionPayload);

      setLoading(false);
      return { success: true, validationCode };
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to submit collection';
      setError(errorMessage);
      setLoading(false);
      return { success: false, error: errorMessage };
    }
  }, [apiService, dbInitialized, saveToIndexedDB]);

  return {
    submitCollection,
    loading,
    error
  };
};