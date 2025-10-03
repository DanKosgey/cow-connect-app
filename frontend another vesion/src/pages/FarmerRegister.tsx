import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Milk, Eye, EyeOff, User, Mail, Phone, MapPin, FileText } from 'lucide-react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useToastContext } from '@/components/ToastWrapper';
import { supabaseFastApiAuth } from '@/services/supabaseFastApiAuth';

export default function FarmerRegister() {
  const navigate = useNavigate();
  const toast = useToastContext();
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
      // Register the user account using the new FastAPI auth system
      const response = await supabaseFastApiAuth.signup({
        email: formData.email,
        password: formData.password,
        metadata: {
          full_name: formData.full_name,
          phone: formData.phone,
          address: formData.address,
          national_id: formData.national_id
        }
      });
      
      setRegisteredUser(response);
      
      // Show success message
      if (toast) {
        toast.showSuccess('Registration Successful', response.message || 'Please check your email to verify your account.');
      }
      
      // Move to confirmation step
      setStep(3);
    } catch (err: any) {
      console.error('Registration error:', err);
      // Handle different types of errors
      if (err.message && err.message.includes('exists')) {
        setError('Email already exists. Please use a different email or try logging in.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
      
      // Show error toast
      if (toast) {
        toast.showError('Registration Failed', err.message || 'Please try again.');
      }
    } finally {
      setRegisterLoading(false);
    }
  };

  const handleComplete = () => {
    // Navigate to login page after completing registration
    navigate('/farmer/login');
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
                  Your account has been created. Please check your email to verify your account before logging in.
                </p>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 text-left">
                <h4 className="font-medium text-emerald-900 mb-2">Next Steps:</h4>
                <ul className="text-sm text-emerald-700 space-y-1">
                  <li>• Verify your email address (check your inbox)</li>
                  <li>• Log in to your account</li>
                  <li>• Complete your profile information</li>
                </ul>
              </div>

              <div className="flex flex-col sm:flex-row gap-4 pt-4">
                <Link to="/farmer/login" className="flex-1">
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
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-emerald-600 mb-2">
              Already have an account?{' '}
              <Link to="/farmer/login" className="font-medium underline">
                Sign in here
              </Link>
            </p>
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