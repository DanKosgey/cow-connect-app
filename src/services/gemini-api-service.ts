import { GoogleGenerativeAI } from "@google/generative-ai";

// In-memory tracking of current key index
const staffKeyIndexMap = new Map<string, number>();

/**
 * Get API keys from environment variables
 * Handles both Vercel (VITE_ prefix) and local (.env file) environments
 * @returns Array of API keys from environment variables
 */
function getApiKeysFromEnv(): string[] {
  const apiKeys: string[] = [];
  
  // Check for primary API key (VITE_ prefix for Vercel compatibility)
  const primaryKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
  if (primaryKey) {
    apiKeys.push(primaryKey);
  }
  
  // Load up to 50 backup API keys from environment variables
  // Check both VITE_ prefixed (for Vercel) and non-prefixed (for local development) versions
  for (let i = 1; i <= 50; i++) {
    // First check VITE_ prefixed version (for Vercel)
    const vitePrefixedKey = import.meta.env[`VITE_GEMINI_API_KEY_${i}`];
    if (vitePrefixedKey) {
      apiKeys.push(vitePrefixedKey);
      continue;
    }
    
    // Then check non-prefixed version (for local development)
    const nonPrefixedKey = import.meta.env[`GEMINI_API_KEY_${i}`];
    if (nonPrefixedKey) {
      apiKeys.push(nonPrefixedKey);
      continue;
    }
    
    // Stop at the first missing key
    break;
  }
  
  // Debug logging
  console.log('Environment keys checked:');
  console.log('- VITE_GEMINI_API_KEY:', import.meta.env.VITE_GEMINI_API_KEY);
  console.log('- GEMINI_API_KEY:', import.meta.env.GEMINI_API_KEY);
  for (let i = 1; i <= 3; i++) {
    console.log(`- GEMINI_API_KEY_${i}:`, import.meta.env[`GEMINI_API_KEY_${i}`]);
    console.log(`- VITE_GEMINI_API_KEY_${i}:`, import.meta.env[`VITE_GEMINI_API_KEY_${i}`]);
  }
  console.log('Total API keys found:', apiKeys.length);
  console.log('API keys:', apiKeys);
  
  return apiKeys;
}

/**
 * Get the current API key index for a staff member
 * @param staffId - Staff UUID
 * @returns Current API key index or 1
 */
function getCurrentKeyIndex(staffId: string): number {
  return staffKeyIndexMap.get(staffId) || 1;
}

/**
 * Set the current API key index for a staff member
 * @param staffId - Staff UUID
 * @param index - API key index
 */
function setCurrentKeyIndex(staffId: string, index: number): void {
  staffKeyIndexMap.set(staffId, index);
}

/**
 * Get the AI model with automatic API key rotation from environment variables
 * This function will automatically rotate to the next API key if the current one fails
 * due to quota limits (429) or other errors
 */
export async function getModelWithRotation(staffId: string) {
  // Get API keys from environment variables
  const apiKeys = getApiKeysFromEnv();
  
  if (apiKeys.length === 0) {
    throw new Error('No API keys configured in environment variables. Please set GEMINI_API_KEY_1 in your .env file.');
  }
  
  // Get current key index
  let currentIndex = getCurrentKeyIndex(staffId);
  
  // Make sure index is within bounds
  if (currentIndex < 1 || currentIndex > apiKeys.length) {
    currentIndex = 1;
  }
  
  let attempts = 0;
  const maxAttempts = apiKeys.length; // Try all available keys maximum
  
  while (attempts < maxAttempts) {
    try {
      const apiKey = apiKeys[currentIndex - 1]; // Array is 0-indexed
      
      if (!apiKey) {
        throw new Error(`No valid API key at index ${currentIndex}`);
      }
      
      // Initialize Google Generative AI
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
      
      // Test the API key by making a simple request
      const testResult = await model.generateContent("Hello, this is a test to validate the API key.");
      const testResponse = await testResult.response;
      const testText = testResponse.text();
      
      // If we get here, the key is valid
      return { model, apiKey, currentIndex };
    } catch (error: any) {
      console.error(`Error validating API key at index ${currentIndex}:`, error);
      
      // Check if it's a quota error (429) or invalid key error
      if (error.message?.includes('429') || 
          error.message?.includes('quota') || 
          error.message?.includes('API key not valid') ||
          error.message?.includes('API_KEY_INVALID') ||
          error.message?.includes('forbidden') ||
          error.message?.includes('403')) {
        
        // Rotate to next key
        currentIndex = (currentIndex % apiKeys.length) + 1;
        setCurrentKeyIndex(staffId, currentIndex);
        attempts++;
        // Add a small delay to prevent rapid retries
        await new Promise(resolve => setTimeout(resolve, 100));
        continue;
      }
      
      // For other errors, don't retry
      throw error;
    }
  }
  
  throw new Error('All API keys exhausted or invalid');
}