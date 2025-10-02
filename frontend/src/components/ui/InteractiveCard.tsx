'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';

interface InteractiveCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
  hoverable?: boolean;
  pressable?: boolean;
  disabled?: boolean;
  loading?: boolean;
}

const InteractiveCard: React.FC<InteractiveCardProps> = ({
  children,
  className,
  onClick,
  hoverable = true,
  pressable = true,
  disabled = false,
  loading = false,
}) => {
  const [isPressed, setIsPressed] = useState(false);

  const handleMouseDown = () => {
    if (pressable && !disabled && !loading) {
      setIsPressed(true);
    }
  };

  const handleMouseUp = () => {
    setIsPressed(false);
  };

  const handleMouseLeave = () => {
    setIsPressed(false);
  };

  return (
    <div
      className={cn(
        'border-2 border-gray-200 bg-white transition-all duration-200 cursor-pointer relative overflow-hidden',
        hoverable && !disabled && !loading && 'hover:border-gray-400 hover:shadow-brutal-sm',
        pressable && isPressed && 'transform translate-x-1 translate-y-1 shadow-none',
        disabled && 'opacity-50 cursor-not-allowed',
        loading && 'cursor-wait',
        onClick && 'select-none',
        className
      )}
      onClick={!disabled && !loading ? onClick : undefined}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseLeave}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick && !disabled ? 0 : undefined}
      onKeyDown={(e) => {
        if (onClick && !disabled && !loading && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          onClick();
        }
      }}
    >
      {loading && (
        <div className="absolute inset-0 bg-white bg-opacity-75 flex items-center justify-center z-10">
          <div className="w-6 h-6 border-2 border-black border-t-transparent rounded-full animate-spin" />
        </div>
      )}
      
      {/* Ripple effect */}
      {onClick && !disabled && !loading && (
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 bg-gray-100 opacity-0 transition-opacity duration-150 group-active:opacity-100" />
        </div>
      )}
      
      <div className={cn('relative z-0', loading && 'opacity-50')}>
        {children}
      </div>
    </div>
  );
};

export { InteractiveCard };