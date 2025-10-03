import { useState, useRef } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface MobileCollapsibleProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

export function MobileCollapsible({ title, children, defaultOpen = false }: MobileCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const contentRef = useRef<HTMLDivElement>(null);

  return (
    <div className="mobile-collapse border border-gray-200 rounded-lg mb-4">
      <div 
        className="mobile-collapse-header bg-gray-50 cursor-pointer flex justify-between items-center p-4"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-controls={`collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <h3 className="font-medium text-gray-900">{title}</h3>
        {isOpen ? (
          <ChevronDown className="h-5 w-5 text-gray-500" aria-hidden="true" />
        ) : (
          <ChevronRight className="h-5 w-5 text-gray-500" aria-hidden="true" />
        )}
      </div>
      <div 
        ref={contentRef}
        id={`collapsible-content-${title.replace(/\s+/g, '-').toLowerCase()}`}
        className={`mobile-collapse-content p-4 ${isOpen ? 'block' : 'hidden'}`}
        aria-hidden={!isOpen}
      >
        {children}
      </div>
    </div>
  );
}