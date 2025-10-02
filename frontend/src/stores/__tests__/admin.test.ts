import { renderHook, act } from '@testing-library/react';
import { jest } from '@jest/globals';
import { useAdminStore } from '../admin';

// Mock fetch
global.fetch = jest.fn();
const mockFetch = fetch as jest.MockedFunction<typeof fetch>;

// Mock localStorage
const mockLocalStorage = {
    getItem: jest.fn(),
    setItem: jest.fn(),
    removeItem: jest.fn(),
};
Object.defineProperty(window, 'localStorage', {
    value: mockLocalStorage,
});

describe('useAdminStore', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mockLocalStorage.getItem.mockReturnValue('mock-token');
    });

    afterEach(() => {
        // Reset store state
        const { result } = renderHook(() => useAdminStore());
        act(() => {
            result.current.clearError();
            result.current.clearSelection();
        });
    });

    describe('User Management', () => {
        it('should fetch users successfully', async () => {
            const mockUsers = [
                {
                    id: '1',
                    email: 'test@example.com',
                    role: 'student',
                    isEmailVerified: true,
                    isActive: true,
                    profile: { firstName: 'John', lastName: 'Doe' },
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockUsers,
            } as Response);

            const { result } = renderHook(() => useAdminStore());

            await act(async () => {
                await result.current.fetchUsers();
            });

            expect(result.current.users).toEqual(mockUsers);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe(null);
        });

        it('should handle fetch users error', async () => {
            mockFetch.mockRejectedValueOnce(new Error('Network error'));

            const { result } = renderHook(() => useAdminStore());

            await act(async () => {
                await result.current.fetchUsers();
            });

            expect(result.current.users).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBe('Network error');
        });

        it('should create user successfully', async () => {
            const newUser = {
                id: '2',
                email: 'new@example.com',
                role: 'student' as const,
                isEmailVerified: true,
                isActive: true,
                profile: { firstName: 'Jane', lastName: 'Smith' },
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => newUser,
            } as Response);

            const { result } = renderHook(() => useAdminStore());

            await act(async () => {
                await result.current.createUser({
                    email: 'new@example.com',
                    role: 'student',
                    profile: { firstName: 'Jane', lastName: 'Smith' },
                });
            });

            expect(result.current.users).toContain(newUser);
            expect(result.current.isLoading).toBe(false);
        });

        it('should update user successfully', async () => {
            const existingUser = {
                id: '1',
                email: 'test@example.com',
                role: 'student' as const,
                isEmailVerified: true,
                isActive: true,
                profile: { firstName: 'John', lastName: 'Doe' },
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            const updatedUser = {
                ...existingUser,
                profile: { ...existingUser.profile, firstName: 'Johnny' },
            };

            const { result } = renderHook(() => useAdminStore());

            // Set initial state
            act(() => {
                result.current.users = [existingUser];
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => updatedUser,
            } as Response);

            await act(async () => {
                await result.current.updateUser('1', {
                    profile: { firstName: 'Johnny' }
                });
            });

            expect(result.current.users[0].profile.firstName).toBe('Johnny');
        });

        it('should delete user successfully', async () => {
            const existingUser = {
                id: '1',
                email: 'test@example.com',
                role: 'student' as const,
                isEmailVerified: true,
                isActive: true,
                profile: { firstName: 'John', lastName: 'Doe' },
                createdAt: '2024-01-01T00:00:00Z',
                updatedAt: '2024-01-01T00:00:00Z',
            };

            const { result } = renderHook(() => useAdminStore());

            // Set initial state
            act(() => {
                result.current.users = [existingUser];
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
            } as Response);

            await act(async () => {
                await result.current.deleteUser('1');
            });

            expect(result.current.users).toHaveLength(0);
        });

        it('should set user filters', () => {
            const { result } = renderHook(() => useAdminStore());

            act(() => {
                result.current.setUserFilters({ role: 'student', status: 'active' });
            });

            expect(result.current.userFilters).toEqual({
                role: 'student',
                status: 'active',
            });
        });

        it('should select users', () => {
            const { result } = renderHook(() => useAdminStore());

            act(() => {
                result.current.selectUsers(['1', '2']);
            });

            expect(result.current.selectedUsers).toEqual(['1', '2']);
        });
    });

    describe('Project Management', () => {
        it('should fetch pending projects successfully', async () => {
            const mockProjects = [
                {
                    id: '1',
                    title: 'Test Project',
                    abstract: 'Test abstract',
                    specialization: 'Software Engineering',
                    difficultyLevel: 'intermediate' as const,
                    year: 2024,
                    tags: ['test'],
                    technologyStack: ['React'],
                    isGroupProject: false,
                    approvalStatus: 'pending' as const,
                    supervisor: {
                        id: '1',
                        name: 'Dr. Test',
                        specializations: ['Software Engineering'],
                    },
                    viewCount: 0,
                    bookmarkCount: 0,
                    createdAt: '2024-01-01T00:00:00Z',
                    updatedAt: '2024-01-01T00:00:00Z',
                },
            ];

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockProjects,
            } as Response);

            const { result } = renderHook(() => useAdminStore());

            await act(async () => {
                await result.current.fetchPendingProjects();
            });

            expect(result.current.pendingProjects).toEqual(mockProjects);
        });

        it('should approve project successfully', async () => {
            const { result } = renderHook(() => useAdminStore());

            // Set initial state
            act(() => {
                result.current.pendingProjects = [
                    {
                        id: '1',
                        title: 'Test Project',
                        abstract: 'Test abstract',
                        specialization: 'Software Engineering',
                        difficultyLevel: 'intermediate' as const,
                        year: 2024,
                        tags: ['test'],
                        technologyStack: ['React'],
                        isGroupProject: false,
                        approvalStatus: 'pending' as const,
                        supervisor: {
                            id: '1',
                            name: 'Dr. Test',
                            specializations: ['Software Engineering'],
                        },
                        viewCount: 0,
                        bookmarkCount: 0,
                        createdAt: '2024-01-01T00:00:00Z',
                        updatedAt: '2024-01-01T00:00:00Z',
                    },
                ];
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
            } as Response);

            await act(async () => {
                await result.current.approveProject('1', 'Good project');
            });

            expect(result.current.pendingProjects).toHaveLength(0);
        });

        it('should reject project successfully', async () => {
            const { result } = renderHook(() => useAdminStore());

            // Set initial state
            act(() => {
                result.current.pendingProjects = [
                    {
                        id: '1',
                        title: 'Test Project',
                        abstract: 'Test abstract',
                        specialization: 'Software Engineering',
                        difficultyLevel: 'intermediate' as const,
                        year: 2024,
                        tags: ['test'],
                        technologyStack: ['React'],
                        isGroupProject: false,
                        approvalStatus: 'pending' as const,
                        supervisor: {
                            id: '1',
                            name: 'Dr. Test',
                            specializations: ['Software Engineering'],
                        },
                        viewCount: 0,
                        bookmarkCount: 0,
                        createdAt: '2024-01-01T00:00:00Z',
                        updatedAt: '2024-01-01T00:00:00Z',
                    },
                ];
            });

            mockFetch.mockResolvedValueOnce({
                ok: true,
            } as Response);

            await act(async () => {
                await result.current.rejectProject('1', 'Needs improvement');
            });

            expect(result.current.pendingProjects).toHaveLength(0);
        });
    });

    describe('System Management', () => {
        it('should fetch system health successfully', async () => {
            const mockHealth = {
                status: 'healthy' as const,
                uptime: 86400,
                memoryUsage: 45.2,
                cpuUsage: 23.1,
                diskUsage: 67.8,
                activeConnections: 150,
                databaseStatus: 'connected' as const,
                redisStatus: 'connected' as const,
                aiServiceStatus: 'operational' as const,
                lastChecked: '2024-01-01T00:00:00Z',
                services: [],
            };

            mockFetch.mockResolvedValueOnce({
                ok: true,
                json: async () => mockHealth,
            } as Response);

            const { result } = renderHook(() => useAdminStore());

            await act(async () => {
                await result.current.fetchSystemHealth();
            });

            expect(result.current.systemHealth).toEqual(mockHealth);
        });

        it('should toggle maintenance mode successfully', async () => {
            mockFetch.mockResolvedValueOnce({
                ok: true,
            } as Response);

            const { result } = renderHook(() => useAdminStore());

            await act(async () => {
                await result.current.toggleMaintenanceMode(true, 'System maintenance');
            });

            expect(result.current.maintenanceMode).toBe(true);
        });
    });

    describe('Utility Functions', () => {
        it('should clear error', () => {
            const { result } = renderHook(() => useAdminStore());

            act(() => {
                result.current.error = 'Test error';
            });

            act(() => {
                result.current.clearError();
            });

            expect(result.current.error).toBe(null);
        });

        it('should clear selection', () => {
            const { result } = renderHook(() => useAdminStore());

            act(() => {
                result.current.selectedUsers = ['1', '2'];
                result.current.selectedProjects = ['1'];
            });

            act(() => {
                result.current.clearSelection();
            });

            expect(result.current.selectedUsers).toEqual([]);
            expect(result.current.selectedProjects).toEqual([]);
        });
    });
});