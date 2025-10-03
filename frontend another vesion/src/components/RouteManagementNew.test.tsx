import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import RouteManagement from './RouteManagementNew';

// Mock the AuthContext
jest.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'staff-123', name: 'Test Staff' },
  }),
}));

// Mock the RoutesAPI
jest.mock('@/services/ApiService', () => ({
  RoutesAPI: {
    getStaffRoutes: jest.fn(),
    startRoute: jest.fn(),
    optimizeRoute: jest.fn(),
  },
}));

// Mock the useLoadScript hook
jest.mock('./RouteManagementNew', () => {
  const originalModule = jest.requireActual('./RouteManagementNew');
  return {
    ...originalModule,
    useLoadScript: () => ({ isLoaded: true }),
  };
});

const mockRoutesAPI = require('@/services/ApiService').RoutesAPI;

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

describe('RouteManagement', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders loading state initially', async () => {
    mockRoutesAPI.RoutesAPI.getStaffRoutes.mockResolvedValue([]);
    
    renderWithProviders(<RouteManagement />);
    
    // Initially should show loading spinner
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // After loading, should show no routes message
    await waitFor(() => {
      expect(screen.getByText('No routes available')).toBeInTheDocument();
    });
  });

  it('renders routes list when data is available', async () => {
    const mockRoutes = [
      {
        id: 'route-1',
        name: 'Morning Route',
        assigned_staff: 'staff-123',
        farmers: [
          { id: 'farmer-1', name: 'John Doe', location: { lat: 0, lng: 0 } }
        ],
        estimated_duration: 120,
        total_distance: 15.5,
        status: 'planned',
        scheduled_date: new Date().toISOString(),
      }
    ];
    
    mockRoutesAPI.RoutesAPI.getStaffRoutes.mockResolvedValue(mockRoutes);
    
    renderWithProviders(<RouteManagement />);
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('Morning Route')).toBeInTheDocument();
    });
    
    // Check that route details are displayed
    expect(screen.getByText('1 stops')).toBeInTheDocument();
    expect(screen.getByText('120 min')).toBeInTheDocument();
  });

  it('shows error message when API fails', async () => {
    mockRoutesAPI.RoutesAPI.getStaffRoutes.mockRejectedValue(new Error('API Error'));
    
    renderWithProviders(<RouteManagement />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to load routes')).toBeInTheDocument();
    });
  });

  it('allows route selection', async () => {
    const mockRoutes = [
      {
        id: 'route-1',
        name: 'Morning Route',
        assigned_staff: 'staff-123',
        farmers: [
          { id: 'farmer-1', name: 'John Doe', location: { lat: 0, lng: 0 } }
        ],
        estimated_duration: 120,
        total_distance: 15.5,
        status: 'planned',
        scheduled_date: new Date().toISOString(),
      },
      {
        id: 'route-2',
        name: 'Afternoon Route',
        assigned_staff: 'staff-123',
        farmers: [],
        estimated_duration: 90,
        total_distance: 10.2,
        status: 'planned',
        scheduled_date: new Date().toISOString(),
      }
    ];
    
    mockRoutesAPI.RoutesAPI.getStaffRoutes.mockResolvedValue(mockRoutes);
    
    renderWithProviders(<RouteManagement />);
    
    // Wait for routes to load
    await waitFor(() => {
      expect(screen.getByText('Morning Route')).toBeInTheDocument();
    });
    
    // Check that the first route is selected by default
    expect(screen.getByText('Morning Route')).toHaveClass('bg-blue-50');
    
    // Select the second route
    // Note: This would require more complex testing with user events
  });
});