import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
    Conversation,
    Message,
    CreateConversationData,
    SendMessageData,
    MessageRating,
    AIAssistantResponse,
    ChatUIState,
    ConversationFilters,
    MessageFilters
} from '@/types/ai-assistant';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';
import websocketService from '@/lib/websocket';

interface AIAssistantState {
    // Conversations
    conversations: Conversation[];
    activeConversation: Conversation | null;
    draftConversation: Conversation | null;
    messages: Message[];

    // Bookmarked Messages
    bookmarkedMessages: Message[];

    // Chat UI State
    chatUI: ChatUIState;

    // Loading and Error States
    isLoading: boolean;
    isLoadingMessages: boolean;
    isLoadingConversations: boolean;
    isSendingMessage: boolean;
    error: string | null;

    // Filters
    conversationFilters: ConversationFilters;
    messageFilters: MessageFilters;

    // Auto-refresh
    autoRefreshInterval: NodeJS.Timeout | null;

    // Real-time features
    isWebSocketConnected: boolean;
    streamingMessageId: string | null;
    typingIndicators: Record<string, boolean>;

    // Actions - Conversation Management
    createConversation: (data: CreateConversationData) => Promise<Conversation>;
    createDraftConversation: () => Conversation;
    convertDraftToRealConversation: (firstMessage: string) => Promise<Conversation>;
    clearDraftConversation: () => void;
    generateConversationName: (firstMessage: string) => string;
    getConversations: (filters?: ConversationFilters) => Promise<void>;
    selectConversation: (id: string) => Promise<void>;
    updateConversation: (id: string, updates: Partial<Conversation>) => Promise<void>;
    deleteConversation: (id: string) => Promise<void>;
    archiveConversation: (id: string) => Promise<void>;

    // Actions - Message Management
    sendMessage: (data: SendMessageData) => Promise<void>;
    getMessages: (conversationId: string) => Promise<void>;
    bookmarkMessage: (messageId: string) => Promise<void>;
    unbookmarkMessage: (messageId: string) => Promise<void>;
    rateMessage: (messageId: string, rating: number, feedback?: string) => Promise<void>;
    getBookmarkedMessages: (filters?: MessageFilters) => Promise<void>;

    // Actions - Chat UI
    setTyping: (isTyping: boolean, stage?: 'thinking' | 'generating' | 'finalizing') => void;
    updateTypingProgress: (progress: number, estimatedTime?: number) => void;
    setStreamingResponse: (partialResponse: string) => void;
    setTypingDelay: (delay: number) => void;
    showSuggestions: (show: boolean) => void;
    selectMessage: (messageId?: string) => void;
    scrollToBottom: () => void;

    // Actions - Filters and Search
    setConversationFilters: (filters: ConversationFilters) => void;
    setMessageFilters: (filters: MessageFilters) => void;
    clearFilters: () => void;

    // Actions - Auto-refresh
    enableAutoRefresh: () => void;
    disableAutoRefresh: () => void;
    refreshConversations: () => Promise<void>;

    // Actions - Real-time
    initializeRealTimeFeatures: () => void;
    handleAITypingStart: (data: { conversationId: string; isTyping: boolean; estimatedResponseTime?: number }) => void;
    handleAITypingStop: (data: { conversationId: string; isTyping: boolean }) => void;
    handleAIResponsePartial: (update: Record<string, unknown>) => void;
    handleAIResponseComplete: (update: Record<string, unknown>) => void;
    handleAIError: (data: { conversationId: string; error: string }) => void;
    setWebSocketConnected: (connected: boolean) => void;

    // Actions - Typing Indicators
    setTypingIndicator: (conversationId: string, isTyping: boolean) => void;
    startTypingIndicator: (conversationId: string) => void;
    stopTypingIndicator: (conversationId: string) => void;

    // Actions - Utility
    clearError: () => void;
    clearActiveConversation: () => void;
    resetState: () => void;
}

const initialChatUIState: ChatUIState = {
    isTyping: false,
    typingStage: 'thinking',
    typingProgress: 0,
    typingStartTime: null,
    estimatedTime: null,
    typingDelay: 1000,
    showSuggestions: false,
    scrollToBottom: false,
};

export const useAIAssistantStore = create<AIAssistantState>()(
    persist(
        (set, get) => ({
            // Initial state
            conversations: [],
            activeConversation: null,
            draftConversation: null,
            messages: [],
            bookmarkedMessages: [],
            chatUI: initialChatUIState,
            isLoading: false,
            isLoadingMessages: false,
            isLoadingConversations: false,
            isSendingMessage: false,
            error: null,
            conversationFilters: {},
            messageFilters: {},
            autoRefreshInterval: null,
            isWebSocketConnected: false,
            streamingMessageId: null,
            typingIndicators: {},

            // Conversation Management Actions
            createConversation: async (data: CreateConversationData) => {
                try {
                    set({ isLoading: true, error: null });

                    // Mock conversation for development
                    const mockConversation: Conversation = {
                        id: `conv-${Date.now()}`,
                        studentId: 'student-1',
                        title: data.title || 'New Conversation',
                        status: 'active',
                        projectId: data.projectId,
                        language: data.language || 'en',
                        messageCount: 0,
                        messages: [],
                        createdAt: new Date(),
                        updatedAt: new Date(),
                        lastMessageAt: new Date(),
                    };

                    try {
                        console.log('Creating conversation with data:', data);
                        const response = await api.post<Conversation>(
                            API_ENDPOINTS.AI.CONVERSATIONS,
                            data
                        );
                        console.log('Conversation creation response:', response);
                        const newConversation = response;

                        set(state => ({
                            conversations: [newConversation, ...(state.conversations || [])],
                            activeConversation: newConversation,
                            messages: [],
                            isLoading: false,
                        }));

                        // Auto-refresh conversations list
                        setTimeout(() => get().getConversations(), 100);

                        return newConversation;
                    } catch (apiError) {
                        // Use mock data if API fails
                        console.warn('API not available, using mock data:', apiError);

                        set(state => ({
                            conversations: [mockConversation, ...(state.conversations || [])],
                            activeConversation: mockConversation,
                            messages: [],
                            isLoading: false,
                        }));

                        return mockConversation;
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to create conversation';
                    set({ error: errorMessage, isLoading: false });
                    throw error;
                }
            },

            // Draft conversation management
            createDraftConversation: () => {
                const draftConversation: Conversation = {
                    id: `draft-${Date.now()}`,
                    studentId: 'student-1',
                    title: 'New Chat',
                    status: 'active',
                    projectId: undefined,
                    language: 'en',
                    messageCount: 0,
                    messages: [],
                    createdAt: new Date(),
                    updatedAt: new Date(),
                    lastMessageAt: new Date(),
                };

                set({
                    draftConversation,
                    activeConversation: draftConversation,
                    messages: []
                });

                return draftConversation;
            },

            convertDraftToRealConversation: async (firstMessage: string): Promise<Conversation> => {
                const draft = get().draftConversation;
                if (!draft) {
                    throw new Error('No draft conversation to convert');
                }

                try {
                    // Generate title from first message
                    const title = get().generateConversationName(firstMessage);

                    // Create real conversation
                    const conversationData = {
                        title,
                        language: draft.language,
                        projectId: draft.projectId
                    };

                    const realConversation = await get().createConversation(conversationData);

                    // Clear draft and update state
                    set({
                        draftConversation: null,
                        activeConversation: realConversation
                    });

                    return realConversation;
                } catch (error) {
                    console.error('Failed to convert draft to real conversation:', error);
                    throw error;
                }
            },

            clearDraftConversation: () => {
                set({
                    draftConversation: null,
                    activeConversation: null,
                    messages: []
                });
            },

            generateConversationName: (firstMessage: string): string => {
                // Extract meaningful title from first message
                const cleanMessage = firstMessage.trim();

                // If message is too short, use a generic name
                if (cleanMessage.length < 10) {
                    return `Chat ${new Date().toLocaleDateString()}`;
                }

                // Take first 50 characters and clean up
                let title = cleanMessage.substring(0, 50);

                // Remove common question words and clean up
                title = title
                    .replace(/^(what|how|why|when|where|can|could|would|should|is|are|do|does)\s+/i, '')
                    .replace(/\?+$/, '')
                    .trim();

                // Capitalize first letter
                title = title.charAt(0).toUpperCase() + title.slice(1);

                // Add ellipsis if truncated
                if (cleanMessage.length > 50) {
                    title += '...';
                }

                return title || `Chat ${new Date().toLocaleDateString()}`;
            },

            getConversations: async (filters?: ConversationFilters) => {
                try {
                    set({ isLoadingConversations: true, error: null });

                    try {
                        const queryParams = new URLSearchParams();
                        if (filters?.status) queryParams.append('status', filters.status);
                        if (filters?.projectId) queryParams.append('projectId', filters.projectId);
                        if (filters?.searchQuery) queryParams.append('search', filters.searchQuery);
                        if (filters?.dateRange?.start) queryParams.append('startDate', filters.dateRange.start);
                        if (filters?.dateRange?.end) queryParams.append('endDate', filters.dateRange.end);

                        const url = `${API_ENDPOINTS.AI.CONVERSATIONS}?${queryParams.toString()}`;
                        console.log('Fetching conversations from:', url);

                        const response = await api.get<{
                            conversations: Conversation[];
                            total: number;
                            hasMore: boolean;
                        }>(url);

                        console.log('Conversations response:', response);

                        set({
                            conversations: response?.conversations || [],
                            conversationFilters: filters || {},
                            isLoadingConversations: false,
                        });
                    } catch (apiError) {
                        // Use existing conversations if API fails
                        console.warn('API not available, keeping existing conversations:', apiError);

                        set({
                            conversationFilters: filters || {},
                            isLoadingConversations: false,
                        });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to load conversations';
                    set({ error: errorMessage, isLoadingConversations: false });
                    throw error;
                }
            },

            selectConversation: async (id: string) => {
                try {
                    console.log('📋 Selecting conversation:', id);
                    set({ isLoadingMessages: true, error: null });

                    const conversation = (get().conversations || []).find(c => c.id === id);
                    if (!conversation) {
                        throw new Error('Conversation not found');
                    }

                    console.log('📋 Found conversation:', conversation.title);

                    // Check if we already have messages for this conversation in persisted state
                    const currentState = get();
                    const hasPersistedMessages = currentState.activeConversation?.id === id &&
                        currentState.messages.length > 0 &&
                        currentState.messages.some(m => m.conversationId === id);

                    if (hasPersistedMessages) {
                        console.log('📋 Using persisted messages:', currentState.messages.length);
                        set({
                            activeConversation: conversation,
                            isLoadingMessages: false,
                        });
                    } else {
                        console.log('📋 Loading messages from API');
                        // Get messages for the conversation
                        await get().getMessages(id);

                        set({
                            activeConversation: conversation,
                            isLoadingMessages: false,
                        });
                    }

                    console.log('📋 Conversation selected, messages loaded:', get().messages.length);
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to select conversation';
                    set({ error: errorMessage, isLoadingMessages: false });
                    throw error;
                }
            },

            updateConversation: async (id: string, updates: Partial<Conversation>) => {
                try {
                    set({ isLoading: true, error: null });

                    const response = await api.patch<Conversation>(
                        `${API_ENDPOINTS.AI.CONVERSATIONS}/${id}`,
                        updates
                    );

                    const updatedConversation = response;

                    set(state => ({
                        conversations: (state.conversations || []).map(c =>
                            c.id === id ? updatedConversation : c
                        ),
                        activeConversation: state.activeConversation?.id === id
                            ? updatedConversation
                            : state.activeConversation,
                        isLoading: false,
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to update conversation';
                    set({ error: errorMessage, isLoading: false });
                    throw error;
                }
            },

            deleteConversation: async (id: string) => {
                try {
                    console.log('🗑️ Starting conversation deletion:', id);
                    set({ isLoading: true, error: null });

                    // Store current state before deletion
                    const currentState = get();
                    const isActiveConversation = currentState.activeConversation?.id === id;
                    console.log('🗑️ Is active conversation?', isActiveConversation);
                    console.log('🗑️ Current messages count:', currentState.messages.length);
                    console.log('🗑️ Current conversations count:', currentState.conversations?.length);

                    // Optimistic update - remove from conversations list immediately
                    set(state => ({
                        conversations: (state.conversations || []).filter(c => c.id !== id),
                        isLoading: false,
                    }));

                    try {
                        await api.delete(`${API_ENDPOINTS.AI.CONVERSATIONS}/${id}`);
                        console.log('Conversation deleted successfully:', id);
                    } catch (apiError: unknown) {
                        console.error('API deletion failed:', apiError);

                        // Revert the optimistic update if API fails
                        const conversationToRestore = currentState.conversations?.find(c => c.id === id);
                        if (conversationToRestore) {
                            set(state => ({
                                conversations: [...(state.conversations || []), conversationToRestore]
                                    .sort((a, b) => new Date(b.lastMessageAt || b.createdAt).getTime() - new Date(a.lastMessageAt || a.createdAt).getTime()),
                                error: `Failed to delete conversation: ${apiError?.response?.data?.message || apiError?.message || 'Unknown error'}`
                            }));
                        }

                        // Don't throw here, as we want to continue with local cleanup
                        return;
                    }

                    // Only clear active conversation and messages if we deleted the active conversation
                    if (isActiveConversation) {
                        console.log('🗑️ Clearing active conversation and messages');
                        set({
                            activeConversation: null,
                            messages: []
                        });
                    } else {
                        console.log('🗑️ Not clearing messages - deleted conversation was not active');
                    }

                    // Refresh conversations list after a short delay
                    console.log('🗑️ Scheduling conversation refresh in 500ms');
                    setTimeout(() => {
                        console.log('🗑️ Refreshing conversations after deletion');
                        get().getConversations().catch(console.error);
                    }, 500);

                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to delete conversation';
                    set({ error: errorMessage, isLoading: false });
                    throw error;
                }
            },

            archiveConversation: async (id: string) => {
                try {
                    await get().updateConversation(id, { status: 'archived' });
                } catch (error) {
                    throw error;
                }
            },

            // Message Management Actions
            sendMessage: async (data: SendMessageData) => {
                try {
                    set({ isSendingMessage: true, error: null });

                    let conversationId = data.conversationId;
                    const currentState = get();

                    // Handle draft conversation - convert to real conversation on first message
                    if (currentState.draftConversation && !conversationId) {
                        const realConversation = await get().convertDraftToRealConversation(data.query);
                        conversationId = realConversation.id;
                    }

                    // If still no conversation exists, create one
                    if (!conversationId) {
                        const title = get().generateConversationName(data.query);
                        const newConversation = await get().createConversation({
                            title,
                            language: data.language || 'en'
                        });
                        conversationId = newConversation.id;
                        await get().selectConversation(conversationId);
                    }

                    // Add user message immediately to UI
                    const userMessage: Message = {
                        id: `temp-${Date.now()}`,
                        conversationId: conversationId,
                        type: 'user',
                        content: data.query,
                        timestamp: new Date(),
                        status: 'sent',
                        isBookmarked: false,
                        averageRating: 0,
                    };

                    set(state => ({
                        messages: [...state.messages, userMessage],
                        chatUI: { ...state.chatUI, scrollToBottom: true },
                    }));

                    // Start enhanced typing indicator
                    get().setTyping(true, 'thinking');

                    // Try to send message to API, fallback to mock
                    let aiMessage: Message;
                    let suggestedFollowUps: string[] = [];

                    try {
                        // Update typing stage to generating
                        get().setTyping(true, 'generating');

                        const response = await api.post<AIAssistantResponse>(
                            API_ENDPOINTS.AI.ASK,
                            {
                                query: data.query,
                                conversationId: conversationId,
                                language: data.language || 'en',
                                projectPhase: data.projectPhase,
                                includeProjectContext: data.includeProjectContext ?? true,
                                specialization: data.specialization
                            }
                        );

                        // Update typing stage to finalizing
                        get().setTyping(true, 'finalizing');

                        // Convert backend response to frontend Message format
                        aiMessage = {
                            id: response.messageId,
                            conversationId: response.conversationId,
                            type: 'assistant',
                            content: response.response,
                            timestamp: new Date(),
                            status: 'delivered',
                            confidenceScore: response.confidenceScore,
                            sources: response.sources,
                            suggestedFollowUps: response.suggestedFollowUps,
                            isBookmarked: false,
                            averageRating: 0,
                            metadata: {
                                processingTime: response.metadata.processingTime,
                                language: response.metadata.language,
                                category: response.metadata.category,
                                requiresHumanReview: response.metadata.requiresHumanReview,
                            }
                        };
                        suggestedFollowUps = response.suggestedFollowUps || [];
                    } catch (apiError) {
                        console.warn('API not available, using mock AI response:', apiError);

                        // Mock AI response
                        aiMessage = {
                            id: `ai-${Date.now()}`,
                            conversationId: conversationId,
                            type: 'assistant',
                            content: `I understand you're asking about "${data.query}". This is a mock response since the AI backend is not available. I'd be happy to help you with your project questions once the backend is connected!`,
                            timestamp: new Date(),
                            status: 'delivered',
                            confidenceScore: 0.85,
                            sources: ['Mock Documentation', 'AI Assistant Guidelines'],
                            isBookmarked: false,
                            averageRating: 0,
                        };

                        suggestedFollowUps = [
                            'Tell me more about this topic',
                            'How can I get started?',
                            'What are the best practices?'
                        ];
                    }

                    // Update messages with AI response
                    set(state => ({
                        messages: [
                            ...state.messages.filter(m => m.id !== userMessage.id),
                            { ...userMessage, id: `${userMessage.id}-confirmed` },
                            { ...aiMessage, suggestedFollowUps },
                        ],
                        chatUI: {
                            ...state.chatUI,
                            isTyping: false,
                            typingProgress: 0,
                            typingStartTime: null,
                            estimatedTime: null,
                            scrollToBottom: true,
                            showSuggestions: !!suggestedFollowUps?.length,
                        },
                        isSendingMessage: false,
                    }));

                    // Update conversation in list
                    const updatedConversation = (get().conversations || []).find(c => c.id === data.conversationId);
                    if (updatedConversation) {
                        set(state => ({
                            conversations: (state.conversations || []).map(c =>
                                c.id === data.conversationId
                                    ? { ...c, lastMessageAt: new Date().toISOString(), messageCount: c.messageCount + 2 }
                                    : c
                            ),
                        }));
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to send message';
                    set({
                        error: errorMessage,
                        isSendingMessage: false,
                        chatUI: {
                            ...get().chatUI,
                            isTyping: false,
                            typingProgress: 0,
                            typingStartTime: null,
                            estimatedTime: null
                        },
                    });
                    throw error;
                }
            },

            getMessages: async (conversationId: string) => {
                try {
                    console.log('💬 Loading messages for conversation:', conversationId);
                    set({ isLoadingMessages: true, error: null });

                    try {
                        const response = await api.get<{
                            messages: Message[];
                            total: number;
                            hasMore: boolean;
                        }>(`${API_ENDPOINTS.AI.CONVERSATIONS}/${conversationId}/messages`);

                        console.log('💬 API returned messages:', response?.messages?.length || 0);
                        set({
                            messages: response?.messages || [],
                            isLoadingMessages: false,
                        });
                    } catch (apiError) {
                        console.warn('💬 API not available, starting with empty messages:', apiError);

                        set({
                            messages: [],
                            isLoadingMessages: false,
                        });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to load messages';
                    set({ error: errorMessage, isLoadingMessages: false });
                    throw error;
                }
            },

            bookmarkMessage: async (messageId: string) => {
                try {
                    try {
                        await api.post(`${API_ENDPOINTS.AI.MESSAGES}/${messageId}/bookmark`);
                    } catch (apiError) {
                        console.warn('API not available, bookmarking locally:', apiError);
                    }

                    set(state => ({
                        messages: state.messages.map(m =>
                            m.id === messageId ? { ...m, isBookmarked: true } : m
                        ),
                    }));

                    // Refresh bookmarked messages (will handle API failure internally)
                    await get().getBookmarkedMessages();
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to bookmark message';
                    set({ error: errorMessage });
                    throw error;
                }
            },

            unbookmarkMessage: async (messageId: string) => {
                try {
                    try {
                        await api.delete(`${API_ENDPOINTS.AI.MESSAGES}/${messageId}/bookmark`);
                    } catch (apiError) {
                        console.warn('API not available, unbookmarking locally:', apiError);
                    }

                    set(state => ({
                        messages: state.messages.map(m =>
                            m.id === messageId ? { ...m, isBookmarked: false } : m
                        ),
                        bookmarkedMessages: (state.bookmarkedMessages || []).filter(m => m.id !== messageId),
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to remove bookmark';
                    set({ error: errorMessage });
                    throw error;
                }
            },

            rateMessage: async (messageId: string, rating: number, feedback?: string) => {
                try {
                    const ratingData: MessageRating = {
                        messageId,
                        rating,
                        feedback,
                    };

                    await api.post(`${API_ENDPOINTS.AI.MESSAGES}/${messageId}/rate`, ratingData);

                    set(state => ({
                        messages: state.messages.map(m =>
                            m.id === messageId ? { ...m, averageRating: rating } : m
                        ),
                    }));
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to rate message';
                    set({ error: errorMessage });
                    throw error;
                }
            },

            getBookmarkedMessages: async (filters?: MessageFilters) => {
                try {
                    set({ isLoading: true, error: null });

                    try {
                        const queryParams = new URLSearchParams();
                        if (filters?.type) queryParams.append('type', filters.type);
                        if (filters?.confidenceThreshold) {
                            queryParams.append('confidenceThreshold', filters.confidenceThreshold.toString());
                        }

                        const url = `${API_ENDPOINTS.AI.BOOKMARKS}?${queryParams.toString()}`;
                        const response = await api.get<{
                            messages: Message[];
                            total: number;
                            hasMore: boolean;
                        }>(url);

                        set({
                            bookmarkedMessages: response?.messages || [],
                            messageFilters: filters || {},
                            isLoading: false,
                        });
                    } catch (apiError) {
                        console.warn('API not available, keeping existing bookmarked messages:', apiError);

                        set({
                            messageFilters: filters || {},
                            isLoading: false,
                        });
                    }
                } catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Failed to load bookmarked messages';
                    set({ error: errorMessage, isLoading: false });
                    throw error;
                }
            },

            // Chat UI Actions
            setTyping: (isTyping: boolean, stage?: 'thinking' | 'generating' | 'finalizing') => {
                set(state => ({
                    chatUI: {
                        ...state.chatUI,
                        isTyping,
                        typingStage: stage || 'thinking',
                        typingStartTime: isTyping ? Date.now() : null,
                        typingProgress: isTyping ? 0 : 0,
                        estimatedTime: null
                    },
                }));
            },

            setTypingDelay: (delay: number) => {
                set(state => ({
                    chatUI: { ...state.chatUI, typingDelay: delay },
                }));
            },

            updateTypingProgress: (progress: number, estimatedTime?: number) => {
                set(state => ({
                    chatUI: {
                        ...state.chatUI,
                        typingProgress: Math.min(100, Math.max(0, progress)),
                        estimatedTime
                    }
                }));
            },

            setStreamingResponse: (partialResponse: string) => {
                set(state => {
                    const messages = [...state.messages];
                    const lastMessage = messages[messages.length - 1];

                    if (lastMessage && lastMessage.type === 'assistant' && lastMessage.id.startsWith('streaming-')) {
                        // Update existing streaming message
                        lastMessage.content = partialResponse;
                    } else {
                        // Add new streaming message
                        messages.push({
                            id: `streaming-${Date.now()}`,
                            conversationId: state.activeConversation?.id || '',
                            type: 'assistant',
                            content: partialResponse,
                            timestamp: new Date(),
                            status: 'delivered',
                            isBookmarked: false,
                            averageRating: 0,
                        });
                    }

                    return {
                        messages,
                        chatUI: { ...state.chatUI, scrollToBottom: true }
                    };
                });
            },

            showSuggestions: (show: boolean) => {
                set(state => ({
                    chatUI: { ...state.chatUI, showSuggestions: show },
                }));
            },

            selectMessage: (messageId?: string) => {
                set(state => ({
                    chatUI: { ...state.chatUI, selectedMessageId: messageId },
                }));
            },

            scrollToBottom: () => {
                set(state => ({
                    chatUI: { ...state.chatUI, scrollToBottom: true },
                }));
            },

            // Filter Actions
            setConversationFilters: (filters: ConversationFilters) => {
                set({ conversationFilters: filters });
            },

            setMessageFilters: (filters: MessageFilters) => {
                set({ messageFilters: filters });
            },

            clearFilters: () => {
                set({
                    conversationFilters: {},
                    messageFilters: {},
                });
            },

            // Auto-refresh functionality
            enableAutoRefresh: () => {
                const state = get();
                if (state.autoRefreshInterval) {
                    clearInterval(state.autoRefreshInterval);
                }

                const intervalId = setInterval(async () => {
                    try {
                        // Only refresh if user is active and not currently loading
                        const currentState = get();
                        if (!currentState.isLoading && document.visibilityState === 'visible') {
                            await currentState.getConversations();
                        }
                    } catch (error) {
                        console.warn('Auto-refresh failed:', error);
                    }
                }, 30000); // Refresh every 30 seconds

                set({ autoRefreshInterval: intervalId });
            },

            disableAutoRefresh: () => {
                const state = get();
                if (state.autoRefreshInterval) {
                    clearInterval(state.autoRefreshInterval);
                    set({ autoRefreshInterval: null });
                }
            },

            refreshConversations: async () => {
                try {
                    await get().getConversations();
                } catch (error) {
                    console.error('Failed to refresh conversations:', error);
                }
            },

            // Utility Actions
            clearError: () => set({ error: null }),

            clearActiveConversation: () => {
                set({
                    activeConversation: null,
                    messages: [],
                    chatUI: initialChatUIState,
                });
            },

            resetState: () => {
                set({
                    conversations: [],
                    activeConversation: null,
                    messages: [],
                    bookmarkedMessages: [],
                    chatUI: initialChatUIState,
                    isLoading: false,
                    isLoadingMessages: false,
                    isLoadingConversations: false,
                    isSendingMessage: false,
                    error: null,
                    conversationFilters: {},
                    messageFilters: {},
                    isWebSocketConnected: false,
                    streamingMessageId: null,
                    typingIndicators: {},
                });
            },

            // Typing indicator methods
            setTypingIndicator: (conversationId: string, isTyping: boolean) => {
                set(state => ({
                    typingIndicators: {
                        ...state.typingIndicators,
                        [conversationId]: isTyping,
                    },
                }));
            },

            startTypingIndicator: (conversationId: string) => {
                websocketService.startAITyping(conversationId);
                get().setTypingIndicator(conversationId, true);
            },

            stopTypingIndicator: (conversationId: string) => {
                websocketService.stopAITyping(conversationId);
                get().setTypingIndicator(conversationId, false);
            },

            // Real-time Actions
            initializeRealTimeFeatures: () => {
                if (!websocketService.isConnected()) {
                    console.warn('WebSocket not connected, cannot initialize AI real-time features');
                    return;
                }

                // Set up AI-specific WebSocket listeners
                websocketService.on('ai-typing', (data) => {
                    get().handleAITypingStart(data);
                });

                websocketService.on('connected', () => {
                    get().setWebSocketConnected(true);
                });

                websocketService.on('disconnect', () => {
                    get().setWebSocketConnected(false);
                });

                set({ isWebSocketConnected: websocketService.isConnected() });
            },

            handleAITypingStart: (data) => {
                const { conversationId, estimatedResponseTime } = data;
                const activeConversation = get().activeConversation;

                if (activeConversation?.id === conversationId) {
                    set(state => ({
                        chatUI: {
                            ...state.chatUI,
                            isTyping: true,
                            typingStage: 'thinking',
                            typingStartTime: Date.now(),
                            estimatedTime: estimatedResponseTime,
                            typingProgress: 0,
                        },
                    }));

                    // Start progress simulation
                    const startTime = Date.now();
                    const duration = estimatedResponseTime || 5000;

                    const updateProgress = () => {
                        const elapsed = Date.now() - startTime;
                        const progress = Math.min((elapsed / duration) * 100, 95); // Cap at 95% until complete

                        set(state => ({
                            chatUI: {
                                ...state.chatUI,
                                typingProgress: progress,
                            },
                        }));

                        if (progress < 95 && get().chatUI.isTyping) {
                            setTimeout(updateProgress, 100);
                        }
                    };

                    updateProgress();
                }
            },

            handleAITypingStop: (data) => {
                const { conversationId } = data;
                const activeConversation = get().activeConversation;

                if (activeConversation?.id === conversationId) {
                    set(state => ({
                        chatUI: {
                            ...state.chatUI,
                            isTyping: false,
                            typingProgress: 0,
                            typingStartTime: null,
                            estimatedTime: null,
                        },
                    }));
                }
            },

            handleAIResponsePartial: (update) => {
                const { conversationId, messageId, content } = update;
                const activeConversation = get().activeConversation;

                if (activeConversation?.id === conversationId && content) {
                    // Update or create streaming message
                    set(state => {
                        const existingMessageIndex = state.messages.findIndex(m => m.id === messageId);

                        if (existingMessageIndex >= 0) {
                            // Update existing message
                            const updatedMessages = [...state.messages];
                            updatedMessages[existingMessageIndex] = {
                                ...updatedMessages[existingMessageIndex],
                                content,
                            };

                            return {
                                messages: updatedMessages,
                                streamingMessageId: messageId,
                                chatUI: {
                                    ...state.chatUI,
                                    typingStage: 'generating',
                                    scrollToBottom: true,
                                },
                            };
                        } else {
                            // Create new streaming message
                            const streamingMessage: Message = {
                                id: messageId || `streaming-${Date.now()}`,
                                conversationId,
                                type: 'assistant',
                                content,
                                timestamp: new Date(),
                                status: 'delivered',
                                isBookmarked: false,
                                averageRating: 0,
                            };

                            return {
                                messages: [...state.messages, streamingMessage],
                                streamingMessageId: streamingMessage.id,
                                chatUI: {
                                    ...state.chatUI,
                                    typingStage: 'generating',
                                    scrollToBottom: true,
                                },
                            };
                        }
                    });
                }
            },

            handleAIResponseComplete: (update) => {
                const { conversationId, messageId, content, confidenceScore, sources, suggestedFollowUps } = update;
                const activeConversation = get().activeConversation;

                if (activeConversation?.id === conversationId) {
                    set(state => {
                        const existingMessageIndex = state.messages.findIndex(m => m.id === messageId);

                        if (existingMessageIndex >= 0) {
                            // Update existing message with complete data
                            const updatedMessages = [...state.messages];
                            updatedMessages[existingMessageIndex] = {
                                ...updatedMessages[existingMessageIndex],
                                content: content || updatedMessages[existingMessageIndex].content,
                                confidenceScore,
                                sources,
                                suggestedFollowUps,
                                status: 'delivered',
                            };

                            return {
                                messages: updatedMessages,
                                streamingMessageId: null,
                                chatUI: {
                                    ...state.chatUI,
                                    isTyping: false,
                                    typingProgress: 100,
                                    showSuggestions: !!suggestedFollowUps?.length,
                                    scrollToBottom: true,
                                },
                            };
                        } else if (content) {
                            // Create complete message
                            const completeMessage: Message = {
                                id: messageId || `complete-${Date.now()}`,
                                conversationId,
                                type: 'assistant',
                                content,
                                timestamp: new Date(),
                                status: 'delivered',
                                confidenceScore,
                                sources,
                                suggestedFollowUps,
                                isBookmarked: false,
                                averageRating: 0,
                            };

                            return {
                                messages: [...state.messages, completeMessage],
                                streamingMessageId: null,
                                chatUI: {
                                    ...state.chatUI,
                                    isTyping: false,
                                    typingProgress: 100,
                                    showSuggestions: !!suggestedFollowUps?.length,
                                    scrollToBottom: true,
                                },
                            };
                        }

                        return state;
                    });
                }
            },

            handleAIError: (data) => {
                const { conversationId, error } = data;
                const activeConversation = get().activeConversation;

                if (activeConversation?.id === conversationId) {
                    set(state => ({
                        error,
                        chatUI: {
                            ...state.chatUI,
                            isTyping: false,
                            typingProgress: 0,
                            typingStartTime: null,
                            estimatedTime: null,
                        },
                        streamingMessageId: null,
                    }));
                }
            },

            setWebSocketConnected: (connected) => {
                set({ isWebSocketConnected: connected });
            },
        }),
        {
            name: 'ai-assistant-storage',
            version: 2, // Increment this to clear old storage when structure changes
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({
                conversations: state.conversations || [],
                messages: state.messages || [],
                activeConversation: state.activeConversation,
                bookmarkedMessages: state.bookmarkedMessages || [],
                conversationFilters: state.conversationFilters || {},
                messageFilters: state.messageFilters || {},
            }),
            merge: (persistedState, currentState) => {
                const persisted = persistedState as Partial<AIAssistantState>;
                return {
                    ...currentState,
                    conversations: Array.isArray(persisted?.conversations) ? persisted.conversations : [],
                    messages: Array.isArray(persisted?.messages) ? persisted.messages : [],
                    activeConversation: persisted?.activeConversation || null,
                    bookmarkedMessages: Array.isArray(persisted?.bookmarkedMessages) ? persisted.bookmarkedMessages : [],
                    conversationFilters: persisted?.conversationFilters || {},
                    messageFilters: persisted?.messageFilters || {},
                };
            },
        }
    )
);