// Project Discovery Components
export { ProjectCard } from './ProjectCard';
export { ProjectFilters } from './ProjectFilters';
export { ProjectGrid } from './ProjectGrid';
export { ProjectSearch } from './ProjectSearch';
export { ProjectDetail } from './ProjectDetail';
export { ProjectDiscovery } from './ProjectDiscovery';

// Re-export types for convenience
export type {
    Project,
    ProjectSearchParams,
    ProjectSearchResponse,
    ProjectFilters as ProjectFiltersType,
    Bookmark,
    BookmarkCategory,
} from '@/types/project';