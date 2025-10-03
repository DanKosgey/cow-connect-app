import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataCard } from '../components/admin/DataCard';
import { PageHeader } from '../components/admin/PageHeader';
import { LoadingState } from '../components/admin/LoadingState';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}));

describe('DataCard', () => {
  it('renders correctly with basic props', () => {
    render(
      <DataCard
        title="Test Card"
        value="100"
        description="Test description"
      />
    );

    expect(screen.getByText('Test Card')).toBeDefined();
    expect(screen.getByText('100')).toBeDefined();
    expect(screen.getByText('Test description')).toBeDefined();
  });

  it('renders trend indicator correctly', () => {
    render(
      <DataCard
        title="Test Card"
        value="100"
        trend={{ value: 10, isPositive: true }}
      />
    );

    expect(screen.getByText('↑ 10%')).toBeDefined();
  });
});

describe('PageHeader', () => {
  it('renders title and subtitle', () => {
    render(
      <PageHeader
        title="Test Page"
        subtitle="Test subtitle"
      />
    );

    expect(screen.getByText('Test Page')).toBeDefined();
    expect(screen.getByText('Test subtitle')).toBeDefined();
  });

  it('renders back button when showBack is true', () => {
    render(
      <PageHeader
        title="Test Page"
        showBack
      />
    );

    expect(screen.getByRole('button')).toBeDefined();
  });
});

describe('LoadingState', () => {
  it('renders loading spinner when isLoading is true', () => {
    render(
      <LoadingState isLoading={true}>
        <div>Content</div>
      </LoadingState>
    );

    expect(screen.queryByText('Content')).toBeNull();
    expect(document.querySelector('.animate-spin')).toBeDefined();
  });

  it('renders error message when error is provided', () => {
    render(
      <LoadingState
        isLoading={false}
        error={new Error('Test error')}
      >
        <div>Content</div>
      </LoadingState>
    );

    expect(screen.queryByText('Content')).toBeNull();
    expect(screen.getByText('Test error')).toBeDefined();
  });

  it('renders children when not loading and no error', () => {
    render(
      <LoadingState isLoading={false}>
        <div>Content</div>
      </LoadingState>
    );

    expect(screen.getByText('Content')).toBeDefined();
  });
});