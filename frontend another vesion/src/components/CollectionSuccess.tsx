import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, Printer, Share2 } from 'lucide-react';

interface CollectionSuccessProps {
  farmerName: string;
  volume: string;
  qualityGrade: string;
  temperature: string;
  fatContent?: string;
  proteinContent?: string;
  validationCode: string;
  onNewCollection: () => void;
  onViewReport: () => void;
}

const CollectionSuccess: React.FC<CollectionSuccessProps> = ({ 
  farmerName,
  volume,
  qualityGrade,
  temperature,
  fatContent,
  proteinContent,
  validationCode,
  onNewCollection,
  onViewReport
}) => {
  // Get quality grade color
  const getQualityGradeColor = (grade: string) => {
    switch (grade) {
      case 'A': return 'bg-primary-500';
      case 'B': return 'bg-warning';
      case 'C': return 'bg-orange-500';
      case 'D': return 'bg-error';
      case 'F': return 'bg-error';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Card className="border-primary-200">
      <CardHeader>
        <CardTitle className="text-primary-900 flex items-center">
          <CheckCircle className="h-5 w-5 mr-2 text-primary-600" />
          Collection Recorded Successfully
        </CardTitle>
        <CardDescription>Collection details and validation information</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="h-8 w-8 text-primary-600" />
          </div>
          <h3 className="text-lg font-semibold text-primary-900 mb-2">
            Collection Successfully Recorded
          </h3>
          <p className="text-primary-700">
            The transaction has been verified and recorded.
          </p>
        </div>

        {/* Validation Code Display */}
        <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
          <h4 className="font-medium text-primary-900 mb-2">Validation Code</h4>
          <div className="flex items-center justify-between bg-white p-3 rounded border">
            <span className="font-mono text-lg font-bold text-primary-800">{validationCode}</span>
            <Button variant="outline" size="sm" className="border-primary-300 text-primary-700">
              <Printer className="h-4 w-4 mr-1" />
              Print
            </Button>
          </div>
          <p className="text-xs text-primary-600 mt-2">
            This code confirms the authenticity of this collection. Farmer should keep this for their records.
          </p>
        </div>

        <div className="border border-primary-200 rounded-lg p-4">
          <h4 className="font-medium text-primary-900 mb-3">Collection Summary:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-primary-700">Farmer:</span>
              <span className="text-primary-900 font-medium">{farmerName}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-700">Volume:</span>
              <span className="text-primary-900 font-medium">{volume}L</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Quality:</span>
              <Badge className={getQualityGradeColor(qualityGrade)}>
                Grade {qualityGrade}
              </Badge>
            </div>
            <div className="flex justify-between">
              <span className="text-primary-700">Temperature:</span>
              <span className="text-primary-900 font-medium">{temperature}°C</span>
            </div>
            {fatContent && (
              <div className="flex justify-between">
                <span className="text-primary-700">Fat Content:</span>
                <span className="text-primary-900 font-medium">{fatContent}%</span>
              </div>
            )}
            {proteinContent && (
              <div className="flex justify-between">
                <span className="text-primary-700">Protein Content:</span>
                <span className="text-primary-900 font-medium">{proteinContent}%</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-primary-700">Time:</span>
              <span className="text-primary-900 font-medium">{new Date().toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="flex space-x-4">
          <Button 
            className="flex-1 bg-primary-600 hover:bg-primary-700"
            onClick={onNewCollection}
          >
            Record Another Collection
          </Button>
          <Button 
            variant="outline" 
            className="flex-1 border-primary-300 text-primary-700"
            onClick={onViewReport}
          >
            <Share2 className="h-4 w-4 mr-2" />
            Share Report
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default CollectionSuccess;