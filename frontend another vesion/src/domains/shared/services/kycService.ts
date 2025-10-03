import apiService from './ApiService';

interface KYCUploadData {
  document_type: string;
  document_number: string;
  expiry_date: string;
  front_image: File;
  back_image?: File;
  selfie_image: File;
}

interface KYCResponse {
  id: string;
  status: 'pending' | 'approved' | 'rejected';
  submitted_at: string;
  documents: Array<{
    id: string;
    type: string;
    url: string;
    uploaded_at: string;
  }>;
}

class KYCService {
  /**
   * Upload KYC documents for a farmer
   * @param farmerId - The ID of the farmer
   * @param data - The KYC data including document images
   * @returns Promise<KYCResponse>
   */
  async uploadDocuments(farmerId: string, data: KYCUploadData): Promise<KYCResponse> {
    const formData = new FormData();
    
    formData.append('document_type', data.document_type);
    formData.append('document_number', data.document_number);
    formData.append('expiry_date', data.expiry_date);
    formData.append('front_image', data.front_image);
    
    if (data.back_image) {
      formData.append('back_image', data.back_image);
    }
    
    formData.append('selfie_image', data.selfie_image);
    
    try {
      // Since the request function is not exported, we'll use fetch directly
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/farmers/${farmerId}/kyc`, {
        method: 'POST',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData as any,
      });
      
      if (!response.ok) {
        throw new Error(`API ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('KYC upload failed:', error);
      throw new Error('Failed to upload KYC documents. Please try again.');
    }
  }
  
  /**
   * Get KYC status for a farmer
   * @param farmerId - The ID of the farmer
   * @returns Promise<KYCResponse>
   */
  async getKYCStatus(farmerId: string): Promise<KYCResponse> {
    try {
      // Since the request function is not exported, we'll use fetch directly
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/farmers/${farmerId}/kyc`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
      });
      
      if (!response.ok) {
        throw new Error(`API ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Failed to fetch KYC status:', error);
      throw new Error('Failed to fetch KYC status. Please try again.');
    }
  }
  
  /**
   * Update KYC documents for a farmer (resubmission)
   * @param farmerId - The ID of the farmer
   * @param data - The updated KYC data
   * @returns Promise<KYCResponse>
   */
  async updateDocuments(farmerId: string, data: KYCUploadData): Promise<KYCResponse> {
    const formData = new FormData();
    
    formData.append('document_type', data.document_type);
    formData.append('document_number', data.document_number);
    formData.append('expiry_date', data.expiry_date);
    formData.append('front_image', data.front_image);
    
    if (data.back_image) {
      formData.append('back_image', data.back_image);
    }
    
    formData.append('selfie_image', data.selfie_image);
    
    try {
      // Since the request function is not exported, we'll use fetch directly
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/v1/farmers/${farmerId}/kyc`, {
        method: 'PUT',
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: formData as any,
      });
      
      if (!response.ok) {
        throw new Error(`API ${response.status}: ${response.statusText}`);
      }
      
      const data = await response.json();
      return data;
    } catch (error) {
      console.error('KYC update failed:', error);
      throw new Error('Failed to update KYC documents. Please try again.');
    }
  }
}

export default new KYCService();