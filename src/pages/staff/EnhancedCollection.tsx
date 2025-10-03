import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Slider } from '@/components/ui/slider';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useNavigate } from 'react-router-dom';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Milk, 
  MapPin, 
  Zap, 
  Thermometer, 
  Droplets, 
  Scale,
  CheckCircle2,
  AlertCircle,
  Camera,
  Clock,
  Target,
  Search,
  Plus,
  Eye,
  RefreshCw
} from 'lucide-react';
import { format } from 'date-fns';

interface Farmer {
  id: string;
  farmer_id: string;
  national_id: string;
  address: string;
  farm_location: string;
  profiles: {
    full_name: string;
    phone: string;
  };
}

interface Collection {
  id: string;
  collection_id: string;
  farmer_id: string;
  liters: number;
  quality_grade: string;
  fat_content: number;
  rate_per_liter: number;
  total_amount: number;
  gps_latitude: number;
  gps_longitude: number;
  validation_code: string;
  verification_code: string;
  collection_date: string;
  status: string;
  farmers: Farmer;
}

interface QualityMeasurement {
  fat_content: number;
  protein_content: number;
  snf_content: number;
  acidity_level: number;
  temperature: number;
  bacterial_count: number;
}

const EnhancedCollection = () => {
  const { user } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const navigate = useNavigate();

  // Single collection form state
  const [selectedFarmer, setSelectedFarmer] = useState('');
  const [liters, setLiters] = useState('');
  const [qualityGrade, setQualityGrade] = useState('');
  const [fatContent, setFatContent] = useState(3.5);
  const [location, setLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [qualityMeasurements, setQualityMeasurements] = useState<QualityMeasurement>({
    fat_content: 3.5,
    protein_content: 3.2,
    snf_content: 8.5,
    acidity_level: 6.7,
    temperature: 20,
    bacterial_count: 1000
  });

  // Bulk collection state
  const [bulkCollections, setBulkCollections] = useState<{
    farmerId: string;
    liters: string;
    qualityGrade: string;
    validated: boolean;
  }[]>([]);

  // Data state
  const [farmers, setFarmers] = useState<Farmer[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [currentRate, setCurrentRate] = useState(20);
  const [todayStats, setTodayStats] = useState({
    total_collections: 0,
    total_liters: 0,
    total_farmers: 0,
    average_quality: 0
  });

  const [loading, setLoading] = useState(false);
  const [currentTab, setCurrentTab] = useState('single');

  useEffect(() => {
    fetchData();
    getCurrentLocation();
    fetchCurrentRate();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch approved farmers
      const { data: farmersData, error: farmersError } = await supabase
        .from('farmers')
        .select(`
          id,
          farmer_id,
          national_id,
          address,
          farm_location,
          profiles!inner (
            full_name,
            phone
          )
        `)
        .eq('kyc_status', 'approved')
        .order('farmer_id');

      if (farmersError) throw farmersError;
      setFarmers((farmersData as Farmer[]) || []);

      // Fetch today's collections
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const { data: collectionsData, error: collectionsError } = await supabase
        .from('collections')
        .select(`
          *,
          farmers!inner (
            id,
            farmer_id,
            national_id,
            address,
            profiles!inner (
              full_name,
              phone
            )
          )
        `)
        .eq('staff_id', user?.id)
        .gte('collection_date', today.toISOString())
        .order('collection_date', { ascending: false });

      if (collectionsError) throw collectionsError;
      setCollections((collectionsData as Collection[]) || []);

      // Calculate stats
      const stats = {
        total_collections: (collectionsData || []).length,
        total_liters: (collectionsData || []).reduce((sum: number, c: any) => sum + Number(c.liters), 0),
        total_farmers: new Set((collectionsData || []).map(c => c.farmer_id)).size,
        average_quality: (collectionsData || []).reduce((sum: number, c: any) => {
          const gradeScore = c.quality_grade === 'A+' ? 10 : c.quality_grade === 'A' ? 8 : c.quality_grade === 'B' ? 6 : 4;
          return sum + gradeScore;
        }, 0) / (collectionsData?.length || 1)
      };
      setTodayStats(stats);

    } catch (error: any) {
      showError('Error fetching data', String(error?.message || 'Failed to load'));
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentRate = async () => {
    try {
      const { data, error } = await supabase
        .from('milk_rates')
        .select('rate_per_liter')
        .eq('is_active', true)
        .single();

      if (!error && data) {
        setCurrentRate(data.rate_per_liter);
      }
    } catch (error) {
      console.error('Error fetching current rate:', error);
    }
  };

  const getCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          });
        },
        (error) => {
          console.error('Error getting location:', error);
          toast({
            title: 'Location Error',
            description: 'Could not get GPS coordinates',
            variant: 'destructive'
          });
        }
      );
    }
  };

  const calculateQualityScore = (measurements: QualityMeasurement): number => {
    let score = 0;
    
    // Fat content scoring (optimal: 3.5-4.5%)
    if (measurements.fat_content >= 3.5 && measurements.fat_content <= 4.5) {
      score += 2.0;
    } else if (measurements.fat_content >= 3.0 && measurements.fat_content < 5.0) {
      score += 1.5;
    } else {
      score += 0.5;
    }

    // Protein content scoring (optimal: 3.0-3.5%)
    if (measurements.protein_content >= 3.0 && measurements.protein_content <= 3.5) {
      score += 2.0;
    } else if (measurements.protein_content >= 2.5 && measurements.protein_content <= 4.0) {
      score += 1.5;
    } else {
      score += 0.5;
    }

    // SNF scoring (optimal: 8.5-9.5%)
    if (measurements.snf_content >= 8.5 && measurements.snf_content <= 9.5) {
      score += 2.0;
    } else if (measurements.snf_content >= 8.0 && measurements.snf_content <= 10.0) {
      score += 1.5;
    } else {
      score += 0.5;
    }

    // Temperature scoring (optimal: 2-4°C)
    if (measurements.temperature >= 2 && measurements.temperature <= 4) {
      score += 2.0;
    } else if (measurements.temperature >= 1 && measurements.temperature <= 8) {
      score += 1.5;
    } else {
      score += 0.5;
    }

    // Bacterial count scoring (optimal: <1000 CFU/ml)
    if (measurements.bacterial_count < 1000) {
      score += 2.0;
    } else if (measurements.bacterial_count < 10000) {
      score += 1.5;
    } else {
      score += 0.5;
    }

    return Math.min(score, 10); // Cap at 10
  };

  const getQualityGrade = (score: number): string => {
    if (score >= 9) return 'A+';
    if (score >= 8) return 'A';
    if (score >= 6) return 'B';
    return 'C';
  };

  const calculatePaymentRate = (baseRate: number, qualityScore: number): number => {
    if (qualityScore >= 9) return baseRate * 1.1; // 10% bonus for exceptional quality
    if (qualityScore >= 8) return baseRate * 1.05; // 5% bonus for good quality
    if (qualityScore >= 6) return baseRate; // Standard rate
    return baseRate * 0.95; // 5% discount for poor quality
  };

  const handleSingleRecordCollection = async () => {
    if (!selectedFarmer || !liters || !qualityGrade) {
      toast({
        title: 'Missing information',
        description: 'Please fill in all required fields',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Get staff ID
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (staffError) throw staffError;

      const qualityScore = calculateQualityScore(qualityMeasurements);
      const finalGrade = getQualityGrade(qualityScore);
      const paymentRate = calculatePaymentRate(currentRate, qualityScore);
      const totalAmount = parseFloat(liters) * paymentRate;

      // Generate verification code
      const verificationCode = Math.random().toString(36).substring(2, 8).toUpperCase();

      // Record collection with enhanced data
      const { data: collection, error: collectionError } = await supabase
        .from('collections')
        .insert({
          farmer_id: selectedFarmer,
          staff_id: staff.id,
          liters: parseFloat(liters),
          quality_grade: finalGrade,
          rate_per_liter: paymentRate,
          total_amount: totalAmount,
          gps_latitude: location?.lat,
          gps_longitude: location?.lng,
          validation_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
          verification_code: verificationCode,
          collection_date: new Date().toISOString(),
          status: 'Collected'
        })
        .select()
        .single();

      if (collectionError) throw collectionError;

      // Record detailed quality measurements
      await supabase
        .from('milk_quality_parameters')
        .insert({
          collection_id: collection.id,
          fat_content: qualityMeasurements.fat_content,
          protein_content: qualityMeasurements.protein_content,
          snf_content: qualityMeasurements.snf_content,
          acidity_level: qualityMeasurements.acidity_level,
          temperature: qualityMeasurements.temperature,
          bacterial_count: qualityMeasurements.bacterial_count,
          measured_by: user?.id
        });

      toast({
        title: 'Collection recorded successfully!',
        description: `Collection ID: ${collection.collection_id}, Verification Code: ${verificationCode}`,
      });

      // Reset form
      setSelectedFarmer('');
      setLiters('');
      setQualityGrade('');
      setFatContent(3.5);
      fetchData();

    } catch (error: any) {
      toast({
        title: 'Error recording collection',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleBulkAddCollection = () => {
    setBulkCollections([...bulkCollections, {
      farmerId: '',
      liters: '',
      qualityGrade: 'A',
      validated: false
    }]);
  };

  const handleBulkRemoveCollection = (index: number) => {
    setBulkCollections(bulkCollections.filter((_, i) => i !== index));
  };

  const handleBulkFarmersChange = (index: number, farmerId: string) => {
    const updated = [...bulkCollections];
    updated[index].farmerId = farmerId;
    updated[index].validated = farmerId !== '' && updated[index].liters !== '';
    setBulkCollections(updated);
  };

  const handleBulkLitersChange = (index: number, liters: string) => {
    const updated = [...bulkCollections];
    updated[index].liters = liters;
    updated[index].validated = updated[index].farmerId !== '' && liters !== '';
    setBulkCollections(updated);
  };

  const handleBulkQualityChange = (index: number, qualityGrade: string) => {
    const updated = [...bulkCollections];
    updated[index].qualityGrade = qualityGrade;
    setBulkCollections(updated);
  };

  const handleBulkRecordCollections = async () => {
    const validCollections = bulkCollections.filter(c => c.validated);
    
    if (validCollections.length === 0) {
      toast({
        title: 'No valid collections',
        description: 'Please add at least one valid collection',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);

    try {
      // Get staff ID
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('id')
        .eq('user_id', user?.id)
        .single();

      if (staffError) throw staffError;

      // Prepare collection data
      const collectionsData = validCollections.map(collection => ({
        farmer_id: collection.farmerId,
        staff_id: staff.id,
        liters: parseFloat(collection.liters),
        quality_grade: collection.qualityGrade,
        rate_per_liter: currentRate,
        total_amount: parseFloat(collection.liters) * currentRate,
        gps_latitude: location?.lat,
        gps_longitude: location?.lng,
        validation_code: Math.random().toString(36).substring(2, 10).toUpperCase(),
        verification_code: Math.random().toString(36).substring(2, 8).toUpperCase(),
        collection_date: new Date().toISOString(),
        status: 'Collected'
      }));

      // Bulk insert collections
      const { data: collections, error: collectionError } = await supabase
        .from('collections')
        .insert(collectionsData)
        .select();

      if (collectionError) throw collectionError;

      toast({
        title: 'Bulk collections recorded successfully!',
        description: `${validCollections.length} collections processed`,
      });

      // Reset bulk data
      setBulkCollections([]);
      fetchData();

    } catch (error: any) {
      toast({
        title: 'Error recording bulk collections',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const renderSingleCollection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Single Collection Recording
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Farmer Selection */}
          <div className="space-y-2">
            <Label htmlFor="farmer">Select Farmer *</Label>
            <Select value={selectedFarmer} onValueChange={setSelectedFarmer}>
              <SelectTrigger>
                <SelectValue placeholder="Choose a farmer" />
              </SelectTrigger>
              <SelectContent>
                {farmers.map((farmer) => (
                  <SelectItem key={farmer.id} value={farmer.id}>
                    {farmer.profiles.full_name} - {farmer.farmer_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Quantity */}
          <div className="space-y-2">
            <Label htmlFor="liters">Quantity (Liters) *</Label>
            <Input
              id="liters"
              type="number"
              step="0.1"
              min="0"
              max="100"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              placeholder="Enter liters"
            />
          </div>

          {/* Quality Grade */}
          <div className="space-y-2">
            <Label htmlFor="quality">Quality Grade *</Label>
            <Select value={qualityGrade} onValueChange={setQualityGrade}>
              <SelectTrigger>
                <SelectValue placeholder="Select quality grade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="A+">A+ (Exceptional - Score: 9-10)</SelectItem>
                <SelectItem value="A">A (Good - Score: 8-9)</SelectItem>
                <SelectItem value="B">B (Average - Score: 6-8)</SelectItem>
                <SelectItem value="C">C (Below Average - Score: &lt;6)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Fat Content */}
          <div className="space-y-2">
            <Label>Fat Content: {fatContent}%</Label>
            <Slider
              value={[fatContent]}
              onValueChange={([value]) => setFatContent(value)}
              max={6}
              min={1}
              step={0.1}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>1%</span>
              <span>3.5% (Ideal)</span>
              <span>6%</span>
            </div>
          </div>

          {/* Advanced Quality Measurements */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Thermometer className="h-4 w-4" />
                Detailed Quality Measurements
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Protein Content: {qualityMeasurements.protein_content}%</Label>
                  <Slider
                    value={[qualityMeasurements.protein_content]}
                    onValueChange={([value]) => setQualityMeasurements(prev => ({...prev, protein_content: value}))}
                    max={5}
                    min={2}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>SNF Content: {qualityMeasurements.snf_content}%</Label>
                  <Slider
                    value={[qualityMeasurements.snf_content]}
                    onValueChange={([value]) => setQualityMeasurements(prev => ({...prev, snf_content: value}))}
                    max={12}
                    min={7}
                    step={0.1}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Temperature: {qualityMeasurements.temperature}°C</Label>
                  <Slider
                    value={[qualityMeasurements.temperature]}
                    onValueChange={([value]) => setQualityMeasurements(prev => ({...prev, temperature: value}))}
                    max={50}
                    min={0}
                    step={0.5}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Acidity Level: {qualityMeasurements.acidity_level}</Label>
                  <Slider
                    value={[qualityMeasurements.acidity_level]}
                    onValueChange={([value]) => setQualityMeasurements(prev => ({...prev, acidity_level: value}))}
                    max={10}
                    min={4}
                    step={0.1}
                  />
                </div>
              </div>

              {/* Quality Score Display */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    Quality Score: {calculateQualityScore(qualityMeasurements).toFixed(1)}/10
                  </div>
                  <div className="text-lg font-medium">
                    Grade: {getQualityGrade(calculateQualityScore(qualityMeasurements))}
                  </div>
                  <div className="text-sm text-gray-600">
                    Payment Rate: ₹{calculatePaymentRate(currentRate, calculateQualityScore(qualityMeasurements)).toFixed(2)}/liter
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Summary */}
          {liters && (
            <Card className="bg-green-50 border-green-200">
              <CardContent className="p-4">
                <div className="space-y-2">
                  <div className="text-lg font-semibold text-green-800">Payment Summary</div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>Quantity: {liters} L</div>
                    <div>Base Rate: ₹{currentRate}/L</div>
                    <div>Quality Rate: ₹{calculatePaymentRate(currentRate, calculateQualityScore(qualityMeasurements)).toFixed(2)}/L</div>
                    <div className="font-semibold text-green-700">
                      Total Amount: ₹{(parseFloat(liters) * calculatePaymentRate(currentRate, calculateQualityScore(qualityMeasurements))).toFixed(2)}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* GPS Location */}
          <div className="space-y-2">
            <Label className="flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              GPS Location
            </Label>
            <div className="text-sm text-muted-foreground">
              {location ? (
                <span>Lat: {location.lat.toFixed(6)}, Long: {location.lng.toFixed(6)}</span>
              ) : (
                <span>Getting location...</span>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={getCurrentLocation}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh Location
            </Button>
          </div>

          <Button 
            onClick={handleSingleRecordCollection}
            disabled={loading || !selectedFarmer || !liters || !qualityGrade}
            className="w-full"
            size="lg"
          >
            {loading ? 'Recording Collection...' : 'Record Collection'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );

  const renderBulkCollection = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Plus className="h-5 w-5" />
              Bulk Collection Recording
            </CardTitle>
            <Button onClick={handleBulkAddCollection}>
              <Plus className="h-4 w-4 mr-2" />
              Add Collection
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {bulkCollections.map((collection, index) => (
            <Card key={index}>
              <CardContent className="p-4">
                <div className="flex items-center gap-4">
                  <div className="text-sm font-medium">#{index + 1}</div>
                  
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <Label className="text-xs">Farmer</Label>
                      <Select 
                        value={collection.farmerId} 
                        onValueChange={(value) => handleBulkFarmersChange(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select farmer" />
                        </SelectTrigger>
                        <SelectContent>
                          {farmers.map((farmer) => (
                            <SelectItem key={farmer.id} value={farmer.id}>
                              {farmer.profiles.full_name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Liters</Label>
                      <Input
                        type="number"
                        step="0.1"
                        value={collection.liters}
                        onChange={(e) => handleBulkLitersChange(index, e.target.value)}
                        placeholder="Litres"
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs">Quality</Label>
                      <Select 
                        value={collection.qualityGrade} 
                        onValueChange={(value) => handleBulkQualityChange(index, value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A+">A+</SelectItem>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {collection.validated ? (
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                    ) : (
                      <AlertCircle className="h-5 w-5 text-yellow-500" />
                    )}
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleBulkRemoveCollection(index)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {bulkCollections.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No collections added yet. Click "Add Collection" to start.
            </div>
          )}

          {bulkCollections.length > 0 && (
            <div className="flex justify-between items-center pt-4 border-t">
              <div className="text-sm text-gray-600">
                {bulkCollections.filter(c => c.validated).length} valid collections ready
              </div>
              <Button 
                onClick={handleBulkRecordCollections}
                disabled={loading || bulkCollections.filter(c => c.validated).length === 0}
              >
                {loading ? 'Processing...' : `Record ${bulkCollections.filter(c => c.validated).length} Collections`}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );

  const renderTodayCollections = () => (
    <Card>
      <CardHeader>
        <CardTitle>Today's Collections</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Collection ID</TableHead>
              <TableHead>Farmer</TableHead>
              <TableHead>Quantity</TableHead>
              <TableHead>Quality</TableHead>
              <TableHead>Rate</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Time</TableHead>
              <TableHead>Verify Code</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((collection) => (
              <TableRow key={collection.id}>
                <TableCell className="font-mono text-sm">{collection.collection_id}</TableCell>
                <TableCell>
                  <div>
                    <div className="font-medium">{collection.farmers.profiles.full_name}</div>
                    <div className="text-xs text-gray-500">{collection.farmers.farmer_id}</div>
                  </div>
                </TableCell>
                <TableCell className="font-medium">{collection.liters} L</TableCell>
                <TableCell>
                  <Badge variant="secondary">{collection.quality_grade}</Badge>
                </TableCell>
                <TableCell>₹{collection.rate_per_liter}/L</TableCell>
                <TableCell className="font-medium">₹{collection.total_amount}</TableCell>
                <TableCell>
                  <Badge className={
                    collection.status === 'Collected' ? 'bg-blue-100 text-blue-800' :
                    collection.status === 'Verified' ? 'bg-green-100 text-green-800' :
                    collection.status === 'Paid' ? 'bg-purple-100 text-purple-800' :
                    'bg-gray-100 text-gray-800'
                  }>
                    {collection.status}
                  </Badge>
                </TableCell>
                <TableCell className="text-sm">
                  {format(new Date(collection.collection_date), 'HH:mm')}
                </TableCell>
                <TableCell className="font-mono text-xs">
                  {collection.verification_code}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>

        {collections.length === 0 && (
          <div className="text-center py-8 text-gray-500">
            No collections recorded today
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <DashboardLayout>
      <div className="p-8 space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-bold">Enhanced Collection System</h1>
            <p className="text-muted-foreground mt-2">
              Record milk collections with advanced quality measurements
            </p>
          </div>
        </div>

        {/* Today's Stats */}
        <div className="grid gap-6 md:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Today's Collections</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.total_collections}</div>
              <p className="text-xs text-muted-foreground">Collections recorded</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Liters</CardTitle>
              <Milk className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.total_liters.toFixed(1)} L</div>
              <p className="text-xs text-muted-foreground">Milk collected today</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Farmers Visited</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.total_farmers}</div>
              <p className="text-xs text-muted-foreground">Unique farmers</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Quality</CardTitle>
              <Scale className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{todayStats.average_quality.toFixed(1)}/10</div>
              <p className="text-xs text-muted-foreground">Average quality score</p>
            </CardContent>
          </Card>
        </div>

        {/* Main Collection Interface */}
        <Tabs value={currentTab} onValueChange={setCurrentTab}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="single">Single Collection</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Collection</TabsTrigger>
            <TabsTrigger value="history">Today's Records</TabsTrigger>
          </TabsList>

          <TabsContent value="single">{renderSingleCollection()}</TabsContent>
          <TabsContent value="bulk">{renderBulkCollection()}</TabsContent>
          <TabsContent value="history">{renderTodayCollections()}</TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
};

export default EnhancedCollection;
