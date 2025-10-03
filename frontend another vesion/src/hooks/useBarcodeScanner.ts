import { useState, useEffect, useRef } from 'react';

interface UseBarcodeScannerProps {
  onScan?: (code: string) => void;
  onError?: (error: string) => void;
}

interface UseBarcodeScannerReturn {
  scanning: boolean;
  result: string | null;
  error: string | null;
  startScanning: () => void;
  stopScanning: () => void;
  scanImage: (file: File) => Promise<string | null>;
}

export const useBarcodeScanner = ({
  onScan,
  onError
}: UseBarcodeScannerProps = {}): UseBarcodeScannerReturn => {
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Start scanning using device camera
  const startScanning = async () => {
    try {
      setScanning(true);
      setError(null);
      
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      // In a real implementation, you would integrate with a barcode scanning library here
      // For now, we'll simulate the scanning process
      setTimeout(() => {
        if (scanning) {
          // Simulate a successful scan
          const simulatedCode = `CONTAINER-${Math.floor(Math.random() * 1000000)}`;
          setResult(simulatedCode);
          onScan?.(simulatedCode);
        }
      }, 3000);
    } catch (err) {
      const errorMessage = 'Failed to access camera. Please ensure you have granted camera permissions.';
      setError(errorMessage);
      onError?.(errorMessage);
      setScanning(false);
    }
  };

  // Stop scanning
  const stopScanning = () => {
    setScanning(false);
    setResult(null);
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  // Scan barcode from image file
  const scanImage = async (file: File): Promise<string | null> => {
    try {
      // In a real implementation, you would use a barcode scanning library to process the image
      // For now, we'll simulate the process
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Simulate a successful scan
      const simulatedCode = `CONTAINER-${Math.floor(Math.random() * 1000000)}`;
      setResult(simulatedCode);
      onScan?.(simulatedCode);
      return simulatedCode;
    } catch (err) {
      const errorMessage = 'Failed to scan barcode from image.';
      setError(errorMessage);
      onError?.(errorMessage);
      return null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanning();
    };
  }, []);

  return {
    scanning,
    result,
    error,
    startScanning,
    stopScanning,
    scanImage
  };
};