import React from 'react';
import { cn } from '@/lib/utils';
import { useTouchDevice } from '@/hooks/useResponsive';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: string;
  label?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ 
    className, 
    type = 'text', 
    error, 
    label, 
    helperText,
    leftIcon,
    rightIcon,
    id, 
    required,
    ...props 
  }, ref) => {
    const isTouchDevice = useTouchDevice();
    const inputId = id || `input-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperTextId = helperText ? `${inputId}-helper` : undefined;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={inputId}
            className="mb-2 block text-sm font-medium text-black"
          >
            {label}
            {required && (
              <span className="ml-1 text-black" aria-label="required">
                *
              </span>
            )}
          </label>
        )}
        
        <div className="relative">
          {leftIcon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
              {leftIcon}
            </div>
          )}
          
          <input
            type={type}
            id={inputId}
            className={cn(
              'flex w-full border-2 bg-white px-3 py-2 text-sm placeholder:text-gray-400 rounded-sm',
              'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-50 disabled:bg-gray-100',
              // Touch-friendly sizing
              isTouchDevice ? 'h-touch' : 'h-10',
              // Icon spacing
              leftIcon && 'pl-10',
              rightIcon && 'pr-10',
              // Error states
              error 
                ? 'border-black bg-gray-50 focus:border-black' 
                : 'border-gray-300 focus:border-black',
              className
            )}
            ref={ref}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={cn(
              errorId,
              helperTextId
            )}
            {...props}
          />
          
          {rightIcon && (
            <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
              {rightIcon}
            </div>
          )}
        </div>
        
        {helperText && !error && (
          <div 
            id={helperTextId}
            className="mt-1 text-sm text-gray-600"
          >
            {helperText}
          </div>
        )}
        
        {error && (
          <div 
            id={errorId}
            className="mt-1 flex items-center text-sm text-black"
            role="alert"
            aria-live="polite"
          >
            <svg 
              className="mr-1 h-4 w-4 flex-shrink-0" 
              fill="currentColor" 
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path 
                fillRule="evenodd" 
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" 
                clipRule="evenodd" 
              />
            </svg>
            {error}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

export { Input };