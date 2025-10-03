import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import FarmerDashboard from './FarmerDashboard';

// Mock the hooks
jest.mock('@/hooks/useFarmerDashboard', () => ({
  __esModule: true,
  default: () => ({
    dashboardData: {
      totalCollections: 10,
      monthlyEarnings: 5000,
      averageQuality: 4.2,
      upcomingPayments: [
        { id: '1', amount: 2000, status: 'pending', dueDate: '2023-12-01' }
      ],
      recentCollections: [
        { id: '1', volume: 50, quality: 'A', timestamp: '2023-11-01', pricePerLiter: 40 }
      ],
      qualityTrends: [
        { date: '2023-11-01', quality: 4.0, volume: 50 }
      ]
    },
    loading: false,
    error: null,
    refreshDashboard: jest.fn()
  })
}));

jest.mock('@/hooks/useWebSocket', () => ({
  useWebSocket: () => ({
    ws: null,
    isConnected: true,
    error: null,
    sendMessage: jest.fn(),
    reconnect: jest.fn()
  })
}));

// Mock the toast hook
jest.mock('@/components/ui/use-toast', () => ({
  useToast: () => ({
    toast: jest.fn()
  })
}));

describe('FarmerDashboard', () => {
  const mockFarmerId = 'farmer_123';

  it('renders without crashing', () => {
    render(<FarmerDashboard farmerId={mockFarmerId} />);
    expect(screen.getByText('Farmer Dashboard')).toBeInTheDocument();
  });

  it('displays loading skeleton when loading', async () => {
    // Re-mock the hook to simulate loading state
    jest.mock('@/hooks/useFarmerDashboard', () => ({
      __esModule: true,
      default: () => ({
        dashboardData: null,
        loading: true,
        error: null,
        refreshDashboard: jest.fn()
      })
    }));

    render(<FarmerDashboard farmerId={mockFarmerId} />);
    
    // Wait for the loading skeleton to appear
    await waitFor(() => {
      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });
  });

  it('displays error message when there is an error', async () => {
    // Re-mock the hook to simulate error state
    jest.mock('@/hooks/useFarmerDashboard', () => ({
      __esModule: true,
      default: () => ({
        dashboardData: null,
        loading: false,
        error: 'Failed to load data',
        refreshDashboard: jest.fn()
      })
    }));

    render(<FarmerDashboard farmerId={mockFarmerId} />);
    
    // Wait for the error message to appear
    await waitFor(() => {
      expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
    });
  });

  it('displays dashboard data when loaded', async () => {
    render(<FarmerDashboard farmerId={mockFarmerId} />);
    
    // Wait for the dashboard data to appear
    await waitFor(() => {
      expect(screen.getByText('10')).toBeInTheDocument(); // Total Collections
      expect(screen.getByText('KSh 5,000')).toBeInTheDocument(); // Monthly Earnings
      expect(screen.getByText('4.2')).toBeInTheDocument(); // Average Quality
    });
  });
});