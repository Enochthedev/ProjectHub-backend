import { renderHook, act } from '@testing-library/react';
import { useMilestoneStore } from '../milestone';
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

describe('useMilestoneStore', () => {
    beforeEach(() => {
        // Reset the store before each test
        useMilestoneStore.getState().resetState();
        jest.clearAllMocks();
    });

    describe('getMilestones', () => {
        it('should load milestones successfully', async () => {
            const mockResponse = {
                milestones: [
                    {
                        id: 'milestone-1',
                        title: 'Test Milestone',
                        description: 'Test description',
                        dueDate: new Date().toISOString(),
                        status: 'not_started',
                        priority: 'medium',
                        progress: 0,
                        studentId: 'student-1',
                        category: 'Development',
                        tags: ['test'],
                        dependencies: [],
                        attachments: [],
                        notes: [],
                        reminders: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    },
                ],
                stats: {
                    total: 1,
                    completed: 0,
                    inProgress: 0,
                    overdue: 0,
                    blocked: 0,
                    completionRate: 0,
                    averageCompletionTime: 0,
                    upcomingDeadlines: [],
                },
            };

            mockApi.get.mockResolvedValueOnce(mockResponse);

            const { result } = renderHook(() => useMilestoneStore());

            await act(async () => {
                await result.current.getMilestones();
            });

            expect(result.current.milestones).toEqual(mockResponse.milestones);
            expect(result.current.milestoneStats).toEqual(mockResponse.stats);
            expect(result.current.isLoading).toBe(false);
        });

        it('should handle API errors gracefully with mock data', async () => {
            mockApi.get.mockRejectedValueOnce(new Error('API Error'));

            const { result } = renderHook(() => useMilestoneStore());

            await act(async () => {
                await result.current.getMilestones();
            });

            // Should still have milestones (mock data)
            expect(result.current.milestones).toBeTruthy();
            expect(result.current.milestones.length).toBeGreaterThan(0);
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('createMilestone', () => {
        it('should create milestone successfully', async () => {
            const newMilestone = {
                id: 'milestone-new',
                title: 'New Milestone',
                description: 'New description',
                dueDate: new Date().toISOString(),
                status: 'not_started' as const,
                priority: 'high' as const,
                progress: 0,
                studentId: 'student-1',
                category: 'Development',
                tags: ['new'],
                dependencies: [],
                attachments: [],
                notes: [],
                reminders: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            mockApi.post.mockResolvedValueOnce(newMilestone);

            const { result } = renderHook(() => useMilestoneStore());

            const createData = {
                title: 'New Milestone',
                description: 'New description',
                dueDate: new Date().toISOString(),
                priority: 'high' as const,
                category: 'Development',
                tags: ['new'],
                dependencies: [],
            };

            await act(async () => {
                await result.current.createMilestone(createData);
            });

            expect(mockApi.post).toHaveBeenCalledWith('/milestones', createData);
            expect(result.current.milestones).toContainEqual(newMilestone);
            expect(result.current.isCreating).toBe(false);
        });

        it('should handle creation errors gracefully', async () => {
            mockApi.post.mockRejectedValueOnce(new Error('API Error'));

            const { result } = renderHook(() => useMilestoneStore());

            const createData = {
                title: 'New Milestone',
                description: 'New description',
                dueDate: new Date().toISOString(),
                priority: 'high' as const,
                category: 'Development',
                tags: ['new'],
                dependencies: [],
            };

            await act(async () => {
                await result.current.createMilestone(createData);
            });

            // Should still create milestone locally
            expect(result.current.milestones.length).toBeGreaterThan(0);
            expect(result.current.isCreating).toBe(false);
        });
    });

    describe('updateMilestone', () => {
        it('should update milestone successfully', async () => {
            const updatedMilestone = {
                id: 'milestone-1',
                title: 'Updated Milestone',
                description: 'Updated description',
                dueDate: new Date().toISOString(),
                status: 'in_progress' as const,
                priority: 'high' as const,
                progress: 50,
                studentId: 'student-1',
                category: 'Development',
                tags: ['updated'],
                dependencies: [],
                attachments: [],
                notes: [],
                reminders: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
            };

            mockApi.patch.mockResolvedValueOnce(updatedMilestone);

            const { result } = renderHook(() => useMilestoneStore());

            // Set initial milestone
            act(() => {
                useMilestoneStore.setState({
                    milestones: [{
                        ...updatedMilestone,
                        title: 'Original Title',
                        status: 'not_started',
                        progress: 0,
                    }],
                });
            });

            await act(async () => {
                await result.current.updateMilestone('milestone-1', {
                    title: 'Updated Milestone',
                    status: 'in_progress',
                    progress: 50,
                });
            });

            expect(result.current.isUpdating).toBe(false);
        });
    });

    describe('deleteMilestone', () => {
        it('should delete milestone successfully', async () => {
            mockApi.delete.mockResolvedValueOnce({});

            const { result } = renderHook(() => useMilestoneStore());

            // Set initial milestone
            act(() => {
                useMilestoneStore.setState({
                    milestones: [{
                        id: 'milestone-1',
                        title: 'Test Milestone',
                        description: 'Test description',
                        dueDate: new Date().toISOString(),
                        status: 'not_started' as const,
                        priority: 'medium' as const,
                        progress: 0,
                        studentId: 'student-1',
                        category: 'Development',
                        tags: [],
                        dependencies: [],
                        attachments: [],
                        notes: [],
                        reminders: [],
                        createdAt: new Date().toISOString(),
                        updatedAt: new Date().toISOString(),
                    }],
                });
            });

            await act(async () => {
                await result.current.deleteMilestone('milestone-1');
            });

            expect(mockApi.delete).toHaveBeenCalledWith('/milestones/milestone-1');
            expect(result.current.milestones).toHaveLength(0);
            expect(result.current.isDeleting).toBe(false);
        });
    });

    describe('getTemplates', () => {
        it('should load templates successfully', async () => {
            const mockTemplates = [
                {
                    id: 'template-1',
                    name: 'Software Development',
                    description: 'Template for software projects',
                    category: 'Development',
                    tags: ['software'],
                    milestones: [],
                    estimatedDuration: 90,
                    difficulty: 'intermediate' as const,
                    usageCount: 10,
                    rating: 4.5,
                    isPublic: true,
                    createdBy: 'system',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                },
            ];

            mockApi.get.mockResolvedValueOnce(mockTemplates);

            const { result } = renderHook(() => useMilestoneStore());

            await act(async () => {
                await result.current.getTemplates();
            });

            expect(result.current.templates).toEqual(mockTemplates);
            expect(result.current.isLoadingTemplates).toBe(false);
        });
    });

    describe('filters and UI state', () => {
        it('should set filters correctly', () => {
            const { result } = renderHook(() => useMilestoneStore());

            act(() => {
                result.current.setFilters({
                    status: ['in_progress'],
                    priority: ['high'],
                });
            });

            expect(result.current.filters.status).toEqual(['in_progress']);
            expect(result.current.filters.priority).toEqual(['high']);
        });

        it('should clear filters correctly', () => {
            const { result } = renderHook(() => useMilestoneStore());

            // Set some filters first
            act(() => {
                result.current.setFilters({
                    status: ['in_progress'],
                    priority: ['high'],
                });
            });

            // Clear filters
            act(() => {
                result.current.clearFilters();
            });

            expect(result.current.filters.status).toEqual([]);
            expect(result.current.filters.priority).toEqual([]);
        });

        it('should set view mode correctly', () => {
            const { result } = renderHook(() => useMilestoneStore());

            act(() => {
                result.current.setViewMode('kanban');
            });

            expect(result.current.viewMode).toBe('kanban');
        });

        it('should toggle show completed correctly', () => {
            const { result } = renderHook(() => useMilestoneStore());

            act(() => {
                result.current.setShowCompleted(true);
            });

            expect(result.current.showCompleted).toBe(true);
        });
    });

    describe('resetState', () => {
        it('should reset all state to initial values', () => {
            const { result } = renderHook(() => useMilestoneStore());

            // Set some state
            act(() => {
                useMilestoneStore.setState({
                    milestones: [{ id: 'test' } as any],
                    error: 'Test error',
                    isLoading: true,
                    viewMode: 'kanban',
                });
            });

            // Reset state
            act(() => {
                result.current.resetState();
            });

            expect(result.current.milestones).toEqual([]);
            expect(result.current.error).toBeNull();
            expect(result.current.isLoading).toBe(false);
            expect(result.current.viewMode).toBe('list');
        });
    });
});