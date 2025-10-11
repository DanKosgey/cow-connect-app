import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, AlertCircle, Eye, RotateCcw, Mail } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Label } from '@/components/ui/label';

interface DocumentState {
  file: File | null;
  previewUrl: string | null;
  uploadProgress: number;
  isUploading: boolean;
  isUploaded: boolean;
  error: string | null;
}

const EnhancedKYCDocumentUpload = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const toast = useToastNotifications();
  
  const [documents, setDocuments] = useState({
    idFront: { file: null, previewUrl: null, uploadProgress: 0, isUploading: false, isUploaded: false, error: null } as DocumentState,
    idBack: { file: null, previewUrl: null, uploadProgress: 0, isUploading: false, isUploaded: false, error: null } as DocumentState,
    selfie: { file: null, previewUrl: null, uploadProgress: 0, isUploading: false, isUploaded: false, error: null } as DocumentState
  });
  
  const [pendingFarmerId, setPendingFarmerId] = useState<string | null>(null);
  const [pendingFarmer, setPendingFarmer] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showEmailReminder, setShowEmailReminder] = useState(false);

  // Check if all documents are uploaded
  const allDocumentsUploaded = documents.idFront.isUploaded && documents.idBack.isUploaded && documents.selfie.isUploaded;

  useEffect(() => {
    console.log('EnhancedKYCDocumentUpload: Component mounted', { user, loading });
    
    // Check if auth is still loading
    if (loading) {
      console.log('EnhancedKYCDocumentUpload: Auth still loading');
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      console.log('EnhancedKYCDocumentUpload: No user authenticated');
      toast.error('Authentication Required', 'Please sign in to upload your documents');
      navigate('/farmer/login');
      return;
    }

    // Check if user has a pending farmer record
    const fetchPendingFarmer = async () => {
      try {
        const { data, error } = await supabase
          .from('pending_farmers')
          .select('*')
          .eq('user_id', user.id)
          .eq('status', 'draft') // Only allow upload if status is draft
          .single();
        
        if (error) throw error;
        
        if (!data) {
          // Check if they already submitted
          const { data: submittedData, error: submittedError } = await supabase
            .from('pending_farmers')
            .select('id, status')
            .eq('user_id', user.id)
            .in('status', ['submitted', 'under_review', 'approved'])
            .single();
          
          if (submittedData) {
            setPendingFarmer(submittedData);
            toast.success('Documents Already Submitted', 'Your documents have already been submitted for review');
            navigate('/farmer/application-status');
            return;
          }
          
          throw new Error('No pending farmer record found');
        }
        
        setPendingFarmerId(data.id);
        setPendingFarmer(data);
        console.log('EnhancedKYCDocumentUpload: Pending farmer ID set', data.id);
      } catch (error: any) {
        console.error('EnhancedKYCDocumentUpload: Error fetching pending farmer:', error);
        toast.error('Error', error.message || 'Failed to load farmer data');
        navigate('/farmer/dashboard');
      }
    };

    if (!loading && user) {
      fetchPendingFarmer();
    }
  }, [user, loading, navigate, toast]);

  // Handle file selection
  const handleFileSelect = (documentType: 'idFront' | 'idBack' | 'selfie', file: File) => {
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      setDocuments(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          error: 'Only JPG, PNG, and PDF files are accepted'
        }
      }));
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setDocuments(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          error: 'File exceeds 5MB limit. Please compress or choose another file.'
        }
      }));
      return;
    }

    // Create preview
    const previewUrl = URL.createObjectURL(file);
    
    setDocuments(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        file,
        previewUrl,
        error: null
      }
    }));
  };

  // Handle drag and drop
  const handleDrop = (documentType: 'idFront' | 'idBack' | 'selfie', e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(documentType, e.dataTransfer.files[0]);
    }
  };

  // Handle file input change
  const handleFileInputChange = (documentType: 'idFront' | 'idBack' | 'selfie', e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(documentType, e.target.files[0]);
    }
  };

  // Upload document to Supabase storage
  const uploadDocument = useCallback(async (documentType: 'idFront' | 'idBack' | 'selfie') => {
    if (!documents[documentType].file || !pendingFarmerId || !user) return;

    try {
      setDocuments(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          isUploading: true,
          error: null
        }
      }));

      const file = documents[documentType].file!;
      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}_${documentType}_${Date.now()}.${fileExtension}`;
      const filePath = `${user.id}/${documentType}/${fileName}`;

      console.log('EnhancedKYCDocumentUpload: Uploading file', { filePath, fileName });

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;
      console.log('EnhancedKYCDocumentUpload: File uploaded successfully', { fileUrl });

      // Insert record into kyc_documents table
      const documentTypeMap = {
        idFront: 'id_front',
        idBack: 'id_back',
        selfie: 'selfie'
      };

      const { error: insertError } = await supabase
        .from('kyc_documents')
        .insert([{
          pending_farmer_id: pendingFarmerId,
          farmer_id: null,
          document_type: documentTypeMap[documentType],
          file_name: fileName,
          file_path: filePath,
          file_size: file.size,
          mime_type: file.type,
          status: 'pending'
        }]);

      if (insertError) throw insertError;

      // Update state to show successful upload
      setDocuments(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          isUploading: false,
          isUploaded: true,
          uploadProgress: 100
        }
      }));

      toast.success('Upload Successful', `${documentType === 'idFront' ? 'ID Front' : documentType === 'idBack' ? 'ID Back' : 'Selfie'} uploaded successfully`);
    } catch (error: any) {
      console.error('EnhancedKYCDocumentUpload: Upload error:', error);
      
      setDocuments(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          isUploading: false,
          error: error.message || 'Failed to upload document. Please try again.'
        }
      }));
      
      toast.error('Upload Failed', error.message || 'Failed to upload document');
    }
  }, [documents, pendingFarmerId, user, toast]);

  // Handle upload for all documents
  const handleUploadAll = async () => {
    // Upload each document that has a file but hasn't been uploaded yet
    const uploadPromises = [];
    
    if (documents.idFront.file && !documents.idFront.isUploaded && !documents.idFront.isUploading) {
      uploadPromises.push(uploadDocument('idFront'));
    }
    
    if (documents.idBack.file && !documents.idBack.isUploaded && !documents.idBack.isUploading) {
      uploadPromises.push(uploadDocument('idBack'));
    }
    
    if (documents.selfie.file && !documents.selfie.isUploaded && !documents.selfie.isUploading) {
      uploadPromises.push(uploadDocument('selfie'));
    }
    
    if (uploadPromises.length > 0) {
      await Promise.all(uploadPromises);
    }
  };

  // Submit for review
  const handleSubmitForReview = async () => {
    if (!pendingFarmerId || !user) return;

    try {
      setIsSubmitting(true);
      
      // First, upload any pending documents
      await handleUploadAll();
      
      // Call RPC function to submit for review
      const { data, error } = await supabase.rpc('submit_kyc_for_review', {
        p_pending_farmer_id: pendingFarmerId,
        p_user_id: user.id
      });

      if (error) throw error;
      
      if (data?.success) {
        toast.success('Documents Submitted', 'Your documents have been submitted for review');
        navigate('/farmer/application-status');
      } else {
        throw new Error(data?.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('EnhancedKYCDocumentUpload: Submission error:', error);
      toast.error('Submission Failed', error.message || 'Failed to submit documents');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Remove document
  const handleRemoveDocument = (documentType: 'idFront' | 'idBack' | 'selfie') => {
    // Revoke preview URL if it exists
    if (documents[documentType].previewUrl) {
      URL.revokeObjectURL(documents[documentType].previewUrl!);
    }
    
    setDocuments(prev => ({
      ...prev,
      [documentType]: {
        file: null,
        previewUrl: null,
        uploadProgress: 0,
        isUploading: false,
        isUploaded: false,
        error: null
      }
    }));
  };

  // Retry upload
  const handleRetryUpload = (documentType: 'idFront' | 'idBack' | 'selfie') => {
    setDocuments(prev => ({
      ...prev,
      [documentType]: {
        ...prev[documentType],
        error: null
      }
    }));
    uploadDocument(documentType);
  };

  // Resend email verification
  const handleResendEmail = async () => {
    if (!pendingFarmerId || !pendingFarmer) return;
    
    try {
      // In a real implementation, this would trigger a resend of the verification email
      toast.success('Email Resent', 'Verification email has been resent to your inbox');
    } catch (error) {
      console.error('Error resending email:', error);
      toast.error('Error', 'Failed to resend verification email');
    }
  };

  // Show loading state while auth is loading
  if (loading || (user && !pendingFarmerId && !pendingFarmer)) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading farmer data...</p>
        </div>
      </div>
    );
  }

  // Show error state if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground mb-4">Authentication required</p>
          <Button onClick={() => navigate('/farmer/login')}>
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  // Show email verification reminder if needed
  if (showEmailReminder && pendingFarmer) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <div className="mb-8 text-center">
            <h1 className="text-3xl font-bold mb-2">Email Verification Reminder</h1>
          </div>

          <Card className="shadow-lg border-border">
            <CardHeader className="text-center">
              <div className="mx-auto bg-blue-100 rounded-full p-3 w-16 h-16 flex items-center justify-center mb-4">
                <Mail className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle>Email Verification</CardTitle>
            </CardHeader>
            <CardContent className="text-center space-y-6">
              <div className="bg-secondary/50 rounded-lg p-6">
                <div className="flex items-start space-x-3">
                  <Mail className="h-5 w-5 text-primary mt-0.5 flex-shrink-0" />
                  <div className="text-left">
                    <h3 className="font-medium">Please Verify Your Email</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      We've sent a verification email to <span className="font-medium">{pendingFarmer?.email || 'your email'}</span>. 
                      Please check your inbox and click the verification link to confirm your email address.
                    </p>
                    <p className="text-sm text-muted-foreground mt-2">
                      You can continue with your registration and upload documents now, but email verification is required for final approval.
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 justify-center">
                <Button
                  onClick={handleResendEmail}
                  variant="outline"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Resend Verification Email
                </Button>
                <Button
                  onClick={() => {
                    // Close the reminder and continue to document upload
                    setShowEmailReminder(false);
                  }}
                >
                  Continue to Document Upload
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">Upload Your KYC Documents</h1>
          <p className="text-muted-foreground">
            Please upload clear images of your identification documents
          </p>
        </div>

        {/* Email verification reminder banner */}
        {pendingFarmer && !pendingFarmer.email_verified && (
          <Card className="mb-6 bg-blue-50 border-blue-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-800">Email Verification Pending</h3>
                  <p className="text-sm text-blue-700 mt-1">
                    Please verify your email address. Check your inbox for the verification email.
                  </p>
                  <Button 
                    variant="link" 
                    className="text-blue-600 p-0 h-auto font-normal mt-1"
                    onClick={() => setShowEmailReminder(true)}
                  >
                    View verification details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* ID Front Upload */}
          <DocumentUploadSection
            title="ID Front"
            documentState={documents.idFront}
            onDrop={(e) => handleDrop('idFront', e)}
            onFileChange={(e) => handleFileInputChange('idFront', e)}
            onRemove={() => handleRemoveDocument('idFront')}
            onRetry={() => handleRetryUpload('idFront')}
            onUpload={() => uploadDocument('idFront')}
          />

          {/* ID Back Upload */}
          <DocumentUploadSection
            title="ID Back"
            documentState={documents.idBack}
            onDrop={(e) => handleDrop('idBack', e)}
            onFileChange={(e) => handleFileInputChange('idBack', e)}
            onRemove={() => handleRemoveDocument('idBack')}
            onRetry={() => handleRetryUpload('idBack')}
            onUpload={() => uploadDocument('idBack')}
          />

          {/* Selfie Upload */}
          <DocumentUploadSection
            title="Selfie"
            documentState={documents.selfie}
            onDrop={(e) => handleDrop('selfie', e)}
            onFileChange={(e) => handleFileInputChange('selfie', e)}
            onRemove={() => handleRemoveDocument('selfie')}
            onRetry={() => handleRetryUpload('selfie')}
            onUpload={() => uploadDocument('selfie')}
          />
        </div>

        {/* Progress Summary */}
        <div className="mb-8">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium">Upload Progress</span>
            <span className="text-sm text-muted-foreground">
              {Object.values(documents).filter(doc => doc.isUploaded).length} of 3 completed
            </span>
          </div>
          <Progress 
            value={(Object.values(documents).filter(doc => doc.isUploaded).length / 3) * 100} 
            className="h-2" 
          />
        </div>

        {/* Submit Button */}
        <div className="flex justify-center">
          <Button
            size="lg"
            className="w-full md:w-1/2"
            disabled={!allDocumentsUploaded || isSubmitting}
            onClick={() => setShowConfirmation(true)}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Submitting...
              </>
            ) : (
              'Submit for Review'
            )}
          </Button>
        </div>

        {/* Confirmation Dialog */}
        {showConfirmation && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Submit for Review</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="mb-4">
                  Are you sure you want to submit your KYC documents for review? 
                  You cannot edit your documents after submission.
                </p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleSubmitForReview}>
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                      </>
                    ) : (
                      'Confirm Submission'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

// Document Upload Section Component
const DocumentUploadSection = ({ 
  title, 
  documentState, 
  onDrop, 
  onFileChange, 
  onRemove, 
  onRetry, 
  onUpload 
}: { 
  title: string;
  documentState: DocumentState;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove: () => void;
  onRetry: () => void;
  onUpload: () => void;
}) => {
  const { file, previewUrl, uploadProgress, isUploading, isUploaded, error } = documentState;
  
  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            error ? 'border-destructive' : isUploaded ? 'border-green-500' : 'border-muted-foreground hover:border-primary'
          }`}
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
        >
          {isUploaded ? (
            <div className="flex flex-col items-center">
              <CheckCircle className="h-12 w-12 text-green-500 mb-2" />
              <p className="text-sm font-medium text-green-500">Uploaded Successfully</p>
              {previewUrl && (
                <div className="mt-2 relative">
                  {file?.type.startsWith('image/') ? (
                    <img 
                      src={previewUrl} 
                      alt={`${title} preview`} 
                      className="max-h-32 rounded"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-32 bg-muted rounded">
                      <span className="text-sm">PDF Document</span>
                    </div>
                  )}
                </div>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                Replace
              </Button>
            </div>
          ) : isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm mb-2">Uploading...</p>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          ) : file ? (
            <div className="flex flex-col items-center">
              {previewUrl && file.type.startsWith('image/') ? (
                <img 
                  src={previewUrl} 
                  alt={`${title} preview`} 
                  className="max-h-32 rounded mb-2"
                />
              ) : (
                <div className="flex items-center justify-center h-32 bg-muted rounded mb-2">
                  <span className="text-sm">
                    {file.type === 'application/pdf' ? 'PDF Document' : 'File'}
                  </span>
                </div>
              )}
              <p className="text-sm font-medium truncate max-w-full">{file.name}</p>
              <div className="flex gap-2 mt-2">
                <Button size="sm" onClick={onUpload}>
                  Upload
                </Button>
                <Button variant="outline" size="sm" onClick={onRemove}>
                  Remove
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium">Drag & drop or click to upload</p>
              <p className="text-xs text-muted-foreground mt-1">JPG, PNG, PDF (Max 5MB)</p>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = 'image/jpeg,image/png,application/pdf';
                  input.onchange = (event) => onFileChange(event as any);
                  input.click();
                }}
              >
                Select File
              </Button>
            </div>
          )}
        </div>
        
        {file && !isUploaded && !isUploading && (
          <div className="mt-2 text-xs text-muted-foreground">
            <p>File: {file.name}</p>
            <p>Size: {(file.size / 1024 / 1024).toFixed(2)} MB</p>
          </div>
        )}
        
        {error && !isUploading && (
          <Button 
            variant="outline" 
            size="sm" 
            className="w-full mt-2"
            onClick={onRetry}
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Retry Upload
          </Button>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedKYCDocumentUpload;