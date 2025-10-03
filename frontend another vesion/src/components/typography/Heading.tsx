import React from 'react';

interface HeadingProps {
  children: React.ReactNode;
  variant?: 'h1' | 'h2' | 'h3' | 'h4';
  className?: string;
}

const Heading: React.FC<HeadingProps> = ({ 
  children, 
  variant = 'h2',
  className = ''
}) => {
  const baseClasses = 'font-[--font-heading] font-bold text-[--foreground]';
  
  const variantClasses = {
    h1: 'text-[--text-4xl] leading-[--leading-tight]',
    h2: 'text-[--text-3xl] leading-[--leading-normal]',
    h3: 'text-[--text-2xl] leading-[--leading-normal]',
    h4: 'text-[--text-xl] leading-[--leading-relaxed]'
  };
  
  const Element = variant;
  
  return (
    <Element 
      className={`${baseClasses} ${variantClasses[variant]} ${className}`}
    >
      {children}
    </Element>
  );
};

export default Heading;