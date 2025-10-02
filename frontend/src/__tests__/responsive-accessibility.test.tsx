import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import '@testing-library/jest-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Modal } from '@/components/ui/Modal';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/ui/ResponsiveContainer';
import { useResponsive, useTouchDevice } from '@/hooks/useResponsive';
import { useFocusTrap, useKeyboardNavigation } from '@/hooks/useAccessibility';
import { checkAccessibility, announceToScreenReader } from '@/utils/accessibility';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}));

describe('Responsive Design', () => {
  beforeEach(() => {
    // Reset window size
    Object.defineProperty(window, 'innerWidth', {
      writable: true,
      configurable: true,
      value: 1024,
    });
    Object.defineProperty(window, 'innerHeight', {
      writable: true,
      configurable: true,
      value: 768,
    });
  });

  describe('useResponsive hook', () => {
    const TestComponent = () => {
      const { isMobile, isTablet, isDesktop, currentBreakpoint } = useResponsive();
      return (
        <div>
          <div data-testid="is-mobile">{isMobile.toString()}</div>
          <div data-testid="is-tablet">{isTablet.toString()}</div>
          <div data-testid="is-desktop">{isDesktop.toString()}</div>
          <div data-testid="current-breakpoint">{currentBreakpoint}</div>
        </div>
      );
    };

    it('should detect desktop viewport', () => {
      render(<TestComponent />);
      
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('false');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('true');
      expect(screen.getByTestId('current-breakpoint')).toHaveTextContent('lg');
    });

    it('should detect mobile viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 640,
      });

      render(<TestComponent />);
      
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('true');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false');
    });

    it('should detect tablet viewport', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<TestComponent />);
      
      expect(screen.getByTestId('is-tablet')).toHaveTextContent('true');
      expect(screen.getByTestId('is-mobile')).toHaveTextContent('false');
      expect(screen.getByTestId('is-desktop')).toHaveTextContent('false');
    });
  });

  describe('ResponsiveContainer', () => {
    it('should apply responsive padding', () => {
      const { container } = render(
        <ResponsiveContainer padding="md" data-testid="container">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement).toHaveClass('px-4', 'sm:px-6', 'lg:px-8');
    });

    it('should apply max width constraints', () => {
      const { container } = render(
        <ResponsiveContainer maxWidth="lg">
          <div>Content</div>
        </ResponsiveContainer>
      );

      const containerElement = container.firstChild as HTMLElement;
      expect(containerElement).toHaveClass('max-w-lg');
    });
  });

  describe('ResponsiveGrid', () => {
    it('should apply responsive grid columns', () => {
      const { container } = render(
        <ResponsiveGrid cols={{ xs: 1, sm: 2, md: 3, lg: 4 }}>
          <div>Item 1</div>
          <div>Item 2</div>
        </ResponsiveGrid>
      );

      const gridElement = container.firstChild as HTMLElement;
      expect(gridElement).toHaveClass(
        'grid',
        'grid-cols-1',
        'sm:grid-cols-2',
        'md:grid-cols-3',
        'lg:grid-cols-4'
      );
    });
  });
});

describe('Touch Device Support', () => {
  describe('useTouchDevice hook', () => {
    const TestComponent = () => {
      const isTouchDevice = useTouchDevice();
      return <div data-testid="is-touch">{isTouchDevice.toString()}</div>;
    };

    it('should detect touch device', () => {
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        value: {},
      });

      render(<TestComponent />);
      expect(screen.getByTestId('is-touch')).toHaveTextContent('true');
    });

    it('should detect non-touch device', () => {
      // Ensure no touch properties
      delete (window as any).ontouchstart;
      Object.defineProperty(navigator, 'maxTouchPoints', {
        writable: true,
        value: 0,
      });

      render(<TestComponent />);
      expect(screen.getByTestId('is-touch')).toHaveTextContent('false');
    });
  });

  describe('Button touch-friendly sizing', () => {
    it('should apply touch-friendly sizing on touch devices', () => {
      // Mock touch device
      Object.defineProperty(window, 'ontouchstart', {
        writable: true,
        value: {},
      });

      render(<Button size="sm">Touch Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveClass('h-touch'); // Should use touch size instead of sm
    });
  });
});

describe('Accessibility Features', () => {
  describe('Button accessibility', () => {
    it('should have proper ARIA attributes', () => {
      render(<Button disabled>Disabled Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toHaveAttribute('aria-disabled', 'true');
    });

    it('should show loading state with screen reader text', () => {
      render(<Button loading>Loading Button</Button>);
      
      const button = screen.getByRole('button');
      expect(button).toBeDisabled();
      expect(screen.getByText('Loading...')).toHaveClass('sr-only');
    });

    it('should support keyboard navigation', async () => {
      const handleClick = jest.fn();
      render(<Button onClick={handleClick}>Click me</Button>);
      
      const button = screen.getByRole('button');
      button.focus();
      
      await userEvent.keyboard('{Enter}');
      expect(handleClick).toHaveBeenCalled();
    });
  });

  describe('Input accessibility', () => {
    it('should associate label with input', () => {
      render(<Input label="Email Address" />);
      
      const input = screen.getByLabelText('Email Address');
      expect(input).toBeInTheDocument();
    });

    it('should show required indicator', () => {
      render(<Input label="Required Field" required />);
      
      expect(screen.getByText('*')).toHaveAttribute('aria-label', 'required');
    });

    it('should associate error message with input', () => {
      render(<Input label="Email" error="Invalid email format" />);
      
      const input = screen.getByLabelText('Email');
      const errorMessage = screen.getByText('Invalid email format');
      
      expect(input).toHaveAttribute('aria-invalid', 'true');
      expect(input).toHaveAttribute('aria-describedby');
      expect(errorMessage).toHaveAttribute('role', 'alert');
    });

    it('should show helper text', () => {
      render(<Input label="Password" helperText="Must be at least 8 characters" />);
      
      const input = screen.getByLabelText('Password');
      const helperText = screen.getByText('Must be at least 8 characters');
      
      expect(input).toHaveAttribute('aria-describedby');
      expect(helperText).toBeInTheDocument();
    });
  });

  describe('Modal accessibility', () => {
    it('should trap focus within modal', async () => {
      const TestModal = () => {
        const [isOpen, setIsOpen] = React.useState(true);
        return (
          <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} title="Test Modal">
            <button>First Button</button>
            <button>Second Button</button>
          </Modal>
        );
      };

      render(<TestModal />);
      
      const modal = screen.getByRole('dialog');
      expect(modal).toHaveAttribute('aria-modal', 'true');
      expect(modal).toHaveAttribute('aria-labelledby');
      
      // Focus should be trapped within modal
      const firstButton = screen.getByText('First Button');
      const secondButton = screen.getByText('Second Button');
      
      firstButton.focus();
      expect(document.activeElement).toBe(firstButton);
      
      // Tab should move to next focusable element
      await userEvent.tab();
      expect(document.activeElement).toBe(secondButton);
    });

    it('should close on escape key', async () => {
      const handleClose = jest.fn();
      render(
        <Modal isOpen={true} onClose={handleClose} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      );
      
      await userEvent.keyboard('{Escape}');
      expect(handleClose).toHaveBeenCalled();
    });

    it('should prevent body scroll when open', () => {
      render(
        <Modal isOpen={true} onClose={() => {}} title="Test Modal">
          <div>Modal content</div>
        </Modal>
      );
      
      expect(document.body.style.overflow).toBe('hidden');
    });
  });

  describe('Focus management', () => {
    it('should manage focus trap', () => {
      const TestComponent = () => {
        const [isActive, setIsActive] = React.useState(true);
        const focusTrapRef = useFocusTrap(isActive);
        
        return (
          <div ref={focusTrapRef}>
            <button>First</button>
            <button>Second</button>
            <button onClick={() => setIsActive(false)}>Close</button>
          </div>
        );
      };

      render(<TestComponent />);
      
      const firstButton = screen.getByText('First');
      expect(document.activeElement).toBe(firstButton);
    });
  });

  describe('Keyboard navigation', () => {
    it('should handle arrow key navigation', () => {
      const TestComponent = () => {
        const items = ['Item 1', 'Item 2', 'Item 3'];
        const [selectedIndex, setSelectedIndex] = React.useState(-1);
        
        const { activeIndex } = useKeyboardNavigation(
          items,
          (index) => setSelectedIndex(index),
          true
        );

        return (
          <div>
            {items.map((item, index) => (
              <div
                key={index}
                data-testid={`item-${index}`}
                className={activeIndex === index ? 'active' : ''}
              >
                {item}
              </div>
            ))}
            <div data-testid="selected">{selectedIndex}</div>
          </div>
        );
      };

      render(<TestComponent />);
      
      // Simulate arrow down
      fireEvent.keyDown(document, { key: 'ArrowDown' });
      expect(screen.getByTestId('item-0')).toHaveClass('active');
      
      // Simulate enter
      fireEvent.keyDown(document, { key: 'Enter' });
      expect(screen.getByTestId('selected')).toHaveTextContent('0');
    });
  });

  describe('Screen reader announcements', () => {
    it('should create announcement element', () => {
      announceToScreenReader('Test announcement');
      
      const announcer = document.querySelector('[aria-live="polite"]');
      expect(announcer).toBeInTheDocument();
      expect(announcer).toHaveTextContent('Test announcement');
    });

    it('should remove announcement after timeout', async () => {
      announceToScreenReader('Test announcement');
      
      await waitFor(() => {
        const announcer = document.querySelector('[aria-live="polite"]');
        expect(announcer).not.toBeInTheDocument();
      }, { timeout: 1500 });
    });
  });
});

describe('Accessibility Checker', () => {
  it('should detect missing button labels', () => {
    const { container } = render(<button></button>);
    
    const results = checkAccessibility(container);
    const buttonErrors = results.filter(r => 
      r.message.includes('Button missing accessible name')
    );
    
    expect(buttonErrors).toHaveLength(1);
    expect(buttonErrors[0].severity).toBe('error');
  });

  it('should detect missing input labels', () => {
    const { container } = render(<input type="text" />);
    
    const results = checkAccessibility(container);
    const inputErrors = results.filter(r => 
      r.message.includes('Input missing associated label')
    );
    
    expect(inputErrors).toHaveLength(1);
    expect(inputErrors[0].severity).toBe('error');
  });

  it('should detect missing image alt text', () => {
    const { container } = render(<img src="test.jpg" />);
    
    const results = checkAccessibility(container);
    const imageErrors = results.filter(r => 
      r.message.includes('Image missing alt attribute')
    );
    
    expect(imageErrors).toHaveLength(1);
    expect(imageErrors[0].severity).toBe('error');
  });

  it('should pass for accessible components', () => {
    const { container } = render(
      <div>
        <Button>Accessible Button</Button>
        <Input label="Accessible Input" />
        <img src="test.jpg" alt="Test image" />
      </div>
    );
    
    const results = checkAccessibility(container);
    const errors = results.filter(r => r.severity === 'error');
    
    expect(errors).toHaveLength(0);
  });
});

describe('Reduced Motion Support', () => {
  beforeEach(() => {
    // Mock prefers-reduced-motion
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-reduced-motion: reduce)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('should disable animations when reduced motion is preferred', () => {
    render(<Button>Test Button</Button>);
    
    const button = screen.getByRole('button');
    // Should not have transition classes when reduced motion is preferred
    expect(button).not.toHaveClass('transition-colors');
  });
});

describe('High Contrast Mode Support', () => {
  beforeEach(() => {
    // Mock high contrast mode
    window.matchMedia = jest.fn().mockImplementation(query => ({
      matches: query === '(prefers-contrast: high)',
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    }));
  });

  it('should apply high contrast styles', () => {
    render(<Button variant="primary">High Contrast Button</Button>);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('high-contrast:border-2');
  });
});