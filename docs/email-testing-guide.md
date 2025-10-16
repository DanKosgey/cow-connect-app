# Email Service Testing Guide

## Overview

This guide explains how to test the email service functionality in the application. The email service has been fixed and is now working correctly with Resend API.

## Current Status

✅ **Email Service Working**: The Resend API integration has been fixed and tested successfully
✅ **Sandbox Domain Configured**: Using `onboarding@resend.dev` as the sender
✅ **Recipient Restriction**: Can only send to `kosgeidan3@gmail.com` in sandbox mode

## How to Test Email Service

### 1. Automated Diagnosis Script

Run the built-in diagnosis script to verify email service functionality:

```bash
npm run diagnose:email
```

This will:
- Check environment variables
- Verify Resend client creation
- Send a test email to `kosgeidan3@gmail.com`
- Display detailed results

### 2. In-Application Testing (Development Only)

When running the application in development mode:

1. Navigate to the Staff Management section
2. Click "Add Staff" to open the Staff Invite Dialog
3. Look for the "Test Email Service" button at the top of the dialog (only visible in development)
4. Click the button to send a test email
5. Check for success/failure notifications

### 3. Actual Invitation Testing

To test the full invitation flow:

1. In the Staff Invite Dialog, enter:
   - Email: `kosgeidan3@gmail.com`
   - Role: Select either "Staff Member" or "Administrator"
   - Message: Optional welcome message
2. Click "Send Invitation"
3. Check `kosgeidan3@gmail.com` for the invitation email

## Important Notes

### Sandbox Restrictions

While using Resend's sandbox domain:
- ✅ Can send to: `kosgeidan3@gmail.com` (account owner)
- ❌ Cannot send to: Any other email address
- Sender: `onboarding@resend.dev` (cannot be changed in sandbox)

### For Production Use

To send emails to any address:

1. **Verify a Custom Domain**:
   - Log in to your Resend dashboard
   - Navigate to the Domains section
   - Add and verify your sending domain

2. **Update Environment Variables**:
   ```env
   VITE_CUSTOM_EMAIL_DOMAIN=invitations@yourcompany.com
   ```

3. **Test with Any Email Address**:
   - After domain verification, you can send to any recipient

## Troubleshooting

### If Emails Are Not Received

1. **Check Spam/Junk Folder**: Look in Gmail's spam/junk folders
2. **Verify Recipient**: Ensure using `kosgeidan3@gmail.com` for testing
3. **Check Console Logs**: Look for detailed error messages in browser console
4. **Run Diagnosis Script**: `npm run diagnose:email` for detailed information

### Common Error Messages

1. **"You can only send testing emails to your own email address"**:
   - Solution: Use `kosgeidan3@gmail.com` as recipient

2. **"Unable to fetch data. The request could not be resolved"**:
   - Solution: Check API key validity and network connectivity

3. **"Authentication error"**:
   - Solution: Verify `VITE_RESEND_API_KEY` in `.env` file

## Environment Variables

### Required
```env
VITE_RESEND_API_KEY=your_resend_api_key_here
```

### Optional (for custom domains)
```env
VITE_CUSTOM_EMAIL_DOMAIN=invitations@yourcompany.com
```

## Verification Results

The latest diagnosis confirmed the email service is working:

```
=== Email Service Diagnosis ===
1. Environment Variables Check:
   VITE_RESEND_API_KEY: re_V5DdNNT...
   RESEND_API_KEY: NOT SET
   ✅ API key found.

2. Resend Client Creation:
   ✅ Resend client created successfully.

3. Sending Test Email:
   Sending to: kosgeidan3@gmail.com
   ✅ Email sent successfully!
   Email ID: b0eabecd-501c-4b50-b34a-b30d5b35dd53

=== Diagnosis Complete ===
```

This confirms that the Resend API integration is working properly with the correct configuration.