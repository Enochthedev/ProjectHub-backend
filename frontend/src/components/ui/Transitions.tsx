'use client';

import React from 'react';
import { Transition } from '@headlessui/react';
import { cn } from '@/lib/utils';

interface FadeTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: 'fast' | 'normal' | 'slow';
}

const FadeTransition: React.FC<FadeTransitionProps> = ({ 
  show, 
  children, 
  className,
  duration = 'normal'
}) => {
  const durationClasses = {
    fast: 'duration-150',
    normal: 'duration-300',
    slow: 'duration-500',
  };

  return (
    <Transition
      show={show}
      enter={cn('transition-opacity ease-out', durationClasses[duration])}
      enterFrom="opacity-0"
      enterTo="opacity-100"
      leave={cn('transition-opacity ease-in', durationClasses[duration])}
      leaveFrom="opacity-100"
      leaveTo="opacity-0"
      className={className}
    >
      {children}
    </Transition>
  );
};

interface SlideTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  direction?: 'up' | 'down' | 'left' | 'right';
  duration?: 'fast' | 'normal' | 'slow';
}

const SlideTransition: React.FC<SlideTransitionProps> = ({ 
  show, 
  children, 
  className,
  direction = 'up',
  duration = 'normal'
}) => {
  const durationClasses = {
    fast: 'duration-150',
    normal: 'duration-300',
    slow: 'duration-500',
  };

  const directionClasses = {
    up: {
      enterFrom: 'translate-y-4 opacity-0',
      enterTo: 'translate-y-0 opacity-100',
      leaveFrom: 'translate-y-0 opacity-100',
      leaveTo: 'translate-y-4 opacity-0',
    },
    down: {
      enterFrom: '-translate-y-4 opacity-0',
      enterTo: 'translate-y-0 opacity-100',
      leaveFrom: 'translate-y-0 opacity-100',
      leaveTo: '-translate-y-4 opacity-0',
    },
    left: {
      enterFrom: 'translate-x-4 opacity-0',
      enterTo: 'translate-x-0 opacity-100',
      leaveFrom: 'translate-x-0 opacity-100',
      leaveTo: 'translate-x-4 opacity-0',
    },
    right: {
      enterFrom: '-translate-x-4 opacity-0',
      enterTo: 'translate-x-0 opacity-100',
      leaveFrom: 'translate-x-0 opacity-100',
      leaveTo: '-translate-x-4 opacity-0',
    },
  };

  const classes = directionClasses[direction];

  return (
    <Transition
      show={show}
      enter={cn('transition-all ease-out', durationClasses[duration])}
      enterFrom={classes.enterFrom}
      enterTo={classes.enterTo}
      leave={cn('transition-all ease-in', durationClasses[duration])}
      leaveFrom={classes.leaveFrom}
      leaveTo={classes.leaveTo}
      className={className}
    >
      {children}
    </Transition>
  );
};

interface ScaleTransitionProps {
  show: boolean;
  children: React.ReactNode;
  className?: string;
  duration?: 'fast' | 'normal' | 'slow';
}

const ScaleTransition: React.FC<ScaleTransitionProps> = ({ 
  show, 
  children, 
  className,
  duration = 'normal'
}) => {
  const durationClasses = {
    fast: 'duration-150',
    normal: 'duration-300',
    slow: 'duration-500',
  };

  return (
    <Transition
      show={show}
      enter={cn('transition-all ease-out', durationClasses[duration])}
      enterFrom="scale-95 opacity-0"
      enterTo="scale-100 opacity-100"
      leave={cn('transition-all ease-in', durationClasses[duration])}
      leaveFrom="scale-100 opacity-100"
      leaveTo="scale-95 opacity-0"
      className={className}
    >
      {children}
    </Transition>
  );
};

interface StaggeredListProps {
  show: boolean;
  children: React.ReactNode[];
  className?: string;
  staggerDelay?: number;
}

const StaggeredList: React.FC<StaggeredListProps> = ({ 
  show, 
  children, 
  className,
  staggerDelay = 50
}) => {
  return (
    <div className={className}>
      {children.map((child, index) => (
        <SlideTransition
          key={index}
          show={show}
          duration="fast"
          className="transition-all"
          style={{ transitionDelay: `${index * staggerDelay}ms` }}
        >
          {child}
        </SlideTransition>
      ))}
    </div>
  );
};

// Page transition wrapper
interface PageTransitionProps {
  children: React.ReactNode;
  className?: string;
}

const PageTransition: React.FC<PageTransitionProps> = ({ children, className }) => {
  return (
    <div className={cn('animate-in fade-in slide-in-from-bottom-4 duration-300', className)}>
      {children}
    </div>
  );
};

// Modal transition
interface ModalTransitionProps {
  show: boolean;
  children: React.ReactNode;
  onClose?: () => void;
}

const ModalTransition: React.FC<ModalTransitionProps> = ({ show, children, onClose }) => {
  return (
    <Transition show={show}>
      {/* Backdrop */}
      <Transition.Child
        enter="transition-opacity ease-out duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity ease-in duration-200"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
      >
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40"
          onClick={onClose}
        />
      </Transition.Child>

      {/* Modal */}
      <Transition.Child
        enter="transition-all ease-out duration-300"
        enterFrom="opacity-0 scale-95 translate-y-4"
        enterTo="opacity-100 scale-100 translate-y-0"
        leave="transition-all ease-in duration-200"
        leaveFrom="opacity-100 scale-100 translate-y-0"
        leaveTo="opacity-0 scale-95 translate-y-4"
      >
        <div className="fixed inset-0 flex items-center justify-center z-50 p-4">
          {children}
        </div>
      </Transition.Child>
    </Transition>
  );
};

export {
  FadeTransition,
  SlideTransition,
  ScaleTransition,
  StaggeredList,
  PageTransition,
  ModalTransition,
};