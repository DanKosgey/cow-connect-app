import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { UserRole } from '@/types/auth.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Eye, EyeOff, Lock } from 'lucide-react';

interface LoginFormProps {
  role: UserRole;
  onRoleChange: (role: UserRole) => void;
}

export const LoginForm: React.FC<LoginFormProps> = ({ role, onRoleChange }) => {
  const navigate = useNavigate();
  const { login, isLoading } = useAuth();
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });
  const [error, setError] = useState<string | null>(null);

  const roleOptions = [
    { value: UserRole.FARMER, label: 'Farmer' },
    { value: UserRole.COLLECTOR, label: 'Field Collector' },
    { value: UserRole.STAFF, label: 'Office Admin' },
    { value: UserRole.CREDITOR, label: 'Agrovet Creditor' },
    { value: UserRole.ADMIN, label: 'Admin' }
  ];

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const { error: loginError } = await login({
        email: formData.email,
        password: formData.password
      });
      
      if (loginError) {
        setError(loginError.message || 'Invalid credentials');
        return;
      }
      
      // Redirect based on role
      const dashboardRoutes: Record<UserRole, string> = {
        [UserRole.ADMIN]: '/admin/dashboard',
        [UserRole.COLLECTOR]: '/collector/dashboard',
        [UserRole.STAFF]: '/staff/dashboard',
        [UserRole.FARMER]: '/farmer/dashboard',
        [UserRole.CREDITOR]: '/creditor/dashboard'
      };
      
      navigate(dashboardRoutes[role] || '/');
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Login error:', err);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <Lock className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl">Sign In</CardTitle>
        <CardDescription>
          Enter your credentials to access your account
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Role Selection */}
          <div className="space-y-2">
            <Label htmlFor="role">I am a:</Label>
            <div className="grid grid-cols-2 gap-2">
              {roleOptions.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  variant={role === option.value ? "default" : "outline"}
                  className="h-12 text-sm"
                  onClick={() => onRoleChange(option.value)}
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>
          
          {/* Email Field */}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>
          
          {/* Password Field */}
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={formData.password}
                onChange={handleInputChange}
                required
                disabled={isLoading}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
          
          {/* Error Message */}
          {error && (
            <div className="text-sm text-destructive text-center py-2">
              {error}
            </div>
          )}
          
          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></span>
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </Button>
        </form>
      </CardContent>
      
      <CardFooter className="flex flex-col space-y-4">
        <div className="text-sm text-center text-muted-foreground">
          <Button
            variant="link"
            className="p-0 h-auto text-muted-foreground"
            onClick={() => navigate('/auth/forgot-password')}
          >
            Forgot your password?
          </Button>
        </div>
        
        <div className="text-sm text-center text-muted-foreground">
          Don't have an account?{' '}
          <Button
            variant="link"
            className="p-0 h-auto text-muted-foreground"
            onClick={() => navigate('/auth/signup')}
          >
            Sign up
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};