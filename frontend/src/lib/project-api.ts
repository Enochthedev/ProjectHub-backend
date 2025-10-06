import { api } from './api';
import {
    Project,
    ProjectSearchParams,
    ProjectSearchResponse,
    CreateProjectData,
    UpdateProjectData,
    Bookmark,
    BookmarkCategory,
    CreateBookmarkData,
    UpdateBookmarkData
} from '@/types/project';

// Project API endpoints
export const projectApi = {
    // Search and discovery
    searchProjects: async (params: ProjectSearchParams): Promise<ProjectSearchResponse> => {
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            if (value !== undefined && value !== null && value !== '') {
                if (Array.isArray(value)) {
                    value.forEach(item => searchParams.append(key, item.toString()));
                } else {
                    searchParams.append(key, value.toString());
                }
            }
        });

        return api.get<ProjectSearchResponse>(`/projects?${searchParams.toString()}`);
    },

    // Get popular/featured projects
    getPopularProjects: async (limit = 6): Promise<Project[]> => {
        return api.get<Project[]>(`/projects/popular?limit=${limit}`);
    },

    // Get project by ID
    getProject: async (id: string): Promise<Project> => {
        return api.get<Project>(`/projects/${id}`);
    },

    // Get related projects
    getRelatedProjects: async (id: string, limit = 6): Promise<Project[]> => {
        return api.get<Project[]>(`/projects/${id}/suggestions?limit=${limit}`);
    },

    // Create project (supervisor/admin only)
    createProject: async (data: CreateProjectData): Promise<Project> => {
        return api.post<Project>('/projects', data);
    },

    // Update project (supervisor/admin only)
    updateProject: async (id: string, data: UpdateProjectData): Promise<Project> => {
        return api.patch<Project>(`/projects/${id}`, data);
    },

    // Delete project (supervisor/admin only)
    deleteProject: async (id: string): Promise<void> => {
        return api.delete<void>(`/projects/${id}`);
    },

    // Get supervisor's projects
    getSupervisorProjects: async (): Promise<Project[]> => {
        return api.get<Project[]>('/projects/my-projects');
    },

    // Increment view count
    incrementViewCount: async (id: string): Promise<void> => {
        return api.post<void>(`/projects/${id}/view`);
    },
};

// Bookmark API endpoints
export const bookmarkApi = {
    // Get user's bookmarks
    getBookmarks: async (): Promise<Bookmark[]> => {
        return api.get<Bookmark[]>('/bookmarks');
    },

    // Create bookmark
    createBookmark: async (data: CreateBookmarkData): Promise<Bookmark> => {
        return api.post<Bookmark>('/bookmarks', data);
    },

    // Update bookmark
    updateBookmark: async (id: string, data: UpdateBookmarkData): Promise<Bookmark> => {
        return api.patch<Bookmark>(`/bookmarks/${id}`, data);
    },

    // Delete bookmark
    deleteBookmark: async (id: string): Promise<void> => {
        return api.delete<void>(`/bookmarks/${id}`);
    },

    // Check if project is bookmarked
    isBookmarked: async (projectId: string): Promise<boolean> => {
        try {
            await api.get<Bookmark>(`/bookmarks/project/${projectId}`);
            return true;
        } catch (error) {
            return false;
        }
    },

    // Get bookmark categories
    getCategories: async (): Promise<BookmarkCategory[]> => {
        return api.get<BookmarkCategory[]>('/bookmarks/categories');
    },

    // Create bookmark category
    createCategory: async (name: string, description?: string): Promise<BookmarkCategory> => {
        return api.post<BookmarkCategory>('/bookmarks/categories', { name, description });
    },

    // Update bookmark category
    updateCategory: async (id: string, name: string, description?: string): Promise<BookmarkCategory> => {
        return api.patch<BookmarkCategory>(`/bookmarks/categories/${id}`, { name, description });
    },

    // Delete bookmark category
    deleteCategory: async (id: string): Promise<void> => {
        return api.delete<void>(`/bookmarks/categories/${id}`);
    },
};