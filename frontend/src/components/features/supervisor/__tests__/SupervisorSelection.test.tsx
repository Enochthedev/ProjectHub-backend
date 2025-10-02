import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { jest } from '@jest/globals';
import SupervisorSelection from '../SupervisorSelection';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

const mockProps = {
  studentId: 'student1',
  onSupervisorRequest: jest.fn(),
  onPreferenceUpdate: jest.fn(),
};

describe('SupervisorSelection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders supervisor selection interface', async () => {
    render(<SupervisorSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Choose Your Supervisor')).toBeInTheDocument();
      expect(screen.getByText('Browse available supervisors and send requests to those who match your interests.')).toBeInTheDocument();
    });
  });

  it('displays search and filter controls', async () => {
    render(<SupervisorSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByPlaceholderText('Search by name, specialization, or research interests...')).toBeInTheDocument();
      expect(screen.getByText('Filters')).toBeInTheDocument();
    });
  });

  it('shows supervisors after loading', async () => {
    render(<SupervisorSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
      expect(screen.getByText('Prof. Michael Chen')).toBeInTheDocument();
      expect(screen.getByText('Dr. Emily Rodriguez')).toBeInTheDocument();
    });
  });

  it('handles search functionality', async () => {
    render(<SupervisorSelection {...mockProps} />);
    
    await waitFor(() => {
      const searchInput = screen.getByPlaceholderText('Search by name, specialization, or research interests...');
      fireEvent.change(searchInput, { target: { value: 'Sarah' } });
      
      expect(screen.getByText('Dr. Sarah Johnson')).toBeInTheDocument();
    });
  });

  it('handles preference toggle', async () => {
    render(<SupervisorSelection {...mockProps} />);
    
    await waitFor(() => {
      const heartButtons = screen.getAllByRole('button');
      const heartButton = heartButtons.find(button => 
        button.querySelector('svg')?.classList.contains('w-4')
      );
      
      if (heartButton) {
        fireEvent.click(heartButton);
        expect(mockProps.onPreferenceUpdate).toHaveBeenCalled();
      }
    });
  });

  it('opens request modal when send request is clicked', async () => {
    render(<SupervisorSelection {...mockProps} />);
    
    await waitFor(() => {
      const sendRequestButtons = screen.getAllByText('Send Request');
      if (sendRequestButtons.length > 0) {
        fireEvent.click(sendRequestButtons[0]);
        expect(screen.getByText(/Send Request to/)).toBeInTheDocument();
      }
    });
  });

  it('handles supervisor request submission', async () => {
    render(<SupervisorSelection {...mockProps} />);
    
    await waitFor(async () => {
      const sendRequestButtons = screen.getAllByText('Send Request');
      if (sendRequestButtons.length > 0) {
        fireEvent.click(sendRequestButtons[0]);
        
        const messageTextarea = screen.getByPlaceholderText(/Introduce yourself/);
        fireEvent.change(messageTextarea, { 
          target: { value: 'I would like to work with you on my project.' } 
        });
        
        const submitButton = screen.getByRole('button', { name: 'Send Request' });
        fireEvent.click(submitButton);
        
        await waitFor(() => {
          expect(mockProps.onSupervisorRequest).toHaveBeenCalledWith(
            expect.any(String),
            'I would like to work with you on my project.'
          );
        });
      }
    });
  });

  it('shows availability badges correctly', async () => {
    render(<SupervisorSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('2 Slots Available')).toBeInTheDocument();
      expect(screen.getByText('Unavailable')).toBeInTheDocument();
    });
  });

  it('displays supervisor ratings and stats', async () => {
    render(<SupervisorSelection {...mockProps} />);
    
    await waitFor(() => {
      expect(screen.getByText('4.8')).toBeInTheDocument();
      expect(screen.getByText('95%')).toBeInTheDocument();
    });
  });
});