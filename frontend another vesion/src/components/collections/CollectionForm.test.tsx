import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import CollectionForm from './CollectionForm';

// Mock hooks
jest.mock('@/hooks/useGeolocation', () => ({
  __esModule: true,
  default: () => ({
    location: {
      latitude: -1.286389,
      longitude: 36.817223,
      accuracy: 10,
      timestamp: Date.now(),
    },
    error: null,
    loading: false,
    getLocation: jest.fn(),
  }),
}));

jest.mock('@/hooks/useCollectionSubmission', () => ({
  useCollectionSubmission: () => ({
    submitCollection: jest.fn().mockResolvedValue({
      id: 'collection_123',
      quality_grade: 'A',
      calculated_price: 1200,
      quality_score: 9.5,
      created_at: new Date().toISOString(),
      collection_point: 'Main Dairy Center',
    }),
    isSubmitting: false,
    submissionError: null,
  }),
}));

jest.mock('@/hooks/useIndexedDB', () => ({
  useIndexedDB: () => ({
    isInitialized: true,
    error: null,
    addCollection: jest.fn(),
    updateCollection: jest.fn(),
    getUnsyncedCollections: jest.fn(),
    markCollectionAsSynced: jest.fn(),
    addFarmer: jest.fn(),
    searchFarmers: jest.fn(),
    getAllFarmers: jest.fn(),
  }),
}));

// Mock useToast
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

describe('CollectionForm', () => {
  const mockFarmerId = 'farmer_123';
  const mockFarmerName = 'John Doe';
  const mockOnSuccess = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    render(
      <CollectionForm 
        farmerId={mockFarmerId} 
        farmerName={mockFarmerName} 
        onSuccess={mockOnSuccess} 
      />
    );
    
    expect(screen.getByText('Record Milk Collection')).toBeInTheDocument();
    expect(screen.getByText(`Record a new milk collection for ${mockFarmerName}`)).toBeInTheDocument();
  });

  it('displays location information', () => {
    render(
      <CollectionForm 
        farmerId={mockFarmerId} 
        farmerName={mockFarmerName} 
        onSuccess={mockOnSuccess} 
      />
    );
    
    expect(screen.getByText('Location Status')).toBeInTheDocument();
    expect(screen.getByText('Accuracy: 10 meters')).toBeInTheDocument();
  });

  it('validates required fields', async () => {
    render(
      <CollectionForm 
        farmerId={mockFarmerId} 
        farmerName={mockFarmerName} 
        onSuccess={mockOnSuccess} 
      />
    );
    
    const submitButton = screen.getByText('Record Collection');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText('Required')).toBeInTheDocument();
    });
  });

  it('handles form submission', async () => {
    render(
      <CollectionForm 
        farmerId={mockFarmerId} 
        farmerName={mockFarmerName} 
        onSuccess={mockOnSuccess} 
      />
    );
    
    // Fill in required fields
    const volumeInput = screen.getByLabelText('Volume (Liters) *');
    fireEvent.change(volumeInput, { target: { value: '50' } });
    
    const temperatureInput = screen.getByLabelText('Temperature (°C) *');
    fireEvent.change(temperatureInput, { target: { value: '4' } });
    
    const submitButton = screen.getByText('Record Collection');
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('handles photo upload', () => {
    render(
      <CollectionForm 
        farmerId={mockFarmerId} 
        farmerName={mockFarmerName} 
        onSuccess={mockOnSuccess} 
      />
    );
    
    const captureButton = screen.getByText('Capture Photos');
    expect(captureButton).toBeInTheDocument();
  });

  it('shows validation warnings', () => {
    render(
      <CollectionForm 
        farmerId={mockFarmerId} 
        farmerName={mockFarmerName} 
        onSuccess={mockOnSuccess} 
      />
    );
    
    const temperatureInput = screen.getByLabelText('Temperature (°C) *');
    fireEvent.change(temperatureInput, { target: { value: '10' } });
    
    expect(screen.getByText('Warning: Temperature outside recommended storage range (2-8°C)')).toBeInTheDocument();
  });
});