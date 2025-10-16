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
  Camera,
  Loader2,
  CheckCircle,
  ChevronRight,
  Milk,
  Home,
  ArrowLeft,
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

import useToastNotifications from "@/hooks/useToastNotifications";
import { AuthService } from "@/services/auth-service";
import { OtpService } from "@/services/otp-service";
import { supabase } from "@/integrations/supabase/client";
import { checkStorageQuota, safeSetLocalStorage, cleanupOldStorageItems } from '@/utils/storageQuotaManager';
import NavigationDiagnostics from '@/components/NavigationDiagnostics';
import { useAuth } from '@/contexts/SimplifiedAuthContext';

// Constants for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_REGEX = /^\+254[1-9]\d{8}$/;
const PASSWORD_REGEX = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_FILE_TYPES = ['image/jpeg', 'image/png', 'image/jpg'];
const MIN_IMAGE_DIMENSIONS = { width: 600, height: 400 };
// Allowed values for pending_farmers.status (must match DB check constraint)
const PENDING_FARMER_ALLOWED_STATUSES = ['pending_verification', 'email_verified', 'approved', 'rejected'];

// OTP attempt tracking constants
const OTP_ATTEMPTS_KEY = 'otp_attempts_v1';
const OTP_ATTEMPT_LIMIT = 3;
const OTP_ATTEMPT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes

interface FormData {
  fullName: string;
  email: string;
  phone: string;
  age: string;
  gender: string;
  idNumber: string;
  address: string;
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
  idFrontPreview: string;
  idBackPreview: string;
  selfiePreview: string;
}

const FarmerSignup: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  
  // Enhanced navigation debugging
  const debugNavigate = (path: string) => {
    console.log('FarmerSignup: Debug navigation called', { path, currentLocation: location.pathname });
    navigate(path);
    console.log('FarmerSignup: Debug navigation completed', { path });
  };
  
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [otpSent, setOtpSent] = useState(false);
  const [otpToken, setOtpToken] = useState('');
  const [otpVerified, setOtpVerified] = useState(false);
  const [otpSending, setOtpSending] = useState(false);
  const [otpVerifying, setOtpVerifying] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState<FormData>({
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    age: "",
    idNumber: "",
    address: "",
    password: "",
    confirmPassword: "",
    numberOfCows: "",
    primaryBreed: "",
    breedCount: "",
    breedingMethod: "",
    feedingType: "",
    farmLocation: "",
    idFrontFile: null,
    idBackFile: null,
    selfieFile: null,
    idFrontPreview: "",
    idBackPreview: "",
    selfiePreview: ""
  });
  
  const { refreshUserRole } = useAuth();

  // OTP attempt tracking functions
  const getOtpAttemptsMap = (): Record<string, number[]> => {
    try {
      const raw = localStorage.getItem(OTP_ATTEMPTS_KEY);
      if (!raw) return {};
      return JSON.parse(raw) as Record<string, number[]>;
    } catch (e) {
      console.error('Failed to read OTP attempts map', e);
      return {};
    }
  };

  const saveOtpAttemptsMap = (map: Record<string, number[]>) => {
    try {
      localStorage.setItem(OTP_ATTEMPTS_KEY, JSON.stringify(map));
    } catch (e) {
      console.error('Failed to save OTP attempts map', e);
    }
  };

  const pruneAttempts = (timestamps: number[]) => {
    const cutoff = Date.now() - OTP_ATTEMPT_WINDOW_MS;
    return timestamps.filter(ts => ts > cutoff);
  };

  const getAttemptsForEmail = (email: string) => {
    if (!email) return [] as number[];
    const map = getOtpAttemptsMap();
    const list = map[email] || [];
    return pruneAttempts(list);
  };

  const recordAttemptForEmail = (email: string) => {
    if (!email) return;
    const map = getOtpAttemptsMap();
    const list = pruneAttempts(map[email] || []);
    list.push(Date.now());
    map[email] = list;
    saveOtpAttemptsMap(map);
  };

  // Global cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setInterval(() => {
      setResendCooldown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
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
        toast({
          title: "Link Expired",
          description: "Your previous email confirmation link has expired. Please complete the registration form again.",
          variant: "destructive"
        });
        localStorage.removeItem('pending_profile');
      } else if (error === 'access_denied') {
        toast({
          title: "Access Denied",
          description: errorDescription || 'Access was denied. Please try again.',
          variant: "destructive"
        });
      } else {
        toast({
          title: "Authentication Error",
          description: errorDescription || 'There was an error processing your authentication.',
          variant: "destructive"
        });
      }
    }
  }, [location.search, toast]);

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Validation helper functions
  const validateEmail = (email: string): { isValid: boolean; error?: string } => {
    if (!email) {
      return { isValid: false, error: 'Email is required' };
    }
    if (!EMAIL_REGEX.test(email)) {
      return { isValid: false, error: 'Please enter a valid email address' };
    }
    return { isValid: true };
  };

  const validatePassword = (data: typeof formData): { isValid: boolean; error?: string } => {
    if (!data.password) {
      return { isValid: false, error: 'Password is required' };
    }
    if (data.password.length < 8) {
      return { isValid: false, error: 'Password must be at least 8 characters' };
    }
    if (!PASSWORD_REGEX.test(data.password)) {
      return { 
        isValid: false, 
        error: 'Password must include uppercase, lowercase, number, and special character' 
      };
    }
    if (data.password !== data.confirmPassword) {
      return { isValid: false, error: 'Passwords do not match' };
    }
    return { isValid: true };
  };

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

  // Handle file uploads for KYC
  const handleFileChange = async (field: 'idFrontFile' | 'idBackFile' | 'selfieFile', file: File | null) => {
    if (!file) {
      setFormData(prev => ({
        ...prev,
        [field]: null,
        [`${field.replace('File', 'Preview')}`]: ""
      }));
      return;
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(file.type)) {
      toast({
        title: "Invalid File",
        description: "Please upload a JPEG or PNG image file",
        variant: "destructive"
      });
      return;
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      toast({
        title: "File Too Large",
        description: "Please upload an image smaller than 5MB",
        variant: "destructive"
      });
      return;
    }

    // Validate image dimensions
    const validation = await validateImage(file);
    if (!validation.isValid) {
      toast({
        title: "Image Too Small",
        description: validation.error,
        variant: "destructive"
      });
      return;
    }

    // Create preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setFormData(prev => ({
        ...prev,
        [field]: file,
        [`${field.replace('File', 'Preview')}`]: reader.result as string
      }));
    };

    reader.onerror = () => {
      toast({
        title: "File Error",
        description: "Failed to read file. Please try again.",
        variant: "destructive"
      });
    };

    reader.readAsDataURL(file);
  };

  const validateStep = (step: number): { isValid: boolean; error?: string } => {
    try {
      if (step === 1) {
        // Required fields check
        const requiredFields = ['fullName', 'email', 'phone', 'gender', 'age', 'idNumber', 'address'] as const;
        for (const field of requiredFields) {
          if (!formData[field]?.trim()) {
            return { isValid: false, error: `${field.replace(/([A-Z])/g, ' $1').toLowerCase()} is required` };
          }
        }

        // Email validation
        const emailValidation = validateEmail(formData.email);
        if (!emailValidation.isValid) {
          return emailValidation;
        }

        // Phone validation
        if (!PHONE_REGEX.test(formData.phone)) {
          return { isValid: false, error: "Please enter a valid Kenyan phone number (+254...)" };
        }

        // Age validation
        const age = Number(formData.age);
        if (isNaN(age) || age < 18 || age > 100) {
          return { isValid: false, error: "Age must be between 18 and 100" };
        }

        // Password validation
        const passwordValidation = validatePassword(formData);
        if (!passwordValidation.isValid) {
          return passwordValidation;
        }

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
    const validation = validateStep(currentStep);
    if (validation.isValid) {
      setCurrentStep(prev => prev + 1);
    } else {
      toast({
        title: "Validation Error",
        description: validation.error,
        variant: "destructive"
      });
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  const getLocation = (field: 'address' | 'farmLocation') => {
    if (!navigator.geolocation) {
      toast({
        title: "Location Error",
        description: "Geolocation is not supported by your browser",
        variant: "destructive"
      });
      return;
    }

    // Check if we're on a secure context (HTTPS)
    if (!window.isSecureContext) {
      toast({
        title: "Location Error",
        description: "Geolocation requires a secure connection (HTTPS). Please access this application over HTTPS to use this feature.",
        variant: "destructive"
      });
      return;
    }

    setIsGettingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        
        try {
          const locationText = `Lat: ${latitude.toFixed(6)}, Lng: ${longitude.toFixed(6)}`;
          setFormData(prev => ({ ...prev, [field]: locationText }));
          toast({
            title: "Location Captured",
            description: "Your GPS coordinates have been captured"
          });
        } catch (error) {
          console.error("Error getting location:", error);
          toast({
            title: "Location Error",
            description: "Could not get your location. Please enter manually.",
            variant: "destructive"
          });
        } finally {
          setIsGettingLocation(false);
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        let errorMessage = "Could not get your location. Please enter manually.";
        
        if (error.code === 1) {
          // PERMISSION_DENIED
          errorMessage = "Location access was denied. Please enable location permissions or enter your address manually.";
        } else if (error.code === 2) {
          // POSITION_UNAVAILABLE
          errorMessage = "Location information is unavailable. Please try again later or enter your address manually.";
        } else if (error.code === 3) {
          // TIMEOUT
          errorMessage = "Location request timed out. Please try again or enter your address manually.";
        }
        
        toast({
          title: "Location Error",
          description: errorMessage,
          variant: "destructive"
        });
        setIsGettingLocation(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 300000
      }
    );
  };

  const getAddressLocation = () => {
    getLocation('address');
  };

  const getFarmLocation = () => {
    getLocation('farmLocation');
  };

  const sendOtp = async () => {
    // Email validation
    const emailValidation = validateEmail(formData.email);
    if (!emailValidation.isValid) {
      toast({
        title: "Validation Error",
        description: emailValidation.error || 'Enter a valid email first',
        variant: "destructive"
      });
      return;
    }

    // Rate limit check
    const attempts = getAttemptsForEmail(formData.email);
    if (attempts.length >= OTP_ATTEMPT_LIMIT) {
      const oldestAttempt = attempts[0];
      const timeLeft = Math.ceil((oldestAttempt + OTP_ATTEMPT_WINDOW_MS - Date.now()) / 1000 / 60);
      toast({
        title: "Too Many Attempts",
        description: `Please wait ${timeLeft} minutes before requesting another code`,
        variant: "destructive"
      });
      return;
    }

    // Password validation
    const passwordValidation = validatePassword(formData);
    if (!passwordValidation.isValid) {
      toast({
        title: "Password Error",
        description: passwordValidation.error || 'Invalid password',
        variant: "destructive"
      });
      return;
    }

    try {
      setOtpSending(true);

      // Record attempt before making the request
      recordAttemptForEmail(formData.email);

      // Prepare user profile data
      const userProfile = {
        full_name: formData.fullName.trim(),
        phone: formData.phone.trim(),
        role: 'farmer',
        gender: formData.gender,
        email_verified: false,
        // use a DB-allowed initial status when storing any transient profile data
        status: 'pending_verification',
        created_at: new Date().toISOString()
      };

      // Send OTP
      const result = await OtpService.sendOtp(
        formData.email.toLowerCase().trim(), 
        userProfile, 
        formData.password
      );

      if (!result.success) {
        throw new Error(result.message);
      }

      setOtpSent(true);
      setResendCooldown(60);
      setOtpToken('');

      toast({
        title: "Check your email",
        description: "We sent a 6-digit code to verify your email. Please check your inbox and spam folder."
      });

    } catch (error: any) {
      console.error('OTP send error:', error);
      
      const errorMessage = error.message?.toLowerCase?.() || '';
      if (errorMessage.includes('already registered') || errorMessage.includes('already exists')) {
        toast({
          title: "Account Exists",
          description: "An account with this email already exists. Please log in instead.",
          variant: "destructive"
        });
      } else if (errorMessage.includes('too many requests') || errorMessage.includes('rate limit')) {
        toast({
          title: "Too Many Requests",
          description: "Please wait a few minutes before trying again.",
          variant: "destructive"
        });
      } else if (errorMessage.includes('invalid email')) {
        toast({
          title: "Invalid Email",
          description: "Please enter a valid email address.",
          variant: "destructive"
        });
      } else {
        toast({
          title: "Verification Error",
          description: "Failed to send verification code. Please try again later.",
          variant: "destructive"
        });
      }
    } finally {
      setOtpSending(false);
    }
  };

  const verifyOtp = async () => {
    if (!formData.email || otpToken.trim().length === 0) {
      toast({
        title: "OTP Required",
        description: "Provide the OTP sent to your email",
        variant: "destructive"
      });
      return;
    }

    try {
      setOtpVerifying(true);

      // Verify OTP
      const result = await OtpService.verifyOtp(formData.email, otpToken);
      
      if (result.success) {
        setOtpVerified(true);
        toast({
          title: "Email Verified",
          description: "Your email has been verified. You can now continue with registration."
        });
      } else {
        toast({
          title: "Verification failed",
          description: "Please check the code and try again.",
          variant: "destructive"
        });
      }
    } finally {
      setOtpVerifying(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    // Clean up old storage items to free up space
    cleanupOldStorageItems();

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

      console.log('FarmerSignup: Found active session, userId=', userId);

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
          break;
        }

        console.log(`Profile creation attempt ${attempt} failed, retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      }

      if (profileError) {
        console.error('FarmerSignup: Profile creation error', profileError);
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }

      // Set user role
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
        status: 'email_verified', // Set to email_verified to allow immediate document upload
        email_verified: true, // User has already verified email via OTP
        kyc_complete: false, // KYC not yet complete
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

      // Log the data being sent for debugging
      console.log('FarmerSignup: Sending pendingFarmerData:', pendingFarmerData);
      console.log('FarmerSignup: Status value:', pendingFarmerData.status);
      console.log('FarmerSignup: Status type:', typeof pendingFarmerData.status);
      console.log('FarmerSignup: Allowed statuses:', PENDING_FARMER_ALLOWED_STATUSES);
      console.log('FarmerSignup: Status included in allowed:', PENDING_FARMER_ALLOWED_STATUSES.includes(pendingFarmerData.status));

      // Defensive check: ensure we're sending a status the DB accepts to avoid check-constraint errors
      if (!PENDING_FARMER_ALLOWED_STATUSES.includes(pendingFarmerData.status)) {
        throw new Error('Registration status is invalid. Please try again.');
      }

      // Insert with retry logic
      let insertError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const { error } = await supabase
            .from('pending_farmers')
            .insert([pendingFarmerData]);

          if (!error) {
            insertError = null;
            break;
          }

          insertError = error;
          
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

      // Store files for later upload (but don't store the actual file data due to storage limits)
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
      
      // Store file metadata (without actual file data)
      localStorage.setItem('pending_kyc_files', JSON.stringify(fileData));
      
      // Store minimal registration data for reference
      localStorage.setItem('pending_registration', JSON.stringify({
        email: formData.email,
        full_name: formData.fullName,
        submitted_at: new Date().toISOString(),
        user_id: userId
      }));

      // Set user role in localStorage to speed up authentication
      localStorage.setItem('cached_role', 'farmer');
      localStorage.setItem('auth_cache_timestamp', Date.now().toString());
      
      // Refresh user role in auth context to ensure it's picked up immediately
      // We'll trigger this after the async function completes
      
      toast({
        title: "Registration Submitted",
        description: "Your application has been submitted. You can now upload your KYC documents."
      });
      
      // Refresh user role to ensure it's picked up immediately
      try {
        await refreshUserRole();
        // Add a small delay to ensure the role is properly set
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        console.error('Failed to refresh user role', error);
      }
      
      // Navigate to KYC upload page immediately
      console.log('FarmerSignup: Attempting navigation to KYC upload page');
      debugNavigate('/farmer/kyc-upload');
      console.log('FarmerSignup: Navigation call completed');
      
    } catch (error: any) {
      console.error("Registration error:", error);
      
      // Handle specific error cases
      if (error.message?.includes('verify your email')) {
        toast({
          title: "Verification Required",
          description: error.message,
          variant: "destructive"
        });
        setCurrentStep(1); // Go back to email verification step
        return;
      }
      
      toast({
        title: "Registration Error",
        description: error.message || "Failed to complete registration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-secondary/10">
      {/* Navigation Diagnostics - Only show in development */}
      {import.meta.env.DEV && <NavigationDiagnostics />}
      
      {/* Header */}
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
              <div className="w-16 h-16 bg-gradient-to-br from-primary to-primary/80 rounded-2xl flex items-center justify-center shadow-lg">
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

                      <div className="space-y-2">
                        <Label htmlFor="address">Address *</Label>
                        <div className="relative">
                          <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                          <Input
                            id="address"
                            placeholder="Enter your physical address"
                            value={formData.address}
                            onChange={(e) => handleInputChange('address', e.target.value)}
                            className="pl-10 h-11 pr-32"
                            required
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={getAddressLocation}
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
                                GPS
                              </>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Password fields */}
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
                            <p className="text-xs text-muted-foreground">At least 8 characters with uppercase, lowercase, number, and special character</p>
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

                      {/* Email OTP controls */}
                      <div className="space-y-2 md:col-span-2">
                        <div className="p-4 rounded-lg border border-muted bg-muted/5">
                          <div className="flex flex-col md:flex-row gap-4">
                            <div className="flex-1 space-y-2">
                              <Label htmlFor="otp">Email Verification Code</Label>
                              <Input
                                id="otp"
                                placeholder="Enter 6-digit code"
                                value={otpToken}
                                onChange={(e) => setOtpToken(e.target.value)}
                                className="h-11"
                                disabled={otpVerified}
                                maxLength={6}
                              />
                              <p className="text-xs text-muted-foreground">
                                We will send a 6-digit OTP to <strong>{formData.email || 'your email'}</strong>
                              </p>
                            </div>

                            <div className="flex flex-col justify-end gap-2">
                              <Button
                                type="button"
                                onClick={sendOtp}
                                disabled={!formData.password || !formData.email || otpSending || resendCooldown > 0}
                                variant={otpSent ? 'outline' : 'default'}
                                size="sm"
                              >
                                {otpSending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Sending...
                                  </>
                                ) : resendCooldown > 0 ? (
                                  `Resend (${resendCooldown}s)`
                                ) : otpSent ? (
                                  'Resend OTP'
                                ) : (
                                  'Send OTP'
                                )}
                              </Button>
                              <Button
                                type="button"
                                onClick={verifyOtp}
                                disabled={otpVerifying || !otpSent || otpVerified || !otpToken}
                                variant="secondary"
                                size="sm"
                              >
                                {otpVerifying ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Verifying...
                                  </>
                                ) : otpVerified ? (
                                  <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Verified
                                  </>
                                ) : (
                                  'Verify OTP'
                                )}
                              </Button>
                            </div>
                          </div>
                        </div>

                        {otpSent && !otpVerified && (
                          <div className="mt-2 p-3 bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded text-sm text-blue-800 dark:text-blue-200">
                            Check your inbox at <strong>{formData.email}</strong> for the verification code. Don't forget to check your spam folder.
                          </div>
                        )}

                        {otpVerified && (
                          <div className="mt-2 p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded text-sm text-green-800 dark:text-green-200 flex items-center gap-2">
                            <CheckCircle className="h-4 w-4" />
                            Email verified successfully! You can now proceed to the next step.
                          </div>
                        )}
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
                        disabled={!otpVerified}
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
                            <SelectItem value="mixed">Mixed</SelectItem>
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
                            onClick={getFarmLocation}
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
                                GPS
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>

                    {/* Cow Breeds Section */}
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
                          <Label htmlFor="breedCount">Number of Cows (Primary Breed)</Label>
                          <Input
                            id="breedCount"
                            type="number"
                            placeholder="Count"
                            value={formData.breedCount}
                            onChange={(e) => handleInputChange('breedCount', e.target.value)}
                            className="h-11"
                            min="1"
                            required
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
                            <li>• Minimum dimensions: 600x400 pixels</li>
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
                            <li>• Our team will review your application within 1-3 business days</li>
                            <li>• You'll be notified via email when the review is complete</li>
                            <li>• Once approved, you can start using all platform features</li>
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
                            Submit Registration
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