import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';
import { supabase } from '@/integrations/supabase/client';

// Initialize Gemini AI with API key from environment variables
const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;

// Safety settings to allow all content for analysis
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
  temperature: 0.1,
  topP: 0.95,
  topK: 64,
  maxOutputTokens: 8192,
  responseMimeType: "application/json",
};

// Get the Gemini model
const getModel = () => {
  // Check if API key is available
  if (!API_KEY) {
    throw new Error('Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your environment variables.');
  }
  
  const genAI = new GoogleGenerativeAI(API_KEY);
  return genAI.getGenerativeModel({
    model: "gemini-2.5-flash",
    safetySettings,
    generationConfig: modelConfig,
  });
};

/**
 * Convert a Blob to base64 string (browser compatible)
 * @param blob The blob to convert
 * @returns Base64 encoded string
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
        const base64String = reader.result.split(',')[1];
        resolve(base64String);
      } else {
        reject(new Error('Failed to convert blob to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Get the latest AI instructions from the database
 * @returns AI instructions and configuration
 */
export const getLatestAIInstructions = async () => {
  try {
    const { data, error } = await supabase
      .from('ai_instructions')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error) throw error;

    return {
      instructions: data?.instructions || '',
      modelName: data?.model_name || 'gemini-2.5-flash',
      confidenceThreshold: data?.confidence_threshold || 0.8,
    };
  } catch (error) {
    console.error('Error fetching AI instructions:', error);
    // Return default instructions if database fetch fails
    return {
      instructions: `
      You are an AI assistant that verifies milk collection photos. Your task is to:
      
      1. Analyze images of milk collections
      2. Estimate the volume of milk shown in the image
      3. Compare your estimate with the recorded liters
      4. Determine if the collection appears legitimate
      
      Focus on:
      - Measuring containers and their fill levels
      - Standard milk collection jugs or tanks
      - Any numerical indicators of volume
      - Overall plausibility of the collection
      
      Be conservative in your estimates. If uncertain, recommend human review.
      `,
      modelName: 'gemini-2.5-flash',
      confidenceThreshold: 0.8,
    };
  }
};

/**
 * Analyze a milk collection photo to verify liters match the recorded amount
 * @param imageUrl URL of the uploaded photo
 * @param recordedLiters The liters recorded by the collector
 * @returns Analysis result with verification status and confidence
 */
export const verifyCollectionPhoto = async (imageUrl: string, recordedLiters: number) => {
  try {
    const model = getModel();
    
    // Download the image
    const imageResponse = await fetch(imageUrl);
    const imageBlob = await imageResponse.blob();
    
    // Convert blob to base64 using browser-compatible method
    const base64Image = await blobToBase64(imageBlob);
    
    // Get the latest AI instructions from the database
    const aiInstructions = await getLatestAIInstructions();
    
    const prompt = `
    ${aiInstructions.instructions}
    
    Recorded liters: ${recordedLiters}L
    
    Please analyze the image and:
    1. Identify any containers, measuring devices, or indicators of milk volume
    2. Estimate the total liters of milk shown in the image
    3. Compare your estimate with the recorded liters
    4. Provide a confidence score (0.0 to 1.0) for your analysis
    5. Explain your reasoning
    
    Respond ONLY with a valid JSON object in this exact format:
    {
      "estimatedLiters": 10.5,
      "matchesRecorded": true,
      "confidence": 0.85,
      "explanation": "Based on the container size and fill level, this appears to be approximately 10.5 liters of milk.",
      "verificationPassed": true
    }
    
    CRITICAL: Respond with ONLY the JSON object. No other text, no markdown, no explanations outside the JSON.
    CRITICAL: Ensure all values are valid JSON types.
    CRITICAL: Do not wrap the JSON in markdown code blocks or any other formatting.
    CRITICAL: The confidence value must be between 0.0 and 1.0.
    
    Be conservative in your estimates. If you cannot clearly determine the volume, set verificationPassed to false.
    `;

    const result = await model.generateContent([
      prompt,
      {
        inlineData: {
          data: base64Image,
          mimeType: imageBlob.type || 'image/jpeg',
        },
      },
    ]);

    const response = await result.response;
    const text = response.text();
    
    // Parse the JSON response
    try {
      // First try to parse the entire response as JSON
      let analysis;
      try {
        analysis = JSON.parse(text);
      } catch (firstError) {
        // If that fails, try to extract JSON from the response text
        // Look for JSON object pattern more carefully
        const jsonMatch = text.match(/\{[^\}]*\"estimatedLiters\"[^\}]*\"matchesRecorded\"[^\}]*\"confidence\"[^\}]*\"explanation\"[^\}]*\"verificationPassed\"[^\}]*\}/);
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
      
      return {
        success: true,
        analysis,
      };
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      console.error('Raw AI response:', text);
      return {
        success: false,
        error: `Failed to parse AI response: ${text.substring(0, 200)}${text.length > 200 ? '...' : ''}`,
      };
    }
  } catch (error) {
    console.error('Error verifying collection photo:', error);
    
    // Provide more specific error messages
    let errorMessage = 'Unknown error occurred';
    if (error instanceof Error) {
      if (error.message.includes('API key not valid')) {
        errorMessage = 'Invalid Gemini API key. Please check your VITE_GEMINI_API_KEY environment variable.';
      } else if (error.message.includes('API key is missing')) {
        errorMessage = 'Gemini API key is missing. Please set VITE_GEMINI_API_KEY in your environment variables.';
      } else {
        errorMessage = error.message;
      }
    }
    
    return {
      success: false,
      error: errorMessage,
    };
  }
};

/**
 * Update AI instructions (admin function)
 * @param instructions New instructions for the AI
 * @param modelName The model name to use
 * @param confidenceThreshold The confidence threshold for verification
 * @returns Success status
 */
export const updateAIInstructions = async (
  instructions: string,
  modelName: string = 'gemini-2.5-flash',
  confidenceThreshold: number = 0.8
) => {
  try {
    // Check if there are existing instructions
    const { data: existing } = await supabase
      .from('ai_instructions')
      .select('id')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    let error;
    if (existing) {
      // Update existing instructions
      const { error: updateError } = await supabase
        .from('ai_instructions')
        .update({ 
          instructions,
          model_name: modelName,
          confidence_threshold: confidenceThreshold,
          updated_at: new Date().toISOString()
        })
        .eq('id', existing.id);
      error = updateError;
    } else {
      // Insert new instructions
      const { error: insertError } = await supabase
        .from('ai_instructions')
        .insert([{ 
          instructions,
          model_name: modelName,
          confidence_threshold: confidenceThreshold
        }]);
      error = insertError;
    }

    if (error) throw error;

    return { success: true };
  } catch (error) {
    console.error('Error updating AI instructions:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Failed to update AI instructions' 
    };
  }
};

export default {
  verifyCollectionPhoto,
  getLatestAIInstructions,
  updateAIInstructions,
};