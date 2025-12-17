# Deployment Guide: AI API Key Rotation System

## Overview

This guide explains how to deploy and configure the new AI API key rotation system that uses environment variables for everything and eliminates all dependencies on the collector_api_keys table.

## Prerequisites

1. Supabase project with Edge Functions enabled
2. Google Gemini API keys (multiple recommended)
3. Access to Supabase dashboard for environment variable configuration

## Deployment Steps

### 1. Update Environment Variables

Configure your API keys in the Supabase Edge Function environment:

1. Go to your Supabase project dashboard
2. Navigate to Settings > Functions > Environment Variables
3. Add your API keys as environment variables:
   - `VITE_GEMINI_API_KEY` (optional primary key)
   - `GEMINI_API_KEY_1` (first backup key)
   - `GEMINI_API_KEY_2` (second backup key)
   - ... up to `GEMINI_API_KEY_50`

Example configuration:
```
VITE_GEMINI_API_KEY=AIzaSyA**************
GEMINI_API_KEY_1=AIzaSyB**************
GEMINI_API_KEY_2=AIzaSyC**************
GEMINI_API_KEY_3=AIzaSyD**************
```

### 2. Deploy Updated Edge Function

Redeploy the `ai-verification` Edge Function:

```bash
# From your project root directory
cd supabase/functions
supabase functions deploy ai-verification
```

Or deploy via the Supabase dashboard:
1. Go to Supabase Dashboard > Functions
2. Find the `ai-verification` function
3. Click "Deploy" to redeploy with the updated code

### 3. Clean Up Database (Optional)

Since the system no longer uses the collector_api_keys table, you can optionally remove it:

```sql
-- OPTIONAL: Drop the collector_api_keys table if no longer needed
DROP TABLE IF EXISTS collector_api_keys CASCADE;

-- OPTIONAL: Drop related functions
DROP FUNCTION IF EXISTS get_current_api_key(uuid);
DROP FUNCTION IF EXISTS rotate_api_key(uuid);
```

### 4. Verify Deployment

Test the system by making a request to the AI verification endpoint:

1. Log in as a collector user
2. Submit a milk collection with a photo
3. Check that the verification completes successfully
4. Monitor Supabase function logs for any rotation events

## Configuration Recommendations

### Minimum Setup
- Configure at least 3 API keys for basic redundancy

### Recommended Setup
- Configure 5-10 API keys for optimal rotation and quota management

### Enterprise Setup
- Configure 10-20 API keys for high-volume operations

## Monitoring and Maintenance

### Logs Monitoring

Check Supabase function logs for:
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
   - Solution: Verify environment variables are set in Supabase Edge Function settings

2. **Quota Still Being Hit**
   - Solution: Add more API keys to your rotation pool

3. **Invalid Key Errors**
   - Solution: Verify API keys are correct and active in Google Cloud Console

4. **Function Deployment Failures**
   - Solution: Check for syntax errors in the Edge Function code

### Log Analysis

Monitor these key log messages:

- `Error validating API key at index X` - Indicates a specific key had an issue
- `Rotating to next key` - Shows the rotation mechanism in action
- `All API keys exhausted` - Critical error indicating all keys are problematic

## Rollback Procedure

If you need to rollback to a previous system:

1. Restore the previous version of `supabase/functions/ai-verification/index.ts`
2. Redeploy the Edge Function
3. (Optional) Restore the collector_api_keys table and functions if needed

## Security Considerations

1. **Environment Variables** - API keys are stored securely as environment variables rather than in the database
2. **Edge Function Isolation** - Keys are only accessible within the Edge Function runtime
3. **No Client Exposure** - API keys are never exposed to the client-side application
4. **Key Rotation** - Regular rotation improves security posture
5. **No Database Storage** - Eliminates risk of API keys being compromised through database breaches

## Performance Impact

The new system has minimal performance impact:
- Slight overhead for key validation (one test request per key)
- No database access for key management (improved performance)
- Same response times for successful verifications
- Potential improvement during quota issues (automatic failover)

## Support

For issues with the deployment or configuration:
1. Check Supabase function logs for detailed error messages
2. Verify all environment variables are correctly configured
3. Ensure your API keys have the necessary permissions in Google Cloud
4. Contact support if issues persist