import React, { useCallback, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectApi, bookmarkApi } from '@/lib/project-api';
import {
    ProjectSearchParams,
    CreateProjectData,
    UpdateProjectData,
    CreateBookmarkData,
    UpdateBookmarkData
} from '@/types/project';
import { useProjectStore } from '@/stores/project';
import { useDebounce } from './useDebounce';

// Query keys
export const projectKeys = {
    all: ['projects'] as const,
    search: (params: ProjectSearchParams) => [...projectKeys.all, 'search', params] as const,
    popular: (limit?: number) => [...projectKeys.all, 'popular', limit] as const,
    detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
    related: (id: string, limit?: number) => [...projectKeys.all, 'related', id, limit] as const,
    supervisor: () => [...projectKeys.all, 'supervisor'] as const,
};

export const bookmarkKeys = {
    all: ['bookmarks'] as const,
    list: () => [...bookmarkKeys.all, 'list'] as const,
    categories: () => [...bookmarkKeys.all, 'categories'] as const,
    isBookmarked: (projectId: string) => [...bookmarkKeys.all, 'isBookmarked', projectId] as const,
};

// Project search hook with debouncing
export const useProjectSearch = () => {
    const { searchParams, setSearching, setSearchError } = useProjectStore();

    // Debounce search query to avoid too many API calls
    const debouncedQuery = useDebounce(searchParams.query || '', 300);

    const debouncedParams = useMemo(() => ({
        ...searchParams,
        query: debouncedQuery,
    }), [searchParams, debouncedQuery]);

    const query = useQuery({
        queryKey: projectKeys.search(debouncedParams),
        queryFn: () => projectApi.searchProjects(debouncedParams),
        enabled: true,
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 10 * 60 * 1000, // 10 minutes
    });

    // Update store state based on query status
    React.useEffect(() => {
        setSearching(query.isLoading);
        setSearchError(query.error?.message || null);
    }, [query.isLoading, query.error, setSearching, setSearchError]);

    return {
        ...query,
        searchParams: debouncedParams,
    };
};

// Popular projects hook
export const usePopularProjects = (limit = 6) => {
    return useQuery({
        queryKey: projectKeys.popular(limit),
        queryFn: () => projectApi.getPopularProjects(limit),
        staleTime: 10 * 60 * 1000, // 10 minutes
        gcTime: 30 * 60 * 1000, // 30 minutes
    });
};

// Project detail hook
export const useProject = (id: string) => {
    const { setCurrentProject } = useProjectStore();

    const query = useQuery({
        queryKey: projectKeys.detail(id),
        queryFn: () => projectApi.getProject(id),
        enabled: !!id,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Update store when project data changes
    React.useEffect(() => {
        if (query.data) {
            setCurrentProject(query.data);
        }
    }, [query.data, setCurrentProject]);

    return query;
};

// Related projects hook
export const useRelatedProjects = (id: string, limit = 6) => {
    const { setRelatedProjects } = useProjectStore();

    const query = useQuery({
        queryKey: projectKeys.related(id, limit),
        queryFn: () => projectApi.getRelatedProjects(id, limit),
        enabled: !!id,
        staleTime: 10 * 60 * 1000, // 10 minutes
    });

    // Update store when related projects data changes
    React.useEffect(() => {
        if (query.data) {
            setRelatedProjects(query.data);
        }
    }, [query.data, setRelatedProjects]);

    return query;
};

// Supervisor projects hook
export const useSupervisorProjects = () => {
    const { setSupervisorProjects } = useProjectStore();

    const query = useQuery({
        queryKey: projectKeys.supervisor(),
        queryFn: () => projectApi.getSupervisorProjects(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    // Update store when supervisor projects data changes
    React.useEffect(() => {
        if (query.data) {
            setSupervisorProjects(query.data);
        }
    }, [query.data, setSupervisorProjects]);

    return query;
};

// Project mutations
export const useCreateProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateProjectData) => projectApi.createProject(data),
        onSuccess: () => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: projectKeys.supervisor() });
            queryClient.invalidateQueries({ queryKey: projectKeys.popular() });
        },
    });
};

export const useUpdateProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateProjectData }) =>
            projectApi.updateProject(id, data),
        onSuccess: (updatedProject) => {
            // Update specific project in cache
            queryClient.setQueryData(projectKeys.detail(updatedProject.id), updatedProject);

            // Invalidate related queries
            queryClient.invalidateQueries({ queryKey: projectKeys.supervisor() });
            queryClient.invalidateQueries({ queryKey: projectKeys.search({}) });
        },
    });
};

export const useDeleteProject = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => projectApi.deleteProject(id),
        onSuccess: () => {
            // Invalidate relevant queries
            queryClient.invalidateQueries({ queryKey: projectKeys.supervisor() });
            queryClient.invalidateQueries({ queryKey: projectKeys.search({}) });
            queryClient.invalidateQueries({ queryKey: projectKeys.popular() });
        },
    });
};

// Bookmark hooks
export const useBookmarks = () => {
    return useQuery({
        queryKey: bookmarkKeys.list(),
        queryFn: () => bookmarkApi.getBookmarks(),
        staleTime: 5 * 60 * 1000, // 5 minutes
    });
};

export const useIsBookmarked = (projectId: string) => {
    return useQuery({
        queryKey: bookmarkKeys.isBookmarked(projectId),
        queryFn: () => bookmarkApi.isBookmarked(projectId),
        enabled: !!projectId,
        staleTime: 1 * 60 * 1000, // 1 minute
    });
};

export const useBookmarkCategories = () => {
    return useQuery({
        queryKey: bookmarkKeys.categories(),
        queryFn: () => bookmarkApi.getCategories(),
        staleTime: 10 * 60 * 1000, // 10 minutes
    });
};

// Bookmark mutations
export const useCreateBookmark = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (data: CreateBookmarkData) => bookmarkApi.createBookmark(data),
        onSuccess: (bookmark) => {
            // Update bookmarks list
            queryClient.invalidateQueries({ queryKey: bookmarkKeys.list() });

            // Update isBookmarked status
            queryClient.setQueryData(
                bookmarkKeys.isBookmarked(bookmark.projectId),
                true
            );
        },
    });
};

export const useDeleteBookmark = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => bookmarkApi.deleteBookmark(id),
        onSuccess: (_, deletedId) => {
            // Update bookmarks list
            queryClient.invalidateQueries({ queryKey: bookmarkKeys.list() });

            // We need to find the project ID to update isBookmarked status
            // This could be improved by returning the deleted bookmark data
            queryClient.invalidateQueries({ queryKey: bookmarkKeys.isBookmarked('') });
        },
    });
};

export const useUpdateBookmark = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ id, data }: { id: string; data: UpdateBookmarkData }) =>
            bookmarkApi.updateBookmark(id, data),
        onSuccess: () => {
            // Update bookmarks list
            queryClient.invalidateQueries({ queryKey: bookmarkKeys.list() });
        },
    });
};

// View count mutation
export const useIncrementViewCount = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (id: string) => projectApi.incrementViewCount(id),
        onSuccess: (_, projectId) => {
            // Optionally update the project in cache to reflect new view count
            // This would require the API to return the updated project
            queryClient.invalidateQueries({ queryKey: projectKeys.detail(projectId) });
        },
    });
};