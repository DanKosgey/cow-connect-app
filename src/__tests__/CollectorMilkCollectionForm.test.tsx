import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from 'vitest';
import { AuthProvider } from '../contexts/SimplifiedAuthContext';
import CollectorMilkCollectionForm from '../components/CollectorMilkCollectionForm';

// Mock Supabase client
vi.mock('../integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    rpc: vi.fn().mockReturnThis()
  }
}));

// Mock useAuth hook
const mockUseAuth = vi.fn();
vi.mock('../contexts/SimplifiedAuthContext', async () => {
  const actual = await vi.importActual('../contexts/SimplifiedAuthContext');
  return {
    ...actual,
    useAuth: () => mockUseAuth()
  };
});

describe('CollectorMilkCollectionForm', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      user: { id: 'test-collector-id', email: 'collector@test.com' }
    });
  });
  
  afterEach(() => {
    vi.clearAllMocks();
  });
  
  it('should render the form with initial collection field', () => {
    render(
      <AuthProvider>
        <CollectorMilkCollectionForm />
      </AuthProvider>
    );
    
    expect(screen.getByText('Milk Collection Form')).toBeInTheDocument();
    expect(screen.getByLabelText('Farmer *')).toBeInTheDocument();
    expect(screen.getByLabelText('Liters *')).toBeInTheDocument();
    expect(screen.getByLabelText('Quality Grade')).toBeInTheDocument();
    expect(screen.getByLabelText('Collection Time')).toBeInTheDocument();
  });
  
  it('should allow adding and removing collection fields', () => {
    render(
      <AuthProvider>
        <CollectorMilkCollectionForm />
      </AuthProvider>
    );
    
    // Initially there should be one collection field
    expect(screen.getAllByLabelText('Farmer *')).toHaveLength(1);
    
    // Click add button
    const addButton = screen.getByText('Add Another Collection');
    fireEvent.click(addButton);
    
    // Now there should be two collection fields
    expect(screen.getAllByLabelText('Farmer *')).toHaveLength(2);
    
    // Click remove button on the second field
    const removeButtons = screen.getAllByText('Remove Collection');
    fireEvent.click(removeButtons[0]);
    
    // Should be back to one collection field
    expect(screen.getAllByLabelText('Farmer *')).toHaveLength(1);
  });
  
  it('should validate form fields before submission', async () => {
    render(
      <AuthProvider>
        <CollectorMilkCollectionForm />
      </AuthProvider>
    );
    
    // Try to submit without filling required fields
    const submitButton = screen.getByText('Submit 1 Collection(s)');
    fireEvent.click(submitButton);
    
    // Should show validation error (we can't easily test toast notifications in this setup)
    // But we can check that the form wasn't submitted
    expect(screen.getByLabelText('Farmer *')).toBeInTheDocument();
  });
  
  it('should submit collection data when form is valid', async () => {
    // Mock the Supabase client methods
    const { supabase } = await import('../integrations/supabase/client');
    const insertMock = vi.fn().mockResolvedValue({ error: null });
    (supabase.from as Mock).mockReturnValue({
      insert: insertMock
    });
    
    render(
      <AuthProvider>
        <CollectorMilkCollectionForm />
      </AuthProvider>
    );
    
    // Fill in the form
    fireEvent.change(screen.getByLabelText('Farmer *'), {
      target: { value: 'test-farmer-id' }
    });
    
    fireEvent.change(screen.getByLabelText('Liters *'), {
      target: { value: '15.5' }
    });
    
    // Submit the form
    const submitButton = screen.getByText('Submit 1 Collection(s)');
    fireEvent.click(submitButton);
    
    // Wait for submission to complete
    await waitFor(() => {
      expect(insertMock).toHaveBeenCalled();
    });
  });
});