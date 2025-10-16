import { vi, beforeEach, describe, it, expect } from 'vitest';
import { KYCStorageService } from '@/services/kycStorageService';

// Mock the Supabase client using a factory function
vi.mock('@/integrations/supabase/client', () => {
  // Create a proper chainable mock
  const createChainableMock = () => {
    const mock = {
      storage: {
        from: vi.fn(),
        upload: vi.fn(),
        getPublicUrl: vi.fn(),
        createSignedUrl: vi.fn(),
        download: vi.fn(),
        remove: vi.fn(),
        list: vi.fn(),
      },
      from: vi.fn(),
      insert: vi.fn(),
      select: vi.fn(),
      eq: vi.fn(),
      order: vi.fn(),
      update: vi.fn(),
      rpc: vi.fn(),
    };
    
    // Make all methods return the mock object for chaining
    const returnMock = () => mock;
    mock.storage.from.mockImplementation(returnMock);
    mock.storage.upload.mockImplementation(returnMock);
    mock.storage.getPublicUrl.mockImplementation(returnMock);
    mock.storage.createSignedUrl.mockImplementation(returnMock);
    mock.storage.download.mockImplementation(returnMock);
    mock.storage.remove.mockImplementation(returnMock);
    mock.storage.list.mockImplementation(returnMock);
    mock.from.mockImplementation(returnMock);
    mock.select.mockImplementation(returnMock);
    mock.eq.mockImplementation(returnMock);
    mock.order.mockImplementation(returnMock);
    mock.update.mockImplementation(returnMock);
    mock.insert.mockImplementation(returnMock);
    
    return mock;
  };
  
  return {
    supabase: createChainableMock()
  };
});

// Import the service after mocking
import { supabase } from '@/integrations/supabase/client';

describe('KYCStorageService', () => {
  let service: KYCStorageService;
  let mockSupabase: any;

  beforeEach(async () => {
    service = new KYCStorageService();
    // Clear all mocks before each test
    vi.clearAllMocks();
    
    // Get the mock instance
    const module = await import('@/integrations/supabase/client');
    mockSupabase = module.supabase;
    
    // Reset all mock implementations
    mockSupabase.storage.from.mockImplementation(() => mockSupabase.storage);
    mockSupabase.storage.upload.mockImplementation(() => mockSupabase.storage);
    mockSupabase.storage.getPublicUrl.mockImplementation(() => mockSupabase.storage);
    mockSupabase.storage.createSignedUrl.mockImplementation(() => mockSupabase.storage);
    mockSupabase.storage.download.mockImplementation(() => mockSupabase.storage);
    mockSupabase.storage.remove.mockImplementation(() => mockSupabase.storage);
    mockSupabase.storage.list.mockImplementation(() => mockSupabase.storage);
    mockSupabase.from.mockImplementation(() => mockSupabase);
    mockSupabase.select.mockImplementation(() => mockSupabase);
    mockSupabase.eq.mockImplementation(() => mockSupabase);
    mockSupabase.order.mockImplementation(() => mockSupabase);
    mockSupabase.update.mockImplementation(() => mockSupabase);
    mockSupabase.insert.mockImplementation(() => mockSupabase);
  });

  describe('uploadDocument', () => {
    it('should upload a document successfully', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'user-123';
      const documentType = 'id_front';
      
      const mockUploadData = { path: 'user-123/id_front/test-123.jpg' };
      const mockUrlData = { publicUrl: 'https://example.com/test.jpg' };
      
      mockSupabase.storage.upload.mockResolvedValue({ data: mockUploadData, error: null });
      mockSupabase.storage.getPublicUrl.mockReturnValue({ data: mockUrlData });
      
      const result = await service.uploadDocument(mockFile, userId, documentType);
      
      expect(result).toEqual({
        path: 'user-123/id_front/test-123.jpg',
        url: 'https://example.com/test.jpg'
      });
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('kyc-documents');
      expect(mockSupabase.storage.upload).toHaveBeenCalled();
    });

    it('should throw an error when upload fails', async () => {
      const mockFile = new File(['test content'], 'test.jpg', { type: 'image/jpeg' });
      const userId = 'user-123';
      const documentType = 'id_front';
      
      mockSupabase.storage.upload.mockResolvedValue({ data: null, error: { message: 'Upload failed' } });
      
      await expect(service.uploadDocument(mockFile, userId, documentType))
        .rejects
        .toThrow('File upload failed: Upload failed');
    });
  });

  describe('getSignedUrl', () => {
    it('should generate a signed URL successfully', async () => {
      const filePath = 'user-123/id_front/test-123.jpg';
      const mockSignedData = { signedUrl: 'https://example.com/signed-url' };
      
      mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: mockSignedData, error: null });
      
      const result = await service.getSignedUrl(filePath);
      
      expect(result).toBe('https://example.com/signed-url');
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('kyc-documents');
      expect(mockSupabase.storage.createSignedUrl).toHaveBeenCalledWith(filePath, 3600);
    });

    it('should throw an error when signed URL generation fails', async () => {
      const filePath = 'user-123/id_front/test-123.jpg';
      
      mockSupabase.storage.createSignedUrl.mockResolvedValue({ data: null, error: { message: 'URL generation failed' } });
      
      await expect(service.getSignedUrl(filePath))
        .rejects
        .toThrow('Failed to create signed URL: URL generation failed');
    });
  });

  describe('downloadDocument', () => {
    it('should download a document successfully', async () => {
      const filePath = 'user-123/id_front/test-123.jpg';
      const mockBlob = new Blob(['test content']);
      
      mockSupabase.storage.download.mockResolvedValue({ data: mockBlob, error: null });
      
      const result = await service.downloadDocument(filePath);
      
      expect(result).toBeInstanceOf(Blob);
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('kyc-documents');
      expect(mockSupabase.storage.download).toHaveBeenCalledWith(filePath);
    });

    it('should throw an error when download fails', async () => {
      const filePath = 'user-123/id_front/test-123.jpg';
      
      mockSupabase.storage.download.mockResolvedValue({ data: null, error: { message: 'Download failed' } });
      
      await expect(service.downloadDocument(filePath))
        .rejects
        .toThrow('Download failed: Download failed');
    });
  });

  describe('deleteDocument', () => {
    it('should delete a document successfully', async () => {
      const filePath = 'user-123/id_front/test-123.jpg';
      
      mockSupabase.storage.remove.mockResolvedValue({ error: null });
      
      await expect(service.deleteDocument(filePath)).resolves.toBeUndefined();
      expect(mockSupabase.storage.from).toHaveBeenCalledWith('kyc-documents');
      expect(mockSupabase.storage.remove).toHaveBeenCalledWith([filePath]);
    });

    it('should throw an error when delete fails', async () => {
      const filePath = 'user-123/id_front/test-123.jpg';
      
      mockSupabase.storage.remove.mockResolvedValue({ error: { message: 'Delete failed' } });
      
      await expect(service.deleteDocument(filePath))
        .rejects
        .toThrow('Delete failed: Delete failed');
    });
  });
});