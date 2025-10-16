# Email Service Troubleshooting Guide

## Common Issues and Solutions

### 1. "Unable to fetch data. The request could not be resolved" Error

This error typically indicates one of the following issues:

#### a) Invalid API Key
- Verify that your Resend API key in `.env` is correct and active
- Check for extra spaces or characters in the key
- Ensure the key has the necessary permissions

#### b) Network Connectivity Issues
- Check your internet connection
- Verify that there are no firewall or proxy settings blocking the request
- Try accessing other external APIs to confirm connectivity

#### c) Domain Verification Problems
- If using a custom sender email, ensure the domain is verified with Resend
- For testing, use Resend's sandbox domain: `onboarding@resend.dev`

### 2. Testing the Email Service

#### Run the diagnosis script:
```bash
npm run diagnose:email
```

This will provide detailed information about:
- Environment variable configuration
- Resend client creation
- Test email sending

#### Run the simple test:
```bash
npm run test:email
```

### 3. Configuration Options

#### Using Simulation Mode
To test without sending real emails, remove or comment out the Resend API key:
```env
# VITE_RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

#### Using Resend Sandbox Domain
For testing purposes, use Resend's sandbox domain:
```typescript
from: 'onboarding@resend.dev'
```

#### Using Custom Domains
For production use, verify your domain with Resend and use:
```typescript
from: 'invitations@yourcompany.com'
```

### 4. Debugging Steps

1. **Check Console Logs**: Look for detailed error messages in the browser console
2. **Verify Environment Variables**: Ensure `VITE_RESEND_API_KEY` is correctly set in `.env`
3. **Test API Key**: Verify the API key works outside the application
4. **Check Network Tab**: Inspect the actual HTTP requests and responses
5. **Try Sandbox Domain**: Temporarily use `onboarding@resend.dev` for testing

### 5. Common Solutions

#### Solution 1: Use Simulation Mode
Temporarily remove the API key to use simulation mode:
```env
# Comment out the Resend API key
# VITE_RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

#### Solution 2: Verify Domain
1. Log in to your Resend dashboard
2. Navigate to the Domains section
3. Add and verify your sending domain
4. Update the `from` email address in the email service

#### Solution 3: Check API Key Permissions
1. Log in to your Resend dashboard
2. Navigate to the API Keys section
3. Ensure your key has the necessary permissions
4. Generate a new key if needed

### 6. Environment Variables

Required environment variable:
```env
VITE_RESEND_API_KEY=your_resend_api_key_here
```

Example `.env` file:
```env
# Supabase Configuration
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_key

# Email Configuration
VITE_RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 7. Getting Help

If you continue to experience issues:

1. Check the Resend documentation: https://resend.com/docs
2. Review the Resend status page: https://status.resend.com
3. Contact Resend support through their dashboard
4. Check the application console logs for detailed error messages