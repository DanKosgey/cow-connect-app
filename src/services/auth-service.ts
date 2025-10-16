import { supabase } from '@/integrations/supabase/client';

const OTP_ATTEMPTS_KEY = 'otp_attempts_v2';
const OTP_ATTEMPT_LIMIT = 3;
const OTP_ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

export class AuthService {
  private static getAttemptsMap(): Record<string, number[]> {
    try {
      const raw = localStorage.getItem(OTP_ATTEMPTS_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  }

  private static saveAttemptsMap(map: Record<string, number[]>) {
    try {
      localStorage.setItem(OTP_ATTEMPTS_KEY, JSON.stringify(map));
    } catch (e) {
      console.error('Failed to save OTP attempts map:', e);
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
    email = email.trim().toLowerCase();
    
    // Check client-side rate limit
    if (this.hasReachedLimit(email)) {
      const oldestAttempt = Math.min(...this.getAttemptsMap()[email]);
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
        // Log the error but throw a user-friendly message
        console.error('OTP send error:', error);
        
        // Handle rate limiting explicitly
        if (error.status === 429 || /too many/i.test(error.message)) {
          throw new Error('Too many attempts. Please wait 5 minutes before trying again.');
        }
        
        throw new Error(error.message);
      }

      // Record the attempt locally
      this.recordAttempt(email);

      return data;
    } catch (error: any) {
      // Add request context to error
      console.error('Failed to send OTP:', { email, error });
      throw error;
    }
  }

  static async verifyOtp(email: string, token: string): Promise<{ session: any; user: any }> {
    email = email.trim().toLowerCase();
    token = token.trim();

    try {
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token,
        type: 'email'
      });

      if (error) {
        console.error('OTP verification error:', error);
        
        // Handle rate limiting
        if (error.status === 429 || /too many/i.test(error.message)) {
          throw new Error('Too many verification attempts. Please wait 5 minutes before trying again.');
        }
        
        throw new Error(error.message);
      }

      if (!data?.user || !data?.session) {
        throw new Error('Verification succeeded but no session was created');
      }

      return {
        session: data.session,
        user: data.user
      };
    } catch (error: any) {
      // Add context to error
      console.error('Failed to verify OTP:', { email, error });
      throw error;
    }
  }

  static async getCurrentSession() {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) {
      console.error('Session fetch error:', error);
      throw error;
    }
    return session;
  }

  static async signOut() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Sign out error:', error);
      throw error;
    }
  }
}

export default AuthService;