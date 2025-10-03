import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/contexts/AuthContext';
import NotificationSystem from './NotificationSystem';
import { useNotificationSystem } from '@/hooks/useNotificationSystem';

// Mock the useNotificationSystem hook
jest.mock('@/hooks/useNotificationSystem');

// Mock UI components
jest.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div data-testid="popover">{children}</div>,
  PopoverContent: ({ children, align, sideOffset }: any) => (
    <div data-testid="popover-content" data-align={align} data-side-offset={sideOffset}>
      {children}
    </div>
  ),
  PopoverTrigger: ({ children }: any) => <div data-testid="popover-trigger">{children}</div>,
}));

jest.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, disabled, variant, size, className }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled} 
      data-testid="button"
      data-variant={variant}
      data-size={size}
      className={className}
    >
      {children}
    </button>
  ),
}));

jest.mock('@/components/ui/badge', () => ({
  Badge: ({ children, variant, className }: any) => (
    <span data-testid="badge" data-variant={variant} className={className}>
      {children}
    </span>
  ),
}));

jest.mock('@/components/ui/switch', () => ({
  Switch: ({ checked, onCheckedChange, id }: any) => (
    <input 
      type="checkbox" 
      checked={checked} 
      onChange={(e) => onCheckedChange(e.target.checked)} 
      id={id}
      data-testid="switch"
    />
  ),
}));

jest.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor} data-testid="label">{children}</label>,
}));

jest.mock('@/components/ui/slider', () => ({
  Slider: ({ min, max, step, value, onValueChange }: any) => (
    <input 
      type="range" 
      min={min} 
      max={max} 
      step={step} 
      value={value[0]} 
      onChange={(e) => onValueChange([parseFloat(e.target.value)])}
      data-testid="slider"
    />
  ),
}));

jest.mock('@/components/ui/separator', () => ({
  Separator: () => <hr data-testid="separator" />,
}));

jest.mock('@/components/ui/scroll-area', () => ({
  ScrollArea: ({ children, className }: any) => (
    <div className={className} data-testid="scroll-area">
      {children}
    </div>
  ),
}));

jest.mock('@/components/ui/card', () => ({
  Card: ({ children, className }: any) => <div className={className} data-testid="card">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardDescription: ({ children }: any) => <p data-testid="card-description">{children}</p>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <h3 data-testid="card-title">{children}</h3>,
}));

jest.mock('@/components/ui/dialog', () => ({
  Dialog: ({ children, open, onOpenChange }: any) => (
    <div data-testid="dialog" data-open={open}>
      {children}
    </div>
  ),
  DialogContent: ({ children, className }: any) => (
    <div className={className} data-testid="dialog-content">
      {children}
    </div>
  ),
  DialogDescription: ({ children }: any) => <p data-testid="dialog-description">{children}</p>,
  DialogHeader: ({ children }: any) => <div data-testid="dialog-header">{children}</div>,
  DialogTitle: ({ children }: any) => <h4 data-testid="dialog-title">{children}</h4>,
  DialogTrigger: ({ children }: any) => <div data-testid="dialog-trigger">{children}</div>,
}));

jest.mock('@/components/ui/tabs', () => ({
  Tabs: ({ children, defaultValue }: any) => (
    <div data-testid="tabs" data-default-value={defaultValue}>
      {children}
    </div>
  ),
  TabsContent: ({ children, value }: any) => (
    <div data-testid="tabs-content" data-value={value}>
      {children}
    </div>
  ),
  TabsList: ({ children }: any) => <div data-testid="tabs-list">{children}</div>,
  TabsTrigger: ({ children, value }: any) => (
    <div data-testid="tabs-trigger" data-value={value}>
      {children}
    </div>
  ),
}));

// Mock Lucide icons
jest.mock('lucide-react', () => ({
  Bell: () => <div data-testid="bell-icon" />,
  BellOff: () => <div data-testid="bell-off-icon" />,
  Check: () => <div data-testid="check-icon" />,
  X: () => <div data-testid="x-icon" />,
  Settings: () => <div data-testid="settings-icon" />,
  Trash2: () => <div data-testid="trash2-icon" />,
  Eye: () => <div data-testid="eye-icon" />,
  EyeOff: () => <div data-testid="eye-off-icon" />,
  Wifi: () => <div data-testid="wifi-icon" />,
  WifiOff: () => <div data-testid="wifi-off-icon" />,
  RotateCcw: () => <div data-testid="rotate-ccw-icon" />,
}));

// Mock date-fns
jest.mock('date-fns', () => ({
  formatDistanceToNow: () => '2 minutes ago',
  parseISO: () => new Date(),
}));

const mockNotifications = [
  {
    id: '1',
    type: 'info',
    title: 'New Collection',
    message: 'A new milk collection has been recorded',
    priority: 'medium',
    read: false,
    created_at: '2023-01-15T10:30:00Z',
    updated_at: '2023-01-15T10:30:00Z',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Quality Alert',
    message: 'Milk quality below standard detected',
    priority: 'high',
    read: false,
    created_at: '2023-01-15T09:15:00Z',
    updated_at: '2023-01-15T09:15:00Z',
  },
  {
    id: '3',
    type: 'success',
    title: 'Payment Processed',
    message: 'Monthly payment has been processed',
    priority: 'low',
    read: true,
    created_at: '2023-01-14T16:45:00Z',
    updated_at: '2023-01-14T16:45:00Z',
  }
];

const mockPreferences = {
  email_notifications: true,
  sms_notifications: true,
  push_notifications: false,
  sound_enabled: true,
  notification_sound: 'default',
  auto_dismiss_duration: 5,
  enable_toasts: true,
  enable_desktop_notifications: true,
};

const mockUseNotificationSystem = {
  notifications: mockNotifications,
  unreadCount: 2,
  connectionStatus: 'connected',
  preferences: mockPreferences,
  isLoading: false,
  error: null,
  isConnected: true,
  markAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  updatePreferences: jest.fn(),
  deleteNotification: jest.fn(),
  deleteAllRead: jest.fn(),
  refetch: jest.fn(),
  sendWebSocketMessage: jest.fn(),
  reconnectWebSocket: jest.fn(),
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

describe('NotificationSystem', () => {
  beforeEach(() => {
    (useNotificationSystem as jest.Mock).mockReturnValue(mockUseNotificationSystem);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders without crashing', () => {
    renderWithProviders(<NotificationSystem />);
    expect(screen.getByTestId('popover-trigger')).toBeInTheDocument();
  });

  it('displays unread count badge when there are unread notifications', () => {
    renderWithProviders(<NotificationSystem />);
    
    const badge = screen.getByText('2');
    expect(badge).toBeInTheDocument();
    expect(badge).toHaveClass('rounded-full');
  });

  it('shows connection status as connected', () => {
    renderWithProviders(<NotificationSystem />);
    
    // Open the popover first
    const trigger = screen.getByTestId('popover-trigger');
    fireEvent.click(trigger);
    
    // Check for connection status
    expect(screen.getByText('Connected')).toBeInTheDocument();
  });

  it('shows loading state when notifications are loading', () => {
    (useNotificationSystem as jest.Mock).mockReturnValue({
      ...mockUseNotificationSystem,
      isLoading: true,
    });
    
    renderWithProviders(<NotificationSystem />);
    
    // Open the popover first
    const trigger = screen.getByTestId('popover-trigger');
    fireEvent.click(trigger);
    
    expect(screen.getByText('Loading notifications...')).toBeInTheDocument();
  });

  it('shows error state when there is an error', () => {
    (useNotificationSystem as jest.Mock).mockReturnValue({
      ...mockUseNotificationSystem,
      error: new Error('Failed to load notifications'),
    });
    
    renderWithProviders(<NotificationSystem />);
    
    // Open the popover first
    const trigger = screen.getByTestId('popover-trigger');
    fireEvent.click(trigger);
    
    expect(screen.getByText('Failed to load notifications')).toBeInTheDocument();
  });

  it('displays notifications in the popover', () => {
    renderWithProviders(<NotificationSystem />);
    
    // Open the popover first
    const trigger = screen.getByTestId('popover-trigger');
    fireEvent.click(trigger);
    
    // Check for notifications
    expect(screen.getByText('New Collection')).toBeInTheDocument();
    expect(screen.getByText('A new milk collection has been recorded')).toBeInTheDocument();
    
    expect(screen.getByText('Quality Alert')).toBeInTheDocument();
    expect(screen.getByText('Milk quality below standard detected')).toBeInTheDocument();
  });

  it('shows empty state when there are no notifications', () => {
    (useNotificationSystem as jest.Mock).mockReturnValue({
      ...mockUseNotificationSystem,
      notifications: [],
      unreadCount: 0,
    });
    
    renderWithProviders(<NotificationSystem />);
    
    // Open the popover first
    const trigger = screen.getByTestId('popover-trigger');
    fireEvent.click(trigger);
    
    expect(screen.getByText('No notifications')).toBeInTheDocument();
  });

  it('opens preferences dialog when settings button is clicked', () => {
    renderWithProviders(<NotificationSystem />);
    
    // Open the popover first
    const trigger = screen.getByTestId('popover-trigger');
    fireEvent.click(trigger);
    
    // Click the settings button
    const settingsButton = screen.getByTestId('settings-icon').closest('button');
    if (settingsButton) {
      fireEvent.click(settingsButton);
    }
    
    // Check if preferences dialog is open
    expect(screen.getByText('Notification Preferences')).toBeInTheDocument();
  });

  it('calls markAsRead when check button is clicked', () => {
    renderWithProviders(<NotificationSystem />);
    
    // Open the popover first
    const trigger = screen.getByTestId('popover-trigger');
    fireEvent.click(trigger);
    
    // Click the mark as read button for the first notification
    const markAsReadButton = screen.getAllByTestId('check-icon')[0].closest('button');
    if (markAsReadButton) {
      fireEvent.click(markAsReadButton);
    }
    
    expect(mockUseNotificationSystem.markAsRead).toHaveBeenCalledWith('1');
  });

  it('calls deleteNotification when trash button is clicked', () => {
    renderWithProviders(<NotificationSystem />);
    
    // Open the popover first
    const trigger = screen.getByTestId('popover-trigger');
    fireEvent.click(trigger);
    
    // Click the delete button for the first notification
    const deleteButton = screen.getAllByTestId('trash2-icon')[0].closest('button');
    if (deleteButton) {
      fireEvent.click(deleteButton);
    }
    
    expect(mockUseNotificationSystem.deleteNotification).toHaveBeenCalledWith('1');
  });
});