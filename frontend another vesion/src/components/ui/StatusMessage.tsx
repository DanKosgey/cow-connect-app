import React, { useEffect, useRef } from 'react';

interface StatusMessageProps {
  type: 'success' | 'error' | 'warning' | 'info';
  message: string;
  onClose?: () => void;
  autoClose?: boolean;
  duration?: number;
  className?: string;
}

const StatusMessage: React.FC<StatusMessageProps> = ({
  type,
  message,
  onClose,
  autoClose = true,
  duration = 5000,
  className = '',
}) => {
  const messageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Focus the message for screen readers
    if (messageRef.current) {
      messageRef.current.focus();
    }

    // Auto close
    if (autoClose && onClose) {
      const timer = setTimeout(() => {
        onClose();
      }, duration);

      return () => clearTimeout(timer);
    }
  }, [autoClose, onClose, duration]);

  const typeConfig = {
    success: {
      icon: '✅',
      bgColor: 'bg-green-50',
      textColor: 'text-green-800',
      borderColor: 'border-green-200',
      iconColor: 'text-green-400',
    },
    error: {
      icon: '❌',
      bgColor: 'bg-red-50',
      textColor: 'text-red-800',
      borderColor: 'border-red-200',
      iconColor: 'text-red-400',
    },
    warning: {
      icon: '⚠️',
      bgColor: 'bg-yellow-50',
      textColor: 'text-yellow-800',
      borderColor: 'border-yellow-200',
      iconColor: 'text-yellow-400',
    },
    info: {
      icon: 'ℹ️',
      bgColor: 'bg-blue-50',
      textColor: 'text-blue-800',
      borderColor: 'border-blue-200',
      iconColor: 'text-blue-400',
    },
  };

  const config = typeConfig[type];

  return (
    <div
      ref={messageRef}
      className={`
        ${config.bgColor} ${config.borderColor} ${config.textColor}
        border rounded-md p-4 ${className}
      `}
      role="alert"
      aria-live="assertive"
      aria-atomic="true"
      tabIndex={-1}
    >
      <div className="flex">
        <div className="flex-shrink-0">
          <span 
            className={`${config.iconColor} text-lg`}
            aria-hidden="true"
          >
            {config.icon}
          </span>
        </div>
        <div className="ml-3 flex-1">
          <p className="text-sm font-medium">
            {message}
          </p>
        </div>
        {onClose && (
          <div className="ml-auto pl-3">
            <button
              type="button"
              onClick={onClose}
              className={`
                -mx-1.5 -my-1.5 rounded-md p-1.5 inline-flex
                ${config.textColor} hover:bg-opacity-20 hover:bg-gray-500
                focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400
              `}
              aria-label="Dismiss message"
            >
              <span className="sr-only">Dismiss</span>
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StatusMessage;