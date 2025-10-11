/**
 * Email service utility for sending verification codes and notifications
 * In production, this should integrate with a real email service
 */

interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * Simulate sending an email
 * In production, integrate with SendGrid, Mailgun, or similar service
 */
export const sendEmail = async (options: EmailOptions): Promise<boolean> => {
  try {
    // In a real implementation, you would use an email service here
    // For example, with SendGrid:
    // const sgMail = require('@sendgrid/mail');
    // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
    // await sgMail.send({
    //   to: options.to,
    //   from: 'noreply@yourapp.com',
    //   subject: options.subject,
    //   text: options.text,
    //   html: options.html
    // });

    // For now, we'll log to console and extract the verification code to show to the user
    console.log('📧 Email would be sent:', {
      to: options.to,
      subject: options.subject,
      text: options.text
    });

    // Extract verification code from the text (if present)
    const codeMatch = options.text.match(/verification code is: (\d{6})/);
    if (codeMatch && codeMatch[1]) {
      console.log('📋 VERIFICATION CODE (for testing):', codeMatch[1]);
      // In a real app, this would be sent via email
    }

    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 500));

    return true;
  } catch (error) {
    console.error('Failed to send email:', error);
    return false;
  }
};

/**
 * Send verification code email
 */
export const sendVerificationCodeEmail = async (
  email: string,
  code: string
): Promise<boolean> => {
  const subject = 'Your Verification Code';
  const text = `
Welcome to DAIRY FARMERS OF TRANS-NZOIA!

Your verification code is: ${code}

This code will expire in 2 minutes.

If you didn't request this code, please ignore this email.

Best regards,
DAIRY FARMERS OF TRANS-NZOIA Team
  `;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <h2 style="color: #2563eb;">Welcome to DAIRY FARMERS OF TRANS-NZOIA!</h2>
      <p>Your verification code is:</p>
      <div style="background-color: #f3f4f6; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
        <span style="font-size: 24px; font-weight: bold; letter-spacing: 4px; color: #1f2937;">${code}</span>
      </div>
      <p>This code will expire in <strong>2 minutes</strong>.</p>
      <p>If you didn't request this code, please ignore this email.</p>
      <hr style="margin: 30px 0; border: 0; border-top: 1px solid #e5e7eb;">
      <p style="color: #6b7280; font-size: 14px;">
        Best regards,<br>
        DAIRY FARMERS OF TRANS-NZOIA Team
      </p>
    </div>
  `;

  return await sendEmail({ to: email, subject, text, html });
};