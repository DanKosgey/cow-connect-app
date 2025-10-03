import { ReactNode } from 'react';

interface MobileTableProps {
  children: ReactNode;
  className?: string;
}

export function MobileTable({ children, className = '' }: MobileTableProps) {
  return (
    <div className={`mobile-table overflow-x-auto whitespace-nowrap ${className}`}>
      {children}
    </div>
  );
}