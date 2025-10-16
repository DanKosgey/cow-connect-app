import React, { useState, useEffect, useCallback, useRef } from "react";
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
  console.log('EnhancedKYCDocumentUpload: Component initialization');
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const toast = useToastNotifications();
  const toastRef = useRef(toast);
  
  console.log('EnhancedKYCDocumentUpload: Hook values', { user: user?.id, loading });
  
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
  console.log('EnhancedKYCDocumentUpload: Document upload status check', { 
    idFront: documents.idFront.isUploaded, 
    idBack: documents.idBack.isUploaded, 
    selfie: documents.selfie.isUploaded,
    allDocumentsUploaded 
  });

  useEffect(() => {
    console.log('EnhancedKYCDocumentUpload: Component mounted', { user, loading });
    
    // Update toast ref
    toastRef.current = toast;
    
    // Check if auth is still loading
    if (loading) {
      console.log('EnhancedKYCDocumentUpload: Auth still loading');
      return;
    }
    
    // Check if user is authenticated
    if (!user) {
      console.log('EnhancedKYCDocumentUpload: No user authenticated');
      toastRef.current.error('Authentication Required', 'Please sign in to upload your documents');
      navigate('/farmer/login');
      return;
    }

    // Check if user has a pending farmer record
    const fetchPendingFarmer = async () => {
      try {
        console.log('EnhancedKYCDocumentUpload: Fetching pending farmer record for user', user.id);
        const { data, error } = await supabase
          .from('pending_farmers')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['draft', 'email_verified', 'pending_verification']); // Allow upload if status is draft, email_verified, or pending_verification
        
        console.log('EnhancedKYCDocumentUpload: Pending farmer query result', { data, error });
        
        if (error) throw error;
        
        // Check if we have data and handle accordingly
        const pendingFarmerData = data && data.length > 0 ? data[0] : null;
        
        if (!pendingFarmerData) {
          console.log('EnhancedKYCDocumentUpload: No pending farmer record found, checking submitted records');
          // Check if they already submitted
          const { data: submittedData, error: submittedError } = await supabase
            .from('pending_farmers')
            .select('id, status')
            .eq('user_id', user.id)
            .in('status', ['submitted', 'under_review']);
          
          console.log('EnhancedKYCDocumentUpload: Submitted records query result', { submittedData, submittedError });
          
          if (submittedError) throw submittedError;
          
          // Check if we have submitted data and handle accordingly
          const submittedFarmerData = submittedData && submittedData.length > 0 ? submittedData[0] : null;
          
          if (submittedFarmerData) {
            setPendingFarmer(submittedFarmerData);
            toastRef.current.success('Documents Already Submitted', 'Your documents have already been submitted for review');
            navigate('/farmer/application-status');
            return;
          }
          
          // Check if they are already approved
          const { data: approvedData, error: approvedError } = await supabase
            .from('pending_farmers')
            .select('id, status')
            .eq('user_id', user.id)
            .eq('status', 'approved');
          
          if (approvedError) throw approvedError;
          
          // Check if they are approved and handle accordingly
          const approvedFarmerData = approvedData && approvedData.length > 0 ? approvedData[0] : null;
          
          if (approvedFarmerData) {
            // For approved farmers, we still want to show the component but with appropriate messaging
            setPendingFarmer(approvedFarmerData);
            setPendingFarmerId(approvedFarmerData.id);
            // Don't redirect, let the component render with approved status
          } else {
            throw new Error('No pending farmer record found');
          }
        } else {
          setPendingFarmerId(pendingFarmerData.id);
          setPendingFarmer(pendingFarmerData);
          console.log('EnhancedKYCDocumentUpload: Pending farmer data set', { id: pendingFarmerData.id, data: pendingFarmerData });
          
          // Check if documents already exist for this pending farmer
          console.log('EnhancedKYCDocumentUpload: Checking for existing documents for pending farmer', pendingFarmerData.id);
          const { data: existingDocs, error: docsError } = await supabase
            .from('kyc_documents')
            .select('*')
            .eq('pending_farmer_id', pendingFarmerData.id);
          
          console.log('EnhancedKYCDocumentUpload: Existing documents query result', { existingDocs, docsError });
          
          if (existingDocs && existingDocs.length > 0) {
            console.log('EnhancedKYCDocumentUpload: Found existing documents, updating state');
            // Update document states based on existing documents
            existingDocs.forEach(doc => {
              console.log('EnhancedKYCDocumentUpload: Processing existing document', doc);
              const docTypeMap: Record<string, keyof typeof documents> = {
                'id_front': 'idFront',
                'id_back': 'idBack',
                'selfie': 'selfie'
              };
              
              const stateKey = docTypeMap[doc.document_type];
              if (stateKey) {
                console.log('EnhancedKYCDocumentUpload: Updating document state for existing document', { stateKey, doc });
                setDocuments(prev => ({
                  ...prev,
                  [stateKey]: {
                    ...prev[stateKey],
                    isUploaded: true,
                    uploadProgress: 100
                  }
                }));
              }
            });
            
            // Log the updated document states
            setTimeout(() => {
              console.log('EnhancedKYCDocumentUpload: Document states after processing existing documents', {
                idFront: documents.idFront.isUploaded,
                idBack: documents.idBack.isUploaded,
                selfie: documents.selfie.isUploaded
              });
            }, 100);
          }
        }
      } catch (error: any) {
        console.error('EnhancedKYCDocumentUpload: Error fetching pending farmer:', error);
        console.log('EnhancedKYCDocumentUpload: Redirecting to dashboard due to error');
        toastRef.current.error('Error', error.message || 'Failed to load farmer data');
        navigate('/farmer/dashboard');
      }
    };

    if (!loading && user) {
      fetchPendingFarmer();
    }
  }, [user, loading, navigate]);

  // Handle file selection
  const handleFileSelect = (documentType: 'idFront' | 'idBack' | 'selfie', file: File) => {
    // Prevent file selection for approved farmers
    if (pendingFarmer?.status === 'approved') {
      toastRef.current.error('Error', 'Document uploads are disabled for approved applications');
      return;
    }
    
    console.log('EnhancedKYCDocumentUpload: Handling file selection for', documentType, { 
      fileName: file.name, 
      fileSize: file.size, 
      fileType: file.type 
    });
    
    // Validate file type
    const validTypes = ['image/jpeg', 'image/png', 'application/pdf'];
    if (!validTypes.includes(file.type)) {
      console.log('EnhancedKYCDocumentUpload: Invalid file type', { fileType: file.type, validTypes });
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
      console.log('EnhancedKYCDocumentUpload: File too large', { fileSize: file.size });
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
    console.log('EnhancedKYCDocumentUpload: Creating preview for file');
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
    
    console.log('EnhancedKYCDocumentUpload: File selection completed for', documentType, {
      hasFile: true,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
      previewUrl: previewUrl ? 'Generated' : 'None'
    });
  };

  // Handle drag and drop
  const handleDrop = (documentType: 'idFront' | 'idBack' | 'selfie', e: React.DragEvent<HTMLDivElement>) => {
    // Prevent drag and drop for approved farmers
    if (pendingFarmer?.status === 'approved') {
      e.preventDefault();
      toastRef.current.error('Error', 'Document uploads are disabled for approved applications');
      return;
    }
    
    console.log('EnhancedKYCDocumentUpload: Handling drag and drop for', documentType);
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      console.log('EnhancedKYCDocumentUpload: File dropped', { 
        documentType, 
        fileName: e.dataTransfer.files[0].name,
        fileSize: e.dataTransfer.files[0].size
      });
      handleFileSelect(documentType, e.dataTransfer.files[0]);
    } else {
      console.log('EnhancedKYCDocumentUpload: No file in drag event', documentType);
    }
  };

  // Handle file input change
  const handleFileInputChange = (documentType: 'idFront' | 'idBack' | 'selfie', e: React.ChangeEvent<HTMLInputElement>) => {
    // Prevent file input for approved farmers
    if (pendingFarmer?.status === 'approved') {
      toastRef.current.error('Error', 'Document uploads are disabled for approved applications');
      return;
    }
    
    console.log('EnhancedKYCDocumentUpload: Handling file input change for', documentType);
    if (e.target.files && e.target.files[0]) {
      console.log('EnhancedKYCDocumentUpload: File selected via input', { 
        documentType, 
        fileName: e.target.files[0].name,
        fileSize: e.target.files[0].size
      });
      handleFileSelect(documentType, e.target.files[0]);
    } else {
      console.log('EnhancedKYCDocumentUpload: No file selected via input', documentType);
    }
  };

  // Upload document to Supabase storage
  const uploadDocument = useCallback(async (documentType: 'idFront' | 'idBack' | 'selfie') => {
    // Prevent uploads for approved farmers
    if (pendingFarmer?.status === 'approved') {
      toastRef.current.error('Error', 'Document uploads are disabled for approved applications');
      return;
    }
    
    console.log('EnhancedKYCDocumentUpload: Starting upload process for', documentType);
    
    if (!documents[documentType].file || !pendingFarmerId || !user) {
      console.log('EnhancedKYCDocumentUpload: Missing required data for upload', { 
        hasFile: !!documents[documentType].file, 
        hasPendingFarmerId: !!pendingFarmerId, 
        hasUser: !!user,
        documentType 
      });
      return;
    }

    try {
      console.log('EnhancedKYCDocumentUpload: Setting upload state for', documentType);
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

      console.log('EnhancedKYCDocumentUpload: Preparing to upload file', { 
        documentType, 
        fileName, 
        filePath, 
        fileSize: file.size, 
        fileType: file.type 
      });

      // Upload file to storage
      console.log('EnhancedKYCDocumentUpload: Uploading file to storage', { documentType, filePath });
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        console.error('EnhancedKYCDocumentUpload: File upload failed', { documentType, filePath, error: uploadError });
        throw uploadError;
      }
      
      console.log('EnhancedKYCDocumentUpload: File uploaded successfully to storage', { documentType, filePath });

      // Get public URL
      console.log('EnhancedKYCDocumentUpload: Getting public URL for uploaded file', { documentType, filePath });
      const { data: urlData } = supabase.storage
        .from('kyc-documents')
        .getPublicUrl(filePath);

      const fileUrl = urlData.publicUrl;
      console.log('EnhancedKYCDocumentUpload: Public URL retrieved', { documentType, filePath, fileUrl });

      // Insert record into kyc_documents table
      const documentTypeMap = {
        idFront: 'id_front',
        idBack: 'id_back',
        selfie: 'selfie'
      };

      console.log('EnhancedKYCDocumentUpload: Inserting document metadata into database', { 
        documentType, 
        documentTypeDb: documentTypeMap[documentType], 
        fileName, 
        filePath 
      });
      
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

      if (insertError) {
        console.error('EnhancedKYCDocumentUpload: Database insert failed', { documentType, filePath, error: insertError });
        throw insertError;
      }

      console.log('EnhancedKYCDocumentUpload: Document metadata inserted successfully', { documentType, filePath });

      // Update UI state
      setDocuments(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          isUploading: false,
          isUploaded: true,
          uploadProgress: 100
        }
      }));

      toastRef.current.success('Success', `${documentTypeMap[documentType]} uploaded successfully`);
    } catch (error: any) {
      console.error('EnhancedKYCDocumentUpload: Error during upload process', error);
      setDocuments(prev => ({
        ...prev,
        [documentType]: {
          ...prev[documentType],
          isUploading: false,
          error: error.message || 'Upload failed'
        }
      }));
      toastRef.current.error('Upload Failed', error.message || 'Failed to upload document');
    }
  }, [documents, pendingFarmerId, user, pendingFarmer?.status]);

  const handleRemoveDocument = (documentType: 'idFront' | 'idBack' | 'selfie') => {
    // Prevent document removal for approved farmers
    if (pendingFarmer?.status === 'approved') {
      toastRef.current.error('Error', 'Document removal is disabled for approved applications');
      return;
    }
    
    console.log('EnhancedKYCDocumentUpload: Removing document', documentType);
    
    // Revoke preview URL if it exists
    if (documents[documentType].previewUrl) {
      console.log('EnhancedKYCDocumentUpload: Revoking preview URL for', documentType);
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
    
    console.log('EnhancedKYCDocumentUpload: Document removed successfully', documentType);
  };

  // Retry upload
  const handleRetryUpload = (documentType: 'idFront' | 'idBack' | 'selfie') => {
    // Prevent upload retries for approved farmers
    if (pendingFarmer?.status === 'approved') {
      toastRef.current.error('Error', 'Document uploads are disabled for approved applications');
      return;
    }
    
    console.log('EnhancedKYCDocumentUpload: Retrying upload for', documentType);
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
    // Prevent email resend for approved farmers
    if (pendingFarmer?.status === 'approved') {
      toastRef.current.error('Error', 'Email resend is not available for approved applications');
      return;
    }
    
    if (!pendingFarmerId || !pendingFarmer) return;
    
    try {
      // In a real implementation, this would trigger a resend of the verification email
      toastRef.current.success('Email Resent', 'Verification email has been resent to your inbox');
    } catch (error) {
      console.error('Error resending email:', error);
      toastRef.current.error('Error', 'Failed to resend verification email');
    }
  };

  const handleSubmitForReview = async () => {
    // Prevent submission if this is an approved farmer
    if (pendingFarmer?.status === 'approved') {
      toastRef.current.error('Error', 'Your documents have already been approved');
      return;
    }
    
    if (!pendingFarmerId) {
      toastRef.current.error('Error', 'No pending farmer record found');
      return;
    }

    // Check that all documents are uploaded
    if (!allDocumentsUploaded) {
      toastRef.current.error('Error', 'Please upload all required documents');
      return;
    }

    setIsSubmitting(true);
    try {
      // Update pending farmer status to submitted
      const { error: updateError } = await supabase
        .from('pending_farmers')
        .update({ 
          status: 'submitted',
          submitted_at: new Date().toISOString()
        })
        .eq('id', pendingFarmerId);

      if (updateError) throw updateError;

      toastRef.current.success('Success', 'Your documents have been submitted for review');
      setShowConfirmation(false);
      
      // Redirect to application status page
      setTimeout(() => {
        navigate('/farmer/application-status');
      }, 2000);
    } catch (error: any) {
      console.error('Error submitting for review:', error);
      toastRef.current.error('Error', error.message || 'Failed to submit documents for review');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading state while auth is loading
  if (loading || (user && !pendingFarmerId && !pendingFarmer)) {
    console.log('EnhancedKYCDocumentUpload: Showing loading state', { loading, user: user?.id, pendingFarmerId, pendingFarmer });
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
    console.log('EnhancedKYCDocumentUpload: Showing no user state');
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

  console.log('EnhancedKYCDocumentUpload: Rendering main component', { pendingFarmer, pendingFarmerId, documents });
  
  // Check if farmer is approved
  const isApprovedFarmer = pendingFarmer?.status === 'approved';
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">
            {isApprovedFarmer ? 'Your KYC Documents' : 'Upload Your KYC Documents'}
          </h1>
          <p className="text-muted-foreground">
            {isApprovedFarmer 
              ? 'These are the documents you submitted for verification' 
              : 'Please upload clear images of your identification documents'}
          </p>
        </div>

        {/* Approval status message for approved farmers */}
        {isApprovedFarmer && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="p-4">
              <div className="flex items-start space-x-3">
                <CheckCircle className="h-5 w-5 text-green-600 mt-0.5 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-green-800">Application Approved</h3>
                  <p className="text-sm text-green-700 mt-1">
                    Your KYC documents have been approved. You can view them below.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Email verification reminder banner */}
        {pendingFarmer && !pendingFarmer.email_verified && !isApprovedFarmer && (
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
            onDrop={isApprovedFarmer ? undefined : (e) => handleDrop('idFront', e)}
            onFileChange={isApprovedFarmer ? undefined : (e) => handleFileInputChange('idFront', e)}
            onRemove={isApprovedFarmer ? undefined : () => handleRemoveDocument('idFront')}
            onRetry={isApprovedFarmer ? undefined : () => handleRetryUpload('idFront')}
            onUpload={isApprovedFarmer ? undefined : () => uploadDocument('idFront')}
            disabled={isApprovedFarmer}
          />

          {/* ID Back Upload */}
          <DocumentUploadSection
            title="ID Back"
            documentState={documents.idBack}
            onDrop={isApprovedFarmer ? undefined : (e) => handleDrop('idBack', e)}
            onFileChange={isApprovedFarmer ? undefined : (e) => handleFileInputChange('idBack', e)}
            onRemove={isApprovedFarmer ? undefined : () => handleRemoveDocument('idBack')}
            onRetry={isApprovedFarmer ? undefined : () => handleRetryUpload('idBack')}
            onUpload={isApprovedFarmer ? undefined : () => uploadDocument('idBack')}
            disabled={isApprovedFarmer}
          />

          {/* Selfie Upload */}
          <DocumentUploadSection
            title="Selfie"
            documentState={documents.selfie}
            onDrop={isApprovedFarmer ? undefined : (e) => handleDrop('selfie', e)}
            onFileChange={isApprovedFarmer ? undefined : (e) => handleFileInputChange('selfie', e)}
            onRemove={isApprovedFarmer ? undefined : () => handleRemoveDocument('selfie')}
            onRetry={isApprovedFarmer ? undefined : () => handleRetryUpload('selfie')}
            onUpload={isApprovedFarmer ? undefined : () => uploadDocument('selfie')}
            disabled={isApprovedFarmer}
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
          
          {/* Detailed progress information */}
          <div className="mt-2 text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>ID Front: {documents.idFront.isUploaded ? '✓ Uploaded' : documents.idFront.isUploading ? 'Uploading...' : documents.idFront.file ? 'Ready to upload' : 'Not uploaded'}</span>
              <span>ID Back: {documents.idBack.isUploaded ? '✓ Uploaded' : documents.idBack.isUploading ? 'Uploading...' : documents.idBack.file ? 'Ready to upload' : 'Not uploaded'}</span>
              <span>Selfie: {documents.selfie.isUploaded ? '✓ Uploaded' : documents.selfie.isUploading ? 'Uploading...' : documents.selfie.file ? 'Ready to upload' : 'Not uploaded'}</span>
            </div>
          </div>
        </div>

        {/* Submit Button - only show for non-approved farmers */}
        {!isApprovedFarmer && (
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
        )}

        {/* Message for approved farmers */}
        {isApprovedFarmer && (
          <div className="text-center mt-8">
            <p className="text-muted-foreground">
              Your documents have been approved and are stored securely in our system.
            </p>
            <Button 
              className="mt-4" 
              onClick={() => navigate('/farmer/dashboard')}
            >
              Go to Dashboard
            </Button>
          </div>
        )}

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
  onUpload,
  disabled
}: { 
  title: string;
  documentState: DocumentState;
  onDrop?: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onRemove?: () => void;
  onRetry?: () => void;
  onUpload?: () => void;
  disabled?: boolean;
}) => {
  const { file, previewUrl, uploadProgress, isUploading, isUploaded, error } = documentState;
  
  console.log('DocumentUploadSection: Rendering section', { title, isUploaded, isUploading, hasFile: !!file, error });
  
  return (
    <Card className={`overflow-hidden ${disabled ? 'opacity-75' : ''}`}>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {error && !disabled && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
        
        <div 
          className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
            error ? 'border-destructive' : isUploaded ? 'border-green-500' : 'border-muted-foreground hover:border-primary'
          } ${disabled ? 'cursor-not-allowed' : ''}`}
          onDragOver={(e) => {
            if (disabled) {
              e.preventDefault();
              return;
            }
            e.preventDefault();
          }}
          onDrop={(e) => {
            if (disabled || !onDrop) {
              e.preventDefault();
              return;
            }
            onDrop(e);
          }}
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
              {!disabled && onRemove && (
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
              )}
            </div>
          ) : isUploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
              <p className="text-sm mb-2">Uploading...</p>
              <Progress value={uploadProgress} className="w-full" />
              <p className="text-xs text-muted-foreground mt-1">{Math.round(uploadProgress)}% complete</p>
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
              {!disabled && onUpload && onRemove && (
                <div className="flex gap-2 mt-2">
                  <Button size="sm" onClick={onUpload}>
                    Upload
                  </Button>
                  <Button variant="outline" size="sm" onClick={onRemove}>
                    Remove
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center">
              <Upload className="h-8 w-8 text-muted-foreground mb-2" />
              <p className="text-sm font-medium mb-1">{title}</p>
              <p className="text-xs text-muted-foreground mb-2">
                {disabled ? 'Document view only' : 'Drag and drop or click to upload'}
              </p>
              {!disabled && onFileChange && (
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Trigger file input click
                    const fileInput = document.getElementById(`file-input-${title.toLowerCase().replace(' ', '-')}`);
                    if (fileInput) fileInput.click();
                  }}
                >
                  Select File
                </Button>
              )}
              <input
                id={`file-input-${title.toLowerCase().replace(' ', '-')}`}
                type="file"
                className="hidden"
                accept="image/*,.pdf"
                onChange={onFileChange}
                disabled={disabled}
              />
            </div>
          )}
        </div>
        
        {disabled && (
          <p className="text-xs text-muted-foreground text-center mt-2">
            Document viewing only - editing disabled for approved applications
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedKYCDocumentUpload;