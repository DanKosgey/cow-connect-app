import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import CollectionForm from '@/components/collections/CollectionForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const CollectionRecordingPage: React.FC = () => {
  const navigate = useNavigate();
  const [collectionResult, setCollectionResult] = useState<any>(null);
  
  const handleSuccess = (result: any) => {
    setCollectionResult(result);
  };
  
  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button 
            variant="outline" 
            onClick={() => navigate(-1)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </Button>
          <h1 className="text-2xl font-bold text-gray-900">Milk Collection Recording</h1>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <CollectionForm 
              farmerId="farmer_123" 
              farmerName="John Doe"
              onSuccess={handleSuccess}
            />
          </div>
          
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Collection Information</CardTitle>
                <CardDescription>Details about this collection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-dairy-600">Farmer</span>
                  <span className="font-medium">John Doe</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dairy-600">Collection Point</span>
                  <span className="font-medium">Main Dairy Center</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dairy-600">Date</span>
                  <span className="font-medium">{new Date().toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-dairy-600">Time</span>
                  <span className="font-medium">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                </div>
              </CardContent>
            </Card>
            
            {collectionResult && (
              <Card>
                <CardHeader>
                  <CardTitle>Collection Result</CardTitle>
                  <CardDescription>Details of the recorded collection</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-dairy-600">Quality Grade</span>
                    <span className={`font-bold ${
                      collectionResult.quality_grade === 'A' ? 'text-green-600' : 
                      collectionResult.quality_grade === 'B' ? 'text-blue-600' : 'text-orange-600'
                    }`}>
                      Grade {collectionResult.quality_grade}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dairy-600">Calculated Price</span>
                    <span className="font-medium">KSh {collectionResult.calculated_price.toFixed(2)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dairy-600">Quality Score</span>
                    <span className="font-medium">{collectionResult.quality_score}/10</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-dairy-600">Collection ID</span>
                    <span className="font-mono text-sm">{collectionResult.id}</span>
                  </div>
                </CardContent>
              </Card>
            )}
            
            <Card>
              <CardHeader>
                <CardTitle>Guidelines</CardTitle>
                <CardDescription>Best practices for milk collection</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-dairy-blue"></div>
                  <p className="text-sm text-dairy-700">
                    Ensure temperature is between 2-8°C for proper storage
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-dairy-blue"></div>
                  <p className="text-sm text-dairy-700">
                    Take clear photos of the collection container
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-dairy-blue"></div>
                  <p className="text-sm text-dairy-700">
                    Accurate location data helps with logistics
                  </p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="mt-1 h-2 w-2 rounded-full bg-dairy-blue"></div>
                  <p className="text-sm text-dairy-700">
                    Record any anomalies in the notes section
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollectionRecordingPage;