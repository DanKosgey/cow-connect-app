# Supabase Connection Troubleshooting Guide

## Common Connection Issues and Solutions

### 1. Environment Variables Not Loaded
If API calls aren't being made between your app and Supabase:

1. **Verify your .env file**:
   - Check that you have a `.env` file in your project root
   - Ensure it contains:
     ```
     VITE_SUPABASE_URL=https://your-project-id.supabase.co
     VITE_SUPABASE_PUBLISHABLE_KEY=your-publishable-key
     ```

2. **Restart your development server**:
   - Stop your development server (`Ctrl+C`)
   - Start it again with `npm run dev`

3. **Check variable names**:
   - Ensure you're using `VITE_SUPABASE_URL` (not `VITE_SUPABASE_PROJECT_URL`)
   - Ensure you're using `VITE_SUPABASE_PUBLISHABLE_KEY` (not `VITE_SUPABASE_ANON_KEY`)

### 2. Network Connectivity Issues
If your app can't reach Supabase:

1. **Test direct access**:
   - Open your browser and navigate to your Supabase URL: `https://your-project-id.supabase.co`
   - You should see a Supabase welcome page

2. **Check firewall/proxy settings**:
   - Ensure your network allows connections to Supabase
   - If you're on a corporate network, contact your IT department

3. **Test with curl**:
   ```bash
   curl -I https://your-project-id.supabase.co/rest/v1/
   ```

### 3. CORS Issues
If you're getting CORS errors:

1. **Check your Supabase project settings**:
   - Go to your Supabase dashboard
   - Navigate to Settings > API
   - Ensure your localhost URL (`http://localhost:5173`) is in the "Additional URLs" list

2. **Add your domain to Supabase**:
   - In the Supabase dashboard, go to Settings > API
   - Add your development and production URLs to the "Additional URLs" section

### 4. Incorrect Supabase Credentials
If authentication is failing:

1. **Verify your credentials**:
   - Double-check your `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
   - Ensure there are no extra quotes or spaces

2. **Check Supabase dashboard**:
   - Go to your Supabase project
   - Navigate to Settings > API
   - Copy the exact values and paste them into your .env file

### 5. Client Initialization Issues
If the Supabase client isn't initializing properly:

1. **Check the client creation**:
   - Look at `src/integrations/supabase/client.ts`
   - Ensure the environment variables are being read correctly

2. **Add debugging logs**:
   - Add `console.log` statements to see what values are being used

### 6. Testing Connection Directly
Use the Connection Test Page:

1. **Navigate to `/admin/connection-test`**
2. **Check the results** for any error messages
3. **Look at the browser console** for detailed error information

## Diagnostic Steps

### Step 1: Check Environment Variables
1. Open your `.env` file
2. Verify the variables:
   ```
   VITE_SUPABASE_URL=https://oevxapmcmcaxpaluehyg.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8
   ```

### Step 2: Restart Development Server
1. Stop the current server (`Ctrl+C`)
2. Start it again:
   ```bash
   npm run dev
   ```

### Step 3: Check Browser Console
1. Open browser developer tools (`F12`)
2. Go to the Console tab
3. Look for any error messages related to Supabase

### Step 4: Test Network Connectivity
1. Open a new terminal
2. Test connectivity:
   ```bash
   curl -I https://oevxapmcmcaxpaluehyg.supabase.co/rest/v1/
   ```

### Step 5: Verify Supabase Dashboard
1. Go to https://app.supabase.io/
2. Select your project
3. Check that the project is active
4. Verify API settings

## Common Error Messages and Solutions

### "Failed to fetch" or "NetworkError"
- **Cause**: Network connectivity issues
- **Solution**: Check internet connection and firewall settings

### "Invalid API key"
- **Cause**: Incorrect or malformed API key
- **Solution**: Copy the exact key from Supabase dashboard

### "CORS error"
- **Cause**: URL not whitelisted in Supabase settings
- **Solution**: Add your localhost URL to Supabase API settings

### "Missing environment variables"
- **Cause**: Variables not defined or not loaded
- **Solution**: Check .env file and restart development server

## Emergency Troubleshooting

If nothing else works:

1. **Create a new .env file**:
   ```bash
   # .env
   VITE_SUPABASE_URL=https://oevxapmcmcaxpaluehyg.supabase.co
   VITE_SUPABASE_PUBLISHABLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9ldnhhcG1jbWNheHBhbHVlaHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTk0MjEzNzgsImV4cCI6MjA3NDk5NzM3OH0.OOfZ14TjqeA5Cg74QrjsT_CXhfvNa_GG7GnVkESqqX8
   ```

2. **Clear browser cache completely**:
   - Press `Ctrl+Shift+Delete` (Windows) or `Cmd+Shift+Delete` (Mac)
   - Select all options
   - Set time range to "All time"
   - Click "Clear data"

3. **Restart your computer**

4. **Try a different browser**

## Contact Support

If you continue to experience connection issues:

1. **Take screenshots** of error messages
2. **Copy console output** with error details
3. **Note the time** the error occurred
4. **Contact the development team** with this information

## Additional Notes

- Environment variables with the `VITE_` prefix are exposed to the client-side code
- Changes to .env files require restarting the development server
- Supabase URLs should not have trailing slashes
- API keys are sensitive information and should not be shared publicly