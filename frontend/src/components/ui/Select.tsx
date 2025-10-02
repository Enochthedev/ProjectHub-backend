import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronDown } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
}

export interface SelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  label?: string;
  error?: string;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ 
    value, 
    onValueChange, 
    options, 
    placeholder = 'Select an option',
    disabled = false,
    className,
    label,
    error,
    ...props 
  }, ref) => {
    const selectId = `select-${Math.random().toString(36).substr(2, 9)}`;

    return (
      <div className="w-full">
        {label && (
          <label 
            htmlFor={selectId}
            className="mb-2 block text-sm font-medium text-black"
          >
            {label}
          </label>
        )}
        <div className="relative">
          <select
            id={selectId}
            ref={ref}
            value={value}
            onChange={(e) => onValueChange(e.target.value)}
            disabled={disabled}
            className={cn(
              'flex h-10 w-full appearance-none border-2 bg-white px-3 py-2 pr-8 text-sm focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50',
              error 
                ? 'border-black bg-gray-50' 
                : 'border-gray-300 focus-visible:border-black',
              className
            )}
            {...props}
          >
            <option value="" disabled>
              {placeholder}
            </option>
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <ChevronDown className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400 pointer-events-none" />
        </div>
        {error && (
          <div className="mt-1 flex items-center text-sm text-black">
            <svg 
              className="mr-1 h-4 w-4" 
              fill="currentColor" 
              viewBox="0 0 20 20"
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

Select.displayName = 'Select';

export { Select };