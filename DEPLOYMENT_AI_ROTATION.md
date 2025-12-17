# Deployment Guide: AI API Key Rotation System

## Overview

This guide explains how to deploy and configure the new AI API key rotation system that works entirely on the client side using environment variables. The system eliminates all Edge Function calls.

## Prerequisites

1. Google Gemini API keys (multiple recommended)
2. Access to your project's .env file

## Deployment Steps

### 1. Update Environment Variables

Configure your API keys in the `.env` file in your project root:

```
# Primary API key (required)
VITE_GEMINI_API_KEY=your_primary_api_key_here

# Backup API keys (optional, up to 50)
GEMINI_API_KEY_1=your_first_backup_key_here
GEMINI_API_KEY_2=your_second_backup_key_here
GEMIDI_API_KEY_3=your_third_backup_key_here
...
GEMINI_API_KEY_50=your_fiftieth_backup_key_here
```

### 2. Install Dependencies

Install the Google Generative AI package:

```bash
npm install @google/generative-ai
```

### 3. Clean Up (Optional)

Since the system no longer uses Edge Functions or the collector_api_keys table:

1. **Delete the Edge Function**:
   - Remove `supabase/functions/ai-verification/` directory

2. **Clean up database** (optional):
   ```sql
   -- OPTIONAL: Drop the collector_api_keys table if no longer needed
   DROP TABLE IF EXISTS collector_api_keys CASCADE;

   -- OPTIONAL: Drop related functions
   DROP FUNCTION IF EXISTS get_current_api_key(uuid);
   DROP FUNCTION IF EXISTS rotate_api_key(uuid);
   ```

### 4. Verify Deployment

Test the system by making a request to the AI verification:

1. Log in as a collector user
2. Submit a milk collection with a photo
3. Check that the verification completes successfully
4. Monitor browser console for any rotation events

## Configuration Recommendations

### Minimum Setup
- Configure at least 1 API key (primary key)

### Recommended Setup
- Configure 1 primary key + 3-5 backup keys for optimal rotation and quota management

### Enterprise Setup
- Configure 1 primary key + 10-20 backup keys for high-volume operations

## Monitoring and Maintenance

### Browser Console Monitoring

Check the browser console for:
- API key rotation events
- Quota exceeded errors
- Invalid key errors
- Successful verifications

### Key Rotation Tracking

The system maintains key index tracking in memory (no database access required).

### Regular Maintenance

1. **Periodically update keys** - Even without quota issues, rotate your API keys for security
2. **Monitor usage patterns** - Watch for frequent rotations which may indicate high usage
3. **Add keys as needed** - If you notice frequent quota issues, add more API keys

## Troubleshooting

### Common Issues

1. **"No API keys configured" Error**
   - Solution: Verify environment variables are set in your .env file

2. **Quota Still Being Hit**
   - Solution: Add more API keys to your rotation pool

3. **Invalid Key Errors**
   - Solution: Verify API keys are correct and active in Google Cloud Console

### Browser Console Analysis

Monitor these key log messages:

- `Error validating API key at index X` - Indicates a specific key had an issue
- `Rotating to next key` - Shows the rotation mechanism in action
- `All API keys exhausted` - Critical error indicating all keys are problematic

## Rollback Procedure

If you need to rollback to a previous system:

1. Restore the previous version of the Edge Function
2. Restore the collector_api_keys table and functions if needed
3. Update client-side code to call Edge Function again

## Security Considerations

1. **Environment Variables** - API keys are stored in client-side environment variables
2. **Browser Security** - Keys are only accessible within the browser context
3. **Key Rotation** - Regular rotation improves security posture
4. **No Server Exposure** - Eliminates server-side key management risks

## Performance Impact

The new system has improved performance:
- No network round-trip to Edge Function
- Direct browser-to-Google API communication
- Faster response times
- Reduced infrastructure costs
- Automatic failover during quota issues

## Support

For issues with the deployment or configuration:
1. Check browser console for detailed error messages
2. Verify all environment variables are correctly configured
3. Ensure your API keys have the necessary permissions in Google Cloud
4. Contact support if issues persist