import React from 'react';
import { render, screen, act } from '@testing-library/react';
import { ErrorProvider } from '@/contexts/ErrorContext';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';
import ErrorNotificationsContainer from '@/components/ErrorNotificationsContainer';
import { useError } from '@/contexts/ErrorContext';
import ErrorService from '@/services/ErrorService';

// Mock component that uses the error context
const TestComponent: React.FC = () => {
  const { addError } = useError();
  
  const handleAddError = () => {
    addError('Test notification error', 'error');
  };
  
  const handleApiError = () => {
    const errorService = ErrorService.getInstance();
    const mockResponse = new Response('Unauthorized', {
      status: 401,
      statusText: 'Unauthorized'
    }) as any;
    
    errorService.processError(mockResponse);
  };
  
  return (
    <div>
      <button onClick={handleAddError} data-testid="add-error-btn">
        Add Error
      </button>
      <button onClick={handleApiError} data-testid="api-error-btn">
        Trigger API Error
      </button>
    </div>
  );
};

// Test app with all error handling components
const TestApp: React.FC = () => {
  return (
    <ErrorProvider>
      <GlobalErrorBoundary>
        <div>
          <ErrorNotificationsContainer />
          <TestComponent />
        </div>
      </GlobalErrorBoundary>
    </ErrorProvider>
  );
};

describe('Error Handling Integration', () => {
  beforeAll(() => {
    // Mock window.location for redirect tests
    delete (window as any).location;
    (window as any).location = { href: '' };
    
    // Mock localStorage
    Storage.prototype.getItem = jest.fn();
    Storage.prototype.setItem = jest.fn();
    Storage.prototype.removeItem = jest.fn();
  });

  it('should display error notifications when added', () => {
    render(<TestApp />);
    
    // Click the add error button
    const addButton = screen.getByTestId('add-error-btn');
    act(() => {
      addButton.click();
    });
    
    // Check that the error notification is displayed
    expect(screen.getByText('Test notification error')).toBeInTheDocument();
  });

  it('should handle API errors through ErrorService', () => {
    const consoleWarnSpy = jest.spyOn(console, 'warn').mockImplementation();
    const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
    
    render(<TestApp />);
    
    // Click the API error button
    const apiButton = screen.getByTestId('api-error-btn');
    act(() => {
      apiButton.click();
    });
    
    // Check that authentication error was handled
    expect(consoleWarnSpy).toHaveBeenCalledWith('Authentication error - redirecting to login');
    
    consoleWarnSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it('should catch component errors with GlobalErrorBoundary', () => {
    const BadComponent: React.FC = () => {
      throw new Error('Test component error');
    };
    
    const TestAppWithError: React.FC = () => {
      return (
        <ErrorProvider>
          <GlobalErrorBoundary>
            <div>
              <ErrorNotificationsContainer />
              <BadComponent />
            </div>
          </GlobalErrorBoundary>
        </ErrorProvider>
      );
    };
    
    render(<TestAppWithError />);
    
    // Check that the error boundary fallback is displayed
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});