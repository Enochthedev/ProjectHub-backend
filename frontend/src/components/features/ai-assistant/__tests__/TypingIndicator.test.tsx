import React from 'react';
import { render, screen } from '@testing-library/react';
import { TypingIndicator, MessageTypingIndicator } from '@/components/ui/TypingIndicator';

describe('TypingIndicator', () => {
  it('renders with default text', () => {
    render(<TypingIndicator />);
    
    expect(screen.getByText('AI is thinking...')).toBeInTheDocument();
  });

  it('renders with custom text', () => {
    render(<TypingIndicator text="Custom typing message" />);
    
    expect(screen.getByText('Custom typing message')).toBeInTheDocument();
  });

  it('renders without text when text prop is empty', () => {
    render(<TypingIndicator text="" />);
    
    expect(screen.queryByText('AI is thinking...')).not.toBeInTheDocument();
  });

  it('renders avatar when provided', () => {
    render(<TypingIndicator avatar="avatar-url" />);
    
    expect(screen.getByText('AI')).toBeInTheDocument();
  });

  it('does not render avatar when not provided', () => {
    render(<TypingIndicator />);
    
    expect(screen.queryByText('AI')).not.toBeInTheDocument();
  });

  it('renders three animated dots', () => {
    render(<TypingIndicator />);
    
    // Should have 3 dots with bounce animation
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-2') && el.className.includes('h-2')
    );
    
    expect(dots).toHaveLength(3);
    
    // Check that dots have animation classes
    dots.forEach(dot => {
      expect(dot).toHaveClass('animate-bounce');
    });
  });

  it('applies custom className', () => {
    render(<TypingIndicator className="custom-class" />);
    
    const container = screen.getByRole('status');
    expect(container).toHaveClass('custom-class');
  });

  it('disables animation when animated is false', () => {
    render(<TypingIndicator animated={false} />);
    
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-2') && el.className.includes('h-2')
    );
    
    dots.forEach(dot => {
      expect(dot).not.toHaveClass('animate-bounce');
    });
  });

  it('has proper structure with avatar and text', () => {
    render(<TypingIndicator avatar="test-avatar" text="Loading..." />);
    
    // Should have avatar container
    expect(screen.getByText('AI')).toBeInTheDocument();
    
    // Should have text
    expect(screen.getByText('Loading...')).toBeInTheDocument();
    
    // Should have dots
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-2') && el.className.includes('h-2')
    );
    expect(dots).toHaveLength(3);
  });
});

describe('MessageTypingIndicator', () => {
  it('renders message-style typing indicator', () => {
    render(<MessageTypingIndicator />);
    
    // Should have 3 dots
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-1.5') && el.className.includes('h-1.5')
    );
    
    expect(dots).toHaveLength(3);
  });

  it('has message bubble styling', () => {
    render(<MessageTypingIndicator />);
    
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-1.5') && el.className.includes('h-1.5')
    );
    
    const container = dots[0].closest('.inline-flex');
    expect(container).toHaveClass('bg-gray-100', 'border-2', 'border-gray-200');
  });

  it('applies custom className', () => {
    render(<MessageTypingIndicator className="custom-message-class" />);
    
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-1.5') && el.className.includes('h-1.5')
    );
    
    const container = dots[0].closest('.inline-flex');
    expect(container).toHaveClass('custom-message-class');
  });

  it('has animated dots with staggered delays', () => {
    render(<MessageTypingIndicator />);
    
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-1.5') && el.className.includes('h-1.5')
    );
    
    expect(dots).toHaveLength(3);
    
    // All dots should have bounce animation
    dots.forEach(dot => {
      expect(dot).toHaveClass('animate-bounce');
    });
    
    // Check animation delays (these are set via inline styles)
    expect(dots[0]).toHaveStyle('animation-delay: 0s');
    expect(dots[1]).toHaveStyle('animation-delay: 0.16s');
    expect(dots[2]).toHaveStyle('animation-delay: 0.32s');
  });

  it('has correct animation duration', () => {
    render(<MessageTypingIndicator />);
    
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-1.5') && el.className.includes('h-1.5')
    );
    
    dots.forEach(dot => {
      expect(dot).toHaveStyle('animation-duration: 1.4s');
    });
  });
});

describe('TypingIndicator Accessibility', () => {
  it('has appropriate ARIA attributes', () => {
    render(<TypingIndicator />);
    
    // The typing indicator should be announced to screen readers
    const container = screen.getByRole('status');
    expect(container).toHaveAttribute('role', 'status');
    expect(container).toHaveAttribute('aria-live', 'polite');
  });

  it('provides meaningful text for screen readers', () => {
    render(<TypingIndicator text="AI is processing your request" />);
    
    expect(screen.getByText('AI is processing your request')).toBeInTheDocument();
  });

  it('works without text for screen readers when only visual indicator is needed', () => {
    render(<TypingIndicator text="" />);
    
    // Should still have the dots for visual indication
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-2') && el.className.includes('h-2')
    );
    
    expect(dots).toHaveLength(3);
  });
});

describe('TypingIndicator Animation', () => {
  it('has correct CSS animation properties', () => {
    render(<TypingIndicator />);
    
    const dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-2') && el.className.includes('h-2')
    );
    
    // Check that each dot has the correct animation delay
    expect(dots[0]).toHaveStyle('animation-delay: 0s');
    expect(dots[1]).toHaveStyle('animation-delay: 0.16s');
    expect(dots[2]).toHaveStyle('animation-delay: 0.32s');
    
    // Check animation duration
    dots.forEach(dot => {
      expect(dot).toHaveStyle('animation-duration: 1.4s');
    });
  });

  it('maintains animation when re-rendered', () => {
    const { rerender } = render(<TypingIndicator text="Loading..." />);
    
    let dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-2') && el.className.includes('h-2')
    );
    
    expect(dots[0]).toHaveClass('animate-bounce');
    
    // Re-render with different text
    rerender(<TypingIndicator text="Still loading..." />);
    
    dots = screen.getAllByRole('generic').filter(el => 
      el.className.includes('w-2') && el.className.includes('h-2')
    );
    
    expect(dots[0]).toHaveClass('animate-bounce');
  });
});