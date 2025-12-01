import { render, screen, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { CollectorPaymentInfo } from '../components/collector/CollectorPaymentInfo';

// Mock the Supabase client
vi.mock('../integrations/supabase/client', () => {
  return {
    supabase: {
      from: vi.fn(),
    },
  };
});

// Mock the formatCurrency utility
vi.mock('../utils/formatters', () => {
  return {
    formatCurrency: vi.fn().mockImplementation((value) => `KSh ${value.toFixed(2)}`),
  };
});

describe('CollectorPaymentInfo', () => {
  const mockStaffId = 'staff-123';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render without crashing', () => {
    render(<CollectorPaymentInfo staffId={mockStaffId} />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});