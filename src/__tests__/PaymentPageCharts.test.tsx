import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import PaymentsPage from '@/pages/farmer-portal/PaymentsPage';
import { useFarmerPaymentsData } from '@/hooks/useFarmerPaymentsData';
import { useToastNotifications } from '@/hooks/useToastNotifications';

// Mock the hooks
vi.mock('@/hooks/useFarmerPaymentsData');
vi.mock('@/hooks/useToastNotifications');

// Mock the recharts components
vi.mock('recharts', async () => {
  const actual = await vi.importActual('recharts');
  return {
    ...actual,
    ComposedChart: ({ children, data }: any) => (
      <div data-testid="composed-chart" data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    LineChart: ({ children, data }: any) => (
      <div data-testid="line-chart" data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    BarChart: ({ children, data }: any) => (
      <div data-testid="bar-chart" data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    AreaChart: ({ children, data }: any) => (
      <div data-testid="area-chart" data-chart-data={JSON.stringify(data)}>
        {children}
      </div>
    ),
    Line: () => <div data-testid="line" />,
    Bar: () => <div data-testid="bar" />,
    Area: () => <div data-testid="area" />,
    XAxis: () => <div data-testid="x-axis" />,
    YAxis: () => <div data-testid="y-axis" />,
    CartesianGrid: () => <div data-testid="cartesian-grid" />,
    Tooltip: () => <div data-testid="tooltip" />,
    Legend: () => <div data-testid="legend" />,
    ResponsiveContainer: ({ children }: any) => <div>{children}</div>,
  };
});

// Mock other components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardContent: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardHeader: ({ children, ...props }: any) => <div {...props}>{children}</div>,
  CardTitle: ({ children, ...props }: any) => <h3 {...props}>{children}</h3>,
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: (props: any) => <input {...props} />,
}));

vi.mock('@/components/StatCard', () => ({
  StatCard: ({ title, value }: any) => (
    <div data-testid="stat-card">
      <div>{title}</div>
      <div>{value}</div>
    </div>
  ),
}));

vi.mock('@/components/FilterBar', () => ({
  FilterBar: ({ children }: any) => <div>{children}</div>,
}));

vi.mock('@/components/DataTable', () => ({
  DataTable: () => <div data-testid="data-table" />,
}));

vi.mock('@/components/PageHeader', () => ({
  PageHeader: ({ title, description }: any) => (
    <div>
      <h1>{title}</h1>
      <p>{description}</p>
    </div>
  ),
}));

vi.mock('@/components/ui/RefreshButton', () => ({
  default: ({ children, ...props }: any) => <button {...props}>{children}</button>,
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
  },
}));

vi.mock('@/utils/exportUtils', () => ({
  exportToCSV: vi.fn(),
  exportToJSON: vi.fn(),
}));

describe('PaymentPageCharts', () => {
  const mockCollections = [
    {
      id: '1',
      collection_id: 'COL001',
      liters: 100,
      rate_per_liter: 50,
      total_amount: 5000,
      collection_date: '2023-01-01',
      status: 'Paid',
    },
    {
      id: '2',
      collection_id: 'COL002',
      liters: 150,
      rate_per_liter: 52,
      total_amount: 7800,
      collection_date: '2023-01-02',
      status: 'Paid',
    },
    {
      id: '3',
      collection_id: 'COL003',
      liters: 120,
      rate_per_liter: 51,
      total_amount: 6120,
      collection_date: '2023-01-03',
      status: 'Pending',
    },
  ];

  const mockPaymentsData = {
    collections: mockCollections,
    farmer: { id: 'farmer-1' },
    creditInfo: null,
    totalCollections: 18920,
    paidCollections: 12800,
    pendingCollections: 6120,
    availableCredit: 0,
    creditLimit: 0,
  };

  beforeEach(() => {
    (useFarmerPaymentsData as jest.Mock).mockReturnValue({
      data: mockPaymentsData,
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });

    (useToastNotifications as jest.Mock).mockReturnValue({
      show: vi.fn(),
      error: vi.fn(),
      success: vi.fn(),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('renders payment page with all chart components', () => {
    render(<PaymentsPage />);
    
    // Check if main chart components are rendered
    expect(screen.getByText('Payment Analytics Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Rate Trend Analysis')).toBeInTheDocument();
    expect(screen.getByText('Cumulative Volume Trend')).toBeInTheDocument();
    expect(screen.getByText('Year-over-Year Comparison')).toBeInTheDocument();
    
    // Check if charts are rendered
    expect(screen.getByTestId('composed-chart')).toBeInTheDocument();
    expect(screen.getByTestId('line-chart')).toBeInTheDocument();
    expect(screen.getByTestId('area-chart')).toBeInTheDocument();
    
    // Check if chart elements are present
    expect(screen.getByTestId('x-axis')).toBeInTheDocument();
    expect(screen.getByTestId('y-axis')).toBeInTheDocument();
    expect(screen.getByTestId('line')).toBeInTheDocument();
    expect(screen.getByTestId('area')).toBeInTheDocument();
  });

  it('displays correct chart data', () => {
    render(<PaymentsPage />);
    
    // Check if the chart data includes the expected collections
    const composedChart = screen.getByTestId('composed-chart');
    const chartData = JSON.parse(composedChart.getAttribute('data-chart-data') || '[]');
    
    expect(chartData).toHaveLength(3);
    expect(chartData[0]).toHaveProperty('amount', 5000);
    expect(chartData[0]).toHaveProperty('liters', 100);
    expect(chartData[0]).toHaveProperty('rate', 50);
  });

  it('renders stat cards with correct values', () => {
    render(<PaymentsPage />);
    
    // Check if stat cards are rendered with correct values
    expect(screen.getByText('Total Collections')).toBeInTheDocument();
    expect(screen.getByText('KSh 18920.00')).toBeInTheDocument();
    
    expect(screen.getByText('Paid')).toBeInTheDocument();
    expect(screen.getByText('KSh 12800.00')).toBeInTheDocument();
    
    expect(screen.getByText('Pending')).toBeInTheDocument();
    expect(screen.getByText('KSh 6120.00')).toBeInTheDocument();
  });

  it('renders date range filters', () => {
    render(<PaymentsPage />);
    
    // Check if date range filters are present
    const dateInputs = screen.getAllByLabelText(/date/i);
    expect(dateInputs).toHaveLength(2);
  });

  it('renders chart customization options', () => {
    render(<PaymentsPage />);
    
    // Check if color pickers are present
    const colorPickers = screen.getAllByLabelText(/color/i);
    expect(colorPickers.length).toBeGreaterThan(0);
  });

  it('renders export buttons', () => {
    render(<PaymentsPage />);
    
    // Check if export buttons are present
    const exportButtons = screen.getAllByLabelText(/export/i);
    expect(exportButtons.length).toBeGreaterThan(0);
  });
});