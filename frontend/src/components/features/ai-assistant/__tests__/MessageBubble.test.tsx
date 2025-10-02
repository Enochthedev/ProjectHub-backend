import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MessageBubble } from '../MessageBubble';
import { Message } from '@/types/ai-assistant';

// Mock the clipboard API
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn(),
  },
});

const mockUserMessage: Message = {
  id: 'msg-1',
  conversationId: 'conv-1',
  type: 'user',
  content: 'Hello, how are you?',
  timestamp: new Date('2024-01-01T12:00:00Z'),
  status: 'delivered',
  isBookmarked: false,
  averageRating: 0,
};

const mockAIMessage: Message = {
  id: 'msg-2',
  conversationId: 'conv-1',
  type: 'assistant',
  content: 'I am doing well, thank you for asking! How can I help you today?',
  timestamp: new Date('2024-01-01T12:01:00Z'),
  status: 'delivered',
  confidenceScore: 0.95,
  sources: [
    {
      id: 'source-1',
      title: 'Documentation',
      url: 'https://example.com/docs',
      type: 'documentation',
      relevanceScore: 0.9,
    },
  ],
  suggestedFollowUps: ['Tell me more about projects', 'How do I get started?'],
  isBookmarked: false,
  averageRating: 4,
};

const mockSystemMessage: Message = {
  id: 'msg-3',
  conversationId: 'conv-1',
  type: 'system',
  content: 'Conversation started',
  timestamp: new Date('2024-01-01T11:59:00Z'),
  status: 'delivered',
  isBookmarked: false,
  averageRating: 0,
};

describe('MessageBubble', () => {
  const mockOnBookmark = jest.fn();
  const mockOnRate = jest.fn();
  const mockOnCopy = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('User Messages', () => {
    it('renders user message correctly', () => {
      render(
        <MessageBubble
          message={mockUserMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
      expect(screen.getByText('U')).toBeInTheDocument(); // User avatar
      expect(screen.queryByText('AI')).not.toBeInTheDocument();
    });

    it('displays user message with correct styling', () => {
      render(
        <MessageBubble
          message={mockUserMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      const messageContent = screen.getByText('Hello, how are you?').parentElement;
      expect(messageContent).toHaveClass('bg-black', 'text-white', 'border-black');
    });

    it('does not show bookmark or rating buttons for user messages', () => {
      render(
        <MessageBubble
          message={mockUserMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      // Should not have bookmark or star icons for user messages
      expect(screen.queryByRole('button', { name: /bookmark/i })).not.toBeInTheDocument();
      expect(screen.queryByRole('button', { name: /star/i })).not.toBeInTheDocument();
    });
  });

  describe('AI Messages', () => {
    it('renders AI message correctly', () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      expect(screen.getByText('I am doing well, thank you for asking! How can I help you today?')).toBeInTheDocument();
      expect(screen.getByText('AI')).toBeInTheDocument(); // AI avatar
      expect(screen.queryByText('U')).not.toBeInTheDocument();
    });

    it('displays confidence score for AI messages', () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      expect(screen.getByText('High confidence (95%)')).toBeInTheDocument();
    });

    it('displays sources when available', () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      expect(screen.getByText('Sources:')).toBeInTheDocument();
      expect(screen.getByText('Documentation')).toBeInTheDocument();
      
      const sourceLink = screen.getByRole('link', { name: /documentation/i });
      expect(sourceLink).toHaveAttribute('href', 'https://example.com/docs');
      expect(sourceLink).toHaveAttribute('target', '_blank');
    });

    it('displays suggested follow-ups', () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      expect(screen.getByText('Suggested questions:')).toBeInTheDocument();
      expect(screen.getByText('Tell me more about projects')).toBeInTheDocument();
      expect(screen.getByText('How do I get started?')).toBeInTheDocument();
    });

    it('handles suggestion clicks', () => {
      const mockEventListener = jest.fn();
      window.addEventListener('suggestion-clicked', mockEventListener);

      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      fireEvent.click(screen.getByText('Tell me more about projects'));

      expect(mockEventListener).toHaveBeenCalledWith(
        expect.objectContaining({
          detail: {
            suggestion: 'Tell me more about projects',
            messageId: 'msg-2',
          },
        })
      );

      window.removeEventListener('suggestion-clicked', mockEventListener);
    });
  });

  describe('System Messages', () => {
    it('renders system message correctly', () => {
      render(
        <MessageBubble
          message={mockSystemMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      expect(screen.getByText('Conversation started')).toBeInTheDocument();
      
      // System messages should be centered and styled differently
      const systemMessage = screen.getByText('Conversation started');
      expect(systemMessage).toHaveClass('bg-gray-100', 'border', 'border-gray-300');
    });
  });

  describe('Message Actions', () => {
    it('handles copy functionality', async () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      // Hover to show actions
      const messageContainer = screen.getByText('I am doing well, thank you for asking! How can I help you today?').closest('.group');
      fireEvent.mouseEnter(messageContainer!);

      const copyButton = screen.getByRole('button', { name: /copy message/i });
      fireEvent.click(copyButton);

      expect(mockOnCopy).toHaveBeenCalledWith('I am doing well, thank you for asking! How can I help you today?');
    });

    it('handles bookmark toggle', async () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      // Hover to show actions
      const messageContainer = screen.getByText('I am doing well, thank you for asking! How can I help you today?').closest('.group');
      fireEvent.mouseEnter(messageContainer!);

      const bookmarkButton = screen.getByRole('button', { name: /bookmark message/i });
      fireEvent.click(bookmarkButton);

      expect(mockOnBookmark).toHaveBeenCalledWith('msg-2');
    });

    it('shows rating panel when rating button is clicked', async () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      // Hover to show actions
      const messageContainer = screen.getByText('I am doing well, thank you for asking! How can I help you today?').closest('.group');
      fireEvent.mouseEnter(messageContainer!);

      const ratingButton = screen.getByRole('button', { name: /rate message/i });
      fireEvent.click(ratingButton);

      expect(screen.getByText('Rate:')).toBeInTheDocument();
      
      // Should show 5 star buttons in the rating panel
      const ratingStarButtons = screen.getAllByRole('button').filter(button => 
        button.closest('.p-2.bg-gray-50') && button.querySelector('svg')?.classList.contains('w-3')
      );
      expect(ratingStarButtons).toHaveLength(5);
    });

    it('handles rating selection', async () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      // Hover to show actions
      const messageContainer = screen.getByText('I am doing well, thank you for asking! How can I help you today?').closest('.group');
      fireEvent.mouseEnter(messageContainer!);

      // Click rating button to show rating panel
      const ratingButton = screen.getByRole('button', { name: /rate message/i });
      fireEvent.click(ratingButton);

      // Click on 5-star rating
      const ratingStarButtons = screen.getAllByRole('button').filter(button => 
        button.closest('.p-2.bg-gray-50') && button.querySelector('svg')?.classList.contains('w-3')
      );
      fireEvent.click(ratingStarButtons[4]); // 5th star (index 4)

      expect(mockOnRate).toHaveBeenCalledWith('msg-2', 5);
    });
  });

  describe('Message Status', () => {
    it('shows error indicator for failed messages', () => {
      const errorMessage = { ...mockAIMessage, status: 'error' as const };
      
      render(
        <MessageBubble
          message={errorMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      // Hover to show actions
      const messageContainer = screen.getByText('I am doing well, thank you for asking! How can I help you today?').closest('.group');
      fireEvent.mouseEnter(messageContainer!);

      // Should show error icon (SVG doesn't have img role, check by class)
      const errorIcon = messageContainer!.querySelector('.lucide-triangle-alert');
      expect(errorIcon).toBeInTheDocument();
    });

    it('displays timestamp correctly', () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      // Hover to show actions including timestamp
      const messageContainer = screen.getByText('I am doing well, thank you for asking! How can I help you today?').closest('.group');
      fireEvent.mouseEnter(messageContainer!);

      expect(screen.getByText('01:01 PM')).toBeInTheDocument();
    });
  });

  describe('Bookmarked Messages', () => {
    it('shows filled bookmark icon for bookmarked messages', () => {
      const bookmarkedMessage = { ...mockAIMessage, isBookmarked: true };
      
      render(
        <MessageBubble
          message={bookmarkedMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      // Hover to show actions
      const messageContainer = screen.getByText('I am doing well, thank you for asking! How can I help you today?').closest('.group');
      fireEvent.mouseEnter(messageContainer!);

      const bookmarkButton = screen.getByRole('button', { name: /remove bookmark/i });
      expect(bookmarkButton).toHaveClass('text-black');
    });
  });

  describe('Accessibility', () => {
    it('has proper ARIA labels and roles', () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      // Check that buttons have proper roles
      const messageContainer = screen.getByText('I am doing well, thank you for asking! How can I help you today?').closest('.group');
      fireEvent.mouseEnter(messageContainer!);

      expect(screen.getByRole('button', { name: /copy message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /bookmark message/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /rate message/i })).toBeInTheDocument();
    });

    it('supports keyboard navigation', () => {
      render(
        <MessageBubble
          message={mockAIMessage}
          onBookmark={mockOnBookmark}
          onRate={mockOnRate}
          onCopy={mockOnCopy}
        />
      );

      // Hover to show actions
      const messageContainer = screen.getByText('I am doing well, thank you for asking! How can I help you today?').closest('.group');
      fireEvent.mouseEnter(messageContainer!);

      const copyButton = screen.getByRole('button', { name: /copy message/i });
      
      // Should be focusable
      copyButton.focus();
      expect(document.activeElement).toBe(copyButton);
      
      // Should respond to click (Enter key handling is handled by Button component)
      fireEvent.click(copyButton);
      expect(mockOnCopy).toHaveBeenCalled();
    });
  });
});