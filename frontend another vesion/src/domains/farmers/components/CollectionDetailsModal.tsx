import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Milk, 
  Calendar, 
  MapPin, 
  Thermometer, 
  User, 
  CheckCircle,
  Copy,
  Download
} from 'lucide-react';
import { Collection } from '@/types';

interface CollectionDetailsModalProps {
  collection: Collection;
  onClose: () => void;
  onDownloadReceipt?: () => void;
}

const CollectionDetailsModal: React.FC<CollectionDetailsModalProps> = ({ 
  collection, 
  onClose,
  onDownloadReceipt
}) => {
  const handleCopyCode = () => {
    navigator.clipboard.writeText(collection.validation_code);
    // In a real app, you might show a toast notification here
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader className="border-b border-gray-200">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center">
                <Milk className="h-5 w-5 mr-2 text-green-600" />
                Collection Details
              </CardTitle>
              <CardDescription>
                Detailed information about your milk collection
              </CardDescription>
            </div>
            <Button variant="ghost" onClick={onClose} className="text-gray-500 hover:text-gray-700">
              <span className="text-2xl">&times;</span>
            </Button>
          </div>
        </CardHeader>
        
        <CardContent className="p-6">
          {/* Collection Summary */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{collection.liters}L Milk Collection</h3>
                <p className="text-gray-600">Collection ID: {collection.id}</p>
              </div>
              <div className="text-right">
                <div className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  Grade {collection.quality_grade}
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  {new Date(collection.timestamp).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>

          {/* Collection Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Calendar className="h-4 w-4 mr-2 text-gray-500" />
                Date & Time
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Date:</span>
                  <span className="font-medium">
                    {new Date(collection.timestamp).toLocaleDateString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Time:</span>
                  <span className="font-medium">
                    {new Date(collection.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <Thermometer className="h-4 w-4 mr-2 text-gray-500" />
                Quality Metrics
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Temperature:</span>
                  <span className="font-medium">{collection.temperature}°C</span>
                </div>
                {collection.fat_content && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Fat Content:</span>
                    <span className="font-medium">{collection.fat_content}%</span>
                  </div>
                )}
                {collection.protein_content && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Protein Content:</span>
                    <span className="font-medium">{collection.protein_content}%</span>
                  </div>
                )}
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <User className="h-4 w-4 mr-2 text-gray-500" />
                Staff Information
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Staff Name:</span>
                  <span className="font-medium">David Ochieng</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Staff ID:</span>
                  <span className="font-medium">STAFF-00124</span>
                </div>
              </div>
            </div>

            <div className="border border-gray-200 rounded-lg p-4">
              <h4 className="font-medium text-gray-900 mb-3 flex items-center">
                <MapPin className="h-4 w-4 mr-2 text-gray-500" />
                Location
              </h4>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-500">Coordinates:</span>
                  <span className="font-medium">
                    {collection.gps_latitude?.toFixed(4)}, {collection.gps_longitude?.toFixed(4)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Collection Center:</span>
                  <span className="font-medium">Nairobi Main Center</span>
                </div>
              </div>
            </div>
          </div>

          {/* Validation Code */}
          <div className="border border-gray-200 rounded-lg p-4 mb-6">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <CheckCircle className="h-4 w-4 mr-2 text-gray-500" />
              Validation Code
            </h4>
            <div className="flex items-center justify-between bg-gray-50 p-3 rounded">
              <span className="font-mono text-lg font-bold">{collection.validation_code}</span>
              <div className="flex space-x-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleCopyCode}
                  className="flex items-center"
                >
                  <Copy className="h-4 w-4 mr-1" />
                  Copy
                </Button>
                {onDownloadReceipt && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={onDownloadReceipt}
                    className="flex items-center"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Receipt
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="border border-gray-200 rounded-lg p-4">
            <h4 className="font-medium text-gray-900 mb-3">Collection Notes</h4>
            <p className="text-gray-600">
              No additional notes for this collection.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 mt-6">
            <Button variant="outline" onClick={onClose}>
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default CollectionDetailsModal;