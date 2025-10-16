import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class FarmerActivityLogger {
  private static instance: FarmerActivityLogger;
  private userId: string | null = null;
  private sessionStartTime: number | null = null;

  private constructor() {}

  static getInstance(): FarmerActivityLogger {
    if (!FarmerActivityLogger.instance) {
      FarmerActivityLogger.instance = new FarmerActivityLogger();
    }
    return FarmerActivityLogger.instance;
  }

  setUserId(userId: string | null) {
    this.userId = userId;
    if (userId) {
      this.sessionStartTime = Date.now();
      this.logActivity('SESSION_START', 'User session started');
    } else {
      this.logActivity('SESSION_END', 'User session ended');
      this.sessionStartTime = null;
    }
  }

  async logActivity(action: string, details?: string, metadata?: any) {
    // Don't log if no user is authenticated
    if (!this.userId) {
      logger.debug('[FarmerActivityLogger] No user authenticated, skipping activity log', { action, details });
      return;
    }

    try {
      const activityData = {
        user_id: this.userId,
        action,
        details: details || '',
        metadata: metadata || {},
        timestamp: new Date().toISOString(),
        session_duration: this.sessionStartTime ? Date.now() - this.sessionStartTime : null
      };

      // Log to console for development
      logger.info('[FarmerActivityLogger] Activity logged', activityData);

      // In production, you might want to send this to your analytics service
      // For now, we'll just log to console and optionally to Supabase
      if (import.meta.env.DEV) {
        console.log('[FARMER_ACTIVITY]', activityData);
      }

      // Optionally log to Supabase (uncomment if you want to store in database)
      /*
      const { error } = await supabase
        .from('farmer_activities')
        .insert([activityData]);

      if (error) {
        logger.warn('[FarmerActivityLogger] Failed to log activity to Supabase', error);
      }
      */
    } catch (error) {
      logger.error('[FarmerActivityLogger] Error logging activity', error);
    }
  }

  async logPageView(page: string, additionalData?: any) {
    await this.logActivity('PAGE_VIEW', `Visited ${page}`, additionalData);
  }

  async logButtonClick(buttonName: string, additionalData?: any) {
    await this.logActivity('BUTTON_CLICK', `Clicked ${buttonName}`, additionalData);
  }

  async logFormSubmission(formName: string, additionalData?: any) {
    await this.logActivity('FORM_SUBMISSION', `Submitted ${formName}`, additionalData);
  }

  async logError(errorType: string, errorMessage: string, additionalData?: any) {
    await this.logActivity('ERROR', `${errorType}: ${errorMessage}`, additionalData);
  }

  getSessionDuration(): number | null {
    if (this.sessionStartTime) {
      return Date.now() - this.sessionStartTime;
    }
    return null;
  }
}

export const farmerActivityLogger = FarmerActivityLogger.getInstance();