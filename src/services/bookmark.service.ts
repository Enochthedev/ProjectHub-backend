import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ProjectBookmark } from '../entities/project-bookmark.entity';
import { Project } from '../entities/project.entity';
import { BookmarkCategory } from '../entities/bookmark-category.entity';
import {
  CreateBookmarkDto,
  BookmarkResponseDto,
  PaginatedBookmarksDto,
  BookmarkQueryDto,
  CompareProjectsDto,
  ProjectComparisonDto,
  ComparisonField,
  CreateBookmarkCategoryDto,
  UpdateBookmarkCategoryDto,
  BookmarkCategoryDto,
  AssignBookmarkCategoryDto,
  ExportBookmarksDto,
  BookmarkExportData,
  ExportFormat,
} from '../dto/bookmark';
import { ProjectSummaryDto } from '../dto/search/project-summary.dto';
import { ProjectDetailDto } from '../dto/project/project-detail.dto';
import { ApprovalStatus } from '../common/enums';

@Injectable()
export class BookmarkService {
  constructor(
    @InjectRepository(ProjectBookmark)
    private readonly bookmarkRepository: Repository<ProjectBookmark>,
    @InjectRepository(Project)
    private readonly projectRepository: Repository<Project>,
    @InjectRepository(BookmarkCategory)
    private readonly categoryRepository: Repository<BookmarkCategory>,
  ) { }

  async createBookmark(
    studentId: string,
    createBookmarkDto: CreateBookmarkDto,
  ): Promise<BookmarkResponseDto> {
    const { projectId } = createBookmarkDto;

    // Check if project exists and is approved
    const project = await this.projectRepository.findOne({
      where: {
        id: projectId,
        approvalStatus: ApprovalStatus.APPROVED,
      },
      relations: ['supervisor', 'supervisor.supervisorProfile'],
    });

    if (!project) {
      throw new NotFoundException('Project not found or not approved');
    }

    // Check if bookmark already exists
    const existingBookmark = await this.bookmarkRepository.findOne({
      where: {
        studentId,
        projectId,
      },
    });

    if (existingBookmark) {
      throw new ConflictException('Project is already bookmarked');
    }

    // Create new bookmark
    const bookmark = this.bookmarkRepository.create({
      studentId,
      projectId,
    });

    const savedBookmark = await this.bookmarkRepository.save(bookmark);

    return this.mapToBookmarkResponse(savedBookmark, project);
  }

  async removeBookmark(studentId: string, bookmarkId: string): Promise<void> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: {
        id: bookmarkId,
        studentId,
      },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.bookmarkRepository.remove(bookmark);
  }

  async removeBookmarkByProjectId(
    studentId: string,
    projectId: string,
  ): Promise<void> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: {
        studentId,
        projectId,
      },
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    await this.bookmarkRepository.remove(bookmark);
  }

  async getUserBookmarks(
    studentId: string,
    query: BookmarkQueryDto,
  ): Promise<PaginatedBookmarksDto> {
    const { page = 1, limit = 20 } = query;
    const offset = (page - 1) * limit;

    const [bookmarks, total] = await this.bookmarkRepository.findAndCount({
      where: { studentId },
      relations: [
        'project',
        'project.supervisor',
        'project.supervisor.supervisorProfile',
      ],
      order: { createdAt: 'DESC' },
      skip: offset,
      take: limit,
    });

    const bookmarkResponses = bookmarks.map((bookmark) =>
      this.mapToBookmarkResponse(bookmark, bookmark.project),
    );

    return {
      bookmarks: bookmarkResponses,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  async isProjectBookmarked(
    studentId: string,
    projectId: string,
  ): Promise<boolean> {
    const bookmark = await this.bookmarkRepository.findOne({
      where: {
        studentId,
        projectId,
      },
    });

    return !!bookmark;
  }

  async getBookmarkCount(projectId: string): Promise<number> {
    return this.bookmarkRepository.count({
      where: { projectId },
    });
  }

  async getUserBookmarkIds(studentId: string): Promise<string[]> {
    const bookmarks = await this.bookmarkRepository.find({
      where: { studentId },
      select: ['projectId'],
    });

    return bookmarks.map((bookmark) => bookmark.projectId);
  }

  // Project Comparison Methods
  async compareBookmarkedProjects(
    studentId: string,
    compareDto: CompareProjectsDto,
  ): Promise<ProjectComparisonDto> {
    const { projectIds } = compareDto;

    // Verify all projects are bookmarked by the student
    const bookmarks = await this.bookmarkRepository.find({
      where: {
        studentId,
        projectId: In(projectIds),
      },
      relations: [
        'project',
        'project.supervisor',
        'project.supervisor.supervisorProfile',
      ],
    });

    if (bookmarks.length !== projectIds.length) {
      throw new NotFoundException(
        'One or more projects are not bookmarked by the user',
      );
    }

    const projects = bookmarks.map((bookmark) =>
      this.mapToProjectDetail(bookmark.project),
    );
    const comparisonMatrix = this.buildComparisonMatrix(projects);

    return {
      projects,
      comparisonMatrix,
    };
  }

  // Category Management Methods
  async createCategory(
    studentId: string,
    createCategoryDto: CreateBookmarkCategoryDto,
  ): Promise<BookmarkCategoryDto> {
    // Check if category name already exists for this student
    const existingCategory = await this.categoryRepository.findOne({
      where: {
        studentId,
        name: createCategoryDto.name,
      },
    });

    if (existingCategory) {
      throw new ConflictException('Category with this name already exists');
    }

    const category = this.categoryRepository.create({
      ...createCategoryDto,
      studentId,
    });

    const savedCategory = await this.categoryRepository.save(category);
    return this.mapToCategoryDto(savedCategory, 0);
  }

  async updateCategory(
    studentId: string,
    categoryId: string,
    updateCategoryDto: UpdateBookmarkCategoryDto,
  ): Promise<BookmarkCategoryDto> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, studentId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Check name uniqueness if name is being updated
    if (updateCategoryDto.name && updateCategoryDto.name !== category.name) {
      const existingCategory = await this.categoryRepository.findOne({
        where: {
          studentId,
          name: updateCategoryDto.name,
        },
      });

      if (existingCategory) {
        throw new ConflictException('Category with this name already exists');
      }
    }

    Object.assign(category, updateCategoryDto);
    const updatedCategory = await this.categoryRepository.save(category);

    const bookmarkCount = await this.bookmarkRepository.count({
      where: { categoryId: category.id },
    });

    return this.mapToCategoryDto(updatedCategory, bookmarkCount);
  }

  async deleteCategory(studentId: string, categoryId: string): Promise<void> {
    const category = await this.categoryRepository.findOne({
      where: { id: categoryId, studentId },
    });

    if (!category) {
      throw new NotFoundException('Category not found');
    }

    // Remove category from all bookmarks
    await this.bookmarkRepository.update({ categoryId }, { categoryId: null });

    await this.categoryRepository.remove(category);
  }

  async getUserCategories(studentId: string): Promise<BookmarkCategoryDto[]> {
    const categories = await this.categoryRepository.find({
      where: { studentId },
      order: { name: 'ASC' },
    });

    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const bookmarkCount = await this.bookmarkRepository.count({
          where: { categoryId: category.id },
        });
        return this.mapToCategoryDto(category, bookmarkCount);
      }),
    );

    return categoriesWithCounts;
  }

  async assignBookmarkToCategory(
    studentId: string,
    assignDto: AssignBookmarkCategoryDto,
  ): Promise<BookmarkResponseDto> {
    const { bookmarkId, categoryId } = assignDto;

    const bookmark = await this.bookmarkRepository.findOne({
      where: { id: bookmarkId, studentId },
      relations: [
        'project',
        'project.supervisor',
        'project.supervisor.supervisorProfile',
      ],
    });

    if (!bookmark) {
      throw new NotFoundException('Bookmark not found');
    }

    // Verify category exists and belongs to student (if categoryId is provided)
    if (categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: categoryId, studentId },
      });

      if (!category) {
        throw new NotFoundException('Category not found');
      }
    }

    bookmark.categoryId = categoryId || null;
    const updatedBookmark = await this.bookmarkRepository.save(bookmark);

    return this.mapToBookmarkResponse(updatedBookmark, bookmark.project);
  }

  // Export Methods
  async exportBookmarks(
    studentId: string,
    exportDto: ExportBookmarksDto,
  ): Promise<BookmarkExportData> {
    const { format, fromDate, toDate, categoryId } = exportDto;

    const queryBuilder = this.bookmarkRepository
      .createQueryBuilder('bookmark')
      .leftJoinAndSelect('bookmark.project', 'project')
      .leftJoinAndSelect('project.supervisor', 'supervisor')
      .leftJoinAndSelect('supervisor.supervisorProfile', 'supervisorProfile')
      .leftJoinAndSelect('bookmark.category', 'category')
      .where('bookmark.studentId = :studentId', { studentId });

    if (fromDate) {
      queryBuilder.andWhere('bookmark.createdAt >= :fromDate', { fromDate });
    }

    if (toDate) {
      queryBuilder.andWhere('bookmark.createdAt <= :toDate', { toDate });
    }

    if (categoryId) {
      queryBuilder.andWhere('bookmark.categoryId = :categoryId', {
        categoryId,
      });
    }

    const bookmarks = await queryBuilder
      .orderBy('bookmark.createdAt', 'DESC')
      .getMany();

    const exportData: BookmarkExportData = {
      bookmarks: bookmarks.map((bookmark) => ({
        id: bookmark.id,
        projectId: bookmark.projectId,
        projectTitle: bookmark.project.title,
        projectAbstract: bookmark.project.abstract,
        specialization: bookmark.project.specialization,
        difficultyLevel: bookmark.project.difficultyLevel,
        year: bookmark.project.year,
        tags: bookmark.project.tags,
        technologyStack: bookmark.project.technologyStack,
        supervisorName:
          bookmark.project.supervisor.supervisorProfile?.name || 'Unknown',
        supervisorEmail: bookmark.project.supervisor.email,
        categoryName: bookmark.category?.name,
        bookmarkedAt: bookmark.createdAt,
      })),
      exportedAt: new Date(),
      totalCount: bookmarks.length,
      filters: {
        fromDate,
        toDate,
        categoryId,
      },
    };

    return exportData;
  }

  // Private helper methods
  private buildComparisonMatrix(
    projects: ProjectDetailDto[],
  ): ComparisonField[] {
    const fields: ComparisonField[] = [
      {
        field: 'title',
        label: 'Title',
        values: {},
      },
      {
        field: 'specialization',
        label: 'Specialization',
        values: {},
      },
      {
        field: 'difficultyLevel',
        label: 'Difficulty Level',
        values: {},
      },
      {
        field: 'year',
        label: 'Year',
        values: {},
      },
      {
        field: 'technologyStack',
        label: 'Technology Stack',
        values: {},
      },
      {
        field: 'tags',
        label: 'Tags',
        values: {},
      },
      {
        field: 'isGroupProject',
        label: 'Group Project',
        values: {},
      },
      {
        field: 'supervisor',
        label: 'Supervisor',
        values: {},
      },
    ];

    projects.forEach((project) => {
      fields.forEach((field) => {
        switch (field.field) {
          case 'supervisor':
            field.values[project.id] =
              (project.supervisor?.firstName + ' ' + project.supervisor?.lastName).trim() ||
              project.supervisor?.email || 'Unknown';
            break;
          case 'technologyStack':
          case 'tags':
            field.values[project.id] = project[field.field].join(', ');
            break;
          case 'isGroupProject':
            field.values[project.id] = project.isGroupProject ? 'Yes' : 'No';
            break;
          default:
            field.values[project.id] = project[field.field];
        }
      });
    });

    return fields;
  }

  private mapToProjectDetail(project: Project): ProjectDetailDto {
    return {
      id: project.id,
      title: project.title,
      abstract: project.abstract,
      specialization: project.specialization,
      difficultyLevel: project.difficultyLevel,
      year: project.year,
      tags: project.tags,
      technologyStack: project.technologyStack,
      isGroupProject: project.isGroupProject,
      approvalStatus: project.approvalStatus,
      githubUrl: project.githubUrl,
      demoUrl: project.demoUrl,
      notes: project.notes,
      supervisor: {
        id: project.supervisor.id,
        firstName:
          project.supervisor.supervisorProfile?.name?.split(' ')[0] || '',
        lastName:
          project.supervisor.supervisorProfile?.name
            ?.split(' ')
            .slice(1)
            .join(' ') || '',
        email: project.supervisor.email,
        specializations:
          project.supervisor.supervisorProfile?.specializations || [],
      },
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
      approvedAt: project.approvedAt,
      approvedBy: project.approvedBy,
    };
  }

  private mapToCategoryDto(
    category: BookmarkCategory,
    bookmarkCount: number,
  ): BookmarkCategoryDto {
    return {
      id: category.id,
      name: category.name,
      description: category.description || undefined,
      color: category.color || undefined,
      bookmarkCount,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt,
    };
  }

  private mapToBookmarkResponse(
    bookmark: ProjectBookmark,
    project?: Project,
  ): BookmarkResponseDto {
    const response: BookmarkResponseDto = {
      id: bookmark.id,
      projectId: bookmark.projectId,
      createdAt: bookmark.createdAt,
    };

    if (project) {
      response.project = this.mapToProjectSummary(project);
    }

    return response;
  }

  private mapToProjectSummary(project: Project): ProjectSummaryDto {
    return {
      id: project.id,
      title: project.title,
      abstract:
        project.abstract.substring(0, 200) +
        (project.abstract.length > 200 ? '...' : ''),
      specialization: project.specialization,
      difficultyLevel: project.difficultyLevel,
      year: project.year,
      tags: project.tags,
      technologyStack: project.technologyStack,
      isGroupProject: project.isGroupProject,
      approvalStatus: project.approvalStatus,
      supervisor: {
        id: project.supervisor.id,
        firstName:
          project.supervisor.supervisorProfile?.name?.split(' ')[0] || '',
        lastName:
          project.supervisor.supervisorProfile?.name
            ?.split(' ')
            .slice(1)
            .join(' ') || '',
        email: project.supervisor.email,
      },
      createdAt: project.createdAt,
      approvedAt: project.approvedAt,
    };
  }
}
