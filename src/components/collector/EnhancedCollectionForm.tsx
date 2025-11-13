import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Slider 
} from '@/components/ui/slider';
import { milkRateService } from '@/services/milk-rate-service';
import { useNavigate } from 'react-router-dom';
import useToastNotifications from '@/hooks/useToastNotifications';
import {
  Milk,
  MapPin,
  Thermometer,
  Droplets,
  Scale,
  Zap,
  Camera,
  RefreshCw,
  Wallet,
  Users,
  CheckCircle,
  AlertCircle,
  Gauge
} from 'lucide-react';
import { WarehouseService } from '@/services/warehouse-service';
import { useStaffInfo, useApprovedFarmers } from '@/hooks/useStaffData';
import { generateUUID } from '@/utils/uuid';

interface Farmer {
  id: string;
  full_name: string;
  kyc_status: string;
}

interface QualityParameters {
  fat_content: number;
  protein_content: number;
  snf_content: number;
  acidity_level: number;
  temperature: number;
  bacterial_count: number;
}

const EnhancedCollectionForm = () => {
  const { user } = useAuth();
  const toast = useToastNotifications();
  const navigate = useNavigate();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  const { farmers, loading: farmersLoading } = useApprovedFarmers();
  
  // Form state
  const [selectedFarmer, setSelectedFarmer] = useState('');
  const [liters, setLiters] = useState('');
  const [qualityGrade, setQualityGrade] = useState('B');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  
  // Quality parameters
  const [qualityParameters, setQualityParameters] = useState<QualityParameters>({
    fat_content: 3.5,
    protein_content: 3.2,
    snf_content: 8.5,
    acidity_level: 6.7,
    temperature: 20,
    bacterial_count: 1000
  });
  
  // Data state
  const [currentRate, setCurrentRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchData();
    getCurrentLocation();
    
    // Subscribe to milk rate changes
    const unsubscribe = milkRateService.subscribe((rate) => {
      setCurrentRate(rate);
    });
    
    // Fetch current rate on component mount
    milkRateService.getCurrentRate();
    
    // Set up an interval to retry fetching data if staff record was not found initially
    const interval = setInterval(() => {
      if (!staffInfo && user?.id) {
        fetchData();
      }
    }, 5000); // Retry every 5 seconds
    
    // Clean up interval and subscription on component unmount
    return () => {
      clearInterval(interval);
      unsubscribe();
    };
  }, [user?.id, staffInfo]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch current milk rate using the service
      const rate = await milkRateService.getCurrentRate();
      setCurrentRate(rate);
    } catch (error: any) {
      console.error('Error fetching data:', error);
      toast.error('Error', String(error?.message || 'Failed to load data'));
    } finally {
      setLoading(false);
    }
  };

  const getCurrentLocation = () => {
    setGettingLocation(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
          setGettingLocation(false);
        },
        (error) => {
          console.error('Error getting location:', error);
          let errorMessage = 'Could not get GPS coordinates';
          
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied. Please enable location permissions in your browser settings.';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information is unavailable. Please check your device settings.';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out. Please try again.';
              break;
            case 1: // PERMISSION_DENIED - specifically for secure context issues
              if (error.message.includes('secure origin') || window.location.protocol !== 'https:') {
                errorMessage = 'Location access requires HTTPS. Please access this application over a secure connection.';
              }
              break;
          }
          
          toast.error('Location Error', errorMessage);
          setGettingLocation(false);
        }
      );
    } else {
      toast.error('Location Error', 'Geolocation is not supported by this browser');
      setGettingLocation(false);
    }
  };

  const calculateQualityScore = (): number => {
    let score = 0;
    
    // Fat content scoring (optimal: 3.5-4.5%)
    if (qualityParameters.fat_content >= 3.5 && qualityParameters.fat_content <= 4.5) {
      score += 2.0;
    } else if (qualityParameters.fat_content >= 3.0 && qualityParameters.fat_content < 5.0) {
      score += 1.5;
    } else {
      score += 0.5;
    }

    // Protein content scoring (optimal: 3.0-3.5%)
    if (qualityParameters.protein_content >= 3.0 && qualityParameters.protein_content <= 3.5) {
      score += 2.0;
    } else if (qualityParameters.protein_content >= 2.5 && qualityParameters.protein_content <= 4.0) {
      score += 1.5;
    } else {
      score += 0.5;
    }

    // SNF scoring (optimal: 8.5-9.5%)
    if (qualityParameters.snf_content >= 8.5 && qualityParameters.snf_content <= 9.5) {
      score += 2.0;
    } else if (qualityParameters.snf_content >= 8.0 && qualityParameters.snf_content <= 10.0) {
      score += 1.5;
    } else {
      score += 0.5;
    }

    // Temperature scoring (optimal: 2-4°C)
    if (qualityParameters.temperature >= 2 && qualityParameters.temperature <= 4) {
      score += 2.0;
    } else if (qualityParameters.temperature >= 1 && qualityParameters.temperature <= 8) {
      score += 1.5;
    } else {
      score += 0.5;
    }

    // Bacterial count scoring (optimal: <1000 CFU/ml)
    if (qualityParameters.bacterial_count < 1000) {
      score += 2.0;
    } else if (qualityParameters.bacterial_count < 10000) {
      score += 1.5;
    } else {
      score += 0.5;
    }

    return Math.min(10, score); // Cap at 10
  };

  const getQualityGrade = (score: number): string => {
    if (score >= 9) return 'A+';
    if (score >= 7) return 'A';
    if (score >= 5) return 'B';
    return 'C';
  };

  const handleQualityParameterChange = (param: keyof QualityParameters, value: number) => {
    setQualityParameters(prev => ({
      ...prev,
      [param]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmer || !liters || submitting) return;

    setSubmitting(true);
    
    try {
      const qualityScore = calculateQualityScore();
      const grade = getQualityGrade(qualityScore);
      const amount = parseFloat(liters) * currentRate;

      // Get the current user
      const user = await supabase.auth.getUser();
      const userId = user.data.user?.id;
      
      if (!userId) {
        throw new Error('Unable to get user ID');
      }

      // Get the staff ID by looking up the staff record that matches the user ID
      const { data: staffData, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', userId)
        .maybeSingle();

      if (staffError) {
        console.error('Error fetching staff data:', staffError);
        throw new Error('Unable to get staff information: ' + staffError.message);
      }

      if (!staffData) {
        throw new Error('User is not registered as staff member. Please contact administrator.');
      }

      const staffId = staffData.id;

      // Generate unique collection ID
      const collectionId = `COL-${Date.now()}-${Math.random().toString(36).substr(2, 5).toUpperCase()}`;

      // Find the collection point based on current location or assigned route
      let collectionPointId = null;
      
      // First, try to find a collection point that matches the current GPS location
      if (location?.lat && location?.lng) {
        const { data: nearbyPoints, error: pointError } = await supabase
          .from('collection_points')
          .select('id')
          .limit(1);
        
        // For now, we'll use a simple approach - in a real implementation, 
        // we would calculate the nearest point based on GPS coordinates
        if (nearbyPoints && nearbyPoints.length > 0) {
          collectionPointId = nearbyPoints[0].id;
        }
      }

      // Insert collection record
      const { error: collectionError } = await supabase
        .from('collections')
        .insert({
          collection_id: collectionId,
          farmer_id: selectedFarmer, // This correctly references the farmer's id
          staff_id: staffId, // Use the correct staff ID from the staff table
          collection_point_id: collectionPointId, // Associate with collection point if found
          liters: parseFloat(liters),
          quality_grade: grade,
          rate_per_liter: currentRate,
          total_amount: amount,
          gps_latitude: location?.lat,
          gps_longitude: location?.lng,
          verification_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
          collection_date: new Date().toISOString(),
          status: 'Collected'
        });

      if (collectionError) throw collectionError;

      // Insert quality parameters
      const { data: collectionData, error: fetchError } = await supabase
        .from('collections')
        .select('id')
        .eq('collection_id', collectionId)
        .limit(1);

      if (fetchError) throw fetchError;
      
      // Check if we have any collections
      if (!collectionData || collectionData.length === 0) {
        throw new Error('Failed to fetch collection data after insertion');
      }
      
      const collectionRecord = collectionData[0];

      // Automatically assign collection to nearest warehouse based on GPS location
      if (location?.lat && location?.lng) {
        await WarehouseService.autoAssignCollectionToWarehouse(
          collectionRecord.id, 
          location.lat, 
          location.lng
        );
      }

      const { error: qualityError } = await supabase
        .from('milk_quality_parameters') // Changed from 'quality_tests' to 'milk_quality_parameters'
        .insert({
          // Generate a UUID to avoid null ID issues
          id: generateUUID(),
          collection_id: collectionRecord.id,
          ...qualityParameters,
          measured_by: userId // Use the user ID for quality tests
        });

      if (qualityError) throw qualityError;

      toast.success('Success', `Collection recorded successfully! Collection ID: ${collectionId}`);

      // Reset form
      setSelectedFarmer('');
      setLiters('');
      setQualityGrade('B');
      setNotes('');
      setPhotoUrl('');
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error submitting collection:', error);
      toast.error('Error', String(error?.message || 'Failed to record collection'));
    } finally {
      setSubmitting(false);
    }
  };

  const selectedFarmerData = farmers.find(f => f.id === selectedFarmer);
  const qualityScore = calculateQualityScore();
  const calculatedGrade = getQualityGrade(qualityScore);
  const totalAmount = parseFloat(liters) * currentRate || 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">New Milk Collection</h1>
          <p className="text-muted-foreground">Record a new milk collection from a farmer</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/collector/dashboard')}
        >
          Back to Dashboard
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Farmer Selection and Basic Info */}
          <div className="lg:col-span-2 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Farmer Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="farmer">Select Farmer *</Label>
                    <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                      <SelectTrigger id="farmer">
                        <SelectValue placeholder="Select a farmer" />
                      </SelectTrigger>
                      <SelectContent>
                        {farmers.filter(farmer => farmer.id && farmer.id.trim() !== '').map((farmer) => (
                          <SelectItem key={farmer.id} value={farmer.id}>
                            {farmer.full_name} ({farmer.id})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="liters">Liters Collected *</Label>
                    <div className="relative">
                      <Input
                        id="liters"
                        type="number"
                        step="0.1"
                        min="0"
                        value={liters}
                        onChange={(e) => setLiters(e.target.value)}
                        placeholder="Enter liters"
                        className="pl-10"
                      />
                      <Milk className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    </div>
                  </div>
                </div>

                {selectedFarmerData && (
                  <Card className="bg-muted">
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-full bg-primary/10">
                          <Users className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-medium">{selectedFarmerData.full_name}</h3>
                          <p className="text-sm text-muted-foreground">
                            ID: {selectedFarmerData.id}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Quality Assessment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gauge className="h-5 w-5" />
                  Quality Assessment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Quality Parameters */}
                  <div className="space-y-4">
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="flex items-center gap-2">
                            <Droplets className="h-4 w-4" />
                            Fat Content (%)
                          </Label>
                          <span className="text-sm font-medium">{qualityParameters.fat_content.toFixed(1)}%</span>
                        </div>
                        <Slider
                          value={[qualityParameters.fat_content]}
                          onValueChange={([value]) => handleQualityParameterChange('fat_content', value)}
                          min={2}
                          max={6}
                          step={0.1}
                          className="w-full"
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>2%</span>
                          <span>Optimal: 3.5-4.5%</span>
                          <span>6%</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="flex items-center gap-2">
                            <Scale className="h-4 w-4" />
                            Protein Content (%)
                          </Label>
                          <span className="text-sm font-medium">{qualityParameters.protein_content.toFixed(1)}%</span>
                        </div>
                        <Slider
                          value={[qualityParameters.protein_content]}
                          onValueChange={([value]) => handleQualityParameterChange('protein_content', value)}
                          min={2}
                          max={5}
                          step={0.1}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>2%</span>
                          <span>Optimal: 3.0-3.5%</span>
                          <span>5%</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <Label className="flex items-center gap-2">
                            <Thermometer className="h-4 w-4" />
                            Temperature (°C)
                          </Label>
                          <span className="text-sm font-medium">{qualityParameters.temperature.toFixed(1)}°C</span>
                        </div>
                        <Slider
                          value={[qualityParameters.temperature]}
                          onValueChange={([value]) => handleQualityParameterChange('temperature', value)}
                          min={0}
                          max={30}
                          step={0.5}
                        />
                        <div className="flex justify-between text-xs text-muted-foreground mt-1">
                          <span>0°C</span>
                          <span>Optimal: 2-4°C</span>
                          <span>30°C</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Quality Results */}
                  <div className="flex flex-col items-center justify-center p-6 bg-muted rounded-lg">
                    <div className="text-center mb-4">
                      <Gauge className="h-16 w-16 mx-auto text-primary" />
                      <h3 className="text-xl font-bold mt-2">Quality Assessment</h3>
                    </div>
                    
                    <div className="w-full space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Score:</span>
                        <span className="text-2xl font-bold">{qualityScore.toFixed(1)}/10</span>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Grade:</span>
                        <Badge 
                          className={`
                            text-lg px-3 py-1 rounded-full
                            ${calculatedGrade === 'A+' ? 'bg-green-500' : 
                              calculatedGrade === 'A' ? 'bg-blue-500' : 
                              calculatedGrade === 'B' ? 'bg-yellow-500' : 'bg-red-500'}
                          `}
                        >
                          {calculatedGrade}
                        </Badge>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-muted-foreground">Rate:</span>
                        <span className="font-medium">KSh {currentRate.toFixed(2)}/L</span>
                      </div>
                      
                      <div className="flex justify-between items-center pt-2 border-t">
                        <span className="text-muted-foreground">Total Amount:</span>
                        <span className="text-xl font-bold text-primary">KSh {totalAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Additional Parameters */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <Label>SNF Content (%)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={qualityParameters.snf_content}
                      onChange={(e) => handleQualityParameterChange('snf_content', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Acidity Level</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      value={qualityParameters.acidity_level}
                      onChange={(e) => handleQualityParameterChange('acidity_level', parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Bacterial Count</Label>
                    <Input
                      type="number"
                      min="0"
                      value={qualityParameters.bacterial_count}
                      onChange={(e) => handleQualityParameterChange('bacterial_count', parseInt(e.target.value) || 0)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - Location and Additional Info */}
          <div className="space-y-6">
            {/* GPS Location */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MapPin className="h-5 w-5" />
                  Location
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={getCurrentLocation}
                  disabled={gettingLocation}
                  className="w-full"
                >
                  {gettingLocation ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Getting Location...
                    </>
                  ) : (
                    <>
                      <MapPin className="h-4 w-4 mr-2" />
                      Capture GPS Location
                    </>
                  )}
                </Button>
                
                {location && (
                  <Card className="bg-muted">
                    <CardContent className="p-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4 text-primary" />
                          <span className="font-medium">Current Location</span>
                        </div>
                        <div className="text-sm">
                          <p>Lat: {location.lat.toFixed(6)}</p>
                          <p>Lng: {location.lng.toFixed(6)}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  Additional Notes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  placeholder="Add any additional notes about this collection..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={4}
                />
              </CardContent>
            </Card>

            {/* Photo Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Photo Documentation
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
                  <Camera className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                  <p className="text-muted-foreground mb-2">Upload photo of collection</p>
                  <Button type="button" variant="outline" size="sm">
                    Choose File
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Submit Button */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-6">
                <Button 
                  type="submit" 
                  className="w-full"
                  size="lg"
                  disabled={submitting || !selectedFarmer || !liters}
                >
                  {submitting ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      Recording Collection...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Record Collection
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>
    </div>
  );
};

export default EnhancedCollectionForm;