import React from 'react';
import { cn } from '@/lib/utils';
import { useResponsive, useReducedMotion } from '@/hooks/useResponsive';
import { useFocusTrap } from '@/hooks/useAccessibility';

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
  className?: string;
  closeOnBackdropClick?: boolean;
  closeOnEscape?: boolean;
}

const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  children,
  size = 'md',
  className,
  closeOnBackdropClick = true,
  closeOnEscape = true,
}) => {
  const { isMobile, isTablet } = useResponsive();
  const prefersReducedMotion = useReducedMotion();
  const focusTrapRef = useFocusTrap(isOpen);

  const sizes = {
    sm: 'max-w-md',
    md: 'max-w-lg',
    lg: 'max-w-2xl',
    xl: 'max-w-4xl',
    full: 'max-w-full mx-4 sm:mx-6 lg:mx-8',
  };

  // Handle escape key and body scroll
  React.useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && closeOnEscape) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
      
      // Announce modal opening to screen readers
      const announcement = title ? `Modal opened: ${title}` : 'Modal opened';
      const announcer = document.createElement('div');
      announcer.setAttribute('aria-live', 'assertive');
      announcer.setAttribute('aria-atomic', 'true');
      announcer.className = 'sr-only';
      announcer.textContent = announcement;
      document.body.appendChild(announcer);
      
      setTimeout(() => {
        document.body.removeChild(announcer);
      }, 1000);
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose, closeOnEscape, title]);

  if (!isOpen) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget && closeOnBackdropClick) {
      onClose();
    }
  };

  return (
    <div 
      className={cn(
        'fixed inset-0 z-50 flex items-center justify-center p-4',
        // Mobile-specific positioning
        isMobile && 'items-end sm:items-center'
      )}
      onClick={handleBackdropClick}
    >
      {/* Backdrop */}
      <div 
        className={cn(
          'fixed inset-0 bg-black bg-opacity-50',
          // Animation with reduced motion support
          prefersReducedMotion ? '' : 'animate-fade-in'
        )}
        aria-hidden="true"
      />
      
      {/* Modal */}
      <div 
        ref={focusTrapRef}
        className={cn(
          'relative w-full bg-white border-2 border-black shadow-brutal-lg',
          // Responsive sizing
          isMobile ? 'max-h-[90vh] rounded-t-lg' : 'max-h-[85vh] rounded-sm',
          sizes[size],
          // Animation with reduced motion support
          prefersReducedMotion ? '' : (isMobile ? 'animate-slide-up' : 'animate-scale-in'),
          className
        )}
        role="dialog"
        aria-modal="true"
        aria-labelledby={title ? 'modal-title' : undefined}
        aria-describedby={description ? 'modal-description' : undefined}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || description) && (
          <div className="border-b-2 border-gray-200 p-4 sm:p-6">
            {title && (
              <h2 
                id="modal-title"
                className="text-lg sm:text-xl font-semibold text-black pr-8"
              >
                {title}
              </h2>
            )}
            {description && (
              <p 
                id="modal-description"
                className="mt-1 text-sm sm:text-base text-gray-600"
              >
                {description}
              </p>
            )}
          </div>
        )}

        {/* Close button */}
        <button
          onClick={onClose}
          className={cn(
            'absolute right-4 top-4 text-gray-400 hover:text-black rounded-sm',
            'focus:outline-none focus:ring-2 focus:ring-gray-400',
            // Touch-friendly sizing
            'p-1 min-h-touch min-w-touch flex items-center justify-center'
          )}
          aria-label="Close modal"
        >
          <svg 
            className="h-6 w-6" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
            aria-hidden="true"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M6 18L18 6M6 6l12 12" 
            />
          </svg>
        </button>

        {/* Content */}
        <div className="p-4 sm:p-6 overflow-y-auto max-h-[calc(85vh-8rem)]">
          {children}
        </div>
      </div>
    </div>
  );
};

// Modal sub-components for more flexible usage
const ModalHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={cn('border-b-2 border-gray-200 p-4 sm:p-6', className)}>
    {children}
  </div>
);

const ModalBody: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={cn('p-4 sm:p-6', className)}>
    {children}
  </div>
);

const ModalFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ 
  children, 
  className 
}) => (
  <div className={cn(
    'border-t-2 border-gray-200 p-4 sm:p-6',
    'flex flex-col-reverse sm:flex-row justify-end space-y-2 space-y-reverse sm:space-y-0 sm:space-x-2',
    className
  )}>
    {children}
  </div>
);

export { Modal, ModalHeader, ModalBody, ModalFooter };