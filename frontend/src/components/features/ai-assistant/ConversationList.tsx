'use client';

import React, { useState } from 'react';
import { 
  MessageCircleIcon, 
  SearchIcon, 
  PlusIcon,
  RefreshCwIcon,
  ArchiveIcon,
  TrashIcon,
  MoreVerticalIcon,
  FilterIcon
} from 'lucide-react';
import { Conversation, ConversationFilters } from '@/types/ai-assistant';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface ConversationListProps {
  conversations?: Conversation[];
  activeConversationId?: string;
  onSelectConversation: (id: string) => void;
  onCreateConversation: () => void;
  onRefreshConversations?: () => void;
  onArchiveConversation?: (id: string) => void;
  onDeleteConversation?: (id: string) => void;
  onFilterChange?: (filters: ConversationFilters) => void;
  isLoading?: boolean;
  className?: string;
}

export const ConversationList: React.FC<ConversationListProps> = ({
  conversations = [],
  activeConversationId,
  onSelectConversation,
  onCreateConversation,
  onRefreshConversations,
  onArchiveConversation,
  onDeleteConversation,
  onFilterChange,
  isLoading = false,
  className,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<Conversation['status'] | 'all'>('all');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    onFilterChange?.({
      searchQuery: query || undefined,
      status: selectedStatus !== 'all' ? selectedStatus : undefined,
    });
  };

  const handleStatusFilter = (status: Conversation['status'] | 'all') => {
    setSelectedStatus(status);
    onFilterChange?.({
      searchQuery: searchQuery || undefined,
      status: status !== 'all' ? status : undefined,
    });
  };

  const formatLastMessage = (conversation: Conversation) => {
    const lastMessage = new Date(conversation.lastMessageAt);
    const now = new Date();
    const diffInHours = (now.getTime() - lastMessage.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'Just now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h ago`;
    } else if (diffInHours < 168) { // 7 days
      return `${Math.floor(diffInHours / 24)}d ago`;
    } else {
      return lastMessage.toLocaleDateString();
    }
  };

  const getStatusColor = (status: Conversation['status']) => {
    switch (status) {
      case 'active':
        return 'text-black';
      case 'archived':
        return 'text-gray-400';
      case 'escalated':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getStatusIcon = (status: Conversation['status']) => {
    switch (status) {
      case 'archived':
        return <ArchiveIcon className="w-3 h-3" />;
      case 'escalated':
        return <span className="w-3 h-3 bg-red-600 rounded-full" />;
      default:
        return null;
    }
  };

  const filteredConversations = Array.isArray(conversations) 
    ? conversations
        .filter(conversation => conversation && conversation.id) // Remove undefined/invalid conversations
        .filter(conversation => {
          const matchesSearch = !searchQuery || 
            conversation.title.toLowerCase().includes(searchQuery.toLowerCase());
          const matchesStatus = selectedStatus === 'all' || conversation.status === selectedStatus;
          return matchesSearch && matchesStatus;
        })
    : [];

  return (
    <div className={cn('flex flex-col h-full bg-gray-50', className)}>
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b-2 border-gray-200 bg-white">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Conversations</h2>
          <div className="flex items-center space-x-2">
            {onRefreshConversations && (
              <Button
                variant="ghost"
                size="sm"
                onClick={onRefreshConversations}
                className="h-8 w-8 p-0"
                title="Refresh conversations"
              >
                <RefreshCwIcon className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="primary"
              size="sm"
              onClick={onCreateConversation}
              className="h-8 w-8 p-0"
            >
              <PlusIcon className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="search"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            className="pl-10"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              'h-8 px-2',
              showFilters && 'bg-gray-100'
            )}
          >
            <FilterIcon className="w-4 h-4 mr-1" />
            Filters
          </Button>
        </div>

        {showFilters && (
          <div className="mt-3 p-3 bg-white border-2 border-gray-200">
            <div className="space-y-2">
              <label className="text-xs font-medium text-gray-600">Status</label>
              <div className="flex flex-wrap gap-1">
                {(['all', 'active', 'archived', 'escalated'] as const).map((status) => (
                  <Button
                    key={status}
                    variant={selectedStatus === status ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => handleStatusFilter(status)}
                    className="h-6 px-2 text-xs capitalize"
                  >
                    {status}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {isLoading ? (
          <div className="p-4">
            {[...Array(5)].map((_, index) => (
              <div key={index} className="mb-3 p-3 bg-gray-100 border border-gray-200 animate-pulse">
                <div className="h-4 bg-gray-200 mb-2"></div>
                <div className="h-3 bg-gray-200 w-2/3"></div>
              </div>
            ))}
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="p-4 text-center text-gray-500">
            {searchQuery ? (
              <div>
                <SearchIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No conversations found</p>
                <p className="text-xs">Try adjusting your search or filters</p>
              </div>
            ) : (
              <div>
                <MessageCircleIcon className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                <p>No conversations yet</p>
                <p className="text-xs">Start a new conversation to get help</p>
              </div>
            )}
          </div>
        ) : (
          <div className="p-2">
            {filteredConversations.map((conversation) => (
              <div
                key={conversation.id}
                className={cn(
                  'relative group p-3 mb-2 border-2 cursor-pointer transition-colors',
                  activeConversationId === conversation.id
                    ? 'bg-white border-black'
                    : 'bg-white border-gray-200 hover:border-gray-300'
                )}
                onClick={() => onSelectConversation(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-medium text-sm truncate">
                        {conversation.title}
                      </h3>
                      {getStatusIcon(conversation.status)}
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className={getStatusColor(conversation.status)}>
                        {conversation.messageCount} messages
                      </span>
                      <span>{formatLastMessage(conversation)}</span>
                    </div>
                  </div>

                  {/* Menu Button */}
                  <div className="relative">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpenMenuId(openMenuId === conversation.id ? null : conversation.id);
                      }}
                      className="h-6 w-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <MoreVerticalIcon className="w-3 h-3" />
                    </Button>

                    {/* Dropdown Menu */}
                    {openMenuId === conversation.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white border-2 border-black shadow-brutal z-10 min-w-[120px]">
                        {onArchiveConversation && conversation.status !== 'archived' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onArchiveConversation(conversation.id);
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2"
                          >
                            <ArchiveIcon className="w-3 h-3" />
                            Archive
                          </button>
                        )}
                        
                        {onDeleteConversation && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (window.confirm(`Are you sure you want to delete "${conversation.title}"?\n\nThis will permanently delete the conversation and all its messages. This action cannot be undone.`)) {
                                onDeleteConversation(conversation.id);
                              }
                              setOpenMenuId(null);
                            }}
                            className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center gap-2 text-red-600"
                          >
                            <TrashIcon className="w-3 h-3" />
                            Delete
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};