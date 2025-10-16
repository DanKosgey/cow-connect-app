# Email Service Setup

## Overview

The application uses Resend for sending invitation emails. This guide will help you set up email functionality properly.

## Prerequisites

1. A Resend account (free tier available at [resend.com](https://resend.com))
2. A verified domain (optional for testing, required for production)

## Setup Instructions

### 1. Get Your Resend API Key

1. Sign up at [resend.com](https://resend.com)
2. Navigate to the API Keys section in your dashboard
3. Create a new API key with sending permissions
4. Copy the generated API key

### 2. Configure Environment Variables

Add your Resend API key to your `.env` file:

```env
VITE_RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
```

### 3. Testing with Sandbox Domain

For initial testing, you can use Resend's sandbox domain without verification:

- The system will automatically use `onboarding@resend.dev` as the sender
- No domain verification required
- Perfect for development and testing

### 4. Production Setup with Custom Domain

For production use, you should verify your own domain:

1. Add your domain in the Resend dashboard
2. Follow the DNS verification instructions
3. Update your `.env` file with your custom domain:

```env
VITE_RESEND_API_KEY=re_XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX
VITE_CUSTOM_EMAIL_DOMAIN=invitations@yourcompany.com
```

## Testing the Email Service

### Run the Diagnosis Script

```bash
npm run diagnose:email
```

This script will:
- Check your environment variables
- Verify Resend client creation
- Send a test email
- Provide detailed error information

### Run the Simple Test

```bash
npm run test:email
```

## Troubleshooting

### Common Issues

1. **"Unable to fetch data" Error**
   - Check your API key is valid and correctly formatted
   - Ensure you have internet connectivity
   - Verify domain settings if using a custom domain

2. **Emails Not Being Received**
   - Check spam/junk folders
   - Verify the recipient email address is correct
   - Check Resend dashboard for delivery status

3. **Simulation Mode**
   - If no API key is configured, the system will simulate email sending
   - Check browser console for simulated email logs

### Debugging Steps

1. Check browser console for detailed error messages
2. Verify environment variables are correctly set
3. Run the diagnosis script to identify specific issues
4. Check Resend dashboard for API usage and errors

## Environment Variables Reference

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `VITE_RESEND_API_KEY` | Your Resend API key | Yes (for real emails) | None |
| `VITE_CUSTOM_EMAIL_DOMAIN` | Your verified sending domain | No | `onboarding@resend.dev` |

## Security Notes

- Never commit your `.env` file to version control
- Use different API keys for development and production
- Regularly rotate your API keys
- Monitor your API usage in the Resend dashboard

## Fallback Behavior

If no Resend API key is configured:
- The system will automatically fall back to simulation mode
- Emails will be logged to the console instead of being sent
- Useful for development and testing without sending real emails