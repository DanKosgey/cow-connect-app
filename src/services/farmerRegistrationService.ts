import { supabase } from "../integrations/supabase/client";
import { logger } from "../utils/logger";
import { notificationService } from "./notification-service";

export interface FarmerRegistrationData {
  // User auth data
  email: string;
  password: string;
  confirmPassword: string;
  fullName: string;
  phone: string;
  
  // Personal information
  nationalId: string;
  dob: string;
  gender: string;
  address: string;
  
  // Farm details
  farmName: string;
  farmLocation: string;
  farmSize: number;
  experience: number;
  numCows: number;
  numDairyCows: number;
  primaryBreed: string;
  avgProduction: number;
  farmingType: string;
  additionalInfo: string;
  
  // Bank details
  bankName: string;
  accountNumber: string;
  accountName: string;
  
  // Documents (will be uploaded separately)
  nationalIdFile?: File;
  farmCertFile?: File;
  kraPinFile?: File;
}

export class FarmerRegistrationService {
  /**
   * Start farmer registration process
   * This creates the user account and stores pending registration data
   * The user will need to confirm their email before completing registration
   */
  static async startRegistration(data: FarmerRegistrationData) {
    try {
      // Step 1: Create user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          emailRedirectTo: `${window.location.origin}/auth/callback`,
          data: {
            full_name: data.fullName,
            phone: data.phone,
            role: 'farmer'
          }
        }
      });

      if (authError) {
        throw new Error(`Authentication failed: ${authError.message}`);
      }

      if (!authData.user) {
        throw new Error('Failed to create user account');
      }

      const userId = authData.user.id;
      logger.info('User account created', { userId });

      // Step 2: Store pending registration data in localStorage
      // This will be used after email confirmation to complete registration
      const pendingRegistrationData = {
        userId: userId,
        fullName: data.fullName,
        email: data.email,
        phone: data.phone,
        role: 'farmer',
        createdAt: new Date().toISOString(),
        farmerData: {
          nationalId: data.nationalId,
          address: data.address,
          farmLocation: data.farmLocation,
          farmName: data.farmName,
          farmSize: data.farmSize,
          experience: data.experience,
          numCows: data.numCows,
          numDairyCows: data.numDairyCows,
          primaryBreed: data.primaryBreed,
          avgProduction: data.avgProduction,
          farmingType: data.farmingType,
          additionalInfo: data.additionalInfo,
          dob: data.dob,
          gender: data.gender,
          bankName: data.bankName,
          accountNumber: data.accountNumber,
          accountName: data.accountName
        }
      };

      // Store in localStorage for use after email confirmation
      localStorage.setItem('pending_profile', JSON.stringify(pendingRegistrationData));

      logger.info('Pending registration data stored', { userId });

      return {
        success: true,
        userId,
        message: 'Registration started successfully. Please check your email to confirm your account.'
      };
    } catch (error) {
      logger.error('Farmer registration start failed', { error });
      throw error;
    }
  }

  /**
   * Complete farmer registration after email confirmation
   * This should be called after the user has confirmed their email and signed in
   */
  static async completeRegistration(userId: string, pendingData: any) {
    try {
      // Step 1: Create user profile
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          id: userId,
          full_name: pendingData.fullName,
          email: pendingData.email,
          phone: pendingData.phone
        }]);

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      logger.info('User profile created', { userId });

      // Step 2: Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert([{
          user_id: userId,
          role: 'farmer'
        }]);

      if (roleError) {
        throw new Error(`Role creation failed: ${roleError.message}`);
      }

      // Step 3: Create farmer record with pending status
      const { data: farmerData, error: farmerError } = await supabase
        .from('farmers')
        .insert([{
          user_id: userId,
          registration_number: `F-${Date.now()}`,
          national_id: pendingData.farmerData.nationalId,
          phone_number: pendingData.phone,
          full_name: pendingData.fullName,
          address: pendingData.farmerData.address,
          farm_location: pendingData.farmerData.farmLocation,
          kyc_status: 'pending', // Set to pending for KYC approval
          registration_completed: false // Set to false until KYC is approved
        }])
        .select()
        .single();

      if (farmerError) {
        throw new Error(`Farmer record creation failed: ${farmerError.message}`);
      }

      const farmerId = farmerData.id;
      logger.info('Farmer record created with pending status', { farmerId });

      // Step 4: Create farmer analytics record
      const { error: analyticsError } = await supabase
        .from('farmer_analytics')
        .insert([{
          farmer_id: farmerId,
          total_collections: 0,
          total_liters: 0,
          current_month_liters: 0,
          current_month_earnings: 0,
          avg_quality_score: 0
        }]);

      if (analyticsError) {
        logger.warn('Analytics record creation failed', { error: analyticsError });
        // Don't throw error here as this is not critical for registration
      }

      logger.info('Farmer analytics record created', { farmerId });

      // Step 5: Store additional farmer details
      const { error: updateError } = await supabase
        .from('farmers')
        .update({
          // Additional farm details
          farm_name: pendingData.farmerData.farmName,
          farm_size: pendingData.farmerData.farmSize,
          years_experience: pendingData.farmerData.experience,
          total_cows: pendingData.farmerData.numCows,
          dairy_cows: pendingData.farmerData.numDairyCows,
          primary_breed: pendingData.farmerData.primaryBreed,
          avg_daily_production: pendingData.farmerData.avgProduction,
          farming_type: pendingData.farmerData.farmingType,
          additional_info: pendingData.farmerData.additionalInfo,
          // Bank details
          bank_name: pendingData.farmerData.bankName,
          bank_account_number: pendingData.farmerData.accountNumber,
          bank_account_name: pendingData.farmerData.accountName,
          // Personal details
          date_of_birth: pendingData.farmerData.dob,
          gender: pendingData.farmerData.gender
        })
        .eq('id', farmerId);

      if (updateError) {
        logger.warn('Failed to update additional farmer details', { error: updateError });
        // Don't throw error here as the core registration is complete
      }

      logger.info('Farmer registration completed successfully with pending status', { userId, farmerId });
      
      return {
        success: true,
        userId,
        farmerId,
        message: 'Registration completed successfully. Your profile is now pending admin KYC verification.'
      };
    } catch (error) {
      logger.error('Farmer registration completion failed', { error });
      throw error;
    }
  }

  /**
   * Upload a document for a farmer
   */
  static async uploadDocument(farmerId: string, file: File, documentType: string) {
    try {
      // In a real implementation, you would upload to Supabase Storage
      // For now, we'll just log the upload
      logger.info('Document uploaded', { farmerId, documentType, fileName: file.name });
      
      // Create a record in the kyc_documents table
      const { data: docData, error: docError } = await supabase
        .from('kyc_documents')
        .insert([{
          farmer_id: farmerId,
          document_type: documentType,
          file_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          status: 'pending'
        }])
        .select()
        .single();

      if (docError) {
        logger.warn('Failed to create document record', { error: docError });
        throw new Error(`Failed to save document metadata: ${docError.message}`);
      }

      // Send notification to admins about new document upload
      try {
        const { data: farmerData, error: farmerError } = await supabase
          .from('farmers')
          .select('full_name')
          .eq('id', farmerId)
          .single();

        if (!farmerError && farmerData) {
          const farmerName = farmerData.full_name || 'A farmer';
          const documentLabels: Record<string, string> = {
            'national_id': 'National ID',
            'farm_cert': 'Farm Certificate',
            'kra_pin': 'KRA PIN Certificate'
          };
          
          const documentLabel = documentLabels[documentType] || documentType;
          
          await notificationService.sendAdminNotification(
            'New KYC Document Uploaded',
            `${farmerName} has uploaded a ${documentLabel} for KYC verification.`,
            'kyc'
          );
        }
      } catch (notificationError) {
        logger.warn('Failed to send admin notification about document upload', { error: notificationError });
      }

      return docData;
    } catch (error) {
      logger.error('Document upload failed', { error, farmerId, documentType });
      throw error;
    }
  }

  /**
   * Validate registration data
   */
  static validateRegistrationData(data: FarmerRegistrationData): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Validate required fields
    if (!data.email || !data.email.includes('@')) {
      errors.push('Valid email is required');
    }

    if (!data.password || data.password.length < 6) {
      errors.push('Password must be at least 6 characters');
    }

    if (data.password !== data.confirmPassword) {
      errors.push('Passwords do not match');
    }

    if (!data.fullName || data.fullName.length < 2) {
      errors.push('Full name is required');
    }

    if (!data.phone || !data.phone.match(/^\+254[1-9]\d{8}$/)) {
      errors.push('Valid Kenyan phone number is required (format: +254...)');
    }

    if (!data.nationalId || data.nationalId.length < 2) {
      errors.push('National ID is required');
    }

    if (!data.dob) {
      errors.push('Date of birth is required');
    }

    if (!data.gender) {
      errors.push('Gender is required');
    }

    if (!data.address || data.address.length < 5) {
      errors.push('Valid address is required');
    }

    if (!data.farmName || data.farmName.length < 2) {
      errors.push('Farm name is required');
    }

    if (!data.farmLocation || data.farmLocation.length < 3) {
      errors.push('Farm location is required');
    }

    if (data.farmSize <= 0) {
      errors.push('Farm size must be greater than 0');
    }

    if (data.experience < 0) {
      errors.push('Experience must be 0 or greater');
    }

    if (data.numCows < 1) {
      errors.push('Number of cows must be at least 1');
    }

    if (data.numDairyCows < 0) {
      errors.push('Number of dairy cows must be 0 or greater');
    }

    if (data.avgProduction < 0) {
      errors.push('Average production must be 0 or greater');
    }

    if (!data.farmingType) {
      errors.push('Farming type is required');
    }

    if (!data.bankName || data.bankName.length < 2) {
      errors.push('Bank name is required');
    }

    if (!data.accountNumber || data.accountNumber.length < 5) {
      errors.push('Account number is required');
    }

    if (!data.accountName || data.accountName.length < 2) {
      errors.push('Account name is required');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}