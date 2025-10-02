'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Clock, Bookmark, FileText, Users, Hash } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';

interface SearchResult {
  id: string;
  type: 'project' | 'bookmark' | 'conversation' | 'user' | 'page';
  title: string;
  description?: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  metadata?: {
    tags?: string[];
    lastAccessed?: string;
    category?: string;
  };
}

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Mock search results - in real app, this would come from API
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    type: 'project',
    title: 'AI-Powered Recommendation System',
    description: 'Machine learning project for personalized recommendations',
    href: '/projects/1',
    icon: FileText,
    metadata: {
      tags: ['AI', 'Machine Learning', 'Python'],
      category: 'Computer Science',
    },
  },
  {
    id: '2',
    type: 'project',
    title: 'Blockchain Voting System',
    description: 'Secure voting platform using blockchain technology',
    href: '/projects/2',
    icon: FileText,
    metadata: {
      tags: ['Blockchain', 'Security', 'Web3'],
      category: 'Computer Science',
    },
  },
  {
    id: '3',
    type: 'bookmark',
    title: 'IoT Smart Home Project',
    description: 'Bookmarked project about home automation',
    href: '/bookmarks/3',
    icon: Bookmark,
    metadata: {
      lastAccessed: '2 days ago',
      category: 'Electronics',
    },
  },
  {
    id: '4',
    type: 'conversation',
    title: 'Discussion about React best practices',
    description: 'AI conversation about frontend development',
    href: '/ai-assistant/conversations/4',
    icon: Hash,
    metadata: {
      lastAccessed: '1 hour ago',
    },
  },
  {
    id: '5',
    type: 'page',
    title: 'Milestones',
    description: 'Track your project milestones and deadlines',
    href: '/milestones',
    metadata: {},
  },
];

const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Load recent searches from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('recent-searches');
    if (saved) {
      setRecentSearches(JSON.parse(saved));
    }
  }, []);

  // Search functionality
  useEffect(() => {
    if (query.trim()) {
      // Simulate search - in real app, this would be an API call
      const filtered = mockSearchResults.filter(result =>
        result.title.toLowerCase().includes(query.toLowerCase()) ||
        result.description?.toLowerCase().includes(query.toLowerCase()) ||
        result.metadata?.tags?.some(tag => 
          tag.toLowerCase().includes(query.toLowerCase())
        )
      );
      setResults(filtered);
      setSelectedIndex(0);
    } else {
      setResults([]);
      setSelectedIndex(0);
    }
  }, [query]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < results.length - 1 ? prev + 1 : prev
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => prev > 0 ? prev - 1 : prev);
          break;
        case 'Enter':
          e.preventDefault();
          if (results[selectedIndex]) {
            handleResultSelect(results[selectedIndex]);
          }
          break;
        case 'Escape':
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, results, selectedIndex, onClose]);

  const handleResultSelect = (result: SearchResult) => {
    // Save to recent searches
    const newRecentSearches = [query, ...recentSearches.filter(s => s !== query)].slice(0, 5);
    setRecentSearches(newRecentSearches);
    localStorage.setItem('recent-searches', JSON.stringify(newRecentSearches));

    // Navigate to result
    router.push(result.href);
    onClose();
    setQuery('');
  };

  const handleRecentSearchSelect = (search: string) => {
    setQuery(search);
  };

  const getResultIcon = (result: SearchResult) => {
    if (result.icon) {
      const Icon = result.icon;
      return <Icon className="h-4 w-4" />;
    }

    switch (result.type) {
      case 'project':
        return <FileText className="h-4 w-4" />;
      case 'bookmark':
        return <Bookmark className="h-4 w-4" />;
      case 'conversation':
        return <Hash className="h-4 w-4" />;
      case 'user':
        return <Users className="h-4 w-4" />;
      default:
        return <Search className="h-4 w-4" />;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'project':
        return 'Project';
      case 'bookmark':
        return 'Bookmark';
      case 'conversation':
        return 'Conversation';
      case 'user':
        return 'User';
      case 'page':
        return 'Page';
      default:
        return 'Result';
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      size="lg"
      className="mt-20"
    >
      <div className="p-0">
        {/* Search input */}
        <div className="p-4 border-b-2 border-gray-200">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              ref={inputRef}
              type="text"
              placeholder="Search projects, bookmarks, conversations..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-3 text-lg border-2 border-gray-300 focus:border-black focus:outline-none"
            />
          </div>
        </div>

        {/* Results */}
        <div className="max-h-96 overflow-y-auto">
          {query.trim() === '' ? (
            // Recent searches and quick actions
            <div className="p-4">
              {recentSearches.length > 0 && (
                <div className="mb-4">
                  <h3 className="text-sm font-medium text-gray-500 mb-2 flex items-center">
                    <Clock className="h-4 w-4 mr-1" />
                    Recent searches
                  </h3>
                  <div className="space-y-1">
                    {recentSearches.map((search, index) => (
                      <button
                        key={index}
                        onClick={() => handleRecentSearchSelect(search)}
                        className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-2 border-transparent hover:border-gray-200"
                      >
                        {search}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <h3 className="text-sm font-medium text-gray-500 mb-2">
                  Quick actions
                </h3>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      router.push('/projects');
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-2 border-transparent hover:border-gray-200 flex items-center"
                  >
                    <FileText className="h-4 w-4 mr-2" />
                    Browse all projects
                  </button>
                  <button
                    onClick={() => {
                      router.push('/bookmarks');
                      onClose();
                    }}
                    className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 border-2 border-transparent hover:border-gray-200 flex items-center"
                  >
                    <Bookmark className="h-4 w-4 mr-2" />
                    View bookmarks
                  </button>
                </div>
              </div>
            </div>
          ) : results.length > 0 ? (
            // Search results
            <div className="py-2">
              {results.map((result, index) => (
                <button
                  key={result.id}
                  onClick={() => handleResultSelect(result)}
                  className={cn(
                    'w-full text-left px-4 py-3 hover:bg-gray-50 border-2 border-transparent',
                    index === selectedIndex && 'bg-gray-50 border-gray-200'
                  )}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-1 text-gray-400">
                      {getResultIcon(result)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-black truncate">
                          {result.title}
                        </p>
                        <span className="text-xs text-gray-400 bg-gray-100 px-2 py-1">
                          {getTypeLabel(result.type)}
                        </span>
                      </div>
                      {result.description && (
                        <p className="text-sm text-gray-500 truncate mt-1">
                          {result.description}
                        </p>
                      )}
                      {result.metadata?.tags && (
                        <div className="flex items-center space-x-1 mt-2">
                          {result.metadata.tags.slice(0, 3).map((tag, tagIndex) => (
                            <span
                              key={tagIndex}
                              className="text-xs text-gray-400 bg-gray-100 px-2 py-1"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          ) : (
            // No results
            <div className="p-8 text-center">
              <Search className="h-8 w-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">
                No results found for "{query}"
              </p>
              <p className="text-xs text-gray-400 mt-1">
                Try searching for projects, bookmarks, or conversations
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t-2 border-gray-200 px-4 py-2 text-xs text-gray-400 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>Esc Close</span>
          </div>
          <span>Powered by AI</span>
        </div>
      </div>
    </Modal>
  );
};

export default GlobalSearchModal;