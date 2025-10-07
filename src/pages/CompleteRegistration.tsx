import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/SimplifiedAuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle, FileText, AlertCircle } from "lucide-react";
import useToastNotifications from "@/hooks/useToastNotifications";
import useLoading from "@/hooks/useLoading";
import { notificationService } from "@/services/notification-service";

interface PendingDocument {
  type: string;
  fileName: string | undefined;
  fileSize: number | undefined;
  fileType: string | undefined;
}

interface PendingRegistration {
  formData: {
    fullName: string;
    email: string;
    phone: string;
    nationalId: string;
    address: string;
    farmLocation: string;
    bankAccount: string;
    ifscCode: string;
  };
  documents: PendingDocument[];
}

const CompleteRegistration = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const toast = useToastNotifications();
  const { isLoading, startLoading, stopLoading } = useLoading();
  const [pendingData, setPendingData] = useState<PendingRegistration | null>(null);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [uploadStatus, setUploadStatus] = useState<Record<string, 'idle' | 'uploading' | 'success' | 'error'>>({});
  const [uploadErrors, setUploadErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    // Check if user is authenticated
    if (!user) {
      toast.error('Authentication Required', 'Please sign in to complete your registration');
      navigate('/login');
      return;
    }

    // Load pending registration data
    try {
      const pendingDataStr = localStorage.getItem('pending_farmer_registration');
      if (pendingDataStr) {
        const data = JSON.parse(pendingDataStr) as PendingRegistration;
        setPendingData(data);
        
        // Initialize file state and upload status
        const initialFiles: Record<string, File | null> = {};
        const initialStatus: Record<string, 'idle' | 'uploading' | 'success' | 'error'> = {};
        data.documents.forEach(doc => {
          initialFiles[doc.type] = null;
          initialStatus[doc.type] = 'idle';
        });
        setFiles(initialFiles);
        setUploadStatus(initialStatus);
      } else {
        toast.error('No Pending Registration', 'No pending registration found. Please start a new registration.');
        navigate('/register');
      }
    } catch (error) {
      console.error('Error loading pending registration:', error);
      toast.error('Error', 'Could not load your pending registration data');
      navigate('/register');
    }
  }, [user, navigate, toast]);

  const handleFileChange = (type: string, file: File | null) => {
    if (!file) return;

    // Validate file type and size
    const allowedTypes = [
      'image/jpeg', 
      'image/png', 
      'image/webp',
      'image/heic',
      'image/heif',
      'application/pdf'
    ];
    
    if (!allowedTypes.includes(file.type)) {
      toast.error('Invalid File Type', 'Please upload images (JPEG, PNG, WebP, HEIC, HEIF) or PDF documents only');
      return;
    }

    if (file.size > 5 * 1024 * 1024) { // 5MB limit
      toast.error('File Too Large', 'Please upload files smaller than 5MB');
      return;
    }

    setFiles(prev => ({ ...prev, [type]: file }));
    setUploadErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[type];
      return newErrors;
    });
  };

  const handleUploadDocument = async (type: string) => {
    if (!pendingData || !user) return;
    
    const file = files[type];
    if (!file) {
      setUploadErrors(prev => ({ ...prev, [type]: 'Please select a file first' }));
      return;
    }

    setUploadStatus(prev => ({ ...prev, [type]: 'uploading' }));
    
    try {
      // ✅ CORRECT: Use auth.uid() for folder structure
      const uploadDocument = async (file: File, documentType: string) => {
        try {
          // Use user.id (which is uuid) for folder structure
          const fileName = `${documentType}-${Date.now()}.${file.name.split('.').pop()}`;
          const filePath = `${user.id}/${fileName}`; // ✅ Use user.id, not nationalId

          // Upload to storage
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('kyc-documents')
            .upload(filePath, file, {
              cacheControl: '3600',
              upsert: false
            });

          if (uploadError) {
            console.error('Upload error:', uploadError);
            throw uploadError;
          }

          // Get public URL
          const { data: { publicUrl } } = supabase.storage
            .from('kyc-documents')
            .getPublicUrl(filePath);

          return { filePath, publicUrl };
        } catch (error) {
          console.error('Document upload failed:', error);
          throw error;
        }
      };

      const { filePath } = await uploadDocument(file, type);

      // After successful file upload, store metadata
      const saveDocumentMetadata = async (
        farmerId: string,
        documentType: string,
        filePath: string,
        file: File
      ) => {
        const { data, error } = await supabase
          .from('kyc_documents')
          .insert({
            farmer_id: farmerId,
            document_type: documentType,
            file_name: file.name,
            file_path: filePath,
            file_size: file.size,
            mime_type: file.type,
            status: 'pending'
          })
          .select()
          .limit(1);

        if (error) {
          console.error('Metadata save error:', error);
          throw error;
        }
        
        // Check if we have any data
        if (!data || data.length === 0) {
          throw new Error('Failed to save document metadata');
        }
        
        return data[0];
      };

      // Save document metadata
      await saveDocumentMetadata(user.id, type, filePath, file);

      setUploadStatus(prev => ({ ...prev, [type]: 'success' }));
      toast.success('Document Uploaded', `${getDocumentLabel(type)} uploaded successfully`);
      
      // Send notification to admins about new document upload
      try {
        const farmerName = pendingData.formData.fullName || 'A farmer';
        await notificationService.sendAdminNotification(
          'New KYC Document Uploaded',
          `${farmerName} has uploaded a ${getDocumentLabel(type)} for KYC verification.`,
          'kyc'
        );
      } catch (notificationError) {
        console.warn('Failed to send admin notification:', notificationError);
      }
      
    } catch (error: any) {
      console.error('File upload error:', error);
      setUploadStatus(prev => ({ ...prev, [type]: 'error' }));
      const errorMessage = error.message || 'Failed to upload document';
      setUploadErrors(prev => ({ ...prev, [type]: errorMessage }));
      toast.error('Upload Failed', errorMessage);
    }
  };

  const getDocumentLabel = (type: string) => {
    const labels: Record<string, string> = {
      'national_id_front': 'National ID (Front)',
      'national_id_back': 'National ID (Back)',
      'proof_of_address': 'Proof of Address',
      'land_deed': 'Land Deed/Document',
      'photo': 'Profile Photo'
    };
    return labels[type] || type;
  };

  const handleCompleteRegistration = async () => {
    if (!pendingData || !user) return;
    
    // Check if all required documents are uploaded
    const requiredDocs = pendingData.documents.slice(0, 3); // First 3 are required
    const missingDocs = requiredDocs.filter(doc => uploadStatus[doc.type] !== 'success');
    
    if (missingDocs.length > 0) {
      toast.error('Missing Documents', `Please upload all required documents: ${missingDocs.map(d => getDocumentLabel(d.type)).join(', ')}`);
      return;
    }

    startLoading('Completing your registration...');

    try {
      // Complete farmer registration flow
      const completeRegistration = async () => {
        try {
          // 1. Update or insert farmer record
          const { data: farmerData, error: farmerError } = await supabase
            .from('farmers')
            .upsert({
              user_id: user.id,
              national_id: pendingData.formData.nationalId,
              phone_number: pendingData.formData.phone,
              full_name: pendingData.formData.fullName,
              address: pendingData.formData.address,
              farm_location: pendingData.formData.farmLocation,
              registration_completed: true,
              kyc_status: 'pending',
              // Add optional fields
              ...(pendingData.formData.bankAccount && { 
                bank_account_number: pendingData.formData.bankAccount 
              }),
              ...(pendingData.formData.ifscCode && { 
                bank_name: pendingData.formData.ifscCode 
              })
            }, {
              onConflict: 'user_id'
            })
            .select()
            .limit(1);

          if (farmerError) throw farmerError;
          
          // Check if we have any farmer data
          if (!farmerData || farmerData.length === 0) {
            throw new Error('Failed to create or update farmer record');
          }
          
          const farmerRecord = farmerData[0];

          // 2. Upload documents
          for (const [type, file] of Object.entries(files)) {
            if (file && uploadStatus[type] === 'success') {
              // Reconstruct the file path for metadata storage
              const fileName = `${type}-${Date.now()}.${file.name.split('.').pop()}`;
              const filePath = `${user.id}/${fileName}`;
              
              // Save document metadata
              const saveDocumentMetadata = async (
                farmerId: string,
                documentType: string,
                filePath: string,
                file: File
              ) => {
                const { data, error } = await supabase
                  .from('kyc_documents')
                  .insert({
                    farmer_id: farmerId,
                    document_type: documentType,
                    file_name: file.name,
                    file_path: filePath,
                    file_size: file.size,
                    mime_type: file.type,
                    status: 'pending'
                  })
                  .select()
                  .limit(1);

                if (error) {
                  console.error('Metadata save error:', error);
                  throw error;
                }
        
                // Check if we have any data
                if (!data || data.length === 0) {
                  throw new Error('Failed to save document metadata');
                }
        
                return data[0];
              };

              await saveDocumentMetadata(
                farmerRecord.id,
                type,
                filePath,
                file
              );
            }
          }

          return { success: true, farmerId: farmerRecord.id };
        } catch (error) {
          console.error('Registration error:', error);
          throw error;
        }
      };

      // Execute the complete registration
      await completeRegistration();

      // Send notification to admins about completed registration
      try {
        const farmerName = pendingData.formData.fullName || 'A farmer';
        await notificationService.sendAdminNotification(
          'Farmer Registration Completed',
          `${farmerName} has completed their registration and uploaded all KYC documents. Please review their application.`,
          'kyc'
        );
      } catch (notificationError) {
        console.warn('Failed to send admin notification:', notificationError);
      }

      // Clean up pending registration data
      try {
        localStorage.removeItem('pending_farmer_registration');
      } catch (error) {
        console.warn('Could not clean up pending registration data:', error);
      }

      toast.success('Registration Complete!', 'Your farmer account has been created. Please wait for admin approval.');
      navigate('/farmer');

    } catch (error: any) {
      console.error('Registration completion error:', error);
      toast.error('Registration Failed', error?.message || 'Failed to complete registration');
    } finally {
      stopLoading();
    }
  };

  if (!pendingData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your registration data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Complete Your Registration</h1>
          <p className="text-gray-600 mt-2">Welcome back! Please upload your documents to complete your farmer registration.</p>
        </div>

        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-3 text-xl">
              <CheckCircle className="h-6 w-6 text-primary" />
              Document Upload
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert>
              <AlertDescription>
                Please upload the same documents you intended to upload during your initial registration.
              </AlertDescription>
            </Alert>

            <div className="grid grid-cols-1 gap-4">
              {pendingData.documents.map((doc) => (
                <Card 
                  key={doc.type} 
                  className={`border-2 transition-all duration-200 ${
                    uploadStatus[doc.type] === 'success' 
                      ? 'border-green-500 bg-green-50/50' 
                      : uploadStatus[doc.type] === 'error' 
                        ? 'border-red-500 bg-red-50/50' 
                        : 'border-border hover:border-primary/30'
                  }`}
                >
                  <CardContent className="p-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div className="flex items-center space-x-3">
                        <div className="flex-shrink-0">
                          {uploadStatus[doc.type] === 'success' ? (
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          ) : uploadStatus[doc.type] === 'error' ? (
                            <AlertCircle className="h-6 w-6 text-red-500" />
                          ) : (
                            <FileText className="h-6 w-6 text-gray-400" />
                          )}
                        </div>
                        <div>
                          <h4 className="font-medium">{getDocumentLabel(doc.type)}</h4>
                          <p className="text-sm text-muted-foreground">
                            {doc.fileName ? `Selected: ${doc.fileName}` : 'Required document'}
                          </p>
                          {uploadErrors[doc.type] && (
                            <p className="text-sm text-red-500">{uploadErrors[doc.type]}</p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          id={`file-${doc.type}`}
                          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
                          onChange={(e) => e.target.files?.[0] && handleFileChange(doc.type, e.target.files[0])}
                          className="hidden"
                        />
                        <Button
                          type="button"
                          variant={uploadStatus[doc.type] === 'success' ? 'secondary' : 'default'}
                          size="sm"
                          onClick={() => document.getElementById(`file-${doc.type}`)?.click()}
                          disabled={isLoading || uploadStatus[doc.type] === 'uploading'}
                        >
                          {uploadStatus[doc.type] === 'uploading' ? 'Uploading...' : 
                           uploadStatus[doc.type] === 'success' ? 'Reupload' : 'Select File'}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => handleUploadDocument(doc.type)}
                          disabled={!files[doc.type] || isLoading || uploadStatus[doc.type] === 'uploading'}
                        >
                          {uploadStatus[doc.type] === 'uploading' ? (
                            <span className="flex items-center">
                              <span className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin mr-2"></span>
                              Upload
                            </span>
                          ) : 'Upload'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="flex flex-col sm:flex-row justify-end gap-3 pt-6 border-t border-border">
              <Button
                variant="outline"
                onClick={() => navigate('/')}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCompleteRegistration}
                disabled={isLoading}
                className="bg-green-600 hover:bg-green-700"
              >
                {isLoading ? (
                  <span className="flex items-center">
                    <span className="h-4 w-4 rounded-full border-2 border-white border-t-transparent animate-spin mr-2"></span>
                    Completing Registration...
                  </span>
                ) : 'Complete Registration'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default CompleteRegistration;