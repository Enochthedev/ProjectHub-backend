import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { ResponsiveContainer, ResponsiveGrid } from '@/components/ui/ResponsiveContainer';

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
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

describe('Basic Responsive Components', () => {
  describe('ResponsiveContainer', () => {
    it('should render with responsive padding', () => {
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

  describe('Button accessibility', () => {
    it('should have proper ARIA attributes when disabled', () => {
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
});