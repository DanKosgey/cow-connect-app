import { useState } from 'react';
import { getCollectorAIAssistance } from '@/services/collector-gemini-service';
import { useStaffInfo } from '@/hooks/useStaffData';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

export const usePersonalizedAI = () => {
  const { staffInfo } = useStaffInfo();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<string>('');

  const getAIResponse = async (prompt: string): Promise<string> => {
    if (!staffInfo?.id) {
      throw new Error('Staff information not available');
    }

    if (!prompt.trim()) {
      throw new Error('Prompt cannot be empty');
    }

    setLoading(true);
    setError(null);
    setResponse('');

    try {
      const response = await getCollectorAIAssistance(staffInfo.id, prompt);
      setResponse(response);
      return response;
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to get AI response';
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    response,
    getAIResponse
  };
};