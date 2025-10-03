import React from 'react';
import { Alert, AlertTitle, AlertDescription } from './alert';
import { XCircle } from 'lucide-react';

interface AccountLockoutAlertProps {
  message: string;
  onClose?: () => void;
}

export function AccountLockoutAlert({ message, onClose }: AccountLockoutAlertProps) {
  return (
    <Alert variant="destructive" className="animate-in fade-in duration-300">
      <XCircle className="h-4 w-4" />
      <AlertTitle>Account Locked</AlertTitle>
      <AlertDescription>{message}</AlertDescription>
    </Alert>
  );
}