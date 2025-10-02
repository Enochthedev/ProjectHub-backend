import { render, screen } from '@testing-library/react';
import { Button } from '../Button';
import { Input } from '../Input';
import { Card } from '../Card';
import { Modal } from '../Modal';

describe('Design System Integration', () => {
  it('renders all components together without conflicts', () => {
    render(
      <div>
        <Button>Test Button</Button>
        <Input placeholder="Test Input" />
        <Card>Test Card</Card>
        <Modal isOpen={true} onClose={jest.fn()}>Test Modal</Modal>
      </div>
    );

    expect(screen.getByText('Test Button')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Test Input')).toBeInTheDocument();
    expect(screen.getByText('Test Card')).toBeInTheDocument();
    expect(screen.getByText('Test Modal')).toBeInTheDocument();
  });

  it('applies consistent styling across components', () => {
    render(
      <div>
        <Button className="test-button">Button</Button>
        <Input className="test-input" />
        <Card className="test-card" data-testid="test-card">Card</Card>
      </div>
    );

    const button = screen.getByRole('button');
    const input = screen.getByRole('textbox');
    const card = screen.getByTestId('test-card');

    expect(button).toHaveClass('test-button');
    expect(input).toHaveClass('test-input');
    expect(card).toHaveClass('test-card');
  });

  it('supports all component variants', () => {
    render(
      <div>
        <Button variant="primary">Primary</Button>
        <Button variant="secondary">Secondary</Button>
        <Button variant="ghost">Ghost</Button>
        <Button variant="danger">Danger</Button>
        
        <Card variant="default">Default Card</Card>
        <Card variant="elevated">Elevated Card</Card>
        <Card variant="outlined">Outlined Card</Card>
      </div>
    );

    expect(screen.getByText('Primary')).toBeInTheDocument();
    expect(screen.getByText('Secondary')).toBeInTheDocument();
    expect(screen.getByText('Ghost')).toBeInTheDocument();
    expect(screen.getByText('Danger')).toBeInTheDocument();
    expect(screen.getByText('Default Card')).toBeInTheDocument();
    expect(screen.getByText('Elevated Card')).toBeInTheDocument();
    expect(screen.getByText('Outlined Card')).toBeInTheDocument();
  });

  it('supports all component sizes', () => {
    render(
      <div>
        <Button size="sm">Small</Button>
        <Button size="md">Medium</Button>
        <Button size="lg">Large</Button>
        
        <Modal isOpen={true} onClose={jest.fn()} size="sm">Small Modal</Modal>
      </div>
    );

    expect(screen.getByText('Small')).toBeInTheDocument();
    expect(screen.getByText('Medium')).toBeInTheDocument();
    expect(screen.getByText('Large')).toBeInTheDocument();
    expect(screen.getByText('Small Modal')).toBeInTheDocument();
  });
});