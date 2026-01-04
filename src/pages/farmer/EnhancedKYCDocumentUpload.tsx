import React, { useState, useEffect, useCallback, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Upload, CheckCircle, AlertCircle, Eye, Trash2, Mail, Plus } from 'lucide-react';
import useToastNotifications from '@/hooks/useToastNotifications';
import { Label } from '@/components/ui/label';

interface DocumentItem {
  id: string;
  file: File | null;
  serverPath?: string;
  previewUrl: string | null;
  uploadProgress: number;
  status: 'idle' | 'uploading' | 'success' | 'error';
  error: string | null;
}

interface DocumentState {
  idFront: DocumentItem[];
  idBack: DocumentItem[];
  selfie: DocumentItem[];
}

const EnhancedKYCDocumentUpload = () => {
  console.log('EnhancedKYCDocumentUpload: Component initialization');
  const navigate = useNavigate();
  const { user, isLoading } = useAuth();
  const toast = useToastNotifications();
  const toastRef = useRef(toast);

  const [documents, setDocuments] = useState<DocumentState>({
    idFront: [],
    idBack: [],
    selfie: []
  });

  const [pendingFarmerId, setPendingFarmerId] = useState<string | null>(null);
  const [pendingFarmer, setPendingFarmer] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [showEmailReminder, setShowEmailReminder] = useState(false);

  // Check if at least one document is uploaded for each category
  const allDocumentsUploaded =
    documents.idFront.some(d => d.status === 'success' || d.serverPath) &&
    documents.idBack.some(d => d.status === 'success' || d.serverPath) &&
    documents.selfie.some(d => d.status === 'success' || d.serverPath);

  useEffect(() => {
    // Update toast ref
    toastRef.current = toast;

    if (isLoading) return;

    if (!user) {
      toastRef.current.error('Authentication Required', 'Please sign in to upload your documents');
      navigate('/farmer/login');
      return;
    }

    const fetchPendingFarmer = async () => {
      try {
        const { data, error } = await supabase
          .from('pending_farmers')
          .select('*')
          .eq('user_id', user.id)
          .in('status', ['draft', 'email_verified', 'pending_verification']);

        if (error) throw error;

        const pendingFarmerData = data && data.length > 0 ? data[0] : null;

        if (!pendingFarmerData) {
          // Check other statuses
          const { data: submittedData } = await supabase
            .from('pending_farmers')
            .select('id, status')
            .eq('user_id', user.id)
            .in('status', ['submitted', 'under_review', 'approved']);

          const existingData = submittedData && submittedData.length > 0 ? submittedData[0] : null;

          if (existingData) {
            setPendingFarmer(existingData);
            setPendingFarmerId(existingData.id);
            // If it's submitted/under_review, redirect
            if (existingData.status !== 'approved') {
              toastRef.current.success('Documents Already Submitted', 'Your documents have already been submitted for review');
              navigate('/farmer/application-status');
              return;
            }
            // If approved, stay on page to show docs
          } else {
            throw new Error('No pending farmer record found');
          }
        } else {
          setPendingFarmerId(pendingFarmerData.id);
          setPendingFarmer(pendingFarmerData);
        }

        // Fetch existing documents
        const farmerIdToUse = pendingFarmerData?.id || (await supabase.from('pending_farmers').select('id').eq('user_id', user.id).single()).data?.id;

        if (farmerIdToUse) {
          const { data: existingDocs, error: docsError } = await supabase
            .from('kyc_documents')
            .select('*')
            .eq('pending_farmer_id', farmerIdToUse);

          if (docsError) throw docsError;

          if (existingDocs && existingDocs.length > 0) {
            const newDocsState: DocumentState = { idFront: [], idBack: [], selfie: [] };

            for (const doc of existingDocs) {
              const docTypeMap: Record<string, keyof DocumentState> = {
                'id_front': 'idFront',
                'id_back': 'idBack',
                'selfie': 'selfie'
              };
              const type = docTypeMap[doc.document_type];
              if (type) {
                const { data: urlData } = supabase.storage.from('kyc-documents').getPublicUrl(doc.file_path);
                newDocsState[type].push({
                  id: doc.id,
                  file: null,
                  serverPath: doc.file_path,
                  previewUrl: urlData.publicUrl,
                  uploadProgress: 100,
                  status: 'success',
                  error: null
                });
              }
            }
            setDocuments(newDocsState);
          }
        }

      } catch (error: any) {
        console.error('Error:', error);
        toastRef.current.error('Error', error.message || 'Failed to load data');
      }
    };

    fetchPendingFarmer();
  }, [user, isLoading, navigate]);

  const handleFileSelect = (documentType: keyof DocumentState, file: File) => {
    if (pendingFarmer?.status === 'approved') {
      toastRef.current.error('Error', 'Document uploads are disabled for approved applications');
      return;
    }

    // Validation
    if (!['image/jpeg', 'image/png', 'application/pdf'].includes(file.type)) {
      toastRef.current.error('Invalid File Type', 'Only JPG, PNG, and PDF files are accepted');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toastRef.current.error('File Too Large', 'File exceeds 5MB limit');
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const newDocId = Math.random().toString(36).substring(7);

    // Add to state
    setDocuments(prev => ({
      ...prev,
      [documentType]: [...prev[documentType], {
        id: newDocId,
        file,
        previewUrl,
        uploadProgress: 0,
        status: 'idle',
        error: null
      }]
    }));

    // Auto trigger upload
    uploadDocument(documentType, newDocId, file);
  };

  const uploadDocument = async (documentType: keyof DocumentState, docId: string, file: File) => {
    if (!pendingFarmerId || !user) return;

    try {
      setDocuments(prev => ({
        ...prev,
        [documentType]: prev[documentType].map(d => d.id === docId ? { ...d, status: 'uploading', uploadProgress: 10 } : d)
      }));

      const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const fileName = `${user.id}_${documentType}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExtension}`;
      const filePath = `${user.id}/${documentType}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: false });

      if (uploadError) throw uploadError;

      setDocuments(prev => ({
        ...prev,
        [documentType]: prev[documentType].map(d => d.id === docId ? { ...d, uploadProgress: 50 } : d)
      }));

      const documentTypeMap: Record<string, string> = {
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

      setDocuments(prev => ({
        ...prev,
        [documentType]: prev[documentType].map(d => d.id === docId ? { ...d, status: 'success', uploadProgress: 100, serverPath: filePath } : d)
      }));

      toastRef.current.success('Success', 'Document uploaded');

    } catch (error: any) {
      console.error(error);
      setDocuments(prev => ({
        ...prev,
        [documentType]: prev[documentType].map(d => d.id === docId ? { ...d, status: 'error', error: error.message } : d)
      }));
      toastRef.current.error('Upload Failed', error.message);
    }
  };

  const handleRemoveDocument = async (documentType: keyof DocumentState, docId: string) => {
    if (pendingFarmer?.status === 'approved') return;

    const doc = documents[documentType].find(d => d.id === docId);
    if (!doc) return;

    if (doc.serverPath) {
      try {
        const { error: dbError } = await supabase.from('kyc_documents').delete().eq('file_path', doc.serverPath);
        if (dbError) throw dbError;
        await supabase.storage.from('kyc-documents').remove([doc.serverPath]);
      } catch (e: any) {
        toastRef.current.error('Error', 'Failed to delete');
        return;
      }
    }

    if (doc.file && doc.previewUrl) URL.revokeObjectURL(doc.previewUrl);

    setDocuments(prev => ({
      ...prev,
      [documentType]: prev[documentType].filter(d => d.id !== docId)
    }));
  };

  const handleSubmitForReview = async () => {
    if (!allDocumentsUploaded) {
      toastRef.current.error('Error', 'Please upload at least one document for each category');
      return;
    }

    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('pending_farmers')
        .update({ status: 'submitted', submitted_at: new Date().toISOString() })
        .eq('id', pendingFarmerId);

      if (error) throw error;

      toastRef.current.success('Success', 'Documents submitted for review');
      setShowConfirmation(false);
      setTimeout(() => navigate('/farmer/application-status'), 1500);
    } catch (e: any) {
      toastRef.current.error('Error', e.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || (user && !pendingFarmerId)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const isApprovedFarmer = pendingFarmer?.status === 'approved';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-2">
            {isApprovedFarmer ? 'Your KYC Documents' : 'Upload Your KYC Documents'}
          </h1>
          <p className="text-muted-foreground">
            Please upload clear images of your identification documents. You can upload multiple photos if needed.
          </p>
        </div>

        {isApprovedFarmer && (
          <Card className="mb-6 bg-green-50 border-green-200">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-green-600" />
              <div>
                <h3 className="font-medium text-green-800">Application Approved</h3>
                <p className="text-sm text-green-700">Your documents have been approved.</p>
              </div>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 gap-6 mb-8">
          <DocumentListSection
            title="ID Front"
            items={documents.idFront}
            onAdd={(f) => handleFileSelect('idFront', f)}
            onRemove={(id) => handleRemoveDocument('idFront', id)}
            disabled={isApprovedFarmer}
          />
          <DocumentListSection
            title="ID Back"
            items={documents.idBack}
            onAdd={(f) => handleFileSelect('idBack', f)}
            onRemove={(id) => handleRemoveDocument('idBack', id)}
            disabled={isApprovedFarmer}
          />
          <DocumentListSection
            title="Selfie"
            items={documents.selfie}
            onAdd={(f) => handleFileSelect('selfie', f)}
            onRemove={(id) => handleRemoveDocument('selfie', id)}
            disabled={isApprovedFarmer}
          />
        </div>

        {!isApprovedFarmer && (
          <div className="flex justify-center">
            <Button
              size="lg"
              className="w-full md:w-1/2"
              disabled={!allDocumentsUploaded || isSubmitting}
              onClick={() => setShowConfirmation(true)}
            >
              {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : null}
              Submit for Review
            </Button>
          </div>
        )}

        {isApprovedFarmer && (
          <div className="text-center">
            <Button onClick={() => navigate('/farmer/dashboard')}>Go to Dashboard</Button>
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
                <p className="mb-4">Are you sure you want to submit? You cannot edit after submission.</p>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowConfirmation(false)}>Cancel</Button>
                  <Button onClick={handleSubmitForReview} disabled={isSubmitting}>
                    Confirm Submission
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

const DocumentListSection = ({
  title,
  items,
  onAdd,
  onRemove,
  disabled
}: {
  title: string;
  items: DocumentItem[];
  onAdd: (f: File) => void;
  onRemove: (id: string) => void;
  disabled?: boolean
}) => {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-lg">{title}</CardTitle>
        {!disabled && (
          <div>
            <input
              type="file"
              id={`file-${title}`}
              className="hidden"
              accept="image/*,.pdf"
              onChange={(e) => {
                if (e.target.files?.[0]) onAdd(e.target.files[0]);
                e.target.value = '';
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => document.getElementById(`file-${title}`)?.click()}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Photo
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground border-2 border-dashed rounded-lg">
            <p>No documents uploaded yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {items.map(item => (
              <div key={item.id} className="relative group border rounded-lg p-2">
                <div className="aspect-video bg-muted rounded overflow-hidden mb-2 relative">
                  {item.previewUrl ? (
                    <img src={item.previewUrl} className="w-full h-full object-cover" alt="Preview" />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <span className="text-xs">PDF/File</span>
                    </div>
                  )}
                  {item.status === 'uploading' && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <Loader2 className="animate-spin text-white" />
                    </div>
                  )}
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className={`capitalize ${item.status === 'error' ? 'text-red-500' : 'text-green-600'}`}>
                    {item.status}
                  </span>
                  {!disabled && (
                    <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => onRemove(item.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedKYCDocumentUpload;