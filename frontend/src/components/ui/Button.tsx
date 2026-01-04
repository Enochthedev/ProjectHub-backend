'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { useTouchDevice, useReducedMotion } from '@/hooks/useResponsive';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg' | 'touch';
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({
    className,
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    disabled,
    children,
    ...props
  }, ref) => {
    const isTouchDevice = useTouchDevice();
    const prefersReducedMotion = useReducedMotion();

    // Automatically use touch size on touch devices for better accessibility
    const effectiveSize = isTouchDevice && (size === 'sm' || size === 'md') ? 'touch' : size;

    const baseStyles = cn(
      'inline-flex items-center justify-center font-medium border-2 rounded-sm',
      'focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2',
      'disabled:pointer-events-none disabled:bg-gray-300 disabled:text-gray-500 disabled:border-gray-300',
      // Transitions with reduced motion support
      prefersReducedMotion ? '' : 'transition-colors duration-200',
      // Touch-friendly active states
      'active:scale-95 touch:active:scale-95',
      prefersReducedMotion && 'active:scale-100 touch:active:scale-100'
    );

    const variants = {
      primary: cn(
        'bg-black text-white border-black',
        'hover:bg-white hover:text-black hover:border-black',
        'focus:bg-white focus:text-black',
        // High contrast mode support
        'high-contrast:border-2 high-contrast:border-solid'
      ),
      secondary: cn(
        'bg-white text-black border-black',
        'hover:bg-black hover:text-white hover:border-black',
        'focus:bg-black focus:text-white'
      ),
      ghost: cn(
        'bg-transparent text-black border-transparent',
        'hover:bg-gray-50 hover:border-gray-200',
        'focus:bg-gray-50 focus:border-gray-200'
      ),
      danger: cn(
        'bg-gray-800 text-white border-gray-800',
        'hover:bg-white hover:text-gray-800 hover:border-gray-800',
        'focus:bg-white focus:text-gray-800'
      ),
    };

    const sizes = {
      sm: 'h-8 px-3 text-sm min-w-[2rem]',
      md: 'h-10 px-4 text-base min-w-[2.5rem]',
      lg: 'h-12 px-6 text-lg min-w-[3rem]',
      touch: 'h-touch px-4 text-base min-w-touch', // 44px minimum touch target
    };

    const widthClass = fullWidth ? 'w-full' : '';

    return (
      <button
        className={cn(
          baseStyles,
          variants[variant],
          sizes[effectiveSize],
          widthClass,
          className
        )}
        ref={ref}
        disabled={disabled || loading}
        aria-disabled={disabled || loading}
        {...props}
      >
        {loading && (
          <div
            className={cn(
              'mr-2 h-4 w-4 rounded-full border-2 border-current border-t-transparent',
              prefersReducedMotion ? '' : 'animate-spin'
            )}
            aria-hidden="true"
          />
        )}
        {loading && <span className="sr-only">Loading...</span>}
        {children}
      </button>
    );
  }
);

Button.displayName = 'Button';

export { Button };