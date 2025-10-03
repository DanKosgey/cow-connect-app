import React from 'react';
import { render, screen } from '@testing-library/react';
import ErrorBoundary from '@/components/ErrorBoundary';
import GlobalErrorBoundary from '@/components/GlobalErrorBoundary';

describe('ErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <ErrorBoundary>
        <div data-testid="child">Child component</div>
      </ErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should render fallback UI when error occurs', () => {
    const BadComponent = () => {
      throw new Error('Test error');
    };

    render(
      <ErrorBoundary>
        <BadComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});

describe('GlobalErrorBoundary', () => {
  it('should render children when no error', () => {
    render(
      <GlobalErrorBoundary>
        <div data-testid="child">Child component</div>
      </GlobalErrorBoundary>
    );
    
    expect(screen.getByTestId('child')).toBeInTheDocument();
  });

  it('should render fallback UI when error occurs', () => {
    const BadComponent = () => {
      throw new Error('Test error');
    };

    render(
      <GlobalErrorBoundary>
        <BadComponent />
      </GlobalErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });
});