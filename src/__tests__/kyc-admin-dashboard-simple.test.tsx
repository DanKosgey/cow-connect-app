import { describe, it, expect, vi } from 'vitest';
import { render } from '@testing-library/react';
import KYCAdminDashboard from '../pages/admin/KYCAdminDashboard';

// Mock the DashboardLayout component
vi.mock('../components/DashboardLayout', () => ({
  DashboardLayout: ({ children }: { children: React.ReactNode }) => <div>{children}</div>
}));

// Mock the useToastNotifications hook
vi.mock('../hooks/useToastNotifications', () => ({
  default: () => ({
    success: vi.fn(),
    error: vi.fn()
  })
}));

// Mock the react-router-dom useNavigate hook
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn()
}));

// Mock the Supabase client
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockResolvedValue({ data: null, error: null }),
    storage: {
      from: vi.fn().mockReturnValue({
        getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://example.com/document.pdf' } })
      })
    },
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'test-admin-id' } }, error: null })
    }
  }
}));

describe('KYCAdminDashboard', () => {
  it('should render without crashing', () => {
    render(<KYCAdminDashboard />);
    // If no error is thrown, the component rendered successfully
    expect(true).toBe(true);
  });
});