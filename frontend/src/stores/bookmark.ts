import { create } from 'zustand';
import { devtools } from 'zustand/middleware';
import {
    Bookmark,
    BookmarkCategory,
    CreateBookmarkData,
    UpdateBookmarkData,
    Project
} from '@/types/project';
import { bookmarkApi } from '@/lib/project-api';

interface BookmarkFilters {
    categoryId: string | null;
    searchQuery: string;
    hasNotes: boolean | null;
    difficultyLevels: ('beginner' | 'intermediate' | 'advanced')[];
    specializations: string[];
    tags: string[];
    supervisorIds: string[];
    dateRange: {
        from: Date | null;
        to: Date | null;
    } | null;
}

interface BookmarkState {
    // Bookmarks State
    bookmarks: Bookmark[];
    categories: BookmarkCategory[];
    selectedCategory: string | null;
    filters: BookmarkFilters;

    // Comparison State
    comparisonProjects: Project[];
    maxComparisonItems: number;

    // UI State
    isLoading: boolean;
    isCreatingCategory: boolean;
    error: string | null;

    // Bulk Operations State
    selectedBookmarks: string[];
    isBulkOperationInProgress: boolean;

    // Actions - Bookmarks
    fetchBookmarks: () => Promise<void>;
    createBookmark: (data: CreateBookmarkData) => Promise<void>;
    updateBookmark: (id: string, data: UpdateBookmarkData) => Promise<void>;
    deleteBookmark: (id: string) => Promise<void>;
    isProjectBookmarked: (projectId: string) => boolean;
    toggleBookmark: (project: Project, categoryId?: string) => Promise<void>;

    // Actions - Categories
    fetchCategories: () => Promise<void>;
    createCategory: (name: string, description?: string) => Promise<void>;
    updateCategory: (id: string, name: string, description?: string) => Promise<void>;
    deleteCategory: (id: string) => Promise<void>;
    setSelectedCategory: (categoryId: string | null) => void;

    // Actions - Filters
    setFilters: (filters: Partial<BookmarkFilters>) => void;
    clearFilters: () => void;
    setSearchQuery: (query: string) => void;

    // Actions - Comparison
    addToComparison: (project: Project) => void;
    removeFromComparison: (projectId: string) => void;
    clearComparison: () => void;
    isInComparison: (projectId: string) => boolean;

    // Actions - Bulk Operations
    toggleBookmarkSelection: (bookmarkId: string) => void;
    selectAllBookmarks: () => void;
    clearSelection: () => void;
    bulkDeleteBookmarks: () => Promise<void>;
    bulkMoveToCategory: (categoryId: string) => Promise<void>;

    // Actions - UI
    setLoading: (loading: boolean) => void;
    setError: (error: string | null) => void;
    clearError: () => void;
}

export const useBookmarkStore = create<BookmarkState>()(
    devtools(
        (set, get) => ({
            // Initial State - Ensure all arrays are properly initialized
            bookmarks: [] as Bookmark[],
            categories: [] as BookmarkCategory[],
            selectedCategory: null,
            filters: {
                categoryId: null,
                searchQuery: '',
                hasNotes: null,
                difficultyLevels: [],
                specializations: [],
                tags: [],
                supervisorIds: [],
                dateRange: null
            },
            comparisonProjects: [] as Project[],
            maxComparisonItems: 3,
            isLoading: false,
            isCreatingCategory: false,
            error: null,
            selectedBookmarks: [] as string[],
            isBulkOperationInProgress: false,

            // Bookmark Actions
            fetchBookmarks: async () => {
                try {
                    set({ isLoading: true, error: null });
                    const bookmarks = await bookmarkApi.getBookmarks();
                    set({ bookmarks: bookmarks || [], isLoading: false });
                } catch (error) {
                    set({
                        bookmarks: [], // Ensure bookmarks is always an array
                        error: error instanceof Error ? error.message : 'Failed to fetch bookmarks',
                        isLoading: false
                    });
                }
            },

            createBookmark: async (data: CreateBookmarkData) => {
                try {
                    set({ error: null });
                    const bookmark = await bookmarkApi.createBookmark(data);
                    set((state) => ({
                        bookmarks: [...state.bookmarks, bookmark]
                    }));
                } catch (error) {
                    set({ error: error instanceof Error ? error.message : 'Failed to create bookmark' });
                    throw error;
                }
            },

            updateBookmark: async (id: string, data: UpdateBookmarkData) => {
                try {
                    set({ error: null });
                    const updatedBookmark = await bookmarkApi.updateBookmark(id, data);
                    set((state) => ({
                        bookmarks: state.bookmarks.map(bookmark =>
                            bookmark.id === id ? updatedBookmark : bookmark
                        )
                    }));
                } catch (error) {
                    set({ error: error instanceof Error ? error.message : 'Failed to update bookmark' });
                    throw error;
                }
            },

            deleteBookmark: async (id: string) => {
                try {
                    set({ error: null });
                    await bookmarkApi.deleteBookmark(id);
                    set((state) => ({
                        bookmarks: state.bookmarks.filter(bookmark => bookmark.id !== id),
                        selectedBookmarks: state.selectedBookmarks.filter(selectedId => selectedId !== id)
                    }));
                } catch (error) {
                    set({ error: error instanceof Error ? error.message : 'Failed to delete bookmark' });
                    throw error;
                }
            },

            isProjectBookmarked: (projectId: string) => {
                const { bookmarks } = get();
                return bookmarks.some(bookmark => bookmark.projectId === projectId);
            },

            toggleBookmark: async (project: Project, categoryId?: string) => {
                const { bookmarks, createBookmark, deleteBookmark } = get();
                const existingBookmark = bookmarks.find(b => b.projectId === project.id);

                if (existingBookmark) {
                    await deleteBookmark(existingBookmark.id);
                } else {
                    await createBookmark({
                        projectId: project.id,
                        ...(categoryId && { categoryId })
                    });
                }
            },

            // Category Actions
            fetchCategories: async () => {
                try {
                    set({ error: null });
                    const categories = await bookmarkApi.getCategories();
                    set({ categories: categories || [] });
                } catch (error) {
                    set({
                        categories: [], // Ensure categories is always an array
                        error: error instanceof Error ? error.message : 'Failed to fetch categories'
                    });
                }
            },

            createCategory: async (name: string, description?: string) => {
                try {
                    set({ isCreatingCategory: true, error: null });
                    const category = await bookmarkApi.createCategory(name, description);
                    set((state) => ({
                        categories: [...state.categories, category],
                        isCreatingCategory: false
                    }));
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to create category',
                        isCreatingCategory: false
                    });
                    throw error;
                }
            },

            updateCategory: async (id: string, name: string, description?: string) => {
                try {
                    set({ error: null });
                    const updatedCategory = await bookmarkApi.updateCategory(id, name, description);
                    set((state) => ({
                        categories: state.categories.map(category =>
                            category.id === id ? updatedCategory : category
                        )
                    }));
                } catch (error) {
                    set({ error: error instanceof Error ? error.message : 'Failed to update category' });
                    throw error;
                }
            },

            deleteCategory: async (id: string) => {
                try {
                    set({ error: null });
                    await bookmarkApi.deleteCategory(id);
                    set((state) => ({
                        categories: state.categories.filter(category => category.id !== id),
                        selectedCategory: state.selectedCategory === id ? null : state.selectedCategory
                    }));
                } catch (error) {
                    set({ error: error instanceof Error ? error.message : 'Failed to delete category' });
                    throw error;
                }
            },

            setSelectedCategory: (categoryId: string | null) => {
                set({ selectedCategory: categoryId });
            },

            // Comparison Actions
            addToComparison: (project: Project) => {
                set((state) => {
                    if (state.comparisonProjects.length >= state.maxComparisonItems) {
                        return {
                            error: `You can only compare up to ${state.maxComparisonItems} projects at once`
                        };
                    }

                    if (state.comparisonProjects.some(p => p.id === project.id)) {
                        return state; // Already in comparison
                    }

                    return {
                        comparisonProjects: [...state.comparisonProjects, project],
                        error: null
                    };
                });
            },

            removeFromComparison: (projectId: string) => {
                set((state) => ({
                    comparisonProjects: state.comparisonProjects.filter(p => p.id !== projectId)
                }));
            },

            clearComparison: () => {
                set({ comparisonProjects: [] });
            },

            isInComparison: (projectId: string) => {
                const { comparisonProjects } = get();
                return comparisonProjects.some(p => p.id === projectId);
            },

            // Bulk Operations Actions
            toggleBookmarkSelection: (bookmarkId: string) => {
                set((state) => ({
                    selectedBookmarks: state.selectedBookmarks.includes(bookmarkId)
                        ? state.selectedBookmarks.filter(id => id !== bookmarkId)
                        : [...state.selectedBookmarks, bookmarkId]
                }));
            },

            selectAllBookmarks: () => {
                set((state) => ({
                    selectedBookmarks: state.bookmarks.map(b => b.id)
                }));
            },

            clearSelection: () => {
                set({ selectedBookmarks: [] });
            },

            bulkDeleteBookmarks: async () => {
                const { selectedBookmarks, deleteBookmark } = get();
                if (selectedBookmarks.length === 0) return;

                try {
                    set({ isBulkOperationInProgress: true, error: null });

                    // Delete bookmarks in parallel
                    await Promise.all(
                        selectedBookmarks.map(id => deleteBookmark(id))
                    );

                    set({
                        selectedBookmarks: [],
                        isBulkOperationInProgress: false
                    });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to delete bookmarks',
                        isBulkOperationInProgress: false
                    });
                    throw error;
                }
            },

            bulkMoveToCategory: async (categoryId: string) => {
                const { selectedBookmarks, updateBookmark } = get();
                if (selectedBookmarks.length === 0) return;

                try {
                    set({ isBulkOperationInProgress: true, error: null });

                    // Update bookmarks in parallel
                    await Promise.all(
                        selectedBookmarks.map(id => updateBookmark(id, { categoryId }))
                    );

                    set({
                        selectedBookmarks: [],
                        isBulkOperationInProgress: false
                    });
                } catch (error) {
                    set({
                        error: error instanceof Error ? error.message : 'Failed to move bookmarks',
                        isBulkOperationInProgress: false
                    });
                    throw error;
                }
            },

            // UI Actions
            setLoading: (loading: boolean) => {
                set({ isLoading: loading });
            },

            setError: (error: string | null) => {
                set({ error });
            },

            clearError: () => {
                set({ error: null });
            },

            // Filter Actions
            setFilters: (filters: Partial<BookmarkFilters>) => {
                set((state) => ({
                    filters: { ...state.filters, ...filters }
                }));
            },

            clearFilters: () => {
                set({
                    filters: {
                        categoryId: null,
                        searchQuery: '',
                        hasNotes: null,
                        difficultyLevels: [],
                        specializations: [],
                        tags: [],
                        supervisorIds: [],
                        dateRange: null
                    },
                    selectedCategory: null
                });
            },

            setSearchQuery: (query: string) => {
                set((state) => ({
                    filters: { ...state.filters, searchQuery: query }
                }));
            },
        }),
        {
            name: 'bookmark-store',
        }
    )
);

// Selectors for computed values
export const useFilteredBookmarks = (): Bookmark[] => {
    const bookmarks = useBookmarkStore(state => state.bookmarks);
    const filters = useBookmarkStore(state => state.filters);
    const selectedCategory = useBookmarkStore(state => state.selectedCategory);

    // Ensure we always have an array
    const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];

    return safeBookmarks.filter(bookmark => {
        // Category filter (legacy support)
        if (selectedCategory && bookmark.category?.id !== selectedCategory) {
            return false;
        }

        // New filters system
        if (filters.categoryId && bookmark.category?.id !== filters.categoryId) {
            return false;
        }

        // Search query filter
        if (filters.searchQuery) {
            const query = filters.searchQuery.toLowerCase();
            const matchesTitle = bookmark.project.title.toLowerCase().includes(query);
            const matchesAbstract = bookmark.project.abstract.toLowerCase().includes(query);
            const matchesNotes = bookmark.notes?.toLowerCase().includes(query) || false;
            const matchesTags = bookmark.project.tags.some(tag =>
                tag.toLowerCase().includes(query)
            );
            const matchesTech = bookmark.project.technologyStack.some(tech =>
                tech.toLowerCase().includes(query)
            );

            if (!matchesTitle && !matchesAbstract && !matchesNotes && !matchesTags && !matchesTech) {
                return false;
            }
        }

        // Has notes filter
        if (filters.hasNotes !== null) {
            const hasNotes = Boolean(bookmark.notes && bookmark.notes.trim().length > 0);
            if (filters.hasNotes !== hasNotes) {
                return false;
            }
        }

        // Difficulty levels filter
        if (filters.difficultyLevels.length > 0) {
            if (!filters.difficultyLevels.includes(bookmark.project.difficultyLevel)) {
                return false;
            }
        }

        // Specializations filter
        if (filters.specializations.length > 0) {
            if (!filters.specializations.includes(bookmark.project.specialization)) {
                return false;
            }
        }

        // Tags filter
        if (filters.tags.length > 0) {
            const hasMatchingTag = filters.tags.some(tag =>
                bookmark.project.tags.includes(tag)
            );
            if (!hasMatchingTag) {
                return false;
            }
        }

        // Supervisor filter
        if (filters.supervisorIds.length > 0) {
            if (!filters.supervisorIds.includes(bookmark.project.supervisor.id)) {
                return false;
            }
        }

        // Date range filter
        if (filters.dateRange && (filters.dateRange.from || filters.dateRange.to)) {
            const bookmarkDate = new Date(bookmark.createdAt);

            if (filters.dateRange.from && bookmarkDate < filters.dateRange.from) {
                return false;
            }

            if (filters.dateRange.to && bookmarkDate > filters.dateRange.to) {
                return false;
            }
        }

        return true;
    });
};

export const useBookmarksByCategory = (): Record<string, Bookmark[]> => {
    const bookmarks = useBookmarkStore(state => state.bookmarks);
    const safeBookmarks = Array.isArray(bookmarks) ? bookmarks : [];

    return safeBookmarks.reduce((acc, bookmark) => {
        const categoryId = bookmark.category?.id || 'uncategorized';
        if (!acc[categoryId]) {
            acc[categoryId] = [];
        }
        acc[categoryId].push(bookmark);
        return acc;
    }, {} as Record<string, Bookmark[]>);
};

export const useComparisonCount = (): number => {
    const comparisonProjects = useBookmarkStore(state => state.comparisonProjects);
    const safeProjects = Array.isArray(comparisonProjects) ? comparisonProjects : [];
    return safeProjects.length;
};

export const useCanAddToComparison = (): boolean => {
    const comparisonProjects = useBookmarkStore(state => state.comparisonProjects);
    const maxComparisonItems = useBookmarkStore(state => state.maxComparisonItems);

    const safeProjects = Array.isArray(comparisonProjects) ? comparisonProjects : [];
    const safeMaxItems = typeof maxComparisonItems === 'number' ? maxComparisonItems : 3;

    return safeProjects.length < safeMaxItems;
};

export const useHasActiveFilters = (): boolean => {
    const filters = useBookmarkStore(state => state.filters);
    const selectedCategory = useBookmarkStore(state => state.selectedCategory);

    return (
        selectedCategory !== null ||
        filters.categoryId !== null ||
        filters.searchQuery !== '' ||
        filters.hasNotes !== null ||
        filters.difficultyLevels.length > 0 ||
        filters.specializations.length > 0 ||
        filters.tags.length > 0 ||
        filters.supervisorIds.length > 0 ||
        filters.dateRange !== null
    );
};