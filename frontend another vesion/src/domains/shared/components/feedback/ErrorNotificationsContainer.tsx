import React from 'react';
import { useError } from '@/contexts/ErrorContext';
import ErrorNotification from './ErrorNotification';

const ErrorNotificationsContainer: React.FC = () => {
  const { errors, removeError } = useError();

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
      {errors.map((error) => (
        <ErrorNotification
          key={error.id}
          message={error.message}
          type={error.type}
          onClose={() => removeError(error.id)}
        />
      ))}
    </div>
  );
};

export default ErrorNotificationsContainer;