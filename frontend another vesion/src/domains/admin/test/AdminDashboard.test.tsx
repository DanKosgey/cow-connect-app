import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import AdminDashboard from './AdminDashboard';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';

// Mock the useAdminDashboard hook
jest.mock('@/hooks/useAdminDashboard');

// Mock the recharts components
jest.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  Bar: () => <div data-testid="bar" />,
  Pie: ({ children }: any) => <div data-testid="pie">{children}</div>,
  Cell: () => <div data-testid="cell" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
}));

// Mock the UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick }: any) => <button onClick={onClick} data-testid="button">{children}</button>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => <div data-testid="alert" data-variant={variant}>{children}</div>,
  AlertTitle: ({ children }: any) => <h4 data-testid="alert-title">{children}</h4>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
  TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
  TableHead: ({ children }: any) => <th data-testid="table-head">{children}</th>,
  TableCell: ({ children }: any) => <td data-testid="table-cell">{children}</td>,
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Download: () => <div data-testid="download-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  TrendingUp: () => <div data-testid="trending-up-icon" />,
  Users: () => <div data-testid="users-icon" />,
  Droplets: () => <div data-testid="droplets-icon" />,
  DollarSign: () => <div data-testid="dollar-sign-icon" />,
}));

const mockDashboardData = {
  overview: {
    total_farmers: 1250,
    active_collections: 342,
    monthly_revenue: 2500000,
    quality_average: 4.2,
  },
  trends: {
    farmer_growth: [
      { date: '2023-01-01', count: 1000, growth_rate: 0.05 },
      { date: '2023-01-02', count: 1050, growth_rate: 0.05 },
    ],
    collection_volume: [
      { date: '2023-01-01', volume: 5000, change: 0.1 },
      { date: '2023-01-02', volume: 5500, change: 0.1 },
    ],
    quality_trends: [
      { date: '2023-01-01', avg_quality: 4.0, grade_distribution: { A: 50, B: 30, C: 20 } },
      { date: '2023-01-02', avg_quality: 4.2, grade_distribution: { A: 55, B: 30, C: 15 } },
    ],
    revenue_trends: [
      { date: '2023-01-01', revenue: 2000000, profit_margin: 0.25 },
      { date: '2023-01-02', revenue: 2200000, profit_margin: 0.26 },
    ],
  },
  regional_breakdown: [
    { region: 'North', farmers: 300, collections: 100, revenue: 500000, avg_quality: 4.1 },
    { region: 'South', farmers: 250, collections: 80, revenue: 400000, avg_quality: 4.3 },
  ],
  system_alerts: [
    {
      id: '1',
      level: 'warning',
      message: 'High collection volume detected in North region',
      affected_components: ['Collections', 'Routing'],
      action_required: true,
      timestamp: '2023-01-01T10:00:00Z',
    },
  ],
};

const mockAlerts = [
  {
    id: '1',
    level: 'warning',
    message: 'High collection volume detected in North region',
    affected_components: ['Collections', 'Routing'],
    action_required: true,
    timestamp: '2023-01-01T10:00:00Z',
  },
];

const mockUseAdminDashboard = {
  data: mockDashboardData,
  isLoading: false,
  error: null,
  alerts: mockAlerts,
  isConnected: true,
  refetch: jest.fn(),
  acknowledgeAlert: jest.fn(),
  clearAcknowledgedAlerts: jest.fn(),
  changeDateRange: jest.fn(),
  changeRegion: jest.fn(),
  exportData: jest.fn(),
};

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithProviders = (component: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {component}
      </AuthProvider>
    </QueryClientProvider>
  );
};

describe('AdminDashboard', () => {
  beforeEach(() => {
    (useAdminDashboard as jest.Mock).mockReturnValue(mockUseAdminDashboard);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
  });

  it('displays KPI cards with correct data', () => {
    renderWithProviders(<AdminDashboard />);
    
    expect(screen.getByText('1,250')).toBeInTheDocument(); // Total Farmers
    expect(screen.getByText('342')).toBeInTheDocument(); // Active Collections
    expect(screen.getByText('KSh 2,500,000')).toBeInTheDocument(); // Monthly Revenue
    expect(screen.getByText('4.2/5.0')).toBeInTheDocument(); // Avg Quality
  });

  it('displays trend charts', () => {
    renderWithProviders(<AdminDashboard />);
    
    expect(screen.getByText('Farmer Growth')).toBeInTheDocument();
    expect(screen.getByText('Collection Volume')).toBeInTheDocument();
    expect(screen.getByText('Quality Trends')).toBeInTheDocument();
    expect(screen.getByText('Revenue Trends')).toBeInTheDocument();
  });

  it('displays regional breakdown data', () => {
    renderWithProviders(<AdminDashboard />);
    
    expect(screen.getByText('Regional Breakdown')).toBeInTheDocument();
    expect(screen.getByText('North')).toBeInTheDocument();
    expect(screen.getByText('South')).toBeInTheDocument();
  });

  it('displays system alerts', () => {
    renderWithProviders(<AdminDashboard />);
    
    expect(screen.getByText('System Alerts')).toBeInTheDocument();
    expect(screen.getByText('High collection volume detected in North region')).toBeInTheDocument();
  });

  it('shows loading state when data is loading', () => {
    (useAdminDashboard as jest.Mock).mockReturnValue({
      ...mockUseAdminDashboard,
      isLoading: true,
    });
    
    renderWithProviders(<AdminDashboard />);
    // Check for the loading spinner by looking for the spinner animation
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state when there is an error', () => {
    (useAdminDashboard as jest.Mock).mockReturnValue({
      ...mockUseAdminDashboard,
      error: new Error('Failed to load dashboard data'),
    });
    
    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText('Error Loading Dashboard')).toBeInTheDocument();
  });

  it('shows connection status', () => {
    renderWithProviders(<AdminDashboard />);
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('calls exportData when export button is clicked', () => {
    renderWithProviders(<AdminDashboard />);
    
    const exportButton = screen.getByText('Export');
    exportButton.click();
    
    expect(mockUseAdminDashboard.exportData).toHaveBeenCalled();
  });
});