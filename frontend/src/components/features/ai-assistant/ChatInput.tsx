'use client';

import React, { useState, useRef, useEffect } from 'react';
import { SendIcon, PaperclipIcon } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  disabled?: boolean;
  placeholder?: string;
  maxLength?: number;
  className?: string;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  disabled = false,
  placeholder = 'Ask me anything about your project...',
  maxLength = 2000,
  className,
}) => {
  const [message, setMessage] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedMessage = message.trim();
    if (trimmedMessage && !disabled) {
      onSendMessage(trimmedMessage);
      setMessage('');
      
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = 'auto';
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value;
    if (value.length <= maxLength) {
      setMessage(value);
      
      // Auto-resize textarea
      const textarea = e.target;
      textarea.style.height = 'auto';
      textarea.style.height = `${Math.min(textarea.scrollHeight, 120)}px`;
    }
  };

  // Auto-focus on mount
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
  }, []);

  const remainingChars = maxLength - message.length;
  const isNearLimit = remainingChars < 100;

  return (
    <div className={cn('border-t-2 border-gray-200 bg-white', className)}>
      <form onSubmit={handleSubmit} className="p-3">
        <div className={cn(
          'flex items-end gap-3 p-3 border-2 transition-colors',
          isFocused ? 'border-black' : 'border-gray-300',
          disabled && 'opacity-50'
        )}>
          {/* Attachment button (placeholder for future file upload) */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={disabled}
            className="flex-shrink-0 h-8 w-8 p-0"
            aria-label="Attach file"
          >
            <PaperclipIcon className="w-4 h-4" />
          </Button>

          {/* Message input */}
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              placeholder={placeholder}
              disabled={disabled}
              rows={1}
              className="w-full resize-none border-none outline-none bg-transparent placeholder-gray-400 text-black"
              style={{ minHeight: '24px', maxHeight: '120px' }}
            />
            
            {/* Character count */}
            {isNearLimit && (
              <div className={cn(
                'absolute -bottom-5 right-0 text-xs',
                remainingChars < 20 ? 'text-red-600' : 'text-gray-400'
              )}>
                {remainingChars} characters remaining
              </div>
            )}
          </div>

          {/* Send button */}
          <Button
            type="submit"
            variant="primary"
            size="sm"
            disabled={disabled || !message.trim()}
            className="flex-shrink-0 h-8 w-8 p-0"
            aria-label="Send message"
          >
            <SendIcon className="w-4 h-4" />
          </Button>
        </div>

        {/* Keyboard shortcut hint - only show when focused */}
        {isFocused && (
          <div className="mt-1 text-xs text-gray-400 text-center">
            Press Enter to send, Shift + Enter for new line
          </div>
        )}
      </form>
    </div>
  );
};