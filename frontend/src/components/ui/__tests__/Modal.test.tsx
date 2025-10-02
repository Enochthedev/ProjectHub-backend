import { render, screen, fireEvent } from '@testing-library/react';
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../Modal';

describe('Modal Component', () => {
  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={jest.fn()}>
        Modal content
      </Modal>
    );
    expect(screen.queryByText('Modal content')).not.toBeInTheDocument();
  });

  it('renders when isOpen is true', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()}>
        Modal content
      </Modal>
    );
    expect(screen.getByText('Modal content')).toBeInTheDocument();
  });

  it('displays title when provided', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} title="Test Modal">
        Modal content
      </Modal>
    );
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('displays description when provided', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} description="Test description">
        Modal content
      </Modal>
    );
    expect(screen.getByText('Test description')).toBeInTheDocument();
  });

  it('calls onClose when close button is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Modal content
      </Modal>
    );
    
    const closeButton = screen.getByLabelText('Close modal');
    fireEvent.click(closeButton);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Modal content
      </Modal>
    );
    
    const backdrop = document.querySelector('.fixed.inset-0.bg-black');
    fireEvent.click(backdrop!);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = jest.fn();
    render(
      <Modal isOpen={true} onClose={handleClose}>
        Modal content
      </Modal>
    );
    
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('applies correct size styles', () => {
    const { rerender } = render(
      <Modal isOpen={true} onClose={jest.fn()} size="sm">
        Small modal
      </Modal>
    );
    let modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('max-w-md');

    rerender(
      <Modal isOpen={true} onClose={jest.fn()} size="md">
        Medium modal
      </Modal>
    );
    modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('max-w-lg');

    rerender(
      <Modal isOpen={true} onClose={jest.fn()} size="lg">
        Large modal
      </Modal>
    );
    modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('max-w-2xl');

    rerender(
      <Modal isOpen={true} onClose={jest.fn()} size="xl">
        Extra large modal
      </Modal>
    );
    modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('max-w-4xl');
  });

  it('applies custom className', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()} className="custom-class">
        Custom modal
      </Modal>
    );
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveClass('custom-class');
  });

  it('has correct accessibility attributes', () => {
    render(
      <Modal 
        isOpen={true} 
        onClose={jest.fn()} 
        title="Test Modal"
        description="Test description"
      >
        Modal content
      </Modal>
    );
    
    const modal = screen.getByRole('dialog');
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveAttribute('aria-labelledby', 'modal-title');
    expect(modal).toHaveAttribute('aria-describedby', 'modal-description');
  });

  it('prevents body scroll when open', () => {
    const { unmount } = render(
      <Modal isOpen={true} onClose={jest.fn()}>
        Modal content
      </Modal>
    );
    
    expect(document.body.style.overflow).toBe('hidden');
    
    unmount();
    expect(document.body.style.overflow).toBe('unset');
  });
});

describe('Modal Sub-components', () => {
  it('renders ModalHeader correctly', () => {
    render(<ModalHeader>Header content</ModalHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('renders ModalBody correctly', () => {
    render(<ModalBody>Body content</ModalBody>);
    expect(screen.getByText('Body content')).toBeInTheDocument();
  });

  it('renders ModalFooter correctly', () => {
    render(<ModalFooter>Footer content</ModalFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('renders complete modal with all sub-components', () => {
    render(
      <Modal isOpen={true} onClose={jest.fn()}>
        <ModalHeader>Test Header</ModalHeader>
        <ModalBody>Test Body</ModalBody>
        <ModalFooter>Test Footer</ModalFooter>
      </Modal>
    );

    expect(screen.getByText('Test Header')).toBeInTheDocument();
    expect(screen.getByText('Test Body')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });
});