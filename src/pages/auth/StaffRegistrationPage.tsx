import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { OtpService } from '@/services/otp-service';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle, Eye, EyeOff, Mail, ArrowLeft, RefreshCw, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

const StaffRegistrationPage = () => {
    const { token } = useParams<{ token: string }>();
    const navigate = useNavigate();
    const { toast } = useToast();

    // Verification & Loading State
    const [isLoading, setIsLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isValidToken, setIsValidToken] = useState(false);
    const [invitationData, setInvitationData] = useState<any>(null);
    const [showPassword, setShowPassword] = useState(false);

    // Flow State
    const [step, setStep] = useState<'form' | 'otp'>('form');
    const [otp, setOtp] = useState("");

    // Form State
    const [formData, setFormData] = useState({
        email: '',
        password: '',
        confirmPassword: '',
        fullName: '',
        phoneNumber: '',
        nationalId: '',
        address: '',
        gender: '',
        role: '',
    });

    useEffect(() => {
        validateToken();
    }, [token]);

    const validateToken = async () => {
        if (!token) {
            setIsLoading(false);
            return;
        }

        try {
            const { data, error } = await supabase
                .from('staff_invitations')
                .select('*')
                .eq('invitation_token', token)
                .single();

            if (error || !data) throw new Error('Invalid or expired invitation link');
            if (data.status !== 'pending') throw new Error('This invitation has already been used or expired');
            if (new Date(data.expires_at) < new Date()) throw new Error('This invitation has expired');

            setInvitationData(data);
            setFormData(prev => ({
                ...prev,
                email: data.email,
                role: data.suggested_role || 'staff'
            }));
            setIsValidToken(true);
        } catch (error: any) {
            console.error('Token validation error:', error);
            toast({
                title: 'Invitation Error',
                description: error.message,
                variant: 'destructive'
            });
            setIsValidToken(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (formData.password !== formData.confirmPassword) {
            toast({ title: 'Password Mismatch', description: 'Passwords do not match', variant: 'destructive' });
            return;
        }
        if (formData.password.length < 8) {
            toast({ title: 'Weak Password', description: 'Password must be at least 8 characters', variant: 'destructive' });
            return;
        }

        setIsSubmitting(true);

        try {
            // Prepare metadata for the user
            const metadata = {
                full_name: formData.fullName,
                phone_number: formData.phoneNumber,
                national_id: formData.nationalId,
                address: formData.address,
                gender: formData.gender,
                requested_role: formData.role,
                invitation_id: invitationData.id,
                is_staff_registration: true
            };

            // Use OtpService to send OTP (via signInWithOtp)
            await OtpService.sendOtp(formData.email, metadata);

            toast({ title: 'Verification Code Sent', description: `We sent a code to ${formData.email}` });
            setStep('otp');

        } catch (error: any) {
            console.error('Registration error:', error);
            let message = error.message;
            if (message.includes('already registered') || message.includes('already exists')) {
                message = 'This email is already registered. Please log in.';
            } else if (message.includes('security purposes') || message.includes('Too many requests') || error.status === 429) {
                // Extract time if possible, otherwise generic wait message
                const waitTime = message.match(/after (\d+) seconds/);
                if (waitTime) {
                    message = `Too many attempts. Please wait ${waitTime[1]} seconds before trying again.`;
                } else {
                    message = 'Too many attempts. Please wait a few minutes before trying again.';
                }
            }
            toast({
                title: 'Registration Error',
                description: message,
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (otp.length !== 6) {
            toast({ title: 'Invalid Code', description: 'Please enter a 6-digit code', variant: 'destructive' });
            return;
        }
        setIsSubmitting(true);
        try {
            // 1. Verify OTP
            const result = await OtpService.verifyOtp(formData.email, otp);

            if (!result.user) throw new Error('Verification failed');

            // 2. Set Password (since signInWithOtp doesn't set it)
            const { error: passwordError } = await supabase.auth.updateUser({
                password: formData.password
            });

            if (passwordError) {
                console.error("Failed to set password:", passwordError);
                toast({
                    title: 'Semi-Success',
                    description: 'Email verified, but failed to set password. You may need to use "Forgot Password" later.',
                    variant: 'destructive'
                });
            } else {
                toast({ title: 'Verified!', description: 'Registration complete.' });
            }

            navigate('/staff/application-status');
        } catch (error: any) {
            console.error('Verification error:', error);
            toast({ title: 'Verification Failed', description: error.message || 'Invalid code', variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleResendOtp = async () => {
        setIsSubmitting(true);
        try {
            const metadata = {
                full_name: formData.fullName,
                phone_number: formData.phoneNumber,
                national_id: formData.nationalId,
                address: formData.address,
                gender: formData.gender,
                requested_role: formData.role,
                invitation_id: invitationData.id,
                is_staff_registration: true
            };
            await OtpService.sendOtp(formData.email, metadata);
            toast({ title: 'Code Resent', description: 'Please check your email.' });
        } catch (error: any) {
            let message = error.message;
            if (message.includes('security purposes') || error.status === 429) {
                message = 'Please wait a moment before resending.';
            }
            toast({ title: 'Failed to Resend', description: message, variant: 'destructive' });
        } finally {
            setIsSubmitting(false);
        }
    };

    if (isLoading) return <div className="flex justify-center items-center min-h-screen bg-gray-50"><Loader2 className="h-8 w-8 animate-spin text-green-600" /></div>;
    if (!isValidToken) return null;

    return (
        <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-gray-900">Staff Registration</h1>
                    <p className="mt-2 text-gray-600">Complete your profile to join Dairy Farmers of Trans Nzoia</p>
                </div>

                <Card>
                    <CardHeader>
                        <CardTitle>{step === 'form' ? 'Personal Information' : 'Verify Your Email'}</CardTitle>
                        <CardDescription>
                            {step === 'form' ? 'Please enter your details below' : `One-time password sent to ${formData.email}`}
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        {step === 'form' ? (
                            <form onSubmit={handleSubmit} className="space-y-6">
                                {/* Account Info */}
                                <div className="space-y-4 border-b pb-4">
                                    <h3 className="text-lg font-medium">Account Details</h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Email Address</Label>
                                            <Input value={formData.email} disabled className="bg-gray-100" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Requested Role</Label>
                                            <Input value={formData.role} disabled className="bg-gray-100 capitalize" />
                                        </div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <Label>Password *</Label>
                                            <div className="relative">
                                                <Input name="password" type={showPassword ? 'text' : 'password'} value={formData.password} onChange={handleInputChange} required minLength={8} />
                                                <button type="button" className="absolute right-3 top-2.5 text-gray-400" onClick={() => setShowPassword(!showPassword)}>
                                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Confirm Password *</Label>
                                            <Input name="confirmPassword" type="password" value={formData.confirmPassword} onChange={handleInputChange} required />
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <h3 className="text-lg font-medium">Personal Details</h3>
                                    <div className="space-y-2"><Label>Full Name *</Label><Input name="fullName" value={formData.fullName} onChange={handleInputChange} required /></div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Phone Number *</Label><Input name="phoneNumber" value={formData.phoneNumber} onChange={handleInputChange} required /></div>
                                        <div className="space-y-2"><Label>National ID *</Label><Input name="nationalId" value={formData.nationalId} onChange={handleInputChange} required /></div>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="space-y-2"><Label>Gender *</Label>
                                            <Select value={formData.gender} onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v }))}>
                                                <SelectTrigger><SelectValue placeholder="Select gender" /></SelectTrigger>
                                                <SelectContent><SelectItem value="male">Male</SelectItem><SelectItem value="female">Female</SelectItem></SelectContent>
                                            </Select>
                                        </div>
                                        <div className="space-y-2"><Label>Address *</Label><Input name="address" value={formData.address} onChange={handleInputChange} required /></div>
                                    </div>
                                </div>

                                <Button type="submit" className="w-full" size="lg" disabled={isSubmitting}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Code...</> : 'Continue'}
                                </Button>
                            </form>
                        ) : (
                            <div className="space-y-6 flex flex-col items-center">
                                <div className="bg-blue-50 p-4 rounded-full">
                                    <Mail className="h-8 w-8 text-blue-600" />
                                </div>
                                <div className="text-center">
                                    <p className="text-sm text-gray-500">Please enter the 6-digit verification code sent to your email.</p>
                                </div>

                                <InputOTP maxLength={6} value={otp} onChange={(value) => setOtp(value)}>
                                    <InputOTPGroup>
                                        <InputOTPSlot index={0} />
                                        <InputOTPSlot index={1} />
                                        <InputOTPSlot index={2} />
                                    </InputOTPGroup>
                                    <InputOTPGroup>
                                        <InputOTPSlot index={3} />
                                        <InputOTPSlot index={4} />
                                        <InputOTPSlot index={5} />
                                    </InputOTPGroup>
                                </InputOTP>

                                <Button onClick={handleVerifyOtp} className="w-full" size="lg" disabled={isSubmitting || otp.length !== 6}>
                                    {isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying...</> : 'Verify Email'}
                                </Button>

                                <div className="flex gap-4 w-full">
                                    <Button variant="outline" className="flex-1" onClick={() => setStep('form')} disabled={isSubmitting}>
                                        <ArrowLeft className="mr-2 h-4 w-4" /> Back
                                    </Button>
                                    <Button variant="ghost" className="flex-1" onClick={handleResendOtp} disabled={isSubmitting}>
                                        <RefreshCw className="mr-2 h-4 w-4" /> Resend Code
                                    </Button>
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default StaffRegistrationPage;
