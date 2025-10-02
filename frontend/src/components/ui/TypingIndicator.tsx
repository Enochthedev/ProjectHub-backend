'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import { useAIAssistantStore } from '@/stores/ai-assistant';

interface TypingIndicatorProps {
  avatar?: string;
  text?: string;
  animated?: boolean;
  className?: string;
}

export const TypingIndicator: React.FC<TypingIndicatorProps> = ({
  avatar,
  text = 'AI is thinking...',
  animated = true,
  className,
}) => {
  return (
    <div 
      className={cn('flex items-center gap-3 p-4', className)}
      role="status"
      aria-live="polite"
    >
      {avatar && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gray-200 border-2 border-black flex items-center justify-center">
            <span className="text-xs font-medium">AI</span>
          </div>
        </div>
      )}
      
      <div className="flex items-center gap-2">
        <div className="flex gap-1">
          {[0, 1, 2].map((index) => (
            <div
              key={index}
              className={cn(
                'w-2 h-2 bg-gray-400 rounded-full',
                animated && 'animate-bounce'
              )}
              style={{
                animationDelay: animated ? `${index * 0.16}s` : undefined,
                animationDuration: animated ? '1.4s' : undefined,
              }}
            />
          ))}
        </div>
        
        {text && (
          <span className="text-sm text-gray-500 ml-2">{text}</span>
        )}
      </div>
    </div>
  );
};

// Enhanced ChatGPT-style typing indicator
export const EnhancedTypingIndicator: React.FC<{ className?: string }> = ({ className = '' }) => {
  const { chatUI } = useAIAssistantStore();
  const [dots, setDots] = useState('');
  const [elapsedTime, setElapsedTime] = useState(0);

  useEffect(() => {
    if (!chatUI.isTyping) {
      setDots('');
      setElapsedTime(0);
      return;
    }

    const dotsInterval = setInterval(() => {
      setDots(prev => {
        if (prev === '...') return '';
        return prev + '.';
      });
    }, 500);

    const timeInterval = setInterval(() => {
      if (chatUI.typingStartTime) {
        setElapsedTime(Date.now() - chatUI.typingStartTime);
      }
    }, 100);

    return () => {
      clearInterval(dotsInterval);
      clearInterval(timeInterval);
    };
  }, [chatUI.isTyping, chatUI.typingStartTime]);

  if (!chatUI.isTyping) return null;

  const getStageText = () => {
    switch (chatUI.typingStage) {
      case 'thinking':
        return 'Thinking';
      case 'generating':
        return 'Generating response';
      case 'finalizing':
        return 'Finalizing';
      default:
        return 'Processing';
    }
  };

  const formatElapsedTime = (ms: number) => {
    const seconds = Math.floor(ms / 1000);
    return seconds > 0 ? `${seconds}s` : '';
  };

  return (
    <div className={cn('flex items-center space-x-3 p-4 bg-gray-50 rounded-lg', className)}>
      {/* Animated dots */}
      <div className="flex space-x-1">
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
        <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
      </div>
      
      {/* Status text */}
      <div className="flex items-center space-x-2 text-sm text-gray-600">
        <span>{getStageText()}{dots}</span>
        {elapsedTime > 1000 && (
          <span className="text-xs text-gray-400">({formatElapsedTime(elapsedTime)})</span>
        )}
      </div>
      
      {/* Progress bar for generating stage */}
      {chatUI.typingStage === 'generating' && chatUI.typingProgress > 0 && (
        <div className="flex-1 max-w-32">
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div 
              className="bg-blue-500 h-1.5 rounded-full transition-all duration-300 ease-out"
              style={{ width: `${chatUI.typingProgress}%` }}
            />
          </div>
        </div>
      )}
      
      {/* Estimated time */}
      {chatUI.estimatedTime && (
        <span className="text-xs text-gray-400">
          ~{Math.ceil(chatUI.estimatedTime / 1000)}s
        </span>
      )}
    </div>
  );
};

// Typing indicator for message bubbles
export const MessageTypingIndicator: React.FC<{
  className?: string;
}> = ({ className }) => {
  return (
    <div className={cn(
      'inline-flex items-center gap-1 px-3 py-2 bg-gray-100 border-2 border-gray-200 max-w-fit',
      className
    )}>
      {[0, 1, 2].map((index) => (
        <div
          key={index}
          className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
          style={{
            animationDelay: `${index * 0.16}s`,
            animationDuration: '1.4s',
          }}
        />
      ))}
    </div>
  );
};