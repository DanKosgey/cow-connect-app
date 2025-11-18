import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/utils/logger';

export class BiometricVerificationService {
  /**
   * Register biometric data for a staff member
   */
  static async registerBiometricData(
    staffId: string,
    biometricType: 'fingerprint' | 'face' | 'iris',
    biometricData: string // In a real implementation, this would be encrypted
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Check if biometric data already exists for this staff member
      const { data: existing, error: fetchError } = await supabase
        .from('staff_biometric_data')
        .select('id')
        .eq('staff_id', staffId)
        .eq('biometric_type', biometricType)
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('BiometricVerificationService - checking existing biometric data', fetchError);
        return { success: false, error: 'Failed to check existing biometric data' };
      }

      if (existing) {
        // Update existing biometric data
        const { error: updateError } = await supabase
          .from('staff_biometric_data')
          .update({
            biometric_data: biometricData,
            updated_at: new Date().toISOString()
          })
          .eq('id', existing.id);

        if (updateError) {
          logger.errorWithContext('BiometricVerificationService - updating biometric data', updateError);
          return { success: false, error: 'Failed to update biometric data' };
        }
      } else {
        // Insert new biometric data
        const { error: insertError } = await supabase
          .from('staff_biometric_data')
          .insert({
            staff_id: staffId,
            biometric_type: biometricType,
            biometric_data: biometricData,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          });

        if (insertError) {
          logger.errorWithContext('BiometricVerificationService - inserting biometric data', insertError);
          return { success: false, error: 'Failed to register biometric data' };
        }
      }

      return { success: true };
    } catch (error) {
      logger.errorWithContext('BiometricVerificationService - registerBiometricData', error);
      return { success: false, error: 'Failed to register biometric data' };
    }
  }

  /**
   * Verify biometric data for a staff member
   */
  static async verifyBiometricData(
    staffId: string,
    biometricType: 'fingerprint' | 'face' | 'iris',
    biometricData: string // In a real implementation, this would be compared with stored encrypted data
  ): Promise<{ success: boolean; error?: string }> {
    try {
      // Get stored biometric data
      const { data: storedData, error: fetchError } = await supabase
        .from('staff_biometric_data')
        .select('biometric_data')
        .eq('staff_id', staffId)
        .eq('biometric_type', biometricType)
        .maybeSingle();

      if (fetchError) {
        logger.errorWithContext('BiometricVerificationService - fetching biometric data', fetchError);
        return { success: false, error: 'Failed to fetch biometric data' };
      }

      if (!storedData) {
        return { success: false, error: 'No biometric data registered for this staff member' };
      }

      // In a real implementation, we would compare the biometric data using appropriate algorithms
      // For this example, we'll do a simple string comparison
      if (storedData.biometric_data === biometricData) {
        // Log successful verification
        await this.logBiometricVerification(staffId, biometricType, true);
        return { success: true };
      } else {
        // Log failed verification
        await this.logBiometricVerification(staffId, biometricType, false);
        return { success: false, error: 'Biometric verification failed' };
      }
    } catch (error) {
      logger.errorWithContext('BiometricVerificationService - verifyBiometricData', error);
      return { success: false, error: 'Failed to verify biometric data' };
    }
  }

  /**
   * Log biometric verification attempts
   */
  static async logBiometricVerification(
    staffId: string,
    biometricType: string,
    success: boolean
  ) {
    try {
      const { error: logError } = await supabase
        .from('biometric_verification_logs')
        .insert({
          staff_id: staffId,
          biometric_type: biometricType,
          success: success,
          created_at: new Date().toISOString()
        });

      if (logError) {
        logger.warn('Warning: Failed to log biometric verification attempt', logError);
      }
    } catch (error) {
      logger.errorWithContext('BiometricVerificationService - logBiometricVerification', error);
    }
  }

  /**
   * Get biometric verification history for a staff member
   */
  static async getVerificationHistory(staffId: string, limit: number = 50) {
    try {
      const { data: history, error } = await supabase
        .from('biometric_verification_logs')
        .select(`
          id,
          biometric_type,
          success,
          created_at
        `)
        .eq('staff_id', staffId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        logger.errorWithContext('BiometricVerificationService - fetching verification history', error);
        throw error;
      }

      return history || [];
    } catch (error) {
      logger.errorWithContext('BiometricVerificationService - getVerificationHistory', error);
      throw error;
    }
  }

  /**
   * Check if a staff member has registered biometric data
   */
  static async hasBiometricData(staffId: string): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('staff_biometric_data')
        .select('*', { count: 'exact', head: true })
        .eq('staff_id', staffId);

      if (error) {
        logger.errorWithContext('BiometricVerificationService - checking biometric data existence', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (error) {
      logger.errorWithContext('BiometricVerificationService - hasBiometricData', error);
      return false;
    }
  }
}