import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneStatusService } from '../milestone-status.service';
import { Milestone } from '../../entities/milestone.entity';
import { MilestoneNote } from '../../entities/milestone-note.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { UpdateMilestoneStatusDto } from '../../dto/milestone';
import {
  MilestoneNotFoundException,
  InvalidMilestoneStatusException,
  MilestoneValidationException,
  MilestonePermissionException,
} from '../../common/exceptions';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';
import { Priority } from '../../common/enums/priority.enum';
import { UserRole } from '../../common/enums/user-role.enum';
import { NoteType } from '../../common/enums/note-type.enum';

describe('MilestoneStatusService', () => {
  let service: MilestoneStatusService;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let milestoneNoteRepository: jest.Mocked<Repository<MilestoneNote>>;
  let userRepository: jest.Mocked<Repository<User>>;

  const mockStudent = {
    id: 'student-id',
    email: 'student@test.com',
    role: UserRole.STUDENT,
  } as User;

  const mockSupervisor = {
    id: 'supervisor-id',
    email: 'supervisor@test.com',
    role: UserRole.SUPERVISOR,
  } as User;

  const mockProject = {
    id: 'project-id',
    title: 'Test Project',
    supervisorId: 'supervisor-id',
  } as Project;

  const mockMilestone = {
    id: 'milestone-id',
    title: 'Test Milestone',
    description: 'Test Description',
    dueDate: new Date('2025-06-01'),
    status: MilestoneStatus.NOT_STARTED,
    priority: Priority.MEDIUM,
    studentId: 'student-id',
    student: mockStudent,
    projectId: 'project-id',
    project: mockProject,
    estimatedHours: 40,
    actualHours: 0,
    completedAt: null,
    blockingReason: null,
    isTemplate: false,
    templateId: null,
    notes: [],
    reminders: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    isOverdue: jest.fn().mockReturnValue(false),
    getDaysUntilDue: jest.fn().mockReturnValue(30),
    canTransitionTo: jest.fn().mockReturnValue(true),
    getProgressPercentage: jest.fn().mockReturnValue(0),
  } as any;

  beforeEach(async () => {
    const mockRepositoryFactory = () => ({
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
      findOne: jest.fn(),
      remove: jest.fn(),
      count: jest.fn(),
    });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneStatusService,
        {
          provide: getRepositoryToken(Milestone),
          useFactory: mockRepositoryFactory,
        },
        {
          provide: getRepositoryToken(MilestoneNote),
          useFactory: mockRepositoryFactory,
        },
        {
          provide: getRepositoryToken(User),
          useFactory: mockRepositoryFactory,
        },
      ],
    }).compile();

    service = module.get<MilestoneStatusService>(MilestoneStatusService);
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    milestoneNoteRepository = module.get(getRepositoryToken(MilestoneNote));
    userRepository = module.get(getRepositoryToken(User));
  });

  describe('updateStatus', () => {
    const statusDto: UpdateMilestoneStatusDto = {
      status: MilestoneStatus.IN_PROGRESS,
      notes: 'Started working on this milestone',
    };

    it('should update milestone status with valid transition', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue(mockStudent);
      milestoneRepository.save.mockResolvedValue({
        ...mockMilestone,
        status: MilestoneStatus.IN_PROGRESS,
      } as any);
      milestoneNoteRepository.create.mockReturnValue({} as MilestoneNote);
      milestoneNoteRepository.save.mockResolvedValue({} as MilestoneNote);
      milestoneNoteRepository.findOne.mockResolvedValue({} as MilestoneNote);

      const result = await service.updateStatus(
        'milestone-id',
        statusDto,
        'student-id',
      );

      expect(result.milestone).toBeDefined();
      expect(result.supervisorNotified).toBe(false);
      expect(milestoneRepository.save).toHaveBeenCalled();
    });

    it('should reject invalid status transition', async () => {
      const invalidStatusDto = {
        ...statusDto,
        status: MilestoneStatus.COMPLETED,
      };
      const completedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.CANCELLED,
      } as any;

      milestoneRepository.findOne.mockResolvedValue(completedMilestone);
      userRepository.findOne.mockResolvedValue(mockStudent);

      await expect(
        service.updateStatus('milestone-id', invalidStatusDto, 'student-id'),
      ).rejects.toThrow(InvalidMilestoneStatusException);
    });

    it('should require blocking reason when marking as blocked', async () => {
      const blockedDto: UpdateMilestoneStatusDto = {
        status: MilestoneStatus.BLOCKED,
      };

      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue(mockStudent);

      await expect(
        service.updateStatus('milestone-id', blockedDto, 'student-id'),
      ).rejects.toThrow(MilestoneValidationException);
    });

    it('should set completion date when marking as completed', async () => {
      const inProgressMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.IN_PROGRESS,
      } as any;
      const completedDto: UpdateMilestoneStatusDto = {
        status: MilestoneStatus.COMPLETED,
        actualHours: 35,
      };

      milestoneRepository.findOne.mockResolvedValue(inProgressMilestone);
      userRepository.findOne.mockResolvedValue(mockStudent);
      milestoneRepository.save.mockResolvedValue({
        ...inProgressMilestone,
        status: MilestoneStatus.COMPLETED,
      } as any);

      const result = await service.updateStatus(
        'milestone-id',
        completedDto,
        'student-id',
      );

      expect(result.milestone).toBeDefined();
      expect(milestoneRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MilestoneStatus.COMPLETED,
          actualHours: 35,
          completedAt: expect.any(Date),
        }),
      );
    });

    it('should notify supervisor when milestone is blocked', async () => {
      const blockedDto: UpdateMilestoneStatusDto = {
        status: MilestoneStatus.BLOCKED,
        blockingReason: 'Waiting for supervisor feedback',
      };

      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue(mockStudent);
      milestoneRepository.save.mockResolvedValue({
        ...mockMilestone,
        status: MilestoneStatus.BLOCKED,
      } as any);

      const result = await service.updateStatus(
        'milestone-id',
        blockedDto,
        'student-id',
      );

      expect(result.supervisorNotified).toBe(true);
      expect(milestoneRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MilestoneStatus.BLOCKED,
          blockingReason: 'Waiting for supervisor feedback',
        }),
      );
    });

    it('should reject update by unauthorized user', async () => {
      const otherUser = { ...mockStudent, id: 'other-user-id' };
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue(otherUser);

      await expect(
        service.updateStatus('milestone-id', statusDto, 'other-user-id'),
      ).rejects.toThrow(MilestonePermissionException);
    });

    it('should allow supervisor to update student milestone', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue(mockSupervisor);
      milestoneRepository.save.mockResolvedValue({
        ...mockMilestone,
        status: MilestoneStatus.IN_PROGRESS,
      } as any);
      milestoneNoteRepository.create.mockReturnValue({} as MilestoneNote);
      milestoneNoteRepository.save.mockResolvedValue({} as MilestoneNote);
      milestoneNoteRepository.findOne.mockResolvedValue({} as MilestoneNote);

      const result = await service.updateStatus(
        'milestone-id',
        statusDto,
        'supervisor-id',
      );

      expect(result.milestone).toBeDefined();
      expect(milestoneRepository.save).toHaveBeenCalled();
    });
  });

  describe('getStatusHistory', () => {
    it('should return status history for milestone', async () => {
      const mockNotes = [
        {
          id: 'note-1',
          content: 'Started working',
          type: NoteType.PROGRESS,
          createdAt: new Date('2024-01-01'),
          authorId: 'student-id',
          author: mockStudent,
        },
        {
          id: 'note-2',
          content: 'Made progress',
          type: NoteType.PROGRESS,
          createdAt: new Date('2024-01-02'),
          authorId: 'student-id',
          author: mockStudent,
        },
      ] as MilestoneNote[];

      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue(mockStudent);
      milestoneNoteRepository.find.mockResolvedValue(mockNotes);

      const result = await service.getStatusHistory(
        'milestone-id',
        'student-id',
      );

      expect(result).toHaveLength(2);
      expect(result[0].userId).toBe('student-id');
      expect(result[0].reason).toBe('Started working');
    });

    it('should reject access for unauthorized user', async () => {
      const otherUser = { ...mockStudent, id: 'other-user-id' };
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue(otherUser);

      await expect(
        service.getStatusHistory('milestone-id', 'other-user-id'),
      ).rejects.toThrow(MilestonePermissionException);
    });
  });

  describe('getCompletionMetrics', () => {
    it('should return completion metrics for completed milestone', async () => {
      const completedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.COMPLETED,
        estimatedHours: 40,
        actualHours: 35,
      } as any;

      milestoneRepository.findOne.mockResolvedValue(completedMilestone);
      userRepository.findOne.mockResolvedValue(mockStudent);

      const result = await service.getCompletionMetrics(
        'milestone-id',
        'student-id',
      );

      expect(result).toBeDefined();
      expect(result!.estimatedHours).toBe(40);
      expect(result!.actualHours).toBe(35);
      expect(result!.variance).toBe(-5);
      expect(result!.variancePercentage).toBe(-12.5);
      expect(result!.isUnderEstimate).toBe(true);
      expect(result!.isOverEstimate).toBe(false);
    });

    it('should return null for non-completed milestone', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue(mockStudent);

      const result = await service.getCompletionMetrics(
        'milestone-id',
        'student-id',
      );

      expect(result).toBeNull();
    });

    it('should handle over-estimate scenario', async () => {
      const completedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.COMPLETED,
        estimatedHours: 30,
        actualHours: 45,
      } as any;

      milestoneRepository.findOne.mockResolvedValue(completedMilestone);
      userRepository.findOne.mockResolvedValue(mockStudent);

      const result = await service.getCompletionMetrics(
        'milestone-id',
        'student-id',
      );

      expect(result).toBeDefined();
      expect(result!.variance).toBe(15);
      expect(result!.variancePercentage).toBe(50);
      expect(result!.isOverEstimate).toBe(true);
      expect(result!.isUnderEstimate).toBe(false);
    });
  });

  describe('validateStatusTransition', () => {
    it('should validate valid transitions', async () => {
      const result = await service.validateStatusTransition(
        MilestoneStatus.NOT_STARTED,
        MilestoneStatus.IN_PROGRESS,
      );

      expect(result.isValid).toBe(true);
      expect(result.reason).toBeUndefined();
    });

    it('should reject invalid transitions', async () => {
      const result = await service.validateStatusTransition(
        MilestoneStatus.CANCELLED,
        MilestoneStatus.COMPLETED,
      );

      expect(result.isValid).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.reason).toContain(
        'Cannot transition from Cancelled to Completed',
      );
    });

    it('should allow reopening completed milestones', async () => {
      const result = await service.validateStatusTransition(
        MilestoneStatus.COMPLETED,
        MilestoneStatus.IN_PROGRESS,
      );

      expect(result.isValid).toBe(true);
    });

    it('should allow unblocking blocked milestones', async () => {
      const result = await service.validateStatusTransition(
        MilestoneStatus.BLOCKED,
        MilestoneStatus.IN_PROGRESS,
      );

      expect(result.isValid).toBe(true);
    });
  });

  describe('getBlockedMilestones', () => {
    it('should return blocked milestones for supervisor', async () => {
      const blockedMilestones = [
        {
          ...mockMilestone,
          status: MilestoneStatus.BLOCKED,
          blockingReason: 'Issue 1',
        } as any,
        {
          ...mockMilestone,
          id: 'milestone-2',
          status: MilestoneStatus.BLOCKED,
          blockingReason: 'Issue 2',
        } as any,
      ];

      milestoneRepository.find.mockResolvedValue(blockedMilestones);

      const result = await service.getBlockedMilestones('supervisor-id');

      expect(result).toHaveLength(2);
      expect(result.every((m) => m.status === MilestoneStatus.BLOCKED)).toBe(
        true,
      );
    });

    it('should filter milestones by supervisor', async () => {
      const blockedMilestones = [
        {
          ...mockMilestone,
          status: MilestoneStatus.BLOCKED,
          project: { ...mockProject, supervisorId: 'supervisor-id' },
        } as any,
        {
          ...mockMilestone,
          id: 'milestone-2',
          status: MilestoneStatus.BLOCKED,
          project: { ...mockProject, supervisorId: 'other-supervisor' },
        } as any,
      ];

      milestoneRepository.find.mockResolvedValue(blockedMilestones);

      const result = await service.getBlockedMilestones('supervisor-id');

      expect(result).toHaveLength(1);
      expect(result[0].project?.supervisorId).toBe('supervisor-id');
    });
  });

  describe('unblockMilestone', () => {
    it('should unblock a blocked milestone', async () => {
      const blockedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.BLOCKED,
      } as any;

      milestoneRepository.findOne.mockResolvedValue(blockedMilestone);
      userRepository.findOne.mockResolvedValue(mockSupervisor);
      milestoneRepository.save.mockResolvedValue({
        ...blockedMilestone,
        status: MilestoneStatus.IN_PROGRESS,
      } as any);
      milestoneNoteRepository.create.mockReturnValue({} as MilestoneNote);
      milestoneNoteRepository.save.mockResolvedValue({} as MilestoneNote);
      milestoneNoteRepository.findOne.mockResolvedValue({} as MilestoneNote);

      const result = await service.unblockMilestone(
        'milestone-id',
        'supervisor-id',
        'Issue resolved',
      );

      expect(result.milestone).toBeDefined();
      expect(milestoneRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          status: MilestoneStatus.IN_PROGRESS,
          blockingReason: null,
        }),
      );
    });

    it('should reject unblocking non-blocked milestone', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      userRepository.findOne.mockResolvedValue(mockSupervisor);

      await expect(
        service.unblockMilestone(
          'milestone-id',
          'supervisor-id',
          'Issue resolved',
        ),
      ).rejects.toThrow(MilestoneValidationException);
    });
  });
});
