import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { PageTransition } from '../components/PageTransition';
import { vi, describe, it, expect } from 'vitest';

// Mock framer-motion to avoid testing animation details
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }: any) => <>{children}</>
}));

describe('PageTransition', () => {
  it('renders children correctly', () => {
    render(
      <BrowserRouter>
        <PageTransition>
          <div>Test Content</div>
        </PageTransition>
      </BrowserRouter>
    );

    expect(screen.getByText('Test Content')).toBeInTheDocument();
  });
});