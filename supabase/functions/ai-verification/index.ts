// Setup type definitions for built-in Supabase Runtime APIs
import "jsr:@supabase/functions-js/edge-runtime.d.ts"
import { createClient } from '@supabase/supabase-js'

interface CollectorApiKeys {
  id: string;
  staff_id: string;
  api_key_1: string | null;
  api_key_2: string | null;
  api_key_3: string | null;
  api_key_4: string | null;
  api_key_5: string | null;
  api_key_6: string | null;
  api_key_7: string | null;
  api_key_8: string | null;
  current_key_index: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Get the current API key for a staff member
 * @param supabaseClient - Supabase client instance
 * @param staffId - Staff UUID
 * @returns Current API key or null
 */
async function getCurrentApiKey(supabaseClient: any, staffId: string): Promise<string | null> {
  const { data, error } = await supabaseClient.rpc('get_current_api_key', {
    staff_uuid: staffId
  });

  if (error) {
    console.error('Error getting current API key:', error);
    return null;
  }

  return data;
}

/**
 * Rotate to the next API key for a staff member
 * @param supabaseClient - Supabase client instance
 * @param staffId - Staff UUID
 */
async function rotateApiKey(supabaseClient: any, staffId: string): Promise<void> {
  const { error } = await supabaseClient.rpc('rotate_api_key', {
    staff_uuid: staffId
  });

  if (error) {
    console.error('Error rotating API key:', error);
  }
}

/**
 * Get the AI model with automatic API key rotation
 * This function will automatically rotate to the next API key if the current one fails
 * due to quota limits (429) or other errors
 */
async function getModelWithRotation(supabaseClient: any, staffId: string) {
  let attempts = 0;
  const maxAttempts = 8; // Try all 8 keys maximum
  
  while (attempts < maxAttempts) {
    try {
      // Get current API key
      const apiKey = await getCurrentApiKey(supabaseClient, staffId);
      
      if (!apiKey) {
        throw new Error('No valid API keys available');
      }
      
      // Test the API key by making a simple request
      const testResponse = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contents: [{
            parts: [{
              text: "Hello, this is a test to validate the API key."
            }]
          }]
        })
      });
      
      if (!testResponse.ok) {
        const errorText = await testResponse.text();
        throw new Error(`API key test failed: ${testResponse.status} - ${errorText}`);
      }
      
      return { apiKey };
    } catch (error: any) {
      console.error('Error validating API key:', error);
      
      // Check if it's a quota error (429) or invalid key error
      if (error.message?.includes('429') || 
          error.message?.includes('quota') || 
          error.message?.includes('API key not valid') ||
          error.message?.includes('API_KEY_INVALID') ||
          error.message?.includes('leaked') ||
          error.message?.includes('forbidden') ||
          error.message?.includes('403')) {
        
        // Rotate to next key and try again
        await rotateApiKey(supabaseClient, staffId);
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

/**
 * Analyze a milk collection photo to verify it matches the recorded liters
 * @param supabaseClient - Supabase client instance
 * @param staffId - The collector's staff ID
 * @param imageBase64 - Base64 encoded image
 * @param recordedLiters - The liters recorded by the collector
 * @returns Analysis result with verification status
 */
async function analyzeMilkCollectionPhoto(
  supabaseClient: any,
  staffId: string,
  imageBase64: string,
  recordedLiters: number
): Promise<{
  isValid: boolean;
  confidence: number;
  explanation: string;
  suggestedLiters?: number;
}> {
  try {
    // Get the API key with rotation
    const { apiKey } = await getModelWithRotation(supabaseClient, staffId);
    
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
    
    const requestBody = {
      contents: [{
        parts: [
          {
            text: prompt
          },
          {
            inlineData: {
              data: imageBase64,
              mimeType: "image/jpeg"
            }
          }
        ]
      }],
      generationConfig: {
        temperature: 0.7,
        topK: 40,
        topP: 0.95,
        maxOutputTokens: 1024,
      },
      safetySettings: [
        {
          category: "HARM_CATEGORY_HARASSMENT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_HATE_SPEECH",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
          threshold: "BLOCK_ONLY_HIGH"
        },
        {
          category: "HARM_CATEGORY_DANGEROUS_CONTENT",
          threshold: "BLOCK_ONLY_HIGH"
        }
      ]
    };
    
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(requestBody)
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Gemini API error: ${response.status} - ${errorText}`);
    }
    
    const responseData = await response.json();
    
    // Extract the text response
    const text = responseData.candidates?.[0]?.content?.parts?.[0]?.text || '';
    
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
}

/**
 * Authenticate the request using Supabase JWT
 * @param req - Request object
 * @returns Supabase client instance or null if unauthorized
 */
async function authenticateRequest(req: Request) {
  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return null;
    }
    
    const jwt = authHeader.substring(7); // Remove 'Bearer ' prefix
    
    // Create a Supabase client with the JWT
    // Note: Using the service role key for internal operations
    const supabaseClient = createClient(
      // @ts-ignore: Deno is available in Supabase Edge Functions runtime
      Deno.env.get('SUPABASE_URL') ?? '',
      // @ts-ignore: Deno is available in Supabase Edge Functions runtime
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        global: {
          headers: {
            Authorization: `Bearer ${jwt}`
          }
        }
      }
    );
    
    return supabaseClient;
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

// @ts-ignore: Deno is available in Supabase Edge Functions runtime
Deno.serve(async (req) => {
  // Add a timeout to prevent hanging
  const timeoutPromise = new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Function timeout after 25 seconds')), 25000)
  );

  try {
    // Race the main function against the timeout
    const result = await Promise.race([
      handleRequest(req),
      timeoutPromise
    ]);
    
    return result;
  } catch (error: any) {
    console.error('Error in AI verification function:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'An unknown error occurred'
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
});

async function handleRequest(req: Request) {
  try {
    // Only allow POST requests
    if (req.method !== 'POST') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { 
          status: 405,
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
    
    // Authenticate the request
    const supabaseClient = await authenticateRequest(req);
    if (!supabaseClient) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { 
          status: 401,
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
    
    // Parse request body
    const { staffId, imageBase64, recordedLiters } = await req.json();
    
    // Validate required parameters
    if (!staffId || !imageBase64 || recordedLiters === undefined) {
      return new Response(
        JSON.stringify({ error: 'Missing required parameters: staffId, imageBase64, recordedLiters' }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
    
    // Validate that recordedLiters is a number
    if (typeof recordedLiters !== 'number' || recordedLiters < 0) {
      return new Response(
        JSON.stringify({ error: 'recordedLiters must be a positive number' }),
        { 
          status: 400,
          headers: { "Content-Type": "application/json" } 
        }
      );
    }
    
    // Call the AI analysis function with a timeout
    const analysisPromise = analyzeMilkCollectionPhoto(supabaseClient, staffId, imageBase64, recordedLiters);
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('AI analysis timeout after 20 seconds')), 20000)
    );
    
    const result = await Promise.race([analysisPromise, timeoutPromise]);
    
    // Return the result
    return new Response(
      JSON.stringify(result),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error('Error in AI verification function:', error);
    
    // Return error response
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        message: error.message || 'An unknown error occurred'
      }),
      { 
        status: 500,
        headers: { "Content-Type": "application/json" } 
      }
    );
  }
}