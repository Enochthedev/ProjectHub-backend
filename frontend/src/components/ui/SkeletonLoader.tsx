'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface SkeletonProps {
  className?: string;
  animate?: boolean;
}

const Skeleton: React.FC<SkeletonProps> = ({ className, animate = true }) => {
  return (
    <div
      className={cn(
        'bg-gray-200 rounded',
        animate && 'animate-pulse',
        className
      )}
    />
  );
};

// Pre-built skeleton components for common use cases
const SkeletonCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('border-2 border-gray-200 p-4 space-y-3', className)}>
    <Skeleton className="h-4 w-3/4" />
    <Skeleton className="h-3 w-full" />
    <Skeleton className="h-3 w-2/3" />
    <div className="flex space-x-2 pt-2">
      <Skeleton className="h-6 w-16" />
      <Skeleton className="h-6 w-20" />
    </div>
  </div>
);

const SkeletonProjectCard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('border-2 border-gray-200 p-6 space-y-4', className)}>
    <div className="flex justify-between items-start">
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-8 w-8 rounded-full" />
    </div>
    <Skeleton className="h-4 w-full" />
    <Skeleton className="h-4 w-4/5" />
    <Skeleton className="h-4 w-3/5" />
    <div className="flex justify-between items-center pt-2">
      <div className="flex space-x-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-6 w-20" />
        <Skeleton className="h-6 w-14" />
      </div>
      <Skeleton className="h-4 w-24" />
    </div>
  </div>
);

const SkeletonList: React.FC<{ 
  items?: number; 
  className?: string;
  itemClassName?: string;
}> = ({ items = 5, className, itemClassName }) => (
  <div className={cn('space-y-3', className)}>
    {Array.from({ length: items }).map((_, i) => (
      <div key={i} className={cn('flex items-center space-x-3', itemClassName)}>
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
);

const SkeletonTable: React.FC<{ 
  rows?: number; 
  columns?: number;
  className?: string;
}> = ({ rows = 5, columns = 4, className }) => (
  <div className={cn('space-y-3', className)}>
    {/* Header */}
    <div className="flex space-x-4 pb-2 border-b-2 border-gray-200">
      {Array.from({ length: columns }).map((_, i) => (
        <Skeleton key={i} className="h-4 flex-1" />
      ))}
    </div>
    {/* Rows */}
    {Array.from({ length: rows }).map((_, rowIndex) => (
      <div key={rowIndex} className="flex space-x-4 py-2">
        {Array.from({ length: columns }).map((_, colIndex) => (
          <Skeleton key={colIndex} className="h-4 flex-1" />
        ))}
      </div>
    ))}
  </div>
);

const SkeletonChat: React.FC<{ messages?: number; className?: string }> = ({ 
  messages = 3, 
  className 
}) => (
  <div className={cn('space-y-4', className)}>
    {Array.from({ length: messages }).map((_, i) => (
      <div key={i} className={cn('flex', i % 2 === 0 ? 'justify-end' : 'justify-start')}>
        <div className={cn(
          'max-w-xs space-y-2 p-3 border-2',
          i % 2 === 0 ? 'border-black bg-black' : 'border-gray-200 bg-white'
        )}>
          <Skeleton className={cn('h-3 w-full', i % 2 === 0 ? 'bg-gray-600' : 'bg-gray-200')} />
          <Skeleton className={cn('h-3 w-3/4', i % 2 === 0 ? 'bg-gray-600' : 'bg-gray-200')} />
        </div>
      </div>
    ))}
  </div>
);

const SkeletonDashboard: React.FC<{ className?: string }> = ({ className }) => (
  <div className={cn('space-y-6', className)}>
    {/* Header */}
    <div className="flex justify-between items-center">
      <Skeleton className="h-8 w-48" />
      <Skeleton className="h-10 w-32" />
    </div>
    
    {/* Stats Grid */}
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="border-2 border-gray-200 p-4 space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
    
    {/* Main Content */}
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="space-y-4">
        <Skeleton className="h-6 w-32" />
        <SkeletonList items={4} />
      </div>
      <div className="space-y-4">
        <Skeleton className="h-6 w-40" />
        <div className="border-2 border-gray-200 p-4 space-y-3">
          <Skeleton className="h-32 w-full" />
          <div className="flex justify-between">
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-16" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

export {
  Skeleton,
  SkeletonCard,
  SkeletonProjectCard,
  SkeletonList,
  SkeletonTable,
  SkeletonChat,
  SkeletonDashboard,
};