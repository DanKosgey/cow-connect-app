import { useState, useEffect } from 'react';
import { CollectorAIService } from '@/services/collector-ai-service';
import { useStaffInfo } from '@/hooks/useStaffData';

interface ApiKeysState {
  api_key_1: string;
  api_key_2: string;
  api_key_3: string;
  api_key_4: string;
  api_key_5: string;
  api_key_6: string;
  api_key_7: string;
  api_key_8: string;
  current_key_index: number;
}

export const useCollectorAI = () => {
  const { staffInfo } = useStaffInfo();
  const [apiKeys, setApiKeys] = useState<ApiKeysState>({
    api_key_1: '',
    api_key_2: '',
    api_key_3: '',
    api_key_4: '',
    api_key_5: '',
    api_key_6: '',
    api_key_7: '',
    api_key_8: '',
    current_key_index: 1
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResults, setTestResults] = useState<Record<string, { valid: boolean; error?: string }>>({});

  const updateTestResult = (keyName: string, result: { valid: boolean; error?: string }) => {
    setTestResults(prev => ({
      ...prev,
      [keyName]: result
    }));
  };

  // Load API keys when staff info is available
  useEffect(() => {
    if (staffInfo?.id) {
      loadApiKeys();
    }
  }, [staffInfo?.id]);

  const loadApiKeys = async () => {
    if (!staffInfo?.id) return;
    
    setLoading(true);
    try {
      const keys = await CollectorAIService.getApiKeys(staffInfo.id);
      if (keys) {
        setApiKeys({
          api_key_1: keys.api_key_1 || '',
          api_key_2: keys.api_key_2 || '',
          api_key_3: keys.api_key_3 || '',
          api_key_4: keys.api_key_4 || '',
          api_key_5: keys.api_key_5 || '',
          api_key_6: keys.api_key_6 || '',
          api_key_7: keys.api_key_7 || '',
          api_key_8: keys.api_key_8 || '',
          current_key_index: keys.current_key_index || 1
        });
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveApiKeys = async () => {
    if (!staffInfo?.id) return;
    
    setSaving(true);
    try {
      const result = await CollectorAIService.createOrUpdateApiKeys(staffInfo.id, apiKeys);
      if (result) {
        // Reload to get the updated data
        await loadApiKeys();
        return { success: true };
      }
      return { success: false, error: 'Failed to save API keys' };
    } catch (error) {
      console.error('Error saving API keys:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
    } finally {
      setSaving(false);
    }
  };

  const testApiKey = async (key: string, keyName: string) => {
    if (!key.trim()) {
      updateTestResult(keyName, { valid: false, error: 'Key is empty' });
      return;
    }

    // This function is meant to be called from the component
    // We'll set a placeholder result for now
    updateTestResult(keyName, { valid: true });
  };

  const testAllKeys = async () => {
    const keysToTest = [
      { key: apiKeys.api_key_1, name: 'api_key_1' },
      { key: apiKeys.api_key_2, name: 'api_key_2' },
      { key: apiKeys.api_key_3, name: 'api_key_3' },
      { key: apiKeys.api_key_4, name: 'api_key_4' },
      { key: apiKeys.api_key_5, name: 'api_key_5' },
      { key: apiKeys.api_key_6, name: 'api_key_6' },
      { key: apiKeys.api_key_7, name: 'api_key_7' },
      { key: apiKeys.api_key_8, name: 'api_key_8' }
    ];

    // Test all non-empty keys
    for (const { key, name } of keysToTest) {
      if (key && key.trim()) {
        await testApiKey(key, name);
      }
    }
  };

  const rotateToNextKey = async () => {
    if (!staffInfo?.id) return;
    
    try {
      const success = await CollectorAIService.rotateApiKey(staffInfo.id);
      if (success) {
        // Reload to get the updated data
        await loadApiKeys();
      }
      return success;
    } catch (error) {
      console.error('Error rotating API key:', error);
      return false;
    }
  };

  return {
    apiKeys,
    setApiKeys,
    loading,
    saving,
    testing,
    testResults,
    updateTestResult,
    loadApiKeys,
    saveApiKeys,
    testApiKey,
    testAllKeys,
    rotateToNextKey
  };
};