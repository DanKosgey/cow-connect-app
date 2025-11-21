import { vi, beforeEach, describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import BatchApprovalForm from '../components/staff/BatchApprovalForm';
import { MilkApprovalService } from '../services/milk-approval-service';
import { supabase } from '../integrations/supabase/client';

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
        batchApproveCollections: vi.fn()
    }
}));

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => {
    const mockSupabase = {
        from: vi.fn(),
        select: vi.fn(),
        eq: vi.fn(),
        order: vi.fn(),
    };

    mockSupabase.from.mockReturnValue(mockSupabase);
    mockSupabase.select.mockReturnValue(mockSupabase);
    mockSupabase.eq.mockReturnValue(mockSupabase);
    mockSupabase.order.mockReturnValue(mockSupabase);

    return {
        supabase: mockSupabase
    };
});

describe('BatchApprovalForm', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('should render the form correctly', () => {
        render(<BatchApprovalForm />);
        expect(screen.getByText('Batch Milk Collection Approval')).toBeInTheDocument();
        expect(screen.getByText('Collector *')).toBeInTheDocument();
        expect(screen.getByText('Collection Date *')).toBeInTheDocument();
        expect(screen.getByText('Total Weighed Liters *')).toBeInTheDocument();
    });

    it('should fetch and display collectors', async () => {
        const mockCollectors = [
            { id: 'collector-1', profiles: { full_name: 'Collector One' } },
            { id: 'collector-2', profiles: { full_name: 'Collector Two' } }
        ];

        (supabase.from as jest.Mock).mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                        data: mockCollectors,
                        error: null
                    })
                })
            })
        });

        render(<BatchApprovalForm />);

        // Wait for collectors to be fetched (useEffect)
        await waitFor(() => {
            expect(supabase.from).toHaveBeenCalledWith('staff');
        });

        // Open the select dropdown
        const selectTrigger = screen.getByRole('combobox');
        fireEvent.click(selectTrigger);

        // Check if collectors are in the document
        await waitFor(() => {
            expect(screen.getByText('Collector One')).toBeInTheDocument();
            expect(screen.getByText('Collector Two')).toBeInTheDocument();
        });
    });

    it('should show error if fields are missing on review', async () => {
        render(<BatchApprovalForm />);

        const reviewButton = screen.getByText('Review Batch Approval');
        fireEvent.click(reviewButton);

        // Since we mocked toast, we can't check for toast appearance easily unless we spy on it,
        // but the button should be disabled or the function returns early.
        // Actually, the button is disabled if fields are missing in the component logic?
        // Let's check the component code: 
        // <Button type="submit" disabled={isSubmitting || !selectedCollector || !defaultReceivedLiters}>

        expect(reviewButton).toBeDisabled();
    });

    it('should calculate and display preview on review', async () => {
        // Mock collectors
        const mockCollectors = [
            { id: 'collector-1', profiles: { full_name: 'Collector One' } }
        ];
        (supabase.from as jest.Mock).mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                        data: mockCollectors,
                        error: null
                    })
                })
            })
        });

        // Mock pending collections
        const mockCollectionsData = [
            {
                id: 'col-1',
                liters: 100,
                collection_date: new Date().toISOString(), // Today
                staff_id: 'collector-1'
            },
            {
                id: 'col-2',
                liters: 150,
                collection_date: new Date().toISOString(), // Today
                staff_id: 'collector-1'
            }
        ];
        (MilkApprovalService.getPendingCollections as jest.Mock).mockResolvedValue({
            success: true,
            data: mockCollectionsData
        });

        render(<BatchApprovalForm />);

        // Select collector
        await waitFor(() => expect(supabase.from).toHaveBeenCalled());
        const selectTrigger = screen.getByRole('combobox');
        fireEvent.click(selectTrigger);
        const collectorOption = await screen.findByText('Collector One');
        fireEvent.click(collectorOption);

        // Enter received liters
        const litersInput = screen.getByLabelText('Total Weighed Liters *');
        fireEvent.change(litersInput, { target: { value: '240' } }); // 250 collected, 240 received (-10 variance)

        // Click review
        const reviewButton = screen.getByText('Review Batch Approval');
        expect(reviewButton).not.toBeDisabled();
        fireEvent.click(reviewButton);

        // Check preview
        await waitFor(() => {
            expect(screen.getByText('Approval Preview')).toBeInTheDocument();
            expect(screen.getByText('250.00 L')).toBeInTheDocument(); // Total Collected
            expect(screen.getByText('240.00 L')).toBeInTheDocument(); // Total Received
            expect(screen.getByText('-10.00 L')).toBeInTheDocument(); // Variance
        });
    });

    it('should submit batch approval on confirm', async () => {
        // Mock collectors
        const mockCollectors = [
            { id: 'collector-1', profiles: { full_name: 'Collector One' } }
        ];
        (supabase.from as jest.Mock).mockReturnValue({
            select: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                    order: vi.fn().mockResolvedValue({
                        data: mockCollectors,
                        error: null
                    })
                })
            })
        });

        // Mock pending collections
        const mockCollectionsData = [
            {
                id: 'col-1',
                liters: 100,
                collection_date: new Date().toISOString(),
                staff_id: 'collector-1'
            }
        ];
        (MilkApprovalService.getPendingCollections as jest.Mock).mockResolvedValue({
            success: true,
            data: mockCollectionsData
        });

        // Mock batch approval success
        (MilkApprovalService.batchApproveCollections as jest.Mock).mockResolvedValue({
            success: true,
            data: {
                approved_count: 1,
                total_liters_collected: 100,
                total_liters_received: 100,
                total_variance: 0,
                total_penalty_amount: 0
            }
        });

        render(<BatchApprovalForm />);

        // Setup form state (Collector, Liters)
        await waitFor(() => expect(supabase.from).toHaveBeenCalled());
        const selectTrigger = screen.getByRole('combobox');
        fireEvent.click(selectTrigger);
        const collectorOption = await screen.findByText('Collector One');
        fireEvent.click(collectorOption);

        const litersInput = screen.getByLabelText('Total Weighed Liters *');
        fireEvent.change(litersInput, { target: { value: '100' } });

        // Review
        const reviewButton = screen.getByText('Review Batch Approval');
        fireEvent.click(reviewButton);

        // Confirm
        await waitFor(() => {
            const confirmButton = screen.getByText('Confirm & Approve');
            fireEvent.click(confirmButton);
        });

        // Verify service call
        await waitFor(() => {
            expect(MilkApprovalService.batchApproveCollections).toHaveBeenCalled();
            expect(screen.getByText('Approval Successful')).toBeInTheDocument();
        });
    });
});
