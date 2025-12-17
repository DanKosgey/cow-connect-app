# AI API Key Rotation System

## Overview

This document explains the new AI API key rotation system that works entirely on the client side using environment variables. The system eliminates all Edge Function calls and supports up to 50 API keys for rotation to prevent quota depletion issues.

## How It Works

1. **Environment Variable Configuration**: API keys are configured as environment variables in the client application.

2. **Client-Side Execution**: AI processing happens directly in the browser, eliminating Edge Function calls.

3. **Automatic Rotation**: When an API key reaches its quota limit (429 error) or becomes invalid, the system automatically rotates to the next available key.

4. **In-Memory Tracking**: The system tracks which API key index is currently in use per staff member in memory.

5. **Cool-off Period**: By rotating to the next key, the system gives depleted keys time to recover their quota.

## Configuration

### Environment Variables

Configure your API keys in the `.env` file:

```
# Primary API key (required)
VITE_GEMINI_API_KEY=your_primary_api_key_here

# Backup API keys (optional, up to 50)
GEMINI_API_KEY_1=your_first_backup_key_here
GEMINI_API_KEY_2=your_second_backup_key_here
GEMINI_API_KEY_3=your_third_backup_key_here
...
GEMINI_API_KEY_50=your_fiftieth_backup_key_here
```

### Setting Environment Variables

Create a `.env` file in your project root with your API keys:

```
VITE_GEMINI_API_KEY=AIzaSyA**************
GEMINI_API_KEY_1=AIzaSyB**************
GEMINI_API_KEY_2=AIzaSyC**************
GEMINI_API_KEY_3=AIzaSyD**************
```

## Key Features

### Direct Client-Side Execution

The system now works directly in the browser:

1. No Edge Function calls required
2. No CORS issues
3. Faster response times
4. Reduced infrastructure costs

### Automatic Rotation Logic

The system automatically handles API key rotation:

1. When a request fails with a quota error (429) or invalid key error, the system rotates to the next key
2. The current key index is tracked in memory per staff member
3. Keys are rotated in sequence (1, 2, 3, ..., 50, then back to 1)
4. Failed keys are skipped and won't be retried immediately

### Error Handling

The system handles various error conditions:

- **Quota Exceeded (429)**: Automatically rotates to the next key
- **Invalid API Key**: Automatically rotates to the next key
- **Network Issues**: Retries with the same key
- **Other Errors**: Throws the error without rotating

### Cool-off Mechanism

By rotating to the next key when one is depleted, the system provides a "cool-off" period for depleted keys:

1. When key N is depleted, the system switches to key N+1
2. Key N has time to recover its quota while the system uses other keys
3. Eventually, the system will cycle back to key N after other keys may have also been used

## Implementation Details

### Client-Side Changes

The client-side implementation now:

1. Reads API keys directly from environment variables
2. Uses the Google Generative AI SDK directly
3. Maintains current key index in memory (no database access)
4. Implements automatic rotation logic for quota and invalid key errors
5. Supports up to 50 API keys for maximum flexibility
6. Completely eliminates dependency on Edge Functions

### Removed Components

The following components have been removed:

1. **Edge Function**: No longer needed
2. **collector_api_keys table**: No longer used
3. **Database functions**: get_current_api_key and rotate_api_key are obsolete
4. **Supabase function calls**: No more CORS issues

## Migration from Old System

If you were using the previous system with Edge Function calls:

1. **No client-side code changes required** (the same interface is maintained)
2. **Remove the collector_api_keys table** from your database (if desired)
3. **Add API keys to your .env file** instead of Edge Function environment variables
4. **No Edge Function deployment needed**

## Best Practices

1. **Use Multiple Keys**: Configure at least 3-5 API keys for effective rotation
2. **Monitor Usage**: Keep track of which keys are being used and when
3. **Regular Rotation**: Even without quota issues, consider periodically updating your keys
4. **Error Monitoring**: Monitor browser console for persistent API key issues

## Troubleshooting

### Common Issues

1. **"No API keys configured" Error**: 
   - Ensure you've set environment variables in your .env file
   - Check that variable names match the expected format

2. **Quota Still Being Hit**:
   - Add more API keys to your rotation
   - Check if your keys are on appropriate pricing tiers

3. **Invalid Key Errors**:
   - Verify that your API keys are correct and active
   - Check that keys have the necessary permissions

### Browser Console Debugging

Check the browser console for detailed error information:

1. Open Developer Tools (F12)
2. Go to the Console tab
3. Check for error messages and rotation events