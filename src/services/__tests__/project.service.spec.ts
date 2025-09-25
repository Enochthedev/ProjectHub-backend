import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import { ProjectService } from '../project.service';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import {
  CreateProjectDto,
  UpdateProjectDto,
  RejectProjectDto,
} from '../../dto/project';
import {
  ProjectNotFoundException,
  ProjectAlreadyExistsException,
  ProjectValidationException,
  ProjectApprovalException,
  ProjectStatusException,
  ProjectPermissionException,
} from '../../common/exceptions';
import { ApprovalStatus, UserRole, DifficultyLevel } from '../../common/enums';

describe('ProjectService', () => {
  let service: ProjectService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let dataSource: jest.Mocked<DataSource>;
  let queryRunner: jest.Mocked<QueryRunner>;

  const mockSupervisor = {
    id: 'supervisor-id',
    email: 'supervisor@university.edu',
    firstName: 'John',
    lastName: 'Doe',
    role: UserRole.SUPERVISOR,
    supervisorProfile: {
      specializations: [
        'Artificial Intelligence & Machine Learning',
        'Web Development & Full Stack',
      ],
    },
  } as any;

  const mockProject = {
    id: 'project-id',
    title: 'AI-Powered Web Application',
    abstract:
      'A comprehensive web application that uses artificial intelligence to provide personalized recommendations for users.',
    specialization: 'Artificial Intelligence & Machine Learning',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    year: 2024,
    tags: ['ai', 'web-app', 'machine-learning'],
    technologyStack: ['React', 'Node.js', 'TensorFlow', 'PostgreSQL'],
    isGroupProject: false,
    approvalStatus: ApprovalStatus.PENDING,
    supervisorId: 'supervisor-id',
    supervisor: mockSupervisor,
    createdAt: new Date(),
    updatedAt: new Date(),
  } as any;

  beforeEach(async () => {
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        update: jest.fn().mockResolvedValue({ affected: 1 }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            findOne: jest.fn(),
            update: jest.fn(),
            createQueryBuilder: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectService>(ProjectService);
    projectRepository = module.get(getRepositoryToken(Project));
    userRepository = module.get(getRepositoryToken(User));
    dataSource = module.get(DataSource);
    queryRunner = mockQueryRunner as any;
  });

  describe('createProject', () => {
    const createProjectDto: CreateProjectDto = {
      title: 'AI-Powered Web Application',
      abstract:
        'A comprehensive web application that uses artificial intelligence to provide personalized recommendations for users.',
      specialization: 'Artificial Intelligence & Machine Learning',
      difficultyLevel: DifficultyLevel.INTERMEDIATE,
      year: 2024,
      tags: ['ai', 'web-app', 'machine-learning'],
      technologyStack: ['React', 'Node.js', 'TensorFlow', 'PostgreSQL'],
      isGroupProject: false,
    };

    it('should create a project successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockSupervisor);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // No duplicate found
      };
      projectRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);
      projectRepository.findOne.mockResolvedValue(mockProject);

      const result = await service.createProject(
        createProjectDto,
        'supervisor-id',
      );

      expect(result).toEqual(mockProject);
      expect(userRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'supervisor-id' },
        relations: ['supervisorProfile'],
      });
      expect(projectRepository.create).toHaveBeenCalledWith({
        ...createProjectDto,
        tags: ['ai', 'web-app', 'machine-learning'],
        supervisorId: 'supervisor-id',
        approvalStatus: ApprovalStatus.PENDING,
      });
    });

    it('should throw error if supervisor not found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      await expect(
        service.createProject(createProjectDto, 'invalid-supervisor-id'),
      ).rejects.toThrow(ProjectValidationException);
    });

    it('should throw error if user is not a supervisor', async () => {
      const nonSupervisor = { ...mockSupervisor, role: UserRole.STUDENT };
      userRepository.findOne.mockResolvedValue(nonSupervisor);

      await expect(
        service.createProject(createProjectDto, 'student-id'),
      ).rejects.toThrow(ProjectPermissionException);
    });

    it('should throw error for duplicate project title', async () => {
      userRepository.findOne.mockResolvedValue(mockSupervisor);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(mockProject), // Duplicate found
      };
      projectRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await expect(
        service.createProject(createProjectDto, 'supervisor-id'),
      ).rejects.toThrow(ProjectAlreadyExistsException);
    });

    it('should throw error for invalid specialization', async () => {
      const supervisorWithDifferentSpec = {
        ...mockSupervisor,
        supervisorProfile: {
          specializations: ['Web Development & Full Stack'],
        },
      };
      userRepository.findOne.mockResolvedValue(supervisorWithDifferentSpec);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      projectRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      await expect(
        service.createProject(createProjectDto, 'supervisor-id'),
      ).rejects.toThrow(ProjectValidationException);
    });

    it('should normalize tags correctly', async () => {
      const dtoWithUnnormalizedTags = {
        ...createProjectDto,
        tags: ['AI & ML', 'Web App!', 'Machine Learning'],
      };

      userRepository.findOne.mockResolvedValue(mockSupervisor);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      projectRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      projectRepository.create.mockReturnValue(mockProject);
      projectRepository.save.mockResolvedValue(mockProject);
      projectRepository.findOne.mockResolvedValue(mockProject);

      await service.createProject(dtoWithUnnormalizedTags, 'supervisor-id');

      expect(projectRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          tags: ['ai-ml', 'web-app', 'machine-learning'],
        }),
      );
    });

    it('should validate technology stack limits', async () => {
      const dtoWithTooManyTechs = {
        ...createProjectDto,
        technologyStack: Array(16).fill('Technology'), // Exceeds limit of 15
      };

      userRepository.findOne.mockResolvedValue(mockSupervisor);

      await expect(
        service.createProject(dtoWithTooManyTechs, 'supervisor-id'),
      ).rejects.toThrow(ProjectValidationException);
    });
  });

  describe('updateProject', () => {
    const updateProjectDto: UpdateProjectDto = {
      title: 'Updated AI Application',
      abstract:
        'Updated abstract for the AI application with more comprehensive features.',
    };

    it('should update project successfully', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null), // No duplicate found
      };
      projectRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      projectRepository.update.mockResolvedValue({ affected: 1 } as any);

      const updatedProject = { ...mockProject, ...updateProjectDto };
      projectRepository.findOne
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(updatedProject);

      const result = await service.updateProject(
        'project-id',
        updateProjectDto,
        'supervisor-id',
        UserRole.SUPERVISOR,
      );

      expect(result).toEqual(updatedProject);
      expect(projectRepository.update).toHaveBeenCalledWith(
        'project-id',
        updateProjectDto,
      );
    });

    it('should throw error if project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(
        service.updateProject(
          'invalid-id',
          updateProjectDto,
          'supervisor-id',
          UserRole.SUPERVISOR,
        ),
      ).rejects.toThrow(ProjectNotFoundException);
    });

    it('should throw error if user lacks permission', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      await expect(
        service.updateProject(
          'project-id',
          updateProjectDto,
          'other-supervisor-id',
          UserRole.SUPERVISOR,
        ),
      ).rejects.toThrow(ProjectPermissionException);
    });

    it('should allow admin to update any project', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);

      const mockQueryBuilder = {
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        getOne: jest.fn().mockResolvedValue(null),
      };
      projectRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      projectRepository.update.mockResolvedValue({ affected: 1 } as any);

      const updatedProject = { ...mockProject, ...updateProjectDto };
      projectRepository.findOne
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(updatedProject);

      const result = await service.updateProject(
        'project-id',
        updateProjectDto,
        'admin-id',
        UserRole.ADMIN,
      );

      expect(result).toEqual(updatedProject);
    });

    it('should not allow updating archived project', async () => {
      const archivedProject = {
        ...mockProject,
        approvalStatus: ApprovalStatus.ARCHIVED,
      };
      projectRepository.findOne.mockResolvedValue(archivedProject);

      await expect(
        service.updateProject(
          'project-id',
          updateProjectDto,
          'supervisor-id',
          UserRole.SUPERVISOR,
        ),
      ).rejects.toThrow(ProjectStatusException);
    });
  });

  describe('approveProject', () => {
    it('should approve project successfully', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      // queryRunner.manager.update is already mocked in beforeEach

      const approvedProject = {
        ...mockProject,
        approvalStatus: ApprovalStatus.APPROVED,
        approvedAt: expect.any(Date),
        approvedBy: 'admin-id',
      };
      projectRepository.findOne
        .mockResolvedValueOnce(mockProject)
        .mockResolvedValueOnce(approvedProject);

      const result = await service.approveProject('project-id', 'admin-id');

      expect(result).toEqual(approvedProject);
      expect(queryRunner.connect).toHaveBeenCalled();
      expect(queryRunner.startTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });

    it('should throw error if project is not pending', async () => {
      const approvedProject = {
        ...mockProject,
        approvalStatus: ApprovalStatus.APPROVED,
      };
      projectRepository.findOne.mockResolvedValue(approvedProject);

      await expect(
        service.approveProject('project-id', 'admin-id'),
      ).rejects.toThrow(ProjectApprovalException);
    });

    it('should rollback transaction on error', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      (queryRunner.manager.update as jest.Mock).mockRejectedValue(
        new Error('Database error'),
      );

      await expect(
        service.approveProject('project-id', 'admin-id'),
      ).rejects.toThrow(ProjectApprovalException);

      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.release).toHaveBeenCalled();
    });
  });

  describe('rejectProject', () => {
    const rejectDto: RejectProjectDto = {
      rejectionReason: 'Project does not meet quality standards',
    };

    it('should reject project successfully', async () => {
      projectRepository.findOne.mockResolvedValue(mockProject);
      projectRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.rejectProject('project-id', 'admin-id', rejectDto);

      expect(projectRepository.update).toHaveBeenCalledWith('project-id', {
        approvalStatus: ApprovalStatus.REJECTED,
        notes: rejectDto.rejectionReason,
        approvedBy: 'admin-id',
        approvedAt: expect.any(Date),
      });
    });

    it('should throw error if project is not pending', async () => {
      const approvedProject = {
        ...mockProject,
        approvalStatus: ApprovalStatus.APPROVED,
      };
      projectRepository.findOne.mockResolvedValue(approvedProject);

      await expect(
        service.rejectProject('project-id', 'admin-id', rejectDto),
      ).rejects.toThrow(ProjectApprovalException);
    });
  });

  describe('archiveProject', () => {
    it('should archive project successfully', async () => {
      const approvedProject = {
        ...mockProject,
        approvalStatus: ApprovalStatus.APPROVED,
      };
      projectRepository.findOne.mockResolvedValue(approvedProject);
      projectRepository.update.mockResolvedValue({ affected: 1 } as any);

      await service.archiveProject('project-id', 'admin-id');

      expect(projectRepository.update).toHaveBeenCalledWith('project-id', {
        approvalStatus: ApprovalStatus.ARCHIVED,
        approvedBy: 'admin-id',
        approvedAt: expect.any(Date),
      });
    });

    it('should throw error if project is already archived', async () => {
      const archivedProject = {
        ...mockProject,
        approvalStatus: ApprovalStatus.ARCHIVED,
      };
      projectRepository.findOne.mockResolvedValue(archivedProject);

      await expect(
        service.archiveProject('project-id', 'admin-id'),
      ).rejects.toThrow(ProjectStatusException);
    });
  });

  describe('getProjectById', () => {
    it('should return project details with analytics', async () => {
      const projectWithRelations = {
        ...mockProject,
        views: [{ id: '1' }, { id: '2' }],
        bookmarks: [{ id: '1' }],
      };
      projectRepository.findOne.mockResolvedValue(projectWithRelations);

      const result = await service.getProjectById('project-id');

      expect(result.viewCount).toBe(2);
      expect(result.bookmarkCount).toBe(1);
      expect(projectRepository.findOne).toHaveBeenCalledWith({
        where: { id: 'project-id' },
        relations: [
          'supervisor',
          'supervisor.supervisorProfile',
          'bookmarks',
          'views',
        ],
      });
    });

    it('should throw error if project not found', async () => {
      projectRepository.findOne.mockResolvedValue(null);

      await expect(service.getProjectById('invalid-id')).rejects.toThrow(
        ProjectNotFoundException,
      );
    });
  });

  describe('getSuggestedTechnologies', () => {
    it('should return technology suggestions', async () => {
      const result = await service.getSuggestedTechnologies('react');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('getSuggestedTags', () => {
    it('should return tag suggestions', async () => {
      const result = await service.getSuggestedTags('web');

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });
  });
});
