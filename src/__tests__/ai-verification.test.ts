import { verifyCollectionPhoto, getLatestAIInstructions, updateAIInstructions } from '@/services/ai/gemini-service';
import { supabase } from '@/integrations/supabase/client';

// Mock the Google Generative AI library
jest.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: jest.fn().mockImplementation(() => ({
    getGenerativeModel: jest.fn().mockReturnValue({
      generateContent: jest.fn().mockResolvedValue({
        response: {
          text: jest.fn().mockReturnValue(JSON.stringify({
            estimatedLiters: 10,
            matchesRecorded: true,
            confidence: 0.95,
            explanation: "The image shows a standard 10L milk container that appears to be full.",
            verificationPassed: true
          }))
        }
      })
    })
  })),
  HarmCategory: {
    HARM_CATEGORY_HARASSMENT: 'harassment',
    HARM_CATEGORY_HATE_SPEECH: 'hate_speech',
    HARM_CATEGORY_SEXUALLY_EXPLICIT: 'sexually_explicit',
    HARM_CATEGORY_DANGEROUS_CONTENT: 'dangerous_content'
  },
  HarmBlockThreshold: {
    BLOCK_ONLY_HIGH: 'block_only_high'
  }
}));

// Mock fetch for image downloading
global.fetch = jest.fn(() =>
  Promise.resolve({
    blob: () => Promise.resolve(new Blob(['test'], { type: 'image/jpeg' })),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(10))
  } as any)
) as jest.Mock;

describe('AI Verification Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('verifyCollectionPhoto', () => {
    it('should successfully verify a collection photo', async () => {
      const result = await verifyCollectionPhoto('https://example.com/photo.jpg', 10);
      
      expect(result).toEqual({
        success: true,
        analysis: {
          estimatedLiters: 10,
          matchesRecorded: true,
          confidence: 0.95,
          explanation: "The image shows a standard 10L milk container that appears to be full.",
          verificationPassed: true
        }
      });
    });

    it('should handle API errors gracefully', async () => {
      // Mock an error in the AI service
      jest.spyOn(require('@google/generative-ai'), 'GoogleGenerativeAI').mockImplementationOnce(() => ({
        getGenerativeModel: jest.fn().mockReturnValue({
          generateContent: jest.fn().mockRejectedValue(new Error('API Error'))
        })
      }));

      const result = await verifyCollectionPhoto('https://example.com/photo.jpg', 10);
      
      expect(result).toEqual({
        success: false,
        error: 'API Error'
      });
    });
  });

  describe('getLatestAIInstructions', () => {
    it('should fetch AI instructions from the database', async () => {
      // Mock Supabase response
      const mockInstructions = {
        instructions: 'Test instructions',
        model_name: 'gemini-2.5-flash',
        confidence_threshold: 0.8
      };

      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: mockInstructions, error: null })
      } as any);

      const result = await getLatestAIInstructions();
      
      expect(result).toEqual({
        instructions: 'Test instructions',
        modelName: 'gemini-2.5-flash',
        confidenceThreshold: 0.8
      });
    });

    it('should return default instructions if database fetch fails', async () => {
      // Mock Supabase error
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: new Error('Database error') })
      } as any);

      const result = await getLatestAIInstructions();
      
      expect(result.instructions).toContain('You are an AI assistant that verifies milk collection photos');
    });
  });

  describe('updateAIInstructions', () => {
    it('should update AI instructions in the database', async () => {
      // Mock Supabase responses
      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        limit: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({ data: null, error: null })
      } as any);

      jest.spyOn(supabase, 'from').mockReturnValueOnce({
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis()
      } as any);

      const result = await updateAIInstructions('New instructions', 'gemini-2.5-pro', 0.9);
      
      expect(result).toEqual({ success: true });
    });
  });
});