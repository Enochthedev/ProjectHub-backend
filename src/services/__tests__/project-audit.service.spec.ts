import 'reflect-metadata';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ProjectAuditService } from '../project-audit.service';
import { AuditLog } from '../../entities/audit-log.entity';
import { Project } from '../../entities/project.entity';
import { UpdateProjectDto } from '../../dto/project';
import { DifficultyLevel, ApprovalStatus } from '../../common/enums';

describe('ProjectAuditService', () => {
  let service: ProjectAuditService;
  let auditLogRepository: jest.Mocked<Repository<AuditLog>>;

  const mockProject = {
    id: 'project-id',
    title: 'Original Title',
    abstract: 'Original abstract content',
    specialization: 'Artificial Intelligence & Machine Learning',
    difficultyLevel: DifficultyLevel.INTERMEDIATE,
    year: 2024,
    tags: ['ai', 'original'],
    technologyStack: ['React', 'Node.js'],
    isGroupProject: false,
    approvalStatus: ApprovalStatus.PENDING,
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProjectAuditService,
        {
          provide: getRepositoryToken(AuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
            find: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ProjectAuditService>(ProjectAuditService);
    auditLogRepository = module.get(getRepositoryToken(AuditLog));
  });

  describe('logProjectCreation', () => {
    it('should create audit log for project creation', async () => {
      const mockAuditLog = { id: 'audit-id' };
      auditLogRepository.create.mockReturnValue(mockAuditLog as any);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as any);

      await service.logProjectCreation(
        'project-id',
        'supervisor-id',
        '127.0.0.1',
        'test-agent',
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        userId: 'supervisor-id',
        action: 'PROJECT_CREATED',
        resource: 'project:project-id',
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
      });
      expect(auditLogRepository.save).toHaveBeenCalledWith(mockAuditLog);
    });

    it('should handle audit log creation without IP and user agent', async () => {
      const mockAuditLog = { id: 'audit-id' };
      auditLogRepository.create.mockReturnValue(mockAuditLog as any);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as any);

      await service.logProjectCreation('project-id', 'supervisor-id');

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        userId: 'supervisor-id',
        action: 'PROJECT_CREATED',
        resource: 'project:project-id',
        ipAddress: undefined,
        userAgent: undefined,
      });
    });
  });

  describe('logProjectUpdate', () => {
    it('should create audit log for project update with changes', async () => {
      const changes = [
        {
          field: 'title',
          oldValue: 'Old Title',
          newValue: 'New Title',
          changeType: 'update' as const,
        },
      ];

      const mockAuditLog = { id: 'audit-id' };
      auditLogRepository.create.mockReturnValue(mockAuditLog as any);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as any);

      await service.logProjectUpdate('project-id', 'user-id', changes);

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        userId: 'user-id',
        action: 'PROJECT_UPDATED',
        resource: 'project:project-id',
        ipAddress: undefined,
        userAgent: undefined,
      });
    });
  });

  describe('logProjectApproval', () => {
    it('should create audit log for project approval', async () => {
      const mockAuditLog = { id: 'audit-id' };
      auditLogRepository.create.mockReturnValue(mockAuditLog as any);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as any);

      await service.logProjectApproval(
        'project-id',
        'admin-id',
        'Approved with notes',
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        userId: 'admin-id',
        action: 'PROJECT_APPROVED',
        resource: 'project:project-id',
        ipAddress: undefined,
        userAgent: undefined,
      });
    });
  });

  describe('logProjectRejection', () => {
    it('should create audit log for project rejection', async () => {
      const mockAuditLog = { id: 'audit-id' };
      auditLogRepository.create.mockReturnValue(mockAuditLog as any);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as any);

      await service.logProjectRejection(
        'project-id',
        'admin-id',
        'Does not meet standards',
      );

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        userId: 'admin-id',
        action: 'PROJECT_REJECTED',
        resource: 'project:project-id',
        ipAddress: undefined,
        userAgent: undefined,
      });
    });
  });

  describe('logProjectArchival', () => {
    it('should create audit log for project archival', async () => {
      const mockAuditLog = { id: 'audit-id' };
      auditLogRepository.create.mockReturnValue(mockAuditLog as any);
      auditLogRepository.save.mockResolvedValue(mockAuditLog as any);

      await service.logProjectArchival('project-id', 'admin-id');

      expect(auditLogRepository.create).toHaveBeenCalledWith({
        userId: 'admin-id',
        action: 'PROJECT_ARCHIVED',
        resource: 'project:project-id',
        ipAddress: undefined,
        userAgent: undefined,
      });
    });
  });

  describe('getProjectAuditHistory', () => {
    it('should retrieve audit history for a project', async () => {
      const mockAuditLogs = [
        { id: 'audit-1', action: 'PROJECT_CREATED' },
        { id: 'audit-2', action: 'PROJECT_UPDATED' },
      ];
      auditLogRepository.find.mockResolvedValue(mockAuditLogs as any);

      const result = await service.getProjectAuditHistory('project-id');

      expect(result).toEqual(mockAuditLogs);
      expect(auditLogRepository.find).toHaveBeenCalledWith({
        where: { resource: 'project:project-id' },
        relations: ['user'],
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('detectProjectChanges', () => {
    it('should detect changes between original project and update DTO', async () => {
      const updateDto: UpdateProjectDto = {
        title: 'Updated Title',
        abstract: 'Updated abstract content',
        tags: ['ai', 'updated'],
      };

      const changes = service.detectProjectChanges(mockProject, updateDto);

      expect(changes).toHaveLength(3);
      expect(changes).toContainEqual({
        field: 'title',
        oldValue: 'Original Title',
        newValue: 'Updated Title',
        changeType: 'update',
      });
      expect(changes).toContainEqual({
        field: 'abstract',
        oldValue: 'Original abstract content',
        newValue: 'Updated abstract content',
        changeType: 'update',
      });
      expect(changes).toContainEqual({
        field: 'tags',
        oldValue: ['ai', 'original'],
        newValue: ['ai', 'updated'],
        changeType: 'update',
      });
    });

    it('should not detect changes for unchanged fields', async () => {
      const updateDto: UpdateProjectDto = {
        title: 'Original Title', // Same as original
        specialization: 'Artificial Intelligence & Machine Learning', // Same as original
      };

      const changes = service.detectProjectChanges(mockProject, updateDto);

      expect(changes).toHaveLength(0);
    });

    it('should not detect changes for undefined fields in update DTO', async () => {
      const updateDto: UpdateProjectDto = {
        notes: 'New notes', // This field is undefined in original, so it's a change
      };

      const changes = service.detectProjectChanges(mockProject, updateDto);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'notes',
        oldValue: undefined,
        newValue: 'New notes',
        changeType: 'update',
      });
    });

    it('should handle array changes correctly', async () => {
      const updateDto: UpdateProjectDto = {
        technologyStack: ['React', 'Node.js', 'PostgreSQL'], // Added PostgreSQL
      };

      const changes = service.detectProjectChanges(mockProject, updateDto);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'technologyStack',
        oldValue: ['React', 'Node.js'],
        newValue: ['React', 'Node.js', 'PostgreSQL'],
        changeType: 'update',
      });
    });

    it('should handle boolean changes correctly', async () => {
      const updateDto: UpdateProjectDto = {
        isGroupProject: true, // Changed from false
      };

      const changes = service.detectProjectChanges(mockProject, updateDto);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toEqual({
        field: 'isGroupProject',
        oldValue: false,
        newValue: true,
        changeType: 'update',
      });
    });
  });

  describe('error handling', () => {
    it('should not throw error if audit log creation fails', async () => {
      auditLogRepository.create.mockReturnValue({} as any);
      auditLogRepository.save.mockRejectedValue(new Error('Database error'));

      // Should not throw
      await expect(
        service.logProjectCreation('project-id', 'supervisor-id'),
      ).resolves.not.toThrow();
    });
  });
});
