import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Fingerprint, 
  ScanFace, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Loader2 
} from 'lucide-react';
import { BiometricVerificationService } from '@/services/biometric-verification-service';
import useToastNotifications from '@/hooks/useToastNotifications';

interface BiometricVerificationModalProps {
  staffId: string;
  biometricType: 'fingerprint' | 'face' | 'iris';
  onVerificationComplete: (success: boolean) => void;
  onCancel: () => void;
}

const BiometricVerificationModal: React.FC<BiometricVerificationModalProps> = ({
  staffId,
  biometricType,
  onVerificationComplete,
  onCancel
}) => {
  const { show, error: showError } = useToastNotifications();
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationData, setVerificationData] = useState('');
  const [verificationResult, setVerificationResult] = useState<{ success: boolean; message: string } | null>(null);

  const getBiometricIcon = () => {
    switch (biometricType) {
      case 'fingerprint':
        return <Fingerprint className="h-6 w-6" />;
      case 'face':
        return <ScanFace className="h-6 w-6" />;
      case 'iris':
        return <Eye className="h-6 w-6" />;
      default:
        return <Fingerprint className="h-6 w-6" />;
    }
  };

  const getBiometricLabel = () => {
    switch (biometricType) {
      case 'fingerprint':
        return 'Fingerprint';
      case 'face':
        return 'Face Scan';
      case 'iris':
        return 'Iris Scan';
      default:
        return 'Biometric';
    }
  };

  const handleVerification = async () => {
    if (!verificationData.trim()) {
      showError('Error', 'Please provide biometric data for verification');
      return;
    }

    setIsVerifying(true);
    setVerificationResult(null);

    try {
      const result = await BiometricVerificationService.verifyBiometricData(
        staffId,
        biometricType,
        verificationData
      );

      if (result.success) {
        setVerificationResult({
          success: true,
          message: `${getBiometricLabel()} verification successful!`
        });
        show({
          title: 'Success',
          description: `${getBiometricLabel()} verification successful!`
        });
        // Call the completion callback after a short delay to allow user to see success message
        setTimeout(() => onVerificationComplete(true), 1500);
      } else {
        setVerificationResult({
          success: false,
          message: result.error || 'Verification failed'
        });
      }
    } catch (error: any) {
      console.error('Biometric verification error:', error);
      setVerificationResult({
        success: false,
        message: 'Verification failed due to system error'
      });
      showError('Error', 'Biometric verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleRegister = async () => {
    if (!verificationData.trim()) {
      showError('Error', 'Please provide biometric data for registration');
      return;
    }

    setIsVerifying(true);

    try {
      const result = await BiometricVerificationService.registerBiometricData(
        staffId,
        biometricType,
        verificationData
      );

      if (result.success) {
        show({
          title: 'Success',
          description: `${getBiometricLabel()} data registered successfully!`
        });
        // Refresh the verification status
        setVerificationResult(null);
      } else {
        showError('Error', result.error || 'Failed to register biometric data');
      }
    } catch (error: any) {
      console.error('Biometric registration error:', error);
      showError('Error', 'Failed to register biometric data');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {getBiometricIcon()}
            {getBiometricLabel()} Verification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-muted-foreground">
            Please provide your {getBiometricLabel().toLowerCase()} data to verify your identity.
          </p>

          {verificationResult && (
            <Alert variant={verificationResult.success ? 'default' : 'destructive'}>
              <div className="flex items-center gap-2">
                {verificationResult.success ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                <AlertDescription>{verificationResult.message}</AlertDescription>
              </div>
            </Alert>
          )}

          <div className="space-y-2">
            <Label htmlFor="biometricData">
              {getBiometricLabel()} Data
            </Label>
            <Input
              id="biometricData"
              type="password" // Hide the input for security
              value={verificationData}
              onChange={(e) => setVerificationData(e.target.value)}
              placeholder={`Enter your ${getBiometricLabel().toLowerCase()} data`}
              disabled={isVerifying}
            />
            <p className="text-xs text-muted-foreground">
              Enter your biometric data for verification. This will be securely processed.
            </p>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={onCancel}
              disabled={isVerifying}
            >
              Cancel
            </Button>
            <Button
              onClick={handleRegister}
              disabled={isVerifying}
              variant="secondary"
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Registering...
                </>
              ) : (
                'Register Data'
              )}
            </Button>
            <Button
              onClick={handleVerification}
              disabled={isVerifying}
            >
              {isVerifying ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Verifying...
                </>
              ) : (
                'Verify'
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BiometricVerificationModal;