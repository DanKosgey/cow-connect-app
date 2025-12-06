import { GoogleGenerativeAI, HarmBlockThreshold, HarmCategory } from '@google/generative-ai';
import { CollectorAIService } from '@/services/collector-ai-service';

// Safety settings for the AI model
const safetySettings = [
  {
    category: HarmCategory.HARM_CATEGORY_HARASSMENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
  {
    category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
    threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH,
  },
];

// Model configuration
const modelConfig = {
  temperature: 0.7,
  topK: 40,
  topP: 0.95,
  maxOutputTokens: 1024,
};

/**
 * Get the AI model with automatic API key rotation
 * This function will automatically rotate to the next API key if the current one fails
 * due to quota limits (429) or other errors
 */
const getModelWithRotation = async (staffId: string) => {
  let attempts = 0;
  const maxAttempts = 8; // Try all 8 keys maximum
  
  while (attempts < maxAttempts) {
    try {
      // Get current API key
      const apiKey = await CollectorAIService.getCurrentApiKey(staffId);
      
      if (!apiKey) {
        throw new Error('No valid API keys available');
      }
      
      // Initialize Gemini AI with the current API key
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        safetySettings,
        generationConfig: modelConfig,
      });
      
      return { model, apiKey };
    } catch (error: any) {
      console.error('Error initializing AI model:', error);
      
      // Check if it's a quota error (429) or invalid key error
      if (error.message?.includes('429') || 
          error.message?.includes('quota') || 
          error.message?.includes('API key not valid') ||
          error.message?.includes('API_KEY_INVALID')) {
        
        // Rotate to next key and try again
        await CollectorAIService.rotateApiKey(staffId);
        attempts++;
        continue;
      }
      
      // For other errors, don't retry
      throw error;
    }
  }
  
  throw new Error('All API keys exhausted or invalid');
};

/**
 * Analyze a milk collection photo to verify it matches the recorded liters
 * @param staffId - The collector's staff ID
 * @param imageBase64 - Base64 encoded image
 * @param recordedLiters - The liters recorded by the collector
 * @returns Analysis result with verification status
 */
export const analyzeMilkCollectionPhoto = async (
  staffId: string,
  imageBase64: string,
  recordedLiters: number
): Promise<{
  isValid: boolean;
  confidence: number;
  explanation: string;
  suggestedLiters?: number;
}> => {
  try {
    const { model } = await getModelWithRotation(staffId);
    
    const prompt = `
      Analyze this photo of a milk collection. Based on the container size, quantity, and other 
      visual cues, estimate how many liters of milk are shown in the photo.
      
      The collector recorded ${recordedLiters} liters for this collection.
      
      Respond ONLY with a valid JSON object in this exact format:
      {
        "estimatedLiters": 10.5,
        "confidence": 85,
        "explanation": "Based on the container size and fill level, this appears to be approximately 10.5 liters of milk."
      }
      
      CRITICAL: Respond with ONLY the JSON object. No other text, no markdown, no explanations outside the JSON.
      CRITICAL: Ensure all values are valid JSON types (numbers for estimatedLiters and confidence, string for explanation).
      CRITICAL: Do not wrap the JSON in markdown code blocks or any other formatting.
    `;
    
    const imagePart = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg"
      }
    };
    
    const result = await model.generateContent([prompt, imagePart]);
    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    let analysis;
    try {
      // First try to parse the entire response as JSON
      try {
        analysis = JSON.parse(text);
      } catch (firstError) {
        // If that fails, try to extract JSON from the response text
        // Look for JSON object pattern more carefully
        const jsonMatch = text.match(/\{[^\}]*\"estimatedLiters\"[^\}]*\"confidence\"[^\}]*\"explanation\"[^\}]*\}/);
        if (jsonMatch) {
          analysis = JSON.parse(jsonMatch[0]);
        } else {
          // Try a more general approach
          const generalJsonMatch = text.match(/\{[\s\S]*\}/);
          if (generalJsonMatch) {
            analysis = JSON.parse(generalJsonMatch[0]);
          } else {
            throw new Error('Could not extract JSON from AI response');
          }
        }
      }
    } catch (parseError) {
      console.error('Raw AI response:', text);
      throw new Error(`Failed to parse AI response. Raw response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`);
    }
    
    // Calculate if the recorded liters are within acceptable range
    const estimatedLiters = analysis.estimatedLiters;
    const confidence = analysis.confidence;
    const explanation = analysis.explanation;
    
    // Check if the recorded liters are within 15% of the estimated liters
    const difference = Math.abs(recordedLiters - estimatedLiters);
    const tolerance = estimatedLiters * 0.15;
    const isValid = difference <= tolerance;
    
    return {
      isValid,
      confidence,
      explanation,
      suggestedLiters: estimatedLiters
    };
    
  } catch (error) {
    console.error('Error analyzing milk collection photo:', error);
    throw error;
  }
};

/**
 * Get general AI assistance for collectors
 * @param staffId - The collector's staff ID
 * @param prompt - The user's question or request
 * @returns AI-generated response
 */
export const getCollectorAIAssistance = async (
  staffId: string,
  prompt: string
): Promise<string> => {
  try {
    const { model } = await getModelWithRotation(staffId);
    
    const systemPrompt = `
      You are a helpful AI assistant for dairy milk collectors. Your role is to:
      1. Help collectors with their daily tasks
      2. Provide guidance on milk collection best practices
      3. Answer questions about the collection process
      4. Assist with troubleshooting common issues
      
      Keep your responses concise and practical. Avoid technical jargon unless specifically asked.
    `;
    
    const fullPrompt = `${systemPrompt}\n\nUser: ${prompt}\nAssistant:`;
    
    const result = await model.generateContent(fullPrompt);
    const response = await result.response;
    const text = response.text();
    
    return text;
  } catch (error) {
    console.error('Error getting collector AI assistance:', error);
    throw error;
  }
};