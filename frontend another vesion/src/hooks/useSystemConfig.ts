import { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ConfigAPI } from '@/services/ApiService';
import { 
  SystemConfiguration, 
  PricingConfig, 
  QualityStandards, 
  NotificationConfig, 
  IntegrationConfig,
  ConfigUpdateResponse
} from '@/types/systemConfig';

interface UseSystemConfigProps {
  refetchInterval?: number;
}

export const useSystemConfig = ({
  refetchInterval = 60000 // 1 minute
}: UseSystemConfigProps = {}) => {
  const queryClient = useQueryClient();
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewData, setPreviewData] = useState<any>(null);

  // Fetch current system configuration
  const { data, isLoading, error, refetch } = useQuery<SystemConfiguration>({
    queryKey: ['system-config'],
    queryFn: ConfigAPI.getSystemConfig,
    refetchInterval,
    staleTime: 30000, // Consider data stale after 30 seconds
  });

  // Update pricing configuration
  const { mutate: updatePricing, isPending: isUpdatingPricing } = useMutation({
    mutationFn: ConfigAPI.updatePricingConfig,
    onSuccess: (response) => {
      // Update the cache with the new configuration
      queryClient.setQueryData(['system-config'], (oldData: SystemConfiguration | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          pricing: response.updated_config
        };
      });
      
      // Show preview of impact
      setPreviewData(response);
      setIsPreviewOpen(true);
    },
    onError: (error) => {
      console.error('Failed to update pricing configuration:', error);
    }
  });

  // Update quality standards
  const { mutate: updateQualityStandards, isPending: isUpdatingQuality } = useMutation({
    mutationFn: ConfigAPI.updateQualityStandards,
    onSuccess: (response) => {
      // Update the cache with the new configuration
      queryClient.setQueryData(['system-config'], (oldData: SystemConfiguration | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          quality_standards: response.updated_standards
        };
      });
    },
    onError: (error) => {
      console.error('Failed to update quality standards:', error);
    }
  });

  // Update notification settings
  const { mutate: updateNotifications, isPending: isUpdatingNotifications } = useMutation({
    mutationFn: ConfigAPI.updateNotificationSettings,
    onSuccess: (response) => {
      // Update the cache with the new configuration
      queryClient.setQueryData(['system-config'], (oldData: SystemConfiguration | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          notification_settings: response
        };
      });
    },
    onError: (error) => {
      console.error('Failed to update notification settings:', error);
    }
  });

  // Update integration settings
  const { mutate: updateIntegrations, isPending: isUpdatingIntegrations } = useMutation({
    mutationFn: ConfigAPI.updateIntegrationSettings,
    onSuccess: (response) => {
      // Update the cache with the new configuration
      queryClient.setQueryData(['system-config'], (oldData: SystemConfiguration | undefined) => {
        if (!oldData) return oldData;
        return {
          ...oldData,
          integration_settings: response
        };
      });
    },
    onError: (error) => {
      console.error('Failed to update integration settings:', error);
    }
  });

  // Reset configuration to default
  const resetToDefault = useCallback(() => {
    // In a real implementation, this would call an API endpoint
    console.log('Resetting configuration to default values');
  }, []);

  // Export configuration
  const exportConfig = useCallback(async () => {
    try {
      if (!data) return;
      
      // Create JSON content
      const jsonContent = JSON.stringify(data, null, 2);
      
      // Create download link
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `system-config-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Error exporting configuration:', err);
    }
  }, [data]);

  // Import configuration
  const importConfig = useCallback(async (file: File) => {
    try {
      const content = await file.text();
      const config = JSON.parse(content);
      
      // Validate the imported configuration
      // In a real implementation, this would be more comprehensive
      if (!config.pricing || !config.quality_standards) {
        throw new Error('Invalid configuration file format');
      }
      
      // Update the configuration
      // This would typically involve multiple API calls
      console.log('Imported configuration:', config);
      refetch();
    } catch (err) {
      console.error('Error importing configuration:', err);
      throw err;
    }
  }, [refetch]);

  // Close preview
  const closePreview = useCallback(() => {
    setIsPreviewOpen(false);
    setPreviewData(null);
  }, []);

  return {
    // Data
    data,
    isLoading,
    error,
    
    // Mutations
    updatePricing,
    isUpdatingPricing,
    updateQualityStandards,
    isUpdatingQuality,
    updateNotifications,
    isUpdatingNotifications,
    updateIntegrations,
    isUpdatingIntegrations,
    
    // Actions
    refetch,
    resetToDefault,
    exportConfig,
    importConfig,
    closePreview,
    
    // Preview
    isPreviewOpen,
    previewData,
    setIsPreviewOpen,
  };
};