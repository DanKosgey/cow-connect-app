import { logger } from '@/utils/logger';
import { User } from '@supabase/supabase-js';

/**
 * Authentication Event Logger
 * Tracks authentication events for debugging and monitoring purposes
 */

export enum AuthEventType {
  LOGIN_ATTEMPT = 'login_attempt',
  LOGIN_SUCCESS = 'login_success',
  LOGIN_FAILURE = 'login_failure',
  LOGOUT = 'logout',
  SESSION_REFRESH = 'session_refresh',
  SESSION_EXPIRED = 'session_expired',
  SIGNUP_ATTEMPT = 'signup_attempt',
  SIGNUP_SUCCESS = 'signup_success',
  SIGNUP_FAILURE = 'signup_failure',
  PASSWORD_RESET_REQUEST = 'password_reset_request',
  PASSWORD_RESET_SUCCESS = 'password_reset_success',
  PASSWORD_UPDATE = 'password_update',
  ROLE_CHANGED = 'role_changed',
  TOKEN_REFRESHED = 'token_refreshed'
}

export interface AuthEvent {
  type: AuthEventType;
  timestamp: number;
  userId?: string;
  userEmail?: string;
  metadata?: Record<string, any>;
  error?: string;
}

class AuthEventManager {
  private events: AuthEvent[] = [];
  private readonly MAX_EVENTS = 100;

  /**
   * Log an authentication event
   */
  logEvent(event: Omit<AuthEvent, 'timestamp'>) {
    const authEvent: AuthEvent = {
      ...event,
      timestamp: Date.now()
    };

    // Add to events array
    this.events.push(authEvent);

    // Trim old events if we exceed the limit
    if (this.events.length > this.MAX_EVENTS) {
      this.events = this.events.slice(-this.MAX_EVENTS);
    }

    // Log to console/logger
    logger.info(`Auth Event: ${event.type}`, {
      userId: event.userId,
      userEmail: event.userEmail,
      metadata: event.metadata,
      error: event.error
    });
  }

  /**
   * Log user login attempt
   */
  logLoginAttempt(email: string) {
    this.logEvent({
      type: AuthEventType.LOGIN_ATTEMPT,
      userEmail: email
    });
  }

  /**
   * Log successful login
   */
  logLoginSuccess(user: User) {
    this.logEvent({
      type: AuthEventType.LOGIN_SUCCESS,
      userId: user.id,
      userEmail: user.email || undefined
    });
  }

  /**
   * Log failed login
   */
  logLoginFailure(email: string, error: string) {
    this.logEvent({
      type: AuthEventType.LOGIN_FAILURE,
      userEmail: email,
      error
    });
  }

  /**
   * Log user logout
   */
  logLogout(userId?: string) {
    this.logEvent({
      type: AuthEventType.LOGOUT,
      userId
    });
  }

  /**
   * Log session refresh
   */
  logSessionRefresh(userId?: string, success: boolean = true, error?: string) {
    this.logEvent({
      type: success ? AuthEventType.SESSION_REFRESH : AuthEventType.SESSION_EXPIRED,
      userId,
      error: error
    });
  }

  /**
   * Log signup attempt
   */
  logSignupAttempt(email: string, role: string) {
    this.logEvent({
      type: AuthEventType.SIGNUP_ATTEMPT,
      userEmail: email,
      metadata: { role }
    });
  }

  /**
   * Log successful signup
   */
  logSignupSuccess(user: User, role: string) {
    this.logEvent({
      type: AuthEventType.SIGNUP_SUCCESS,
      userId: user.id,
      userEmail: user.email || undefined,
      metadata: { role }
    });
  }

  /**
   * Log failed signup
   */
  logSignupFailure(email: string, role: string, error: string) {
    this.logEvent({
      type: AuthEventType.SIGNUP_FAILURE,
      userEmail: email,
      metadata: { role },
      error
    });
  }

  /**
   * Get recent authentication events
   */
  getRecentEvents(limit: number = 20): AuthEvent[] {
    return this.events.slice(-limit).reverse();
  }

  /**
   * Clear all events
   */
  clearEvents() {
    this.events = [];
  }

  /**
   * Export events as JSON
   */
  exportEvents(): string {
    return JSON.stringify(this.events, null, 2);
  }
}

// Export singleton instance
export const authEventManager = new AuthEventManager();

// Export for convenience
export default authEventManager;