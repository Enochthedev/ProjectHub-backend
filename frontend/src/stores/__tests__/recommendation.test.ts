import { renderHook, act } from '@testing-library/react';
import { useRecommendationStore } from '../recommendation';
import { api } from '@/lib/api';

// Mock the API
jest.mock('@/lib/api', () => ({
    api: {
        get: jest.fn(),
        post: jest.fn(),
        patch: jest.fn(),
        delete: jest.fn(),
    },
}));

const mockApi = api as jest.Mocked<typeof api>;

describe('useRecommendationStore', () => {
    beforeEach(() => {
        // Reset the store before each test
        useRecommendationStore.getState().resetState();
        jest.clearAllMocks();
    });

    describe('generateRecommendations', () => {
        it('should generate recommendations successfully', async () => {
            const mockRecommendationResult = {
                recommendations: {
                    id: 'rec-1',
                    studentId: 'student-1',
                    projectSuggestions: [
                        {
                            projectId: 'proj-1',
                            title: 'Test Project',
                            abstract: 'Test abstract',
                            specialization: 'Computer Science',
                            difficultyLevel: 'intermediate' as const,
                            similarityScore: 0.9,
                            matchingSkills: ['JavaScript'],
                            matchingInterests: ['AI'],
                            reasoning: 'Good match',
                            supervisor: {
                                id: 'sup-1',
                                name: 'Dr. Test',
                                specialization: 'AI',
                            },
                        },
                    ],
                    reasoning: 'Test reasoning',
                    averageSimilarityScore: 0.9,
                    profileSnapshot: {
                        skills: ['JavaScript'],
                        interests: ['AI'],
                        specializations: ['Computer Science'],
                        profileCompleteness: 80,
                        snapshotDate: new Date(),
                    },
                    status: 'active' as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
                    feedback: [],
                },
                metadata: {
                    totalProjects: 100,
                    processingTime: 1000,
                    algorithm: 'hybrid-similarity-v2',
                    cacheHit: false,
                    fallbackUsed: false,
                },
            };

            mockApi.get.mockResolvedValueOnce(mockRecommendationResult);

            const { result } = renderHook(() => useRecommendationStore());

            await act(async () => {
                await result.current.generateRecommendations({ limit: 5 });
            });

            expect(result.current.currentRecommendations).toEqual(mockRecommendationResult.recommendations);
            expect(result.current.recommendationMetadata).toEqual(mockRecommendationResult.metadata);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('should handle API errors gracefully with mock data', async () => {
            mockApi.get.mockRejectedValueOnce(new Error('API Error'));

            const { result } = renderHook(() => useRecommendationStore());

            await act(async () => {
                await result.current.generateRecommendations();
            });

            // Should still have recommendations (mock data)
            expect(result.current.currentRecommendations).toBeTruthy();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('should set loading state correctly', async () => {
            mockApi.get.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

            const { result } = renderHook(() => useRecommendationStore());

            act(() => {
                result.current.generateRecommendations();
            });

            expect(result.current.isLoading).toBe(true);
        });
    });

    describe('submitFeedback', () => {
        it('should submit feedback successfully', async () => {
            mockApi.post.mockResolvedValueOnce({});

            const { result } = renderHook(() => useRecommendationStore());

            await act(async () => {
                await result.current.submitFeedback('rec-1', 'proj-1', {
                    feedbackType: 'like',
                });
            });

            expect(mockApi.post).toHaveBeenCalledWith(
                '/recommendations/rec-1/feedback?projectId=proj-1',
                { feedbackType: 'like' }
            );
            expect(result.current.feedbackHistory).toHaveLength(1);
            expect(result.current.feedbackHistory[0].feedbackType).toBe('like');
        });

        it('should handle feedback submission errors gracefully', async () => {
            mockApi.post.mockRejectedValueOnce(new Error('API Error'));

            const { result } = renderHook(() => useRecommendationStore());

            await act(async () => {
                await result.current.submitFeedback('rec-1', 'proj-1', {
                    feedbackType: 'like',
                });
            });

            // Should still store feedback locally
            expect(result.current.feedbackHistory).toHaveLength(1);
            expect(result.current.isSubmittingFeedback).toBe(false);
        });
    });

    describe('getExplanation', () => {
        it('should fetch explanation successfully', async () => {
            const mockExplanation = {
                projectId: 'proj-1',
                title: 'Test Project',
                reasoning: 'Test reasoning',
                matchingFactors: {
                    skills: {
                        matched: ['JavaScript'],
                        score: 0.9,
                        explanation: 'Good skill match',
                    },
                    interests: {
                        matched: ['AI'],
                        score: 0.8,
                        explanation: 'Good interest match',
                    },
                    specialization: {
                        match: true,
                        score: 1.0,
                        explanation: 'Perfect specialization match',
                    },
                    difficulty: {
                        appropriate: true,
                        score: 0.85,
                        explanation: 'Appropriate difficulty level',
                    },
                },
                similarProjects: [],
                confidenceScore: 0.9,
            };

            mockApi.get.mockResolvedValueOnce(mockExplanation);

            const { result } = renderHook(() => useRecommendationStore());

            await act(async () => {
                await result.current.getExplanation('rec-1', 'proj-1');
            });

            expect(result.current.explanations['rec-1-proj-1']).toEqual(mockExplanation);
            expect(result.current.isLoadingExplanation).toBe(false);
        });

        it('should handle explanation fetch errors with mock data', async () => {
            mockApi.get.mockRejectedValueOnce(new Error('API Error'));

            const { result } = renderHook(() => useRecommendationStore());

            await act(async () => {
                await result.current.getExplanation('rec-1', 'proj-1');
            });

            // Should have mock explanation
            expect(result.current.explanations['rec-1-proj-1']).toBeTruthy();
            expect(result.current.isLoadingExplanation).toBe(false);
        });
    });

    describe('refreshRecommendations', () => {
        it('should refresh recommendations successfully', async () => {
            const mockRecommendationResult = {
                recommendations: {
                    id: 'rec-2',
                    studentId: 'student-1',
                    projectSuggestions: [],
                    reasoning: 'Refreshed recommendations',
                    averageSimilarityScore: 0.85,
                    profileSnapshot: {
                        skills: [],
                        interests: [],
                        specializations: [],
                        profileCompleteness: 90,
                        snapshotDate: new Date(),
                    },
                    status: 'active' as const,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    expiresAt: null,
                    feedback: [],
                },
                metadata: {
                    totalProjects: 120,
                    processingTime: 800,
                    algorithm: 'hybrid-similarity-v2',
                    cacheHit: false,
                    fallbackUsed: false,
                },
            };

            mockApi.post.mockResolvedValueOnce(mockRecommendationResult);

            const { result } = renderHook(() => useRecommendationStore());

            await act(async () => {
                await result.current.refreshRecommendations();
            });

            expect(result.current.currentRecommendations).toEqual(mockRecommendationResult.recommendations);
            expect(result.current.isRefreshing).toBe(false);
        });
    });

    describe('filters', () => {
        it('should set filters correctly', () => {
            const { result } = renderHook(() => useRecommendationStore());

            act(() => {
                result.current.setFilters({
                    specializations: ['Computer Science'],
                    difficultyLevels: ['intermediate'],
                    minSimilarityScore: 0.8,
                });
            });

            expect(result.current.filters.specializations).toEqual(['Computer Science']);
            expect(result.current.filters.difficultyLevels).toEqual(['intermediate']);
            expect(result.current.filters.minSimilarityScore).toBe(0.8);
        });

        it('should clear filters correctly', () => {
            const { result } = renderHook(() => useRecommendationStore());

            // Set some filters first
            act(() => {
                result.current.setFilters({
                    specializations: ['Computer Science'],
                    minSimilarityScore: 0.8,
                });
            });

            // Clear filters
            act(() => {
                result.current.clearFilters();
            });

            expect(result.current.filters.specializations).toEqual([]);
            expect(result.current.filters.minSimilarityScore).toBe(0);
        });
    });

    describe('UI state management', () => {
        it('should manage explanation modal state', () => {
            const { result } = renderHook(() => useRecommendationStore());

            const mockRecommendation = {
                projectId: 'proj-1',
                title: 'Test Project',
                abstract: 'Test abstract',
                specialization: 'Computer Science',
                difficultyLevel: 'intermediate' as const,
                similarityScore: 0.9,
                matchingSkills: ['JavaScript'],
                matchingInterests: ['AI'],
                reasoning: 'Good match',
                supervisor: {
                    id: 'sup-1',
                    name: 'Dr. Test',
                    specialization: 'AI',
                },
            };

            act(() => {
                result.current.showExplanation(mockRecommendation);
            });

            expect(result.current.selectedRecommendation).toEqual(mockRecommendation);
            expect(result.current.showExplanationModal).toBe(true);

            act(() => {
                result.current.hideExplanation();
            });

            expect(result.current.selectedRecommendation).toBeNull();
            expect(result.current.showExplanationModal).toBe(false);
        });

        it('should clear errors', () => {
            const { result } = renderHook(() => useRecommendationStore());

            // Set an error
            act(() => {
                result.current.resetState();
                // Manually set error for testing
                useRecommendationStore.setState({ error: 'Test error' });
            });

            expect(result.current.error).toBe('Test error');

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBeNull();
        });
    });

    describe('resetState', () => {
        it('should reset all state to initial values', () => {
            const { result } = renderHook(() => useRecommendationStore());

            // Set some state
            act(() => {
                useRecommendationStore.setState({
                    currentRecommendations: {} as any,
                    error: 'Test error',
                    isLoading: true,
                    selectedRecommendation: {} as any,
                });
            });

            // Reset state
            act(() => {
                result.current.resetState();
            });

            expect(result.current.currentRecommendations).toBeNull();
            expect(result.current.error).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.selectedRecommendation).toBeNull();
        });
    });
});