import { useState, useCallback } from 'react';
import { CollectionsAPI } from '@/services/ApiService';
import { useIndexedDB } from './useIndexedDB';
import { CollectionData } from '@/types/collection';

interface CollectionSubmissionResult {
  id: string;
  quality_grade: "A" | "B" | "C";
  calculated_price: number;
  quality_score: number;
  created_at: string;
  collection_point: string;
}

export const useCollectionSubmission = () => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const { addCollection, isInitialized } = useIndexedDB();

  const submitCollection = useCallback(
    async (data: CollectionData, farmerId: string): Promise<CollectionSubmissionResult | null> => {
      setIsSubmitting(true);
      setSubmissionError(null);

      try {
        // Try to submit to the server first
        const response = await CollectionsAPI.create({
          farmer_id: farmerId,
          volume: data.volume,
          temperature: data.temperature,
          fat_content: data.fat_content,
          protein_content: data.protein_content,
          ph_level: data.ph_level,
          location: data.location,
          notes: data.notes,
          recorded_at: new Date().toISOString(),
        });

        return response;
      } catch (error) {
        // If server submission fails, store in IndexedDB for offline support
        console.warn('Server submission failed, storing offline:', error);
        
        try {
          // Store in IndexedDB for later sync
          if (isInitialized) {
            const offlineRecord = {
              id: `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              farmerId,
              farmerName: '', // Would be populated in a real implementation
              staffId: '', // Would be populated in a real implementation
              liters: data.volume,
              gpsLatitude: data.location.latitude,
              gpsLongitude: data.location.longitude,
              validationCode: '', // Would be populated in a real implementation
              qualityGrade: 'C', // Default until synced
              temperature: data.temperature,
              timestamp: new Date().toISOString(),
              synced: false,
            };
            
            await addCollection(offlineRecord);
          }
          
          setSubmissionError('Data saved offline. Will sync when connection is restored.');
          return null;
        } catch (indexedDBError) {
          console.error('Failed to store offline:', indexedDBError);
          setSubmissionError('Failed to submit collection. Please try again.');
          return null;
        }
      } finally {
        setIsSubmitting(false);
      }
    },
    [addCollection, isInitialized]
  );

  return {
    submitCollection,
    isSubmitting,
    submissionError,
  };
};