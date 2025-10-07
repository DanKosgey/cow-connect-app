import { render, screen } from '@testing-library/react';
import { EnhancedPageLoader } from '../components/EnhancedPageLoader';
import { describe, it, expect } from 'vitest';

describe('EnhancedPageLoader', () => {
  it('renders dashboard loader by default', () => {
    render(<EnhancedPageLoader />);
    
    // Check for dashboard-specific elements
    expect(screen.getByText('Welcome back! Here\'s what\'s happening today.')).toBeInTheDocument();
  });

  it('renders form loader when type is form', () => {
    render(<EnhancedPageLoader type="form" />);
    
    // Check for form-specific elements
    expect(screen.getByRole('button', { name: 'Try Again' })).toBeInTheDocument();
  });

  it('renders list loader when type is list', () => {
    render(<EnhancedPageLoader type="list" />);
    
    // Check for list-specific elements
    expect(screen.getByText('Farmers')).toBeInTheDocument();
  });
});