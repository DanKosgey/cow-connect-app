import * as React from "react"

import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean
  errorMessage?: string
  helpText?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, errorMessage, helpText, ...props }, ref) => {
    // Add mobile-specific attributes based on input type
    const mobileProps = {};
    if (type === 'tel') {
      Object.assign(mobileProps, { inputMode: 'tel', enterKeyHint: 'next' });
    } else if (type === 'email') {
      Object.assign(mobileProps, { inputMode: 'email', enterKeyHint: 'next' });
    } else if (type === 'number') {
      Object.assign(mobileProps, { inputMode: 'decimal', enterKeyHint: 'next' });
    } else if (type === 'search') {
      Object.assign(mobileProps, { enterKeyHint: 'search' });
    } else {
      Object.assign(mobileProps, { enterKeyHint: 'next' });
    }
    
    // Add autocomplete attribute if not provided
    const autoCompleteProps = props.autoComplete ? {} : { autoComplete: 'off' };
    
    // Generate unique ID for error message if not provided
    const errorId = props.id ? `${props.id}-error` : undefined;
    const helpTextId = props.id ? `${props.id}-help` : undefined;
    
    // Determine aria attributes
    const ariaProps = {
      ...(error && errorId ? { 'aria-invalid': true, 'aria-errormessage': errorId } : {}),
      ...(helpText && helpTextId ? { 'aria-describedby': helpTextId } : {})
    };
    
    return (
      <>
        <input
          type={type}
          className={cn(
            "flex h-11 w-full rounded-md border border-input bg-background px-3 py-2.5 text-base ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 md:text-sm min-h-[44px]",
            error && "border-destructive focus-visible:ring-destructive",
            className
          )}
          ref={ref}
          {...props}
          {...mobileProps}
          {...autoCompleteProps}
          {...ariaProps}
        />
        {helpText && (
          <p 
            id={helpTextId} 
            className="text-sm text-muted-foreground mt-1"
          >
            {helpText}
          </p>
        )}
        {error && errorMessage && (
          <p 
            id={errorId} 
            className="text-sm text-destructive mt-1" 
            role="alert"
          >
            {errorMessage}
          </p>
        )}
      </>
    )
  }
)
Input.displayName = "Input"

export { Input }