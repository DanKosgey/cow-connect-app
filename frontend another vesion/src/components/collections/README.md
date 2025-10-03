# Milk Collection Recording Component

## Overview
The CollectionForm component provides a comprehensive interface for recording milk collections with GPS location integration, quality parameter validation, and offline support.

## Features
- GPS location capture with accuracy indicators
- Form validation for all collection parameters
- Photo upload with camera integration
- Offline support with IndexedDB storage
- Real-time validation and feedback
- Responsive design for mobile and desktop
- Quality parameter validation against dairy industry standards

## Component Structure
```
CollectionForm
├── Location Status Card
├── Volume Input
├── Temperature Input
├── Quality Parameters (Fat, Protein, pH)
├── Photo Upload
├── Notes Textarea
└── Action Buttons
```

## Props
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| farmerId | string | Yes | The unique identifier for the farmer |
| farmerName | string | Yes | The name of the farmer |
| onSuccess | function | No | Callback function when collection is successfully recorded |

## Hooks Used
- `useGeolocation`: For GPS location capture
- `useCollectionSubmission`: For handling form submission and offline storage
- `useIndexedDB`: For offline data storage
- `useForm`: React Hook Form for form state management
- `useToast`: For user notifications

## Validation Schema
The form uses Zod for validation with the following rules:

```typescript
const collectionSchema = z.object({
  volume: z.number().min(0.1).max(1000),
  temperature: z.number().min(0).max(50),
  fat_content: z.number().min(0).max(10).optional(),
  protein_content: z.number().min(0).max(10).optional(),
  ph_level: z.number().min(6.0).max(7.5).optional(),
  latitude: z.number(),
  longitude: z.number(),
  accuracy: z.number(),
  notes: z.string().optional(),
});
```

## Data Interfaces
```typescript
interface CollectionLocation {
  latitude: number;
  longitude: number;
  accuracy: number;
}

interface CollectionData {
  volume: number;
  temperature: number;
  fat_content?: number;
  protein_content?: number;
  ph_level?: number;
  location: CollectionLocation;
  photos?: File[];
  notes?: string;
}

interface CollectionApiResponse {
  id: string;
  quality_grade: "A" | "B" | "C";
  calculated_price: number;
  quality_score: number;
  created_at: string;
  collection_point: string;
}
```

## API Integration
- `POST /api/v1/collections`: Submit collection data
- IndexedDB: Offline storage for failed submissions

## Offline Support
The component automatically handles offline scenarios:
1. When online, data is submitted directly to the API
2. When offline, data is stored in IndexedDB
3. Sync indicator shows when offline data uploads
4. Form auto-saves draft data to prevent loss

## Usage Example
```tsx
import CollectionForm from '@/components/collections/CollectionForm';

const CollectionPage = () => {
  const handleSuccess = (result) => {
    console.log('Collection recorded:', result);
  };
  
  return (
    <CollectionForm 
      farmerId="farmer_123" 
      farmerName="John Doe"
      onSuccess={handleSuccess}
    />
  );
};
```

## Styling
The component uses Tailwind CSS with the following key classes:
- `bg-dairy-50`: Background color
- Responsive grid layouts
- Card components from shadcn/ui
- Custom dairy-themed color palette

## Performance Considerations
- Implements loading states for better perceived performance
- Efficient form state management with React Hook Form
- Lazy loading of components
- Optimized re-renders with useCallback and useMemo

## Accessibility
- Proper ARIA labels and roles
- Keyboard navigation support
- Screen reader friendly form elements
- Color contrast compliant with WCAG standards

## Testing
The component includes comprehensive tests covering:
- Form validation
- Location services integration
- Offline storage functionality
- API submission handling
- Error states and user feedback

To run tests:
```bash
npm test collections/CollectionForm.test.tsx
```