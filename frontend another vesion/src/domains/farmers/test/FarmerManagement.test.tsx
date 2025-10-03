import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import FarmerManagement from './FarmerManagement';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'staff-123', name: 'Test Staff' },
  }),
}));

// Mock the ApiService
jest.mock('@/services/ApiService', () => ({
  FarmersAPI: {
    list: jest.fn(),
    updateStatus: jest.fn(),
  },
  MessagesAPI: {
    send: jest.fn(),
    list: jest.fn(),
    markAsRead: jest.fn(),
  },
}));

// Mock the hooks
jest.mock('@/hooks/useMessaging', () => ({
  useMessaging: () => ({
    messages: [],
    loading: false,
    error: null,
    unreadCount: 0,
    isConnected: true,
    sendMessage: jest.fn(),
    markAsRead: jest.fn(),
    markAllAsRead: jest.fn(),
    refresh: jest.fn(),
  }),
}));

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    isConnected: true,
    error: null,
    sendMessage: jest.fn(),
    reconnect: jest.fn(),
  }),
}));

const mockFarmersAPI = require('@/services/ApiService').FarmersAPI;
const mockMessagesAPI = require('@/services/ApiService').MessagesAPI;

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

describe('FarmerManagement', () => {
  const mockStaffId = 'staff-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders the component with initial state', () => {
    mockFarmersAPI.FarmersAPI.list.mockResolvedValue({
      items: [],
      pagination: {
        page: 1,
        size: 10,
        total: 0,
        pages: 0,
        has_next: false,
        has_prev: false,
      },
    });

    renderWithProviders(<FarmerManagement staffId={mockStaffId} />);

    expect(screen.getByText('Farmer Management')).toBeInTheDocument();
    expect(screen.getByText('Manage farmers, communicate with them, and track their activities')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Search farmers by name, phone, ID, or location...')).toBeInTheDocument();
  });

  it('displays farmers when data is loaded', async () => {
    const mockFarmers = [
      {
        id: 'farmer-1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        national_id: 'ID123',
        address: '123 Main St',
        kyc_status: 'approved',
        collection_history: {
          total_collections: 10,
          total_volume: 500,
          last_collection_date: '2023-01-01',
          avg_quality: 4.5,
        },
        payment_status: 'active',
        quality_rating: 4.5,
        last_collection: '2023-01-01',
        active_issues: [],
        registered_at: '2023-01-01',
        location: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
      },
    ];

    mockFarmersAPI.FarmersAPI.list.mockResolvedValue({
      items: mockFarmers,
      pagination: {
        page: 1,
        size: 10,
        total: 1,
        pages: 1,
        has_next: false,
        has_prev: false,
      },
    });

    renderWithProviders(<FarmerManagement staffId={mockStaffId} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('1234567890')).toBeInTheDocument();
      expect(screen.getByText('john@example.com')).toBeInTheDocument();
    });
  });

  it('allows searching farmers', async () => {
    const mockFarmers = [
      {
        id: 'farmer-1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        national_id: 'ID123',
        address: '123 Main St',
        kyc_status: 'approved',
        collection_history: {
          total_collections: 10,
          total_volume: 500,
          last_collection_date: '2023-01-01',
          avg_quality: 4.5,
        },
        payment_status: 'active',
        quality_rating: 4.5,
        last_collection: '2023-01-01',
        active_issues: [],
        registered_at: '2023-01-01',
        location: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
      },
      {
        id: 'farmer-2',
        name: 'Jane Smith',
        phone: '0987654321',
        email: 'jane@example.com',
        national_id: 'ID456',
        address: '456 Oak Ave',
        kyc_status: 'pending',
        collection_history: {
          total_collections: 5,
          total_volume: 250,
          last_collection_date: '2023-01-02',
          avg_quality: 3.8,
        },
        payment_status: 'pending',
        quality_rating: 3.8,
        last_collection: '2023-01-02',
        active_issues: [],
        registered_at: '2023-01-02',
        location: {
          street: '456 Oak Ave',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
      },
    ];

    mockFarmersAPI.FarmersAPI.list.mockResolvedValue({
      items: mockFarmers,
      pagination: {
        page: 1,
        size: 10,
        total: 2,
        pages: 1,
        has_next: false,
        has_prev: false,
      },
    });

    renderWithProviders(<FarmerManagement staffId={mockStaffId} />);

    // Wait for initial load
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    // Search for John
    const searchInput = screen.getByPlaceholderText('Search farmers by name, phone, ID, or location...');
    fireEvent.change(searchInput, { target: { value: 'John' } });

    // Wait for search results
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.queryByText('Jane Smith')).not.toBeInTheDocument();
    });
  });

  it('shows error message when farmer loading fails', async () => {
    mockFarmersAPI.FarmersAPI.list.mockRejectedValue(new Error('API Error'));

    renderWithProviders(<FarmerManagement staffId={mockStaffId} />);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch farmers')).toBeInTheDocument();
    });
  });

  it('allows selecting farmers for bulk actions', async () => {
    const mockFarmers = [
      {
        id: 'farmer-1',
        name: 'John Doe',
        phone: '1234567890',
        email: 'john@example.com',
        national_id: 'ID123',
        address: '123 Main St',
        kyc_status: 'approved',
        collection_history: {
          total_collections: 10,
          total_volume: 500,
          last_collection_date: '2023-01-01',
          avg_quality: 4.5,
        },
        payment_status: 'active',
        quality_rating: 4.5,
        last_collection: '2023-01-01',
        active_issues: [],
        registered_at: '2023-01-01',
        location: {
          street: '123 Main St',
          city: 'City',
          state: 'State',
          zipCode: '12345',
          country: 'Country',
        },
      },
    ];

    mockFarmersAPI.FarmersAPI.list.mockResolvedValue({
      items: mockFarmers,
      pagination: {
        page: 1,
        size: 10,
        total: 1,
        pages: 1,
        has_next: false,
        has_prev: false,
      },
    });

    renderWithProviders(<FarmerManagement staffId={mockStaffId} />);

    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Select the farmer
    const checkbox = screen.getByRole('checkbox', { name: '' });
    fireEvent.click(checkbox);

    // Check that the farmer is selected
    expect(checkbox).toBeChecked();
    expect(screen.getByText('1 selected')).toBeInTheDocument();
  });
});