import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdminProjectReviewService } from '../admin-project-review.service';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { AdminAuditLog } from '../../entities/admin-audit-log.entity';
import {
  ProjectReviewDto,
  ReviewDecision,
  ReviewCriteria,
} from '../../dto/admin/project-review.dto';
import { ApprovalStatus, UserRole } from '../../common/enums';
import {
  ProjectNotFoundException,
  ProjectValidationException,
  InsufficientPermissionsException,
} from '../../common/exceptions';

describe('AdminProjectReviewService', () => {
  let service: AdminProjectReviewService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let auditRepository: jest.Mocked<Repository<AdminAuditLog>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockProject: Partial<Project> = {
    id: 'project-1',
    title: 'Test Project',
    abstract: 'This is a test project for unit testing purposes',
    approvalStatus: ApprovalStatus.PENDING,
    technologyStack: ['React', 'Node.js', 'PostgreSQL'],
    supervisorId: 'supervisor-1',
  };

  const mockAdmin: Partial<User> = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  const mockReviewDto: ProjectReviewDto = {
    decision: ReviewDecision.APPROVE,
    overallComments: 'Excellent project with clear objectives',
    criteriaScores: [
      {
        criteria: ReviewCriteria.TECHNICAL_FEASIBILITY,
        score: 9,
        comments: 'Strong technical approach',
      },
      {
        criteria: ReviewCriteria.SCOPE_CLARITY,
        score: 8,
        comments: 'Clear scope definition',
      },
    ],
  };

  beforeEach(async () => {
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        update: jest.fn(),
        findOne: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminProjectReviewService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
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
          provide: getRepositoryToken(AdminAuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
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

    service = module.get<AdminProjectReviewService>(AdminProjectReviewService);
    projectRepository = module.get(getRepositoryToken(Project));
    userRepository = module.get(getRepositoryToken(User));
    auditRepository = module.get(getRepositoryToken(AdminAuditLog));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('reviewProject', () => {
    it('should successfully review and approve a project', async () => {
      // Arrange
      projectRepository.findOne.mockResolvedValue(mockProject as Project);
      userRepository.findOne.mockResolvedValue(mockAdmin as User);

      const mockQueryRunner = dataSource.createQueryRunner();
      (mockQueryRunner.manager.findOne as jest.Mock).mockResolvedValue({
        ...mockProject,
        approvalStatus: ApprovalStatus.APPROVED,
      });

      // Act
      const result = await service.reviewProject(
        'project-1',
        mockReviewDto,
        'admin-1',
      );

      // Assert
      expect(result).toBeDefined();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.manager.update).toHaveBeenCalledWith(
        Project,
        'project-1',
        expect.objectContaining({
          approvalStatus: ApprovalStatus.APPROVED,
        }),
      );
    });

    it('should throw ProjectNotFoundException for non-existent project', async () => {
      // Arrange
      projectRepository.findOne.mockResolvedValue(null);

      // Act & Assert
      await expect(
        service.reviewProject('non-existent', mockReviewDto, 'admin-1'),
      ).rejects.toThrow(ProjectNotFoundException);
    });

    it('should throw InsufficientPermissionsException for non-admin user', async () => {
      // Arrange
      projectRepository.findOne.mockResolvedValue(mockProject as Project);
      userRepository.findOne.mockResolvedValue({
        ...mockAdmin,
        role: UserRole.STUDENT,
      } as User);

      // Act & Assert
      await expect(
        service.reviewProject('project-1', mockReviewDto, 'student-1'),
      ).rejects.toThrow(InsufficientPermissionsException);
    });

    it('should throw ProjectValidationException for archived project', async () => {
      // Arrange
      projectRepository.findOne.mockResolvedValue({
        ...mockProject,
        approvalStatus: ApprovalStatus.ARCHIVED,
      } as Project);
      userRepository.findOne.mockResolvedValue(mockAdmin as User);

      // Act & Assert
      await expect(
        service.reviewProject('project-1', mockReviewDto, 'admin-1'),
      ).rejects.toThrow(ProjectValidationException);
    });
  });

  describe('assessProjectQuality', () => {
    it('should perform quality assessment and return results', async () => {
      // Arrange
      projectRepository.findOne.mockResolvedValue(mockProject as Project);
      userRepository.findOne.mockResolvedValue(mockAdmin as User);
      auditRepository.create.mockReturnValue({} as AdminAuditLog);
      auditRepository.save.mockResolvedValue({} as AdminAuditLog);

      // Act
      const result = await service.assessProjectQuality('project-1', 'admin-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.projectId).toBe('project-1');
      expect(result.reviewerId).toBe('admin-1');
      expect(result.overallScore).toBeGreaterThan(0);
      expect(result.criteriaScores).toHaveLength(3); // title, abstract, tech stack
      expect(result.strengths).toBeDefined();
      expect(result.improvements).toBeDefined();
      expect(typeof result.recommendApproval).toBe('boolean');
    });
  });

  describe('getProjectsForReview', () => {
    it('should return projects for review with pagination', async () => {
      // Arrange
      const mockQueryBuilder = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        skip: jest.fn().mockReturnThis(),
        take: jest.fn().mockReturnThis(),
        getManyAndCount: jest.fn().mockResolvedValue([[mockProject], 1]),
      };

      projectRepository.createQueryBuilder.mockReturnValue(
        mockQueryBuilder as any,
      );

      // Act
      const result = await service.getProjectsForReview(
        ApprovalStatus.PENDING,
        10,
        0,
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.projects).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'project.approvalStatus = :status',
        { status: ApprovalStatus.PENDING },
      );
    });
  });
});
