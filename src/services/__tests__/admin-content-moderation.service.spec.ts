import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdminContentModerationService } from '../admin-content-moderation.service';
import { Project } from '../../entities/project.entity';
import { User } from '../../entities/user.entity';
import { AdminAuditLog } from '../../entities/admin-audit-log.entity';
import {
  ContentModerationDto,
  ModerationAction,
  ContentFlag,
  ContentQualityLevel,
} from '../../dto/admin/content-moderation.dto';
import { ApprovalStatus, UserRole } from '../../common/enums';

describe('AdminContentModerationService', () => {
  let service: AdminContentModerationService;
  let projectRepository: jest.Mocked<Repository<Project>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let auditRepository: jest.Mocked<Repository<AdminAuditLog>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockProject: Partial<Project> = {
    id: 'project-1',
    title: 'Test Project',
    abstract: 'This is a test project',
    approvalStatus: ApprovalStatus.PENDING,
    supervisorId: 'supervisor-1',
  };

  const mockAdmin: Partial<User> = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  const mockModerationDto: ContentModerationDto = {
    action: ModerationAction.APPROVE,
    reason: 'Content meets quality standards',
    flags: [ContentFlag.POOR_QUALITY],
    qualityLevel: ContentQualityLevel.GOOD,
    feedback: ['Improve abstract clarity'],
    notifyCreator: true,
    priority: 3,
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
        create: jest.fn(),
        save: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminContentModerationService,
        {
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
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

    service = module.get<AdminContentModerationService>(
      AdminContentModerationService,
    );
    projectRepository = module.get(getRepositoryToken(Project));
    userRepository = module.get(getRepositoryToken(User));
    auditRepository = module.get(getRepositoryToken(AdminAuditLog));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('moderateContent', () => {
    it('should successfully moderate content', async () => {
      // Arrange
      projectRepository.findOne.mockResolvedValue(mockProject as Project);
      userRepository.findOne.mockResolvedValue(mockAdmin as User);

      const mockQueryRunner = dataSource.createQueryRunner();

      // Act
      const result = await service.moderateContent(
        'project-1',
        mockModerationDto,
        'admin-1',
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.projectId).toBe('project-1');
      expect(result.action).toBe(ModerationAction.APPROVE);
      expect(result.moderatorId).toBe('admin-1');
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle moderation errors gracefully', async () => {
      // Arrange
      projectRepository.findOne.mockRejectedValue(new Error('Database error'));

      // Act
      const result = await service.moderateContent(
        'project-1',
        mockModerationDto,
        'admin-1',
      );

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe('Database error');
      expect(result.projectId).toBe('project-1');
    });
  });
});
