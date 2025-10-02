'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const buttonVariants = cva(
  'inline-flex items-center justify-center font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden group',
  {
    variants: {
      variant: {
        primary: 'bg-black text-white border-2 border-black hover:bg-white hover:text-black',
        secondary: 'bg-white text-black border-2 border-black hover:bg-black hover:text-white',
        ghost: 'bg-transparent text-black border-2 border-transparent hover:border-gray-300 hover:bg-gray-50',
        danger: 'bg-gray-800 text-white border-2 border-gray-800 hover:bg-white hover:text-gray-800',
      },
      size: {
        sm: 'h-8 px-3 text-sm',
        md: 'h-10 px-4 text-sm',
        lg: 'h-12 px-6 text-base',
      },
      animation: {
        none: '',
        slide: 'before:absolute before:inset-0 before:bg-current before:translate-x-[-100%] before:transition-transform before:duration-300 hover:before:translate-x-0',
        scale: 'hover:scale-105 active:scale-95',
        bounce: 'hover:animate-bounce',
        pulse: 'hover:animate-pulse',
      }
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      animation: 'scale',
    },
  }
);

export interface AnimatedButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  loading?: boolean;
  icon?: React.ReactNode;
  iconPosition?: 'left' | 'right';
}

const AnimatedButton = React.forwardRef<HTMLButtonElement, AnimatedButtonProps>(
  ({ className, variant, size, animation, loading, icon, iconPosition = 'left', children, ...props }, ref) => {
    return (
      <button
        className={cn(buttonVariants({ variant, size, animation, className }))}
        ref={ref}
        disabled={loading || props.disabled}
        {...props}
      >
        {/* Loading spinner */}
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        
        {/* Button content */}
        <div className={cn('flex items-center gap-2', loading && 'opacity-0')}>
          {icon && iconPosition === 'left' && (
            <span className="transition-transform duration-200 group-hover:scale-110">
              {icon}
            </span>
          )}
          {children}
          {icon && iconPosition === 'right' && (
            <span className="transition-transform duration-200 group-hover:scale-110">
              {icon}
            </span>
          )}
        </div>

        {/* Ripple effect */}
        <span className="absolute inset-0 overflow-hidden">
          <span className="absolute inset-0 bg-white opacity-0 group-active:opacity-20 transition-opacity duration-150" />
        </span>
      </button>
    );
  }
);

AnimatedButton.displayName = 'AnimatedButton';

export { AnimatedButton, buttonVariants };