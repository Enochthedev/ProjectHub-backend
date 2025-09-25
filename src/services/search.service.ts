import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { plainToClass } from 'class-transformer';
import { Project } from '../entities/project.entity';
import {
  SearchProjectsDto,
  ProjectSummaryDto,
  PaginatedProjectsDto,
} from '../dto/search';
import { ApprovalStatus, ProjectSortBy, SortOrder } from '../common/enums';
import { FilterService } from './filter.service';
import { SortingService } from './sorting.service';
import {
  SuggestionService,
  AlternativeSearchOptions,
} from './suggestion.service';
import { InputSanitizationService } from '../common/services/input-sanitization.service';

@Injectable()
export class SearchService {
  constructor(
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    private readonly filterService: FilterService,
    private readonly sortingService: SortingService,
    private readonly suggestionService: SuggestionService,
    private readonly inputSanitizationService: InputSanitizationService,
  ) { }

  async searchProjects(
    searchDto: SearchProjectsDto,
  ): Promise<PaginatedProjectsDto> {
    try {
      const queryBuilder = this.createBaseQuery();

      // Apply search query if provided
      if (searchDto.query) {
        this.applyFullTextSearch(queryBuilder, searchDto.query);
      }

      // Apply filters using FilterService
      this.filterService.applySearchFilters(queryBuilder, searchDto);

      // Apply sorting using SortingService
      const sortCriteria = this.sortingService.createSortCriteriaFromSearch(
        searchDto.sortBy,
        searchDto.sortOrder,
        !!searchDto.query,
      );
      this.sortingService.applySorting(queryBuilder, sortCriteria);

      // Get total count for pagination
      const total = await queryBuilder.getCount();

      // Apply pagination
      queryBuilder.limit(searchDto.limit).offset(searchDto.offset);

      // Execute query with raw results to get relevance scores
      let projects: Project[];
      let rawResults: any[] = [];

      if (searchDto.query) {
        // Get both entities and raw data for relevance scores
        const result = await queryBuilder.getRawAndEntities();
        projects = result.entities;
        rawResults = result.raw;
      } else {
        projects = await queryBuilder.getMany();
      }

      // Transform to DTOs with relevance scores
      const projectDtos = projects.map((project, index) => {
        const dto = this.transformToSummaryDto(project, searchDto.query);

        // Add relevance score if available
        if (rawResults[index]?.relevance_score) {
          dto.relevanceScore = parseFloat(rawResults[index].relevance_score);
        }

        return dto;
      });

      // Get suggestions if no results found
      let suggestions: AlternativeSearchOptions | undefined;
      if (total === 0) {
        suggestions =
          await this.suggestionService.getAlternativeSearchSuggestions(
            searchDto,
          );
      }

      return new PaginatedProjectsDto(
        projectDtos,
        total,
        searchDto.limit!,
        searchDto.offset!,
        suggestions,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid search parameters');
    }
  }

  async getProjectById(id: string): Promise<Project | null> {
    if (!this.isValidUuid(id)) {
      throw new BadRequestException('Invalid project ID format');
    }

    return this.projectRepository.findOne({
      where: { id, approvalStatus: ApprovalStatus.APPROVED },
      relations: ['supervisor'],
    });
  }

  async getSuggestedTags(partial: string): Promise<string[]> {
    const suggestions = await this.suggestionService.getSuggestedTags(partial);
    return suggestions.map((suggestion) => suggestion.value);
  }

  /**
   * Get alternative search suggestions when no results are found
   */
  async getAlternativeSearchSuggestions(
    searchDto: SearchProjectsDto,
  ): Promise<AlternativeSearchOptions> {
    return this.suggestionService.getAlternativeSearchSuggestions(searchDto);
  }

  /**
   * Clear all search filters
   */
  clearAllFilters(): SearchProjectsDto {
    return {
      limit: 20,
      offset: 0,
      sortBy: ProjectSortBy.DATE,
      sortOrder: SortOrder.DESC,
    };
  }

  /**
   * Clear specific filter types from search DTO
   */
  clearSpecificFilters(
    searchDto: SearchProjectsDto,
    filterTypes: Array<keyof SearchProjectsDto>,
  ): SearchProjectsDto {
    const clearedSearch = { ...searchDto };

    filterTypes.forEach((filterType) => {
      if (
        filterType !== 'limit' &&
        filterType !== 'offset' &&
        filterType !== 'sortBy' &&
        filterType !== 'sortOrder'
      ) {
        delete clearedSearch[filterType];
      }
    });

    return clearedSearch;
  }

  /**
   * Check if search would return results
   */
  async hasResults(searchDto: SearchProjectsDto): Promise<boolean> {
    return this.suggestionService.hasResults(searchDto);
  }

  async getPopularProjects(limit: number = 10): Promise<ProjectSummaryDto[]> {
    const projects = await this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .leftJoinAndSelect('supervisor.supervisorProfile', 'supervisorProfile')
      .leftJoin('project.views', 'views')
      .leftJoin('project.bookmarks', 'bookmarks')
      .select([
        'project.*',
        'supervisor.id',
        'supervisor.email',
        'supervisorProfile.name',
      ])
      .addSelect('COUNT(DISTINCT views.id)', 'viewCount')
      .addSelect('COUNT(DISTINCT bookmarks.id)', 'bookmarkCount')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      })
      .groupBy('project.id')
      .addGroupBy('supervisor.id')
      .addGroupBy('supervisorProfile.id')
      .orderBy(
        '(COUNT(DISTINCT views.id) + COUNT(DISTINCT bookmarks.id) * 2)',
        'DESC',
      )
      .addOrderBy('project.approvedAt', 'DESC')
      .limit(limit)
      .getRawAndEntities();

    return projects.entities.map((project) =>
      this.transformToSummaryDto(project),
    );
  }

  /**
   * Search projects by approval status (for admin use)
   */
  async searchProjectsByStatus(
    status: ApprovalStatus,
    searchDto: SearchProjectsDto,
    supervisorId?: string,
  ): Promise<PaginatedProjectsDto> {
    try {
      const queryBuilder = this.createBaseQueryWithStatus(status);

      // Apply search query if provided
      if (searchDto.query) {
        this.applyFullTextSearch(queryBuilder, searchDto.query);
      }

      // Apply supervisor filter if provided
      if (supervisorId) {
        queryBuilder.andWhere('project.supervisorId = :supervisorId', {
          supervisorId,
        });
      }

      // Apply filters using FilterService (excluding status filter)
      this.filterService.applySearchFilters(queryBuilder, searchDto);

      // Apply sorting using SortingService
      const sortCriteria = this.sortingService.createSortCriteriaFromSearch(
        searchDto.sortBy,
        searchDto.sortOrder,
        !!searchDto.query,
      );
      this.sortingService.applySorting(queryBuilder, sortCriteria);

      // Get total count for pagination
      const total = await queryBuilder.getCount();

      // Apply pagination
      queryBuilder.limit(searchDto.limit).offset(searchDto.offset);

      // Execute query
      const projects = await queryBuilder.getMany();

      // Transform to DTOs
      const projectDtos = projects.map((project) =>
        this.transformToSummaryDto(project, searchDto.query),
      );

      return new PaginatedProjectsDto(
        projectDtos,
        total,
        searchDto.limit!,
        searchDto.offset!,
      );
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Invalid search parameters');
    }
  }

  private createBaseQuery(): SelectQueryBuilder<Project> {
    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .where('project.approvalStatus = :status', {
        status: ApprovalStatus.APPROVED,
      });
  }

  private createBaseQueryWithStatus(
    status: ApprovalStatus,
  ): SelectQueryBuilder<Project> {
    return this.projectRepository
      .createQueryBuilder('project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .leftJoinAndSelect(
        'project.supervisor.supervisorProfile',
        'supervisorProfile',
      )
      .where('project.approvalStatus = :status', { status });
  }

  private applyFullTextSearch(
    queryBuilder: SelectQueryBuilder<Project>,
    query: string,
  ): void {
    const sanitizedQuery =
      this.inputSanitizationService.sanitizeSearchQuery(query);

    if (!sanitizedQuery) {
      throw new BadRequestException('Invalid search query');
    }

    // Use PostgreSQL full-text search with advanced ranking
    queryBuilder
      .andWhere("project.searchVector @@ plainto_tsquery('english', :query)", {
        query: sanitizedQuery,
      })
      .addSelect(
        `ts_rank_cd(
                    project.searchVector, 
                    plainto_tsquery('english', :query),
                    32
                ) * (
                    CASE 
                        WHEN project.title ILIKE '%' || :query || '%' THEN 2.0
                        WHEN project.abstract ILIKE '%' || :query || '%' THEN 1.5
                        ELSE 1.0
                    END
                )`,
        'relevance_score',
      );
  }

  private isValidUuid(uuid: string): boolean {
    const uuidRegex =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  private transformToSummaryDto(
    project: Project,
    searchQuery?: string,
  ): ProjectSummaryDto {
    const dto = plainToClass(ProjectSummaryDto, project, {
      excludeExtraneousValues: true,
    });

    // Add highlighting if search query is provided
    if (searchQuery) {
      dto.highlightedTitle = this.highlightSearchTerms(
        project.title,
        searchQuery,
      );
      dto.highlightedAbstract = this.highlightSearchTerms(
        project.abstract.substring(0, 200),
        searchQuery,
      );
    }

    return dto;
  }

  private highlightSearchTerms(text: string, searchQuery: string): string {
    if (!text || !searchQuery) {
      return text;
    }

    const sanitizedQuery =
      this.inputSanitizationService.sanitizeSearchQuery(searchQuery);
    const terms = sanitizedQuery.split(/\s+/).filter((term) => term.length > 1);

    let highlightedText = text;

    // Sort terms by length (longest first) to avoid partial replacements
    terms.sort((a, b) => b.length - a.length);

    terms.forEach((term) => {
      // Use word boundaries for better matching
      const regex = new RegExp(`\\b(${this.escapeRegExp(term)})\\b`, 'gi');
      highlightedText = highlightedText.replace(regex, '<mark>$1</mark>');
    });

    return highlightedText;
  }

  private escapeRegExp(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}
