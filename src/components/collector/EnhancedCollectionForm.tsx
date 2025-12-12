import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/useAuth';
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
import { milkRateService } from '@/services/milk-rate-service';
import { useNavigate } from 'react-router-dom';
import useToastNotifications from '@/hooks/useToastNotifications';
import {
  Milk,
  MapPin,
  Camera,
  RefreshCw,
  Wallet,
  Users,
  CheckCircle,
  AlertCircle,
  XCircle,
  Search,
  Clock
} from 'lucide-react';
import { WarehouseService } from '@/services/warehouse-service';
import { useStaffInfo } from '@/hooks/useStaffData';
import { useApprovedFarmersData } from '@/hooks/useFarmersData';
import { generateUUID } from '@/utils/uuid';
import { useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useAIVerification } from '@/hooks/useAIVerification';
import { useCollectorAIVerification } from '@/hooks/useCollectorAIVerification';
import { imageUrlToBase64 } from '@/utils/imageUtils';

interface Farmer {
  id: string;
  full_name: string;
  kyc_status: string;
  registration_number?: string;
  phone_number?: string;
}

const EnhancedCollectionForm = () => {
  const { user } = useAuth();
  const toast = useToastNotifications();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { staffInfo, loading: staffLoading } = useStaffInfo();
  const { data: farmersData, isLoading: farmersLoading } = useApprovedFarmersData();
  const { 
    verifying, 
    verifyCollection, 
    saveVerificationResult, 
    fetchAIInstructions 
  } = useAIVerification();
  const { 
    verifying: collectorVerifying, 
    verifyCollectionWithCollectorAI,
    saveVerificationResult: saveCollectorVerificationResult
  } = useCollectorAIVerification();
  const farmers: Farmer[] = farmersData || [];
  
  // Form state
  const [selectedFarmer, setSelectedFarmer] = useState('');
  const [liters, setLiters] = useState('');
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gettingLocation, setGettingLocation] = useState(false);
  const [notes, setNotes] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [uploadedFileName, setUploadedFileName] = useState(''); // Track the uploaded file name
  const [isRejected, setIsRejected] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  
  // Farmer search state
  const [searchTerm, setSearchTerm] = useState('');
  
  // Data state
  const [currentRate, setCurrentRate] = useState(0);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verificationResult, setVerificationResult] = useState<any>(null);

  useEffect(() => {
    fetchData();
    getCurrentLocation();
    fetchRecentCollections();
    fetchAIInstructions(); // Fetch AI instructions on component mount
    
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

  // Add a separate effect to refresh recent collections when form is submitted
  useEffect(() => {
    if (!submitting) {
      fetchRecentCollections();
    }
  }, [submitting]);
  
  // Also refresh when the component mounts or when user changes
  useEffect(() => {
    console.log('Component mounted or user changed, fetching recent collections');
    fetchRecentCollections();
  }, [user?.id]);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFarmer || !liters || submitting) return;

    setSubmitting(true);
    
    try {
      // First, verify the collection with AI if a photo is uploaded
      let currentVerificationResult = null;
      if (photoUrl && staffInfo?.id) {
        // Show a cool AI analyzing message
        toast.show({ 
          title: 'AI Analysis', 
          description: '🤖 AI is analyzing your collection photo... Please wait.' 
        });
        
        try {
          // Convert image URL to base64 for collector-specific AI verification
          const imageBase64 = await imageUrlToBase64(photoUrl);
          
          // Use collector-specific AI verification
          const result = await verifyCollectionWithCollectorAI(staffInfo.id, imageBase64, parseFloat(liters));
          
          if (result) {
            currentVerificationResult = result;
            setVerificationResult(result);
            if (!result.isValid) {
              toast.show({ 
                title: 'Verification Flagged', 
                description: `AI detected potential discrepancy: ${result.explanation}. Collection flagged for review.` 
              });
            } else {
              toast.success('AI Verification Passed', 
                `Photo verified successfully. Estimated: ${result.suggestedLiters}L (Confidence: ${result.confidence}%)`);
            }
          }
        } catch (verificationError: any) {
          // Handle AI verification errors
          console.error('AI verification failed:', verificationError);
          
          // If it's a parsing error, ask the collector to retake a clearer photo
          if (verificationError.message && 
              (verificationError.message.includes('parse') || 
               verificationError.message.includes('JSON') || 
               verificationError.message.includes('extract'))) {
            toast.error('AI Analysis Failed', 
              'AI could not analyze your photo. Please retake a clearer photo and try again.');
            // Stop the submission process
            setSubmitting(false);
            return;
          }
          // If it's an API key error, stop the process and inform the collector
          else if (verificationError.message && 
              (verificationError.message.includes('API key') || 
               verificationError.message.includes('invalid') || 
               verificationError.message.includes('No valid API keys available') ||
               verificationError.message.includes('leaked') ||
               verificationError.message.includes('blocked') ||
               verificationError.message.includes('forbidden') ||
               verificationError.message.includes('403'))) {
            toast.error('AI Verification Error', 
              'AI verification failed due to API key issues. Please check your API keys in the AI settings panel and try again.');
            // Stop the submission process
            setSubmitting(false);
            return;
          } else {
            // For other errors, show a warning but continue with submission
            toast.show({ 
              title: 'AI Verification Warning', 
              description: verificationError.message || 'AI verification service is temporarily unavailable. Collection will be recorded without verification.' 
            });
          }
        }
      }

      // Proceed with recording the collection
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

      // Insert collection record
      const { error: collectionError } = await supabase
        .from('collections')
        .insert({
          collection_id: collectionId,
          farmer_id: selectedFarmer,
          staff_id: staffId,
          liters: parseFloat(liters),
          rate_per_liter: currentRate,
          total_amount: amount,
          gps_latitude: location?.lat,
          gps_longitude: location?.lng,
          verification_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
          collection_date: new Date().toISOString(),
          status: isRejected ? 'Cancelled' : 'Collected',
          rejection_reason: isRejected ? rejectionReason : null,
          photo_url: photoUrl || null,
          notes: notes || null
        });

      if (collectionError) throw collectionError;

      const { data: collectionData, error: fetchError } = await supabase
        .from('collections')
        .select('id')
        .eq('collection_id', collectionId)
        .limit(1);

      if (fetchError) throw fetchError;
      
      if (!collectionData || collectionData.length === 0) {
        throw new Error('Failed to fetch collection data after insertion');
      }
      
      const collectionRecord = collectionData[0];

      // If we have a photo and verification result, save the verification
      if (photoUrl && currentVerificationResult) {
        try {
          await saveCollectorVerificationResult(collectionRecord.id, currentVerificationResult, parseFloat(liters));
        } catch (saveError) {
          console.error('Error saving verification result:', saveError);
          toast.show({ title: 'Warning', description: 'Collection recorded but verification data could not be saved.' });
        }
      }

      toast.success('Success', `Collection ${isRejected ? 'cancelled' : 'recorded'} successfully! Collection ID: ${collectionId}`);

      // Reset form
      setSelectedFarmer('');
      setLiters('');
      setNotes('');
      setPhotoUrl('');
      setUploadedFileName('');
      setVerificationResult(null);
      setIsRejected(false);
      setRejectionReason('');
      setSearchTerm('');
      
      // Refresh recent collections
      fetchRecentCollections();
      
      // Invalidate and refetch farmer data to keep it fresh
      queryClient.invalidateQueries({ queryKey: ['ADMIN_FARMERS', 'approved'] });
      
      // Refresh data
      fetchData();
    } catch (error: any) {
      console.error('Error submitting collection:', error);
      toast.error('Error', String(error?.message || `Failed to ${isRejected ? 'cancel' : 'record'} collection`));
    } finally {
      setSubmitting(false);
    }
  };

  // Filter farmers based on search term
  const filteredFarmers = farmers.filter(farmer =>
    farmer.full_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    farmer.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (farmer.registration_number && farmer.registration_number.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const selectedFarmerData = farmers.find(f => f.id === selectedFarmer);
  const totalAmount = parseFloat(liters) * currentRate || 0;

  // Recent collections state
  const [recentCollections, setRecentCollections] = useState<any[]>([]);
  const [loadingRecent, setLoadingRecent] = useState(true);
  
  // Photo upload state
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchRecentCollections = async () => {
    try {
      setLoadingRecent(true);
      
      // Try to fetch collections with farmer information
      const { data, error } = await supabase
        .from('collections')
        .select(`
          id,
          collection_id,
          liters,
          total_amount,
          collection_date,
          status,
          farmer_id,
          farmers!inner (full_name)
        `)
        .order('collection_date', { ascending: false })
        .limit(5);

      if (error) {
        console.error('Error fetching recent collections with farmer join:', error);
        // Fallback to fetching without farmer join
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('collections')
          .select(`
            id,
            collection_id,
            liters,
            total_amount,
            collection_date,
            status,
            farmer_id
          `)
          .order('collection_date', { ascending: false })
          .limit(5);
        
        if (fallbackError) {
          throw fallbackError;
        }
        
        setRecentCollections(fallbackData || []);
      } else {
        setRecentCollections(data || []);
      }
    } catch (error: any) {
      console.error('Error fetching recent collections:', error);
      toast.error('Error', 'Failed to load recent collections: ' + (error.message || 'Unknown error'));
    } finally {
      setLoadingRecent(false);
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.type, file.size);

    // Validate file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Error', 'Please upload a valid image file (JPEG, PNG, or GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Error', 'File size must be less than 5MB');
      return;
    }

    try {
      setUploadingPhoto(true);
      
      // If there's already an uploaded photo, delete it first
      if (uploadedFileName) {
        try {
          const { error: deleteError } = await supabase.storage
            .from('collection-photos')
            .remove([uploadedFileName]);
          
          if (deleteError) {
            console.error('Error deleting previous photo:', deleteError);
          } else {
            console.log('Previous photo deleted successfully');
          }
        } catch (deleteError) {
          console.error('Error deleting previous photo:', deleteError);
        }
      }
      
      // Generate a unique file name for the new file
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}.${fileExt}`;
      
      console.log('Uploading new file:', fileName);
      
      // Upload the new file to Supabase storage
      const { data, error } = await supabase.storage
        .from('collection-photos')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Upload error:', error);
        // Handle specific error cases
        if (error.message.includes('Bucket not found')) {
          toast.error('Error', 'Storage bucket not found. Please contact administrator to configure storage.');
        } else if (error.message.includes('denied') || error.message.includes('42501')) {
          toast.error('Error', 'Insufficient permissions to upload photos. Please contact administrator to configure storage policies.');
        } else {
          toast.error('Error', error.message || 'Failed to upload photo. Please contact administrator to configure storage.');
        }
        throw error;
      }
      
      console.log('Upload successful:', data);
      
      // Store the uploaded file name for potential deletion
      setUploadedFileName(fileName);
      
      // Get the public URL of the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('collection-photos')
        .getPublicUrl(fileName);
      
      console.log('Public URL:', publicUrl);
      setPhotoUrl(publicUrl);
      toast.success('Success', 'Photo uploaded successfully');
    } catch (error: any) {
      console.error('Error uploading photo:', error);
      // Only show generic error if we haven't already shown a specific one
      if (!error.handled) {
        toast.error('Error', error.message || 'Failed to upload photo. Please try again or contact administrator.');
      }
    } finally {
      setUploadingPhoto(false);
    }
  };

  const triggerFileInput = () => {
    fileInputRef.current?.click();
  };

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
                {/* Searchable Farmer Selection */}
                <div className="space-y-2">
                  <Label htmlFor="farmer-search">Select Farmer *</Label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="farmer-search"
                      placeholder="Search farmers by name or ID..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                  
                  {searchTerm && (
                    <div className="border rounded-md max-h-60 overflow-y-auto">
                      {filteredFarmers.length > 0 ? (
                        filteredFarmers.map((farmer) => (
                          <div
                            key={farmer.id}
                            className={`p-3 border-b cursor-pointer hover:bg-muted ${
                              selectedFarmer === farmer.id ? 'bg-muted' : ''
                            }`}
                            onClick={() => {
                              setSelectedFarmer(farmer.id);
                              setSearchTerm('');
                            }}
                          >
                            <div className="font-medium">{farmer.full_name}</div>
                            <div className="text-sm text-muted-foreground">
                              ID: {farmer.id} | {farmer.registration_number || 'No reg. number'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="p-3 text-center text-muted-foreground">
                          No farmers found matching "{searchTerm}"
                        </div>
                      )}
                    </div>
                  )}
                  
                  {selectedFarmer && (
                    <div className="mt-2">
                      <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
                        <SelectTrigger>
                          <SelectValue placeholder="Selected farmer" />
                        </SelectTrigger>
                        <SelectContent>
                          {selectedFarmer && (
                            <SelectItem value={selectedFarmer}>
                              {selectedFarmerData?.full_name} ({selectedFarmer})
                            </SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
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
                
                {/* Rejection Section */}
                <Card className="border-destructive">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-destructive">
                      <XCircle className="h-5 w-5" />
                      Cancel Collection
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id="reject-collection"
                        checked={isRejected}
                        onChange={(e) => setIsRejected(e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-destructive focus:ring-destructive"
                      />
                      <Label htmlFor="reject-collection">Mark this collection as cancelled</Label>
                    </div>
                    
                    {isRejected && (
                      <div className="space-y-2">
                        <Label htmlFor="rejection-reason">Cancellation Reason *</Label>
                        <Textarea
                          id="rejection-reason"
                          placeholder="Enter the reason for cancelling this collection..."
                          value={rejectionReason}
                          onChange={(e) => setRejectionReason(e.target.value)}
                          rows={3}
                          required={isRejected}
                        />
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CardContent>
            </Card>
            
            {/* Payment Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Payment Summary
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Liters:</span>
                    <span className="font-medium">{liters || 0}L</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Rate per liter:</span>
                    <span className="font-medium">KSh {currentRate.toFixed(2)}/L</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t">
                    <span>Total Amount:</span>
                    <span className="text-xl font-bold text-primary">KSh {totalAmount.toFixed(2)}</span>
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
                  <p className="text-muted-foreground mb-2">
                    {photoUrl ? 'Photo uploaded successfully' : 'Upload photo of collection'}
                  </p>
                  <Button 
                    type="button" 
                    variant="outline" 
                    size="sm"
                    onClick={triggerFileInput}
                    disabled={uploadingPhoto || verifying}
                  >
                    {uploadingPhoto ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : photoUrl ? (
                      'Change Photo'
                    ) : (
                      'Choose File'
                    )}
                  </Button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoUpload}
                    className="hidden"
                  />
                  {photoUrl && (
                    <div className="mt-3">
                      <img 
                        src={photoUrl} 
                        alt="Collection" 
                        className="mx-auto max-h-40 rounded-lg shadow-md"
                      />
                      <Button 
                        type="button" 
                        variant="ghost" 
                        size="sm" 
                        className="mt-2"
                        onClick={async () => {
                          try {
                            // Delete the file from storage if we have the file name
                            if (uploadedFileName) {
                              const { error } = await supabase.storage
                                .from('collection-photos')
                                .remove([uploadedFileName]);
                              
                              if (error) {
                                console.error('Error deleting photo:', error);
                                toast.error('Error', 'Failed to delete photo from storage');
                              } else {
                                console.log('Photo deleted successfully from storage');
                              }
                            }
                            
                            // Clear the state
                            setPhotoUrl('');
                            setUploadedFileName('');
                          } catch (error) {
                            console.error('Error removing photo:', error);
                            toast.error('Error', 'Failed to remove photo');
                          }
                        }}
                      >
                        Remove Photo
                      </Button>
                    </div>
                  )}
                  <p className="text-xs text-muted-foreground mt-2">
                    Supported formats: JPG, PNG, GIF (Max 5MB)
                  </p>
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
                  disabled={submitting || verifying || !selectedFarmer || !liters || (isRejected && !rejectionReason)}
                >
                  {submitting || verifying ? (
                    <>
                      <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                      {verifying ? 'Verifying with AI...' : isRejected ? 'Cancelling Collection...' : 'Recording Collection...'}
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      {isRejected ? 'Cancel Collection' : 'Record Collection'}
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
        
        {/* Recent Collections Section - Moved to the bottom */}
        <Card className="border-primary/20 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              Recent Collections
            </CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={fetchRecentCollections}
              disabled={loadingRecent}
              className="hover:bg-primary/10"
            >
              <RefreshCw className={`h-4 w-4 ${loadingRecent ? 'animate-spin' : ''}`} />
            </Button>
          </CardHeader>
          <CardContent className="pt-4">
            {loadingRecent ? (
              <div className="text-center py-4">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500 mx-auto"></div>
                <p className="text-muted-foreground mt-2">Loading recent collections...</p>
              </div>
            ) : recentCollections.length > 0 ? (
              <div className="space-y-3">
                {recentCollections.map((collection) => (
                  <div key={collection.id} className="flex items-center justify-between p-3 bg-muted rounded-lg hover:bg-muted/80 transition-colors border border-muted-foreground/10">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {collection.farmers?.full_name || collection.farmer_id || 'Unknown Farmer'}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {collection.collection_id} • {format(new Date(collection.collection_date), 'MMM dd, yyyy HH:mm')}
                      </p>
                      <Badge variant={collection.status === 'Collected' ? 'default' : collection.status === 'Cancelled' ? 'destructive' : 'secondary'} className="mt-1">
                        {collection.status === 'Cancelled' ? 'Cancelled' : collection.status}
                      </Badge>
                    </div>
                    <div className="text-right ml-2">
                      <p className="font-semibold">{collection.liters}L</p>
                      <p className="text-xs text-muted-foreground">KSh {collection.total_amount?.toFixed(0) || '0'}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-2" />
                <p className="text-muted-foreground">No recent collections found</p>
                <p className="text-xs text-muted-foreground mt-1">Your recent collections will appear here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </form>
    </div>
  );
};

export default EnhancedCollectionForm;