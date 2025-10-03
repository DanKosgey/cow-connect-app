import { useCallback } from 'react';

interface CompressionOptions {
  maxSizeMB?: number;
  maxWidthOrHeight?: number;
  useWebWorker?: boolean;
}

interface CompressionResult {
  compressedFile: File;
  originalSize: number;
  compressedSize: number;
  compressionRatio: number;
}

const useImageCompression = () => {
  const compressImage = useCallback(async (
    file: File, 
    options: CompressionOptions = {}
  ): Promise<CompressionResult | null> => {
    const {
      maxSizeMB = 1,
      maxWidthOrHeight = 1920,
      useWebWorker = true
    } = options;

    // For browsers that support the Canvas API
    return new Promise((resolve) => {
      // Create an image element to get dimensions
      const img = new Image();
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      if (!ctx) {
        resolve(null);
        return;
      }
      
      img.onload = () => {
        // Calculate new dimensions while maintaining aspect ratio
        let { width, height } = img;
        if (width > height) {
          if (width > maxWidthOrHeight) {
            height = (height * maxWidthOrHeight) / width;
            width = maxWidthOrHeight;
          }
        } else {
          if (height > maxWidthOrHeight) {
            width = (width * maxWidthOrHeight) / height;
            height = maxWidthOrHeight;
          }
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
              resolve(null);
              return;
            }
            
            const compressedFile = new File([blob], file.name, {
              type: 'image/jpeg',
              lastModified: Date.now()
            });
            
            const originalSize = file.size;
            const compressedSize = compressedFile.size;
            const compressionRatio = (1 - compressedSize / originalSize) * 100;
            
            resolve({
              compressedFile,
              originalSize,
              compressedSize,
              compressionRatio
            });
          },
          'image/jpeg',
          0.8 // Quality (80%)
        );
      };
      
      img.onerror = () => {
        resolve(null);
      };
      
      // Load the image
      img.src = URL.createObjectURL(file);
    });
  }, []);

  return {
    compressImage
  };
};

export default useImageCompression;