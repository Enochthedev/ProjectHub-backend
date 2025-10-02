'use client';

import { useWebSocketStore } from '@/stores/websocket';

interface TypingIndicatorProps {
  conversationId: string;
  className?: string;
}

export function TypingIndicator({ conversationId, className = '' }: TypingIndicatorProps) {
  const { typingUsers } = useWebSocketStore();
  const isTyping = typingUsers.get(conversationId) || false;

  if (!isTyping) return null;

  return (
    <div className={`flex items-center gap-2 p-4 ${className}`}>
      <div className="flex items-center gap-1">
        <div className="flex gap-1">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-sm text-gray-500 ml-2">AI is thinking...</span>
      </div>
    </div>
  );
}

// Enhanced typing indicator with avatar
interface EnhancedTypingIndicatorProps {
  conversationId: string;
  showAvatar?: boolean;
  avatarUrl?: string;
  className?: string;
}

export function EnhancedTypingIndicator({ 
  conversationId, 
  showAvatar = true, 
  avatarUrl,
  className = '' 
}: EnhancedTypingIndicatorProps) {
  const { typingUsers } = useWebSocketStore();
  const isTyping = typingUsers.get(conversationId) || false;

  if (!isTyping) return null;

  return (
    <div className={`flex items-start gap-3 p-4 ${className}`}>
      {showAvatar && (
        <div className="flex-shrink-0">
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt="AI Assistant"
              className="w-8 h-8 border-2 border-black"
            />
          ) : (
            <div className="w-8 h-8 bg-black text-white flex items-center justify-center text-sm font-bold">
              AI
            </div>
          )}
        </div>
      )}
      
      <div className="flex-1">
        <div className="bg-gray-100 border-2 border-gray-200 p-3 inline-block max-w-xs">
          <div className="flex items-center gap-2">
            <div className="flex gap-1">
              <div 
                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" 
                style={{ 
                  animationDuration: '1.4s',
                  animationDelay: '0s',
                  animationIterationCount: 'infinite',
                  animationTimingFunction: 'ease-in-out'
                }} 
              />
              <div 
                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" 
                style={{ 
                  animationDuration: '1.4s',
                  animationDelay: '0.16s',
                  animationIterationCount: 'infinite',
                  animationTimingFunction: 'ease-in-out'
                }} 
              />
              <div 
                className="w-2 h-2 bg-gray-500 rounded-full animate-bounce" 
                style={{ 
                  animationDuration: '1.4s',
                  animationDelay: '0.32s',
                  animationIterationCount: 'infinite',
                  animationTimingFunction: 'ease-in-out'
                }} 
              />
            </div>
          </div>
        </div>
        <div className="text-xs text-gray-400 mt-1 ml-1">
          AI is generating response...
        </div>
      </div>
    </div>
  );
}