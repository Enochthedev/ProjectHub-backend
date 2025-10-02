'use client';

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const spinnerVariants = cva(
  'animate-spin border-solid border-current border-t-transparent rounded-full',
  {
    variants: {
      size: {
        xs: 'w-3 h-3 border',
        sm: 'w-4 h-4 border',
        md: 'w-6 h-6 border-2',
        lg: 'w-8 h-8 border-2',
        xl: 'w-12 h-12 border-2',
      },
      variant: {
        default: 'text-black',
        light: 'text-white',
        gray: 'text-gray-500',
      }
    },
    defaultVariants: {
      size: 'md',
      variant: 'default',
    },
  }
);

const dotsVariants = cva(
  'flex space-x-1',
  {
    variants: {
      size: {
        xs: 'space-x-0.5',
        sm: 'space-x-1',
        md: 'space-x-1.5',
        lg: 'space-x-2',
        xl: 'space-x-2.5',
      }
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

const dotVariants = cva(
  'rounded-full bg-current animate-pulse',
  {
    variants: {
      size: {
        xs: 'w-1 h-1',
        sm: 'w-1.5 h-1.5',
        md: 'w-2 h-2',
        lg: 'w-2.5 h-2.5',
        xl: 'w-3 h-3',
      }
    },
    defaultVariants: {
      size: 'md',
    },
  }
);

export interface LoadingSpinnerProps extends VariantProps<typeof spinnerVariants> {
  className?: string;
  type?: 'spinner' | 'dots' | 'bars';
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({ 
  className, 
  size, 
  variant, 
  type = 'spinner' 
}) => {
  if (type === 'dots') {
    return (
      <div className={cn(dotsVariants({ size }), className)}>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(dotVariants({ size }), variant === 'light' ? 'text-white' : variant === 'gray' ? 'text-gray-500' : 'text-black')}
            style={{
              animationDelay: `${i * 0.16}s`,
              animationDuration: '1.4s',
            }}
          />
        ))}
      </div>
    );
  }

  if (type === 'bars') {
    return (
      <div className={cn('flex space-x-1', className)}>
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              'bg-current animate-pulse',
              size === 'xs' && 'w-0.5 h-3',
              size === 'sm' && 'w-0.5 h-4',
              size === 'md' && 'w-1 h-5',
              size === 'lg' && 'w-1 h-6',
              size === 'xl' && 'w-1.5 h-8',
              variant === 'light' ? 'text-white' : variant === 'gray' ? 'text-gray-500' : 'text-black'
            )}
            style={{
              animationDelay: `${i * 0.1}s`,
              animationDuration: '1.2s',
            }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className={cn(spinnerVariants({ size, variant }), className)} />
  );
};

export { LoadingSpinner };