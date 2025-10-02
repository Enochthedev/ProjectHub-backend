import { render, screen, fireEvent } from '@testing-library/react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../Card';

describe('Card Component', () => {
  it('renders children correctly', () => {
    render(<Card>Card content</Card>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders with default variant', () => {
    render(<Card data-testid="card">Default card</Card>);
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
  });

  it('renders with elevated variant', () => {
    render(<Card variant="elevated" data-testid="card">Elevated card</Card>);
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
  });

  it('renders with outlined variant', () => {
    render(<Card variant="outlined" data-testid="card">Outlined card</Card>);
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
  });

  it('renders with different padding sizes', () => {
    const { rerender } = render(<Card padding="none" data-testid="card">No padding</Card>);
    let card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();

    rerender(<Card padding="sm" data-testid="card">Small padding</Card>);
    card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();

    rerender(<Card padding="md" data-testid="card">Medium padding</Card>);
    card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();

    rerender(<Card padding="lg" data-testid="card">Large padding</Card>);
    card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
  });

  it('renders as clickable when specified', () => {
    render(<Card clickable data-testid="card">Clickable card</Card>);
    const card = screen.getByTestId('card');
    expect(card).toBeInTheDocument();
  });

  it('calls onClick when clicked and clickable', () => {
    const handleClick = jest.fn();
    render(<Card clickable onClick={handleClick} data-testid="card">Clickable card</Card>);
    
    const card = screen.getByTestId('card');
    fireEvent.click(card);
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('applies custom className', () => {
    render(<Card className="custom-class" data-testid="card">Custom card</Card>);
    const card = screen.getByTestId('card');
    expect(card).toHaveClass('custom-class');
  });

  it('forwards ref correctly', () => {
    const ref = jest.fn();
    render(<Card ref={ref}>Ref test</Card>);
    expect(ref).toHaveBeenCalled();
  });
});

describe('Card Sub-components', () => {
  it('renders CardHeader correctly', () => {
    render(<CardHeader>Header content</CardHeader>);
    expect(screen.getByText('Header content')).toBeInTheDocument();
  });

  it('renders CardTitle correctly', () => {
    render(<CardTitle>Card Title</CardTitle>);
    const title = screen.getByText('Card Title');
    expect(title).toBeInTheDocument();
    expect(title.tagName).toBe('H3');
  });

  it('renders CardDescription correctly', () => {
    render(<CardDescription>Card description</CardDescription>);
    const description = screen.getByText('Card description');
    expect(description).toBeInTheDocument();
    expect(description.tagName).toBe('P');
  });

  it('renders CardContent correctly', () => {
    render(<CardContent>Card content</CardContent>);
    expect(screen.getByText('Card content')).toBeInTheDocument();
  });

  it('renders CardFooter correctly', () => {
    render(<CardFooter>Footer content</CardFooter>);
    expect(screen.getByText('Footer content')).toBeInTheDocument();
  });

  it('renders complete card with all sub-components', () => {
    render(
      <Card>
        <CardHeader>
          <CardTitle>Test Title</CardTitle>
          <CardDescription>Test Description</CardDescription>
        </CardHeader>
        <CardContent>Test Content</CardContent>
        <CardFooter>Test Footer</CardFooter>
      </Card>
    );

    expect(screen.getByText('Test Title')).toBeInTheDocument();
    expect(screen.getByText('Test Description')).toBeInTheDocument();
    expect(screen.getByText('Test Content')).toBeInTheDocument();
    expect(screen.getByText('Test Footer')).toBeInTheDocument();
  });
});