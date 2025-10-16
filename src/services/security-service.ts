import { supabase } from '@/integrations/supabase/client';

interface SecurityOptions {
  sessionTimeout: number; // in minutes
  maxLoginAttempts: number;
  rateLimitRequests: number;
  rateLimitWindow: number; // in minutes
}

class SecurityService {
  private lastActivity: number = Date.now();
  private loginAttempts: Map<string, { count: number; lastAttempt: number }> = new Map();
  private rateLimitMap: Map<string, { count: number; resetTime: number }> = new Map();
  private activityTimer: NodeJS.Timeout | null = null;
  private adminMetricsMonitoring: boolean = false;

  // Extended options for admin security
  private adminOptions: SecurityOptions = {
    sessionTimeout: 15,
    maxLoginAttempts: 3,
    rateLimitRequests: 200,
    rateLimitWindow: 1
  };

  setAdminOptions(options: Partial<SecurityOptions>) {
    this.adminOptions = { ...this.adminOptions, ...options };
    this.startAdminMetricsMonitoring();
  }

  private startAdminMetricsMonitoring() {
    if (this.adminMetricsMonitoring) return;
    this.adminMetricsMonitoring = true;

    // Monitor security-related metrics
    setInterval(() => {
      this.monitorSecurityMetrics();
    }, 60000); // Every minute
  }

  private async monitorSecurityMetrics() {
    try {
      // Monitor login attempts
      const suspiciousAttempts = Array.from(this.loginAttempts.entries())
        .filter(([_, data]) => data.count >= this.adminOptions.maxLoginAttempts / 2);

      if (suspiciousAttempts.length > 0) {
        await this.notifySecurityEvent('excessive_login_attempts', {
          attempts: suspiciousAttempts
        });
      }

      // Monitor rate limits
      const rateLimitViolations = Array.from(this.rateLimitMap.entries())
        .filter(([_, data]) => data.count >= this.adminOptions.rateLimitRequests);

      if (rateLimitViolations.length > 0) {
        await this.notifySecurityEvent('rate_limit_violations', {
          violations: rateLimitViolations
        });
      }
    } catch (error) {
      console.error('Error monitoring security metrics:', error);
    }
  }

  private async notifySecurityEvent(type: string, data: any) {
    try {
      await supabase.from('security_events').insert({
        event_type: type,
        data,
        severity: 'high',
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error logging security event:', error);
    }
  }

  private options: SecurityOptions = {
    sessionTimeout: 30, // 30 minutes default
    maxLoginAttempts: 5,
    rateLimitRequests: 100,
    rateLimitWindow: 1 // 1 minute
  };

  constructor(options?: Partial<SecurityOptions>) {
    this.options = { ...this.options, ...options };
    this.setupActivityMonitoring();
  }

  private setupActivityMonitoring() {
    if (typeof window !== 'undefined') {
      // Monitor user activity
      ['mousedown', 'keydown', 'scroll', 'touchstart'].forEach(event => {
        window.addEventListener(event, () => this.updateLastActivity());
      });

      // Start the session check timer
      this.startActivityTimer();
    }
  }

  private startActivityTimer() {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }

    this.activityTimer = setInterval(() => {
      this.checkSession();
    }, 60000); // Check every minute
  }

  private updateLastActivity() {
    this.lastActivity = Date.now();
  }

  private async checkSession() {
    const inactiveTime = (Date.now() - this.lastActivity) / 1000 / 60; // Convert to minutes
    
    if (inactiveTime >= this.options.sessionTimeout) {
      await this.handleSessionTimeout();
    }
  }

  private async handleSessionTimeout() {
    try {
      // Log out the user
      await supabase.auth.signOut();
      
      // Clear any stored session data
      localStorage.removeItem('staffSession');
      sessionStorage.clear();
      
      // Redirect to login page
      window.location.href = '/staff/login?reason=session_timeout';
    } catch (error) {
      console.error('Error handling session timeout:', error);
    }
  }

  async trackLoginAttempt(email: string): Promise<boolean> {
    const now = Date.now();
    const attempts = this.loginAttempts.get(email) || { count: 0, lastAttempt: now };

    // Reset attempts if last attempt was more than 30 minutes ago
    if (now - attempts.lastAttempt > 30 * 60 * 1000) {
      attempts.count = 0;
    }

    attempts.count++;
    attempts.lastAttempt = now;
    this.loginAttempts.set(email, attempts);

    // Check if exceeded max attempts
    if (attempts.count > this.options.maxLoginAttempts) {
      await this.handleExcessiveLoginAttempts(email);
      return false;
    }

    return true;
  }

  private async handleExcessiveLoginAttempts(email: string) {
    try {
      // Log security event
      await supabase
        .from('security_events')
        .insert({
          event_type: 'excessive_login_attempts',
          user_email: email,
          details: {
            attempts: this.loginAttempts.get(email)?.count,
            ip_address: await this.getClientIP()
          }
        });

      // Optionally trigger account lockout
      await this.lockAccount(email);
    } catch (error) {
      console.error('Error handling excessive login attempts:', error);
    }
  }

  private async lockAccount(email: string) {
    try {
      await supabase
        .from('staff')
        .update({ status: 'locked' })
        .eq('email', email);

      // Notify admin
      await this.notifyAdminOfLockout(email);
    } catch (error) {
      console.error('Error locking account:', error);
    }
  }

  private async notifyAdminOfLockout(email: string) {
    try {
      await supabase.functions.invoke('notify-admin-account-lockout', {
        body: { email }
      });
    } catch (error) {
      console.error('Error notifying admin:', error);
    }
  }

  async checkRateLimit(endpoint: string, userId: string): Promise<boolean> {
    const now = Date.now();
    const key = `${endpoint}:${userId}`;
    const limit = this.rateLimitMap.get(key) || { count: 0, resetTime: now + (this.options.rateLimitWindow * 60 * 1000) };

    // Reset if window has passed
    if (now > limit.resetTime) {
      limit.count = 0;
      limit.resetTime = now + (this.options.rateLimitWindow * 60 * 1000);
    }

    limit.count++;
    this.rateLimitMap.set(key, limit);

    return limit.count <= this.options.rateLimitRequests;
  }

  private async getClientIP(): Promise<string> {
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      const data = await response.json();
      return data.ip;
    } catch (error) {
      console.error('Error getting client IP:', error);
      return 'unknown';
    }
  }

  // Clean up on component unmount
  cleanup() {
    if (this.activityTimer) {
      clearInterval(this.activityTimer);
    }
    this.loginAttempts.clear();
    this.rateLimitMap.clear();
  }
}

export const securityService = new SecurityService();