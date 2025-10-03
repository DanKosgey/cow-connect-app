import React, { useState, useRef, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Camera, Upload, FileText, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import useKYC from '@/hooks/useKYC';

// KYC form data interface
interface KYCFormData {
  documentType: 'national_id' | 'passport' | 'drivers_license';
  documentNumber: string;
  expiryDate: Date | null;
  frontImage: File | null;
  backImage?: File | null;
  selfieImage: File | null;
}

// Document preview interface
interface DocumentPreview {
  frontImagePreview: string | null;
  backImagePreview?: string | null;
  selfieImagePreview: string | null;
}

// File validation constants
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];

const KYCUpload: React.FC<{ farmerId?: string }> = ({ farmerId = 'default-farmer-id' }) => {
  const { toast } = useToast();
  const { 
    isUploading, 
    uploadProgress, 
    kycStatus, 
    error, 
    uploadDocuments, 
    reset 
  } = useKYC();
  
  const [formData, setFormData] = useState<KYCFormData>({
    documentType: 'national_id',
    documentNumber: '',
    expiryDate: null,
    frontImage: null,
    backImage: null,
    selfieImage: null
  });
  
  const [previews, setPreviews] = useState<DocumentPreview>({
    frontImagePreview: null,
    backImagePreview: null,
    selfieImagePreview: null
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const frontImageRef = useRef<HTMLInputElement>(null);
  const backImageRef = useRef<HTMLInputElement>(null);
  const selfieImageRef = useRef<HTMLInputElement>(null);

  // Validate file
  const validateFile = (file: File): string | null => {
    if (file.size > MAX_FILE_SIZE) {
      return 'File size exceeds 5MB limit';
    }
    
    if (!ACCEPTED_FORMATS.includes(file.type)) {
      return 'Invalid file format. Please upload JPEG, PNG, or WebP images';
    }
    
    return null;
  };

  // Handle file selection
  const handleFileSelect = useCallback((field: keyof KYCFormData, file: File | null) => {
    if (!file) {
      setFormData(prev => ({ ...prev, [field]: null }));
      setPreviews(prev => ({ ...prev, [`${field}Preview`]: null }));
      return;
    }

    const error = validateFile(file);
    if (error) {
      setErrors(prev => ({ ...prev, [field]: error }));
      return;
    }

    // Clear any previous errors for this field
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });

    // Set form data
    setFormData(prev => ({ ...prev, [field]: file }));

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviews(prev => ({
        ...prev,
        [`${field}Preview`]: reader.result as string
      }));
    };
    reader.readAsDataURL(file);
  }, []);

  // Handle document type change
  const handleDocumentTypeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      documentType: value as 'national_id' | 'passport' | 'drivers_license',
      backImage: value === 'passport' ? null : prev.backImage
    }));
    
    // Clear back image preview if switching to passport
    if (value === 'passport') {
      setPreviews(prev => ({
        ...prev,
        backImagePreview: null
      }));
    }
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate form
    const newErrors: Record<string, string> = {};
    
    if (!formData.documentNumber.trim()) {
      newErrors.documentNumber = 'Document number is required';
    }
    
    if (!formData.expiryDate) {
      newErrors.expiryDate = 'Expiry date is required';
    } else if (formData.expiryDate < new Date()) {
      newErrors.expiryDate = 'Document cannot be expired';
    }
    
    if (!formData.frontImage) {
      newErrors.frontImage = 'Front image is required';
    }
    
    if (formData.documentType !== 'passport' && !formData.backImage) {
      newErrors.backImage = 'Back image is required';
    }
    
    if (!formData.selfieImage) {
      newErrors.selfieImage = 'Selfie image is required';
    }
    
    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      toast({
        title: 'Validation Error',
        description: 'Please fix the errors in the form',
        variant: 'destructive'
      });
      return;
    }
    
    // Prepare data for submission
    const kycData = {
      document_type: formData.documentType,
      document_number: formData.documentNumber,
      expiry_date: formData.expiryDate?.toISOString().split('T')[0] || '',
      front_image: formData.frontImage!,
      back_image: formData.documentType !== 'passport' ? formData.backImage || undefined : undefined,
      selfie_image: formData.selfieImage!
    };
    
    try {
      await uploadDocuments(farmerId, kycData);
      toast({
        title: 'Success',
        description: 'KYC documents uploaded successfully',
      });
    } catch (err) {
      toast({
        title: 'Upload Failed',
        description: error || 'Failed to upload documents. Please try again.',
        variant: 'destructive'
      });
    }
  };

  // Reset form
  const handleReset = () => {
    setFormData({
      documentType: 'national_id',
      documentNumber: '',
      expiryDate: null,
      frontImage: null,
      backImage: null,
      selfieImage: null
    });
    
    setPreviews({
      frontImagePreview: null,
      backImagePreview: null,
      selfieImagePreview: null
    });
    
    setErrors({});
    reset();
  };

  // Trigger file input click
  const triggerFileInput = (ref: React.RefObject<HTMLInputElement>) => {
    ref.current?.click();
  };

  if (kycStatus && kycStatus.status !== 'pending') {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-6 w-6 text-green-500" />
            KYC Submission Successful
          </CardTitle>
          <CardDescription>
            Your documents have been uploaded and are pending review.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <p className="text-lg font-medium mb-2">Thank you for submitting your documents</p>
            <p className="text-gray-600 mb-6">
              We'll review your KYC information and notify you of the status within 24-48 hours.
            </p>
            <Button onClick={handleReset}>Submit Another Document</Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          KYC Document Upload
        </CardTitle>
        <CardDescription>
          Please upload clear images of your identification documents
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Document Type */}
          <div className="space-y-2">
            <Label htmlFor="documentType">Document Type</Label>
            <Select 
              value={formData.documentType} 
              onValueChange={handleDocumentTypeChange}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select document type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="national_id">National ID</SelectItem>
                <SelectItem value="passport">Passport</SelectItem>
                <SelectItem value="drivers_license">Driver's License</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Document Number */}
          <div className="space-y-2">
            <Label htmlFor="documentNumber">Document Number</Label>
            <Input
              id="documentNumber"
              value={formData.documentNumber}
              onChange={(e) => setFormData(prev => ({ ...prev, documentNumber: e.target.value }))}
              placeholder="Enter document number"
              className={errors.documentNumber ? 'border-red-500' : ''}
            />
            {errors.documentNumber && (
              <p className="text-sm text-red-500">{errors.documentNumber}</p>
            )}
          </div>

          {/* Expiry Date */}
          <div className="space-y-2">
            <Label htmlFor="expiryDate">Expiry Date</Label>
            <Input
              id="expiryDate"
              type="date"
              value={formData.expiryDate ? formData.expiryDate.toISOString().split('T')[0] : ''}
              onChange={(e) => setFormData(prev => ({ 
                ...prev, 
                expiryDate: e.target.value ? new Date(e.target.value) : null 
              }))}
              className={errors.expiryDate ? 'border-red-500' : ''}
            />
            {errors.expiryDate && (
              <p className="text-sm text-red-500">{errors.expiryDate}</p>
            )}
          </div>

          {/* Front Image */}
          <div className="space-y-2">
            <Label>Front of Document</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                type="file"
                ref={frontImageRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileSelect('frontImage', e.target.files?.[0] || null)}
              />
              {previews.frontImagePreview ? (
                <div className="space-y-4">
                  <img 
                    src={previews.frontImagePreview} 
                    alt="Front document preview" 
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => triggerFileInput(frontImageRef)}
                  >
                    Change Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="font-medium">Upload front of document</p>
                    <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
                  </div>
                  <Button 
                    type="button" 
                    onClick={() => triggerFileInput(frontImageRef)}
                  >
                    Select File
                  </Button>
                </div>
              )}
            </div>
            {errors.frontImage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.frontImage}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Back Image (if not passport) */}
          {formData.documentType !== 'passport' && (
            <div className="space-y-2">
              <Label>Back of Document</Label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <Input
                  type="file"
                  ref={backImageRef}
                  className="hidden"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={(e) => handleFileSelect('backImage', e.target.files?.[0] || null)}
                />
                {previews.backImagePreview ? (
                  <div className="space-y-4">
                    <img 
                      src={previews.backImagePreview} 
                      alt="Back document preview" 
                      className="max-h-48 mx-auto rounded-lg"
                    />
                    <Button 
                      type="button" 
                      variant="outline" 
                      onClick={() => triggerFileInput(backImageRef)}
                    >
                      Change Image
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto" />
                    <div>
                      <p className="font-medium">Upload back of document</p>
                      <p className="text-sm text-gray-500">Click to browse or drag and drop</p>
                    </div>
                    <Button 
                      type="button" 
                      onClick={() => triggerFileInput(backImageRef)}
                    >
                      Select File
                    </Button>
                  </div>
                )}
              </div>
              {errors.backImage && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{errors.backImage}</AlertDescription>
                </Alert>
              )}
            </div>
          )}

          {/* Selfie Image */}
          <div className="space-y-2">
            <Label>Selfie with Document</Label>
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <Input
                type="file"
                ref={selfieImageRef}
                className="hidden"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handleFileSelect('selfieImage', e.target.files?.[0] || null)}
              />
              {previews.selfieImagePreview ? (
                <div className="space-y-4">
                  <img 
                    src={previews.selfieImagePreview} 
                    alt="Selfie preview" 
                    className="max-h-48 mx-auto rounded-lg"
                  />
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => triggerFileInput(selfieImageRef)}
                  >
                    Change Image
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <Camera className="h-12 w-12 text-gray-400 mx-auto" />
                  <div>
                    <p className="font-medium">Upload selfie with document</p>
                    <p className="text-sm text-gray-500">Hold document next to your face</p>
                  </div>
                  <Button 
                    type="button" 
                    onClick={() => triggerFileInput(selfieImageRef)}
                  >
                    Take Photo
                  </Button>
                </div>
              )}
            </div>
            {errors.selfieImage && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.selfieImage}</AlertDescription>
              </Alert>
            )}
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Uploading documents...</span>
                <span className="text-sm text-gray-500">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          )}

          {/* Submit Button */}
          <div className="flex gap-3">
            <Button 
              type="submit" 
              className="flex-1"
              disabled={isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Submit for Verification'
              )}
            </Button>
            <Button 
              type="button" 
              variant="outline"
              onClick={handleReset}
              disabled={isUploading}
            >
              Reset
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default KYCUpload;