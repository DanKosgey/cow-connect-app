import React from 'react';

interface TextProps {
  children: React.ReactNode;
  variant?: 'body' | 'caption' | 'overline';
  className?: string;
  as?: keyof JSX.IntrinsicElements;
}

const Text: React.FC<TextProps> = ({ 
  children, 
  variant = 'body',
  className = '',
  as: Component = 'p'
}) => {
  const baseClasses = 'font-[--font-body] text-[--foreground]';
  
  const variantClasses = {
    body: 'text-[--text-base] leading-[--leading-normal]',
    caption: 'text-[--text-sm] leading-[--leading-relaxed]',
    overline: 'text-[--text-xs] leading-[--leading-tight] uppercase tracking-wider'
  };
  
  return (
    <Component 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </Component>
  );
};

export default Text;