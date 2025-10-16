import { supabase } from '@/integrations/supabase/client';

// KYC Document interface matching our database structure
export interface KYCDocument {
  id: string;
  pending_farmer_id: string;
  farmer_id: string | null;
  document_type: string;
  file_name: string;
  file_path: string;
  file_size: number;
  mime_type: string;
  status: string;
  created_at: string;
  updated_at: string;
}

// User interface for KYC status tracking
export interface User {
  id: string;
  email: string;
  full_name: string;
  phone?: string;
  kyc_status: 'pending' | 'approved' | 'rejected';
}

/**
 * KYC Storage Service
 * 
 * This service provides a clean interface for handling KYC document storage
 * similar to the AWS S3 example but using Supabase Storage.
 * 
 * Features:
 * - Secure document upload with validation
 * - Document retrieval with signed URLs for admin access
 * - Document metadata management
 * - Error handling and cleanup
 */
export class KYCStorageService {
  private bucketName: string;

  constructor() {
    this.bucketName = 'kyc-documents';
  }

  /**
   * Upload a KYC document to Supabase Storage
   * 
   * @param file - The file to upload
   * @param userId - The user ID (for folder organization)
   * @param documentType - Type of document (id_front, id_back, selfie, etc.)
   * @returns Object with file path and public URL
   */
  async uploadDocument(
    file: File,
    userId: string,
    documentType: string
  ): Promise<{ path: string; url: string }> {
    try {
      // Generate unique file name
      const fileExtension = file.name.split('.').pop() || 'jpg';
      const fileName = `${documentType}-${Date.now()}.${fileExtension}`;
      const filePath = `${userId}/${documentType}/${fileName}`;

      // Upload file to storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from(this.bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type
        });

      if (uploadError) {
        // More specific error handling
        if (uploadError.message.includes('row-level security')) {
          throw new Error('Authentication required: Please sign in to upload documents');
        } else if (uploadError.message.includes('Bucket not found')) {
          throw new Error('Storage configuration error: Please contact support');
        }
        throw new Error(`File upload failed: ${uploadError.message}`);
      }

      if (!uploadData) {
        throw new Error('File upload returned no data');
      }

      // Get public URL for the uploaded file
      const { data: urlData } = supabase.storage
        .from(this.bucketName)
        .getPublicUrl(filePath);

      return {
        path: uploadData.path,
        url: urlData?.publicUrl || ''
      };
    } catch (error) {
      console.error('KYCStorageService: Upload error:', error);
      throw error;
    }
  }

  /**
   * Get a signed URL for secure document access (for admin review)
   * 
   * @param filePath - Path to the document in storage
   * @param expiresIn - Expiration time in seconds (default 1 hour)
   * @returns Signed URL for temporary access
   */
  async getSignedUrl(filePath: string, expiresIn: number = 3600): Promise<string> {
    try {
      const { data: signedData, error: signedError } = await supabase.storage
        .from(this.bucketName)
        .createSignedUrl(filePath, expiresIn);

      if (signedError) {
        throw new Error(`Failed to create signed URL: ${signedError.message}`);
      }

      if (!signedData?.signedUrl) {
        throw new Error('Signed URL generation failed');
      }

      return signedData.signedUrl;
    } catch (error) {
      console.error('KYCStorageService: Signed URL error:', error);
      throw error;
    }
  }

  /**
   * Download a document from storage
   * 
   * @param filePath - Path to the document in storage
   * @returns Blob containing the file data
   */
  async downloadDocument(filePath: string): Promise<Blob> {
    try {
      const { data: fileData, error: downloadError } = await supabase.storage
        .from(this.bucketName)
        .download(filePath);

      if (downloadError) {
        throw new Error(`Download failed: ${downloadError.message}`);
      }

      if (!fileData) {
        throw new Error('Download returned no data');
      }

      return fileData;
    } catch (error) {
      console.error('KYCStorageService: Download error:', error);
      throw error;
    }
  }

  /**
   * Delete a document from storage
   * 
   * @param filePath - Path to the document in storage
   */
  async deleteDocument(filePath: string): Promise<void> {
    try {
      const { error: deleteError } = await supabase.storage
        .from(this.bucketName)
        .remove([filePath]);

      if (deleteError) {
        throw new Error(`Delete failed: ${deleteError.message}`);
      }
    } catch (error) {
      console.error('KYCStorageService: Delete error:', error);
      throw error;
    }
  }

  /**
   * Save KYC document metadata to database
   * 
   * @param documentData - Document metadata to save
   * @returns Saved document record
   */
  async saveDocumentMetadata(documentData: Omit<KYCDocument, 'id' | 'created_at' | 'updated_at'>): Promise<KYCDocument> {
    try {
      const { data: insertData, error: insertError } = await supabase
        .from('kyc_documents')
        .insert([documentData])
        .select();

      if (insertError) {
        throw new Error(`Database insert failed: ${insertError.message}`);
      }

      if (!insertData || insertData.length === 0) {
        throw new Error('Database insert returned no data');
      }

      return insertData[0];
    } catch (error) {
      console.error('KYCStorageService: Save metadata error:', error);
      throw error;
    }
  }

  /**
   * Get all KYC documents for a pending farmer
   * 
   * @param pendingFarmerId - ID of the pending farmer
   * @returns Array of KYC documents
   */
  async getFarmerDocuments(pendingFarmerId: string): Promise<KYCDocument[]> {
    try {
      const { data: documents, error } = await supabase
        .from('kyc_documents')
        .select('*')
        .eq('pending_farmer_id', pendingFarmerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to fetch documents: ${error.message}`);
      }

      return documents || [];
    } catch (error) {
      console.error('KYCStorageService: Get documents error:', error);
      throw error;
    }
  }

  /**
   * Update KYC status for a user
   * 
   * @param userId - ID of the user
   * @param status - New KYC status
   */
  async updateKYCStatus(userId: string, status: 'pending' | 'approved' | 'rejected'): Promise<void> {
    try {
      const { error } = await supabase
        .from('farmers')
        .update({ kyc_status: status })
        .eq('id', userId);

      if (error) {
        throw new Error(`Failed to update KYC status: ${error.message}`);
      }
    } catch (error) {
      console.error('KYCStorageService: Update status error:', error);
      throw error;
    }
  }

  /**
   * List all documents in a folder (for admin dashboard)
   * 
   * @param folderPath - Path to folder in storage
   * @param limit - Maximum number of objects to return
   * @returns Array of storage objects
   */
  async listDocuments(folderPath: string, limit: number = 100): Promise<any[]> {
    try {
      const { data: objects, error: listError } = await supabase.storage
        .from(this.bucketName)
        .list(folderPath, { limit });

      if (listError) {
        throw new Error(`Failed to list documents: ${listError.message}`);
      }

      return objects || [];
    } catch (error) {
      console.error('KYCStorageService: List documents error:', error);
      throw error;
    }
  }
}

// Export a singleton instance
export const kycStorageService = new KYCStorageService();