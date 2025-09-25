import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConflictException, NotFoundException } from '@nestjs/common';
import { BookmarkService } from '../bookmark.service';
import { ProjectBookmark } from '../../entities/project-bookmark.entity';
import { Project } from '../../entities/project.entity';
import { BookmarkCategory } from '../../entities/bookmark-category.entity';
import { CreateBookmarkDto } from '../../dto/bookmark';
import { ApprovalStatus, DifficultyLevel } from '../../common/enums';

describe('BookmarkService', () => {
  let service: BookmarkService;
  let bookmarkRepository: Repository<ProjectBookmark>;
  let projectRepository: Repository<Project>;

  const mockBookmarkRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    remove: jest.fn(),
    findAndCount: jest.fn(),
    count: jest.fn(),
    find: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn(),
  };

  const mockUser = {
    id: 'user-1',
    email: 'john.doe@example.com',
    supervisorProfile: {
      name: 'John Doe',
    },
  };

  const mockProject = {
    id: 'project-1',
    title: 'Test Project',
    abstract: 'This is a test project abstract',
    specialization: 'Web Development',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    year: 2024,
    tags: ['react', 'nodejs'],
    technologyStack: ['React', 'Node.js'],
    isGroupProject: false,
    approvalStatus: ApprovalStatus.APPROVED,
    supervisor: mockUser,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockBookmark = {
    id: 'bookmark-1',
    studentId: 'student-1',
    projectId: 'project-1',
    createdAt: new Date(),
    project: mockProject,
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
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<BookmarkService>(BookmarkService);
    bookmarkRepository = module.get<Repository<ProjectBookmark>>(
      getRepositoryToken(ProjectBookmark),
    );
    projectRepository = module.get<Repository<Project>>(
      getRepositoryToken(Project),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('createBookmark', () => {
    const createBookmarkDto: CreateBookmarkDto = {
      projectId: 'project-1',
    };

    it('should create a bookmark successfully', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockBookmarkRepository.findOne.mockResolvedValue(null);
      mockBookmarkRepository.create.mockReturnValue(mockBookmark);
      mockBookmarkRepository.save.mockResolvedValue(mockBookmark);

      const result = await service.createBookmark(
        'student-1',
        createBookmarkDto,
      );

      expect(mockProjectRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'project-1',
          approvalStatus: ApprovalStatus.APPROVED,
        },
        relations: ['supervisor', 'supervisor.supervisorProfile'],
      });
      expect(mockBookmarkRepository.findOne).toHaveBeenCalledWith({
        where: {
          studentId: 'student-1',
          projectId: 'project-1',
        },
      });
      expect(mockBookmarkRepository.create).toHaveBeenCalledWith({
        studentId: 'student-1',
        projectId: 'project-1',
      });
      expect(mockBookmarkRepository.save).toHaveBeenCalledWith(mockBookmark);
      expect(result).toEqual({
        id: mockBookmark.id,
        projectId: mockBookmark.projectId,
        createdAt: mockBookmark.createdAt,
        project: expect.objectContaining({
          id: mockProject.id,
          title: mockProject.title,
        }),
      });
    });

    it('should throw NotFoundException when project does not exist', async () => {
      mockProjectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createBookmark('student-1', createBookmarkDto),
      ).rejects.toThrow(NotFoundException);
      expect(mockProjectRepository.findOne).toHaveBeenCalled();
      expect(mockBookmarkRepository.findOne).not.toHaveBeenCalled();
    });

    it('should throw ConflictException when bookmark already exists', async () => {
      mockProjectRepository.findOne.mockResolvedValue(mockProject);
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);

      await expect(
        service.createBookmark('student-1', createBookmarkDto),
      ).rejects.toThrow(ConflictException);
      expect(mockProjectRepository.findOne).toHaveBeenCalled();
      expect(mockBookmarkRepository.findOne).toHaveBeenCalled();
      expect(mockBookmarkRepository.create).not.toHaveBeenCalled();
    });
  });

  describe('removeBookmark', () => {
    it('should remove bookmark successfully', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);
      mockBookmarkRepository.remove.mockResolvedValue(undefined);

      await service.removeBookmark('student-1', 'bookmark-1');

      expect(mockBookmarkRepository.findOne).toHaveBeenCalledWith({
        where: {
          id: 'bookmark-1',
          studentId: 'student-1',
        },
      });
      expect(mockBookmarkRepository.remove).toHaveBeenCalledWith(mockBookmark);
    });

    it('should throw NotFoundException when bookmark does not exist', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeBookmark('student-1', 'bookmark-1'),
      ).rejects.toThrow(NotFoundException);
      expect(mockBookmarkRepository.findOne).toHaveBeenCalled();
      expect(mockBookmarkRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('removeBookmarkByProjectId', () => {
    it('should remove bookmark by project ID successfully', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);
      mockBookmarkRepository.remove.mockResolvedValue(undefined);

      await service.removeBookmarkByProjectId('student-1', 'project-1');

      expect(mockBookmarkRepository.findOne).toHaveBeenCalledWith({
        where: {
          studentId: 'student-1',
          projectId: 'project-1',
        },
      });
      expect(mockBookmarkRepository.remove).toHaveBeenCalledWith(mockBookmark);
    });

    it('should throw NotFoundException when bookmark does not exist', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(null);

      await expect(
        service.removeBookmarkByProjectId('student-1', 'project-1'),
      ).rejects.toThrow(NotFoundException);
      expect(mockBookmarkRepository.findOne).toHaveBeenCalled();
      expect(mockBookmarkRepository.remove).not.toHaveBeenCalled();
    });
  });

  describe('getUserBookmarks', () => {
    it('should return paginated user bookmarks', async () => {
      const mockBookmarks = [mockBookmark];
      const total = 1;
      mockBookmarkRepository.findAndCount.mockResolvedValue([
        mockBookmarks,
        total,
      ]);

      const query = { page: 1, limit: 20 };
      const result = await service.getUserBookmarks('student-1', query);

      expect(mockBookmarkRepository.findAndCount).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        relations: [
          'project',
          'project.supervisor',
          'project.supervisor.supervisorProfile',
        ],
        order: { createdAt: 'DESC' },
        skip: 0,
        take: 20,
      });
      expect(result).toEqual({
        bookmarks: expect.arrayContaining([
          expect.objectContaining({
            id: mockBookmark.id,
            projectId: mockBookmark.projectId,
          }),
        ]),
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should handle pagination correctly', async () => {
      const mockBookmarks = [];
      const total = 0;
      mockBookmarkRepository.findAndCount.mockResolvedValue([
        mockBookmarks,
        total,
      ]);

      const query = { page: 2, limit: 10 };
      const result = await service.getUserBookmarks('student-1', query);

      expect(mockBookmarkRepository.findAndCount).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        relations: [
          'project',
          'project.supervisor',
          'project.supervisor.supervisorProfile',
        ],
        order: { createdAt: 'DESC' },
        skip: 10,
        take: 10,
      });
      expect(result.page).toBe(2);
      expect(result.limit).toBe(10);
    });
  });

  describe('isProjectBookmarked', () => {
    it('should return true when project is bookmarked', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(mockBookmark);

      const result = await service.isProjectBookmarked(
        'student-1',
        'project-1',
      );

      expect(mockBookmarkRepository.findOne).toHaveBeenCalledWith({
        where: {
          studentId: 'student-1',
          projectId: 'project-1',
        },
      });
      expect(result).toBe(true);
    });

    it('should return false when project is not bookmarked', async () => {
      mockBookmarkRepository.findOne.mockResolvedValue(null);

      const result = await service.isProjectBookmarked(
        'student-1',
        'project-1',
      );

      expect(result).toBe(false);
    });
  });

  describe('getBookmarkCount', () => {
    it('should return bookmark count for a project', async () => {
      mockBookmarkRepository.count.mockResolvedValue(5);

      const result = await service.getBookmarkCount('project-1');

      expect(mockBookmarkRepository.count).toHaveBeenCalledWith({
        where: { projectId: 'project-1' },
      });
      expect(result).toBe(5);
    });
  });

  describe('getUserBookmarkIds', () => {
    it('should return array of bookmarked project IDs', async () => {
      const mockBookmarks = [
        { projectId: 'project-1' },
        { projectId: 'project-2' },
      ];
      mockBookmarkRepository.find.mockResolvedValue(mockBookmarks);

      const result = await service.getUserBookmarkIds('student-1');

      expect(mockBookmarkRepository.find).toHaveBeenCalledWith({
        where: { studentId: 'student-1' },
        select: ['projectId'],
      });
      expect(result).toEqual(['project-1', 'project-2']);
    });
  });
});
