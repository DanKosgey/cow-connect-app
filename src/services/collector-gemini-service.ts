import { getModelWithRotation } from '@/services/gemini-api-service';
import { getMimeTypeFromFilename } from '@/utils/imageUtils';

// Simple in-memory cache for AI verification results
const verificationCache = new Map<string, {
  result: any;
  timestamp: number;
}>();

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Generate a cache key based on image characteristics and recorded liters
 * @param imageIdentifier - URL or base64 string identifier
 * @param recordedLiters - The liters recorded by the collector
 * @returns Cache key string
 */
function generateCacheKey(imageIdentifier: string, recordedLiters: number): string {
  // For cache key, we use a simplified representation
  const identifier = imageIdentifier.length > 100 ? 
    imageIdentifier.substring(0, 50) + '...' + imageIdentifier.substring(imageIdentifier.length - 50) : 
    imageIdentifier;
  return `${identifier}_${recordedLiters}`;
}

/**
 * Check if we have a cached result for this verification
 * @param imageIdentifier - URL or base64 string identifier
 * @param recordedLiters - The liters recorded by the collector
 * @returns Cached result or null if not found/expired
 */
function getCachedResult(imageIdentifier: string, recordedLiters: number): any | null {
  const cacheKey = generateCacheKey(imageIdentifier, recordedLiters);
  const cached = verificationCache.get(cacheKey);
  
  if (cached) {
    // Check if cache is still valid
    if (Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log('Returning cached AI verification result');
      return cached.result;
    } else {
      // Expired, remove from cache
      verificationCache.delete(cacheKey);
    }
  }
  
  return null;
}

/**
 * Cache the verification result
 * @param imageIdentifier - URL or base64 string identifier
 * @param recordedLiters - The liters recorded by the collector
 * @param result - The verification result to cache
 */
function cacheResult(imageIdentifier: string, recordedLiters: number, result: any): void {
  const cacheKey = generateCacheKey(imageIdentifier, recordedLiters);
  verificationCache.set(cacheKey, {
    result,
    timestamp: Date.now()
  });
  
  // Clean up old cache entries periodically
  if (Math.random() < 0.1) { // 10% chance to clean up
    cleanupCache();
  }
}

/**
 * Clean up expired cache entries
 */
function cleanupCache(): void {
  const now = Date.now();
  for (const [key, value] of verificationCache.entries()) {
    if (now - value.timestamp >= CACHE_DURATION) {
      verificationCache.delete(key);
    }
  }
}

/**
 * Extract filename from URL
 * @param url The URL to extract filename from
 * @returns Filename or empty string
 */
function extractFilenameFromUrl(url: string): string {
  try {
    const urlObj = new URL(url);
    const pathname = urlObj.pathname;
    return pathname.substring(pathname.lastIndexOf('/') + 1);
  } catch (e) {
    return '';
  }
}

/**
 * Analyze a milk collection photo to verify it matches the recorded liters
 * This function now works directly with Gemini API with automatic key rotation
 * @param staffId - The collector's staff ID (used for tracking API key rotation)
 * @param imageData - Base64 encoded image or image URL
 * @param recordedLiters - The liters recorded by the collector
 * @returns Analysis result with verification status
 */
export const analyzeMilkCollectionPhoto = async (
  staffId: string,
  imageData: string,
  recordedLiters: number
): Promise<{
  isValid: boolean;
  confidence: number;
  explanation: string;
  suggestedLiters?: number;
}> => {
  try {
    // Check cache first
    const cachedResult = getCachedResult(imageData, recordedLiters);
    if (cachedResult) {
      return cachedResult;
    }

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

    // Determine if imageData is a URL or base64
    let imagePart: any;
    if (imageData.startsWith('http')) {
      // It's a URL, determine MIME type from filename
      const filename = extractFilenameFromUrl(imageData);
      const mimeType = getMimeTypeFromFilename(filename);
      
      // Use fileData for URLs
      imagePart = {
        fileData: {
          fileUri: imageData,
          mimeType: mimeType
        }
      };
    } else {
      // It's base64 data, assume JPEG
      imagePart = {
        inlineData: {
          data: imageData,
          mimeType: "image/jpeg"
        }
      };
    }

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

    const finalResult = {
      isValid,
      confidence,
      explanation,
      suggestedLiters: estimatedLiters
    };

    // Cache the result
    cacheResult(imageData, recordedLiters, finalResult);

    return finalResult;
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