export interface ConversationContext {
  projectId?: string;
  projectPhase?: string;
  specialization?: string;
  recentTopics?: string[];
  keyTerms?: string[];
  conversationSummary?: string;
  lastActivity?: Date;
  preferences?: {
    language?: string;
    responseStyle?: string;
    detailLevel?: 'brief' | 'detailed' | 'comprehensive';
  };
}

export interface MessageMetadata {
  processingTime?: number;
  aiModel?: string;
  language?: string;
  category?: string;
  keywords?: string[];
  relatedTopics?: string[];
  requiresHumanReview?: boolean;
  originalQuery?: string;
  translatedFrom?: string;
  contextUsed?: {
    projectInfo?: boolean;
    conversationHistory?: boolean;
    knowledgeBase?: boolean;
  };
  bookmarkNote?: string;
  bookmarkedAt?: Date;
}
