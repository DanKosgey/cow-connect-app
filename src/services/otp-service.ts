import { AuthService } from "./auth-service";
import { supabase } from "@/integrations/supabase/client";

export interface OtpState {
  email: string;
  token: string;
  verified: boolean;
  cooldown: number;  // Seconds until next attempt allowed
  sending: boolean;
  verifying: boolean;
}

export interface UserProfile {
  full_name: string;
  phone: string;
  role: string;
  gender?: string;
  [key: string]: any;
}

export class OtpService {
  /**
   * Send OTP to email and prepare for user creation.
   * The user will be created only after successful OTP verification.
   */
  static async sendOtp(email: string, profile: Partial<UserProfile>, password?: string) {
    try {
      // Pass profile data and password through options.data
      // These will be used to create the user after OTP verification
      await AuthService.sendOtp(email, {
        ...profile,
        password,  // Optional: if you want to create a password-based account
      });

      return {
        success: true,
        message: 'OTP sent successfully. Please check your email.'
      };
    } catch (error: any) {
      console.error('OTP send failed:', error);

      // Check if it's a rate limit error (from auth-service)
      if (error.message.includes('Too many attempts')) {
        throw new Error(error.message);  // Pass through rate limit errors
      }

      throw new Error('Failed to send verification code. Please try again later.');
    }
  }

  /**
   * Verify OTP and create user account
   */
  static async verifyOtp(email: string, token: string) {
    try {
      const { user, session } = await AuthService.verifyOtp(email, token);

      // If verification succeeded but no user/session, something went wrong
      if (!user || !session) {
        throw new Error('Verification succeeded but account creation failed');
      }

      return {
        success: true,
        user,
        session,
        message: 'Email verified successfully'
      };
    } catch (error: any) {
      console.error('OTP verification failed:', error);

      // Check if it's a rate limit error
      if (error.message.includes('Too many')) {
        throw new Error(error.message);  // Pass through rate limit errors
      }

      throw new Error('Failed to verify code. Please check the code and try again.');
    }
  }

  /**
   * Get current auth state
   */
  static async getCurrentSession() {
    try {
      return await AuthService.getCurrentSession();
    } catch (error) {
      console.error('Failed to get current session:', error);
      return null;
    }
  }
}