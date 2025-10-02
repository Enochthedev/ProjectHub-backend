import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
  {
    variants: {
      variant: {
        default:
          'border-black bg-black text-white hover:bg-gray-800',
        secondary:
          'border-gray-300 bg-gray-100 text-gray-800 hover:bg-gray-200',
        destructive:
          'border-red-600 bg-red-600 text-white hover:bg-red-700',
        outline: 
          'border-gray-300 bg-white text-gray-700 hover:bg-gray-50',
        success:
          'border-green-600 bg-green-600 text-white hover:bg-green-700',
        warning:
          'border-yellow-600 bg-yellow-600 text-white hover:bg-yellow-700',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };