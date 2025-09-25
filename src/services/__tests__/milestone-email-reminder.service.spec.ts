import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { MilestoneEmailReminderService } from '../milestone-email-reminder.service';
import { EmailService } from '../../auth/services/email.service';
import { MilestoneReminder } from '../../entities/milestone-reminder.entity';
import { Milestone } from '../../entities/milestone.entity';
import { User } from '../../entities/user.entity';
import { Project } from '../../entities/project.entity';
import { ReminderType } from '../../common/enums/reminder-type.enum';
import { MilestoneStatus } from '../../common/enums/milestone-status.enum';
import { Priority } from '../../common/enums/priority.enum';
import { UserRole } from '../../common/enums/user-role.enum';

describe('MilestoneEmailReminderService', () => {
  let service: MilestoneEmailReminderService;
  let emailService: jest.Mocked<EmailService>;
  let reminderRepository: jest.Mocked<Repository<MilestoneReminder>>;
  let milestoneRepository: jest.Mocked<Repository<Milestone>>;
  let userRepository: jest.Mocked<Repository<User>>;
  let projectRepository: jest.Mocked<Repository<Project>>;

  const mockQueryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        MilestoneEmailReminderService,
        {
          provide: EmailService,
          useValue: {
            sendEmail: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(MilestoneReminder),
          useValue: {
            save: jest.fn(),
            find: jest.fn(),
            createQueryBuilder: jest.fn(() => mockQueryBuilder),
          },
        },
        {
          provide: getRepositoryToken(Milestone),
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
          provide: getRepositoryToken(Project),
          useValue: {
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<MilestoneEmailReminderService>(
      MilestoneEmailReminderService,
    );
    emailService = module.get(EmailService);
    reminderRepository = module.get(getRepositoryToken(MilestoneReminder));
    milestoneRepository = module.get(getRepositoryToken(Milestone));
    userRepository = module.get(getRepositoryToken(User));
    projectRepository = module.get(getRepositoryToken(Project));

    // Reset mocks
    jest.clearAllMocks();
  });

  describe('sendMilestoneReminder', () => {
    const mockStudent: User = {
      id: 'student-1',
      email: 'student@test.com',
      role: UserRole.STUDENT,
    } as User;

    const mockProject: Project = {
      id: 'project-1',
      title: 'Test Project',
      supervisorId: 'supervisor-1',
    } as Project;

    const mockMilestone: Milestone = {
      id: 'milestone-1',
      title: 'Test Milestone',
      description: 'Test Description',
      dueDate: new Date('2024-06-01'),
      status: MilestoneStatus.NOT_STARTED,
      priority: Priority.MEDIUM,
      studentId: 'student-1',
      student: mockStudent,
      project: mockProject,
      getDaysUntilDue: jest.fn().mockReturnValue(3),
      isOverdue: jest.fn().mockReturnValue(false),
      canTransitionTo: jest.fn().mockReturnValue(true),
      getProgressPercentage: jest.fn().mockReturnValue(0),
    } as any;

    const mockReminder: MilestoneReminder = {
      id: 'reminder-1',
      milestoneId: 'milestone-1',
      reminderType: ReminderType.EMAIL,
      daysBefore: 3,
      sent: false,
      markAsSent: jest.fn(),
      markAsFailed: jest.fn(),
    } as any;

    it('should send milestone reminder successfully', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      emailService.sendEmail.mockResolvedValue();
      reminderRepository.save.mockResolvedValue(mockReminder);

      const result = await service.sendMilestoneReminder(mockReminder);

      expect(result.success).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalled();
      expect(mockReminder.markAsSent).toHaveBeenCalled();
      expect(reminderRepository.save).toHaveBeenCalledWith(mockReminder);
    });

    it('should skip reminder for completed milestone', async () => {
      const completedMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.COMPLETED,
      } as Milestone;
      milestoneRepository.findOne.mockResolvedValue(completedMilestone);

      const result = await service.sendMilestoneReminder(mockReminder);

      expect(result.success).toBe(true);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(mockReminder.markAsSent).not.toHaveBeenCalled();
    });

    it('should skip reminder for cancelled milestone', async () => {
      const cancelledMilestone = {
        ...mockMilestone,
        status: MilestoneStatus.CANCELLED,
      } as Milestone;
      milestoneRepository.findOne.mockResolvedValue(cancelledMilestone);

      const result = await service.sendMilestoneReminder(mockReminder);

      expect(result.success).toBe(true);
      expect(emailService.sendEmail).not.toHaveBeenCalled();
      expect(mockReminder.markAsSent).not.toHaveBeenCalled();
    });

    it('should handle milestone not found', async () => {
      milestoneRepository.findOne.mockResolvedValue(null);

      const result = await service.sendMilestoneReminder(mockReminder);

      expect(result.success).toBe(false);
      expect(result.error).toContain('Milestone milestone-1 not found');
      expect(mockReminder.markAsFailed).toHaveBeenCalled();
    });

    it('should handle email sending failure', async () => {
      milestoneRepository.findOne.mockResolvedValue(mockMilestone);
      emailService.sendEmail.mockRejectedValue(
        new Error('Email service error'),
      );
      reminderRepository.save.mockResolvedValue(mockReminder);

      const result = await service.sendMilestoneReminder(mockReminder);

      expect(result.success).toBe(false);
      expect(result.error).toBe('Email service error');
      expect(mockReminder.markAsFailed).toHaveBeenCalledWith(
        'Email service error',
      );
    });

    it('should send email with correct subject for overdue milestone', async () => {
      const overdueMilestone = {
        ...mockMilestone,
        getDaysUntilDue: jest.fn().mockReturnValue(-2),
      } as unknown as Milestone;
      milestoneRepository.findOne.mockResolvedValue(overdueMilestone);
      emailService.sendEmail.mockResolvedValue();
      reminderRepository.save.mockResolvedValue(mockReminder);

      await service.sendMilestoneReminder(mockReminder);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Overdue:'),
        }),
      );
    });

    it('should send email with correct subject for due tomorrow', async () => {
      const tomorrowMilestone = {
        ...mockMilestone,
        getDaysUntilDue: jest.fn().mockReturnValue(1),
      } as unknown as Milestone;
      milestoneRepository.findOne.mockResolvedValue(tomorrowMilestone);
      emailService.sendEmail.mockResolvedValue();
      reminderRepository.save.mockResolvedValue(mockReminder);

      await service.sendMilestoneReminder(mockReminder);

      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: expect.stringContaining('Due Tomorrow:'),
        }),
      );
    });
  });

  describe('sendSupervisorEscalation', () => {
    const mockStudent: User = {
      id: 'student-1',
      email: 'student@test.com',
      role: UserRole.STUDENT,
    } as User;

    const mockSupervisor: User = {
      id: 'supervisor-1',
      email: 'supervisor@test.com',
      role: UserRole.SUPERVISOR,
    } as User;

    const mockProject: Project = {
      id: 'project-1',
      title: 'Test Project',
      supervisorId: 'supervisor-1',
    } as Project;

    const mockMilestone: Milestone = {
      id: 'milestone-1',
      title: 'Overdue Milestone',
      description: 'Test Description',
      dueDate: new Date('2024-05-01'),
      status: MilestoneStatus.IN_PROGRESS,
      student: mockStudent,
      project: mockProject,
      blockingReason: 'Waiting for resources',
      getDaysUntilDue: jest.fn().mockReturnValue(-5),
    } as any;

    it('should send supervisor escalation email successfully', async () => {
      userRepository.findOne.mockResolvedValue(mockSupervisor);
      emailService.sendEmail.mockResolvedValue();

      const result = await service.sendSupervisorEscalation(mockMilestone);

      expect(result.success).toBe(true);
      expect(emailService.sendEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: mockSupervisor.email,
          subject: expect.stringContaining('Overdue Milestone Alert:'),
        }),
      );
    });

    it('should handle no supervisor found', async () => {
      userRepository.findOne.mockResolvedValue(null);

      const result = await service.sendSupervisorEscalation(mockMilestone);

      expect(result.success).toBe(false);
      expect(result.error).toBe('No supervisor found for escalation');
    });

    it('should find fallback supervisor if project supervisor not found', async () => {
      const milestoneWithoutProjectSupervisor = {
        ...mockMilestone,
        project: { ...mockProject, supervisorId: 'nonexistent-supervisor' },
      } as unknown as Milestone;

      userRepository.findOne
        .mockResolvedValueOnce(null) // First call for project supervisor
        .mockResolvedValueOnce(mockSupervisor); // Second call for fallback supervisor

      emailService.sendEmail.mockResolvedValue();

      const result = await service.sendSupervisorEscalation(
        milestoneWithoutProjectSupervisor,
      );

      expect(result.success).toBe(true);
      expect(userRepository.findOne).toHaveBeenCalledTimes(2);
    });
  });

  describe('processBatchReminders', () => {
    const mockReminders: MilestoneReminder[] = [
      {
        id: 'reminder-1',
        milestoneId: 'milestone-1',
        reminderType: ReminderType.EMAIL,
      } as MilestoneReminder,
      {
        id: 'reminder-2',
        milestoneId: 'milestone-2',
        reminderType: ReminderType.EMAIL,
      } as MilestoneReminder,
    ];

    it('should process batch of reminders successfully', async () => {
      jest
        .spyOn(service, 'sendMilestoneReminder')
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: true });

      const result = await service.processBatchReminders(mockReminders);

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(2);
      expect(result.failed).toBe(0);
      expect(result.errors).toHaveLength(0);
    });

    it('should handle mixed success and failure in batch', async () => {
      jest
        .spyOn(service, 'sendMilestoneReminder')
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: 'Email failed' });

      const result = await service.processBatchReminders(mockReminders);

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('Reminder reminder-2: Email failed');
    });

    it('should handle exceptions during batch processing', async () => {
      jest
        .spyOn(service, 'sendMilestoneReminder')
        .mockResolvedValueOnce({ success: true })
        .mockRejectedValueOnce(new Error('Unexpected error'));

      const result = await service.processBatchReminders(mockReminders);

      expect(result.processed).toBe(2);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(1);
      expect(result.errors).toContain('Reminder reminder-2: Unexpected error');
    });
  });

  describe('getReminderHistory', () => {
    it('should return reminder history for a milestone', async () => {
      const mockHistory = [
        { id: 'reminder-1', milestoneId: 'milestone-1', sent: true },
        { id: 'reminder-2', milestoneId: 'milestone-1', sent: false },
      ];
      reminderRepository.find.mockResolvedValue(
        mockHistory as MilestoneReminder[],
      );

      const result = await service.getReminderHistory('milestone-1');

      expect(result).toEqual(mockHistory);
      expect(reminderRepository.find).toHaveBeenCalledWith({
        where: { milestoneId: 'milestone-1' },
        order: { createdAt: 'DESC' },
      });
    });
  });

  describe('retryFailedReminders', () => {
    const mockFailedReminders = [
      {
        id: 'reminder-1',
        milestoneId: 'milestone-1',
        sent: false,
        retryCount: 1,
      } as MilestoneReminder,
    ];

    it('should retry failed reminders successfully', async () => {
      mockQueryBuilder.getMany.mockResolvedValue(mockFailedReminders);
      jest
        .spyOn(service, 'sendMilestoneReminder')
        .mockResolvedValue({ success: true });

      const result = await service.retryFailedReminders();

      expect(result.retried).toBe(1);
      expect(result.successful).toBe(1);
      expect(result.failed).toBe(0);
    });

    it('should handle retry failures', async () => {
      mockQueryBuilder.getMany.mockResolvedValue(mockFailedReminders);
      jest
        .spyOn(service, 'sendMilestoneReminder')
        .mockResolvedValue({ success: false, error: 'Still failing' });

      const result = await service.retryFailedReminders();

      expect(result.retried).toBe(1);
      expect(result.successful).toBe(0);
      expect(result.failed).toBe(1);
    });
  });
});
