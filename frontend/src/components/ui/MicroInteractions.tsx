'use client';

import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

// Hover scale effect
interface HoverScaleProps {
  children: React.ReactNode;
  scale?: number;
  className?: string;
}

const HoverScale: React.FC<HoverScaleProps> = ({ children, scale = 1.05, className }) => {
  return (
    <div 
      className={cn('transition-transform duration-200 hover:scale-105', className)}
      style={{ '--tw-scale-x': scale, '--tw-scale-y': scale } as React.CSSProperties}
    >
      {children}
    </div>
  );
};

// Bounce on click
interface BounceClickProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const BounceClick: React.FC<BounceClickProps> = ({ children, className, onClick }) => {
  const [isClicked, setIsClicked] = useState(false);

  const handleClick = () => {
    setIsClicked(true);
    setTimeout(() => setIsClicked(false), 150);
    onClick?.();
  };

  return (
    <div 
      className={cn(
        'transition-transform duration-150 cursor-pointer',
        isClicked ? 'scale-95' : 'scale-100',
        className
      )}
      onClick={handleClick}
    >
      {children}
    </div>
  );
};

// Pulse effect
interface PulseProps {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}

const Pulse: React.FC<PulseProps> = ({ children, active = true, className }) => {
  return (
    <div className={cn(active && 'animate-pulse', className)}>
      {children}
    </div>
  );
};

// Shake animation for errors
interface ShakeProps {
  children: React.ReactNode;
  trigger?: boolean;
  className?: string;
}

const Shake: React.FC<ShakeProps> = ({ children, trigger = false, className }) => {
  const [isShaking, setIsShaking] = useState(false);

  useEffect(() => {
    if (trigger) {
      setIsShaking(true);
      const timer = setTimeout(() => setIsShaking(false), 500);
      return () => clearTimeout(timer);
    }
  }, [trigger]);

  return (
    <div className={cn(isShaking && 'animate-shake', className)}>
      {children}
    </div>
  );
};

// Typing indicator
interface TypingIndicatorProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const TypingIndicator: React.FC<TypingIndicatorProps> = ({ className, size = 'md' }) => {
  const sizeClasses = {
    sm: 'w-1 h-1',
    md: 'w-1.5 h-1.5',
    lg: 'w-2 h-2',
  };

  return (
    <div className={cn('flex space-x-1 items-center', className)}>
      {[0, 1, 2].map((i) => (
        <div
          key={i}
          className={cn(
            'bg-gray-400 rounded-full animate-bounce',
            sizeClasses[size]
          )}
          style={{
            animationDelay: `${i * 0.16}s`,
            animationDuration: '1.4s',
          }}
        />
      ))}
    </div>
  );
};

// Progress bar with animation
interface AnimatedProgressProps {
  value: number;
  max?: number;
  className?: string;
  showPercentage?: boolean;
  animated?: boolean;
}

const AnimatedProgress: React.FC<AnimatedProgressProps> = ({ 
  value, 
  max = 100, 
  className,
  showPercentage = false,
  animated = true
}) => {
  const percentage = Math.min((value / max) * 100, 100);

  return (
    <div className={cn('w-full', className)}>
      <div className="flex justify-between items-center mb-1">
        {showPercentage && (
          <span className="text-sm font-medium text-gray-700">
            {Math.round(percentage)}%
          </span>
        )}
      </div>
      <div className="w-full bg-gray-200 border-2 border-gray-300 h-2">
        <div
          className={cn(
            'h-full bg-black transition-all duration-500 ease-out',
            animated && 'animate-pulse'
          )}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Floating action button with ripple
interface FloatingActionButtonProps {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

const FloatingActionButton: React.FC<FloatingActionButtonProps> = ({ 
  children, 
  onClick, 
  className,
  position = 'bottom-right'
}) => {
  const [ripples, setRipples] = useState<Array<{ id: number; x: number; y: number }>>([]);

  const positionClasses = {
    'bottom-right': 'bottom-6 right-6',
    'bottom-left': 'bottom-6 left-6',
    'top-right': 'top-6 right-6',
    'top-left': 'top-6 left-6',
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newRipple = { id: Date.now(), x, y };
    setRipples(prev => [...prev, newRipple]);
    
    setTimeout(() => {
      setRipples(prev => prev.filter(ripple => ripple.id !== newRipple.id));
    }, 600);
    
    onClick?.();
  };

  return (
    <button
      className={cn(
        'fixed w-14 h-14 bg-black text-white border-2 border-black rounded-full shadow-brutal hover:shadow-brutal-lg transition-all duration-200 hover:scale-110 active:scale-95 overflow-hidden',
        positionClasses[position],
        className
      )}
      onClick={handleClick}
    >
      <div className="relative z-10 flex items-center justify-center w-full h-full">
        {children}
      </div>
      
      {/* Ripple effects */}
      {ripples.map(ripple => (
        <span
          key={ripple.id}
          className="absolute bg-white opacity-30 rounded-full animate-ping"
          style={{
            left: ripple.x - 10,
            top: ripple.y - 10,
            width: 20,
            height: 20,
          }}
        />
      ))}
    </button>
  );
};

// Staggered fade-in for lists
interface StaggeredFadeInProps {
  children: React.ReactNode[];
  className?: string;
  delay?: number;
}

const StaggeredFadeIn: React.FC<StaggeredFadeInProps> = ({ 
  children, 
  className,
  delay = 100
}) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <div
          key={index}
          className="animate-in fade-in slide-in-from-bottom-4 duration-500"
          style={{ animationDelay: `${index * delay}ms` }}
        >
          {child}
        </div>
      ))}
    </div>
  );
};

export {
  HoverScale,
  BounceClick,
  Pulse,
  Shake,
  TypingIndicator,
  AnimatedProgress,
  FloatingActionButton,
  StaggeredFadeIn,
};