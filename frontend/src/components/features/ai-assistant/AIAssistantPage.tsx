'use client';

import React, { useEffect, useState } from 'react';
import { ConversationList } from './ConversationList';
import { ChatInterface } from './ChatInterface';
import { useAIAssistantStore } from '@/stores/ai-assistant';
import { CreateConversationData, ConversationFilters } from '@/types/ai-assistant';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { 
  PanelLeftIcon, 
  PanelRightIcon,
  MessageSquareIcon,
  BookmarkIcon,
  SettingsIcon
} from 'lucide-react';

interface AIAssistantPageProps {
  className?: string;
}

export const AIAssistantPage: React.FC<AIAssistantPageProps> = ({
  className,
}) => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [activeTab, setActiveTab] = useState<'conversations' | 'bookmarks'>('conversations');

  const {
    conversations,
    activeConversation,
    draftConversation,
    bookmarkedMessages,
    isLoadingConversations,
    error,
    createConversation,
    createDraftConversation,
    clearDraftConversation,
    getConversations,
    enableAutoRefresh,
    disableAutoRefresh,
    refreshConversations,
    selectConversation,
    archiveConversation,
    deleteConversation,
    getBookmarkedMessages,
    setConversationFilters,
    clearActiveConversation,
    clearError,
  } = useAIAssistantStore();

  // Load conversations on mount and enable auto-refresh
  useEffect(() => {
    getConversations().catch(console.error);
    getBookmarkedMessages().catch(console.error);
    
    // Enable auto-refresh for conversations
    enableAutoRefresh();
    
    // Cleanup on unmount
    return () => {
      disableAutoRefresh();
    };
  }, [getConversations, getBookmarkedMessages, enableAutoRefresh, disableAutoRefresh]);

  const handleCreateConversation = () => {
    try {
      // Create a draft conversation instead of a real one
      createDraftConversation();
    } catch (error) {
      console.error('Failed to create draft conversation:', error);
    }
  };

  const handleSelectConversation = async (id: string) => {
    try {
      await selectConversation(id);
      setActiveTab('conversations');
    } catch (error) {
      console.error('Failed to select conversation:', error);
    }
  };

  const handleArchiveConversation = async (id: string) => {
    try {
      await archiveConversation(id);
      
      // If the archived conversation was active, clear it
      if (activeConversation?.id === id) {
        clearActiveConversation();
      }
    } catch (error) {
      console.error('Failed to archive conversation:', error);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        await deleteConversation(id);
        
        // If the deleted conversation was active, clear it
        if (activeConversation?.id === id) {
          clearActiveConversation();
        }
      } catch (error) {
        console.error('Failed to delete conversation:', error);
      }
    }
  };

  const handleFilterChange = (filters: ConversationFilters) => {
    setConversationFilters(filters);
    getConversations(filters).catch(console.error);
  };

  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
  };

  return (
    <div className={cn('flex h-[calc(100vh-4rem)] bg-gray-50', className)}>
      {/* Sidebar */}
      <div className={cn(
        'flex-shrink-0 transition-all duration-300 border-r-2 border-gray-200',
        sidebarCollapsed ? 'w-0 overflow-hidden' : 'w-80'
      )}>
        <div className="h-full flex flex-col">
          {/* Sidebar Header */}
          <div className="p-4 border-b-2 border-gray-200 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h1 className="text-xl font-bold">AI Assistant</h1>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleSidebar}
                className="h-8 w-8 p-0"
              >
                <PanelLeftIcon className="w-4 h-4" />
              </Button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-2 border-gray-200">
              <button
                onClick={() => setActiveTab('conversations')}
                className={cn(
                  'flex-1 px-3 py-2 text-sm font-medium transition-colors',
                  activeTab === 'conversations'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-50'
                )}
              >
                <MessageSquareIcon className="w-4 h-4 inline mr-2" />
                Chats
              </button>
              <button
                onClick={() => setActiveTab('bookmarks')}
                className={cn(
                  'flex-1 px-3 py-2 text-sm font-medium transition-colors border-l-2 border-gray-200',
                  activeTab === 'bookmarks'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-50'
                )}
              >
                <BookmarkIcon className="w-4 h-4 inline mr-2" />
                Saved
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-hidden">
            {activeTab === 'conversations' ? (
              <ConversationList
                conversations={conversations || []}
                activeConversationId={activeConversation?.id}
                onSelectConversation={handleSelectConversation}
                onCreateConversation={handleCreateConversation}
                onRefreshConversations={refreshConversations}
                onArchiveConversation={handleArchiveConversation}
                onDeleteConversation={handleDeleteConversation}
                onFilterChange={handleFilterChange}
                isLoading={isLoadingConversations}
              />
            ) : (
              <div className="p-4 h-full overflow-y-auto">
                <div className="space-y-3">
                  {bookmarkedMessages.length === 0 ? (
                    <div className="text-center text-gray-500 py-8">
                      <BookmarkIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      <p>No bookmarked messages</p>
                      <p className="text-xs">Bookmark helpful AI responses to save them here</p>
                    </div>
                  ) : (
                    bookmarkedMessages.map((message) => (
                      <div
                        key={message.id}
                        className="p-3 bg-white border-2 border-gray-200 hover:border-gray-300 cursor-pointer"
                        onClick={() => {
                          // Navigate to the conversation containing this message
                          const conversation = (conversations || []).find(c => c.id === message.conversationId);
                          if (conversation) {
                            handleSelectConversation(conversation.id);
                          }
                        }}
                      >
                        <div className="text-sm text-gray-600 mb-1">
                          {new Date(message.timestamp).toLocaleDateString()}
                        </div>
                        <div className="text-sm line-clamp-3">
                          {message.content}
                        </div>
                        {message.confidenceScore && (
                          <div className="text-xs text-gray-400 mt-2">
                            Confidence: {Math.round(message.confidenceScore * 100)}%
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="flex items-center justify-between p-4 bg-white border-b-2 border-gray-200">
          {sidebarCollapsed && (
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSidebar}
              className="h-8 w-8 p-0"
            >
              <PanelRightIcon className="w-4 h-4" />
            </Button>
          )}
          
          <div className="flex-1" />
          
          <div className="flex items-center gap-2">
            {error && (
              <div className="text-sm text-red-600 mr-4">
                {error}
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={clearError}
              className="h-8 w-8 p-0"
            >
              <SettingsIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Chat Interface */}
        <div className="flex-1 min-h-0">
          <ChatInterface conversationId={activeConversation?.id} />
        </div>
      </div>
    </div>
  );
};