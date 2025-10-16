/**
 * Generate a random UUID v4
 * Compatible with both browser and Node.js environments
 */
export function generateUUID(): string {
  // Browser environment - use crypto.randomUUID if available
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  
  // Fallback implementation for environments where crypto.randomUUID is not available
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}