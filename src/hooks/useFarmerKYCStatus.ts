import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface FarmerKYCStatus {
  kycStatus: 'pending' | 'approved' | 'rejected' | null;
  isLoading: boolean;
  error: string | null;
}

export const useFarmerKYCStatus = (userId: string | null): FarmerKYCStatus => {
  const [status, setStatus] = useState<FarmerKYCStatus>({
    kycStatus: null,
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const fetchKYCStatus = async () => {
      if (!userId) {
        setStatus({
          kycStatus: null,
          isLoading: false,
          error: 'No user ID provided'
        });
        return;
      }

      try {
        const { data, error } = await supabase
          .from('farmers')
          .select('kyc_status')
          .eq('user_id', userId);
          // Removed .single() to avoid PGRST116 error when no records found

        if (error) {
          setStatus({
            kycStatus: null,
            isLoading: false,
            error: error.message
          });
          return;
        }

        // Check if we have data and handle accordingly
        const farmerData = data && data.length > 0 ? data[0] : null;

        if (!farmerData) {
          setStatus({
            kycStatus: null,
            isLoading: false,
            error: 'Farmer record not found'
          });
          return;
        }

        setStatus({
          kycStatus: farmerData.kyc_status as 'pending' | 'approved' | 'rejected',
          isLoading: false,
          error: null
        });
      } catch (error: any) {
        setStatus({
          kycStatus: null,
          isLoading: false,
          error: error.message || 'Failed to fetch KYC status'
        });
      }
    };

    fetchKYCStatus();
  }, [userId]);

  return status;
};