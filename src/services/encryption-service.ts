import { logger } from '@/utils/logger';

// In a production environment, you would use a proper encryption library
// For this example, we'll implement a simple encryption service
// Note: This is NOT secure for production use - you should use a proper encryption library

export class EncryptionService {
  private static readonly ENCRYPTION_KEY = 'your-encryption-key-here'; // In production, use environment variables
  private static readonly IV_LENGTH = 16; // For AES, this is always 16

  /**
   * Encrypt sensitive data
   * Note: This is a simplified implementation for demonstration purposes
   * In production, use a proper encryption library like crypto-js or node-forge
   */
  static encrypt(data: string): string {
    try {
      // Simple XOR encryption for demonstration - NOT secure for production
      const key = this.ENCRYPTION_KEY;
      let encrypted = '';
      
      for (let i = 0; i < data.length; i++) {
        const charCode = data.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        encrypted += String.fromCharCode(charCode);
      }
      
      // Base64 encode the result
      return btoa(encrypted);
    } catch (error) {
      logger.errorWithContext('EncryptionService - encrypt', error);
      throw new Error('Failed to encrypt data');
    }
  }

  /**
   * Decrypt sensitive data
   * Note: This is a simplified implementation for demonstration purposes
   * In production, use a proper encryption library
   */
  static decrypt(encryptedData: string): string {
    try {
      // Base64 decode
      const decoded = atob(encryptedData);
      
      // Simple XOR decryption for demonstration - NOT secure for production
      const key = this.ENCRYPTION_KEY;
      let decrypted = '';
      
      for (let i = 0; i < decoded.length; i++) {
        const charCode = decoded.charCodeAt(i) ^ key.charCodeAt(i % key.length);
        decrypted += String.fromCharCode(charCode);
      }
      
      return decrypted;
    } catch (error) {
      logger.errorWithContext('EncryptionService - decrypt', error);
      throw new Error('Failed to decrypt data');
    }
  }

  /**
   * Hash data for integrity checking
   * Note: This is a simplified implementation for demonstration purposes
   * In production, use a proper hashing algorithm
   */
  static hash(data: string): string {
    try {
      // Simple hash function for demonstration - NOT cryptographically secure
      let hash = 0;
      for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
      }
      return hash.toString();
    } catch (error) {
      logger.errorWithContext('EncryptionService - hash', error);
      throw new Error('Failed to hash data');
    }
  }

  /**
   * Generate a secure random key
   * Note: This is a simplified implementation for demonstration purposes
   * In production, use a proper cryptographically secure random generator
   */
  static generateKey(length: number = 32): string {
    try {
      const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
      let result = '';
      for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * characters.length));
      }
      return result;
    } catch (error) {
      logger.errorWithContext('EncryptionService - generateKey', error);
      throw new Error('Failed to generate key');
    }
  }

  /**
   * Encrypt sensitive collection data
   */
  static encryptCollectionData(
    collectionData: {
      farmer_id?: string;
      staff_id?: string;
      notes?: string;
      location?: { latitude: number; longitude: number };
    }
  ): {
    farmer_id_encrypted?: string;
    staff_id_encrypted?: string;
    notes_encrypted?: string;
    location_encrypted?: string;
  } {
    try {
      const encryptedData: any = {};

      if (collectionData.farmer_id) {
        encryptedData.farmer_id_encrypted = this.encrypt(collectionData.farmer_id);
      }

      if (collectionData.staff_id) {
        encryptedData.staff_id_encrypted = this.encrypt(collectionData.staff_id);
      }

      if (collectionData.notes) {
        encryptedData.notes_encrypted = this.encrypt(collectionData.notes);
      }

      if (collectionData.location) {
        encryptedData.location_encrypted = this.encrypt(
          JSON.stringify(collectionData.location)
        );
      }

      return encryptedData;
    } catch (error) {
      logger.errorWithContext('EncryptionService - encryptCollectionData', error);
      throw new Error('Failed to encrypt collection data');
    }
  }

  /**
   * Decrypt sensitive collection data
   */
  static decryptCollectionData(
    encryptedData: {
      farmer_id_encrypted?: string;
      staff_id_encrypted?: string;
      notes_encrypted?: string;
      location_encrypted?: string;
    }
  ): {
    farmer_id?: string;
    staff_id?: string;
    notes?: string;
    location?: { latitude: number; longitude: number };
  } {
    try {
      const decryptedData: any = {};

      if (encryptedData.farmer_id_encrypted) {
        decryptedData.farmer_id = this.decrypt(encryptedData.farmer_id_encrypted);
      }

      if (encryptedData.staff_id_encrypted) {
        decryptedData.staff_id = this.decrypt(encryptedData.staff_id_encrypted);
      }

      if (encryptedData.notes_encrypted) {
        decryptedData.notes = this.decrypt(encryptedData.notes_encrypted);
      }

      if (encryptedData.location_encrypted) {
        const locationStr = this.decrypt(encryptedData.location_encrypted);
        decryptedData.location = JSON.parse(locationStr);
      }

      return decryptedData;
    } catch (error) {
      logger.errorWithContext('EncryptionService - decryptCollectionData', error);
      throw new Error('Failed to decrypt collection data');
    }
  }
}