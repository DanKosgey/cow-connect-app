import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Scale, Trash2, Plus } from 'lucide-react';
import { Farmer, Collection } from '@/types';
import { useAuth } from '@/contexts/AuthContext';
import { CollectionsAPI } from '@/services/ApiService';

interface BulkCollectionEntryProps {
  farmers: Farmer[];
  onSubmit: (collections: any[]) => void;
  onCancel: () => void;
}

interface BulkCollectionItem {
  id: string;
  farmerId: string;
  farmerName: string;
  liters: string;
  temperature: string;
  qualityGrade: string;
}

const BulkCollectionEntry = ({ farmers, onSubmit, onCancel }: BulkCollectionEntryProps) => {
  const { user } = useAuth();
  const [collections, setCollections] = useState<BulkCollectionItem[]>([
    { id: '1', farmerId: '', farmerName: '', liters: '', temperature: '', qualityGrade: 'A' }
  ]);

  const addCollectionRow = () => {
    setCollections([
      ...collections,
      { 
        id: Date.now().toString(), 
        farmerId: '', 
        farmerName: '', 
        liters: '', 
        temperature: '', 
        qualityGrade: 'A' 
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

  const handleSubmit = async () => {
    // Validate and prepare collections for submission
    const validCollections = collections
      .filter(collection => 
        collection.farmerId && 
        collection.liters && 
        parseFloat(collection.liters) > 0
      )
      .map(collection => ({
        farmer_id: collection.farmerId,
        staff_id: user?.id || '',
        liters: parseFloat(collection.liters),
        temperature: collection.temperature ? parseFloat(collection.temperature) : null,
        quality_grade: collection.qualityGrade as 'A' | 'B' | 'C',
        // These would be populated with actual values in a real implementation
        gps_latitude: 0,
        gps_longitude: 0,
        validation_code: `FARM-${Date.now()}`,
      }));

    if (validCollections.length > 0) {
      try {
        // Submit collections to the backend
        const createdCollections = await CollectionsAPI.createBulk(validCollections);
        onSubmit(createdCollections);
      } catch (error) {
        console.error('Error submitting collections:', error);
        // You might want to show an error message to the user
      }
    }
  };

  return (
    <Card className="border-dairy-200">
      <CardHeader>
        <CardTitle className="text-dairy-900 flex items-center">
          <Scale className="h-5 w-5 mr-2" />
          Bulk Collection Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="border border-dairy-200 rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-dairy-50">
                <TableHead className="w-[200px]">Farmer</TableHead>
                <TableHead className="w-[100px]">Liters</TableHead>
                <TableHead className="w-[100px]">Temperature (°C)</TableHead>
                <TableHead className="w-[100px]">Quality</TableHead>
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
                          className="w-full"
                        />
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="0.0"
                      value={collection.liters}
                      onChange={(e) => updateCollection(collection.id, 'liters', e.target.value)}
                      className="text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      placeholder="4.0"
                      value={collection.temperature}
                      onChange={(e) => updateCollection(collection.id, 'temperature', e.target.value)}
                      className="text-center"
                    />
                  </TableCell>
                  <TableCell>
                    <select
                      value={collection.qualityGrade}
                      onChange={(e) => updateCollection(collection.id, 'qualityGrade', e.target.value)}
                      className="w-full rounded border border-dairy-300 px-2 py-1 text-sm"
                    >
                      <option value="A">A</option>
                      <option value="B">B</option>
                      <option value="C">C</option>
                    </select>
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

        <div className="flex justify-between">
          <Button variant="outline" onClick={addCollectionRow}>
            <Plus className="h-4 w-4 mr-2" />
            Add Row
          </Button>
          <div className="space-x-2">
            <Button variant="outline" onClick={onCancel}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={collections.length === 0}>
              Submit All Collections
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BulkCollectionEntry;