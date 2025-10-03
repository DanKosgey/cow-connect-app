# Farmer Dashboard Component

## Overview
The Farmer Dashboard component provides a comprehensive overview of a farmer's activities, including collections, earnings, payments, and quality metrics. It features real-time updates via WebSocket connections and interactive data visualizations.

## Features
- Real-time data updates via WebSocket
- Interactive charts for quality trends and collection volumes
- Summary cards for key metrics
- Recent collections display
- Upcoming payments tracking
- Responsive design for all device sizes
- Loading states and error handling

## Component Structure
```
FarmerDashboard
├── Stats Cards
│   ├── Total Collections
│   ├── Monthly Earnings
│   ├── Average Quality
│   └── Upcoming Payments
├── Charts
│   ├── Quality Trends (Line Chart)
│   └── Collection Volume (Bar Chart)
├── Recent Collections
└── Upcoming Payments
```

## Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| farmerId | string | Yes | The unique identifier for the farmer |

## Hooks Used
- `useFarmerDashboard`: Manages dashboard data fetching and state
- `useWebSocket`: Handles real-time WebSocket connections

## Services Used
- `farmerDashboardService`: Provides API integration for dashboard data

## Data Interfaces
```typescript
interface DashboardData {
  totalCollections: number;
  monthlyEarnings: number;
  averageQuality: number;
  upcomingPayments: PaymentSummary[];
  recentCollections: Collection[];
  qualityTrends: ChartData[];
}

interface PaymentSummary {
  id: string;
  amount: number;
  status: 'pending' | 'processed' | 'failed';
  dueDate: string;
}

interface Collection {
  id: string;
  volume: number;
  quality: string;
  timestamp: string;
  pricePerLiter: number;
}

interface ChartData {
  date: string;
  quality: number;
  volume: number;
}
```

## API Endpoints
- `GET /api/v1/farmers/{farmer_id}/dashboard`: Fetch dashboard data
- WebSocket: `/ws/farmer/{farmer_id}`: Real-time updates

## WebSocket Events
- `collection_recorded`: New milk collection recorded
- `payment_processed`: Payment status updated
- `quality_alert`: Quality-related alerts

## Usage Example
```tsx
import FarmerDashboard from '@/components/farmer/FarmerDashboard';

const FarmerPortal = () => {
  const farmerId = "farmer_12345";
  
  return (
    <div>
      <FarmerDashboard farmerId={farmerId} />
    </div>
  );
};
```

## Testing
The component includes comprehensive tests covering:
- Rendering without crashing
- Loading states
- Error handling
- Data display

To run tests:
```bash
npm test farmer/FarmerDashboard.test.tsx
```

## Styling
The component uses Tailwind CSS for styling with the following key classes:
- `bg-gray-50`: Background color
- `p-6`: Padding
- Responsive grid layouts
- Card components from shadcn/ui
- Recharts for data visualization

## Performance Considerations
- Implements loading skeletons for better perceived performance
- Uses React.memo for child components where appropriate
- Efficient state management with hooks
- WebSocket connection management to prevent memory leaks