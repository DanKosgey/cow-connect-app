import React, { useState, useEffect, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Scale, 
  Thermometer, 
  AlertTriangle, 
  Check,
  MapPin
} from 'lucide-react';
import useGeolocation from '@/hooks/useGeolocation';
import { CollectionData } from '@/types/collection';
import { validateQuantity, validateCoordinates } from '@/utils/validation';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import GPSStatusIndicator from '@/components/GPSStatusIndicator';
import { Fieldset } from '@/components/ui/fieldset';
import { useToastContext } from '@/components/ToastWrapper';

interface CollectionFormProps {
  onSubmit: (data: CollectionData) => void;
  onCancel: () => void;
  loading: boolean;
  farmerName: string;
  initialData?: Partial<CollectionData>;
}

interface FormErrors {
  volume?: string;
  temperature?: string;
  fat_content?: string;
  protein_content?: string;
  location?: string;
}

const CollectionForm: React.FC<CollectionFormProps> = ({ 
  onSubmit, 
  onCancel, 
  loading, 
  farmerName,
  initialData = {} 
}) => {
  const toast = useToastContext();
  const [formData, setFormData] = useState<CollectionData>({
    volume: initialData.volume || 0,
    temperature: initialData.temperature || 4.0,
    fat_content: initialData.fat_content || undefined,
    protein_content: initialData.protein_content || undefined,
    location: initialData.location || { latitude: 0, longitude: 0, accuracy: 0 },
    photos: initialData.photos || [],
    notes: initialData.notes || ''
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [temperatureStatus, setTemperatureStatus] = useState<'optimal' | 'warning' | 'critical' | null>(null);
  const { isMobile, isTouchDevice } = useMobileOptimizations();
  const volumeInputRef = useRef<HTMLInputElement>(null);
  const temperatureInputRef = useRef<HTMLInputElement>(null);
  
  // Geolocation hook with enhanced options
  const { 
    location, 
    error: geoError, 
    loading: geoLoading, 
    getLocation,
    watchPosition,
    clearWatch,
    permissionState
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000
  });

  // State for location watching
  const [watchId, setWatchId] = useState<number | null>(null);
  const [locationStatus, setLocationStatus] = useState<'acquiring' | 'acquired' | 'error' | 'denied'>('acquiring');

  // Determine GPS accuracy status for indicator
  const getGPSAccuracyStatus = () => {
    if (!location || location.accuracy === null) return 'acquiring';
    
    if (location.accuracy < 5) return 'excellent';
    if (location.accuracy < 15) return 'good';
    return 'poor';
  };

  // Update location when geolocation data changes
  useEffect(() => {
    if (location) {
      setFormData(prev => ({
        ...prev,
        location: {
          latitude: location.latitude,
          longitude: location.longitude,
          accuracy: location.accuracy || 0
        }
      }));
      setLocationStatus('acquired');
    } else if (geoError) {
      setLocationStatus('error');
    }
  }, [location, geoError]);

  // Handle permission denied state
  useEffect(() => {
    if (permissionState === 'denied') {
      setLocationStatus('denied');
    }
  }, [permissionState]);

  // Start watching position when component mounts
  useEffect(() => {
    const id = watchPosition();
    setWatchId(id);
    
    return () => {
      if (id !== null) {
        clearWatch(id);
      }
    };
  }, [watchPosition, clearWatch]);

  // Update temperature status when temperature changes
  useEffect(() => {
    const temp = formData.temperature;
    if (temp >= 2 && temp <= 4) {
      setTemperatureStatus('optimal');
    } else if (temp > 4 && temp <= 6) {
      setTemperatureStatus('warning');
    } else {
      setTemperatureStatus('critical');
    }
  }, [formData.temperature]);

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Validate volume
    if (!validateQuantity(formData.volume.toString())) {
      newErrors.volume = 'Please enter a valid quantity (0.1 - 1000 liters)';
    }

    // Validate temperature
    if (formData.temperature < 0 || formData.temperature > 10) {
      newErrors.temperature = 'Temperature must be between 0°C and 10°C';
    }

    // Validate fat content if provided
    if (formData.fat_content !== undefined && (formData.fat_content < 0 || formData.fat_content > 20)) {
      newErrors.fat_content = 'Fat content must be between 0% and 20%';
    }

    // Validate protein content if provided
    if (formData.protein_content !== undefined && (formData.protein_content < 0 || formData.protein_content > 10)) {
      newErrors.protein_content = 'Protein content must be between 0% and 10%';
    }

    // Validate location
    if (!validateCoordinates(formData.location.latitude, formData.location.longitude)) {
      newErrors.location = 'Invalid GPS coordinates';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleChange = (field: keyof CollectionData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear error for this field when user starts typing
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field as keyof FormErrors];
        return newErrors;
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (validateForm()) {
      // Check if we have a valid location before submitting
      if (!validateCoordinates(formData.location.latitude, formData.location.longitude)) {
        toast.showError('Location Required', 'Please ensure location services are enabled and provide a valid location');
        return;
      }
      
      onSubmit(formData);
    } else {
      // Show error toast for validation failures
      toast.showError('Form Validation Failed', 'Please correct the errors in the form before submitting');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6" noValidate>
      <div className="bg-secondary-50 p-4 rounded-lg">
        <h3 className="font-medium text-secondary-900">Recording collection for: {farmerName}</h3>
      </div>

      <Fieldset legend="Collection Details" className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div>
          <Label htmlFor="volume">Milk Volume (Liters) *</Label>
          <Input 
            ref={volumeInputRef}
            id="volume"
            type="number"
            step="0.1"
            min="0.1"
            max="1000"
            placeholder="0.0"
            className={`text-lg text-center ${errors.volume ? 'border-red-500' : ''} ${isMobile ? 'text-xl py-3' : ''}`}
            value={formData.volume || ''}
            onChange={(e) => handleChange('volume', parseFloat(e.target.value) || 0)}
            // Mobile-specific attributes
            {...(isMobile && {
              inputMode: 'decimal',
              enterKeyHint: 'next',
              autoFocus: true
            })}
            aria-invalid={!!errors.volume}
            aria-describedby={errors.volume ? "volume-error" : undefined}
          />
          {errors.volume && <p id="volume-error" className="text-red-500 text-sm mt-xs" role="alert">{errors.volume}</p>}
          <Button variant="outline" className="w-full mt-sm" type="button" aria-label="Auto-weigh milk">
            <Scale className="h-4 w-4 mr-2" aria-hidden="true" />
            Auto-Weigh
          </Button>
        </div>
        
        <div>
          <Label htmlFor="temperature">Temperature (°C) *</Label>
          <div className="relative">
            <Input 
              ref={temperatureInputRef}
              id="temperature"
              type="number"
              step="0.1"
              min="0"
              max="10"
              placeholder="4.0"
              className={`text-lg text-center pr-10 ${
                errors.temperature ? 'border-red-500' :
                temperatureStatus === 'optimal' ? 'border-primary-500' :
                temperatureStatus === 'warning' ? 'border-warning' :
                temperatureStatus === 'critical' ? 'border-error' : ''
              } ${isMobile ? 'text-xl py-3' : ''}`}
              value={formData.temperature || ''}
              onChange={(e) => handleChange('temperature', parseFloat(e.target.value) || 0)}
              // Mobile-specific attributes
              {...(isMobile && {
                inputMode: 'decimal',
                enterKeyHint: 'next'
              })}
              aria-invalid={!!errors.temperature}
              aria-describedby={errors.temperature ? "temperature-error" : undefined}
            />
            <div className="absolute inset-y-0 right-0 flex items-center pr-3">
              {temperatureStatus === 'optimal' && <Check className="h-5 w-5 text-primary-500" aria-hidden="true" />}
              {temperatureStatus === 'warning' && <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />}
              {temperatureStatus === 'critical' && <AlertTriangle className="h-5 w-5 text-error" aria-hidden="true" />}
            </div>
          </div>
          {errors.temperature && <p id="temperature-error" className="text-red-500 text-sm mt-xs" role="alert">{errors.temperature}</p>}
          <div className="flex items-center mt-xs">
            <Thermometer className="h-4 w-4 mr-1 text-secondary-600" aria-hidden="true" />
            <span className="text-xs text-secondary-600">
              {temperatureStatus === 'optimal' ? 'Optimal: 2-4°C' :
               temperatureStatus === 'warning' ? 'Acceptable: 4-6°C' :
               temperatureStatus === 'critical' ? 'Critical: Outside 2-6°C' : 'Optimal: 2-4°C'}
            </span>
          </div>
        </div>
      </Fieldset>

      <Fieldset legend="Quality Parameters" className="grid grid-cols-1 md:grid-cols-2 gap-lg">
        <div>
          <Label htmlFor="fatContent">Fat Content (%)</Label>
          <Input 
            id="fatContent"
            type="number"
            step="0.1"
            min="0"
            max="20"
            placeholder="4.0"
            className={`text-lg text-center ${errors.fat_content ? 'border-red-500' : ''} ${isMobile ? 'text-xl py-3' : ''}`}
            value={formData.fat_content || ''}
            onChange={(e) => handleChange('fat_content', parseFloat(e.target.value) || undefined)}
            // Mobile-specific attributes
            {...(isMobile && {
              inputMode: 'decimal',
              enterKeyHint: 'next'
            })}
            aria-invalid={!!errors.fat_content}
            aria-describedby={errors.fat_content ? "fat-content-error" : undefined}
          />
          {errors.fat_content && <p id="fat-content-error" className="text-red-500 text-sm mt-xs" role="alert">{errors.fat_content}</p>}
          <p className="text-xs text-secondary-600 mt-xs">Optimal: 3.5-4.5%</p>
        </div>
        
        <div>
          <Label htmlFor="proteinContent">Protein Content (%)</Label>
          <Input 
            id="proteinContent"
            type="number"
            step="0.1"
            min="0"
            max="10"
            placeholder="3.2"
            className={`text-lg text-center ${errors.protein_content ? 'border-red-500' : ''} ${isMobile ? 'text-xl py-3' : ''}`}
            value={formData.protein_content || ''}
            onChange={(e) => handleChange('protein_content', parseFloat(e.target.value) || undefined)}
            // Mobile-specific attributes
            {...(isMobile && {
              inputMode: 'decimal',
              enterKeyHint: 'done'
            })}
            aria-invalid={!!errors.protein_content}
            aria-describedby={errors.protein_content ? "protein-content-error" : undefined}
          />
          {errors.protein_content && <p id="protein-content-error" className="text-red-500 text-sm mt-xs" role="alert">{errors.protein_content}</p>}
          <p className="text-xs text-secondary-600 mt-xs">Optimal: 3.0-3.5%</p>
        </div>
      </Fieldset>

      {/* GPS Location */}
      <div>
        <div className="flex justify-between items-center mb-2">
          <Label>Collection Location</Label>
          <Button 
            variant="outline" 
            size="sm" 
            type="button"
            onClick={getLocation}
            disabled={geoLoading}
            className="flex items-center"
            aria-label={geoLoading ? "Refreshing location..." : "Refresh location"}
          >
            {geoLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                Refreshing...
              </>
            ) : (
              <>
                <MapPin className="h-4 w-4 mr-1" aria-hidden="true" />
                Refresh
              </>
            )}
          </Button>
        </div>
        
        <GPSStatusIndicator
          status={
            locationStatus === 'acquired' ? getGPSAccuracyStatus() : 
            locationStatus === 'denied' ? 'denied' :
            locationStatus === 'error' ? 'error' :
            'acquiring'
          }
          accuracy={location?.accuracy}
          latitude={location?.latitude}
          longitude={location?.longitude}
          onRefresh={getLocation}
          onRequestPermission={getLocation}
        />
        
        {errors.location && <p id="location-error" className="text-red-500 text-sm mt-xs" role="alert">{errors.location}</p>}
        <p className="text-xs text-secondary-600 mt-sm">
          Location is automatically captured and continuously updated for accuracy.
          High precision is required for dairy collection records.
        </p>
      </div>

      <div>
        <Label htmlFor="notes">Notes (Optional)</Label>
        <Input 
          id="notes"
          placeholder="Any additional observations..."
          value={formData.notes || ''}
          onChange={(e) => handleChange('notes', e.target.value)}
          aria-describedby="notes-help"
        />
        <p id="notes-help" className="text-xs text-secondary-600 mt-xs">
          Include any additional observations about the collection
        </p>
      </div>

      <div className={`flex ${isMobile ? 'flex-col space-y-lg' : 'space-x-lg'}`}>
        <Button 
          type="submit" 
          className={`flex-1 bg-secondary-600 hover:bg-secondary-700 ${isMobile ? 'py-4 text-lg' : ''}`}
          disabled={loading}
          aria-label={loading ? "Recording collection..." : "Record collection"}
        >
          {loading ? 'Recording...' : 'Record Collection'}
        </Button>
        <Button 
          type="button" 
          variant="outline" 
          className={`flex-1 ${isMobile ? 'py-4 text-lg' : ''}`}
          onClick={onCancel}
          disabled={loading}
          aria-label="Cancel collection recording"
        >
          Cancel
        </Button>
      </div>
    </form>
  );
};

export default CollectionForm;