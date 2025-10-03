import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Milk, Eye, EyeOff, User, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { RegisterRequest } from '@/types';
import apiService from '@/services/ApiService';

export default function FarmerRegister() {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    full_name: '',
    phone: '',
    address: '',
    national_id: ''
  });
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerLoading, setRegisterLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: Account, 2: Personal Info, 3: Confirmation
  const [registeredUser, setRegisteredUser] = useState<any>(null);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate passwords match
    if (formData.password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    // Validate password strength
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setRegisterLoading(true);

    try {
      // Register the user account first
      const registerData: RegisterRequest = {
        username: formData.username,
        email: formData.email,
        password: formData.password,
        full_name: formData.full_name
      };

      // Register the user
      const response = await apiService.Auth.register(registerData);
      setRegisteredUser(response);
      
      // After successful registration, move to next step
      setStep(2);
    } catch (err: any) {
      console.error('Registration error:', err);
      // Handle different types of errors
      if (err.response?.status === 400) {
        setError('Username or email already exists. Please choose a different one.');
      } else if (err.response?.status === 500) {
        setError('Server error. Please try again later.');
      } else {
        setError(err.response?.data?.detail || err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleFarmerInfoSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      // Create farmer profile with data matching the backend FarmerCreate model
      const farmerData = {
        name: formData.full_name,
        phone: formData.phone,
        email: formData.email,
        national_id: formData.national_id,
        address: formData.address,
        location_coordinates: {
          latitude: 0.0,
          longitude: 0.0
        }
      };

      console.log('🚜 Creating farmer with data:', farmerData);

      // Use the public registration endpoint that doesn't require authentication
      const response = await fetch('/api/v1/farmers/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(farmerData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(`HTTP ${response.status}: ${errorData.detail || errorData.message || 'Unknown error'}`);
      }

      const result = await response.json();
      console.log('✅ Farmer created successfully:', result);

      // After successful farmer profile creation, move to confirmation
      setStep(3);
    } catch (err: any) {
      console.error('❌ Farmer profile creation error:', err);
      
      let userFriendlyMessage = 'Failed to create farmer profile. ';
      
      if (err.message.includes('405')) {
        userFriendlyMessage += 'The registration endpoint may not be properly configured. Please contact support.';
      } else if (err.message.includes('404')) {
        userFriendlyMessage += 'Registration endpoint not found. Please contact support.';
      } else if (err.message.includes('401') || err.message.includes('403')) {
        userFriendlyMessage += 'Authentication required. Please log in again or contact an administrator to create your farmer profile.';
      } else if (err.message.includes('422')) {
        userFriendlyMessage += 'Please check your input data and try again.';
      } else if (err.message.includes('Network error')) {
        userFriendlyMessage += 'Please check your internet connection and try again.';
      } else {
        userFriendlyMessage += 'Please try again or contact support if the problem persists.';
      }
      
      setError(userFriendlyMessage);
    }
  };

  const handleComplete = () => {
    // Navigate to login page after completing registration
    navigate('/login');
  };

  // If registration is complete, we can redirect to login
  if (step === 3) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
        <Card className="w-full max-w-2xl shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <CardHeader className="space-y-4 text-center">
            <div className="mx-auto w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
              <Milk className="h-8 w-8 text-white" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-emerald-700">
                Registration Complete
              </CardTitle>
              <CardDescription className="text-emerald-600">
                Your account has been created successfully
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent>
            <div className="text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto">
                <User className="h-8 w-8 text-emerald-600" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-xl font-semibold text-emerald-800">Registration Successful!</h3>
                <p className="text-emerald-600">
                  Your account has been created. You can now proceed to login and complete your KYC verification.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-emerald-900 mb-2">Next Steps:</h4>
                <ul className="text-sm text-emerald-700 space-y-1">
                  <li>• Verify your email address (check your inbox)</li>
                  <li>• Complete your KYC verification</li>
                  <li>• Start delivering milk</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/login" className="flex-1">
                  <Button className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg">
                    Continue to Login
                  </Button>
                </Link>
              </div>
            </div>

            <div className="mt-6 text-center">
              <Link
                to="/"
                className="text-sm text-emerald-600 hover:text-emerald-700 underline"
              >
                Back to Homepage
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-emerald-50 to-teal-50 p-4">
      <Card className="w-full max-w-2xl shadow-xl border-0 bg-white/80 backdrop-blur-sm">
        <CardHeader className="space-y-4 text-center">
          <div className="mx-auto w-16 h-16 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
            <Milk className="h-8 w-8 text-white" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold text-emerald-700">
              {step === 1 && "Create Farmer Account"}
              {step === 2 && "Farmer Information"}
            </CardTitle>
            <CardDescription className="text-emerald-600">
              {step === 1 && "Create your account to get started"}
              {step === 2 && "Provide your personal information"}
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {step === 1 && (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="full_name" className="text-emerald-700 font-medium">
                  Full Name
                </Label>
                <Input
                  id="full_name"
                  name="full_name"
                  type="text"
                  value={formData.full_name}
                  onChange={handleChange}
                  placeholder="Enter your full name"
                  required
                  className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="username" className="text-emerald-700 font-medium">
                  Username
                </Label>
                <Input
                  id="username"
                  name="username"
                  type="text"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a username"
                  required
                  className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email" className="text-emerald-700 font-medium">
                  Email Address
                </Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="Enter your email"
                  required
                  className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password" className="text-emerald-700 font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    value={formData.password}
                    onChange={handleChange}
                    placeholder="Create a password"
                    required
                    className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-700"
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirmPassword" className="text-emerald-700 font-medium">
                  Confirm Password
                </Label>
                <div className="relative">
                  <Input
                    id="confirmPassword"
                    name="confirmPassword"
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm your password"
                    required
                    className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-emerald-600 hover:text-emerald-700"
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
              </div>

              <Button
                type="submit"
                disabled={registerLoading}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
              >
                {registerLoading ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Create Account'
                )}
                {registerLoading && 'Creating Account...'}
              </Button>
            </form>
          )}

          {step === 2 && (
            <form onSubmit={handleFarmerInfoSubmit} className="space-y-4">
              {error && (
                <Alert className="border-red-200 bg-red-50">
                  <AlertDescription className="text-red-800">
                    {error}
                  </AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="phone" className="text-emerald-700 font-medium flex items-center">
                  <Phone className="h-4 w-4 mr-2" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  name="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={handleChange}
                  placeholder="+254 700 000 000"
                  required
                  className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="address" className="text-emerald-700 font-medium flex items-center">
                  <MapPin className="h-4 w-4 mr-2" />
                  Physical Address
                </Label>
                <Input
                  id="address"
                  name="address"
                  type="text"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder="Your farm location"
                  required
                  className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="national_id" className="text-emerald-700 font-medium flex items-center">
                  <FileText className="h-4 w-4 mr-2" />
                  National ID Number
                </Label>
                <Input
                  id="national_id"
                  name="national_id"
                  type="text"
                  value={formData.national_id}
                  onChange={handleChange}
                  placeholder="Enter your ID number"
                  required
                  className="border-emerald-200 focus:border-emerald-500 focus:ring-emerald-500"
                />
              </div>

              <div className="flex space-x-4 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep(1)}
                  className="flex-1 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={registerLoading}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg"
                >
                  {registerLoading ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    'Complete Registration'
                  )}
                  {registerLoading && 'Saving...'}
                </Button>
              </div>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link
              to="/"
              className="text-sm text-emerald-600 hover:text-emerald-700 underline"
            >
              Back to Homepage
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}