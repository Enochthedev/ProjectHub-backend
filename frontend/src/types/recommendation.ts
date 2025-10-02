// Recommendation Types
export interface ProjectRecommendation {
    projectId: string;
    title: string;
    abstract: string;
    specialization: string;
    difficultyLevel: 'beginner' | 'intermediate' | 'advanced';
    similarityScore: number;
    matchingSkills: string[];
    matchingInterests: string[];
    reasoning: string;
    supervisor: {
        id: string;
        name: string;
        specialization: string;
    };
    diversityBoost?: number;
}

export interface StudentProfileSnapshot {
    skills: string[];
    interests: string[];
    specializations: string[];
    preferredDifficulty?: string;
    careerGoals?: string;
    profileCompleteness: number;
    snapshotDate: Date;
}

export interface Recommendation {
    id: string;
    studentId: string;
    projectSuggestions: ProjectRecommendation[];
    reasoning: string;
    averageSimilarityScore: number;
    profileSnapshot: StudentProfileSnapshot;
    status: 'active' | 'expired' | 'archived';
    createdAt: string;
    updatedAt: string;
    expiresAt: string | null;
    feedback: RecommendationFeedback[];
}

export interface RecommendationFeedback {
    id: string;
    recommendationId: string;
    projectId: string;
    feedbackType: 'like' | 'dislike' | 'rating' | 'bookmark' | 'not_interested';
    rating: number | null;
    comment: string | null;
    createdAt: string;
}

export interface RecommendationExplanation {
    projectId: string;
    title: string;
    reasoning: string;
    matchingFactors: {
        skills: {
            matched: string[];
            score: number;
            explanation: string;
        };
        interests: {
            matched: string[];
            score: number;
            explanation: string;
        };
        specialization: {
            match: boolean;
            score: number;
            explanation: string;
        };
        difficulty: {
            appropriate: boolean;
            score: number;
            explanation: string;
        };
    };
    similarProjects: {
        id: string;
        title: string;
        similarityScore: number;
    }[];
    confidenceScore: number;
    diversityFactors?: {
        reason: string;
        boost: number;
    }[];
}

export interface GenerateRecommendationsParams {
    limit?: number;
    excludeSpecializations?: string[];
    includeSpecializations?: string[];
    maxDifficulty?: 'beginner' | 'intermediate' | 'advanced';
    forceRefresh?: boolean;
    minSimilarityScore?: number;
    includeDiversityBoost?: boolean;
}

export interface RecommendationResult {
    recommendations: Recommendation;
    metadata: {
        totalProjects: number;
        processingTime: number;
        algorithm: string;
        cacheHit: boolean;
        fallbackUsed: boolean;
    };
}

export interface RecommendationFilters {
    specializations: string[];
    difficultyLevels: ('beginner' | 'intermediate' | 'advanced')[];
    minSimilarityScore: number;
    dateRange: {
        from: Date | null;
        to: Date | null;
    } | null;
    hasPositiveFeedback: boolean | null;
}

export interface RecommendationHistory {
    recommendations: Recommendation[];
    total: number;
    hasMore: boolean;
}

// API Request/Response types
export interface CreateRecommendationFeedbackData {
    feedbackType: 'like' | 'dislike' | 'rating' | 'bookmark' | 'not_interested';
    rating?: number;
    comment?: string;
}

export interface RecommendationProgressUpdate {
    requestId: string;
    progress: {
        stage: 'analyzing_profile' | 'finding_matches' | 'calculating_scores' | 'finalizing';
        percentage: number;
        message: string;
        estimatedTimeRemaining?: number;
    };
    queueStatus: {
        position: number;
        totalInQueue: number;
    };
    systemLoad: {
        cpuUsage: number;
        memoryUsage: number;
        activeRequests: number;
    };
}