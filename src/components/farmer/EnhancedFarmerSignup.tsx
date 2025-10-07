import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
  Upload, 
  Loader2, 
  CheckCircle,
  Calendar,
  Home,
  Map,
  Scale,
  Wheat,
  Banknote,
  ShieldCheck,
  AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useToastNotifications from "@/hooks/useToastNotifications";
import { FarmerRegistrationService, type FarmerRegistrationData } from "@/services/farmerRegistrationService";
import { UserRole } from "@/types/auth.types";

const EnhancedFarmerSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastNotifications();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<Record<string, File | null>>({
    nationalId: null,
    farmCert: null,
    kraPin: null
  });
  const [filePreviews, setFilePreviews] = useState<Record<string, string>>({
    nationalId: '',
    farmCert: '',
    kraPin: ''
  });
  
  // Form data state
  const [signupData, setSignupData] = useState({
    // Step 1: Personal Information
    fullName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    nationalId: "",
    dob: "",
    gender: "",
    address: "",
    
    // Step 2: Farm Details
    farmName: "",
    farmLocation: "",
    farmSize: "",
    experience: "",
    numCows: "",
    numDairyCows: "",
    primaryBreed: "",
    avgProduction: "",
    farmingType: "",
    additionalInfo: "",
    
    // Step 3: Documents & Bank Details
    bankName: "",
    accountNumber: "",
    accountName: "",
    termsAccepted: false
  });

  // Get the return URL from location state or default to dashboard
  const from = (location.state as any)?.from?.pathname || '/farmer/dashboard';

  // Form validation
  const validateField = (field: string, value: string) => {
    switch (field) {
      case 'fullName':
        return value.length < 2 ? 'Full name must be at least 2 characters' : '';
      case 'email':
        return !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? 'Invalid email format' : '';
      case 'phone':
        return !/^\+254[1-9]\d{8}$/.test(value) ? 'Invalid Kenyan phone number (format: +254...)' : '';
      case 'password':
        return value.length < 6 ? 'Password must be at least 6 characters' : '';
      case 'confirmPassword':
        return value !== signupData.password ? 'Passwords do not match' : '';
      case 'nationalId':
        return value.length < 2 ? 'National ID must be at least 2 characters' : '';
      case 'address':
        return value.length < 5 ? 'Address must be at least 5 characters' : '';
      case 'farmLocation':
        return value.length < 3 ? 'Farm location must be at least 3 characters' : '';
      case 'farmSize':
        return parseFloat(value) <= 0 ? 'Farm size must be greater than 0' : '';
      case 'experience':
        return parseInt(value) < 0 ? 'Experience must be 0 or greater' : '';
      case 'numCows':
        return parseInt(value) < 1 ? 'Number of cows must be at least 1' : '';
      case 'numDairyCows':
        return parseInt(value) < 0 ? 'Number of dairy cows must be 0 or greater' : '';
      case 'avgProduction':
        return parseFloat(value) < 0 ? 'Average production must be 0 or greater' : '';
      case 'bankName':
        return value.length < 2 ? 'Bank name must be at least 2 characters' : '';
      case 'accountNumber':
        return value.length < 5 ? 'Account number must be at least 5 characters' : '';
      case 'accountName':
        return value.length < 2 ? 'Account name must be at least 2 characters' : '';
      default:
        return '';
    }
  };

  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const handleInputChange = (field: string, value: string | boolean) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
    
    // Clear error when user starts typing
    if (fieldErrors[field]) {
      setFieldErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const validateStep = (step: number) => {
    const errors: Record<string, string> = {};
    
    if (step === 1) {
      const fields = ['fullName', 'email', 'phone', 'password', 'confirmPassword', 'nationalId', 'dob', 'gender', 'address'];
      fields.forEach(field => {
        const fieldValue = signupData[field as keyof typeof signupData];
        const error = validateField(field, typeof fieldValue === 'string' ? fieldValue : '');
        if (error) errors[field] = error;
      });
    } else if (step === 2) {
      const fields = ['farmName', 'farmLocation', 'farmSize', 'experience', 'numCows', 'numDairyCows', 'primaryBreed', 'avgProduction', 'farmingType'];
      fields.forEach(field => {
        const fieldValue = signupData[field as keyof typeof signupData];
        const error = validateField(field, typeof fieldValue === 'string' ? fieldValue : '');
        if (error) errors[field] = error;
      });
    } else if (step === 3) {
      const fields = ['bankName', 'accountNumber', 'accountName'];
      fields.forEach(field => {
        const fieldValue = signupData[field as keyof typeof signupData];
        const error = validateField(field, typeof fieldValue === 'string' ? fieldValue : '');
        if (error) errors[field] = error;
      });
      
      if (!signupData.termsAccepted) {
        errors.terms = 'You must accept the terms and conditions';
      }
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => prev - 1);
  };

  // Handle file upload for documents
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, fileType: string) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File too large', 'Please upload a file smaller than 5MB');
        return;
      }
      
      // Check file type
      const validTypes = ['image/jpeg', 'image/png', 'image/jpg', 'application/pdf'];
      if (!validTypes.includes(file.type)) {
        toast.error('Invalid file type', 'Please upload a JPG, PNG, or PDF file');
        return;
      }
      
      setUploadedFiles(prev => ({ ...prev, [fileType]: file }));
      
      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setFilePreviews(prev => ({ ...prev, [fileType]: reader.result as string }));
      };
      reader.readAsDataURL(file);
      
      toast.success('File uploaded', `Your ${fileType} has been uploaded successfully`);
    }
  };

  // Handle profile picture upload
  const handleProfileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        toast.error('File too large', 'Please upload an image smaller than 2MB');
        return;
      }
      
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      toast.success('Profile picture selected', 'Your profile picture will be uploaded after registration');
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(3)) {
      return;
    }
    
    setLoading(true);

    try {
      // Prepare registration data
      const registrationData: FarmerRegistrationData = {
        email: signupData.email,
        password: signupData.password,
        confirmPassword: signupData.confirmPassword,
        fullName: signupData.fullName,
        phone: signupData.phone,
        nationalId: signupData.nationalId,
        dob: signupData.dob,
        gender: signupData.gender,
        address: signupData.address,
        farmName: signupData.farmName,
        farmLocation: signupData.farmLocation,
        farmSize: parseFloat(signupData.farmSize) || 0,
        experience: parseInt(signupData.experience) || 0,
        numCows: parseInt(signupData.numCows) || 0,
        numDairyCows: parseInt(signupData.numDairyCows) || 0,
        primaryBreed: signupData.primaryBreed,
        avgProduction: parseFloat(signupData.avgProduction) || 0,
        farmingType: signupData.farmingType,
        additionalInfo: signupData.additionalInfo,
        bankName: signupData.bankName,
        accountNumber: signupData.accountNumber,
        accountName: signupData.accountName,
        nationalIdFile: uploadedFiles.nationalId || undefined,
        farmCertFile: uploadedFiles.farmCert || undefined,
        kraPinFile: uploadedFiles.kraPin || undefined
      };

      // Validate data
      const validation = FarmerRegistrationService.validateRegistrationData(registrationData);
      if (!validation.isValid) {
        toast.error('Validation Error', validation.errors[0] || 'Please check your information and try again.');
        return;
      }

      // Start farmer registration (this will require email confirmation)
      const result = await FarmerRegistrationService.startRegistration(registrationData);
      
      if (result.success) {
        toast.success('Registration Started', result.message);
        // Redirect to email confirmation page
        navigate('/email-confirmation');
      } else {
        toast.error('Registration Failed', 'Please try again or contact support.');
      }
    } catch (err) {
      console.error('Signup error:', err);
      toast.error('Signup Error', err instanceof Error ? err.message : 'Failed to register');
    } finally {
      setLoading(false);
    }
  };

  // Auto-format phone number for Kenyan format
  useEffect(() => {
    if (signupData.phone && !signupData.phone.startsWith('+254')) {
      let formattedPhone = signupData.phone.replace(/\D/g, '');
      
      if (formattedPhone.startsWith('0')) {
        formattedPhone = '+254' + formattedPhone.substring(1);
      } else if (formattedPhone.startsWith('254')) {
        formattedPhone = '+' + formattedPhone;
      } else if (formattedPhone.startsWith('7') || formattedPhone.startsWith('1')) {
        formattedPhone = '+254' + formattedPhone;
      }
      
      if (formattedPhone !== signupData.phone) {
        handleInputChange('phone', formattedPhone);
      }
    }
  }, [signupData.phone]);

  // Progress bar width calculation
  const progressWidth = `${(currentStep / 3) * 100}%`;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-50 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-green-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{ animationDuration: '6s' }}></div>
        <div className="absolute top-40 right-10 w-96 h-96 bg-blue-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{ animationDuration: '8s', animationDelay: '1s' }}></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-purple-200 rounded-full mix-blend-multiply filter blur-xl opacity-30 animate-pulse" style={{ animationDuration: '10s', animationDelay: '2s' }}></div>
      </div>

      <div className="w-full max-w-6xl space-y-8 relative z-10">
        {/* Header */}
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Users className="w-12 h-12 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent">
              Join CowConnect
            </h1>
            <p className="text-muted-foreground mt-2 text-lg">
              Become part of Kenya's premier dairy farming network and transform your business
            </p>
          </div>
        </div>

        {/* Modern Progress Steps */}
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between relative">
            {/* Step 1 */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-bold text-2xl text-white shadow-lg mb-3 transition-all duration-300 ${
                currentStep >= 1 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 transform scale-110 shadow-lg' 
                  : 'bg-gray-200 text-gray-500'
              } ${currentStep > 1 ? 'bg-gradient-to-br from-green-500 to-emerald-600' : ''}`}>
                {currentStep > 1 ? <CheckCircle className="w-8 h-8" /> : '1'}
              </div>
              <div className="text-center">
                <p className={`text-sm md:text-base font-bold ${currentStep >= 1 ? 'text-gray-900' : 'text-gray-500'}`}>Personal Info</p>
                <p className="text-xs text-gray-500 hidden md:block">Basic details</p>
              </div>
            </div>

            {/* Line 1 */}
            <div className="flex-1 h-2 bg-gray-200 rounded-full mx-4 relative -mt-16">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  currentStep >= 2 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gray-200'
                }`} 
                style={{ width: currentStep >= 2 ? '100%' : '0%' }}
              ></div>
            </div>

            {/* Step 2 */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg mb-3 transition-all duration-300 ${
                currentStep >= 2 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 transform scale-110 shadow-lg text-white' 
                  : 'bg-gray-200 text-gray-500'
              } ${currentStep > 2 ? 'bg-gradient-to-br from-green-500 to-emerald-600 text-white' : ''}`}>
                {currentStep > 2 ? <CheckCircle className="w-8 h-8" /> : '2'}
              </div>
              <div className="text-center">
                <p className={`text-sm md:text-base font-bold ${currentStep >= 2 ? 'text-gray-900' : 'text-gray-500'}`}>Farm Details</p>
                <p className="text-xs text-gray-500 hidden md:block">Your farm info</p>
              </div>
            </div>

            {/* Line 2 */}
            <div className="flex-1 h-2 bg-gray-200 rounded-full mx-4 relative -mt-16">
              <div 
                className={`h-full rounded-full transition-all duration-500 ${
                  currentStep >= 3 ? 'bg-gradient-to-r from-green-500 to-emerald-600' : 'bg-gray-200'
                }`} 
                style={{ width: currentStep >= 3 ? '100%' : '0%' }}
              ></div>
            </div>

            {/* Step 3 */}
            <div className="flex flex-col items-center relative z-10">
              <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full flex items-center justify-center font-bold text-2xl shadow-lg mb-3 transition-all duration-300 ${
                currentStep >= 3 
                  ? 'bg-gradient-to-br from-green-500 to-emerald-600 transform scale-110 shadow-lg text-white' 
                  : 'bg-gray-200 text-gray-500'
              }`}>
                3
              </div>
              <div className="text-center">
                <p className={`text-sm md:text-base font-bold ${currentStep >= 3 ? 'text-gray-900' : 'text-gray-500'}`}>Documents</p>
                <p className="text-xs text-gray-500 hidden md:block">KYC verification</p>
              </div>
            </div>
          </div>
        </div>

        {/* Signup Form */}
        <Card className="border-2 border-primary/10 shadow-2xl bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl">
              {currentStep === 1 && "Personal Information"}
              {currentStep === 2 && "Farm Details"}
              {currentStep === 3 && "Documents & Verification"}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Let's start with your basic details"}
              {currentStep === 2 && "Tell us about your farm and livestock"}
              {currentStep === 3 && "Upload required documents for KYC verification"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSignup} className="space-y-6">
              {/* Step 1: Personal Information */}
              {currentStep === 1 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="flex flex-col items-center space-y-4">
                    <div className="relative">
                      <div className="w-24 h-24 rounded-full bg-muted flex items-center justify-center overflow-hidden border-4 border-white shadow-lg">
                        {previewImage ? (
                          <img src={previewImage} alt="Profile" className="w-full h-full object-cover" />
                        ) : (
                          <User className="w-10 h-10 text-muted-foreground" />
                        )}
                      </div>
                      <label className="absolute bottom-0 right-0 bg-primary rounded-full p-2 cursor-pointer shadow-md hover:scale-105 transition-transform">
                        <Camera className="w-4 h-4 text-primary-foreground" />
                        <input 
                          type="file" 
                          className="hidden" 
                          accept="image/*"
                          onChange={handleProfileUpload}
                        />
                      </label>
                    </div>
                    <p className="text-sm text-muted-foreground">Upload a profile picture</p>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="fullName">Full Name *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="fullName"
                          placeholder="John Doe"
                          value={signupData.fullName}
                          onChange={(e) => handleInputChange('fullName', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                      {fieldErrors.fullName && (
                        <p className="text-sm text-destructive">{fieldErrors.fullName}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email Address *</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="email"
                          type="email"
                          placeholder="john@example.com"
                          value={signupData.email}
                          onChange={(e) => handleInputChange('email', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                      {fieldErrors.email && (
                        <p className="text-sm text-destructive">{fieldErrors.email}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number *</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="phone"
                          type="tel"
                          placeholder="+254 712 345 678"
                          value={signupData.phone}
                          onChange={(e) => handleInputChange('phone', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                      {fieldErrors.phone && (
                        <p className="text-sm text-destructive">{fieldErrors.phone}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="nationalId">National ID Number *</Label>
                      <div className="relative">
                        <FileText className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="nationalId"
                          placeholder="12345678"
                          value={signupData.nationalId}
                          onChange={(e) => handleInputChange('nationalId', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                      {fieldErrors.nationalId && (
                        <p className="text-sm text-destructive">{fieldErrors.nationalId}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="dob">Date of Birth *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="dob"
                          type="date"
                          value={signupData.dob}
                          onChange={(e) => handleInputChange('dob', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                      {fieldErrors.dob && (
                        <p className="text-sm text-destructive">{fieldErrors.dob}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="gender">Gender *</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Select 
                          value={signupData.gender} 
                          onValueChange={(value) => handleInputChange('gender', value)}
                        >
                          <SelectTrigger className="pl-10 h-11">
                            <SelectValue placeholder="Select Gender" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {fieldErrors.gender && (
                        <p className="text-sm text-destructive">{fieldErrors.gender}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="address">Residential Address *</Label>
                    <div className="relative">
                      <Home className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Textarea
                        id="address"
                        placeholder="Enter your complete address"
                        value={signupData.address}
                        onChange={(e) => handleInputChange('address', e.target.value)}
                        className="pl-10"
                        rows={3}
                      />
                    </div>
                    {fieldErrors.address && (
                      <p className="text-sm text-destructive">{fieldErrors.address}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="password">Password *</Label>
                      <div className="relative">
                        <Input
                          id="password"
                          type={showPassword ? "text" : "password"}
                          placeholder="Create a strong password"
                          value={signupData.password}
                          onChange={(e) => handleInputChange('password', e.target.value)}
                          className="pr-10 h-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      <p className="text-xs text-muted-foreground">At least 6 characters</p>
                      {fieldErrors.password && (
                        <p className="text-sm text-destructive">{fieldErrors.password}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm Password *</Label>
                      <div className="relative">
                        <Input
                          id="confirmPassword"
                          type={showConfirmPassword ? "text" : "password"}
                          placeholder="Re-enter password"
                          value={signupData.confirmPassword}
                          onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                          className="pr-10 h-11"
                        />
                        <button
                          type="button"
                          onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                        </button>
                      </div>
                      {fieldErrors.confirmPassword && (
                        <p className="text-sm text-destructive">{fieldErrors.confirmPassword}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Farm Details */}
              {currentStep === 2 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-2">
                    <Label htmlFor="farmName">Farm Name *</Label>
                    <div className="relative">
                      <Home className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="farmName"
                        placeholder="Green Valley Dairy Farm"
                        value={signupData.farmName}
                        onChange={(e) => handleInputChange('farmName', e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                    {fieldErrors.farmName && (
                      <p className="text-sm text-destructive">{fieldErrors.farmName}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="farmLocation">Farm Location *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                      <Input
                        id="farmLocation"
                        placeholder="County, Sub-County, Ward"
                        value={signupData.farmLocation}
                        onChange={(e) => handleInputChange('farmLocation', e.target.value)}
                        className="pl-10 h-11"
                      />
                    </div>
                    {fieldErrors.farmLocation && (
                      <p className="text-sm text-destructive">{fieldErrors.farmLocation}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="farmSize">Farm Size (Acres) *</Label>
                      <div className="relative">
                        <Map className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="farmSize"
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="5.0"
                          value={signupData.farmSize}
                          onChange={(e) => handleInputChange('farmSize', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                      {fieldErrors.farmSize && (
                        <p className="text-sm text-destructive">{fieldErrors.farmSize}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience">Years of Experience *</Label>
                      <div className="relative">
                        <Calendar className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="experience"
                          type="number"
                          min="0"
                          placeholder="10"
                          value={signupData.experience}
                          onChange={(e) => handleInputChange('experience', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                      {fieldErrors.experience && (
                        <p className="text-sm text-destructive">{fieldErrors.experience}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="numCows">Number of Cows *</Label>
                      <div className="relative">
                        <Scale className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="numCows"
                          type="number"
                          min="1"
                          placeholder="15"
                          value={signupData.numCows}
                          onChange={(e) => handleInputChange('numCows', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                      {fieldErrors.numCows && (
                        <p className="text-sm text-destructive">{fieldErrors.numCows}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="numDairyCows">Number of Dairy Cows *</Label>
                      <div className="relative">
                        <Scale className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="numDairyCows"
                          type="number"
                          min="0"
                          placeholder="12"
                          value={signupData.numDairyCows}
                          onChange={(e) => handleInputChange('numDairyCows', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                      {fieldErrors.numDairyCows && (
                        <p className="text-sm text-destructive">{fieldErrors.numDairyCows}</p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="primaryBreed">Primary Breed *</Label>
                      <div className="relative">
                        <Scale className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Select 
                          value={signupData.primaryBreed} 
                          onValueChange={(value) => handleInputChange('primaryBreed', value)}
                        >
                          <SelectTrigger className="pl-10 h-11">
                            <SelectValue placeholder="Select Breed" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="friesian">Friesian</SelectItem>
                            <SelectItem value="ayrshire">Ayrshire</SelectItem>
                            <SelectItem value="jersey">Jersey</SelectItem>
                            <SelectItem value="guernsey">Guernsey</SelectItem>
                            <SelectItem value="crossbreed">Crossbreed</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {fieldErrors.primaryBreed && (
                        <p className="text-sm text-destructive">{fieldErrors.primaryBreed}</p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="avgProduction">Avg Daily Production (Liters) *</Label>
                      <div className="relative">
                        <Wheat className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
                        <Input
                          id="avgProduction"
                          type="number"
                          step="0.1"
                          min="0"
                          placeholder="50.0"
                          value={signupData.avgProduction}
                          onChange={(e) => handleInputChange('avgProduction', e.target.value)}
                          className="pl-10 h-11"
                        />
                      </div>
                      {fieldErrors.avgProduction && (
                        <p className="text-sm text-destructive">{fieldErrors.avgProduction}</p>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Farming Type *</Label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div 
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          signupData.farmingType === 'zero-grazing' 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                        onClick={() => handleInputChange('farmingType', 'zero-grazing')}
                      >
                        <div className="flex items-center space-x-3">
                          <Home className="w-8 h-8 text-green-600" />
                          <div>
                            <div className="font-bold text-gray-900">Zero Grazing</div>
                            <div className="text-sm text-gray-500 mt-1">Indoor feeding system with controlled environment</div>
                          </div>
                        </div>
                      </div>
                      
                      <div 
                        className={`border-2 rounded-xl p-4 cursor-pointer transition-all ${
                          signupData.farmingType === 'free-range' 
                            ? 'border-green-500 bg-green-50' 
                            : 'border-gray-200 hover:border-green-300'
                        }`}
                        onClick={() => handleInputChange('farmingType', 'free-range')}
                      >
                        <div className="flex items-center space-x-3">
                          <Wheat className="w-8 h-8 text-green-600" />
                          <div>
                            <div className="font-bold text-gray-900">Free Range</div>
                            <div className="text-sm text-gray-500 mt-1">Outdoor grazing with natural feeding</div>
                          </div>
                        </div>
                      </div>
                    </div>
                    {fieldErrors.farmingType && (
                      <p className="text-sm text-destructive">{fieldErrors.farmingType}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="additionalInfo">Additional Information</Label>
                    <Textarea
                      id="additionalInfo"
                      placeholder="Tell us more about your farm, special practices, or any questions..."
                      value={signupData.additionalInfo}
                      onChange={(e) => handleInputChange('additionalInfo', e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
              )}

              {/* Step 3: Documents */}
              {currentStep === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                  <div className="space-y-6">
                    {/* National ID Upload */}
                    <div>
                      <Label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                        <FileText className="text-xl mr-2" /> National ID Card *
                      </Label>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-green-500 transition-colors bg-gradient-to-br from-green-50 to-emerald-50"
                        onClick={() => document.getElementById('nationalIdFile')?.click()}
                      >
                        <div className="text-4xl mb-4">📄</div>
                        <p className="text-gray-800 font-bold text-lg mb-2">Click to upload National ID</p>
                        <p className="text-sm text-gray-500">PNG, JPG or PDF (Max 5MB)</p>
                        <input 
                          type="file" 
                          id="nationalIdFile" 
                          className="hidden" 
                          accept="image/*,.pdf" 
                          onChange={(e) => handleFileUpload(e, 'nationalId')}
                        />
                      </div>
                      {filePreviews.nationalId && (
                        <div className="mt-3 text-sm font-semibold text-green-600 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          National ID uploaded successfully
                        </div>
                      )}
                      {fieldErrors.nationalIdFile && (
                        <p className="text-sm text-destructive">{fieldErrors.nationalIdFile}</p>
                      )}
                    </div>

                    {/* Farm Registration */}
                    <div>
                      <Label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                        <Home className="text-xl mr-2" /> Farm Registration Certificate
                      </Label>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-green-500 transition-colors bg-gradient-to-br from-blue-50 to-cyan-50"
                        onClick={() => document.getElementById('farmCertFile')?.click()}
                      >
                        <div className="text-4xl mb-4">🏞️</div>
                        <p className="text-gray-800 font-bold text-lg mb-2">Click to upload Farm Certificate</p>
                        <p className="text-sm text-gray-500">PNG, JPG or PDF (Max 5MB)</p>
                        <input 
                          type="file" 
                          id="farmCertFile" 
                          className="hidden" 
                          accept="image/*,.pdf" 
                          onChange={(e) => handleFileUpload(e, 'farmCert')}
                        />
                      </div>
                      {filePreviews.farmCert && (
                        <div className="mt-3 text-sm font-semibold text-green-600 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Farm Certificate uploaded successfully
                        </div>
                      )}
                    </div>

                    {/* KRA PIN */}
                    <div>
                      <Label className="block text-sm font-bold text-gray-700 mb-3 flex items-center">
                        <ShieldCheck className="text-xl mr-2" /> KRA PIN Certificate
                      </Label>
                      <div 
                        className="border-2 border-dashed border-gray-300 rounded-2xl p-8 text-center cursor-pointer hover:border-green-500 transition-colors bg-gradient-to-br from-purple-50 to-violet-50"
                        onClick={() => document.getElementById('kraPinFile')?.click()}
                      >
                        <div className="text-4xl mb-4">💼</div>
                        <p className="text-gray-800 font-bold text-lg mb-2">Click to upload KRA PIN</p>
                        <p className="text-sm text-gray-500">PNG, JPG or PDF (Max 5MB)</p>
                        <input 
                          type="file" 
                          id="kraPinFile" 
                          className="hidden" 
                          accept="image/*,.pdf" 
                          onChange={(e) => handleFileUpload(e, 'kraPin')}
                        />
                      </div>
                      {filePreviews.kraPin && (
                        <div className="mt-3 text-sm font-semibold text-green-600 flex items-center">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          KRA PIN uploaded successfully
                        </div>
                      )}
                    </div>

                    {/* Bank Details */}
                    <div className="bg-gradient-to-br from-blue-50 to-cyan-50 border-2 border-blue-200 rounded-2xl p-6">
                      <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center">
                        <Banknote className="text-2xl mr-3" /> Bank Account Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="bankName">Bank Name *</Label>
                          <Select 
                            value={signupData.bankName} 
                            onValueChange={(value) => handleInputChange('bankName', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select Bank" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="equity">Equity Bank</SelectItem>
                              <SelectItem value="kcb">KCB Bank</SelectItem>
                              <SelectItem value="coop">Co-operative Bank</SelectItem>
                              <SelectItem value="absa">Absa Bank</SelectItem>
                              <SelectItem value="ncba">NCBA Bank</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          {fieldErrors.bankName && (
                            <p className="text-sm text-destructive">{fieldErrors.bankName}</p>
                          )}
                        </div>
                        
                        <div className="space-y-2">
                          <Label htmlFor="accountNumber">Account Number *</Label>
                          <Input
                            id="accountNumber"
                            placeholder="1234567890"
                            value={signupData.accountNumber}
                            onChange={(e) => handleInputChange('accountNumber', e.target.value)}
                          />
                          {fieldErrors.accountNumber && (
                            <p className="text-sm text-destructive">{fieldErrors.accountNumber}</p>
                          )}
                        </div>
                        
                        <div className="md:col-span-2 space-y-2">
                          <Label htmlFor="accountName">Account Name *</Label>
                          <Input
                            id="accountName"
                            placeholder="John Doe"
                            value={signupData.accountName}
                            onChange={(e) => handleInputChange('accountName', e.target.value)}
                          />
                          {fieldErrors.accountName && (
                            <p className="text-sm text-destructive">{fieldErrors.accountName}</p>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Terms and Conditions */}
                    <div className="bg-gradient-to-br from-gray-50 to-gray-100 border-2 border-gray-300 rounded-2xl p-6">
                      <div className="flex items-start space-x-4">
                        <div className="mt-1">
                          <input
                            type="checkbox"
                            id="termsCheckbox"
                            checked={signupData.termsAccepted}
                            onChange={(e) => handleInputChange('termsAccepted', e.target.checked)}
                            className="w-5 h-5 text-green-600 rounded border-2 border-gray-300"
                          />
                        </div>
                        <div className="text-sm text-gray-700">
                          <Label htmlFor="termsCheckbox" className="font-bold text-base cursor-pointer">
                            I agree to the Terms and Conditions *
                          </Label>
                          <p className="text-gray-600 mt-2 leading-relaxed">
                            By registering, I confirm that all information provided is accurate and I agree to CowConnect's terms of service, privacy policy, and milk collection guidelines.
                          </p>
                        </div>
                      </div>
                      {fieldErrors.terms && (
                        <p className="text-sm text-destructive mt-2">{fieldErrors.terms}</p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-6">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStep === 1 || loading}
                  className="px-6"
                >
                  ← Back
                </Button>
                
                {currentStep < 3 ? (
                  <Button
                    type="button"
                    onClick={handleNext}
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6"
                  >
                    Next Step →
                  </Button>
                ) : (
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 px-6"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Completing Registration...
                      </>
                    ) : (
                      "Complete Registration ✓"
                    )}
                  </Button>
                )}
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button
            variant="ghost"
            onClick={() => navigate('/farmer/login')}
            className="text-muted-foreground hover:text-foreground"
          >
            Already have an account? Sign In
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedFarmerSignup;