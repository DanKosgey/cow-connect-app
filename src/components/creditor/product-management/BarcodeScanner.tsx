import React, { useState, useRef } from 'react';
import { Scan, Camera, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

interface BarcodeScannerProps {
  onBarcodeScanned: (barcode: string) => void;
}

const BarcodeScanner: React.FC<BarcodeScannerProps> = ({ onBarcodeScanned }) => {
  const [isScanning, setIsScanning] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  const startScanning = async () => {
    try {
      setIsScanning(true);
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' } 
      });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Error accessing camera:', error);
      toast({
        title: "Camera Access Error",
        description: "Unable to access camera. Please check permissions and try again.",
        variant: "destructive"
      });
      setIsScanning(false);
    }
  };

  const stopScanning = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const handleManualSubmit = () => {
    if (manualBarcode.trim()) {
      onBarcodeScanned(manualBarcode.trim());
      setManualBarcode('');
    }
  };

  // Simulate barcode detection (in a real app, you'd use a library like QuaggaJS or ZXing)
  const simulateBarcodeDetection = () => {
    // This is just for demonstration - in a real app you'd process the video stream
    const simulatedBarcode = Math.floor(Math.random() * 100000000000).toString();
    onBarcodeScanned(simulatedBarcode);
    stopScanning();
    toast({
      title: "Barcode Scanned",
      description: `Detected barcode: ${simulatedBarcode}`
    });
  };

  return (
    <Dialog open={isScanning} onOpenChange={(open) => {
      if (!open) stopScanning();
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Scan className="w-4 h-4" />
          Scan Barcode
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Scan Product Barcode</DialogTitle>
          <DialogDescription>
            Point your camera at a product barcode to scan it, or enter it manually below.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Camera Preview */}
          <div className="relative bg-gray-100 rounded-lg overflow-hidden aspect-video flex items-center justify-center">
            {isScanning ? (
              <>
                <video 
                  ref={videoRef} 
                  autoPlay 
                  playsInline 
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="border-2 border-white rounded-lg w-48 h-32"></div>
                </div>
                <Button 
                  variant="secondary" 
                  className="absolute bottom-4 left-1/2 transform -translate-x-1/2"
                  onClick={simulateBarcodeDetection}
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Simulate Scan
                </Button>
              </>
            ) : (
              <div className="text-center p-4">
                <Scan className="w-12 h-12 mx-auto text-gray-400" />
                <p className="mt-2 text-gray-500">Camera will activate when scanning</p>
              </div>
            )}
          </div>
          
          {/* Manual Entry */}
          <div className="space-y-2">
            <label htmlFor="manual-barcode" className="text-sm font-medium">
              Or enter barcode manually
            </label>
            <div className="flex gap-2">
              <Input
                id="manual-barcode"
                value={manualBarcode}
                onChange={(e) => setManualBarcode(e.target.value)}
                placeholder="Enter barcode number"
                onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
              />
              <Button onClick={handleManualSubmit}>Submit</Button>
            </div>
          </div>
        </div>
        
        <DialogFooter>
          {!isScanning ? (
            <Button onClick={startScanning}>
              <Camera className="w-4 h-4 mr-2" />
              Start Camera
            </Button>
          ) : (
            <Button variant="outline" onClick={stopScanning}>
              <X className="w-4 h-4 mr-2" />
              Stop Scanning
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;