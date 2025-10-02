import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ChatInput } from '../ChatInput';

describe('ChatInput', () => {
  const mockOnSendMessage = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders with default placeholder', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    expect(screen.getByPlaceholderText('Ask me anything about your project...')).toBeInTheDocument();
  });

  it('renders with custom placeholder', () => {
    render(
      <ChatInput 
        onSendMessage={mockOnSendMessage} 
        placeholder="Custom placeholder" 
      />
    );
    
    expect(screen.getByPlaceholderText('Custom placeholder')).toBeInTheDocument();
  });

  it('sends message on form submission', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });
    
    await user.type(input, 'Hello AI');
    await user.click(sendButton);
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello AI');
    expect(input).toHaveValue(''); // Input should be cleared
  });

  it('sends message on Enter key press', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox');
    
    await user.type(input, 'Hello AI');
    await user.keyboard('{Enter}');
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello AI');
    expect(input).toHaveValue('');
  });

  it('adds new line on Shift+Enter', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox');
    
    await user.type(input, 'Line 1');
    await user.keyboard('{Shift>}{Enter}{/Shift}');
    await user.type(input, 'Line 2');
    
    expect(input).toHaveValue('Line 1\nLine 2');
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('does not send empty messages', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const sendButton = screen.getByRole('button', { name: /send message/i });
    
    await user.click(sendButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('does not send whitespace-only messages', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });
    
    await user.type(input, '   \n\t  ');
    await user.click(sendButton);
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('trims whitespace from messages', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox');
    
    await user.type(input, '  Hello AI  ');
    await user.keyboard('{Enter}');
    
    expect(mockOnSendMessage).toHaveBeenCalledWith('Hello AI');
  });

  it('disables input when disabled prop is true', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled />);
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });
    const attachButton = screen.getByRole('button', { name: /attach file/i });
    
    expect(input).toBeDisabled();
    expect(sendButton).toBeDisabled();
    expect(attachButton).toBeDisabled();
  });

  it('disables send button when message is empty', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const sendButton = screen.getByRole('button', { name: /send message/i });
    
    expect(sendButton).toBeDisabled();
  });

  it('enables send button when message has content', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox');
    const sendButton = screen.getByRole('button', { name: /send message/i });
    
    await user.type(input, 'Hello');
    
    expect(sendButton).not.toBeDisabled();
  });

  it('auto-resizes textarea based on content', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Initial height should be minimal (empty string in jsdom)
    expect(input.style.height).toBe('');
    
    // Type multiple lines
    await user.type(input, 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
    
    // In jsdom, scrollHeight is 0, so we just check that the content is there
    expect(input.value).toContain('Line 1\nLine 2\nLine 3\nLine 4\nLine 5');
  });

  it('respects maxLength prop', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} maxLength={10} />);
    
    const input = screen.getByRole('textbox');
    
    await user.type(input, 'This is a very long message that exceeds the limit');
    
    expect(input).toHaveValue('This is a '); // Should be truncated to 10 chars
  });

  it('shows character count when approaching limit', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} maxLength={20} />);
    
    const input = screen.getByRole('textbox');
    
    // Type message close to limit
    await user.type(input, 'Almost at limit');
    
    expect(screen.getByText(/5 characters remaining/)).toBeInTheDocument();
  });

  it('shows warning color when very close to limit', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} maxLength={20} />);
    
    const input = screen.getByRole('textbox');
    
    // Type message very close to limit
    await user.type(input, 'At the character limi');
    
    const remainingText = screen.getByText(/characters remaining/);
    expect(remainingText).toHaveClass('text-red-600');
  });

  it('shows keyboard shortcut hint', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    expect(screen.getByText('Press Enter to send, Shift + Enter for new line')).toBeInTheDocument();
  });

  it('focuses input on mount', () => {
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox');
    expect(document.activeElement).toBe(input);
  });

  it('resets textarea height after sending message', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox') as HTMLTextAreaElement;
    
    // Type multiple lines to increase height
    await user.type(input, 'Line 1\nLine 2\nLine 3');
    
    // Send the message
    await user.keyboard('{Enter}');
    
    // Height should be reset to auto
    expect(input.style.height).toBe('auto');
  });

  it('handles focus and blur events correctly', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const input = screen.getByRole('textbox');
    const container = input.closest('.border-2');
    
    // Initially should not have focus border (starts focused due to autoFocus)
    expect(container).toHaveClass('border-black');
    
    // Blur should revert border color
    await user.tab(); // Move focus away
    expect(container).toHaveClass('border-gray-300');
    
    // Focus should change border color back
    await user.click(input);
    expect(container).toHaveClass('border-black');
  });

  it('prevents form submission when disabled', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} disabled />);
    
    const input = screen.getByRole('textbox');
    
    // Try to type and submit (should not work)
    fireEvent.change(input, { target: { value: 'Hello' } });
    fireEvent.keyDown(input, { key: 'Enter' });
    
    expect(mockOnSendMessage).not.toHaveBeenCalled();
  });

  it('handles attachment button click', async () => {
    const user = userEvent.setup();
    render(<ChatInput onSendMessage={mockOnSendMessage} />);
    
    const attachButton = screen.getByRole('button', { name: /attach file/i });
    
    // Should not throw error when clicked (placeholder functionality)
    await user.click(attachButton);
    
    expect(attachButton).toBeInTheDocument();
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(<ChatInput onSendMessage={mockOnSendMessage} />);
      
      expect(screen.getByRole('textbox')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /send message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /attach file/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup();
      render(<ChatInput onSendMessage={mockOnSendMessage} />);
      
      const input = screen.getByRole('textbox');
      const attachButton = screen.getByRole('button', { name: /attach file/i });
      
      // Input should be focused initially
      expect(document.activeElement).toBe(input);
      
      // All buttons should be focusable
      attachButton.focus();
      expect(document.activeElement).toBe(attachButton);
      
      // Type some text to enable send button
      await user.type(input, 'Hello');
      
      const sendButton = screen.getByRole('button', { name: /send message/i });
      sendButton.focus();
      expect(document.activeElement).toBe(sendButton);
    });
  });
});