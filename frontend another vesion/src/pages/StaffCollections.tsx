import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { 
  Milk, 
  Camera, 
  MapPin, 
  QrCode,
  Smartphone,
  User,
  Scale,
  CheckCircle,
  Search,
  Plus,
  List,
  Thermometer,
  AlertTriangle,
  Check
} from "lucide-react";
import { Link } from "react-router-dom";
import apiService from '@/services/ApiService';
import { logger } from '../lib/logger';
import { useAuth } from '@/contexts/AuthContext';
import useGeolocation from '@/hooks/useGeolocation';
import { useIndexedDB } from '@/hooks/useIndexedDB';
import FarmerSearch from '@/components/FarmerSearch';
import CollectionHistory from '@/components/CollectionHistory';
import BulkCollectionEntry from '@/components/BulkCollectionEntry';
import CollectionForm from '@/components/CollectionForm';
import CollectionSuccess from '@/components/CollectionSuccess';
import { Farmer, Collection } from '@/types';
import { useCollectionSubmission } from '@/hooks/useCollectionSubmission';
import { useMobileOptimizations } from '@/hooks/useMobileOptimizations';
import GPSStatusIndicator from '@/components/GPSStatusIndicator';
import { useToastContext } from '@/components/ToastWrapper';

const StaffCollections = () => {
  // TODO: Add dark mode support using context/theme provider
  // TODO: Implement user preferences saving to localStorage
  // TODO: Add performance monitoring hooks for collection metrics
  // TODO: Add offline support with IndexedDB synchronization
  const { user } = useAuth();
  const toast = useToastContext();
  const { isMobile } = useMobileOptimizations();
  const [step, setStep] = useState(1);
  const [scannedFarmer, setScannedFarmer] = useState<Farmer | null>(null);
  const [collectionData, setCollectionData] = useState({
    liters: '',
    temperature: '',
    validationCode: '',
    notes: '',
    fatContent: '',
    proteinContent: ''
  });
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkCollections, setBulkCollections] = useState<any[]>([]);
  const [qualityGrade, setQualityGrade] = useState('A');
  const [qualityFeedback, setQualityFeedback] = useState<string | null>(null);
  const [temperatureStatus, setTemperatureStatus] = useState<'optimal' | 'warning' | 'critical' | null>(null);
  
  // Geolocation hook with enhanced options
  const { 
    location, 
    error: geoError, 
    loading: geoLoading, 
    getLocation,
    permissionState
  } = useGeolocation({
    enableHighAccuracy: true,
    timeout: 15000,
    maximumAge: 60000
  });

  // Determine GPS accuracy status for indicator
  const getGPSAccuracyStatus = () => {
    if (!location || location.accuracy === null) return 'acquiring';
    
    if (location.accuracy < 5) return 'excellent';
    if (location.accuracy < 15) return 'good';
    return 'poor';
  };

  // Collection submission hook
  const { submitCollection, loading: submissionLoading } = useCollectionSubmission(apiService);
  
  // IndexedDB hook
  const { isInitialized: dbInitialized, addCollection } = useIndexedDB();

  // Function to calculate quality grade based on inputs
  const calculateQualityGrade = (temperature: number | null, fat: number | null, protein: number | null) => {
    let grade = 'A';
    let feedback = '';
    
    // Temperature-based grading
    if (temperature !== null) {
      if (temperature >= 2 && temperature <= 4) {
        setTemperatureStatus('optimal');
        feedback += 'Temperature is optimal for Grade A milk. ';
      } else if (temperature > 4 && temperature <= 6) {
        setTemperatureStatus('warning');
        grade = 'B';
        feedback += 'Temperature is acceptable but not optimal. ';
      } else {
        setTemperatureStatus('critical');
        grade = temperature > 6 ? 'C' : 'B'; // Too hot is worse than too cold
        feedback += 'Temperature is outside optimal range. ';
      }
    }
    
    // Nutritional content assessment
    if (fat !== null && protein !== null) {
      // Ideal ranges for cow milk: fat 3.5-4.5%, protein 3.0-3.5%
      let fatScore = 0;
      let proteinScore = 0;
      
      if (fat >= 3.5 && fat <= 4.5) {
        fatScore = 2; // Excellent
      } else if (fat >= 3.0 && fat <= 5.0) {
        fatScore = 1; // Good
      } else {
        fatScore = 0; // Poor
      }
      
      if (protein >= 3.0 && protein <= 3.5) {
        proteinScore = 2; // Excellent
      } else if (protein >= 2.8 && protein <= 3.8) {
        proteinScore = 1; // Good
      } else {
        proteinScore = 0; // Poor
      }
      
      // Adjust quality grade based on nutritional content
      if (fatScore === 0 || proteinScore === 0) {
        // If either is poor, downgrade quality
        if (grade === 'A') {
          grade = 'B';
          feedback += 'Nutritional content is below optimal. ';
        } else if (grade === 'B') {
          grade = 'C';
          feedback += 'Nutritional content is poor. ';
        }
      } else if (fatScore === 2 && proteinScore === 2) {
        // If both are excellent, ensure at least Grade A
        if (grade === 'B' && temperatureStatus === 'optimal') {
          grade = 'A';
          feedback += 'Excellent nutritional content. ';
        }
      }
    }
    
    setQualityGrade(grade);
    setQualityFeedback(feedback.trim());
  };

  // Effect to recalculate quality when inputs change
  useEffect(() => {
    const temp = collectionData.temperature ? parseFloat(collectionData.temperature) : null;
    const fat = collectionData.fatContent ? parseFloat(collectionData.fatContent) : null;
    const protein = collectionData.proteinContent ? parseFloat(collectionData.proteinContent) : null;
    
    calculateQualityGrade(temp, fat, protein);
  }, [collectionData.temperature, collectionData.fatContent, collectionData.proteinContent]);

  useEffect(() => {
    const fetchFarmers = async () => {
    // TODO: Implement caching mechanism for farmers data
      // TODO: Add error retry mechanism for failed API calls
      // TODO: Add loading state management for individual components
      try {
        setLoading(true);
        const response = await apiService.Farmers.list(100, 0);
        const fetchedFarmers = response.items || [];
        setFarmers(fetchedFarmers);
        
        // Show success toast if this is a refresh
        if (farmers.length > 0) {
          toast.showSuccess('Data Refreshed', 'Farmers data has been updated successfully');
        }
        
        logger.info('Farmers data fetched successfully');
      } catch (err: any) {
        logger.error('Error fetching farmers data', err);
        toast.showError('Data Load Failed', 'Failed to load farmers data. Please try again later.');
        setError('Failed to load farmers data');
      } finally {
        setLoading(false);
      }
    };

    fetchFarmers();
  }, []);

  const handleScan = () => {
    // Simulate scanning - pick first approved farmer
    const farmer = farmers.find(f => f.kyc_status === 'approved');
    if (farmer) {
      setScannedFarmer(farmer);
      setStep(2);
    }
  };

  const handleFarmerSelect = (farmer: Farmer) => {
    setScannedFarmer(farmer);
    setStep(2);
  };

  const handleWeigh = () => {
    setStep(3);
  };

  const generateValidationCode = () => {
    // Generate automatic validation code in FARM-TIMESTAMP format
    return `FARM-${Date.now()}`;
  };

  const handleSubmit = async () => {
    if (!scannedFarmer || !user) return;
    
    toast.promiseToast(
      (async () => {
        const result = await submitCollection({
          farmerId: scannedFarmer.id,
          farmerName: scannedFarmer.name,
          staffId: user.id,
          liters: parseFloat(collectionData.liters),
          gpsLatitude: location?.latitude || 0,
          gpsLongitude: location?.longitude || 0,
          temperature: parseFloat(collectionData.temperature),
          fatContent: collectionData.fatContent ? parseFloat(collectionData.fatContent) : undefined,
          proteinContent: collectionData.proteinContent ? parseFloat(collectionData.proteinContent) : undefined,
          notes: collectionData.notes
        });
        
        if (result.success) {
          setStep(4);
          return result;
        } else {
          throw new Error(result.error || 'Failed to submit collection');
        }
      })(),
      {
        loading: 'Submitting Collection...',
        success: 'Collection recorded successfully!',
        error: 'Failed to submit collection. Please try again.'
      }
    );
  };

  const handleBulkSubmit = async (collections: any[]) => {
    try {
      // In a real implementation, you would submit all collections to the backend
      // For now, we'll just log them
      console.log('Bulk collections to submit:', collections);
      
      // Save to IndexedDB for offline capability
      if (dbInitialized) {
        for (const collection of collections) {
          try {
            await addCollection({
              id: `offline-${Date.now()}-${collection.farmer_id}`,
              farmerId: collection.farmer_id,
              farmerName: collection.farmerName || 'Unknown',
              staffId: collection.staff_id,
              liters: collection.liters,
              gpsLatitude: location?.latitude || 0,
              gpsLongitude: location?.longitude || 0,
              validationCode: collection.validation_code,
              qualityGrade: collection.quality_grade as 'A' | 'B' | 'C',
              temperature: collection.temperature,
              fatContent: collection.fat_content,
              proteinContent: collection.protein_content,
              timestamp: new Date().toISOString(),
              synced: false
            });
          } catch (err) {
            console.error('Failed to save bulk collection to IndexedDB:', err);
          }
        }
      }
      
      // Submit to backend
      for (const collection of collections) {
        try {
          await apiService.Collections.create(collection);
        } catch (err) {
          console.error('Failed to submit collection:', err);
        }
      }
      
      setBulkMode(false);
      setStep(4);
    } catch (err) {
      logger.error('Error submitting bulk collections', err);
      setError('Failed to submit bulk collections');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-dairy-blue"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex justify-center items-center h-screen">
        <div className="text-red-500 text-center">
          <p>Error loading data: {error}</p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dairy-50">
      {/* Header */}
      <header className="bg-white border-b border-dairy-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-dairy-blue to-dairy-green rounded-lg flex items-center justify-center">
                <Milk className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-dairy-900">Staff Collection Portal</h1>
                <p className="text-sm text-dairy-600">Record milk collections with verification</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge className="bg-dairy-green">Staff: {user?.full_name || user?.username || 'Unknown'}</Badge>
              <Link to="/">
                <Button variant="outline">Home</Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* GPS Status Banner - Show at top for visibility */}
        {(location || geoError || permissionState === 'denied') && (
          <div className="mb-6">
            <GPSStatusIndicator
              status={
                permissionState === 'denied' ? 'denied' :
                geoError ? 'error' :
                location ? getGPSAccuracyStatus() : 'acquiring'
              }
              accuracy={location?.accuracy}
              latitude={location?.latitude}
              longitude={location?.longitude}
              onRefresh={getLocation}
              onRequestPermission={getLocation}
            />
          </div>
        )}

        {/* Progress Steps */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center space-x-4">
            {[
              { num: 1, icon: QrCode, label: 'Scan' },
              { num: 2, icon: User, label: 'Verify' },
              { num: 3, icon: Scale, label: 'Weigh' },
              { num: 4, icon: CheckCircle, label: 'Submit' }
            ].map((stepItem, index) => (
              <div key={stepItem.num} className="flex items-center">
                <div className={`w-12 h-12 rounded-full flex flex-col items-center justify-center text-xs font-medium ${
                  step >= stepItem.num 
                    ? 'bg-dairy-blue text-white' 
                    : 'bg-dairy-200 text-dairy-600'
                }`}>
                  <stepItem.icon className="h-4 w-4" />
                  <span className="mt-1">{stepItem.label}</span>
                </div>
                {index < 3 && (
                  <div className={`w-12 h-1 mx-2 ${
                    step > stepItem.num ? 'bg-dairy-blue' : 'bg-dairy-200'
                  }`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-2xl mx-auto">
          {/* Mode Toggle */}
          <div className="flex justify-end mb-4">
            <Button 
              variant="outline" 
              onClick={() => setBulkMode(!bulkMode)}
              className={`flex items-center ${isMobile ? 'py-3 text-base' : ''}`}
            >
              {bulkMode ? (
                <>
                  <List className="h-4 w-4 mr-2" />
                  Single Entry
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4 mr-2" />
                  Bulk Entry
                </>
              )}
            </Button>
          </div>

          {bulkMode ? (
            <BulkCollectionEntry 
              farmers={farmers} 
              onSubmit={handleBulkSubmit} 
              onCancel={() => setBulkMode(false)} 
            />
          ) : (
            <>
              {step === 1 && (
                <Card className="border-dairy-200">
                  <CardHeader>
                    <CardTitle className="text-dairy-900 flex items-center">
                      <Search className="h-5 w-5 mr-2" />
                      Select Farmer
                    </CardTitle>
                    <CardDescription>Search for a farmer by name, phone, ID, or location</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <FarmerSearch onFarmerSelect={handleFarmerSelect} />
                    
                    <div className="border-t border-dairy-200 pt-6">
                      <h3 className="font-medium text-dairy-900 mb-3">Alternative Methods:</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <Button variant="outline" className="border-dairy-300" onClick={handleScan}>
                          <QrCode className="h-4 w-4 mr-2" />
                          QR Scan
                        </Button>
                        <Button variant="outline" className="border-dairy-300">
                          <Smartphone className="h-4 w-4 mr-2" />
                          NFC Tap
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === 2 && scannedFarmer && (
                <Card className="border-dairy-200">
                  <CardHeader>
                    <CardTitle className="text-dairy-900 flex items-center">
                      <User className="h-5 w-5 mr-2" />
                      Verify Farmer Identity
                    </CardTitle>
                    <CardDescription>Confirm farmer details and daily validation</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-dairy-blue/10 rounded-full flex items-center justify-center">
                        <User className="h-8 w-8 text-dairy-blue" />
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold text-dairy-900">{scannedFarmer.name}</h3>
                        <p className="text-dairy-600">{scannedFarmer.phone}</p>
                        <Badge className="bg-dairy-green mt-1">KYC Approved</Badge>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-dairy-600">Farmer ID:</span>
                        <p className="font-mono text-dairy-900">{scannedFarmer.id}</p>
                      </div>
                      <div>
                        <span className="text-dairy-600">Card Status:</span>
                        <p className="text-dairy-900">Active</p>
                      </div>
                      <div>
                        <span className="text-dairy-600">Last Collection:</span>
                        <p className="text-dairy-900">Yesterday</p>
                      </div>
                      <div>
                        <span className="text-dairy-600">Average Quality:</span>
                        <p className="text-dairy-900">Grade A</p>
                      </div>
                    </div>

                    <div className="bg-dairy-100 p-4 rounded-lg">
                      <Label htmlFor="validationCode">Daily Validation Code</Label>
                      <div className="flex space-x-3 mt-2">
                        <Input 
                          id="validationCode"
                          placeholder="Enter 6-digit code or auto-generate"
                          className="font-mono text-center text-lg"
                          maxLength={20}
                          value={collectionData.validationCode}
                          onChange={(e) => setCollectionData({...collectionData, validationCode: e.target.value})}
                        />
                        <Button variant="outline" onClick={() => setCollectionData({...collectionData, validationCode: generateValidationCode()})}>
                          Auto
                        </Button>
                      </div>
                      <p className="text-xs text-dairy-600 mt-2">
                        Farmer should provide today's validation code from SMS or use auto-generated code
                      </p>
                    </div>

                    <Button 
                      className="w-full bg-dairy-green hover:bg-dairy-green/90"
                      onClick={handleWeigh}
                    >
                      Proceed to Weighing
                    </Button>
                  </CardContent>
                </Card>
              )}

              {step === 3 && scannedFarmer && (
                <Card className="border-dairy-200">
                  <CardHeader>
                    <CardTitle className="text-dairy-900 flex items-center">
                      <Scale className="h-5 w-5 mr-2" />
                      Record Collection
                    </CardTitle>
                    <CardDescription>Weigh milk and capture verification photo</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <CollectionForm 
                      onSubmit={(data) => {
                        // Convert to the format expected by handleSubmit
                        const convertedData = {
                          liters: data.volume.toString(),
                          temperature: data.temperature.toString(),
                          fatContent: data.fat_content?.toString() || '',
                          proteinContent: data.protein_content?.toString() || '',
                          notes: data.notes || '',
                          validationCode: collectionData.validationCode
                        };
                        setCollectionData(convertedData);
                        
                        // Trigger the existing handleSubmit function
                        handleSubmit();
                      }}
                      onCancel={() => setStep(2)}
                      loading={submissionLoading}
                      farmerName={scannedFarmer.name}
                    />
                    
                    {/* Collection History */}
                    <div className="bg-dairy-50 p-4 rounded-lg">
                      <CollectionHistory farmerId={scannedFarmer.id} />
                    </div>
                    
                    {/* Quality Assessment */}
                    <div className="bg-dairy-100 p-4 rounded-lg">
                      <h4 className="font-medium text-dairy-900 mb-2">Quality Assessment:</h4>
                      
                      {/* Auto-calculated quality grade */}
                      <div className="mb-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium">Auto-calculated Grade:</span>
                          <Badge 
                            className={
                              qualityGrade === 'A' ? 'bg-green-500' :
                              qualityGrade === 'B' ? 'bg-yellow-500' :
                              'bg-red-500'
                            }
                          >
                            Grade {qualityGrade}
                          </Badge>
                        </div>
                        {qualityFeedback && (
                          <p className="text-xs text-dairy-600 mt-1">{qualityFeedback}</p>
                        )}
                      </div>
                      
                      {/* Manual override option */}
                      <div className="mt-3">
                        <Label className="text-sm">Override Quality Grade:</Label>
                        <div className="flex space-x-2 mt-2">
                          {['A', 'B', 'C', 'D', 'F'].map((grade) => (
                            <Button
                              key={grade}
                              size="sm"
                              variant={qualityGrade === grade ? "default" : "outline"}
                              className={
                                qualityGrade === grade ? 
                                (grade === 'A' ? 'bg-green-500 hover:bg-green-600' :
                                 grade === 'B' ? 'bg-yellow-500 hover:bg-yellow-600' :
                                 'bg-red-500 hover:bg-red-600') :
                                ''
                              }
                              onClick={() => setQualityGrade(grade)}
                            >
                              Grade {grade}
                            </Button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {step === 4 && scannedFarmer && (
                <CollectionSuccess 
                  farmerName={scannedFarmer.name}
                  volume={collectionData.liters}
                  qualityGrade={qualityGrade}
                  temperature={collectionData.temperature}
                  fatContent={collectionData.fatContent}
                  proteinContent={collectionData.proteinContent}
                  validationCode={collectionData.validationCode}
                  onNewCollection={() => {
                    setStep(1);
                    setScannedFarmer(null);
                    setCollectionData({ liters: '', temperature: '', validationCode: '', notes: '', fatContent: '', proteinContent: '' });
                    setQualityGrade('A');
                    setQualityFeedback(null);
                    setTemperatureStatus(null);
                  }}
                  onViewReport={() => {
                    // TODO: Implement view report functionality
                    console.log('View report clicked');
                  }}
                />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StaffCollections;