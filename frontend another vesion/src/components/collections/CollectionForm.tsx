import React, { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Camera, MapPin, Thermometer, Droplets, FlaskConical, FileText, Upload, WifiOff, Wifi } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/components/ui/use-toast';
import useGeolocation from '@/hooks/useGeolocation';
import { collectionSchema, CollectionFormData } from '@/utils/collectionValidation';
import { useCollectionSubmission } from '@/hooks/useCollectionSubmission';
import { CollectionData } from '@/types/collection';

interface CollectionFormProps {
  farmerId: string;
  farmerName: string;
  onSuccess?: (result: any) => void;
}

const CollectionForm: React.FC<CollectionFormProps> = ({ farmerId, farmerName, onSuccess }) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState<File[]>([]);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  const { location, error: locationError, loading: locationLoading, getLocation } = useGeolocation();
  const { submitCollection, isSubmitting, submissionError } = useCollectionSubmission();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<CollectionFormData>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      volume: 0,
      temperature: 0,
      latitude: 0,
      longitude: 0,
      accuracy: 0,
    },
  });
  
  // Watch form values for real-time validation
  const volume = watch('volume');
  const temperature = watch('temperature');
  
  // Update online status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  // Update location in form when it changes
  useEffect(() => {
    if (location) {
      // We'll handle this in the submit function to avoid controlled component issues
    }
  }, [location]);
  
  const handlePhotoCapture = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newPhotos = Array.from(e.target.files);
      setPhotos(prev => [...prev, ...newPhotos]);
    }
  };
  
  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
  };
  
  const onSubmit = async (data: CollectionFormData) => {
    // Ensure we have current location
    if (!location) {
      toast({
        title: 'Location Required',
        description: 'Please enable location services to record collection.',
        variant: 'destructive',
      });
      return;
    }
    
    // Prepare collection data
    const collectionData: CollectionData = {
      volume: data.volume,
      temperature: data.temperature,
      fat_content: data.fat_content,
      protein_content: data.protein_content,
      ph_level: data.ph_level,
      location: {
        latitude: location.latitude,
        longitude: location.longitude,
        accuracy: location.accuracy || 0,
      },
      photos: photos.length > 0 ? photos : undefined,
      notes: data.notes,
    };
    
    const result = await submitCollection(collectionData, farmerId);
    
    if (result) {
      toast({
        title: 'Collection Recorded',
        description: `Successfully recorded ${data.volume}L from ${farmerName}. Quality Grade: ${result.quality_grade}`,
      });
      
      // Reset form
      reset();
      setPhotos([]);
      
      if (onSuccess) {
        onSuccess(result);
      }
    } else if (submissionError) {
      toast({
        title: 'Collection Saved Offline',
        description: submissionError,
        variant: isOnline ? 'destructive' : 'default',
      });
    }
  };
  
  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Droplets className="h-5 w-5 text-dairy-blue" />
          Record Milk Collection
        </CardTitle>
        <CardDescription>
          Record a new milk collection for {farmerName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Location Status */}
          <div className="bg-dairy-50 p-4 rounded-lg border border-dairy-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-dairy-blue" />
                <span className="font-medium">Location Status</span>
              </div>
              {isOnline ? (
                <div className="flex items-center gap-1 text-green-600">
                  <Wifi className="h-4 w-4" />
                  <span className="text-sm">Online</span>
                </div>
              ) : (
                <div className="flex items-center gap-1 text-orange-600">
                  <WifiOff className="h-4 w-4" />
                  <span className="text-sm">Offline Mode</span>
                </div>
              )}
            </div>
            
            {locationLoading ? (
              <p className="text-sm text-dairy-600 mt-2">Getting location...</p>
            ) : locationError ? (
              <div className="mt-2">
                <p className="text-sm text-red-600">{locationError.message}</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={getLocation}
                >
                  Retry Location
                </Button>
              </div>
            ) : location ? (
              <div className="mt-2">
                <p className="text-sm text-dairy-600">
                  Accuracy: {location.accuracy?.toFixed(0) || 'N/A'} meters
                </p>
                {location.accuracy && location.accuracy > 50 && (
                  <p className="text-sm text-orange-600 mt-1">
                    Warning: Low GPS accuracy may affect collection tracking
                  </p>
                )}
              </div>
            ) : (
              <div className="mt-2">
                <p className="text-sm text-dairy-600">Location not available</p>
                <Button 
                  type="button" 
                  variant="outline" 
                  size="sm" 
                  className="mt-2"
                  onClick={getLocation}
                >
                  Get Location
                </Button>
              </div>
            )}
          </div>
          
          {/* Volume Input */}
          <div className="space-y-2">
            <Label htmlFor="volume">Volume (Liters) *</Label>
            <div className="relative">
              <Input
                id="volume"
                type="number"
                step="0.1"
                min="0.1"
                max="1000"
                {...register('volume', { valueAsNumber: true })}
                className={errors.volume ? 'border-red-500' : ''}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <span className="text-dairy-600">L</span>
              </div>
            </div>
            {errors.volume && (
              <p className="text-sm text-red-500">{errors.volume.message}</p>
            )}
            {volume > 0 && (
              <p className="text-sm text-dairy-600">
                {volume} liters will be recorded
              </p>
            )}
          </div>
          
          {/* Temperature Input */}
          <div className="space-y-2">
            <Label htmlFor="temperature">Temperature (°C) *</Label>
            <div className="relative">
              <Input
                id="temperature"
                type="number"
                step="0.1"
                min="0"
                max="50"
                {...register('temperature', { valueAsNumber: true })}
                className={errors.temperature ? 'border-red-500' : ''}
              />
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Thermometer className="h-4 w-4 text-dairy-600" />
              </div>
            </div>
            {errors.temperature && (
              <p className="text-sm text-red-500">{errors.temperature.message}</p>
            )}
            {temperature > 0 && (
              <div className="text-sm text-dairy-600">
                {temperature < 2 || temperature > 8 ? (
                  <p className="text-orange-600">
                    Warning: Temperature outside recommended storage range (2-8°C)
                  </p>
                ) : (
                  <p>Temperature is within acceptable range</p>
                )}
              </div>
            )}
          </div>
          
          {/* Quality Parameters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="fat_content">Fat Content (%)</Label>
              <div className="relative">
                <Input
                  id="fat_content"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  {...register('fat_content', { valueAsNumber: true })}
                  className={errors.fat_content ? 'border-red-500' : ''}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FlaskConical className="h-4 w-4 text-dairy-600" />
                </div>
              </div>
              {errors.fat_content && (
                <p className="text-sm text-red-500">{errors.fat_content.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="protein_content">Protein Content (%)</Label>
              <div className="relative">
                <Input
                  id="protein_content"
                  type="number"
                  step="0.1"
                  min="0"
                  max="10"
                  {...register('protein_content', { valueAsNumber: true })}
                  className={errors.protein_content ? 'border-red-500' : ''}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FlaskConical className="h-4 w-4 text-dairy-600" />
                </div>
              </div>
              {errors.protein_content && (
                <p className="text-sm text-red-500">{errors.protein_content.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="ph_level">pH Level</Label>
              <div className="relative">
                <Input
                  id="ph_level"
                  type="number"
                  step="0.1"
                  min="6.0"
                  max="7.5"
                  {...register('ph_level', { valueAsNumber: true })}
                  className={errors.ph_level ? 'border-red-500' : ''}
                />
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                  <FlaskConical className="h-4 w-4 text-dairy-600" />
                </div>
              </div>
              {errors.ph_level && (
                <p className="text-sm text-red-500">{errors.ph_level.message}</p>
              )}
            </div>
          </div>
          
          {/* Photo Upload */}
          <div className="space-y-2">
            <Label>Photos</Label>
            <div className="border-2 border-dashed border-dairy-300 rounded-lg p-4">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                multiple
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={handlePhotoCapture}
                className="w-full"
              >
                <Camera className="h-4 w-4 mr-2" />
                Capture Photos
              </Button>
              
              {photos.length > 0 && (
                <div className="mt-4 grid grid-cols-3 gap-2">
                  {photos.map((photo, index) => (
                    <div key={index} className="relative">
                      <img
                        src={URL.createObjectURL(photo)}
                        alt={`Collection photo ${index + 1}`}
                        className="w-full h-24 object-cover rounded"
                        loading="lazy"
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(index)}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                      >
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              {...register('notes')}
              placeholder="Any additional notes about this collection..."
              className={errors.notes ? 'border-red-500' : ''}
            />
            {errors.notes && (
              <p className="text-sm text-red-500">{errors.notes.message}</p>
            )}
          </div>
          
          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button 
              type="submit" 
              disabled={isSubmitting || !location}
              className="flex-1"
            >
              {isSubmitting ? (
                <>
                  <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent"></div>
                  Recording...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Record Collection
                </>
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              onClick={() => reset()}
            >
              <FileText className="h-4 w-4 mr-2" />
              Reset Form
            </Button>
          </div>
          
          {submissionError && (
            <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">{submissionError}</p>
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
};

export default CollectionForm;