import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import SystemConfig from './SystemConfig';
import { useSystemConfig } from '@/hooks/useSystemConfig';

// Mock the useSystemConfig hook
jest.mock('@/hooks/useSystemConfig');

// Mock UI components
jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled }: any) => (
    <button onClick={onClick} disabled={disabled} data-testid="button">
      {children}
    </button>
  ),
  buttonVariants: () => 'button-variant',
}));

jest.mock('@/components/ui/input', () => ({
  Input: ({ value, onChange, type, min, step }: any) => (
    <input 
      value={value} 
      onChange={onChange} 
      type={type} 
      min={min} 
      step={step} 
      data-testid="input"
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children }: any) => <label data-testid="label">{children}</label>,
}));

jest.mock('@/components/ui/select', () => ({
  Select: ({ children, value, onValueChange }: any) => <div data-testid="select">{children}</div>,
  SelectTrigger: ({ children }: any) => <div data-testid="select-trigger">{children}</div>,
  SelectValue: ({ placeholder }: any) => <div data-testid="select-value">{placeholder}</div>,
  SelectContent: ({ children }: any) => <div data-testid="select-content">{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-testid="select-item" data-value={value}>{children}</div>,
}));

jest.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table data-testid="table">{children}</table>,
  TableHeader: ({ children }: any) => <thead data-testid="table-header">{children}</thead>,
  TableBody: ({ children }: any) => <tbody data-testid="table-body">{children}</tbody>,
  TableRow: ({ children }: any) => <tr data-testid="table-row">{children}</tr>,
  TableHead: ({ children }: any) => <th data-testid="table-head">{children}</th>,
  TableCell: ({ children }: any) => <td data-testid="table-cell">{children}</td>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => <div data-testid="dialog" data-open={open}>{children}</div>,
  DialogContent: ({ children, className }: any) => <div className={className} data-testid="dialog-content">{children}</div>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h4 data-testid="dialog-title">{children}</h4>,
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
  DialogFooter: ({ children }: any) => <div data-testid="dialog-footer">{children}</div>,
  DialogTrigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>,
}));

jest.mock('@/components/ui/alert', () => ({
  Alert: ({ children, variant }: any) => <div data-testid="alert" data-variant={variant}>{children}</div>,
  AlertTitle: ({ children }: any) => <h4 data-testid="alert-title">{children}</h4>,
  AlertDescription: ({ children }: any) => <div data-testid="alert-description">{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => <div data-testid="tabs" data-default-value={defaultValue}>{children}</div>,
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsContent: ({ children, value }: any) => <div data-testid="tabs-content" data-value={value}>{children}</div>,
  TabsTrigger: ({ children, value }: any) => <div data-testid="tabs-trigger" data-value={value}>{children}</div>,
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant }: any) => <span data-testid="badge" data-variant={variant}>{children}</span>,
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange }: any) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onCheckedChange(e.target.checked)} 
      data-testid="switch"
    />
  ),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Calendar: () => <div data-testid="calendar-icon" />,
  Download: () => <div data-testid="download-icon" />,
  Upload: () => <div data-testid="upload-icon" />,
  Save: () => <div data-testid="save-icon" />,
  AlertTriangle: () => <div data-testid="alert-triangle-icon" />,
  CheckCircle: () => <div data-testid="check-circle-icon" />,
  XCircle: () => <div data-testid="x-circle-icon" />,
  Info: () => <div data-testid="info-icon" />,
  RotateCcw: () => <div data-testid="rotate-ccw-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
}));

const mockConfigData = {
  pricing: {
    base_price_per_liter: 25.50,
    quality_multipliers: [
      { grade: 'A', multiplier: 1.2 },
      { grade: 'B', multiplier: 1.0 },
      { grade: 'C', multiplier: 0.8 },
    ],
    seasonal_adjustments: [
      { season: 'peak', start_date: '2023-01-01', end_date: '2023-03-31', multiplier: 1.1 },
    ],
  },
  quality_standards: {
    temperature_ranges: [
      { grade: 'A', min_temp: 2, max_temp: 4, penalty: 0 },
      { grade: 'B', min_temp: 1, max_temp: 5, penalty: 5 },
    ],
    fat_content_standards: [
      { grade: 'A', min_value: 3.5, max_value: 5.0, penalty: 0 },
      { grade: 'B', min_value: 3.0, max_value: 5.5, penalty: 5 },
    ],
    protein_standards: [
      { grade: 'A', min_value: 3.0, max_value: 4.0, penalty: 0 },
      { grade: 'B', min_value: 2.5, max_value: 4.5, penalty: 5 },
    ],
    ph_standards: [
      { grade: 'A', min_ph: 6.4, max_ph: 6.8, penalty: 0 },
      { grade: 'B', min_ph: 6.2, max_ph: 7.0, penalty: 5 },
    ],
  },
  notification_settings: {
    email_notifications: true,
    sms_notifications: true,
    push_notifications: false,
    notification_thresholds: {
      'collection_volume': 1000,
      'quality_drop': 10,
    },
  },
  integration_settings: {
    sms_provider: 'twilio',
    payment_gateway: 'mpesa',
    analytics_provider: 'google',
    api_keys: {
      'twilio': 'TWILIO_API_KEY',
      'google': 'GOOGLE_ANALYTICS_KEY',
    },
  },
};

const mockUseSystemConfig = {
  data: mockConfigData,
  isLoading: false,
  error: null,
  updatePricing: jest.fn(),
  isUpdatingPricing: false,
  updateQualityStandards: jest.fn(),
  isUpdatingQuality: false,
  updateNotifications: jest.fn(),
  isUpdatingNotifications: false,
  updateIntegrations: jest.fn(),
  isUpdatingIntegrations: false,
  refetch: jest.fn(),
  resetToDefault: jest.fn(),
  exportConfig: jest.fn(),
  importConfig: jest.fn(),
  isPreviewOpen: false,
  previewData: null,
  setIsPreviewOpen: jest.fn(),
  closePreview: jest.fn(),
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

describe('SystemConfig', () => {
  beforeEach(() => {
    (useSystemConfig as jest.Mock).mockReturnValue(mockUseSystemConfig);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<SystemConfig />);
    expect(screen.getByText('System Configuration')).toBeInTheDocument();
  });

  it('displays pricing configuration', () => {
    renderWithProviders(<SystemConfig />);
    
    // Check for pricing tab
    expect(screen.getByText('Pricing')).toBeInTheDocument();
    
    // Check for base price input
    const basePriceInputs = screen.getAllByTestId('input');
    expect(basePriceInputs[0]).toHaveValue(25.5);
  });

  it('displays quality standards', () => {
    renderWithProviders(<SystemConfig />);
    
    // Check for quality tab
    expect(screen.getByText('Quality Standards')).toBeInTheDocument();
    
    // Check for temperature ranges table
    expect(screen.getByText('Temperature Ranges')).toBeInTheDocument();
    expect(screen.getByText('A')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('displays notification settings', () => {
    renderWithProviders(<SystemConfig />);
    
    // Check for notifications tab
    expect(screen.getByText('Notifications')).toBeInTheDocument();
    
    // Check for notification switches
    const switches = screen.getAllByTestId('switch');
    expect(switches[0]).toBeChecked(); // Email notifications
    expect(switches[1]).toBeChecked(); // SMS notifications
    expect(switches[2]).not.toBeChecked(); // Push notifications
  });

  it('displays integration settings', () => {
    renderWithProviders(<SystemConfig />);
    
    // Check for integrations tab
    expect(screen.getByText('Integrations')).toBeInTheDocument();
    
    // Check for select components
    expect(screen.getByText('SMS Provider')).toBeInTheDocument();
    expect(screen.getByText('Payment Gateway')).toBeInTheDocument();
    expect(screen.getByText('Analytics Provider')).toBeInTheDocument();
  });

  it('shows loading state when data is loading', () => {
    (useSystemConfig as jest.Mock).mockReturnValue({
      ...mockUseSystemConfig,
      isLoading: true,
    });
    
    renderWithProviders(<SystemConfig />);
    expect(screen.getByText(/loading/i)).toBeInTheDocument();
  });

  it('shows error state when there is an error', () => {
    (useSystemConfig as jest.Mock).mockReturnValue({
      ...mockUseSystemConfig,
      error: new Error('Failed to load configuration'),
    });
    
    renderWithProviders(<SystemConfig />);
    expect(screen.getByText('Error Loading Configuration')).toBeInTheDocument();
  });

  it('calls exportConfig when export button is clicked', () => {
    renderWithProviders(<SystemConfig />);
    
    const exportButton = screen.getByText('Export');
    exportButton.click();
    
    expect(mockUseSystemConfig.exportConfig).toHaveBeenCalled();
  });

  it('calls resetToDefault when reset button is clicked', () => {
    renderWithProviders(<SystemConfig />);
    
    const resetButton = screen.getByText('Reset');
    resetButton.click();
    
    expect(mockUseSystemConfig.resetToDefault).toHaveBeenCalled();
  });

  it('updates pricing configuration when save is clicked', async () => {
    renderWithProviders(<SystemConfig />);
    
    // Click on the pricing tab
    const pricingTab = screen.getByText('Pricing');
    pricingTab.click();
    
    // Change the base price
    const basePriceInput = screen.getAllByTestId('input')[0];
    fireEvent.change(basePriceInput, { target: { value: '30.00' } });
    
    // Click save button
    const saveButton = screen.getByText('Save Pricing Changes');
    saveButton.click();
    
    // Wait for the mutation to be called
    await waitFor(() => {
      expect(mockUseSystemConfig.updatePricing).toHaveBeenCalledWith({
        base_price_per_liter: 30,
        effective_date: expect.any(String)
      });
    });
  });
});