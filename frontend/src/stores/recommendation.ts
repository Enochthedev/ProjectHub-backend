import { create } from 'zustand';
import { devtools, persist, createJSONStorage } from 'zustand/middleware';
import {
    Recommendation,
    RecommendationResult,
    RecommendationFeedback,
    RecommendationExplanation,
    RecommendationHistory,
    RecommendationFilters,
    GenerateRecommendationsParams,
    CreateRecommendationFeedbackData,
    RecommendationProgressUpdate,
    ProjectRecommendation,
} from '@/types/recommendation';
import { api } from '@/lib/api';
import { API_ENDPOINTS } from '@/lib/constants';

interface RecommendationState {
    // Current Recommendations
    currentRecommendations: Recommendation | null;
    recommendationMetadata: RecommendationResult['metadata'] | null;

    // History
    recommendationHistory: Recommendation[];
    historyTotal: number;
    historyHasMore: boolean;

    // Filters
    filters: RecommendationFilters;

    // Feedback
    feedbackHistory: RecommendationFeedback[];

    // Explanations
    explanations: Record<string, RecommendationExplanation>;

    // Progress Tracking
    progressUpdates: Record<string, RecommendationProgressUpdate>;
    activeRequestId: string | null;

    // UI State
    isLoading: boolean;
    isRefreshing: boolean;
    isLoadingHistory: boolean;
    isSubmittingFeedback: boolean;
    isLoadingExplanation: boolean;
    error: string | null;

    // Selected items for UI
    selectedRecommendation: ProjectRecommendation | null;
    showExplanationModal: boolean;

    // Actions - Generate Recommendations
    generateRecommendations: (params?: GenerateRecommendationsParams) => Promise<void>;
    refreshRecommendations: () => Promise<void>;
    generateWithProgress: (params?: GenerateRecommendationsParams) => Promise<string>;
    getProgress: (requestId: string) => Promise<void>;

    // Actions - History
    getRecommendationHistory: () => Promise<void>;
    loadMoreHistory: () => Promise<void>;

    // Actions - Feedback
    submitFeedback: (
        recommendationId: string,
        projectId: string,
        feedback: CreateRecommendationFeedbackData
    ) => Promise<void>;
    getFeedbackHistory: () => Promise<void>;

    // Actions - Explanations
    getExplanation: (recommendationId: string, projectId: string) => Promise<void>;
    showExplanation: (recommendation: ProjectRecommendation) => void;
    hideExplanation: () => void;

    // Actions - Filters
    setFilters: (filters: Partial<RecommendationFilters>) => void;
    clearFilters: () => void;

    // Actions - UI
    setSelectedRecommendation: (recommendation: ProjectRecommendation | null) => void;
    clearError: () => void;
    resetState: () => void;
}

const initialFilters: RecommendationFilters = {
    specializations: [],
    difficultyLevels: [],
    minSimilarityScore: 0,
    dateRange: null,
    hasPositiveFeedback: null,
};

export const useRecommendationStore = create<RecommendationState>()(
    devtools(
        persist(
            (set, get) => ({
                // Initial State
                currentRecommendations: null,
                recommendationMetadata: null,
                recommendationHistory: [],
                historyTotal: 0,
                historyHasMore: false,
                filters: initialFilters,
                feedbackHistory: [],
                explanations: {},
                progressUpdates: {},
                activeRequestId: null,
                isLoading: false,
                isRefreshing: false,
                isLoadingHistory: false,
                isSubmittingFeedback: false,
                isLoadingExplanation: false,
                error: null,
                selectedRecommendation: null,
                showExplanationModal: false,

                // Generate Recommendations Actions
                generateRecommendations: async (params?: GenerateRecommendationsParams) => {
                    try {
                        set({ isLoading: true, error: null });

                        // Build query parameters
                        const queryParams = new URLSearchParams();
                        if (params?.limit) queryParams.append('limit', params.limit.toString());
                        if (params?.excludeSpecializations?.length) {
                            params.excludeSpecializations.forEach(spec =>
                                queryParams.append('excludeSpecializations', spec)
                            );
                        }
                        if (params?.includeSpecializations?.length) {
                            params.includeSpecializations.forEach(spec =>
                                queryParams.append('includeSpecializations', spec)
                            );
                        }
                        if (params?.maxDifficulty) queryParams.append('maxDifficulty', params.maxDifficulty);
                        if (params?.forceRefresh) queryParams.append('forceRefresh', 'true');
                        if (params?.minSimilarityScore) {
                            queryParams.append('minSimilarityScore', params.minSimilarityScore.toString());
                        }
                        if (params?.includeDiversityBoost) queryParams.append('includeDiversityBoost', 'true');

                        const url = `${API_ENDPOINTS.RECOMMENDATIONS.BASE}?${queryParams.toString()}`;

                        try {
                            const result = await api.get<RecommendationResult>(url);

                            set({
                                currentRecommendations: result.recommendations,
                                recommendationMetadata: result.metadata,
                                isLoading: false,
                            });
                        } catch (apiError) {
                            console.warn('API not available, using mock recommendations:', apiError);

                            // Mock recommendation data
                            const mockRecommendation: Recommendation = {
                                id: `rec-${Date.now()}`,
                                studentId: 'student-1',
                                projectSuggestions: [
                                    {
                                        projectId: 'proj-1',
                                        title: 'AI-Powered Learning Management System',
                                        abstract: 'Develop an intelligent LMS that adapts to student learning patterns using machine learning algorithms.',
                                        specialization: 'Computer Science',
                                        difficultyLevel: 'intermediate',
                                        similarityScore: 0.92,
                                        matchingSkills: ['JavaScript', 'Python', 'Machine Learning'],
                                        matchingInterests: ['AI', 'Education Technology'],
                                        reasoning: 'This project matches your interests in AI and education, and aligns with your JavaScript and Python skills.',
                                        supervisor: {
                                            id: 'sup-1',
                                            name: 'Dr. Sarah Johnson',
                                            specialization: 'Artificial Intelligence',
                                        },
                                        diversityBoost: 0.1,
                                    },
                                    {
                                        projectId: 'proj-2',
                                        title: 'Blockchain-Based Supply Chain Tracker',
                                        abstract: 'Create a transparent supply chain tracking system using blockchain technology.',
                                        specialization: 'Computer Science',
                                        difficultyLevel: 'advanced',
                                        similarityScore: 0.87,
                                        matchingSkills: ['JavaScript', 'Node.js', 'Cryptography'],
                                        matchingInterests: ['Blockchain', 'Security'],
                                        reasoning: 'Your strong programming background and interest in emerging technologies make this a great fit.',
                                        supervisor: {
                                            id: 'sup-2',
                                            name: 'Prof. Michael Chen',
                                            specialization: 'Distributed Systems',
                                        },
                                    },
                                    {
                                        projectId: 'proj-3',
                                        title: 'Mobile Health Monitoring App',
                                        abstract: 'Develop a mobile application for real-time health monitoring using IoT sensors.',
                                        specialization: 'Computer Science',
                                        difficultyLevel: 'intermediate',
                                        similarityScore: 0.84,
                                        matchingSkills: ['React Native', 'IoT', 'Data Analysis'],
                                        matchingInterests: ['Healthcare Technology', 'Mobile Development'],
                                        reasoning: 'Combines your mobile development skills with your interest in healthcare applications.',
                                        supervisor: {
                                            id: 'sup-3',
                                            name: 'Dr. Emily Rodriguez',
                                            specialization: 'Health Informatics',
                                        },
                                    },
                                ],
                                reasoning: 'These recommendations are based on your profile showing strong programming skills, interest in emerging technologies, and preference for intermediate to advanced projects.',
                                averageSimilarityScore: 0.88,
                                profileSnapshot: {
                                    skills: ['JavaScript', 'Python', 'React', 'Node.js'],
                                    interests: ['AI', 'Blockchain', 'Healthcare Technology'],
                                    specializations: ['Computer Science'],
                                    preferredDifficulty: 'intermediate',
                                    profileCompleteness: 85,
                                    snapshotDate: new Date(),
                                },
                                status: 'active',
                                createdAt: new Date().toISOString(),
                                updatedAt: new Date().toISOString(),
                                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
                                feedback: [],
                            };

                            const mockMetadata = {
                                totalProjects: 150,
                                processingTime: 1200,
                                algorithm: 'hybrid-similarity-v2',
                                cacheHit: false,
                                fallbackUsed: true,
                            };

                            set({
                                currentRecommendations: mockRecommendation,
                                recommendationMetadata: mockMetadata,
                                isLoading: false,
                            });
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to generate recommendations';
                        set({ error: errorMessage, isLoading: false });
                        throw error;
                    }
                },

                refreshRecommendations: async () => {
                    try {
                        set({ isRefreshing: true, error: null });

                        try {
                            const result = await api.post<RecommendationResult>(API_ENDPOINTS.RECOMMENDATIONS.REFRESH);

                            set({
                                currentRecommendations: result.recommendations,
                                recommendationMetadata: result.metadata,
                                isRefreshing: false,
                            });
                        } catch (apiError) {
                            console.warn('API not available, refreshing with mock data:', apiError);

                            // Force refresh with mock data
                            await get().generateRecommendations({ forceRefresh: true });
                            set({ isRefreshing: false });
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to refresh recommendations';
                        set({ error: errorMessage, isRefreshing: false });
                        throw error;
                    }
                },

                generateWithProgress: async (params?: GenerateRecommendationsParams) => {
                    try {
                        set({ isLoading: true, error: null });

                        try {
                            const response = await api.post<{ requestId: string; message: string }>(
                                `${API_ENDPOINTS.RECOMMENDATIONS.BASE}/generate-with-progress`,
                                params || {}
                            );

                            set({
                                activeRequestId: response.requestId,
                                isLoading: false,
                            });

                            return response.requestId;
                        } catch (apiError) {
                            console.warn('API not available, using mock progress:', apiError);

                            const mockRequestId = `req-${Date.now()}`;
                            set({
                                activeRequestId: mockRequestId,
                                isLoading: false,
                            });

                            // Simulate progress updates
                            setTimeout(() => {
                                const mockProgress: RecommendationProgressUpdate = {
                                    requestId: mockRequestId,
                                    progress: {
                                        stage: 'analyzing_profile',
                                        percentage: 25,
                                        message: 'Analyzing your profile and preferences...',
                                        estimatedTimeRemaining: 15000,
                                    },
                                    queueStatus: {
                                        position: 1,
                                        totalInQueue: 3,
                                    },
                                    systemLoad: {
                                        cpuUsage: 45,
                                        memoryUsage: 62,
                                        activeRequests: 8,
                                    },
                                };

                                set(state => ({
                                    progressUpdates: {
                                        ...state.progressUpdates,
                                        [mockRequestId]: mockProgress,
                                    },
                                }));
                            }, 1000);

                            return mockRequestId;
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to start recommendation generation';
                        set({ error: errorMessage, isLoading: false });
                        throw error;
                    }
                },

                getProgress: async (requestId: string) => {
                    try {
                        try {
                            const progress = await api.get<RecommendationProgressUpdate>(
                                `${API_ENDPOINTS.RECOMMENDATIONS.PROGRESS}/${requestId}`
                            );

                            set(state => ({
                                progressUpdates: {
                                    ...state.progressUpdates,
                                    [requestId]: progress,
                                },
                            }));
                        } catch (apiError) {
                            console.warn('API not available, using mock progress:', apiError);

                            // Mock progress update
                            const mockProgress: RecommendationProgressUpdate = {
                                requestId,
                                progress: {
                                    stage: 'finalizing',
                                    percentage: 90,
                                    message: 'Finalizing recommendations...',
                                    estimatedTimeRemaining: 2000,
                                },
                                queueStatus: {
                                    position: 0,
                                    totalInQueue: 2,
                                },
                                systemLoad: {
                                    cpuUsage: 38,
                                    memoryUsage: 58,
                                    activeRequests: 5,
                                },
                            };

                            set(state => ({
                                progressUpdates: {
                                    ...state.progressUpdates,
                                    [requestId]: mockProgress,
                                },
                            }));
                        }
                    } catch (error) {
                        console.error('Failed to get progress:', error);
                    }
                },

                // History Actions
                getRecommendationHistory: async () => {
                    try {
                        set({ isLoadingHistory: true, error: null });

                        try {
                            const history = await api.get<RecommendationHistory>(API_ENDPOINTS.RECOMMENDATIONS.HISTORY);

                            set({
                                recommendationHistory: history.recommendations,
                                historyTotal: history.total,
                                historyHasMore: history.hasMore,
                                isLoadingHistory: false,
                            });
                        } catch (apiError) {
                            console.warn('API not available, using mock history:', apiError);

                            // Mock history data
                            const mockHistory: Recommendation[] = [
                                {
                                    id: 'rec-old-1',
                                    studentId: 'student-1',
                                    projectSuggestions: [],
                                    reasoning: 'Previous recommendations based on earlier profile',
                                    averageSimilarityScore: 0.82,
                                    profileSnapshot: {
                                        skills: ['JavaScript', 'Python'],
                                        interests: ['Web Development'],
                                        specializations: ['Computer Science'],
                                        profileCompleteness: 70,
                                        snapshotDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
                                    },
                                    status: 'expired',
                                    createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                                    updatedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
                                    expiresAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
                                    feedback: [],
                                },
                            ];

                            set({
                                recommendationHistory: mockHistory,
                                historyTotal: 1,
                                historyHasMore: false,
                                isLoadingHistory: false,
                            });
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to load recommendation history';
                        set({ error: errorMessage, isLoadingHistory: false });
                        throw error;
                    }
                },

                loadMoreHistory: async () => {
                    const { historyHasMore, isLoadingHistory, recommendationHistory } = get();

                    if (!historyHasMore || isLoadingHistory) return;

                    try {
                        set({ isLoadingHistory: true, error: null });

                        const offset = recommendationHistory.length;
                        const history = await api.get<RecommendationHistory>(
                            `${API_ENDPOINTS.RECOMMENDATIONS.HISTORY}?offset=${offset}`
                        );

                        set(state => ({
                            recommendationHistory: [...state.recommendationHistory, ...history.recommendations],
                            historyHasMore: history.hasMore,
                            isLoadingHistory: false,
                        }));
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to load more history';
                        set({ error: errorMessage, isLoadingHistory: false });
                        throw error;
                    }
                },

                // Feedback Actions
                submitFeedback: async (
                    recommendationId: string,
                    projectId: string,
                    feedback: CreateRecommendationFeedbackData
                ) => {
                    try {
                        set({ isSubmittingFeedback: true, error: null });

                        try {
                            await api.post(
                                `${API_ENDPOINTS.RECOMMENDATIONS.BASE}/${recommendationId}/feedback?projectId=${projectId}`,
                                feedback
                            );

                            // Update local state with feedback
                            const newFeedback: RecommendationFeedback = {
                                id: `feedback-${Date.now()}`,
                                recommendationId,
                                projectId,
                                feedbackType: feedback.feedbackType,
                                rating: feedback.rating || null,
                                comment: feedback.comment || null,
                                createdAt: new Date().toISOString(),
                            };

                            set(state => ({
                                feedbackHistory: [newFeedback, ...state.feedbackHistory],
                                currentRecommendations: state.currentRecommendations ? {
                                    ...state.currentRecommendations,
                                    feedback: [...state.currentRecommendations.feedback, newFeedback],
                                } : null,
                                isSubmittingFeedback: false,
                            }));
                        } catch (apiError) {
                            console.warn('API not available, storing feedback locally:', apiError);

                            // Store feedback locally
                            const newFeedback: RecommendationFeedback = {
                                id: `feedback-${Date.now()}`,
                                recommendationId,
                                projectId,
                                feedbackType: feedback.feedbackType,
                                rating: feedback.rating || null,
                                comment: feedback.comment || null,
                                createdAt: new Date().toISOString(),
                            };

                            set(state => ({
                                feedbackHistory: [newFeedback, ...state.feedbackHistory],
                                isSubmittingFeedback: false,
                            }));
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to submit feedback';
                        set({ error: errorMessage, isSubmittingFeedback: false });
                        throw error;
                    }
                },

                getFeedbackHistory: async () => {
                    try {
                        const feedback = await api.get<RecommendationFeedback[]>(
                            `${API_ENDPOINTS.RECOMMENDATIONS.FEEDBACK}/history`
                        );

                        set({ feedbackHistory: feedback });
                    } catch (error) {
                        console.warn('Failed to load feedback history:', error);
                    }
                },

                // Explanation Actions
                getExplanation: async (recommendationId: string, projectId: string) => {
                    try {
                        set({ isLoadingExplanation: true, error: null });

                        try {
                            const explanation = await api.get<RecommendationExplanation>(
                                `${API_ENDPOINTS.RECOMMENDATIONS.BASE}/${recommendationId}/explanation?projectId=${projectId}`
                            );

                            set(state => ({
                                explanations: {
                                    ...state.explanations,
                                    [`${recommendationId}-${projectId}`]: explanation,
                                },
                                isLoadingExplanation: false,
                            }));
                        } catch (apiError) {
                            console.warn('API not available, using mock explanation:', apiError);

                            // Mock explanation
                            const mockExplanation: RecommendationExplanation = {
                                projectId,
                                title: 'AI-Powered Learning Management System',
                                reasoning: 'This project is recommended because it aligns perfectly with your technical skills and career interests.',
                                matchingFactors: {
                                    skills: {
                                        matched: ['JavaScript', 'Python', 'Machine Learning'],
                                        score: 0.92,
                                        explanation: 'Your proficiency in JavaScript and Python, combined with your machine learning knowledge, makes you well-suited for this project.',
                                    },
                                    interests: {
                                        matched: ['AI', 'Education Technology'],
                                        score: 0.89,
                                        explanation: 'Your expressed interest in AI and educational technology directly aligns with this project\'s focus.',
                                    },
                                    specialization: {
                                        match: true,
                                        score: 1.0,
                                        explanation: 'This project falls within your Computer Science specialization.',
                                    },
                                    difficulty: {
                                        appropriate: true,
                                        score: 0.85,
                                        explanation: 'The intermediate difficulty level matches your current skill level and learning goals.',
                                    },
                                },
                                similarProjects: [
                                    {
                                        id: 'proj-similar-1',
                                        title: 'Adaptive Learning Platform',
                                        similarityScore: 0.87,
                                    },
                                    {
                                        id: 'proj-similar-2',
                                        title: 'Educational AI Chatbot',
                                        similarityScore: 0.82,
                                    },
                                ],
                                confidenceScore: 0.91,
                                diversityFactors: [
                                    {
                                        reason: 'Introduces new domain knowledge in education',
                                        boost: 0.1,
                                    },
                                ],
                            };

                            set(state => ({
                                explanations: {
                                    ...state.explanations,
                                    [`${recommendationId}-${projectId}`]: mockExplanation,
                                },
                                isLoadingExplanation: false,
                            }));
                        }
                    } catch (error) {
                        const errorMessage = error instanceof Error ? error.message : 'Failed to load explanation';
                        set({ error: errorMessage, isLoadingExplanation: false });
                        throw error;
                    }
                },

                showExplanation: (recommendation: ProjectRecommendation) => {
                    set({
                        selectedRecommendation: recommendation,
                        showExplanationModal: true,
                    });
                },

                hideExplanation: () => {
                    set({
                        selectedRecommendation: null,
                        showExplanationModal: false,
                    });
                },

                // Filter Actions
                setFilters: (filters: Partial<RecommendationFilters>) => {
                    set(state => ({
                        filters: { ...state.filters, ...filters },
                    }));
                },

                clearFilters: () => {
                    set({ filters: initialFilters });
                },

                // UI Actions
                setSelectedRecommendation: (recommendation: ProjectRecommendation | null) => {
                    set({ selectedRecommendation: recommendation });
                },

                clearError: () => {
                    set({ error: null });
                },

                resetState: () => {
                    set({
                        currentRecommendations: null,
                        recommendationMetadata: null,
                        recommendationHistory: [],
                        historyTotal: 0,
                        historyHasMore: false,
                        filters: initialFilters,
                        feedbackHistory: [],
                        explanations: {},
                        progressUpdates: {},
                        activeRequestId: null,
                        isLoading: false,
                        isRefreshing: false,
                        isLoadingHistory: false,
                        isSubmittingFeedback: false,
                        isLoadingExplanation: false,
                        error: null,
                        selectedRecommendation: null,
                        showExplanationModal: false,
                    });
                },
            }),
            {
                name: 'recommendation-store',
                storage: createJSONStorage(() => localStorage),
                partialize: (state) => ({
                    currentRecommendations: state.currentRecommendations,
                    recommendationMetadata: state.recommendationMetadata,
                    feedbackHistory: state.feedbackHistory,
                    filters: state.filters,
                }),
            }
        ),
        {
            name: 'recommendation-store',
        }
    )
);

// Selectors for computed values
export const useFilteredRecommendations = (): ProjectRecommendation[] => {
    const currentRecommendations = useRecommendationStore(state => state.currentRecommendations);
    const filters = useRecommendationStore(state => state.filters);

    if (!currentRecommendations?.projectSuggestions) return [];

    return currentRecommendations.projectSuggestions.filter(project => {
        // Specialization filter
        if (filters.specializations.length > 0) {
            if (!filters.specializations.includes(project.specialization)) {
                return false;
            }
        }

        // Difficulty filter
        if (filters.difficultyLevels.length > 0) {
            if (!filters.difficultyLevels.includes(project.difficultyLevel)) {
                return false;
            }
        }

        // Minimum similarity score filter
        if (project.similarityScore < filters.minSimilarityScore) {
            return false;
        }

        return true;
    });
};

export const useRecommendationStats = () => {
    const currentRecommendations = useRecommendationStore(state => state.currentRecommendations);
    const feedbackHistory = useRecommendationStore(state => state.feedbackHistory);

    if (!currentRecommendations) {
        return {
            totalRecommendations: 0,
            averageScore: 0,
            feedbackCount: 0,
            positiveFeedbackCount: 0,
        };
    }

    const totalRecommendations = currentRecommendations.projectSuggestions.length;
    const averageScore = currentRecommendations.averageSimilarityScore;
    const feedbackCount = feedbackHistory.length;
    const positiveFeedbackCount = feedbackHistory.filter(
        f => f.feedbackType === 'like' || f.feedbackType === 'bookmark' || (f.rating && f.rating >= 4)
    ).length;

    return {
        totalRecommendations,
        averageScore,
        feedbackCount,
        positiveFeedbackCount,
    };
};