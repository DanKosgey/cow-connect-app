# Email Service Backend Implementation

## Overview

This document explains the new backend implementation for the email service using Supabase Edge Functions to avoid CORS issues when sending emails from the browser.

## Architecture

Instead of calling the Resend API directly from the browser (which causes CORS issues), we now use a Supabase Edge Function as a proxy:

```
Browser -> Supabase Edge Function -> Resend API
```

## Implementation Details

### 1. Supabase Edge Function

The `send-email` function is deployed to Supabase and handles the actual email sending:

- **Location**: `supabase/functions/send-email/`
- **Dependencies**: Uses the `resend` npm package
- **Environment Variables**: Requires `RESEND_API_KEY` to be set in Supabase secrets

### 2. Client-Side Service

The `email-service.ts` now makes HTTP requests to the Supabase Edge Function instead of calling Resend directly:

```typescript
// Call the Supabase Edge Function to send the email
const functionUrl = `${this.supabaseUrl}/functions/v1/send-email`;

const response = await fetch(functionUrl, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`
  },
  body: JSON.stringify(emailData)
});
```

## Deployment Steps

### 1. Deploy the Function

```bash
supabase functions deploy send-email
```

### 2. Set Environment Variables

```bash
supabase secrets set RESEND_API_KEY=your_resend_api_key_here
```

### 3. Verify Deployment

Check the Supabase dashboard to ensure the function is deployed and the environment variable is set.

## Benefits

1. **No CORS Issues**: The Edge Function runs on the same domain as Supabase
2. **Security**: API keys are stored securely on the backend
3. **Scalability**: Edge Functions automatically scale
4. **Reliability**: Better error handling and logging

## Testing

To test the email service:

1. Ensure the Supabase Edge Function is deployed
2. Verify the RESEND_API_KEY is set in Supabase secrets
3. Try sending an invitation through the Staff Invite Dialog
4. Check the browser console for success/failure messages

## Troubleshooting

### Common Issues

1. **Function Not Found**: Ensure the function is deployed with `supabase functions deploy send-email`
2. **Environment Variable Missing**: Set the RESEND_API_KEY with `supabase secrets set RESEND_API_KEY=...`
3. **Network Issues**: Check your internet connection and Supabase project status

### Debugging Steps

1. Check the browser console for detailed error messages
2. Verify the Supabase Edge Function logs in the Supabase dashboard
3. Test the function directly through the Supabase dashboard
4. Ensure environment variables are correctly set

## Security Considerations

1. **API Key Storage**: Resend API key is stored securely in Supabase secrets
2. **Function Access**: The function requires proper authentication headers
3. **Rate Limiting**: Resend API has built-in rate limiting
4. **Input Validation**: The function validates all input parameters

## Future Improvements

1. **Email Templates**: Add support for different email templates
2. **Retry Logic**: Implement retry logic for failed email sends
3. **Analytics**: Add email delivery tracking
4. **Error Notifications**: Send notifications for failed email attempts