# Vercel Deployment Guide for AI API Key Rotation

## Environment Variables Configuration

When deploying to Vercel, it's crucial to understand how environment variables work:

### Vercel Environment Variable Rules

1. **Variables with `VITE_` prefix** - Accessible in client-side browser code
2. **Variables without `VITE_` prefix** - Only accessible on the server side (not in browser)

### Required Changes for Vercel Deployment

Based on your current Vercel environment variables, you need to make these changes:

#### Current (Incorrect for client-side access):
```
VITE_GEMINI_API_KEY=**** (Correct - accessible in browser)
GEMINI_API_KEY_1=**** (Incorrect - NOT accessible in browser)
GEMINI_API_KEY_2=**** (Incorrect - NOT accessible in browser)
```

#### Updated (Correct for client-side access):
```
VITE_GEMINI_API_KEY=**** (Primary key - accessible in browser)
VITE_GEMINI_API_KEY_1=**** (Backup key 1 - accessible in browser)
VITE_GEMINI_API_KEY_2=**** (Backup key 2 - accessible in browser)
```

### Steps to Update Vercel Environment Variables

1. **Go to Vercel Dashboard**
   - Navigate to your project
   - Go to Settings > Environment Variables

2. **Update Existing Variables**
   - Find `GEMINI_API_KEY_1` and rename it to `VITE_GEMINI_API_KEY_1`
   - Find `GEMINI_API_KEY_2` and rename it to `VITE_GEMINI_API_KEY_2`

3. **Add More Backup Keys (Recommended)**
   - Add `VITE_GEMINI_API_KEY_3`, `VITE_GEMINI_API_KEY_4`, etc. as needed

4. **Redeploy Your Application**
   - Trigger a new deployment for changes to take effect

### Why This Matters

The client-side AI verification system needs direct access to all API keys for automatic rotation. Without the `VITE_` prefix, backup keys are not accessible in the browser, causing the rotation system to fail when the primary key is depleted.

### Verification

After updating your environment variables and redeploying:

1. Test the AI verification feature
2. Check the browser console for any errors
3. Monitor for successful API key rotation when quotas are hit

### Best Practices

1. **Always use `VITE_` prefix** for client-side accessible environment variables
2. **Configure multiple backup keys** to ensure smooth rotation
3. **Monitor API usage** to understand rotation patterns
4. **Regularly update keys** for security