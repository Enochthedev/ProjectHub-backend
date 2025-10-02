'use client';

import React, { useState } from 'react';
import { 
  BookmarkIcon, 
  StarIcon, 
  CopyIcon, 
  ExternalLinkIcon,
  CheckIcon,
  AlertTriangleIcon
} from 'lucide-react';
import { Message, Source } from '@/types/ai-assistant';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';

interface MessageBubbleProps {
  message: Message;
  onBookmark?: (messageId: string) => void;
  onRate?: (messageId: string, rating: number) => void;
  onCopy?: (content: string) => void;
  className?: string;
}

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  message,
  onBookmark,
  onRate,
  onCopy,
  className,
}) => {
  const [showRating, setShowRating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedRating, setSelectedRating] = useState(message.averageRating || 0);

  const isUser = message.type === 'user';
  const isSystem = message.type === 'system';

  const handleCopy = async () => {
    if (onCopy) {
      onCopy(message.content);
    } else {
      await navigator.clipboard.writeText(message.content);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRate = (rating: number) => {
    setSelectedRating(rating);
    onRate?.(message.id, rating);
    setShowRating(false);
  };

  const formatTimestamp = (timestamp: Date) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getConfidenceColor = (score?: number) => {
    if (!score) return 'text-gray-400';
    if (score >= 0.8) return 'text-black';
    if (score >= 0.6) return 'text-gray-600';
    return 'text-gray-400';
  };

  const getConfidenceText = (score?: number) => {
    if (!score) return 'Unknown';
    if (score >= 0.8) return 'High confidence';
    if (score >= 0.6) return 'Medium confidence';
    return 'Low confidence';
  };

  if (isSystem) {
    return (
      <div className={cn('flex justify-center py-2', className)}>
        <div className="px-3 py-1 bg-gray-100 border border-gray-300 text-xs text-gray-600 max-w-fit">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      'flex gap-3 p-2 group',
      isUser ? 'justify-end' : 'justify-start',
      className
    )}>
      {/* Avatar for AI messages */}
      {!isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-black text-white border-2 border-black flex items-center justify-center">
            <span className="text-xs font-medium">AI</span>
          </div>
        </div>
      )}

      <div className={cn(
        'flex flex-col gap-1 max-w-[70%]',
        isUser ? 'items-end' : 'items-start'
      )}>
        {/* Message Content */}
        <div className={cn(
          'px-3 py-2 border-2 break-words',
          isUser 
            ? 'bg-black text-white border-black' 
            : 'bg-white text-black border-gray-300'
        )}>
          <div className="whitespace-pre-wrap">{message.content}</div>
          
          {/* Confidence Score for AI messages */}
          {!isUser && message.confidenceScore && (
            <div className={cn(
              'mt-2 pt-2 border-t border-gray-200 text-xs',
              getConfidenceColor(message.confidenceScore)
            )}>
              {getConfidenceText(message.confidenceScore)} ({Math.round(message.confidenceScore * 100)}%)
            </div>
          )}
        </div>

        {/* Sources for AI messages */}
        {!isUser && message.sources && message.sources.length > 0 && (
          <div className="w-full">
            <div className="text-xs text-gray-500 mb-1">Sources:</div>
            <div className="flex flex-wrap gap-1">
              {message.sources.map((source: Source) => (
                <a
                  key={source.id}
                  href={source.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 border border-gray-300 text-xs hover:bg-gray-200 transition-colors"
                >
                  <span>{source.title}</span>
                  <ExternalLinkIcon className="w-3 h-3" />
                </a>
              ))}
            </div>
          </div>
        )}

        {/* Message Actions */}
        <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-xs text-gray-400">
            {formatTimestamp(message.timestamp)}
          </span>

          {/* Copy Button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleCopy}
            className="h-6 w-6 p-0"
            aria-label="Copy message"
          >
            {copied ? (
              <CheckIcon className="w-3 h-3 text-green-600" />
            ) : (
              <CopyIcon className="w-3 h-3" />
            )}
          </Button>

          {/* Bookmark Button for AI messages */}
          {!isUser && onBookmark && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onBookmark(message.id)}
              className={cn(
                'h-6 w-6 p-0',
                message.isBookmarked && 'text-black'
              )}
              aria-label={message.isBookmarked ? 'Remove bookmark' : 'Bookmark message'}
            >
              <BookmarkIcon 
                className={cn(
                  'w-3 h-3',
                  message.isBookmarked && 'fill-current'
                )} 
              />
            </Button>
          )}

          {/* Rating Button for AI messages */}
          {!isUser && onRate && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowRating(!showRating)}
              className="h-6 w-6 p-0"
              aria-label="Rate message"
            >
              <StarIcon 
                className={cn(
                  'w-3 h-3',
                  selectedRating > 0 && 'fill-current text-black'
                )} 
              />
            </Button>
          )}

          {/* Error indicator */}
          {message.status === 'error' && (
            <AlertTriangleIcon className="w-3 h-3 text-red-600" />
          )}
        </div>

        {/* Rating Panel */}
        {showRating && !isUser && (
          <div className="flex items-center gap-1 p-2 bg-gray-50 border border-gray-200">
            <span className="text-xs text-gray-600 mr-2">Rate:</span>
            {[1, 2, 3, 4, 5].map((rating) => (
              <Button
                key={rating}
                variant="ghost"
                size="sm"
                onClick={() => handleRate(rating)}
                className="h-6 w-6 p-0"
              >
                <StarIcon 
                  className={cn(
                    'w-3 h-3',
                    rating <= selectedRating && 'fill-current text-black'
                  )} 
                />
              </Button>
            ))}
          </div>
        )}

        {/* Suggested Follow-ups for AI messages */}
        {!isUser && message.suggestedFollowUps && message.suggestedFollowUps.length > 0 && (
          <div className="w-full">
            <div className="text-xs text-gray-500 mb-2">Suggested questions:</div>
            <div className="flex flex-col gap-1">
              {message.suggestedFollowUps.map((suggestion, index) => (
                <Button
                  key={index}
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    // This will be handled by the parent component
                    const event = new CustomEvent('suggestion-clicked', {
                      detail: { suggestion, messageId: message.id }
                    });
                    window.dispatchEvent(event);
                  }}
                  className="justify-start text-left text-xs p-2 h-auto border border-gray-200 hover:bg-gray-50"
                >
                  {suggestion}
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Avatar for user messages */}
      {isUser && (
        <div className="flex-shrink-0">
          <div className="w-8 h-8 bg-gray-200 border-2 border-black flex items-center justify-center">
            <span className="text-xs font-medium">U</span>
          </div>
        </div>
      )}
    </div>
  );
};