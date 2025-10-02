'use client';

import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  variant?: 'text' | 'rectangular' | 'circular' | 'card';
  width?: string | number;
  height?: string | number;
  lines?: number;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  variant = 'text',
  width,
  height,
  lines = 1
}) => {
  const baseClasses = 'animate-pulse bg-gray-200 rounded';
  
  const getVariantClasses = () => {
    switch (variant) {
      case 'text':
        return 'h-4';
      case 'rectangular':
        return 'h-6';
      case 'circular':
        return 'rounded-full';
      case 'card':
        return 'h-32';
      default:
        return 'h-4';
    }
  };

  const style = {
    width: width || (variant === 'circular' ? '40px' : '100%'),
    height: height || undefined,
  };

  if (variant === 'text' && lines > 1) {
    return (
      <div className={className}>
        {Array.from({ length: lines }).map((_, index) => (
          <div
            key={index}
            className={`${baseClasses} ${getVariantClasses()} ${
              index < lines - 1 ? 'mb-2' : ''
            } ${index === lines - 1 ? 'w-3/4' : ''}`}
            style={style}
          />
        ))}
      </div>
    );
  }

  return (
    <div
      className={`${baseClasses} ${getVariantClasses()} ${className}`}
      style={style}
    />
  );
};

// Pre-built skeleton components for common use cases
export const CardSkeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <div className={`bg-white p-6 rounded-lg border border-gray-200 ${className}`}>
    <div className="animate-pulse">
      <LoadingSkeleton variant="rectangular" className="mb-4" height="24px" width="60%" />
      <LoadingSkeleton variant="text" lines={3} />
      <div className="mt-4 flex space-x-2">
        <LoadingSkeleton variant="rectangular" width="80px" height="32px" />
        <LoadingSkeleton variant="rectangular" width="80px" height="32px" />
      </div>
    </div>
  </div>
);

export const DashboardSkeleton: React.FC = () => (
  <div className="space-y-6">
    {/* Header */}
    <div className="animate-pulse">
      <LoadingSkeleton variant="rectangular" height="32px" width="40%" className="mb-2" />
      <LoadingSkeleton variant="text" width="60%" />
    </div>
    
    {/* Stats Cards */}
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="animate-pulse">
            <div className="flex items-center justify-between mb-2">
              <LoadingSkeleton variant="circular" width="40px" height="40px" />
              <LoadingSkeleton variant="rectangular" width="60px" height="20px" />
            </div>
            <LoadingSkeleton variant="rectangular" height="28px" width="50%" className="mb-1" />
            <LoadingSkeleton variant="text" width="80%" />
          </div>
        </div>
      ))}
    </div>
    
    {/* Content Cards */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <CardSkeleton />
      <CardSkeleton />
    </div>
  </div>
);

export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ 
  rows = 5, 
  columns = 4 
}) => (
  <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
    <div className="animate-pulse">
      {/* Header */}
      <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
        <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
          {Array.from({ length: columns }).map((_, index) => (
            <LoadingSkeleton key={index} variant="rectangular" height="20px" width="80%" />
          ))}
        </div>
      </div>
      
      {/* Rows */}
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="px-6 py-4 border-b border-gray-200 last:border-b-0">
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}>
            {Array.from({ length: columns }).map((_, colIndex) => (
              <LoadingSkeleton key={colIndex} variant="text" width="90%" />
            ))}
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const ListSkeleton: React.FC<{ items?: number }> = ({ items = 5 }) => (
  <div className="space-y-4">
    {Array.from({ length: items }).map((_, index) => (
      <div key={index} className="flex items-center space-x-4 p-4 bg-white rounded-lg border border-gray-200">
        <div className="animate-pulse flex items-center space-x-4 w-full">
          <LoadingSkeleton variant="circular" width="48px" height="48px" />
          <div className="flex-1">
            <LoadingSkeleton variant="rectangular" height="20px" width="60%" className="mb-2" />
            <LoadingSkeleton variant="text" width="40%" />
          </div>
          <LoadingSkeleton variant="rectangular" width="80px" height="32px" />
        </div>
      </div>
    ))}
  </div>
);