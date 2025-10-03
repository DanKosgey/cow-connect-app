import React, { useState, useEffect, useRef } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card';
import { 
  Button 
} from '@/components/ui/button';
import { 
  Input 
} from '@/components/ui/input';
import { 
  Label 
} from '@/components/ui/label';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Badge 
} from '@/components/ui/badge';
import { 
  Progress 
} from '@/components/ui/progress';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { 
  Alert, 
  AlertDescription, 
  AlertTitle 
} from '@/components/ui/alert';
import { 
  Scale, 
  Trash2, 
  Plus, 
  QrCode, 
  Wifi, 
  WifiOff, 
  Thermometer,
  MapPin,
  Upload,
  CheckCircle,
  AlertCircle,
  Loader2,
  PenTool
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { CollectionsAPI } from '@/services/ApiService';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import useGeolocation from '@/hooks/useGeolocation';
import { Farmer, Collection } from '@/types';
import { BulkCollectionData, BulkCollectionRequest, BulkCollectionResponse } from '@/types/bulkCollection';

interface BulkCollectionEntryProps {
  farmers: Farmer[];
  routeId: string;
  onSubmit: (response: BulkCollectionResponse) => void;
  onCancel: () => void;
}

interface BulkCollectionItem {
  id: string;
  farmerId: string;
  farmerName: string;
  volume: string;
  temperature: string;
  qualityGrade: 'A' | 'B' | 'C';
  containerId?: string;
  location?: {
    lat: number;
    lng: number;
  };
}

const BulkCollectionEntryEnhanced = ({ 
  farmers, 
  routeId, 
  onSubmit, 
  onCancel 
}: BulkCollectionEntryProps) => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<BulkCollectionItem[]>([
    { 
      id: '1', 
      farmerId: '', 
      farmerName: '', 
      volume: '', 
      temperature: '', 
      qualityGrade: 'A',
      containerId: ''
    }
  ]);
  const [staffNotes, setStaffNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [progress, setProgress] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  
  // Barcode scanner hook
  const { scanning, result, error: scannerError, startScanning, stopScanning } = useBarcodeScanner({
    onScan: (code) => {
      // Assign the scanned container ID to the currently focused collection
      const focusedIndex = collections.findIndex(c => c.id === document.activeElement?.id);
      if (focusedIndex !== -1) {
        updateCollection(collections[focusedIndex].id, 'containerId', code);
      }
    }
  });
  
  // Offline sync hook
  const { addToQueue, syncQueue, queueStatus, isSyncing, syncError } = useOfflineSync();
  
  // Geolocation hook
  const { location, error: locationError, loading: locationLoading } = useGeolocation();
  
  // Track online/offline status
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

  const addCollectionRow = () => {
    setCollections([
      ...collections,
      { 
        id: Date.now().toString(), 
        farmerId: '', 
        farmerName: '', 
        volume: '', 
        temperature: '', 
        qualityGrade: 'A',
        containerId: ''
      }
    ]);
  };

  const removeCollectionRow = (id: string) => {
    if (collections.length > 1) {
      setCollections(collections.filter(collection => collection.id !== id));
    }
  };

  const updateCollection = (id: string, field: keyof BulkCollectionItem, value: string) => {
    setCollections(collections.map(collection => 
      collection.id === id ? { ...collection, [field]: value } : collection
    ));
  };

  const handleFarmerSelect = (collectionId: string, farmer: Farmer) => {
    updateCollection(collectionId, 'farmerId', farmer.id);
    updateCollection(collectionId, 'farmerName', farmer.name);
  };

  const handleScanContainer = (collectionId: string) => {
    // Set focus to the container ID field for this collection
    const element = document.getElementById(`container-${collectionId}`);
    if (element) {
      (element as HTMLInputElement).focus();
    }
    
    // Start scanning
    startScanning();
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    setSubmitSuccess(false);
    setProgress(0);
    
    try {
      // Validate and prepare collections for submission
      
      // Check for duplicate container IDs
      const containerIds = collections
        .filter(collection => collection.containerId)
        .map(collection => collection.containerId);
      
      const duplicateContainerIds = containerIds.filter((id, index) => containerIds.indexOf(id) !== index);
      if (duplicateContainerIds.length > 0) {
        throw new Error(`Duplicate container IDs found: ${duplicateContainerIds.join(', ')}. Each container ID must be unique.`);
      }
      
      const validCollections = collections
        .filter(collection => 
          collection.farmerId && 
          collection.volume && 
          parseFloat(collection.volume) > 0
        )
        .map((collection, index) => {
          // Update progress
          setProgress(((index + 1) / collections.length) * 50);
          
          // Validate temperature for cold chain compliance (must be between 2-4°C)
          const temperature = collection.temperature ? parseFloat(collection.temperature) : 0;
          if (temperature < 2 || temperature > 4) {
            throw new Error(`Temperature for farmer ${collection.farmerName || collection.farmerId} must be between 2-4°C for cold chain compliance`);
          }
          
          return {
            farmer_id: collection.farmerId,
            staff_id: user?.id || '',
            liters: parseFloat(collection.volume),
            temperature: temperature,
            fat_content: 0, // Will be updated with quality tests
            protein_content: 0, // Will be updated with quality tests
            ph_level: 0, // Will be updated with quality tests
            gps_latitude: location?.latitude || 0,
            gps_longitude: location?.longitude || 0,
            quality_grade: collection.qualityGrade,
            notes: staffNotes
          };
        });

      if (validCollections.length === 0) {
        throw new Error('No valid collections to submit');
      }

      // Check if signature is captured
      if (!signature) {
        throw new Error('Staff signature is required before submitting collections');
      }

      // Prepare the bulk collection request
      const bulkRequest = {
        collections: validCollections,
        route_id: routeId,
        staff_id: user?.id || '',
        collected_at: new Date().toISOString(),
        staff_notes: staffNotes,
        staff_signature: signature // Add signature to the request
      };

      // Update progress
      setProgress(75);

      // Submit to backend or save to offline queue
      let response: BulkCollectionResponse;
      
      if (isOnline) {
        // Submit directly to backend
        response = await CollectionsAPI.createBulk(bulkRequest);
      } else {
        // Save to offline queue
        for (const collection of validCollections) {
          const collectionData: Collection = {
            id: `offline-${Date.now()}-${collection.farmer_id}`,
            farmer_id: collection.farmer_id,
            staff_id: collection.staff_id,
            liters: collection.liters,
            gps_latitude: collection.gps_latitude,
            gps_longitude: collection.gps_longitude,
            timestamp: new Date().toISOString(),
            quality_grade: collection.quality_grade,
            temperature: collection.temperature
          };
          
          await addToQueue(collectionData);
        }
        
        // Create a mock response for offline submission
        response = {
          created_collections: validCollections.map(c => ({
            id: `offline-${Date.now()}-${c.farmer_id}`,
            farmer_id: c.farmer_id,
            quality_grade: c.quality_grade,
            calculated_price: c.liters * 50 // Assuming KES 50 per liter
          })),
          failed_collections: [],
          summary: {
            total_volume: validCollections.reduce((sum, c) => sum + c.liters, 0),
            average_quality: validCollections.length > 0 ? 
              validCollections.reduce((sum, c) => sum + (c.quality_grade === 'A' ? 3 : c.quality_grade === 'B' ? 2 : 1), 0) / validCollections.length : 0,
            total_value: validCollections.reduce((sum, c) => sum + (c.liters * 50), 0)
          }
        };
      }

      // Update progress
      setProgress(100);
      
      // Success
      setSubmitSuccess(true);
      onSubmit(response);
      
      // If we're online, try to sync any pending offline collections
      if (isOnline) {
        await syncQueue();
      }
    } catch (error) {
      console.error('Error submitting collections:', error);
      setSubmitError(error instanceof Error ? error.message : 'Failed to submit collections');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Filter farmers based on search input
  const filteredFarmers = (searchTerm: string) => {
    return farmers.filter(farmer => 
      farmer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      farmer.phone.includes(searchTerm) ||
      farmer.national_id.includes(searchTerm)
    );
  };

  return (
    <Card className="border-dairy-200">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="text-dairy-900 flex items-center">
              <Scale className="h-5 w-5 mr-2" />
              Bulk Collection Entry
            </CardTitle>
            <CardDescription>
              Record multiple milk collections for farmers on this route
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            {isOnline ? (
              <Badge className="bg-green-100 text-green-800">
                <Wifi className="h-3 w-3 mr-1" />
                Online
              </Badge>
            ) : (
              <Badge className="bg-yellow-100 text-yellow-800">
                <WifiOff className="h-3 w-3 mr-1" />
                Offline
              </Badge>
            )}
            {queueStatus.pending > 0 && (
              <Badge className="bg-blue-100 text-blue-800">
                {queueStatus.pending} pending
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Scanner and sync status */}
        {(scanning || scannerError || syncError || isSyncing) && (
          <Alert variant={scannerError || syncError ? "destructive" : "default"}>
            <AlertTitle className="flex items-center">
              {scanning && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {scannerError && <AlertCircle className="h-4 w-4 mr-2" />}
              {syncError && <AlertCircle className="h-4 w-4 mr-2" />}
              {isSyncing && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              {scanning && "Scanning Barcode"}
              {scannerError && "Scanner Error"}
              {syncError && "Sync Error"}
              {isSyncing && "Syncing Offline Data"}
            </AlertTitle>
            <AlertDescription>
              {scanning && "Point your camera at a barcode to scan"}
              {scannerError && scannerError}
              {syncError && syncError}
              {isSyncing && "Syncing offline collections with the server..."}
            </AlertDescription>
          </Alert>
        )}

        {/* Progress indicator during submission */}
        {isSubmitting && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Submitting collections...</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Error message */}
        {submitError && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Submission Error</AlertTitle>
            <AlertDescription>{submitError}</AlertDescription>
          </Alert>
        )}

        {/* Success message */}
        {submitSuccess && (
          <Alert className="border-green-200 bg-green-50">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertTitle className="text-green-800">Success!</AlertTitle>
            <AlertDescription className="text-green-700">
              Collections submitted successfully.
            </AlertDescription>
          </Alert>
        )}

        {/* Collections table */}
        <div className="border border-dairy-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-dairy-50">
                <TableHead className="w-[200px]">Farmer</TableHead>
                <TableHead className="w-[100px]">Liters</TableHead>
                <TableHead className="w-[100px]">Temperature (°C)</TableHead>
                <TableHead className="w-[100px]">Quality</TableHead>
                <TableHead className="w-[150px]">Container ID</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {collections.map((collection) => (
                <TableRow key={collection.id}>
                  <TableCell>
                    <div className="flex items-center space-x-2">
                      <div className="flex-1">
                        <Input
                          type="text"
                          placeholder="Search farmer..."
                          value={collection.farmerName}
                          onChange={(e) => updateCollection(collection.id, 'farmerName', e.target.value)}
                          list={`farmers-${collection.id}`}
                          className="w-full"
                        />
                        <datalist id={`farmers-${collection.id}`}>
                          {filteredFarmers(collection.farmerName).map(farmer => (
                            <option 
                              key={farmer.id} 
                              value={farmer.name}
                              onClick={() => handleFarmerSelect(collection.id, farmer)}
                            />
                          ))}
                        </datalist>
                      </div>
                      {locationLoading && (
                        <Loader2 className="h-4 w-4 animate-spin text-dairy-500" />
                      )}
                      {location && (
                        <MapPin className="h-4 w-4 text-green-500" />
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={collection.volume}
                      onChange={(e) => updateCollection(collection.id, 'volume', e.target.value)}
                      className="text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="relative">
                      <Input
                        type="number"
                        placeholder="4.0"
                        value={collection.temperature}
                        onChange={(e) => updateCollection(collection.id, 'temperature', e.target.value)}
                        className="text-center pl-8"
                      />
                      <Thermometer className="absolute left-2 top-2.5 h-4 w-4 text-dairy-500" />
                    </div>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={collection.qualityGrade}
                      onValueChange={(value) => updateCollection(collection.id, 'qualityGrade', value as 'A' | 'B' | 'C')}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="A">A</SelectItem>
                        <SelectItem value="B">B</SelectItem>
                        <SelectItem value="C">C</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex space-x-1">
                      <Input
                        id={`container-${collection.id}`}
                        type="text"
                        placeholder="Scan or enter ID"
                        value={collection.containerId || ''}
                        onChange={(e) => updateCollection(collection.id, 'containerId', e.target.value)}
                        className="flex-1 text-sm"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleScanContainer(collection.id)}
                        className="px-2"
                      >
                        <QrCode className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCollectionRow(collection.id)}
                      disabled={collections.length <= 1}
                    >
                      <Trash2 className="h-4 w-4 text-dairy-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        {/* Staff notes */}
        <div className="space-y-2">
          <Label htmlFor="staff-notes">Staff Notes</Label>
          <Input
            id="staff-notes"
            placeholder="Any additional notes about this collection batch..."
            value={staffNotes}
            onChange={(e) => setStaffNotes(e.target.value)}
          />
        </div>

        {/* Signature capture */}
        <div className="space-y-2">
          <Label>Staff Signature</Label>
          <div className="flex items-center space-x-2">
            {signature ? (
              <div className="flex items-center space-x-2">
                <img 
                  src={signature} 
                  alt="Staff Signature" 
                  className="h-16 border border-dairy-200 rounded"
                  loading="lazy"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setSignature(null);
                    setShowSignaturePad(true);
                  }}
                >
                  Re-sign
                </Button>
              </div>
            ) : (
              <Button 
                variant="outline" 
                onClick={() => setShowSignaturePad(true)}
                className="flex items-center"
              >
                <PenTool className="h-4 w-4 mr-2" />
                Capture Signature
              </Button>
            )}
          </div>
          
          {/* Simple signature pad simulation for mobile devices */}
          {showSignaturePad && (
            <div className="border border-dairy-200 rounded-lg p-4 bg-white">
              <div className="flex justify-between items-center mb-2">
                <h4 className="font-medium">Sign Below</h4>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setShowSignaturePad(false)}
                >
                  Cancel
                </Button>
              </div>
              <div className="border border-dairy-300 rounded h-32 flex items-center justify-center bg-gray-50">
                <p className="text-dairy-500 text-sm">Signature pad would appear here on mobile devices</p>
              </div>
              <div className="flex justify-end space-x-2 mt-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => setShowSignaturePad(false)}
                >
                  Cancel
                </Button>
                <Button 
                  size="sm" 
                  onClick={() => {
                    // In a real implementation, this would capture the actual signature
                    // For now, we'll simulate with a data URL
                    setSignature('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjQwIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxwYXRoIGQ9Ik0xMCAyMEwzMCAxMCIgc3Ryb2tlPSJibGFjayIgc3Ryb2tlLXdpZHRoPSIyIiBmaWxsPSJub25lIi8+PC9zdmc+');
                    setShowSignaturePad(false);
                  }}
                >
                  Save Signature
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Action buttons */}
        <div className="flex justify-between items-center">
          <Button variant="outline" onClick={addCollectionRow}>
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
          <div className="flex space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={collections.length === 0 || isSubmitting || !signature}
              className="bg-dairy-blue hover:bg-dairy-blue/90"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Submitting...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Submit All Collections
                </>
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkCollectionEntryEnhanced;