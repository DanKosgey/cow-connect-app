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
  age: number;
  idNumber: string;
  nationalId: string;
  address: string;
  farmLocation: string;
  gender: string;
  
  // Farm information
  numberOfCows: number;
  cowBreeds: { breedName: string; count: number }[];
  breedingMethod: string;
  feedingType: string;
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
          age: data.age,
          idNumber: data.idNumber,
          nationalId: data.nationalId,
          address: data.address,
          farmLocation: data.farmLocation,
          gender: data.gender,
          numberOfCows: data.numberOfCows,
          cowBreeds: data.cowBreeds,
          breedingMethod: data.breedingMethod,
          feedingType: data.feedingType
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
        .upsert([{
          id: userId,
          full_name: pendingData.fullName,
          phone: pendingData.phone
        }], {
          onConflict: 'id'
        });

      if (profileError) {
        throw new Error(`Profile creation failed: ${profileError.message}`);
      }

      logger.info('User profile created', { userId });

      // Step 2: Create user role
      const { error: roleError } = await supabase
        .from('user_roles')
        .upsert([{
          user_id: userId,
          role: 'farmer',
          active: true
        }], {
          onConflict: 'user_id'
        });

      if (roleError) {
        throw new Error(`Role creation failed: ${roleError.message}`);
      }

      // Step 3: Create pending farmer record with draft status
      const { data: pendingFarmerData, error: pendingFarmerError } = await supabase
        .from('pending_farmers')
        .insert([{
          user_id: userId,
          full_name: pendingData.fullName,
          email: pendingData.email,
          phone_number: pendingData.phone,
          gender: pendingData.farmerData.gender,
          age: pendingData.farmerData.age,
          id_number: pendingData.farmerData.idNumber,
          national_id: pendingData.farmerData.nationalId,
          address: pendingData.farmerData.address,
          farm_location: pendingData.farmerData.farmLocation,
          number_of_cows: pendingData.farmerData.numberOfCows,
          cow_breeds: pendingData.farmerData.cowBreeds,
          breeding_method: pendingData.farmerData.breedingMethod,
          feeding_type: pendingData.farmerData.feedingType,
          status: 'draft', // Set to draft for document upload
          email_verified: true, // Mark as verified since we're skipping email verification
          registration_number: `PF-${Date.now()}`
        }])
        .select()
        .single();

      if (pendingFarmerError) {
        throw new Error(`Pending farmer record creation failed: ${pendingFarmerError.message}`);
      }

      const pendingFarmerId = pendingFarmerData.id;
      logger.info('Pending farmer record created with draft status', { pendingFarmerId });

      logger.info('Farmer registration completed successfully with draft status', { userId, pendingFarmerId });
      
      return {
        success: true,
        userId,
        pendingFarmerId,
        message: 'Registration completed successfully. Please upload your documents to complete the process.'
      };
    } catch (error) {
      logger.error('Farmer registration completion failed', { error });
      throw error;
    }
  }

  /**
   * Upload a document for a farmer
   */
  static async uploadDocument(pendingFarmerId: string, file: File, documentType: string) {
    try {
      // Upload file to Supabase Storage
      const fileName = `${documentType}-${Date.now()}.${file.name.split('.').pop()}`;
      const filePath = `${pendingFarmerId}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage
        .from('kyc-documents')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`Failed to upload document: ${uploadError.message}`);
      }

      // Create a record in the kyc_documents table
      const { data: docData, error: docError } = await supabase
        .from('kyc_documents')
        .insert([{
          pending_farmer_id: pendingFarmerId,
          document_type: documentType,
          file_name: file.name,
          file_path: filePath,
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
        const { data: pendingFarmerData, error: pendingFarmerError } = await supabase
          .from('pending_farmers')
          .select('full_name')
          .eq('id', pendingFarmerId)
          .single();

        if (!pendingFarmerError && pendingFarmerData) {
          const farmerName = pendingFarmerData.full_name || 'A farmer';
          const documentLabels: Record<string, string> = {
            'national_id_front': 'National ID Front',
            'national_id_back': 'National ID Back',
            'selfie_1': 'Selfie 1',
            'selfie_2': 'Selfie 2',
            'selfie_3': 'Selfie 3'
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
      logger.error('Document upload failed', { error, pendingFarmerId, documentType });
      throw error;
    }
  }

  /**
   * Submit KYC documents for review
   */
  static async submitKycForReview(pendingFarmerId: string, userId: string) {
    try {
      const { data, error } = await supabase.rpc('submit_kyc_for_review', {
        p_pending_farmer_id: pendingFarmerId,
        p_user_id: userId
      });

      if (error) {
        throw new Error(`Failed to submit KYC for review: ${error.message}`);
      }

      if (!data.success) {
        throw new Error(data.message);
      }

      return data;
    } catch (error) {
      logger.error('KYC submission failed', { error, pendingFarmerId });
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

    if (!data.age || data.age < 18 || data.age > 100) {
      errors.push('Age must be between 18 and 100');
    }

    if (!data.idNumber || data.idNumber.length < 2) {
      errors.push('ID Number is required');
    }

    if (!data.nationalId || data.nationalId.length < 2) {
      errors.push('National ID is required');
    }

    if (!data.address || data.address.length < 5) {
      errors.push('Valid address is required');
    }

    if (!data.farmLocation || data.farmLocation.length < 3) {
      errors.push('Farm location is required');
    }

    if (!data.numberOfCows || data.numberOfCows <= 0) {
      errors.push('Number of cows must be greater than 0');
    }

    if (!data.breedingMethod) {
      errors.push('Breeding method is required');
    }

    if (!data.feedingType) {
      errors.push('Feeding type is required');
    }

    if (!data.cowBreeds || data.cowBreeds.length === 0) {
      errors.push('At least one cow breed is required');
    }

    if (!data.gender) {
      errors.push('Gender is required');
    }

    // Validate cow breeds
    for (const breed of data.cowBreeds) {
      if (!breed.breedName || breed.breedName.trim() === '') {
        errors.push('All cow breeds must have a name');
      }
      if (!breed.count || breed.count <= 0) {
        errors.push('All cow breeds must have a count greater than 0');
      }
    }

    // Validate that total cows across breeds doesn't exceed total number of cows
    const totalCowsInBreeds = data.cowBreeds.reduce((sum, breed) => sum + breed.count, 0);
    if (totalCowsInBreeds > data.numberOfCows) {
      errors.push('Total cows across breeds cannot exceed total number of cows');
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}