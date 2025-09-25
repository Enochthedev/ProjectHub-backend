import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookmarkService } from '../bookmark.service';
import { ProjectBookmark } from '../../entities/project-bookmark.entity';
import { Project } from '../../entities/project.entity';
import { BookmarkCategory } from '../../entities/bookmark-category.entity';
import {
  CreateBookmarkCategoryDto,
  UpdateBookmarkCategoryDto,
  AssignBookmarkCategoryDto,
} from '../../dto/bookmark';

describe('BookmarkService - Category Management', () => {
  let service: BookmarkService;
  let categoryRepository: Repository<BookmarkCategory>;
  let bookmarkRepository: Repository<ProjectBookmark>;

  const mockBookmarkRepository = {
    findOne: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
    save: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn(),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
    find: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
  };

  const mockCategory = {
    id: 'category-1',
    name: 'Web Development',
    description: 'Projects related to web development',
    color: '#3498db',
    studentId: 'student-1',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBookmark = {
    id: 'bookmark-1',
    studentId: 'student-1',
    projectId: 'project-1',
    categoryId: null,
    project: {
      id: 'project-1',
      title: 'Test Project',
      abstract: 'Test project abstract',
      specialization: 'Web Development',
      difficultyLevel: 'intermediate',
      year: 2024,
      tags: ['test'],
      technologyStack: ['React'],
      isGroupProject: false,
      approvalStatus: 'approved',
      supervisor: {
        id: 'supervisor-1',
        email: 'supervisor@test.com',
        supervisorProfile: {
          name: 'Dr. Test Supervisor',
        },
      },
      createdAt: new Date(),
      approvedAt: new Date(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BookmarkService,
        {
          provide: getRepositoryToken(ProjectBookmark),
          useValue: mockBookmarkRepository,
        },
        {
          provide: getRepositoryToken(Project),
          useValue: mockProjectRepository,
        },
        {
          provide: getRepositoryToken(BookmarkCategory),
          useValue: mockCategoryRepository,
        },
      ],
    }).compile();

    service = module.get<BookmarkService>(BookmarkService);
    categoryRepository = module.get<Repository<BookmarkCategory>>(
      getRepositoryToken(BookmarkCategory),
    );
    bookmarkRepository = module.get<Repository<ProjectBookmark>>(
      getRepositoryToken(ProjectBookmark),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createCategory', () => {
    const createCategoryDto: CreateBookmarkCategoryDto = {
      name: 'Web Development',
      description: 'Projects related to web development',
      color: '#3498db',
    };

    it('should create a category successfully', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);
      mockCategoryRepository.create.mockReturnValue(mockCategory);
      mockCategoryRepository.save.mockResolvedValue(mockCategory);

      const result = await service.createCategory(
        'student-1',
        createCategoryDto,
      );

      expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
        where: {
          studentId: 'student-1',
          name: 'Web Development',
        },
      });
      expect(mockCategoryRepository.create).toHaveBeenCalledWith({
        ...createCategoryDto,
        studentId: 'student-1',
      });
      expect(result).toEqual({
        id: mockCategory.id,
        name: mockCategory.name,
        description: mockCategory.description,
        color: mockCategory.color,
        bookmarkCount: 0,
        createdAt: mockCategory.createdAt,
        updatedAt: mockCategory.updatedAt,
      });
    });

    it('should throw ConflictException when category name already exists', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);

      await expect(
        service.createCategory('student-1', createCategoryDto),
      ).rejects.toThrow(ConflictException);

      expect(mockCategoryRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('updateCategory', () => {
    const updateCategoryDto: UpdateBookmarkCategoryDto = {
      name: 'Updated Web Development',
      description: 'Updated description',
    };

    it('should update category successfully', async () => {
      const updatedCategory = { ...mockCategory, ...updateCategoryDto };
      mockCategoryRepository.findOne
        .mockResolvedValueOnce(mockCategory) // First call to find existing category
        .mockResolvedValueOnce(null); // Second call to check name uniqueness
      mockCategoryRepository.save.mockResolvedValue(updatedCategory);
      mockBookmarkRepository.count.mockResolvedValue(3);

      const result = await service.updateCategory(
        'student-1',
        'category-1',
        updateCategoryDto,
      );

      expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'category-1', studentId: 'student-1' },
      });
      expect(mockCategoryRepository.save).toHaveBeenCalled();
      expect(result.name).toBe(updateCategoryDto.name);
      expect(result.bookmarkCount).toBe(3);
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateCategory('student-1', 'category-1', updateCategoryDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockCategoryRepository.save).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when new name already exists', async () => {
      const existingCategory = { ...mockCategory, id: 'category-2' };
      mockCategoryRepository.findOne
        .mockResolvedValueOnce(mockCategory) // First call to find existing category
        .mockResolvedValueOnce(existingCategory); // Second call finds name conflict

      await expect(
        service.updateCategory('student-1', 'category-1', updateCategoryDto),
      ).rejects.toThrow(ConflictException);

      expect(mockCategoryRepository.save).not.toHaveBeenCalled();
    });
  });

  describe('deleteCategory', () => {
    it('should delete category and remove from bookmarks', async () => {
      const categoryToDelete = { ...mockCategory };
      mockCategoryRepository.findOne.mockResolvedValue(categoryToDelete);
      mockBookmarkRepository.update.mockResolvedValue({ affected: 2 });
      mockCategoryRepository.remove.mockResolvedValue(undefined);

      await service.deleteCategory('student-1', 'category-1');

      expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'category-1', studentId: 'student-1' },
      });
      expect(mockBookmarkRepository.update).toHaveBeenCalledWith(
        { categoryId: 'category-1' },
        { categoryId: null },
      );
      expect(mockCategoryRepository.remove).toHaveBeenCalledWith(
        categoryToDelete,
      );
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.deleteCategory('student-1', 'category-1'),
      ).rejects.toThrow(NotFoundException);

      expect(mockBookmarkRepository.update).not.toHaveBeenCalled();
      expect(mockCategoryRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getUserCategories', () => {
    it('should return user categories with bookmark counts', async () => {
      const categories = [mockCategory];
      mockCategoryRepository.find.mockResolvedValue(categories);
      mockBookmarkRepository.count.mockResolvedValue(5);

      const result = await service.getUserCategories('student-1');

      expect(mockCategoryRepository.find).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        order: { name: 'ASC' },
      });
      expect(mockBookmarkRepository.count).toHaveBeenCalledWith({
        where: { categoryId: mockCategory.id },
      });
      expect(result).toHaveLength(1);
      expect(result[0].bookmarkCount).toBe(5);
    });
  });

  describe('assignBookmarkToCategory', () => {
    const assignDto: AssignBookmarkCategoryDto = {
      bookmarkId: 'bookmark-1',
      categoryId: 'category-1',
    };

    it('should assign bookmark to category successfully', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);
      mockCategoryRepository.findOne.mockResolvedValue(mockCategory);
      mockBookmarkRepository.save.mockResolvedValue({
        ...mockBookmark,
        categoryId: 'category-1',
      });

      const result = await service.assignBookmarkToCategory(
        'student-1',
        assignDto,
      );

      expect(mockBookmarkRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'bookmark-1', studentId: 'student-1' },
        relations: [
          'project',
          'project.supervisor',
          'project.supervisor.supervisorProfile',
        ],
      });
      expect(mockCategoryRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'category-1', studentId: 'student-1' },
      });
      expect(mockBookmarkRepository.save).toHaveBeenCalled();
      expect(result.id).toBe(mockBookmark.id);
    });

    it('should remove category assignment when categoryId is null', async () => {
      const assignDtoRemove = { ...assignDto, categoryId: undefined };
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);
      mockBookmarkRepository.save.mockResolvedValue({
        ...mockBookmark,
        categoryId: null,
      });

      await service.assignBookmarkToCategory('student-1', assignDtoRemove);

      expect(mockCategoryRepository.findOne).not.toHaveBeenCalled();
      expect(mockBookmarkRepository.save).toHaveBeenCalledWith({
        ...mockBookmark,
        categoryId: null,
      });
    });

    it('should throw NotFoundException when bookmark does not exist', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignBookmarkToCategory('student-1', assignDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockCategoryRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw NotFoundException when category does not exist', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);
      mockCategoryRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assignBookmarkToCategory('student-1', assignDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockBookmarkRepository.save).not.toHaveBeenCalled();
    });
  });
});
