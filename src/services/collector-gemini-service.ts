import { getModelWithRotation } from '@/services/gemini-api-service';

/**
 * Analyze a milk collection photo to verify it matches the recorded liters
 * This function now works directly with Gemini API with automatic key rotation
 * @param staffId - The collector's staff ID (used for tracking API key rotation)
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
    // Get model with automatic API key rotation
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

    const image = {
      inlineData: {
        data: imageBase64,
        mimeType: "image/jpeg"
      }
    };

    const result = await model.generateContent([prompt, image]);
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
    // Get model with automatic API key rotation
    const { model } = await getModelWithRotation(staffId);

    const result = await model.generateContent(prompt);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error('Error getting collector AI assistance:', error);
    throw error;
  }
};