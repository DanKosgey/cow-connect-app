import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { z } from "zod";
import { useToast } from "@/components/ui/use-toast";
import {
  Users,
  Eye,
  EyeOff,
  Mail,
  Phone,
  User,
  MapPin,
  FileText,
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
    numberOfCows: '',
    breedingMethod: '',
    feedingType: '',
    farmLocation: '',
    primaryBreed: '',
    breedCount: '',
    idFrontFile: null,
    idBackFile: null,
    selfieFile: null,
    idFrontPreview: null,
    idBackPreview: null,
    selfiePreview: null
  });
  Camera,
  Loader2,
  CheckCircle,
  ChevronRight,
  Milk,
  Home,
  ArrowLeft,
  Map,
  X,
  Upload,
  ImageIcon
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";

// Types and utilities
import { validateEmail, validatePassword, PHONE_REGEX } from '../../utils/validation';
import { getAttemptsForEmail, recordOtpAttempt } from '../../utils/auth';

// Validation schemas using Zod
const emailSchema = z.string()
  .email("Invalid email address")
  .min(1, "Email is required");

const phoneSchema = z.string()
  .regex(/^\+254[1-9]\d{8}$/, "Invalid Kenyan phone number format (+254...)");

const passwordSchema = z.string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[@$!%*?&]/, "Password must contain at least one special character");

const imageSchema = z.object({
  type: z.string().refine(
    type => ['image/jpeg', 'image/png', 'image/jpg'].includes(type),
    "File must be a JPEG or PNG image"
  ),
  size: z.number().max(5 * 1024 * 1024, "File must be smaller than 5MB")
});

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  age: string;
  gender: string;
  idNumber: string;
  password: string;
  confirmPassword: string;
  numberOfCows: string;
  breedingMethod: string;
  feedingType: string;
  farmLocation: string;
  primaryBreed: string;
  breedCount: string;
  idFrontFile: File | null;
  idBackFile: File | null;
  selfieFile: File | null;
  idFrontPreview: string | null;
  idBackPreview: string | null;
  selfiePreview: string | null;
}

// Validation utils
const validateField = <T,>(schema: z.ZodType<T>, value: T) => {
  try {
    schema.parse(value);
    return { isValid: true };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { isValid: false, error: error.errors[0]?.message };
    }
    return { isValid: false, error: "Invalid value" };
  }
};


import useToastNotifications from "@/hooks/useToastNotifications";
import { AuthService } from "@/services/auth-service";
import { OtpService } from "@/services/otp-service";
import { supabase } from "@/integrations/supabase/client";

const MIN_IMAGE_DIMENSIONS = { width: 600, height: 400 };

const FarmerSignup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  // Use shared validation utilities (validateEmail/validatePassword)

  const validateImage = async (file: File): Promise<{ isValid: boolean; error?: string }> => {
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);

      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        if (img.width < MIN_IMAGE_DIMENSIONS.width || img.height < MIN_IMAGE_DIMENSIONS.height) {
          resolve({
            isValid: false,
            error: `Image must be at least ${MIN_IMAGE_DIMENSIONS.width}x${MIN_IMAGE_DIMENSIONS.height} pixels`
          });
          return;
        }
        resolve({ isValid: true });
      };

      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve({
          isValid: false,
          error: 'Failed to process image. Please try a different file.'
        });
      };

      img.src = objectUrl;
    });
  };
  
  // OTP limits (client-side guidance)
  const OTP_ATTEMPT_LIMIT = 3;
  const OTP_ATTEMPT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes

  // Global cooldown timer for resendCooldown so setting it anywhere causes a visible countdown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(t);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(t);
  }, [resendCooldown]);

  // Handle authentication errors from URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    const error = urlParams.get('error');
    const errorCode = urlParams.get('error_code');
    const errorDescription = urlParams.get('error_description');
    
    if (error || errorCode) {
      console.error('Authentication error:', { error, errorCode, errorDescription });
      
      if (errorCode === 'otp_expired' || errorDescription?.includes('expired')) {
        toast.error('Link Expired', 'Your previous email confirmation link has expired. Please complete the registration form again.');
        localStorage.removeItem('pending_profile');
      } else if (error === 'access_denied') {
        toast.error('Access Denied', errorDescription || 'Access was denied. Please try again.');
      } else {
        toast.error('Authentication Error', errorDescription || 'There was an error processing your authentication.');
      }
    }
  }, [location.search, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Constants for file validation
  const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
  const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
  const MIN_IMAGE_DIMENSIONS = { width: 600, height: 400 }; // Minimum dimensions for readable documents

  // Handle file uploads for KYC
  const handleFileChange = (field: 'idFrontFile' | 'idBackFile' | 'selfieFile', file: File | null) => {
    if (!file) {
      setFormData(prev => ({
        ...prev,
        [field]: null,
        [`${field.replace('File', 'Preview')}`]: ""
      }));
      return;
    }

    // Validate file type
    if (!file.type.startsWith('image/') || !['jpeg', 'png', 'jpg'].includes(file.type.split('/')[1])) {
      toast.error("Invalid File", "Please upload a JPEG or PNG image file");
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      toast.error("File Too Large", "Please upload an image smaller than 5MB");
      return;
    }

    // Create preview with basic validation
    const reader = new FileReader();
    reader.onloadend = () => {
      // Basic image validation
      const img = new Image();
      img.onload = () => {
        const minDimensions = { width: 600, height: 400 };
        if (img.width < minDimensions.width || img.height < minDimensions.height) {
          toast.error(
            "Image Too Small", 
            `Image must be at least ${minDimensions.width}x${minDimensions.height} pixels`
          );
          return;
        }

        setFormData(prev => ({
          ...prev,
          [field]: file,
          [`${field.replace('File', 'Preview')}`]: reader.result as string
        }));
      };

      img.onerror = () => {
        toast.error("Invalid Image", "Failed to process image. Please try a different file.");
      };

      img.src = reader.result as string;
    };

    reader.onerror = () => {
      toast.error("File Error", "Failed to read file. Please try again.");
    };

    reader.readAsDataURL(file);
  };

  // formData declared below with typed FormData

  const validateStep = (step: number): { isValid: boolean; error?: string } => {
    try {
      if (step === 1) {
        // Required fields check
        const requiredFields = ['fullName', 'email', 'phone', 'gender', 'age', 'idNumber'] as const;
        for (const field of requiredFields) {
          if (!formData[field]?.trim()) {
            return { isValid: false, error: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required` };
          }
        }

        // Email validation
        const emailValidation = validateEmail(formData.email);
        if (!emailValidation.isValid) return { isValid: false, error: emailValidation.error };

        // Phone validation
        if (!PHONE_REGEX.test(formData.phone)) return { isValid: false, error: 'Please enter a valid Kenyan phone number (+254...)' };

        // Age validation
        const age = Number(formData.age);
        if (isNaN(age) || age < 18 || age > 100) {
          return { isValid: false, error: "Age must be between 18 and 100" };
        }

        // Password validation
        const passwordValidation = validatePassword({ password: formData.password, confirmPassword: formData.confirmPassword });
        if (!passwordValidation.isValid) return { isValid: false, error: passwordValidation.error };

        // OTP verification check
        if (!otpVerified) {
          return { isValid: false, error: "Please verify your email with the OTP before continuing" };
        }

      } else if (step === 2) {
        // Farm Details validation
        const requiredFarmFields = ['numberOfCows', 'breedingMethod', 'feedingType', 'farmLocation'] as const;
        for (const field of requiredFarmFields) {
          if (!formData[field]?.trim()) {
            return { 
  // form data (single, typed state)
  const [formData, setFormData] = useState<FormData>({
    fullName: '',
    email: '',
    phone: '',
    age: '',
    gender: '',
    idNumber: '',
    password: '',
    confirmPassword: '',
    numberOfCows: '',
    breedingMethod: '',
    feedingType: '',
    farmLocation: '',
    primaryBreed: '',
    breedCount: '',
    idFrontFile: null,
    idBackFile: null,
    selfieFile: null,
    idFrontPreview: null,
    idBackPreview: null,
    selfiePreview: null
  });
              isValid: false, 
              error: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required` 
            };
          }
        }

        // Numeric validations
        const numCows = Number(formData.numberOfCows);
        if (isNaN(numCows) || numCows <= 0) {
          return { isValid: false, error: "Please enter a valid number of cows" };
        }

        // Breed validation
        if (!formData.primaryBreed?.trim()) {
          return { isValid: false, error: "Please select a primary breed" };
        }

        const breedCount = Number(formData.breedCount);
        if (isNaN(breedCount) || breedCount <= 0) {
          return { isValid: false, error: "Please enter a valid breed count" };
        }

        if (breedCount > numCows) {
          return { 
            isValid: false, 
            error: "Breed count cannot exceed total number of cows" 
          };
        }

      } else if (step === 3) {
        // KYC Documents validation
        const requiredFiles = [
          { file: formData.idFrontFile, name: 'ID front photo' },
          { file: formData.idBackFile, name: 'ID back photo' },
          { file: formData.selfieFile, name: 'selfie photo' }
        ];

        for (const { file, name } of requiredFiles) {
          if (!file) {
            return { isValid: false, error: `Please upload ${name}` };
          }
          
          if (!ALLOWED_FILE_TYPES.includes(file.type)) {
            return { 
              isValid: false, 
              error: `${name} must be a JPEG or PNG file` 
            };
          }

          if (file.size > MAX_FILE_SIZE) {
            return { 
              isValid: false, 
              error: `${name} must be less than 5MB` 
            };
          }
        }
      }

      return { isValid: true };
    } catch (error) {
      console.error('Validation error:', error);
      return { 
        isValid: false, 
        error: "An error occurred during validation. Please try again." 
      };
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const getLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Geolocation is not supported by your browser");
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const locationText = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
          setFormData(prev => ({ ...prev, farmLocation: locationText }));
          toast.success("Location Captured", "Your GPS coordinates have been captured");
        } catch (error) {
          console.error("Error getting location:", error);
          toast.error("Location Error", "Could not get your location. Please enter manually.");
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        toast.error("Location Error", "Could not get your location. Please enter manually.");
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  // Create user and send OTP for verification
  const sendOtp = async () => {
    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      toast.error(emailValidation.error || 'Enter a valid email first');
      return;
    }

    // Rate limit check
    const attempts = getAttemptsForEmail(formData.email);
    if (attempts.length >= OTP_ATTEMPT_LIMIT) {
      const oldestAttempt = attempts[0];
      const timeLeft = Math.ceil((oldestAttempt + OTP_ATTEMPT_WINDOW_MS - Date.now()) / 1000 / 60);
      toast.error(
        'Too Many Attempts', 
        `Please wait ${timeLeft} minutes before requesting another code`
      );
      return;
    }

    // Password validation
    const passwordValidation = validatePassword(formData);
    if (!passwordValidation.isValid) {
      toast.error('Password Error', passwordValidation.error || 'Invalid password');
      return;
    }

    try {
      setOtpSending(true);
      setError(null);

      // Record attempt before making the request
      recordAttemptForEmail(formData.email);

      // Prepare user profile data with data validation
      const userProfile = {
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        role: 'farmer',
        gender: formData.gender,
        email_verified: false,
        status: 'pending',
        created_at: new Date().toISOString()
      };

      // Send OTP and prepare for user creation
      const result = await OtpService.sendOtp(
        formData.email.toLowerCase().trim(), 
        userProfile, 
        formData.password
      );

      if (result.error) {
        throw new Error(result.error);
      }

      setOtpSent(true);
      setResendCooldown(60);
      setOtpToken(''); // Clear any previous OTP

      toast.success(
        'Check your email', 
        'We sent a 6-digit code to verify your email. Please check your inbox and spam folder.'
      );

      // Start cooldown timer with cleanup
      const timer = setInterval(() => {
        setResendCooldown(prev => {
          if (prev <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      // Clean up timer if component unmounts
      return () => clearInterval(timer);

    } catch (error: any) {
      console.error('OTP send error:', error);
      
      const errorMessage = error.message?.toLowerCase?.() || '';
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        toast.error('Account Exists', 'An account with this email already exists. Please log in instead.');
      } else if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
        toast.error('Too Many Requests', 'Please wait a few minutes before trying again.');
      } else if (errorMessage.includes('invalid email')) {
        toast.error('Invalid Email', 'Please enter a valid email address.');
      } else {
        toast.error(
          'Verification Error', 
          'Failed to send verification code. Please try again later.'
        );
      }
      
      setError(error.message);
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!formData.email || otpToken.trim().length === 0) {
      toast.error('Provide the OTP sent to your email');
      return;
    }

    try {
      setOtpVerifying(true);

      // Verify OTP and create user account
      const result = await OtpService.verifyOtp(formData.email, otpToken);
      
      if (result.success) {
        setOtpVerified(true);
        toast.success('Email Verified', 'Your email has been verified. You can now continue with registration.');
      } else {
        toast.error('Verification failed', 'Please check the code and try again.');
      }
    } finally {
      setOtpVerifying(false);
    }
  };

  const uploadKYCDocument = async (file: File, path: string): Promise<string> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Math.random()}.${fileExt}`;
    const filePath = `${path}/${fileName}`;

    // Try to get current session
    let { data: { session }, error: sessionError } = await supabase.auth.getSession();
    
    // If no session, try to refresh or get a new one
    if (!session || sessionError) {
      console.log('No active session, attempting to refresh...');
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        console.error('Session refresh error:', refreshError);
      } else {
        session = refreshData.session;
      }
    }
    
    if (!session) {
      // If still no session, try to sign in the user
      console.log('Attempting to sign in user...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password
      });
      
      if (signInError) {
        console.error('Sign in error:', signInError);
      } else {
        session = signInData.session;
      }
    }

    const { error: uploadError } = await supabase.storage
      .from('kyc-documents')
      .upload(filePath, file);

    if (uploadError) {
      console.error('Upload error details:', {
        message: uploadError.message,
        name: uploadError.name,
        status: (uploadError as any).status
      });
      throw new Error(`Failed to upload document: ${uploadError.message}`);
    }

    const { data: { publicUrl } } = supabase.storage
      .from('kyc-documents')
      .getPublicUrl(filePath);

    return publicUrl;
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) return;
    
    setLoading(true);
    try {
      console.log('FarmerSignup: Starting registration process');
      
      // Get session from email verification
      let session;
      try {
        session = await AuthService.getCurrentSession();
      } catch (err) {
        console.warn('No active session:', err);
      }

      const userId = session?.user.id;
      if (!userId) {
        throw new Error('Please verify your email first by entering the OTP sent to your inbox.');
      }

      console.log('FarmerSignup: Found active session from OTP, userId=', userId);

      // Create profile with retry logic
      let profileError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        const { error } = await supabase.from('profiles')
          .upsert({
            id: userId,
            full_name: formData.fullName,
            email: formData.email,
            updated_at: new Date().toISOString()
          }, {
            onConflict: 'id'
          });

        if (!error) {
          profileError = null;
          break;
        }

        profileError = error;
        if (error.code !== 'PGRST504' && !error.message?.includes('timeout')) {
          break; // Don't retry non-timeout errors
        }

        console.log(`Profile creation attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      }

      if (profileError) {
        console.error('FarmerSignup: Profile creation error', profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // Now set user role (after profile exists)
      const { error: roleError } = await supabase.from('user_roles')
        .upsert({
          user_id: userId,
          role: 'farmer',
          active: true
        }, {
          onConflict: 'user_id'
        });

      if (roleError) {
        console.error('FarmerSignup: Role assignment error', roleError);
        throw new Error(`Failed to assign farmer role: ${roleError.message}`);
      }

      // Validate data before creating pending_farmer record
      const allowedFeedingTypes = ['zero_grazing', 'field_grazing', 'mixed'];
      const allowedBreedingMethods = ['male_bull', 'artificial_insemination', 'both'];
      
      if (!allowedFeedingTypes.includes(formData.feedingType)) {
        throw new Error(`Invalid feeding type. Must be one of: ${allowedFeedingTypes.join(', ')}`);
      }

      if (!allowedBreedingMethods.includes(formData.breedingMethod)) {
        throw new Error(`Invalid breeding method. Must be one of: ${allowedBreedingMethods.join(', ')}`);
      }

      // Create pending_farmer record with validated data
      const pendingFarmerData = {
        user_id: userId,
        full_name: formData.fullName.trim(),
        email: formData.email.toLowerCase().trim(),
        phone_number: formData.phone.trim(),
        gender: formData.gender,
        age: parseInt(formData.age),
        id_number: formData.idNumber.trim(),
        number_of_cows: parseInt(formData.numberOfCows),
        cow_breeds: [{ 
          breedName: formData.primaryBreed, 
          count: parseInt(formData.breedCount)
        }],
        breeding_method: formData.breedingMethod,
        feeding_type: formData.feedingType,
        farm_location: formData.farmLocation.trim(),
        status: 'pending', // Use lowercase to match database enum
        email_verified: true, // User has already verified email via OTP
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      // Validate numeric fields
      if (isNaN(pendingFarmerData.age) || pendingFarmerData.age < 18 || pendingFarmerData.age > 100) {
        throw new Error('Invalid age. Must be between 18 and 100.');
      }

      if (isNaN(pendingFarmerData.number_of_cows) || pendingFarmerData.number_of_cows < 1) {
        throw new Error('Invalid number of cows. Must be at least 1.');
      }

      const breedCount = pendingFarmerData.cow_breeds[0].count;
      if (isNaN(breedCount) || breedCount < 1 || breedCount > pendingFarmerData.number_of_cows) {
        throw new Error('Invalid breed count. Must be between 1 and total number of cows.');
      }

      // Insert with retry logic for network issues
      let insertError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { error } = await supabase
            .from('pending_farmers')
            .insert([pendingFarmerData]); // Wrap in array as required by Supabase

          if (!error) {
            insertError = null;
            break;
          }

          insertError = error;
          
          // Log the full error details for debugging
          console.error('Insert error details:', {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
          });

          // Handle specific database constraint violations
          if (error.code === '23514') { // Check constraint violation
            if (error.message?.includes('status_check')) {
              console.error('Status constraint error:', pendingFarmerData.status);
              throw new Error('Registration status is invalid. Please try again.');
            }
            if (error.message?.includes('feeding_type_check')) {
              console.error('Feeding type error:', pendingFarmerData.feeding_type);
              throw new Error('Please select a valid feeding type (zero_grazing, field_grazing, or mixed).');
            }
            throw new Error('Some data is invalid. Please check all fields and try again.');
          }

          // Only retry on timeout/network errors
          if (error.code !== 'PGRST504' && !error.message?.includes('timeout')) {
            break;
          }

          console.log(`Farmer profile creation attempt ${attempt} failed, retrying...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        } catch (error: any) {
          console.error('Farmer profile creation error:', error);
          insertError = error;
          
          // Don't retry on validation/constraint errors
          if (error.code?.startsWith('23')) {
            break;
          }
        }
      }

      if (insertError) {
        console.error('FarmerSignup: Insert error details', insertError);
        throw new Error(`Failed to create farmer profile: ${insertError.message}`);
      }

      // Store files for later upload
      const fileData = {
        userId: userId,
        idFront: {
          name: formData.idFrontFile?.name,
          type: formData.idFrontFile?.type,
          size: formData.idFrontFile?.size
        },
        idBack: {
          name: formData.idBackFile?.name,
          type: formData.idBackFile?.type,
          size: formData.idBackFile?.size
        },
        selfie: {
          name: formData.selfieFile?.name,
          type: formData.selfieFile?.type,
          size: formData.selfieFile?.size
        }
      };
      
      // Store file metadata
      localStorage.setItem('pending_kyc_files', JSON.stringify(fileData));
      
      // Store file previews
      if (formData.idFrontPreview) {
        localStorage.setItem(`kyc_file_${userId}_id_front`, formData.idFrontPreview);
      }
      if (formData.idBackPreview) {
        localStorage.setItem(`kyc_file_${userId}_id_back`, formData.idBackPreview);
      }
      if (formData.selfiePreview) {
        localStorage.setItem(`kyc_file_${userId}_selfie`, formData.selfiePreview);
      }

      // Store minimal registration data
      localStorage.setItem('pending_registration', JSON.stringify({
        email: formData.email,
        full_name: formData.fullName,
        submitted_at: new Date().toISOString(),
        user_id: userId
      }));

      toast.success(
        "Registration Submitted",
        "Your application has been submitted and is under review. You'll be notified when the review is complete."
      );
      
      navigate('/documents-under-review');
      
    } catch (error: any) {
      console.error("Registration error:", {
        message: error.message,
        code: error.code,
        details: error.details,
        stack: error.stack
      });
      
      // Reset loading state immediately for timeout errors
      if (error.message?.includes('timeout')) {
        setLoading(false);
        toast.error(
          "Connection Error", 
          "The request timed out. We'll try to resume where you left off. Please try again."
        );
        return;
      }

      // Handle specific error cases
      if (error.message?.includes('verify your email')) {
        toast.error("Verification Required", error.message);
        setCurrentStep(1); // Go back to email verification step
        return;
      }
      
      if (error.code === '23503') { // Foreign key violation
        toast.error(
          "Database Error", 
          "There was an issue with your registration. Please wait a moment and try again."
        );
        return;
      }

      if (error.code === 'PGRST204') {
        const missingField = error.message?.match(/Could not find the '(.+)' column/)?.[1];
        if (missingField) {
          console.error(`Database schema error: Missing field '${missingField}'`);
          toast.error(
            "System Error",
            "There is a configuration issue. Our team has been notified."
          );
          return;
        }
      }

      // Generic error case
      toast.error(
        "Registration Error", 
        "Failed to complete registration. Please try again or contact support if the problem persists."
      );
    } finally {
      setLoading(false);
      
      // If we failed at profile creation, try to clean up
      if (!otpVerified) {
        try {
          await AuthService.signOut();
        } catch (err) {
          console.error('Failed to clean up after registration error:', err);
        }
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Header matching landing page style */}
      <header className="border-b border-border bg-background/80 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Milk className="h-8 w-8 text-primary" />
              <span className="text-xl font-bold">DAIRY FARMERS OF TRANS-NZOIA</span>
            </div>
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <Home className="h-4 w-4" />
              Back to Home
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          {/* Hero section */}
          <div className="text-center mb-12 py-8">
            <div className="flex justify-center mb-6">
              <div className="w-16 h-16 gradient-primary rounded-2xl flex items-center justify-center shadow-medium">
                <Users className="w-8 h-8 text-primary-foreground" />
              </div>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold mb-4">
              Farmer <span className="text-primary">Registration</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Join our network of dairy farmers and streamline your operations
            </p>
          </div>

          {/* Progress indicator */}
          <div className="mb-8">
            <div className="flex items-center justify-between relative">
              {[1, 2, 3].map((step) => (
                <div key={step} className="flex flex-col items-center z-10">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center font-bold text-white shadow-lg ${
                    currentStep >= step 
                      ? 'bg-gradient-to-r from-primary to-primary/80' 
                      : 'bg-muted'
                  }`}>
                    {currentStep > step ? <CheckCircle className="w-6 h-6" /> : step}
                  </div>
                  <span className="mt-2 text-sm font-medium">
                    {step === 1 && 'Personal Info'}
                    {step === 2 && 'Farm Details'}
                    {step === 3 && 'KYC Upload'}
                  </span>
                </div>
              ))}
              <div className="absolute top-6 left-0 right-0 h-1 bg-muted z-0">
                <div 
                  className="h-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500"
                  style={{ width: `${(currentStep - 1) * 50}%` }}
                />
              </div>
            </div>
          </div>

          {/* Signup Form */}
          <Card className="shadow-lg border-border">
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">
                {currentStep === 1 && "Personal Information"}
                {currentStep === 2 && "Farm Details"}
                {currentStep === 3 && "KYC Document Upload"}
              </CardTitle>
              <CardDescription>
                {currentStep === 1 && "Tell us about yourself and create your account"}
                {currentStep === 2 && "Share details about your farm"}
                {currentStep === 3 && "Upload your identification documents"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleRegister}>
                {/* STEP 1: Personal Details + Password */}
                {currentStep === 1 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="fullName"
                            placeholder="John Doe"
                            value={formData.fullName}
                            onChange={(e) => handleInputChange('fullName', e.target.value)}
                            className="pl-10 h-11"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="gender">Gender *</Label>
                        <Select onValueChange={(value) => handleInputChange('gender', value)} value={formData.gender}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="email">Email Address *</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="john@example.com"
                            value={formData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="pl-10 h-11"
                            required
                          />
                        </div>
                      </div>

                      {/* Password fields - moved up before OTP for better UX */}
                      <div className="space-y-2 md:col-span-2">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-2">
                            <Label htmlFor="password">Password *</Label>
                            <div className="relative">
                              <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                placeholder="Create a strong password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                className="pr-10 h-11"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                            <p className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase, and number</p>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="confirmPassword">Confirm Password *</Label>
                            <div className="relative">
                              <Input
                                id="confirmPassword"
                                type={showConfirmPassword ? "text" : "password"}
                                placeholder="Re-enter password"
                                value={formData.confirmPassword}
                                onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                                className="pr-10 h-11"
                                required
                              />
                              <button
                                type="button"
                                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                              >
                                {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Email OTP controls - now placed after password fields */}
                      <div className="space-y-2 md:col-span-2">
                        <div className="p-4 rounded-lg border border-muted bg-muted/5 flex items-center gap-3">
                          <div className="flex-1">
                            <Label htmlFor="otp">OTP</Label>
                            <Input
                              id="otp"
                              placeholder="Enter 6-digit code"
                              value={otpToken}
                              onChange={(e) => setOtpToken(e.target.value)}
                              className="h-11"
                              disabled={otpVerified}
                            />
                            <p className="text-xs text-muted-foreground mt-1">We will send a 6-digit OTP to <strong>{formData.email || 'your email'}</strong>.</p>
                          </div>

                          <div className="flex flex-col space-y-2">
                            <Button
                              type="button"
                              onClick={sendOtp}
                              disabled={!formData.password || otpSending || resendCooldown > 0}
                              variant={otpSent ? 'outline' : 'default'}
                            >
                              {otpSending ? 'Sending...' : (resendCooldown > 0 ? `Resend (${resendCooldown}s)` : (otpSent ? 'Resend OTP' : 'Send OTP'))}
                            </Button>
                            <Button
                              type="button"
                              onClick={verifyOtp}
                              disabled={otpVerifying || !otpSent || otpVerified}
                            >
                              {otpVerifying ? 'Verifying...' : (otpVerified ? 'Verified' : 'Verify OTP')}
                            </Button>
                          </div>
                        </div>

                        {otpSent && (
                          <div className="mt-2 text-sm text-muted-foreground flex items-center justify-between">
                            <div>We've sent an email to <strong>{formData.email}</strong>. Check inbox or spam.</div>
                            <Button size="sm" variant="ghost" onClick={() => navigator.clipboard?.writeText(formData.email)}>
                              Copy email
                            </Button>
                          </div>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number *</Label>
                        <div className="relative">
                          <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+254 712 345 678"
                            value={formData.phone}
                            onChange={(e) => handleInputChange('phone', e.target.value)}
                            className="pl-10 h-11"
                            required
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="age">Age *</Label>
                        <Input
                          id="age"
                          type="number"
                          placeholder="Enter your age"
                          value={formData.age}
                          onChange={(e) => handleInputChange('age', e.target.value)}
                          className="h-11"
                          min="18"
                          max="100"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="idNumber">ID Number *</Label>
                        <div className="relative">
                          <FileText className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="idNumber"
                            placeholder="Enter your ID number"
                            value={formData.idNumber}
                            onChange={(e) => handleInputChange('idNumber', e.target.value)}
                            className="pl-10 h-11"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => navigate('/farmer/login')}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Already have an account?
                      </Button>
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-2"
                      >
                        Next: Farm Details <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 2: Farm Details */}
                {currentStep === 2 && (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="numberOfCows">Number of Cows *</Label>
                        <Input
                          id="numberOfCows"
                          type="number"
                          placeholder="Enter number of cows"
                          value={formData.numberOfCows}
                          onChange={(e) => handleInputChange('numberOfCows', e.target.value)}
                          className="h-11"
                          min="1"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="breedingMethod">Breeding Method *</Label>
                        <Select onValueChange={(value) => handleInputChange('breedingMethod', value)} value={formData.breedingMethod}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select breeding method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male_bull">Male Bull</SelectItem>
                            <SelectItem value="artificial_insemination">Artificial Insemination</SelectItem>
                            <SelectItem value="both">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="feedingType">Feeding Type *</Label>
                        <Select onValueChange={(value) => handleInputChange('feedingType', value)} value={formData.feedingType}>
                          <SelectTrigger className="h-11">
                            <SelectValue placeholder="Select feeding type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="zero_grazing">Zero Grazing</SelectItem>
                            <SelectItem value="field_grazing">Open Field</SelectItem>
                            <SelectItem value="mixed">Both</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="farmLocation">Farm Location *</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="farmLocation"
                            placeholder="County, Sub-County, Ward"
                            value={formData.farmLocation}
                            onChange={(e) => handleInputChange('farmLocation', e.target.value)}
                            className="pl-10 h-11 pr-32"
                            required
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={getLocation}
                            disabled={isGettingLocation}
                            className="absolute right-1 top-1 h-9"
                          >
                            {isGettingLocation ? (
                              <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Getting...
                              </>
                            ) : (
                              <>
                                <MapPin className="mr-2 h-4 w-4" />
                                Use Current
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Cow Breeds Section - Changed to single selection */}
                    <div className="space-y-4">
                      <Label>Cow Breeds *</Label>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="primaryBreed">Primary Breed</Label>
                          <Select onValueChange={(value) => handleInputChange('primaryBreed', value)} value={formData.primaryBreed}>
                            <SelectTrigger className="h-11">
                              <SelectValue placeholder="Select primary breed" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="friesian">Friesian</SelectItem>
                              <SelectItem value="jersey">Jersey</SelectItem>
                              <SelectItem value="ayrshire">Ayrshire</SelectItem>
                              <SelectItem value="guernsey">Guernsey</SelectItem>
                              <SelectItem value="holstein">Holstein</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="breedCount">Number of Cows of Primary Breed</Label>
                          <Input
                            id="breedCount"
                            type="number"
                            placeholder="Count"
                            value={formData.breedCount}
                            onChange={(e) => handleInputChange('breedCount', e.target.value)}
                            className="h-11"
                            min="1"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        type="button"
                        onClick={handleNext}
                        className="flex items-center gap-2"
                      >
                        Next: KYC Upload <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}

                {/* STEP 3: KYC Document Upload */}
                {currentStep === 3 && (
                  <div className="space-y-6">
                    <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
                      <div className="flex items-start gap-3">
                        <Camera className="h-5 w-5 text-blue-600 dark:text-blue-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-blue-900 dark:text-blue-100">Upload Requirements</h4>
                          <ul className="text-sm text-blue-800 dark:text-blue-200 mt-2 space-y-1">
                            <li>• Images must be clear and readable</li>
                            <li>• Accepted formats: JPEG, PNG</li>
                            <li>• Maximum file size: 5MB per image</li>
                            <li>• All three documents are required</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    {/* ID Front Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="idFront">ID Card - Front Side *</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                        {formData.idFrontPreview ? (
                          <div className="relative">
                            <img 
                              src={formData.idFrontPreview} 
                              alt="ID Front Preview" 
                              className="max-h-64 mx-auto rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => handleFileChange('idFrontFile', null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex justify-center">
                              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                <Upload className="w-8 h-8 text-primary" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Click to upload or drag and drop
                              </p>
                              <Input
                                id="idFront"
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={(e) => handleFileChange('idFrontFile', e.target.files?.[0] || null)}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('idFront')?.click()}
                              >
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Choose File
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ID Back Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="idBack">ID Card - Back Side *</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                        {formData.idBackPreview ? (
                          <div className="relative">
                            <img 
                              src={formData.idBackPreview} 
                              alt="ID Back Preview" 
                              className="max-h-64 mx-auto rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => handleFileChange('idBackFile', null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex justify-center">
                              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                <Upload className="w-8 h-8 text-primary" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Click to upload or drag and drop
                              </p>
                              <Input
                                id="idBack"
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                onChange={(e) => handleFileChange('idBackFile', e.target.files?.[0] || null)}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('idBack')?.click()}
                              >
                                <ImageIcon className="mr-2 h-4 w-4" />
                                Choose File
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Selfie Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="selfie">Selfie Photo *</Label>
                      <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                        {formData.selfiePreview ? (
                          <div className="relative">
                            <img 
                              src={formData.selfiePreview} 
                              alt="Selfie Preview" 
                              className="max-h-64 mx-auto rounded-lg"
                            />
                            <Button
                              type="button"
                              variant="destructive"
                              size="sm"
                              className="absolute top-2 right-2"
                              onClick={() => handleFileChange('selfieFile', null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex justify-center">
                              <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                                <Camera className="w-8 h-8 text-primary" />
                              </div>
                            </div>
                            <div>
                              <p className="text-sm text-muted-foreground mb-2">
                                Take a clear selfie or upload photo
                              </p>
                              <Input
                                id="selfie"
                                type="file"
                                accept="image/jpeg,image/png,image/jpg"
                                capture="user"
                                onChange={(e) => handleFileChange('selfieFile', e.target.files?.[0] || null)}
                                className="hidden"
                              />
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => document.getElementById('selfie')?.click()}
                              >
                                <Camera className="mr-2 h-4 w-4" />
                                Take/Upload Selfie
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                        <div>
                          <h4 className="font-medium text-green-900 dark:text-green-100">What Happens Next?</h4>
                          <ul className="text-sm text-green-800 dark:text-green-200 mt-2 space-y-1">
                            <li>• Your documents will be submitted for review</li>
                            <li>• You'll receive an email OTP to verify your email address</li>
                            <li>• Please verify your email address using the OTP before continuing</li>
                            <li>• Our team will review your application (1-3 business days)</li>
                            <li>• You'll be notified when the review is complete</li>
                          </ul>
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={handleBack}
                        className="flex items-center gap-2"
                      >
                        <ArrowLeft className="h-4 w-4" />
                        Back
                      </Button>
                      <Button
                        type="submit"
                        disabled={loading}
                        className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/80"
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Submitting Application...
                          </>
                        ) : (
                          <>
                            <CheckCircle className="h-4 w-4" />
                            Register & Submit
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default FarmerSignup;
