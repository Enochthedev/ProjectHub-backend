import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { act } from '@testing-library/react';
import {
  ToastProvider,
  useToast,
  useSuccessToast,
  useErrorToast,
  useApiErrorToast,
} from '../Toast';

// Test component to use the toast hooks
const TestComponent: React.FC<{
  onAddToast?: () => void;
  onAddSuccess?: () => void;
  onAddError?: () => void;
  onAddApiError?: () => void;
}> = ({ onAddToast, onAddSuccess, onAddError, onAddApiError }) => {
  const { addToast } = useToast();
  const addSuccessToast = useSuccessToast();
  const addErrorToast = useErrorToast();
  const addApiErrorToast = useApiErrorToast();

  const handleAddToast = () => {
    addToast({
      type: 'info',
      title: 'Test Toast',
      description: 'Test Description',
    });
    onAddToast?.();
  };

  const handleAddSuccess = () => {
    addSuccessToast('Success!', 'Operation completed');
    onAddSuccess?.();
  };

  const handleAddError = () => {
    addErrorToast('Error!', 'Something went wrong');
    onAddError?.();
  };

  const handleAddApiError = () => {
    const error = new Error('API Error') as Error & {
      details: { isRetryable: true; shouldShowToast: true };
    };
    error.details = { isRetryable: true, shouldShowToast: true };
    
    addApiErrorToast(error, {
      showRetry: true,
      onRetry: () => console.log('Retry clicked'),
    });
    onAddApiError?.();
  };

  return (
    <div>
      <button onClick={handleAddToast}>Add Toast</button>
      <button onClick={handleAddSuccess}>Add Success</button>
      <button onClick={handleAddError}>Add Error</button>
      <button onClick={handleAddApiError}>Add API Error</button>
    </div>
  );
};

const renderWithProvider = (component: React.ReactElement) => {
  return render(
    <ToastProvider>
      {component}
    </ToastProvider>
  );
};

describe('Toast System', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should render toast provider without errors', () => {
    renderWithProvider(<div>Test</div>);
    expect(screen.getByText('Test')).toBeInTheDocument();
  });

  it('should add and display toast', async () => {
    const onAddToast = jest.fn();
    renderWithProvider(<TestComponent onAddToast={onAddToast} />);

    const button = screen.getByText('Add Toast');
    fireEvent.click(button);

    expect(onAddToast).toHaveBeenCalled();
    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
  });

  it('should add success toast', () => {
    const onAddSuccess = jest.fn();
    renderWithProvider(<TestComponent onAddSuccess={onAddSuccess} />);

    const button = screen.getByText('Add Success');
    fireEvent.click(button);

    expect(onAddSuccess).toHaveBeenCalled();
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Operation completed')).toBeInTheDocument();
  });

  it('should add error toast', () => {
    const onAddError = jest.fn();
    renderWithProvider(<TestComponent onAddError={onAddError} />);

    const button = screen.getByText('Add Error');
    fireEvent.click(button);

    expect(onAddError).toHaveBeenCalled();
    expect(screen.getByText('Error!')).toBeInTheDocument();
    expect(screen.getByText('Something went wrong')).toBeInTheDocument();
  });

  it('should add API error toast with retry button', () => {
    const onAddApiError = jest.fn();
    renderWithProvider(<TestComponent onAddApiError={onAddApiError} />);

    const button = screen.getByText('Add API Error');
    fireEvent.click(button);

    expect(onAddApiError).toHaveBeenCalled();
    expect(screen.getByText('Request Failed')).toBeInTheDocument();
    expect(screen.getByText('API Error')).toBeInTheDocument();
    expect(screen.getByText('Retry')).toBeInTheDocument();
  });

  it('should remove toast when close button is clicked', async () => {
    renderWithProvider(<TestComponent />);

    const addButton = screen.getByText('Add Toast');
    fireEvent.click(addButton);

    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    const closeButton = screen.getByRole('button', { name: '' });
    fireEvent.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    });
  });

  it('should auto-remove toast after duration', async () => {
    renderWithProvider(<TestComponent />);

    const button = screen.getByText('Add Toast');
    fireEvent.click(button);

    expect(screen.getByText('Test Toast')).toBeInTheDocument();

    // Fast-forward time to trigger auto-removal
    act(() => {
      jest.advanceTimersByTime(5000);
    });

    await waitFor(() => {
      expect(screen.queryByText('Test Toast')).not.toBeInTheDocument();
    });
  });

  it('should handle multiple toasts', () => {
    renderWithProvider(<TestComponent />);

    // Add multiple toasts
    fireEvent.click(screen.getByText('Add Toast'));
    fireEvent.click(screen.getByText('Add Success'));
    fireEvent.click(screen.getByText('Add Error'));

    expect(screen.getByText('Test Toast')).toBeInTheDocument();
    expect(screen.getByText('Success!')).toBeInTheDocument();
    expect(screen.getByText('Error!')).toBeInTheDocument();
  });

  it('should not show API error toast when shouldShowToast is false', () => {
    const TestComponentWithHiddenToast: React.FC = () => {
      const addApiErrorToast = useApiErrorToast();

      const handleAddApiError = () => {
        const error = new Error('API Error') as Error & {
          details: { shouldShowToast: false };
        };
        error.details = { shouldShowToast: false };
        
        addApiErrorToast(error);
      };

      return <button onClick={handleAddApiError}>Add Hidden API Error</button>;
    };

    renderWithProvider(<TestComponentWithHiddenToast />);

    const button = screen.getByText('Add Hidden API Error');
    fireEvent.click(button);

    expect(screen.queryByText('Request Failed')).not.toBeInTheDocument();
  });

  it('should handle toast action clicks', () => {
    const TestComponentWithAction: React.FC = () => {
      const { addToast } = useToast();

      const handleAddToast = () => {
        addToast({
          type: 'info',
          title: 'Action Toast',
          action: {
            label: 'Action',
            onClick: () => console.log('Action clicked'),
          },
        });
      };

      return <button onClick={handleAddToast}>Add Action Toast</button>;
    };

    const consoleSpy = jest.spyOn(console, 'log').mockImplementation();

    renderWithProvider(<TestComponentWithAction />);

    const button = screen.getByText('Add Action Toast');
    fireEvent.click(button);

    const actionButton = screen.getByText('Action');
    fireEvent.click(actionButton);

    expect(consoleSpy).toHaveBeenCalledWith('Action clicked');

    consoleSpy.mockRestore();
  });
});

describe('Toast Hook Errors', () => {
  it('should throw error when useToast is used outside provider', () => {
    const TestComponent = () => {
      useToast();
      return <div>Test</div>;
    };

    // Suppress console.error for this test
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation();

    expect(() => render(<TestComponent />)).toThrow(
      'useToast must be used within a ToastProvider'
    );

    consoleSpy.mockRestore();
  });
});