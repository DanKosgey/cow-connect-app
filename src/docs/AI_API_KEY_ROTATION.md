# AI API Key Rotation System

## Overview

This document explains the new AI API key rotation system that uses environment variables for everything. The system supports up to 50 API keys for rotation to prevent quota depletion issues and no longer uses any database tables for API key management.

## How It Works

1. **Environment Variable Configuration**: API keys are configured as environment variables in the Supabase Edge Function environment.

2. **Automatic Rotation**: When an API key reaches its quota limit (429 error) or becomes invalid, the system automatically rotates to the next available key.

3. **In-Memory Tracking**: The system tracks which API key index is currently in use per staff member in memory (no database access).

4. **Cool-off Period**: By rotating to the next key, the system gives depleted keys time to recover their quota.

## Configuration

### Environment Variables

Configure your API keys in the Supabase Edge Function environment:

```
# Primary API key (optional, will be used as first key if present)
VITE_GEMINI_API_KEY=your_primary_api_key_here

# Backup API keys (up to 50)
GEMINI_API_KEY_1=your_first_backup_key_here
GEMINI_API_KEY_2=your_second_backup_key_here
GEMINI_API_KEY_3=your_third_backup_key_here
...
GEMINI_API_KEY_50=your_fiftieth_backup_key_here
```

### Setting Environment Variables in Supabase

1. Go to your Supabase project dashboard
2. Navigate to Settings > Functions > Environment Variables
3. Add your API keys as environment variables:
   - Click "Add new variable"
   - Enter the variable name (e.g., `GEMINI_API_KEY_1`)
   - Enter the API key value
   - Click "Add"

## Key Features

### Automatic Rotation Logic

The system automatically handles API key rotation:

1. When a request fails with a quota error (429) or invalid key error, the system rotates to the next key
2. The current key index is tracked in memory per staff member (no database access)
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

### Edge Function Changes

The Edge Function now:

1. Reads API keys exclusively from environment variables
2. Maintains current key index in memory (no database access)
3. Implements automatic rotation logic for quota and invalid key errors
4. Supports up to 50 API keys for maximum flexibility
5. Completely eliminates dependency on the collector_api_keys table

### Client-Side Changes

The client-side implementation remains unchanged:

1. Still calls the same Edge Function endpoint
2. Still passes the same parameters (staffId, imageBase64, recordedLiters)
3. Receives the same response format

## Migration from Old System

If you were using the previous system with database-stored API keys:

1. **No client-side changes required**
2. **Remove the collector_api_keys table** from your database (if desired)
3. **Update environment variables** in Supabase with your API keys
4. **Deploy the updated Edge Function**

## Best Practices

1. **Use Multiple Keys**: Configure at least 3-5 API keys for effective rotation
2. **Monitor Usage**: Keep track of which keys are being used and when
3. **Regular Rotation**: Even without quota issues, consider periodically updating your keys
4. **Error Monitoring**: Monitor logs for persistent API key issues

## Troubleshooting

### Common Issues

1. **"No API keys configured" Error**: 
   - Ensure you've set environment variables in Supabase
   - Check that variable names match the expected format

2. **Quota Still Being Hit**:
   - Add more API keys to your rotation
   - Check if your keys are on appropriate pricing tiers

3. **Invalid Key Errors**:
   - Verify that your API keys are correct and active
   - Check that keys have the necessary permissions

### Logs and Debugging

Check the Supabase function logs for detailed error information:

1. Go to Supabase Dashboard
2. Navigate to Functions > ai-verification
3. Check the logs for error messages and rotation events