import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import StaffPortalLanding from '@/pages/staff-portal/StaffPortalLanding';
import { useAuth } from '@/contexts/SimplifiedAuthContext';
import { BrowserRouter } from 'react-router-dom';

// Mock the useAuth hook
vi.mock('@/contexts/SimplifiedAuthContext', () => ({
  useAuth: vi.fn(),
}));

describe('StaffPortalLanding', () => {
  const mockUser = { id: 'user-123', email: 'staff@example.com' };
  
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as jest.Mock).mockReturnValue({ user: mockUser });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders welcome message with user email', () => {
    render(<BrowserRouter><StaffPortalLanding /></BrowserRouter>);
    
    expect(screen.getByText(/Welcome, staff@example.com!/)).toBeInTheDocument();
  });

  it('displays loading state initially', () => {
    render(<BrowserRouter><StaffPortalLanding /></BrowserRouter>);
    
    // Check for loading indicators
    expect(screen.getByText(/Today's Collections/)).toBeInTheDocument();
    expect(screen.getByText(/Farmers Visited/)).toBeInTheDocument();
    expect(screen.getByText(/Total Earnings/)).toBeInTheDocument();
  });
});