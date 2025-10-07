import { render, screen } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Breadcrumb } from '../components/Breadcrumb';
import { describe, it, expect } from 'vitest';

describe('Breadcrumb', () => {
  it('renders breadcrumbs for admin dashboard', () => {
    render(
      <BrowserRouter>
        <Breadcrumb />
      </BrowserRouter>
    );

    // Check for home breadcrumb
    expect(screen.getByText('Home')).toBeInTheDocument();
  });

  it('renders custom breadcrumbs when provided', () => {
    const customBreadcrumbs = [
      { label: 'Home', path: '/', isCurrent: false },
      { label: 'Admin', path: '/admin', isCurrent: false },
      { label: 'Dashboard', path: '/admin/dashboard', isCurrent: true }
    ];

    render(
      <BrowserRouter>
        <Breadcrumb items={customBreadcrumbs} />
      </BrowserRouter>
    );

    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Admin')).toBeInTheDocument();
    expect(screen.getByText('Dashboard')).toBeInTheDocument();
  });

  it('does not render when only home breadcrumb exists', () => {
    render(
      <BrowserRouter>
        <Breadcrumb items={[{ label: 'Home', path: '/', isCurrent: true }]} />
      </BrowserRouter>
    );

    // Should not render anything visible
    expect(screen.queryByText('Home')).not.toBeInTheDocument();
  });
});