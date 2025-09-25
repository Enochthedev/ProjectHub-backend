import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { NotFoundException } from '@nestjs/common';
import { BookmarkService } from '../bookmark.service';
import { ProjectBookmark } from '../../entities/project-bookmark.entity';
import { Project } from '../../entities/project.entity';
import { BookmarkCategory } from '../../entities/bookmark-category.entity';
import { CompareProjectsDto } from '../../dto/bookmark';
import { ApprovalStatus, DifficultyLevel } from '../../common/enums';

describe('BookmarkService - Comparison Features', () => {
  let service: BookmarkService;
  let bookmarkRepository: Repository<ProjectBookmark>;

  const mockBookmarkRepository = {
    find: jest.fn(),
  };

  const mockProjectRepository = {
    findOne: jest.fn(),
  };

  const mockCategoryRepository = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
  };

  const mockProject1 = {
    id: 'project-1',
    title: 'React E-commerce App',
    abstract:
      'A full-stack e-commerce application built with React and Node.js',
    specialization: 'Web Development',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    year: 2024,
    tags: ['react', 'nodejs', 'ecommerce'],
    technologyStack: ['React', 'Node.js', 'MongoDB'],
    isGroupProject: false,
    approvalStatus: ApprovalStatus.APPROVED,
    githubUrl: 'https://github.com/example/react-ecommerce',
    demoUrl: 'https://demo.example.com',
    notes: 'Great project for learning full-stack development',
    supervisor: {
      id: 'supervisor-1',
      email: 'supervisor1@example.com',
      supervisorProfile: {
        name: 'Dr. John Smith',
        specializations: ['Web Development', 'Software Engineering'],
        maxStudents: 5,
        isAvailable: true,
      },
    },
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    approvedAt: new Date('2024-01-02'),
    approvedBy: 'admin-1',
  };

  const mockProject2 = {
    id: 'project-2',
    title: 'Machine Learning Classifier',
    abstract:
      'A machine learning project for image classification using TensorFlow',
    specialization: 'Artificial Intelligence',
    difficultyLevel: DifficultyLevel.ADVANCED,
    year: 2024,
    tags: ['ml', 'tensorflow', 'classification'],
    technologyStack: ['Python', 'TensorFlow', 'Keras'],
    isGroupProject: true,
    approvalStatus: ApprovalStatus.APPROVED,
    githubUrl: 'https://github.com/example/ml-classifier',
    demoUrl: null,
    notes: 'Requires strong mathematical background',
    supervisor: {
      id: 'supervisor-2',
      email: 'supervisor2@example.com',
      supervisorProfile: {
        name: 'Dr. Jane Doe',
        specializations: ['Machine Learning', 'AI'],
        maxStudents: 3,
        isAvailable: true,
      },
    },
    createdAt: new Date('2024-01-05'),
    updatedAt: new Date('2024-01-05'),
    approvedAt: new Date('2024-01-06'),
    approvedBy: 'admin-1',
  };

  const mockBookmarks = [
    {
      id: 'bookmark-1',
      studentId: 'student-1',
      projectId: 'project-1',
      project: mockProject1,
      createdAt: new Date(),
    },
    {
      id: 'bookmark-2',
      studentId: 'student-1',
      projectId: 'project-2',
      project: mockProject2,
      createdAt: new Date(),
    },
  ];

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
    bookmarkRepository = module.get<Repository<ProjectBookmark>>(
      getRepositoryToken(ProjectBookmark),
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('compareBookmarkedProjects', () => {
    const compareDto: CompareProjectsDto = {
      projectIds: ['project-1', 'project-2'],
    };

    it('should compare bookmarked projects successfully', async () => {
      mockBookmarkRepository.find.mockResolvedValue(mockBookmarks);

      const result = await service.compareBookmarkedProjects(
        'student-1',
        compareDto,
      );

      expect(mockBookmarkRepository.find).toHaveBeenCalledWith({
        where: {
          studentId: 'student-1',
          projectId: In(['project-1', 'project-2']),
        },
        relations: [
          'project',
          'project.supervisor',
          'project.supervisor.supervisorProfile',
        ],
      });

      expect(result.projects).toHaveLength(2);
      expect(result.comparisonMatrix).toBeDefined();
      expect(result.comparisonMatrix).toHaveLength(8); // 8 comparison fields

      // Check comparison matrix structure
      const titleField = result.comparisonMatrix.find(
        (field) => field.field === 'title',
      );
      expect(titleField).toBeDefined();
      expect(titleField!.values['project-1']).toBe('React E-commerce App');
      expect(titleField!.values['project-2']).toBe(
        'Machine Learning Classifier',
      );

      const difficultyField = result.comparisonMatrix.find(
        (field) => field.field === 'difficultyLevel',
      );
      expect(difficultyField).toBeDefined();
      expect(difficultyField!.values['project-1']).toBe(
        DifficultyLevel.INTERMEDIATE,
      );
      expect(difficultyField!.values['project-2']).toBe(
        DifficultyLevel.ADVANCED,
      );
    });

    it('should throw NotFoundException when not all projects are bookmarked', async () => {
      // Return only one bookmark instead of two
      mockBookmarkRepository.find.mockResolvedValue([mockBookmarks[0]]);

      await expect(
        service.compareBookmarkedProjects('student-1', compareDto),
      ).rejects.toThrow(NotFoundException);

      expect(mockBookmarkRepository.find).toHaveBeenCalled();
    });

    it('should handle empty bookmark list', async () => {
      mockBookmarkRepository.find.mockResolvedValue([]);

      await expect(
        service.compareBookmarkedProjects('student-1', compareDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('should format technology stack and tags as comma-separated strings', async () => {
      mockBookmarkRepository.find.mockResolvedValue(mockBookmarks);

      const result = await service.compareBookmarkedProjects(
        'student-1',
        compareDto,
      );

      const techStackField = result.comparisonMatrix.find(
        (field) => field.field === 'technologyStack',
      );
      expect(techStackField!.values['project-1']).toBe(
        'React, Node.js, MongoDB',
      );
      expect(techStackField!.values['project-2']).toBe(
        'Python, TensorFlow, Keras',
      );

      const tagsField = result.comparisonMatrix.find(
        (field) => field.field === 'tags',
      );
      expect(tagsField!.values['project-1']).toBe('react, nodejs, ecommerce');
      expect(tagsField!.values['project-2']).toBe(
        'ml, tensorflow, classification',
      );
    });

    it('should format group project field as Yes/No', async () => {
      mockBookmarkRepository.find.mockResolvedValue(mockBookmarks);

      const result = await service.compareBookmarkedProjects(
        'student-1',
        compareDto,
      );

      const groupProjectField = result.comparisonMatrix.find(
        (field) => field.field === 'isGroupProject',
      );
      expect(groupProjectField!.values['project-1']).toBe('No');
      expect(groupProjectField!.values['project-2']).toBe('Yes');
    });

    it('should format supervisor field with full name', async () => {
      mockBookmarkRepository.find.mockResolvedValue(mockBookmarks);

      const result = await service.compareBookmarkedProjects(
        'student-1',
        compareDto,
      );

      const supervisorField = result.comparisonMatrix.find(
        (field) => field.field === 'supervisor',
      );
      expect(supervisorField!.values['project-1']).toBe('Dr. John Smith');
      expect(supervisorField!.values['project-2']).toBe('Dr. Jane Doe');
    });
  });
});
