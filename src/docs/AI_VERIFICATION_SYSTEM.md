# AI Verification System Documentation

## Overview

The AI Verification System is designed to validate milk collection photos by analyzing the images and comparing the estimated milk volume with the recorded liters. This system helps ensure the accuracy of milk collection records and prevents fraudulent submissions.

## System Components

### 1. AI Service (`src/services/ai/gemini-service.ts`)

The core service that interfaces with Google's Gemini API to analyze collection photos.

#### Key Functions:
- `verifyCollectionPhoto(imageUrl, recordedLiters)`: Analyzes a photo and compares estimated volume with recorded liters
- `getLatestAIInstructions()`: Retrieves the latest AI instructions from the database
- `updateAIInstructions(instructions, modelName, confidenceThreshold)`: Updates AI configuration parameters

### 2. Database Schema (`supabase/migrations/202512050001_ai_verification_schema.sql`)

#### Tables:
- `ai_verification_results`: Stores verification results for each collection
- `ai_instructions`: Stores configurable AI instructions and parameters

#### Enums:
- `ai_verification_status_enum`: Defines verification statuses (pending, verified, flagged, needs_review)

### 3. React Hooks (`src/hooks/useAIVerification.ts`)

Provides a convenient interface for React components to use AI verification functionality.

#### Key Functions:
- `verifyCollection(photoUrl, recordedLiters)`: Verifies a collection photo
- `saveVerificationResult(collectionId, result, recordedLiters)`: Saves verification results to the database
- `fetchAIInstructions()`: Retrieves the latest AI instructions

### 4. Admin Pages

#### AI Instructions Page (`src/pages/admin/ai/AdminAIInstructionsPage.tsx`)
Allows administrators to configure:
- AI model selection (Gemini 1.5 Flash or Pro)
- Confidence threshold for automatic verification
- Custom instructions for the AI model

#### AI Monitoring Dashboard (`src/pages/admin/ai/AdminAIMonitoringDashboard.tsx`)
Provides administrators with insights into:
- Total verification statistics
- Filterable verification results
- Confidence scores and verification statuses

### 5. Integration Points

#### Enhanced Collection Form (`src/components/collector/EnhancedCollectionForm.tsx`)
Integrates AI verification into the collection submission workflow:
1. When a photo is uploaded, it's automatically sent for AI verification
2. Results are displayed to the collector in real-time
3. Verification results are saved to the database
4. Collections with low confidence are flagged for review

## Workflow

1. **Photo Upload**: Collector uploads a photo during milk collection submission
2. **AI Analysis**: System sends the photo to Gemini API with recorded liters
3. **Result Processing**: AI analyzes the image and returns:
   - Estimated liters
   - Confidence score
   - Explanation of the analysis
   - Verification pass/fail status
4. **Result Storage**: Verification results are stored in the database
5. **Feedback**: Collector receives immediate feedback on verification status
6. **Review**: Administrators can monitor flagged collections through the dashboard

## Configuration Options

### AI Models
- **Gemini 1.5 Flash**: Faster processing, suitable for most use cases
- **Gemini 1.5 Pro**: More capable but slower, for complex analysis needs

### Confidence Threshold
- Range: 0.1 - 1.0
- Lower values = stricter verification
- Recommended: 0.8 for balance of accuracy and usability

### Custom Instructions
Administrators can customize the AI's behavior by providing specific instructions about:
- What to look for in collection photos
- How to estimate volumes
- When to flag collections for review

## Error Handling

The system includes robust error handling for:
- API connectivity issues
- Image processing failures
- Database storage errors
- Invalid response formats

In case of errors, the system falls back to manual review processes without preventing collection submission.

## Testing

Unit tests are available in `src/__tests__/ai-verification.test.ts` covering:
- Successful verification scenarios
- Error handling
- Database interactions
- Instruction management

## Security Considerations

- All API keys are stored securely in environment variables
- Image uploads are processed securely through Supabase Storage
- Database access is controlled through RLS policies
- Only authorized administrators can configure AI instructions

## Performance Optimization

- Images are processed efficiently with minimal latency
- Results are cached in the database for audit purposes
- Confidence scoring helps prioritize manual reviews
- Batch processing capabilities for high-volume scenarios