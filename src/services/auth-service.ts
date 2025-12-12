import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger'; // Assuming a logger utility from previous context

const OTP_ATTEMPTS_KEY = 'otp_attempts_v2';
const OTP_ATTEMPT_LIMIT = 3;
const OTP_ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export class AuthService {
  private static getAttemptsMap(): Record<string, number[]> {
    try {
      const raw = localStorage.getItem(OTP_ATTEMPTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (error) {
      logger.error('Failed to get OTP attempts map', { error });
      return {};
    }
  }

  private static saveAttemptsMap(map: Record<string, number[]>) {
    try {
      localStorage.setItem(OTP_ATTEMPTS_KEY, JSON.stringify(map));
    } catch (error) {
      logger.error('Failed to save OTP attempts map', { error });
    }
  }

  private static pruneAttempts(timestamps: number[]): number[] {
    const cutoff = Date.now() - OTP_ATTEMPT_WINDOW_MS;
    return timestamps.filter(ts => ts > cutoff);
  }

  private static recordAttempt(email: string) {
    if (!email) return;
    const map = this.getAttemptsMap();
    const list = this.pruneAttempts(map[email] || []);
    list.push(Date.now());
    map[email] = list;
    this.saveAttemptsMap(map);
  }

  private static hasReachedLimit(email: string): boolean {
    if (!email) return false;
    const map = this.getAttemptsMap();
    const list = this.pruneAttempts(map[email] || []);
    return list.length >= OTP_ATTEMPT_LIMIT;
  }

  static async sendOtp(email: string, userData?: Record<string, any>) {
    if (!email) {
      throw new Error('Email is required');
    }
    email = email.trim().toLowerCase();
    
    // Check client-side rate limit
    if (this.hasReachedLimit(email)) {
      const map = this.getAttemptsMap();
      const list = map[email] || [];
      const oldestAttempt = Math.min(...list);
      const waitMs = (oldestAttempt + OTP_ATTEMPT_WINDOW_MS) - Date.now();
      throw new Error(`Too many attempts. Please wait ${Math.ceil(waitMs / 60000)} minutes before trying again.`);
    }

    try {
      // Send OTP and create user after verification
      const { data, error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,  // Create user after verification
          data: userData  // Optional metadata for the new user
        }
      });

      if (error) {
        logger.error('OTP send error', { error, email });
        
        // Handle rate limiting explicitly
        if (error.status === 429 || /too many/i.test(error.message)) {
          throw new Error('Too many attempts. Please wait 5 minutes before trying again.');
        }
        
        throw new Error(error.message || 'Failed to send OTP');
      }

      // Record the attempt locally after successful send
      this.recordAttempt(email);

      return data;
    } catch (error: any) {
      logger.error('Failed to send OTP', { email, error });
      throw new Error(error.message || 'An unexpected error occurred while sending OTP');
    }
  }

  static async verifyOtp(email: string, token: string): Promise<{ session: any; user: any }> {
    if (!email || !token) {
      throw new Error('Email and token are required');
    }
    email = email.trim().toLowerCase();
    token = token.trim();

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });

      if (error) {
        logger.error('OTP verification error', { error, email });
        
        // Handle rate limiting
        if (error.status === 429 || /too many/i.test(error.message)) {
          throw new Error('Too many verification attempts. Please wait 5 minutes before trying again.');
        }
        
        throw new Error(error.message || 'Failed to verify OTP');
      }

      if (!data?.user || !data?.session) {
        throw new Error('Verification succeeded but no session was created');
      }

      // Clear attempts after successful verification
      const map = this.getAttemptsMap();
      delete map[email];
      this.saveAttemptsMap(map);

      return {
        session: data.session,
        user: data.user
      };
    } catch (error: any) {
      logger.error('Failed to verify OTP', { email, error });
      throw new Error(error.message || 'An unexpected error occurred while verifying OTP');
    }
  }

  static async getCurrentSession() {
    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        throw error;
      }
      return session;
    } catch (error: any) {
      logger.error('Session fetch error', { error });
      throw new Error(error.message || 'Failed to fetch current session');
    }
  }

  static async signOut() {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        throw error;
      }
      // Clear local storage attempts on sign out
      try {
        localStorage.removeItem(OTP_ATTEMPTS_KEY);
      } catch {}
    } catch (error: any) {
      logger.error('Sign out error', { error });
      throw new Error(error.message || 'Failed to sign out');
    }
  }
}

export default AuthService;