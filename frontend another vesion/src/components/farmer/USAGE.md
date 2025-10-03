# Farmer Dashboard Usage Guide

## Overview
This guide explains how to use the Farmer Dashboard component in your application.

## Installation
The Farmer Dashboard component is already included in the project. No additional installation is required.

## Basic Usage
To use the Farmer Dashboard component, simply import it and pass the required `farmerId` prop:

```tsx
import FarmerDashboard from '@/components/farmer/FarmerDashboard';

const MyComponent = () => {
  const farmerId = "farmer_12345";
  
  return (
    <div>
      <FarmerDashboard farmerId={farmerId} />
    </div>
  );
};
```

## Integration with Backend
The Farmer Dashboard component integrates with the backend API through the following services:

1. `farmerDashboardService`: Handles data fetching from `/api/v1/farmers/{farmer_id}/dashboard`
2. `useWebSocket`: Manages real-time updates via WebSocket connections

### API Requirements
The backend must provide the following endpoints:

#### GET `/api/v1/farmers/{farmer_id}/dashboard`
Returns dashboard data in the following format:
```json
{
  "total_collections": 10,
  "monthly_earnings": 5000,
  "average_quality": 4.2,
  "upcoming_payments": [
    {
      "id": "1",
      "amount": 2000,
      "status": "pending",
      "due_date": "2023-12-01"
    }
  ],
  "recent_collections": [
    {
      "id": "1",
      "volume": 50,
      "quality": "A",
      "timestamp": "2023-11-01",
      "price_per_liter": 40
    }
  ],
  "quality_trends": [
    {
      "date": "2023-11-01",
      "quality": 4.0,
      "volume": 50
    }
  ]
}
```

### WebSocket Events
The component listens for the following WebSocket events:

1. `collection_recorded`: Notifies when a new milk collection is recorded
2. `payment_processed`: Notifies when a payment status is updated
3. `quality_alert`: Sends quality-related alerts

## Customization
The Farmer Dashboard component can be customized by modifying the following aspects:

### Styling
The component uses Tailwind CSS classes for styling. You can customize the appearance by:
1. Modifying the existing Tailwind classes
2. Adding new CSS classes
3. Using CSS modules or styled components

### Data Transformation
If your backend returns data in a different format, you can modify the `farmerDashboardService` to transform the data before it's passed to the component.

## Error Handling
The component includes built-in error handling for:
- Network errors
- API errors
- WebSocket connection issues
- Data parsing errors

Error messages are displayed to the user with options to retry failed operations.

## Performance Considerations
- The component implements loading skeletons for better perceived performance
- WebSocket connections are properly managed to prevent memory leaks
- Data fetching is optimized to minimize API calls

## Testing
To test the component:
1. Ensure the development server is running (`npm run dev`)
2. Navigate to `/farmer/dashboard/example` in your browser
3. Verify that the dashboard loads and displays data correctly

## Troubleshooting
### Common Issues
1. **WebSocket connection fails**: Check that the WebSocket endpoint is correctly configured
2. **Data not loading**: Verify that the API endpoint is accessible and returns data in the expected format
3. **Charts not rendering**: Ensure that the required data is provided in the correct format

### Debugging Tips
1. Check the browser console for error messages
2. Use browser developer tools to inspect network requests
3. Verify that all required environment variables are set

## Support
For additional support, please contact the development team or refer to the project documentation.