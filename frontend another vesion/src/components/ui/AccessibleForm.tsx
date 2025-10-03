import React from 'react';
import AccessibleButton from './AccessibleButton';

interface AccessibleFormProps {
  onSubmit: (e: React.FormEvent) => void;
  children: React.ReactNode;
  className?: string;
}

const AccessibleForm: React.FC<AccessibleFormProps> = ({
  onSubmit,
  children,
  className = '',
}) => {
  return (
    <form 
      onSubmit={onSubmit} 
      className={className}
      noValidate
    >
      {children}
    </form>
  );
};

export default AccessibleForm;