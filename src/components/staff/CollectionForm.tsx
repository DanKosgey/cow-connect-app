import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Camera, ChevronLeft, Barcode, Loader2, Map } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useOfflineSync } from '@/hooks/use-offline-sync';
import { supabase } from '@/integrations/supabase/client';
import type { AssignedFarmer, CollectionFormData, QualityGrade } from '@/types/staff.types';

export default function CollectionForm() {
  const navigate = useNavigate();
  const { show, error: showError } = useToastNotifications();
  const { addCollection, pendingCount } = useOfflineSync();

  // Form state
  const [loading, setLoading] = useState(false);
  const [farmers, setFarmers] = useState<AssignedFarmer[]>([]);
  const [selectedFarmer, setSelectedFarmer] = useState<string>('');
  const [quantity, setQuantity] = useState<string>('');
  const [qualityGrade, setQualityGrade] = useState<QualityGrade>('A');
  const [temperature, setTemperature] = useState<string>('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);

  // Camera references
  const videoRef = useRef<HTMLVideoElement>(null);
  const photoRef = useRef<HTMLCanvasElement>(null);

  // Load assigned farmers
  useEffect(() => {
    const loadFarmers = async () => {
      try {
        const user = await supabase.auth.getUser();
        if (!user.data.user?.id) throw new Error('Not authenticated');

        const { data, error } = await supabase.rpc('get_assigned_farmers', {
          staff_id: user.data.user.id,
        });

        if (error) throw error;
        setFarmers(data);
      } catch (error: any) {
        showError('Error', String(error?.message || 'An error occurred'));
      }
    };

    loadFarmers();
  }, [toast]);

  // Get location on mount
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Geolocation error:', error);
          toast({
            title: 'Location Error',
            description: 'Unable to get your location. Please enable location services.',
            variant: 'destructive',
          });
        }
      );
    }
  }, [toast]);

  // Camera handlers
  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (error) {
      console.error('Camera error:', error);
      toast({
        title: 'Camera Error',
        description: 'Unable to access camera. Please check permissions.',
        variant: 'destructive',
      });
    }
  };

  const takePhoto = () => {
    if (videoRef.current && photoRef.current) {
      const video = videoRef.current;
      const canvas = photoRef.current;

      // Match canvas size to video
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      // Draw video frame to canvas
      const context = canvas.getContext('2d');
      if (context) {
        context.drawImage(video, 0, 0, canvas.width, canvas.height);
        const photoUrl = canvas.toDataURL('image/jpeg');
        setPhoto(photoUrl);

        // Stop camera stream
        const stream = video.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedFarmer || !quantity || !location) {
      toast({
        title: 'Validation Error',
        description: 'Please fill in all required fields',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);

      const selectedFarmerData = farmers.find(f => f.farmer_id === selectedFarmer);
      if (!selectedFarmerData) throw new Error('Invalid farmer selection');

      const collectionData: CollectionFormData = {
        farmer_id: selectedFarmer,
        collection_point_id: selectedFarmerData.collection_point_id,
        quantity: parseFloat(quantity),
        quality_grade: qualityGrade,
        temperature: temperature ? parseFloat(temperature) : undefined,
        photo_url: photo,
        latitude: location.lat,
        longitude: location.lng,
        local_id: crypto.randomUUID(),
        device_timestamp: new Date().toISOString(),
      };

      // Add to offline storage queue
      addCollection(collectionData);

      toast({
        title: 'Success',
        description: 'Collection recorded and queued for sync',
      });

      // Reset form
      setSelectedFarmer('');
      setQuantity('');
      setQualityGrade('A');
      setTemperature('');
      setPhoto(null);

    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="mx-auto max-w-md">
      <CardContent className="p-6 space-y-4">
        <div className="flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="h-8 w-8"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <h2 className="text-lg font-semibold">Record Collection</h2>
          {pendingCount > 0 && (
            <div className="flex items-center bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded">
              {pendingCount} pending
            </div>
          )}
        </div>

        {/* Farmer Selection */}
        <div className="space-y-2">
          <Label htmlFor="farmer">Farmer</Label>
          <div className="flex gap-2">
            <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
              <SelectTrigger className="flex-1">
                <SelectValue placeholder="Select farmer" />
              </SelectTrigger>
              <SelectContent>
                {farmers.map((farmer) => (
                  <SelectItem key={farmer.farmer_id} value={farmer.farmer_id}>
                    {farmer.full_name} - {farmer.registration_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                // TODO: Implement barcode scanning
                    show({ title: 'Coming Soon', description: 'Barcode scanning will be available in the next update' });
              }}
            >
              <Barcode className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Quantity and Quality */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="quantity">Quantity (L)</Label>
            <Input
              id="quantity"
              type="number"
              step="0.1"
              min="0"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="text-right"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="quality">Quality Grade</Label>
            <Select value={qualityGrade} onValueChange={(value) => setQualityGrade(value as QualityGrade)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A">Grade A</SelectItem>
                <SelectItem value="B">Grade B</SelectItem>
                <SelectItem value="C">Grade C</SelectItem>
                <SelectItem value="D">Grade D</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Temperature and Location */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature (°C)</Label>
            <Input
              id="temperature"
              type="number"
              step="0.1"
              value={temperature}
              onChange={(e) => setTemperature(e.target.value)}
              className="text-right"
            />
          </div>
          <div className="space-y-2">
            <Label>Location</Label>
            <Button
              variant="outline"
              className="w-full"
              onClick={() => {
                // TODO: Show location picker
                toast({
                  title: 'Location Captured',
                  description: location
                    ? `${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`
                    : 'Getting location...',
                });
              }}
            >
              <Map className="h-4 w-4 mr-2" />
              {location ? 'Update' : 'Get Location'}
            </Button>
          </div>
        </div>

        {/* Photo Capture */}
        <div className="space-y-2">
          <Label>Quality Photo</Label>
          {photo ? (
            <div className="relative">
              <img
                src={photo}
                alt="Captured"
                className="w-full h-48 object-cover rounded-lg"
              />
              <Button
                variant="outline"
                size="icon"
                className="absolute top-2 right-2"
                onClick={() => setPhoto(null)}
              >
                <Camera className="h-4 w-4" />
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              className="w-full h-48"
              onClick={startCamera}
            >
              <Camera className="h-6 w-6" />
            </Button>
          )}
          {!photo && (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              className="hidden"
              onCanPlay={takePhoto}
            />
          )}
          <canvas ref={photoRef} className="hidden" />
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0">
        <Button
          className="w-full"
          onClick={handleSubmit}
          disabled={loading || !selectedFarmer || !quantity || !location}
        >
          {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          Record Collection
        </Button>
      </CardFooter>
    </Card>
  );
}