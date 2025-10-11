import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import KYCAdminDashboard from '../pages/admin/KYCAdminDashboard';
import useToastNotifications from '../hooks/useToastNotifications';

// Mock the Supabase client
const mockRpc = vi.fn().mockResolvedValue({ data: null, error: null });
const mockGetPublicUrl = vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/document.pdf' } });
const mockRemoveChannel = vi.fn();

const mockSupabase = {
  from: vi.fn().mockReturnThis(),
  select: vi.fn().mockReturnThis(),
  order: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  rpc: mockRpc,
  storage: {
    from: vi.fn().mockReturnValue({
      getPublicUrl: mockGetPublicUrl
    })
  },
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-admin-id' } }, error: null })
  },
  channel: vi.fn().mockReturnValue({
    on: vi.fn().mockReturnThis(),
    subscribe: vi.fn().mockReturnThis()
  }),
  removeChannel: mockRemoveChannel
};

// Mock the DashboardLayout component
vi.mock('../components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div data-testid="dashboard-layout">{children}</div>
}));

// Mock the useToastNotifications hook
const mockToast = {
  success: vi.fn(),
  error: vi.fn()
};

vi.mock('../hooks/useToastNotifications', () => ({
  default: () => mockToast
}));

// Mock the react-router-dom useNavigate hook
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

vi.mock('../integrations/supabase/client', () => ({
  supabase: mockSupabase
}));

describe('KYCAdminDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSupabase.from.mockReturnThis();
    mockSupabase.select.mockReturnThis();
    mockSupabase.order.mockReturnThis();
    mockSupabase.eq.mockReturnThis();
    mockRpc.mockClear().mockResolvedValue({ data: null, error: null });
    mockGetPublicUrl.mockClear().mockReturnValue({ data: { publicUrl: 'https://example.com/document.pdf' } });
  });

  it('should render loading state initially', () => {
    // Mock the fetchFarmers function to simulate loading
    mockSupabase.from.mockImplementationOnce(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: [], error: null })
      })
    }));

    render(<KYCAdminDashboard />);
    
    expect(screen.getByText('Loading KYC data...')).toBeInTheDocument();
  });

  it('should fetch and display farmers data', async () => {
    // Mock the farmers data
    const mockFarmers = [
      {
        id: '1',
        full_name: 'John Doe',
        national_id: '12345678',
        phone_number: '0712345678',
        kyc_status: 'pending',
        registration_number: 'REG001',
        created_at: '2023-01-01T00:00:00Z',
        profiles: {
          email: 'john@example.com',
          full_name: 'John Doe',
          phone: '0712345678'
        }
      }
    ];

    // Mock the Supabase response
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: mockFarmers, error: null })
      })
    }));

    render(<KYCAdminDashboard />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('KYC Management')).toBeInTheDocument();
    });

    // Check if farmer data is displayed
    expect(screen.getByText('John Doe')).toBeInTheDocument();
    expect(screen.getByText('12345678')).toBeInTheDocument();
    expect(screen.getByText('REG001')).toBeInTheDocument();
  });

  it('should display statistics correctly', async () => {
    // Mock the farmers data with different statuses
    const mockFarmers = [
      { id: '1', full_name: 'John Doe', kyc_status: 'pending' },
      { id: '2', full_name: 'Jane Smith', kyc_status: 'approved' },
      { id: '3', full_name: 'Bob Johnson', kyc_status: 'rejected' },
      { id: '4', full_name: 'Alice Brown', kyc_status: 'pending' }
    ];

    // Mock the Supabase response
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: mockFarmers, error: null })
      })
    }));

    render(<KYCAdminDashboard />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('KYC Management')).toBeInTheDocument();
    });

    // Check if statistics are displayed correctly
    expect(screen.getByText('4')).toBeInTheDocument(); // Total
    expect(screen.getByText('2')).toBeInTheDocument(); // Pending
    expect(screen.getByText('1')).toBeInTheDocument(); // Approved
    expect(screen.getByText('1')).toBeInTheDocument(); // Rejected
  });

  it('should call approve_kyc RPC when approving a farmer', async () => {
    // Mock the farmers data
    const mockFarmers = [
      {
        id: 'farmer-1',
        full_name: 'John Doe',
        kyc_status: 'pending',
        profiles: { email: 'john@example.com'
}
      }
    ];

    // Mock the Supabase response for fetching farmers
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: mockFarmers, error: null })
      })
    }));

    render(<KYCAdminDashboard />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click the "View Details" button
    fireEvent.click(screen.getByText('View Details'));

    // Click the "Approve Application" button
    fireEvent.click(screen.getByText('Approve Application'));

    // Check if the RPC was called with correct parameters
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('approve_kyc', {
        farmer_id: 'farmer-1',
        admin_id: 'test-admin-id',
      });
    });
  });

  it('should call reject_kyc RPC when rejecting a farmer', async () => {
    // Mock the farmers data
    const mockFarmers = [
      {
        id: 'farmer-1',
        full_name: 'John Doe',
        kyc_status: 'pending',
        profiles: { email: 'john@example.com' }
      }
    ];

    // Mock the Supabase response for fetching farmers
    mockSupabase.from.mockImplementation(() => ({
      select: () => ({
        order: () => Promise.resolve({ data: mockFarmers, error: null })
      })
    }));

    render(<KYCAdminDashboard />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click the "View Details" button
    fireEvent.click(screen.getByText('View Details'));

    // Click the "Reject Application" button
    fireEvent.click(screen.getByText('Reject Application'));

    // Fill in the rejection reason
    fireEvent.change(screen.getByPlaceholderText('Enter rejection reason...'), {
      target: { value: 'Invalid documents provided' }
    });

    // Click the "Confirm Rejection" button
    fireEvent.click(screen.getByText('Confirm Rejection'));

    // Check if the RPC was called with correct parameters
    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('reject_kyc', {
        farmer_id: 'farmer-1',
        reason: 'Invalid documents provided',
        admin_id: 'test-admin-id',
      });
    });
  });

  it('should fetch and display KYC documents', async () => {
    // Mock the farmers data
    const mockFarmers = [
      {
        id: 'farmer-1',
        full_name: 'John Doe',
        kyc_status: 'pending',
        profiles: { email: 'john@example.com' }
      }
    ];

    // Mock the documents data
    const mockDocuments = [
      {
        id: 'doc-1',
        farmer_id: 'farmer-1',
        document_type: 'National ID',
        file_name: 'national-id.pdf',
        file_path: 'farmer-1/national-id.pdf',
        mime_type: 'application/pdf',
        status: 'pending'
      }
    ];

    // Mock the Supabase response for fetching farmers
    mockSupabase.from.mockImplementation((table: string) => {
      if (table === 'farmers') {
        return {
          select: () => ({
            order: () => Promise.resolve({ data: mockFarmers, error: null })
          })
        };
      } else if (table === 'kyc_documents') {
        return {
          select: () => ({
            eq: () => Promise.resolve({ data: mockDocuments, error: null })
          })
        };
      }
      return mockSupabase;
    });

    render(<KYCAdminDashboard />);

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.getByText('John Doe')).toBeInTheDocument();
    });

    // Click the "View Details" button
    fireEvent.click(screen.getByText('View Details'));

    // Check if documents are displayed
    await waitFor(() => {
      expect(screen.getByText('National ID')).toBeInTheDocument();
      expect(screen.getByText('national-id.pdf')).toBeInTheDocument();
    });
  });
});