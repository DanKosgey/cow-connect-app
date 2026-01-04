import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { OtpService } from '@/services/otp-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Mail, Key, Eye, EyeOff } from 'lucide-react';

export const PasswordResetRequest: React.FC = () => {
  const navigate = useNavigate();
  const { updatePassword } = useAuth(); // We need updatePassword from context
  const [step, setStep] = useState<'email' | 'otp' | 'password' | 'success'>('email');

  // Form State
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // UI State
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Constants
  const OTP_LENGTH = 6;

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      // Use OtpService to send OTP (acts as "Login with OTP" initiation)
      // Import OtpService dynamically or assume it's available via module scope if imported at top
      // Assuming clean import: import { OtpService } from '@/services/otp-service';
      await OtpService.sendOtp(email, { is_recovery: true });

      setStep('otp');
    } catch (err: any) {
      console.error('Send OTP error:', err);
      setError(err.message || 'Failed to send verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      if (otp.length !== OTP_LENGTH) throw new Error(`Code must be ${OTP_LENGTH} digits`);

      // Verify OTP - this will log the user in if successful
      const result = await OtpService.verifyOtp(email, otp);

      if (result.user) {
        setStep('password');
      } else {
        throw new Error('Verification failed');
      }
    } catch (err: any) {
      console.error('Verify OTP error:', err);
      setError(err.message || 'Invalid verification code');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    setIsLoading(true);

    try {
      // Call updatePassword from AuthContext (which calls Supabase updateUser)
      const { error: updateError } = await updatePassword(newPassword);

      if (updateError) throw updateError;

      setStep('success');
    } catch (err: any) {
      console.error('Update password error:', err);
      setError(err.message || 'Failed to update password');
    } finally {
      setIsLoading(false);
    }
  };

  // Render Helpers
  const renderEmailStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Reset Password</CardTitle>
        <CardDescription>
          Enter your email to receive a verification code
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email Address</Label>
            <Input
              id="email"
              type="email"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {error && <div className="text-sm text-destructive text-center">{error}</div>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <span className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Sending...</span> : "Send Code"}
          </Button>
        </form>
      </CardContent>
      <CardFooter className="justify-center">
        <Button variant="link" onClick={() => navigate('/login')} className="text-muted-foreground p-0 h-auto">
          Back to Login
        </Button>
      </CardFooter>
    </Card>
  );

  const renderOtpStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Mail className="w-6 h-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Verify Email</CardTitle>
        <CardDescription>
          Enter the {OTP_LENGTH}-digit code sent to {email}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="otp">Verification Code</Label>
            <Input
              id="otp"
              type="text"
              inputMode="numeric"
              maxLength={OTP_LENGTH}
              placeholder="123456"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} // Only numbers
              className="text-center text-lg tracking-widest"
              required
              disabled={isLoading}
            />
          </div>
          {error && <div className="text-sm text-destructive text-center">{error}</div>}
          <Button type="submit" className="w-full" disabled={isLoading || otp.length !== OTP_LENGTH}>
            {isLoading ? <span className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Verifying...</span> : "Verify Code"}
          </Button>
          <div className="text-center">
            <Button type="button" variant="link" onClick={() => setStep('email')} disabled={isLoading} className="text-sm">
              Change Email
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );

  const renderPasswordStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <Key className="w-6 h-6 text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl">Set New Password</CardTitle>
        <CardDescription>
          Enter your new password below
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="newPassword">New Password</Label>
            <div className="relative">
              <Input
                id="newPassword"
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter new password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                disabled={isLoading}
                minLength={6}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={isLoading}
            />
          </div>
          {error && <div className="text-sm text-destructive text-center">{error}</div>}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? <span className="flex items-center gap-2"><div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" /> Updating...</span> : "Reset Password"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );

  const renderSuccessStep = () => (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
            <Key className="w-6 h-6 text-white" />
          </div>
        </div>
        <CardTitle className="text-2xl">Password Updated!</CardTitle>
        <CardDescription>
          Your password has been successfully reset.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-center">
        <p className="text-muted-foreground mb-4">You are now logged in with your new password.</p>
        <Button onClick={() => navigate('/login')} className="w-full">
          Refresh / Go to Dashboard
        </Button>
      </CardContent>
    </Card>
  );

  switch (step) {
    case 'email': return renderEmailStep();
    case 'otp': return renderOtpStep();
    case 'password': return renderPasswordStep();
    case 'success': return renderSuccessStep();
    default: return renderEmailStep();
  }
};

export const PasswordResetForm: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { updatePassword, isLoading } = useAuth();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<boolean>(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validation
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters long');
      return;
    }

    try {
      const { error: updateError } = await updatePassword(password);

      if (updateError) {
        setError(updateError.message || 'Failed to update password');
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      console.error('Password update error:', err);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-green-500 flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Password Updated!</CardTitle>
          <CardDescription>
            Your password has been successfully changed
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            You can now sign in with your new password.
          </p>
          <Button
            onClick={() => navigate('/login')}
            className="w-full"
          >
            Go to Login
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Check if we have a valid token
  const token = searchParams.get('token_hash');
  const type = searchParams.get('type');

  if (!token || type !== 'recovery') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardHeader className="space-y-1 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-12 h-12 rounded-full bg-destructive flex items-center justify-center">
              <Key className="w-6 h-6 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl">Invalid Reset Link</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired
          </CardDescription>
        </CardHeader>

        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            Please request a new password reset link.
          </p>
          <Button
            onClick={() => navigate('/auth/forgot-password')}
            className="w-full"
          >
            Request New Reset Link
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="space-y-1 text-center">
        <div className="flex justify-center mb-4">
          <div className="w-12 h-12 rounded-full bg-primary flex items-center justify-center">
            <Key className="w-6 h-6 text-primary-foreground" />
          </div>
        </div>
        <CardTitle className="text-2xl">Set New Password</CardTitle>
        <CardDescription>
          Create a new password for your account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="Enter new password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (error) setError(null);
              }}
              required
              disabled={isLoading}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => {
                setConfirmPassword(e.target.value);
                if (error) setError(null);
              }}
              required
              disabled={isLoading}
            />
          </div>

          {error && (
            <div className="text-sm text-destructive text-center py-2">
              {error}
            </div>
          )}

          <Button
            type="submit"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent mr-2"></span>
                Updating...
              </span>
            ) : (
              "Update Password"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};