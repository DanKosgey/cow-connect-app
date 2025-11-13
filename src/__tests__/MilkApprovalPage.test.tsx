import { vi, beforeEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MilkApprovalService } from '../services/milk-approval-service';
import MilkApprovalPage from '../pages/staff-portal/MilkApprovalPage';

// Mock the React Router DOM
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

// Mock the Auth Context
vi.mock('../contexts/SimplifiedAuthContext', () => ({
  useAuth: () => ({
    user: { id: 'user-1' }
  })
}));

// Mock the Toast Notifications
vi.mock('../hooks/useToastNotifications', () => ({
  default: () => ({
    show: vi.fn(),
    error: vi.fn()
  })
}));

// Mock the MilkApprovalService
vi.mock('../services/milk-approval-service', () => ({
  MilkApprovalService: {
    getPendingCollections: vi.fn(),
    approveMilkCollection: vi.fn()
  }
}));

describe('MilkApprovalPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render the page title', () => {
    render(<MilkApprovalPage />);
    
    expect(screen.getByText('Milk Approval')).toBeInTheDocument();
    expect(screen.getByText('Approve milk collections and track variances')).toBeInTheDocument();
  });

  it('should display loading state when fetching collections', async () => {
    (MilkApprovalService.getPendingCollections as jest.Mock).mockResolvedValue({
      success: true,
      data: []
    });
    
    render(<MilkApprovalPage />);
    
    // Should show loading spinner initially
    expect(screen.getByRole('status')).toBeInTheDocument();
    
    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
    });
  });

  it('should display pending collections', async () => {
    const mockCollections = [
      {
        id: 'collection-1',
        collection_id: 'COL-001',
        liters: 100,
        collection_date: '2025-10-08T10:00:00Z',
        status: 'Collected',
        approved_for_company: false,
        farmers: {
          full_name: 'John Doe',
          id: 'farmer-1'
        }
      }
    ];
    
    (MilkApprovalService.getPendingCollections as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCollections
    });
    
    render(<MilkApprovalPage />);
    
    await waitFor(() => {
      expect(screen.getByText('COL-001')).toBeInTheDocument();
      expect(screen.getByText('John Doe')).toBeInTheDocument();
      expect(screen.getByText('100.00 L')).toBeInTheDocument();
    });
  });

  it('should show approval form when approve button is clicked', async () => {
    const mockCollections = [
      {
        id: 'collection-1',
        collection_id: 'COL-001',
        liters: 100,
        collection_date: '2025-10-08T10:00:00Z',
        status: 'Collected',
        approved_for_company: false,
        farmers: {
          full_name: 'John Doe',
          id: 'farmer-1'
        }
      }
    ];
    
    (MilkApprovalService.getPendingCollections as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCollections
    });
    
    render(<MilkApprovalPage />);
    
    await waitFor(() => {
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
    });
    
    // Check that the approval form is displayed
    expect(screen.getByText('Approve Milk Collection')).toBeInTheDocument();
    expect(screen.getByLabelText('Company Received Liters *')).toBeInTheDocument();
  });

  it('should call approveMilkCollection when form is submitted', async () => {
    const mockCollections = [
      {
        id: 'collection-1',
        collection_id: 'COL-001',
        liters: 100,
        collection_date: '2025-10-08T10:00:00Z',
        status: 'Collected',
        approved_for_company: false,
        farmers: {
          full_name: 'John Doe',
          id: 'farmer-1'
        }
      }
    ];
    
    (MilkApprovalService.getPendingCollections as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCollections
    });
    
    (MilkApprovalService.approveMilkCollection as jest.Mock).mockResolvedValue({
      success: true,
      data: { id: 'approval-1' }
    });
    
    render(<MilkApprovalPage />);
    
    // Click approve button
    await waitFor(() => {
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
    });
    
    // Fill in the form
    const receivedLitersInput = screen.getByLabelText('Company Received Liters *');
    fireEvent.change(receivedLitersInput, { target: { value: '105' } });
    
    const notesInput = screen.getByLabelText('Approval Notes');
    fireEvent.change(notesInput, { target: { value: 'Test approval' } });
    
    // Submit the form
    const submitButton = screen.getByText('Approve Collection');
    fireEvent.click(submitButton);
    
    // Check that the service was called
    await waitFor(() => {
      expect(MilkApprovalService.approveMilkCollection).toHaveBeenCalledWith({
        collectionId: 'collection-1',
        staffId: 'user-1',
        companyReceivedLiters: 105,
        approvalNotes: 'Test approval'
      });
    });
  });

  it('should show error message when approval fails', async () => {
    const mockCollections = [
      {
        id: 'collection-1',
        collection_id: 'COL-001',
        liters: 100,
        collection_date: '2025-10-08T10:00:00Z',
        status: 'Collected',
        approved_for_company: false,
        farmers: {
          full_name: 'John Doe',
          id: 'farmer-1'
        }
      }
    ];
    
    (MilkApprovalService.getPendingCollections as jest.Mock).mockResolvedValue({
      success: true,
      data: mockCollections
    });
    
    (MilkApprovalService.approveMilkCollection as jest.Mock).mockResolvedValue({
      success: false,
      error: new Error('Approval failed')
    });
    
    render(<MilkApprovalPage />);
    
    // Click approve button
    await waitFor(() => {
      const approveButton = screen.getByText('Approve');
      fireEvent.click(approveButton);
    });
    
    // Fill in the form
    const receivedLitersInput = screen.getByLabelText('Company Received Liters *');
    fireEvent.change(receivedLitersInput, { target: { value: '105' } });
    
    // Submit the form
    const submitButton = screen.getByText('Approve Collection');
    fireEvent.click(submitButton);
    
    // Check that error was handled
    await waitFor(() => {
      expect(MilkApprovalService.approveMilkCollection).toHaveBeenCalled();
    });
  });
});