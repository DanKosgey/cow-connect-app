# KYC Document Upload System

A comprehensive React-based system for handling KYC (Know Your Customer) document uploads with validation, previews, and progress tracking.

## Features

- Document type selection (National ID, Passport, Driver's License)
- File validation (size and format)
- Image previews with change functionality
- Upload progress tracking
- Error handling with user feedback
- Responsive design
- Accessible UI
- API integration with real backend services

## Components

### KYCUpload
The main component for handling KYC document uploads.

**Props:**
- `farmerId` (string, optional): The ID of the farmer for whom documents are being uploaded

**Usage:**
```tsx
import { KYCUpload } from '@/components/kyc';

function MyComponent() {
  return (
    <div className="p-4">
      <KYCUpload farmerId="farmer-123" />
    </div>
  );
}
```

## Hooks

### useKYC
A custom hook for managing KYC state and operations.

**Returns:**
- `isUploading` (boolean): Indicates if an upload is in progress
- `uploadProgress` (number): Upload progress percentage (0-100)
- `kycStatus` (KYCResponse | null): Current KYC status
- `error` (string | null): Error message if any
- `uploadDocuments`: Function to upload KYC documents
- `getKYCStatus`: Function to fetch KYC status
- `updateDocuments`: Function to update KYC documents
- `reset`: Function to reset the hook state

### useFileValidation
A hook for validating uploaded files.

**Usage:**
```tsx
import useFileValidation from '@/hooks/useFileValidation';

const { validateFile, maxSize, acceptedTypes } = useFileValidation({
  maxSize: 5 * 1024 * 1024, // 5MB
  acceptedTypes: ['image/jpeg', 'image/png', 'image/webp']
});
```

### useImageCompression
A hook for compressing images before upload.

**Usage:**
```tsx
import useImageCompression from '@/hooks/useImageCompression';

const { compressImage } = useImageCompression();
const compressedResult = await compressImage(file, {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920
});
```

## Services

### kycService
A service for handling KYC API operations.

**Methods:**
- `uploadDocuments(farmerId, data)`: Upload KYC documents
- `getKYCStatus(farmerId)`: Get KYC status
- `updateDocuments(farmerId, data)`: Update KYC documents

## API Integration

The system is designed to work with the following API endpoint:

```
POST /api/v1/farmers/{farmer_id}/kyc
Content-Type: multipart/form-data

Request Body:
- document_type: string
- document_number: string
- expiry_date: string (ISO date)
- front_image: File
- back_image: File (optional for passport)
- selfie_image: File
```

Response:
```json
{
  "id": "string",
  "status": "pending" | "approved" | "rejected",
  "submitted_at": "string",
  "documents": [
    {
      "id": "string",
      "type": "string",
      "url": "string",
      "uploaded_at": "string"
    }
  ]
}
```

## File Validation

The system validates files based on:

- Maximum file size: 5MB
- Accepted formats: JPEG, PNG, WebP

To modify these constraints, update the constants in the KYCUpload component:

```tsx
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ACCEPTED_FORMATS = ['image/jpeg', 'image/png', 'image/webp'];
```

## Styling

The components use Tailwind CSS classes for styling. You can customize the appearance by modifying the class names in the components.

## Testing

The system includes test files with basic tests. To run the tests:

```bash
npm test KYCUpload
```

## Accessibility

The components follow accessibility best practices:

- Proper labeling of form elements
- Keyboard navigation support
- ARIA attributes where needed
- Sufficient color contrast
- Focus management

## Error Handling

The system handles various error scenarios:

- File size validation
- File format validation
- Required field validation
- Network errors
- Upload failures

## Performance

The system is optimized for performance:

- Lazy loading of images
- Efficient state management
- Minimal re-renders
- Proper cleanup of event listeners

## Browser Support

The system supports modern browsers:

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Integration Checklist

- [x] File size validation matches backend limits (5MB)
- [x] Image format validation prevents unsupported uploads
- [x] Document expiry date validation prevents expired documents
- [x] Progress bar shows upload percentage correctly
- [x] Image preview renders before submission
- [x] Upload retry mechanism for failed uploads
- [x] Success state shows KYC status update
- [x] Error handling for network failures
- [x] Document replacement flow works for resubmission

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Write tests
5. Submit a pull request

## License

MIT