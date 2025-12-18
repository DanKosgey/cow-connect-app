/**
 * Convert an image URL to base64 string
 * @param imageUrl The URL of the image to convert
 * @returns Base64 encoded string of the image
 */
export const imageUrlToBase64 = async (imageUrl: string): Promise<string> => {
  try {
    // Fetch the image
    const response = await fetch(imageUrl);
    
    // Check if the response is ok
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    const blob = await response.blob();
    
    // Convert blob to base64
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          // Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
          const base64String = reader.result.split(',')[1];
          resolve(base64String);
        } else {
          reject(new Error('Failed to convert image to base64'));
        }
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (error) {
    console.error('Error converting image to base64:', error);
    throw new Error(`Failed to convert image to base64: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Check if image is already in base64 format
 * @param imageData Image data that might be base64
 * @returns True if the data is already base64 encoded
 */
export const isBase64 = (imageData: string): boolean => {
  // Check if it's already base64 (doesn't have URL prefixes)
  return !(imageData.startsWith('http') || imageData.startsWith('data:'));
};

/**
 * Determine MIME type from file extension
 * @param filename The filename to analyze
 * @returns MIME type string
 */
export const getMimeTypeFromFilename = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  switch (ext) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg'; // Default fallback
  }
};