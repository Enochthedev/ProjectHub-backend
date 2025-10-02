// AI Assistant Types
export interface Conversation {
    id: string;
    studentId: string;
    title: string;
    status: 'active' | 'archived' | 'escalated';
    projectId?: string;
    language: string;
    messageCount: number;
    messages?: Message[];
    context?: any;
    createdAt: Date;
    updatedAt: Date;
    lastMessageAt?: Date;
}

export interface Message {
    id: string;
    conversationId: string;
    type: 'user' | 'assistant' | 'system';
    content: string;
    timestamp?: Date;
    createdAt?: Date;
    status: 'sent' | 'delivered' | 'read' | 'error';
    confidenceScore?: number;
    sources?: string[];
    suggestedFollowUps?: string[];
    isBookmarked: boolean;
    averageRating: number;
    ratingCount?: number;
    metadata?: {
        processingTime?: number;
        language?: string;
        category?: string;
        requiresHumanReview?: boolean;
    };
}

export interface Source {
    id: string;
    title: string;
    url?: string;
    type: 'documentation' | 'project' | 'knowledge_base' | 'external';
    relevanceScore: number;
}

export interface CreateConversationData {
    title: string;
    initialQuery?: string;
    projectId?: string;
    language?: string;
}

export interface SendMessageData {
    query: string;
    conversationId?: string;
    language?: string;
    projectPhase?: string;
    includeProjectContext?: boolean;
    specialization?: string;
}

export interface MessageRating {
    messageId: string;
    rating: number; // 1-5 scale
    feedback?: string;
}

export interface AIAssistantResponse {
    response: string;
    confidenceScore: number;
    sources: string[];
    conversationId: string;
    messageId: string;
    fromAI: boolean;
    suggestedFollowUps?: string[];
    escalationSuggestion?: string;
    metadata: {
        processingTime: number;
        language: string;
        category: string;
        requiresHumanReview?: boolean;
    };
}

// Chat UI State Types
export interface ChatUIState {
    isTyping: boolean;
    typingStage: 'thinking' | 'generating' | 'finalizing';
    typingProgress: number; // 0-100
    typingStartTime: number | null;
    estimatedTime: number | null; // in milliseconds
    typingDelay: number;
    showSuggestions: boolean;
    selectedMessageId?: string;
    scrollToBottom: boolean;
}

// Search and Filter Types
export interface ConversationFilters {
    status?: Conversation['status'];
    projectId?: string;
    dateRange?: {
        start: string;
        end: string;
    };
    searchQuery?: string;
}

export interface MessageFilters {
    type?: Message['type'];
    isBookmarked?: boolean;
    hasRating?: boolean;
    confidenceThreshold?: number;
}