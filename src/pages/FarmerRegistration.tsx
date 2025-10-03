import React, { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import useToastNotifications from '@/hooks/useToastNotifications';
import { useNavigate } from 'react-router-dom';
import { Upload, CheckCircle, User, MapPin, FileText, Camera, X } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface DocumentUpload {
  type: string;
  file: File | null;
  preview: string | null;
  uploaded: boolean;
  error?: string;
}

const FarmerRegistration = () => {
  const { signUp } = useAuth();
  const { show, error: showError } = useToastNotifications();
  const navigate = useNavigate();
  
  // Registration form state
  const [formData, setFormData] = useState({
    fullName: [],
    email: [],
    phone: [],
    password: [],
    confirmPassword: [],
    nationalId: [],
    address: [],
    farmLocation: [],
    bankAccount: [],
    ifscCode: [],
    aadharNumber: []
  });

  // Document upload state
  const [documents, setDocuments] = useState<DocumentUpload[]>([
    { type: 'national_id_front', file: null, preview: null, uploaded: false },
    { type: 'national_id_back', file: null, preview: null, uploaded: false },
    { type: 'proof_of_address', file: null, preview: null, uploaded: false },
    { type: 'land_deed', file: null, preview: null, uploaded: false },
    { type: 'photo', file: null, preview: null, uploaded: false }
  ]);

  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [uploadingDocs, setUploadingDocs] = useState(false);

  const validationErrors = {
    fullName: formData.fullName.length < 2 ? 'Full name must be at least 2 characters' : '',
    email: !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) ? 'Invalid email format' : '',
    phone: !/^[0-9]{10}$/.test(formData.phone) ? 'Phone must be 10 digits' : '',
    password: formData.password.length < 8 ? 'Password must be at least 8 characters' : '',
    nationalId: formData.nationalId.length < 4 ? 'National ID must be at least 4 characters' : ''
  };

  const isStepValid = (step: number) => {
    switch (step) {
      case 1:
        return !validationErrors.fullName && !validationErrors.email && 
               !validationErrors.phone && !validationErrors.password && 
               formData.password === formData.confirmPassword;
      case 2:
        return !validationErrors.nationalId && formData.address.length > 10;
      case 3:
        return documents.slice(0, 3).every(doc => doc.uploaded); // At least 3 required docs
      default:
        return false;
    }
  };

  const documentLabels = {
    national_id_front: 'National ID (Front)',
    national_id_back: 'National ID (Back)', 
    proof_of_address: 'Proof of Address',
    land_deed: 'Land Deed/Document',
    photo: 'Profile Photo'
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleFileUpload = async (type: string, file: File) => {
    if (!file) return;

    // Validate file type and size
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      showError('Invalid file type', 'Please upload images or PDF documents only');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      showError('File too large', 'Please upload files smaller than 5MB');
      return;
    }

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${type}.${fileExt}`;
      const filePath = `kyc-documents/${formData.nationalId}/${fileName}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Get public URL
      const { data } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      // Create preview for images
      const preview = file.type.startsWith('image/') ? data.publicUrl : null;

      // Update document state
      setDocuments(prev => prev.map(doc => 
        doc.type === type 
          ? { ...doc, file, preview, uploaded: true, error: undefined }
          : doc
      ));

      show({ title: 'File uploaded successfully', description: `${documentLabels[type as keyof typeof documentLabels]} uploaded` });

    } catch (error: any) {
      showError('Upload failed', String(error?.message || 'Upload error'));
      
      setDocuments(prev => prev.map(doc => 
        doc.type === type 
          ? { ...doc, error: error.message }
          : doc
      ));
    }
  };

  const handleSubmit = async () => {
    if (!isStepValid(1) || !isStepValid(2) || !isStepValid(3)) {
      showError('Please complete all required fields', 'All steps must be completed before registration');
      return;
    }

    setLoading(true);

    try {
      // Check if email or national ID already exists
      const { data: existingUsers } = await supabase
        .from('profiles')
        .select('id')
        .eq('email', formData.email)
        .single();

      if (existingUsers) {
        throw new Error('Email already registered');
      }

      const { data: existingFarmer } = await supabase
        .from('farmers')
        .select('id')
        .eq('national_id', formData.nationalId)
        .single();

      if (existingFarmer) {
        throw new Error('National ID already registered');
      }

      // Create user account
      const { error: signUpError } = await signUp(
        formData.email,
        formData.password,
        formData.fullName,
        formData.phone,
        'farmer'
      );

      if (signUpError) throw signUpError;

      // Get updated user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Failed to create user account');

      // Update farmer profile with additional details
      const { error: farmerError } = await supabase
        .from('farmers')
        .update({
          national_id: formData.nationalId,
          address: formData.address,
          farm_location: formData.farmLocation,
          registration_completed: true
        })
        .eq('user_id', user.id);

      if (farmerError) throw farmerError;

      // Record documents in database
      const documentPromises = documents
        .filter(doc => doc.uploaded && doc.file)
        .map(doc => {
          const fileExt = doc.file!.name.split('.').pop();
          const fileName = `${Date.now()}-${doc.type}.${fileExt}`;
          const filePath = `kyc-documents/${formData.nationalId}/${fileName}`;

          return supabase
            .from('kyc_documents')
            .insert({
              farmer_id: user.id, // Will be updated after farmer record is created
              document_type: doc.type,
              file_name: doc.file!.name,
              file_path: filePath,
              file_size: doc.file!.size,
              mime_type: doc.file!.type,
              status: 'pending'
            });
        });

      await Promise.all(documentPromises);

      show({ title: 'Registration successful!', description: 'Your farmer account has been created. Please wait for admin approval.' });

      navigate('/farmer');

    } catch (error: any) {
      showError('Registration failed', String(error?.message || 'Registration error'));
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="fullName">Full Name *</Label>
          <Input
            id="fullName"
            type="text"
            value={formData.fullName}
            onChange={(e) => handleInputChange('fullName', e.target.value)}
            placeholder="Enter your full name"
          />
          {validationErrors.fullName && (
            <p className="text-sm text-red-500">{validationErrors.fullName}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="email">Email Address *</Label>
          <Input
            id="email"
            type="email"
            value={formData.email}
            onChange={(e) => handleInputChange('email', e.target.value)}
            placeholder="Enter your email"
          />
          {validationErrors.email && (
            <p className="text-sm text-red-500">{validationErrors.email}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone">Phone Number *</Label>
          <Input
            id="phone"
            type="tel"
            value={formData.phone}
            onChange={(e) => handleInputChange('phone', e.target.value)}
            placeholder="10-digit phone number"
          />
          {validationErrors.phone && (
            <p className="text-sm text-red-500">{validationErrors.phone}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="aadharNumber">Aadhar Number</Label>
          <Input
            id="aadharNumber"
            type="text"
            value={formData.aadharNumber}
            onChange={(e) => handleInputChange('aadharNumber', e.target.value)}
            placeholder="12-digit Aadhar number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">Password *</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => handleInputChange('password', e.target.value)}
            placeholder="At least 8 characters"
          />
          {validationErrors.password && (
            <p className="text-sm text-red-500">{validationErrors.password}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="confirmPassword">Confirm Password *</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
            placeholder="Confirm your password"
          />
          {formData.password !== formData.confirmPassword && (
            <p className="text-sm text-red-500">Passwords do not match</p>
          )}
        </div>
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="grid md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label htmlFor="nationalId">National ID / Registration Number *</Label>
          <Input
            id="nationalId"
            type="text"
            value={formData.nationalId}
            onChange={(e) => handleInputChange('nationalId', e.target.value)}
            placeholder="Your national ID"
          />
          {validationErrors.nationalId && (
            <p className="text-sm text-red-500">{validationErrors.nationalId}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="bankAccount">Bank Account Number</Label>
          <Input
            id="bankAccount"
            type="text"
            value={formData.bankAccount}
            onChange={(e) => handleInputChange('bankAccount', e.target.value)}
            placeholder="Bank account number"
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="ifscCode">IFSC Code</Label>
          <Input
            id="ifscCode"
            type="text"
            value={formData.ifscCode}
            onChange={(e) => handleInputChange('ifscCode', e.target.value)}
            placeholder="IFSC code"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="address">Address *</Label>
        <Textarea
          id="address"
          value={formData.address}
          onChange={(e) => handleInputChange('address', e.target.value)}
          placeholder="Complete address including village, taluka, district"
          rows={3}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="farmLocation">Farm/Collection Location</Label>
        <Textarea
          id="farmLocation"
          value={formData.farmLocation}
          onChange={(e) => handleInputChange('farmLocation', e.target.value)}
          placeholder="Exact location details for milk collection"
          rows={2}
        />
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h3 className="text-lg font-semibold">Upload Required Documents</h3>
        <p className="text-sm text-muted-foreground">
          Please upload clear images or PDF documents
        </p>
      </div>

      <div className="grid gap-6">
        {documents.map((doc, index) => (
          <Card key={doc.type} className={doc.uploaded ? 'border-green-500' : ''}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0">
                    {doc.uploaded ? (
                      <CheckCircle className="h-6 w-6 text-green-500" />
                    ) : (
                      <FileText className="h-6 w-6 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <h4 className="font-medium">{documentLabels[doc.type as keyof typeof documentLabels]}</h4>
                    <p className="text-sm text-muted-foreground">
                      {doc.uploaded ? 'Uploaded successfully' : 'Required document'}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  {doc.preview && (
                    <img 
                      src={doc.preview} 
                      alt={doc.type}
                      className="w-12 h-12 object-cover rounded"
                    />
                  )}
                  
                  <div>
                    <input
                      type="file"
                      id={doc.type}
                      accept="image/*,.pdf"
                      onChange={(e) => e.target.files?.[0] && handleFileUpload(doc.type, e.target.files[0])}
                      className="hidden"
                    />
                    <Button
                      type="button"
                      variant={doc.uploaded ? 'secondary' : 'default'}
                      size="sm"
                      onClick={() => document.getElementById(doc.type)?.click()}
                    >
                      {doc.uploaded ? 'Reupload' : 'Upload'}
                    </Button>
                  </div>
                </div>
              </div>

              {doc.error && (
                <p className="text-sm text-red-500 mt-2">{doc.error}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="bg-blue-50 p-4 rounded-lg">
        <h4 className="font-medium text-blue-900 mb-2">Document Guidelines:</h4>
        <ul className="text-sm text-blue-800 space-y-1">
          <li>• National ID: Front and back images of your ID card</li>
          <li>• Proof of Address: Utility bill, ration card, or bank statement</li>
          <li>• Land Deed: Revenue document showing land ownership</li>
          <li>• Photos should be clear and readable</li>
          <li>• PDF files are accepted for all documents</li>
        </ul>
      </div>
    </div>
  );

  const steps = [
    { title: 'Personal Information', icon: User },
    { title: 'Farm Details', icon: MapPin },
    { title: 'Documents', icon: FileText }
  ];

  const progress = ((currentStep - 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Farmer Registration</h1>
          <p className="text-gray-600 mt-2">Join the DairyChain Pro network</p>
        </div>

        {/* Progress */}
        <Card className="mb-8">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              {steps.map((step, index) => (
                <div key={index} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                    currentStep > index + 1 
                      ? 'bg-green-500 text-white' 
                      : currentStep === index + 1
                      ? 'bg-blue-500 text-white'
                      : 'bg-gray-200 text-gray-600'
                  }`}>
                    {currentStep > index + 1 ? <CheckCircle className="h-4 w-4" /> : index + 1}
                  </div>
                  <span className={`ml-2 text-sm ${
                    currentStep >= index + 1 ? 'text-gray-900' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < steps.length - 1 && (
                    <div className={`w-16 h-0.5 mx-4 ${
                      currentStep > index + 1 ? 'bg-green-500' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              ))}
            </div>
            <Progress value={progress} className="h-2" />
          </CardContent>
        </Card>

        {/* Main Form */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {React.createElement(steps[currentStep - 1].icon, { className: 'h-6 w-6' })}
              {steps[currentStep - 1].title}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}

            {/* Navigation */}
            <div className="flex justify-between mt-8 pt-6 border-t">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCurrentStep(Math.max(1, currentStep - 1))}
                disabled={currentStep === 1}
              >
                Previous
              </Button>

              {currentStep < 3 ? (
                <Button
                  type="button"
                  onClick={() => setCurrentStep(currentStep + 1)}
                  disabled={!isStepValid(currentStep)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={loading || !isStepValid(1) || !isStepValid(2) || !isStepValid(3)}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {loading ? 'Creating Account...' : 'Complete Registration'}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Terms */}
        <div className="text-center text-sm text-gray-500 mt-4">
          By registering, you agree to our Terms of Service and Privacy Policy
        </div>
      </div>
    </div>
  );
};

export default FarmerRegistration;



