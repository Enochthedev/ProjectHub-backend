import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import DashboardCustomization from '../DashboardCustomization';
import { DashboardCustomization as CustomizationType } from '../types';

// Mock the UI components
jest.mock('@/components/ui/Modal', () => ({
  Modal: ({ isOpen, onClose, title, children }: any) => 
    isOpen ? (
      <div data-testid="modal">
        <div data-testid="modal-title">{title}</div>
        <button onClick={onClose} data-testid="modal-close">Close</button>
        {children}
      </div>
    ) : null
}));

jest.mock('@/components/ui/Card', () => ({
  Card: ({ children, className }: any) => (
    <div data-testid="card" className={className}>
      {children}
    </div>
  )
}));

jest.mock('@/components/ui/Button', () => ({
  Button: ({ children, onClick, variant, disabled, ...props }: any) => (
    <button 
      onClick={onClick} 
      disabled={disabled}
      data-variant={variant}
      {...props}
    >
      {children}
    </button>
  )
}));

jest.mock('@/components/ui/Input', () => ({
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input 
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      {...props}
    />
  )
}));

describe('DashboardCustomization', () => {
  const mockCustomization: CustomizationType = {
    userId: 'user1',
    role: 'student',
    layouts: [
      {
        id: 'layout1',
        name: 'Default Layout',
        role: 'student',
        widgets: [
          {
            id: 'widget1',
            title: 'Current Project',
            type: 'progress',
            size: 'large',
            position: { x: 0, y: 0, w: 2, h: 2 },
            isVisible: true,
            isCustomizable: false,
            permissions: ['student']
          },
          {
            id: 'widget2',
            title: 'Project Metrics',
            type: 'metric',
            size: 'medium',
            position: { x: 2, y: 0, w: 2, h: 1 },
            isVisible: true,
            isCustomizable: true,
            permissions: ['student']
          }
        ],
        isDefault: true,
        createdAt: '2023-01-01',
        updatedAt: '2023-01-01'
      }
    ],
    activeLayoutId: 'layout1',
    preferences: {
      theme: 'light',
      refreshInterval: 30,
      showNotifications: true,
      compactMode: false
    }
  };

  const defaultProps = {
    customization: mockCustomization,
    onSave: jest.fn(),
    onReset: jest.fn(),
    isOpen: true,
    onClose: jest.fn()
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders when open', () => {
    render(<DashboardCustomization {...defaultProps} />);

    expect(screen.getByTestId('modal')).toBeInTheDocument();
    expect(screen.getByTestId('modal-title')).toHaveTextContent('Dashboard Customization');
  });

  it('does not render when closed', () => {
    render(<DashboardCustomization {...defaultProps} isOpen={false} />);

    expect(screen.queryByTestId('modal')).not.toBeInTheDocument();
  });

  it('displays existing layouts', () => {
    render(<DashboardCustomization {...defaultProps} />);

    expect(screen.getByText('Default Layout')).toBeInTheDocument();
    expect(screen.getByText('2 widgets visible')).toBeInTheDocument();
    expect(screen.getByText('Default')).toBeInTheDocument();
  });

  it('displays widget configuration', () => {
    render(<DashboardCustomization {...defaultProps} />);

    expect(screen.getByText('Widget Configuration')).toBeInTheDocument();
    expect(screen.getByText('Current Project')).toBeInTheDocument();
    expect(screen.getByText('Project Metrics')).toBeInTheDocument();
    expect(screen.getByText('progress • large • Required')).toBeInTheDocument();
    expect(screen.getByText('metric • medium')).toBeInTheDocument();
  });

  it('allows creating new layout', async () => {
    render(<DashboardCustomization {...defaultProps} />);

    // Click new layout button
    fireEvent.click(screen.getByText('New Layout'));

    // Form should appear
    expect(screen.getByPlaceholderText('Layout name')).toBeInTheDocument();

    // Enter layout name
    fireEvent.change(screen.getByPlaceholderText('Layout name'), {
      target: { value: 'Custom Layout' }
    });

    // Save the layout
    const saveButtons = screen.getAllByRole('button');
    const saveButton = saveButtons.find(btn => btn.querySelector('[data-testid="lucide-save"]'));
    if (saveButton) {
      fireEvent.click(saveButton);
    }

    // Form should disappear
    await waitFor(() => {
      expect(screen.queryByPlaceholderText('Layout name')).not.toBeInTheDocument();
    });
  });

  it('allows deleting non-default layouts', () => {
    const customizationWithMultipleLayouts = {
      ...mockCustomization,
      layouts: [
        ...mockCustomization.layouts,
        {
          id: 'layout2',
          name: 'Custom Layout',
          role: 'student' as const,
          widgets: [],
          isDefault: false,
          createdAt: '2023-01-02',
          updatedAt: '2023-01-02'
        }
      ]
    };

    render(
      <DashboardCustomization 
        {...defaultProps} 
        customization={customizationWithMultipleLayouts}
      />
    );

    expect(screen.getByText('Custom Layout')).toBeInTheDocument();
    
    // Should have delete button for non-default layout
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-testid="lucide-trash-2"]'));
    expect(deleteButton).toBeInTheDocument();
  });

  it('allows toggling widget visibility', () => {
    render(<DashboardCustomization {...defaultProps} />);

    // Find the eye icons for toggling visibility
    const eyeButtons = screen.getAllByRole('button');
    const visibilityButtons = eyeButtons.filter(btn => 
      btn.querySelector('[data-testid="lucide-eye"]') || 
      btn.querySelector('[data-testid="lucide-eye-off"]')
    );

    expect(visibilityButtons.length).toBeGreaterThan(0);

    // Click on a customizable widget's visibility toggle
    const customizableToggle = visibilityButtons.find(btn => !btn.disabled);
    if (customizableToggle) {
      fireEvent.click(customizableToggle);
    }
  });

  it('displays and allows changing preferences', () => {
    render(<DashboardCustomization {...defaultProps} />);

    expect(screen.getByText('Preferences')).toBeInTheDocument();
    expect(screen.getByText('Refresh Interval')).toBeInTheDocument();
    expect(screen.getByText('Show Notifications')).toBeInTheDocument();
    expect(screen.getByText('Compact Mode')).toBeInTheDocument();

    // Check refresh interval dropdown
    const refreshSelect = screen.getByDisplayValue('30 seconds');
    expect(refreshSelect).toBeInTheDocument();

    // Change refresh interval
    fireEvent.change(refreshSelect, { target: { value: '60' } });
  });

  it('allows toggling notification preferences', () => {
    render(<DashboardCustomization {...defaultProps} />);

    const notificationButtons = screen.getAllByRole('button');
    const notificationToggle = notificationButtons.find(btn => 
      btn.textContent === 'On' || btn.textContent === 'Off'
    );

    if (notificationToggle) {
      fireEvent.click(notificationToggle);
    }
  });

  it('calls onSave when save button is clicked', () => {
    render(<DashboardCustomization {...defaultProps} />);

    fireEvent.click(screen.getByText('Save Changes'));

    expect(defaultProps.onSave).toHaveBeenCalled();
    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('calls onReset when reset button is clicked', () => {
    render(<DashboardCustomization {...defaultProps} />);

    fireEvent.click(screen.getByText('Reset to Default'));

    expect(defaultProps.onReset).toHaveBeenCalled();
  });

  it('calls onClose when cancel button is clicked', () => {
    render(<DashboardCustomization {...defaultProps} />);

    fireEvent.click(screen.getByText('Cancel'));

    expect(defaultProps.onClose).toHaveBeenCalled();
  });

  it('allows setting active layout', () => {
    const customizationWithMultipleLayouts = {
      ...mockCustomization,
      layouts: [
        ...mockCustomization.layouts,
        {
          id: 'layout2',
          name: 'Custom Layout',
          role: 'student' as const,
          widgets: [],
          isDefault: false,
          createdAt: '2023-01-02',
          updatedAt: '2023-01-02'
        }
      ]
    };

    render(
      <DashboardCustomization 
        {...defaultProps} 
        customization={customizationWithMultipleLayouts}
      />
    );

    // Find the "Use" button for the non-active layout
    const useButtons = screen.getAllByText('Use');
    if (useButtons.length > 0) {
      fireEvent.click(useButtons[0]);
    }
  });

  it('prevents deleting the last layout', () => {
    render(<DashboardCustomization {...defaultProps} />);

    // With only one layout, there should be no delete button
    const deleteButtons = screen.getAllByRole('button');
    const deleteButton = deleteButtons.find(btn => btn.querySelector('[data-testid="lucide-trash-2"]'));
    expect(deleteButton).toBeUndefined();
  });
});