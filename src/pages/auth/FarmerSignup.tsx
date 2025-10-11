import { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users, Eye, EyeOff, Mail, Phone, User, MapPin, FileText, Camera, Loader2, CheckCircle, ChevronRight, Leaf, Milk, Home, ArrowLeft, VenetianMask, Map, X, Upload, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useToastNotifications from "@/hooks/useToastNotifications";
import { supabase } from "@/integrations/supabase/client";

const FarmerSignup = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToastNotifications();
  const [currentStep, setCurrentStep] = useState(1);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  
  const [formData, setFormData] = useState({
    // Step 1: Personal Details
    fullName: "",
    email: "",
    phone: "",
    gender: "",
    age: "",
    idNumber: "",
    password: "",
    confirmPassword: "",
    
    // Step 2: Farm Details
    numberOfCows: "",
    cowBreeds: [{ breedName: "", count: "" }],
    breedingMethod: "",
    feedingType: "",
    farmLocation: "",
    
    // Step 3: KYC Documents
    idFrontFile: null as File | null,
    idBackFile: null as File | null,
    selfieFile: null as File | null,
    idFrontPreview: "",
    idBackPreview: "",
    selfiePreview: ""
  });

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

  const handleCowBreedChange = (index: number, field: string, value: string) => {
    const updatedCowBreeds = [...formData.cowBreeds];
    updatedCowBreeds[index] = { ...updatedCowBreeds[index], [field]: value };
    setFormData(prev => ({ ...prev, cowBreeds: updatedCowBreeds }));
  };

  const addCowBreed = () => {
    setFormData(prev => ({
      ...prev,
      cowBreeds: [...prev.cowBreeds, { breedName: "", count: "" }]
    }));
  };

  const removeCowBreed = (index: number) => {
    if (formData.cowBreeds.length <= 1) return;
    setFormData(prev => ({
      ...prev,
      cowBreeds: prev.cowBreeds.filter((_, i) => i !== index)
    }));
  };

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
    if (!file.type.startsWith('image/')) {
      toast.error("Invalid File", "Please upload an image file (JPEG, PNG)");
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File Too Large", "Please upload an image smaller than 5MB");
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
    reader.readAsDataURL(file);
  };

  const validateStep = (step: number) => {
    if (step === 1) {
      // Personal Details validation
      if (!formData.fullName || !formData.email || !formData.phone || !formData.gender || !formData.age || !formData.idNumber) {
        toast.error("Please fill in all required fields");
        return false;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
        toast.error("Please enter a valid email address");
        return false;
      }
      if (!/^\+254[1-9]\d{8}$/.test(formData.phone)) {
        toast.error("Please enter a valid Kenyan phone number (+254...)");
        return false;
      }
      if (!formData.age || isNaN(Number(formData.age)) || Number(formData.age) < 18 || Number(formData.age) > 100) {
        toast.error("Age must be between 18 and 100");
        return false;
      }
      if (!formData.idNumber.trim()) {
        toast.error("ID Number is required");
        return false;
      }
      
      // Password validation
      if (formData.password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return false;
      }
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(formData.password)) {
        toast.error("Password must include uppercase, lowercase, and number");
        return false;
      }
      if (formData.password !== formData.confirmPassword) {
        toast.error("Passwords do not match");
        return false;
      }
    } else if (step === 2) {
      // Farm Details validation
      if (!formData.numberOfCows || !formData.breedingMethod || !formData.feedingType || !formData.farmLocation) {
        toast.error("Please fill in all required fields");
        return false;
      }
      if (isNaN(Number(formData.numberOfCows)) || Number(formData.numberOfCows) <= 0) {
        toast.error("Please enter a valid number of cows");
        return false;
      }
      
      // Validate cow breeds
      if (formData.cowBreeds.length === 0 || formData.cowBreeds.some(breed => !breed.breedName || !breed.count || isNaN(Number(breed.count)) || Number(breed.count) <= 0)) {
        toast.error("Please specify at least one breed with valid count");
        return false;
      }
      
      // Validate that total cows across breeds doesn't exceed total number of cows
      const totalCowsInBreeds = formData.cowBreeds.reduce((sum, breed) => sum + Number(breed.count), 0);
      if (totalCowsInBreeds > Number(formData.numberOfCows)) {
        toast.error("Total cows across breeds cannot exceed total number of cows");
        return false;
      }
    } else if (step === 3) {
      // KYC Documents validation
      if (!formData.idFrontFile) {
        toast.error("Please upload ID front photo");
        return false;
      }
      if (!formData.idBackFile) {
        toast.error("Please upload ID back photo");
        return false;
      }
      if (!formData.selfieFile) {
        toast.error("Please upload selfie photo");
        return false;
      }
    }
    return true;
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
      
      // Step 1: Create user account with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/verify-email`,
          data: {
            full_name: formData.fullName,
            phone: formData.phone,
            role: 'farmer',
            gender: formData.gender
          }
        }
      });

      console.log('FarmerSignup: Supabase signup response', { authData, authError });

      if (authError) throw new Error(authError.message);
      if (!authData.user) throw new Error("Failed to create user account");

      const userId = authData.user.id;
      console.log('FarmerSignup: User created with ID', userId);

      // Step 2: Create pending_farmer record (without document URLs for now)
      // We'll update the document URLs after email verification
      const { error: insertError } = await supabase
        .from('pending_farmers')
        .insert({
          user_id: userId,
          full_name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
          gender: formData.gender,
          age: parseInt(formData.age),
          id_number: formData.idNumber,
          number_of_cows: parseInt(formData.numberOfCows),
          cow_breeds: formData.cowBreeds,
          breeding_method: formData.breedingMethod,
          feeding_type: formData.feedingType,
          farm_location: formData.farmLocation,
          id_front_url: null,
          id_back_url: null,
          selfie_url: null,
          status: 'pending',
          email_verified: false
        });

      if (insertError) throw insertError;

      console.log('FarmerSignup: Pending farmer record created successfully');

      // Step 3: Store file data temporarily in localStorage for upload after email verification
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
      
      localStorage.setItem('pending_kyc_files', JSON.stringify(fileData));
      
      // Store the actual files as data URLs
      if (formData.idFrontPreview) {
        localStorage.setItem(`kyc_file_${userId}_id_front`, formData.idFrontPreview);
      }
      if (formData.idBackPreview) {
        localStorage.setItem(`kyc_file_${userId}_id_back`, formData.idBackPreview);
      }
      if (formData.selfiePreview) {
        localStorage.setItem(`kyc_file_${userId}_selfie`, formData.selfiePreview);
      }

      // Step 4: Store minimal data for documents under review page
      localStorage.setItem('pending_registration', JSON.stringify({
        email: formData.email,
        full_name: formData.fullName,
        submitted_at: new Date().toISOString(),
        user_id: userId
      }));

      toast.success("Registration Submitted", "Your application has been submitted for review. Please check your email for verification.");
      
      // Step 5: Redirect to Documents Under Review page
      navigate('/documents-under-review');
      
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error("Registration Error", error.message || "Failed to complete registration. Please check your internet connection and try again.");
    } finally {
      setLoading(false);
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
                            <SelectItem value="both">Both</SelectItem>
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
                            className="pl-10 h-11"
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Cow Breeds Section */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <Label>Cow Breeds *</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addCowBreed}>
                          Add Breed
                        </Button>
                      </div>
                      
                      {formData.cowBreeds.map((breed, index) => (
                        <div key={index} className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 border rounded-lg">
                          <div className="md:col-span-2 space-y-2">
                            <Label htmlFor={`breedName-${index}`}>Breed Name</Label>
                            <Input
                              id={`breedName-${index}`}
                              placeholder="e.g., Friesian, Jersey, Ayrshire"
                              value={breed.breedName}
                              onChange={(e) => handleCowBreedChange(index, 'breedName', e.target.value)}
                              className="h-11"
                            />
                          </div>
                          
                          <div className="space-y-2">
                            <Label htmlFor={`breedCount-${index}`}>Number of Cows</Label>
                            <div className="flex gap-2">
                              <Input
                                id={`breedCount-${index}`}
                                type="number"
                                placeholder="Count"
                                value={breed.count}
                                onChange={(e) => handleCowBreedChange(index, 'count', e.target.value)}
                                className="h-11 flex-1"
                                min="1"
                              />
                              {formData.cowBreeds.length > 1 && (
                                <Button 
                                  type="button" 
                                  variant="outline" 
                                  size="icon"
                                  onClick={() => removeCowBreed(index)}
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
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
                            <li>• You'll receive an email confirmation link</li>
                            <li>• Please verify your email address</li>
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
};

export default FarmerSignup;
