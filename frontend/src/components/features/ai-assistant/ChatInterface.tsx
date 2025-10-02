'use client';

import React, { useEffect, useRef, useState } from 'react';
import { MessageBubble } from './MessageBubble';
import { ChatInput } from './ChatInput';
import { MessageTypingIndicator, EnhancedTypingIndicator } from '@/components/ui/TypingIndicator';
import { EnhancedTypingIndicator as RealtimeTypingIndicator } from '@/components/features/ai/TypingIndicator';
import { useAIAssistantStore } from '@/stores/ai-assistant';
import { useAIConversationWebSocket } from '@/hooks/useWebSocket';
import { Message } from '@/types/ai-assistant';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { RefreshCwIcon, AlertCircleIcon } from 'lucide-react';

interface ChatInterfaceProps {
  conversationId?: string;
  className?: string;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  conversationId,
  className,
}) => {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const {
    messages,
    activeConversation,
    chatUI,
    isLoadingMessages,
    isSendingMessage,
    error,
    sendMessage,
    bookmarkMessage,
    unbookmarkMessage,
    rateMessage,
    clearError,
    scrollToBottom,
    setTyping,
  } = useAIAssistantStore();

  // WebSocket integration for real-time features
  const { isConnected, isTypingInConversation } = useAIConversationWebSocket(
    activeConversation?.id
  );

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (chatUI.scrollToBottom && autoScroll) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, chatUI.scrollToBottom, autoScroll]);

  // Handle scroll to detect if user is at bottom
  useEffect(() => {
    const container = messagesContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      const { scrollTop, scrollHeight, clientHeight } = container;
      const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10;
      setAutoScroll(isAtBottom);
    };

    container.addEventListener('scroll', handleScroll);
    return () => container.removeEventListener('scroll', handleScroll);
  }, []);

  // Listen for suggestion clicks
  useEffect(() => {
    const handleSuggestionClick = (event: CustomEvent) => {
      const { suggestion } = event.detail;
      if (activeConversation) {
        handleSendMessage(suggestion);
      }
    };

    window.addEventListener('suggestion-clicked', handleSuggestionClick as EventListener);
    return () => {
      window.removeEventListener('suggestion-clicked', handleSuggestionClick as ErrorEventHandler);
    };
  }, [activeConversation]);

  const handleSendMessage = async (content: string) => {
    if (!activeConversation) return;

    try {
      await sendMessage({
        query: content,
        conversationId: activeConversation.id.startsWith('draft-') ? undefined : activeConversation.id,
        language: 'en',
        includeProjectContext: true,
      });
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleBookmark = async (messageId: string) => {
    try {
      const message = messages.find(m => m.id === messageId);
      if (message?.isBookmarked) {
        await unbookmarkMessage(messageId);
      } else {
        await bookmarkMessage(messageId);
      }
    } catch (error) {
      console.error('Failed to toggle bookmark:', error);
    }
  };

  const handleRate = async (messageId: string, rating: number) => {
    try {
      await rateMessage(messageId, rating);
    } catch (error) {
      console.error('Failed to rate message:', error);
    }
  };

  const handleCopy = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
    } catch (error) {
      console.error('Failed to copy message:', error);
    }
  };

  const scrollToBottomManually = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    setAutoScroll(true);
  };

  if (!activeConversation) {
    return (
      <div className={cn(
        'flex items-center justify-center h-full bg-white',
        className
      )}>
        <div className="text-center text-gray-500">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
            <span className="text-2xl">💬</span>
          </div>
          <h3 className="text-lg font-medium mb-2">No conversation selected</h3>
          <p className="text-sm">Select a conversation or start a new one to begin chatting</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex flex-col h-full bg-white', className)}>
      {/* Chat Header */}
      <div className="flex items-center justify-between p-3 border-b-2 border-gray-200">
        <div>
          <h2 className="font-semibold">{activeConversation.title}</h2>
          <p className="text-sm text-gray-500">
            {messages.length} messages • {activeConversation.status}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          {error && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="text-red-600"
            >
              <AlertCircleIcon className="w-4 h-4 mr-1" />
              Clear Error
            </Button>
          )}
          
          <Button
            variant="ghost"
            size="sm"
            onClick={scrollToBottomManually}
            disabled={autoScroll}
          >
            <RefreshCwIcon className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="p-2 bg-red-50 border-b border-red-200">
          <div className="flex items-center gap-2 text-red-700">
            <AlertCircleIcon className="w-4 h-4" />
            <span className="text-sm">{error}</span>
          </div>
        </div>
      )}

      {/* Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto"
      >
        {isLoadingMessages ? (
          <div className="p-3">
            <div className="space-y-3">
              {[...Array(3)].map((_, index) => (
                <div key={index} className="flex gap-3">
                  <div className="w-8 h-8 bg-gray-200 animate-pulse"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 animate-pulse mb-2"></div>
                    <div className="h-4 bg-gray-200 animate-pulse w-2/3"></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                <span className="text-xl">🤖</span>
              </div>
              <h3 className="font-medium mb-2">Start the conversation</h3>
              <p className="text-sm">Ask me anything about your project or studies</p>
            </div>
          </div>
        ) : (
          <div className="p-3">
            {messages.map((message: Message) => (
              <MessageBubble
                key={message.id}
                message={message}
                onBookmark={handleBookmark}
                onRate={handleRate}
                onCopy={handleCopy}
              />
            ))}
            
            {/* Real-time Typing Indicator */}
            {activeConversation && (
              <RealtimeTypingIndicator 
                conversationId={activeConversation.id}
                showAvatar={true}
              />
            )}
            
            {/* Fallback Enhanced Typing Indicator for non-WebSocket scenarios */}
            {!isConnected && <EnhancedTypingIndicator />}
            
            {/* Scroll anchor */}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Scroll to bottom button */}
      {!autoScroll && (
        <div className="absolute bottom-24 right-4 z-10">
          <Button
            variant="primary"
            size="sm"
            onClick={scrollToBottomManually}
            className="shadow-lg border-2 border-black"
          >
            ↓ New messages
          </Button>
        </div>
      )}

      {/* Chat Input */}
      <ChatInput
        onSendMessage={handleSendMessage}
        disabled={isSendingMessage || isLoadingMessages}
        placeholder={
          isSendingMessage 
            ? 'Sending message...' 
            : 'Ask me anything about your project...'
        }
      />
    </div>
  );
};