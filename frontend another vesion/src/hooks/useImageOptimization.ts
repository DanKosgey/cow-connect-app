import { useState, useCallback } from 'react';

interface ImageOptimizationResult {
  optimizedSrc: string;
  originalSize: number;
  optimizedSize: number;
  compressionRatio: number;
}

interface UseImageOptimizationReturn {
  optimizeImage: (file: File, maxWidth?: number, quality?: number) => Promise<ImageOptimizationResult | null>;
  isOptimizing: boolean;
  error: string | null;
}

const useImageOptimization = (): UseImageOptimizationReturn => {
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const optimizeImage = useCallback(async (
    file: File,
    maxWidth: number = 1920,
    quality: number = 0.8
  ): Promise<ImageOptimizationResult | null> => {
    setIsOptimizing(true);
    setError(null);

    try {
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        throw new Error('File is not an image');
      }

      // Create a canvas element for image processing
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Create an image element to load the file
      const img = new Image();
      
      return new Promise((resolve, reject) => {
        img.onload = () => {
          try {
            // Calculate new dimensions while maintaining aspect ratio
            let { width, height } = img;
            if (width > maxWidth) {
              const ratio = maxWidth / width;
              width = maxWidth;
              height = height * ratio;
            }

            // Set canvas dimensions
            canvas.width = width;
            canvas.height = height;

            // Draw image on canvas
            ctx.drawImage(img, 0, 0, width, height);

            // Convert to blob with compression
            canvas.toBlob(
              (blob) => {
                if (!blob) {
                  reject(new Error('Could not convert canvas to blob'));
                  return;
                }

                // Create object URL for the optimized image
                const optimizedSrc = URL.createObjectURL(blob);
                const originalSize = file.size;
                const optimizedSize = blob.size;
                const compressionRatio = (1 - optimizedSize / originalSize) * 100;

                resolve({
                  optimizedSrc,
                  originalSize,
                  optimizedSize,
                  compressionRatio
                });
              },
              'image/jpeg',
              quality
            );
          } catch (err) {
            reject(err);
          }
        };

        img.onerror = () => {
          reject(new Error('Could not load image'));
        };

        // Load the image
        img.src = URL.createObjectURL(file);
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      setIsOptimizing(false);
      return null;
    } finally {
      setIsOptimizing(false);
    }
  }, []);

  return {
    optimizeImage,
    isOptimizing,
    error
  };
};

export default useImageOptimization;