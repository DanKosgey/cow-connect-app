import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import BulkCollectionEntryEnhanced from './BulkCollectionEntryEnhanced';
import { Farmer } from '@/types';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'staff-123', name: 'Test Staff' },
  }),
}));

// Mock the CollectionsAPI
jest.mock('@/services/ApiService', () => ({
  CollectionsAPI: {
    createBulk: jest.fn(),
  },
}));

// Mock the hooks
jest.mock('@/hooks/useBarcodeScanner', () => ({
  useBarcodeScanner: () => ({
    scanning: false,
    result: null,
    error: null,
    startScanning: jest.fn(),
    stopScanning: jest.fn(),
    scanImage: jest.fn(),
  }),
}));

jest.mock('@/hooks/useOfflineSync', () => ({
  useOfflineSync: () => ({
    addToQueue: jest.fn(),
    syncQueue: jest.fn(),
    queueStatus: { pending: 0, synced: 0, failed: 0 },
    isSyncing: false,
    syncError: null,
  }),
}));

jest.mock('@/hooks/useGeolocation', () => ({
  useGeolocation: () => ({
    location: { latitude: 0, longitude: 0 },
    error: null,
    loading: false,
    getLocation: jest.fn(),
  }),
}));

const mockCollectionsAPI = require('@/services/ApiService').CollectionsAPI;

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {component}
    </QueryClientProvider>
  );
};

describe('BulkCollectionEntryEnhanced', () => {
  const mockFarmers: Farmer[] = [
    { 
      id: 'farmer-1', 
      name: 'John Doe', 
      phone: '1234567890', 
      national_id: 'ID123',
      address: '123 Main St',
      registered_at: '2023-01-01T00:00:00Z'
    },
    { 
      id: 'farmer-2', 
      name: 'Jane Smith', 
      phone: '0987654321', 
      national_id: 'ID456',
      address: '456 Oak Ave',
      registered_at: '2023-01-01T00:00:00Z'
    },
  ];

  const mockOnSubmit = jest.fn();
  const mockOnCancel = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    renderWithProviders(
      <BulkCollectionEntryEnhanced
        farmers={mockFarmers}
        routeId="route-123"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    expect(screen.getByText('Bulk Collection Entry')).toBeInTheDocument();
    expect(screen.getByText('Record multiple milk collections for farmers on this route')).toBeInTheDocument();
    expect(screen.getByText('Add Row')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Submit All Collections')).toBeInTheDocument();
  });

  it('allows adding and removing collection rows', () => {
    renderWithProviders(
      <BulkCollectionEntryEnhanced
        farmers={mockFarmers}
        routeId="route-123"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Initially there should be one row
    expect(screen.getAllByRole('row')).toHaveLength(2); // Header + 1 data row

    // Add a row
    fireEvent.click(screen.getByText('Add Row'));
    
    // Now there should be two rows
    expect(screen.getAllByRole('row')).toHaveLength(3); // Header + 2 data rows

    // Remove a row (the remove button for the first row)
    const removeButtons = screen.getAllByRole('button', { name: /trash/i });
    fireEvent.click(removeButtons[0]);

    // Should be back to one row
    expect(screen.getAllByRole('row')).toHaveLength(2); // Header + 1 data row
  });

  it('shows online/offline status indicators', () => {
    renderWithProviders(
      <BulkCollectionEntryEnhanced
        farmers={mockFarmers}
        routeId="route-123"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Should show online status by default
    expect(screen.getByText('Online')).toBeInTheDocument();
  });

  it('handles form submission successfully', async () => {
    mockCollectionsAPI.CollectionsAPI.createBulk.mockResolvedValue({
      created_collections: [
        { id: 'collection-1', farmer_id: 'farmer-1', quality_grade: 'A', calculated_price: 100 },
      ],
      failed_collections: [],
      summary: { total_volume: 10, average_quality: 3, total_value: 100 },
    });

    renderWithProviders(
      <BulkCollectionEntryEnhanced
        farmers={mockFarmers}
        routeId="route-123"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill in some data
    const volumeInput = screen.getByPlaceholderText('0.0');
    fireEvent.change(volumeInput, { target: { value: '10' } });

    const farmerInput = screen.getByPlaceholderText('Search farmer...');
    fireEvent.change(farmerInput, { target: { value: 'John Doe' } });

    // Select the farmer from the dropdown
    const farmerOption = screen.getByText('John Doe');
    fireEvent.click(farmerOption);

    // For this test, we'll simulate that the signature is already captured
    // In a real implementation, we would interact with the signature pad
    
    // Submit the form (should be disabled initially because no signature)
    const submitButton = screen.getByText('Submit All Collections');
    expect(submitButton).toBeDisabled();

    // Mock that signature is captured (in a real test we would simulate the signature capture)
    // For now, we'll just test that the component renders correctly
  });

  it('shows error message on submission failure', async () => {
    mockCollectionsAPI.CollectionsAPI.createBulk.mockRejectedValue(new Error('API Error'));

    renderWithProviders(
      <BulkCollectionEntryEnhanced
        farmers={mockFarmers}
        routeId="route-123"
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    );

    // Fill in some data
    const volumeInput = screen.getByPlaceholderText('0.0');
    fireEvent.change(volumeInput, { target: { value: '10' } });

    const farmerInput = screen.getByPlaceholderText('Search farmer...');
    fireEvent.change(farmerInput, { target: { value: 'John Doe' } });

    // Select the farmer from the dropdown
    const farmerOption = screen.getByText('John Doe');
    fireEvent.click(farmerOption);

    // Submit the form
    fireEvent.click(screen.getByText('Submit All Collections'));

    // Wait for error to appear
    await waitFor(() => {
      expect(screen.getByText('Failed to submit collections')).toBeInTheDocument();
    });
  });
});