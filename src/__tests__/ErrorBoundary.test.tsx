import { render, screen, fireEvent } from '@testing-library/react';
import { ErrorBoundary } from '../components/ErrorBoundary';
import { vi, describe, it, expect } from 'vitest';

describe('ErrorBoundary', () => {
  // Component that throws an error
  const ProblematicComponent = () => {
    throw new Error('Test error');
  };

  it('renders children when there is no error', () => {
    render(
      <ErrorBoundary>
        <div>Normal content</div>
      </ErrorBoundary>
    );

    expect(screen.getByText('Normal content')).toBeInTheDocument();
  });

  it('renders error message when child component throws an error', () => {
    // Mock console.error to avoid noisy output
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
    expect(screen.getByText('We\'re sorry, but something went wrong. Please try again.')).toBeInTheDocument();

    // Restore console.error
    (console.error as any).mockRestore();
  });

  it('allows retry after error', () => {
    // Mock console.error to avoid noisy output
    vi.spyOn(console, 'error').mockImplementation(() => {});

    render(
      <ErrorBoundary>
        <ProblematicComponent />
      </ErrorBoundary>
    );

    // Click the retry button
    fireEvent.click(screen.getByText('Try Again'));

    expect(screen.getByText('Something went wrong')).toBeInTheDocument();

    // Restore console.error
    (console.error as any).mockRestore();
  });
});