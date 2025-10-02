'use client';

import React from 'react';

interface ProgressProps {
    value: number;
    max?: number;
    className?: string;
    showLabel?: boolean;
    size?: 'sm' | 'md' | 'lg';
    variant?: 'default' | 'success' | 'warning' | 'error';
}

export const Progress: React.FC<ProgressProps> = ({
    value,
    max = 100,
    className = '',
    showLabel = false,
    size = 'md',
    variant = 'default'
}) => {
    const percentage = Math.min(Math.max((value / max) * 100, 0), 100);
    
    const sizeClasses = {
        sm: 'h-1',
        md: 'h-2',
        lg: 'h-3'
    };

    const variantClasses = {
        default: 'bg-black',
        success: 'bg-green-600',
        warning: 'bg-yellow-600',
        error: 'bg-red-600'
    };

    return (
        <div className={`relative ${className}`}>
            <div className={`w-full bg-gray-200 rounded-full overflow-hidden ${sizeClasses[size]}`}>
                <div
                    className={`${sizeClasses[size]} ${variantClasses[variant]} transition-all duration-300 ease-out`}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <span className="absolute right-0 top-0 text-xs text-gray-600 -mt-5">
                    {Math.round(percentage)}%
                </span>
            )}
        </div>
    );
};