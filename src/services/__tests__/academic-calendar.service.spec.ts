import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AcademicCalendarService } from '../academic-calendar.service';
import {
  AcademicCalendar,
  AcademicEventType,
  AcademicSemester,
} from '../../entities/academic-calendar.entity';
import { AdminAuditService } from '../admin-audit.service';
import {
  CreateAcademicEventDto,
  UpdateAcademicEventDto,
  AcademicCalendarFiltersDto,
  CalendarImportDto,
} from '../../dto/admin/academic-calendar.dto';

describe('AcademicCalendarService', () => {
  let service: AcademicCalendarService;
  let calendarRepository: jest.Mocked<Repository<AcademicCalendar>>;
  let auditService: jest.Mocked<AdminAuditService>;

  const mockEvent: AcademicCalendar = {
    id: '1',
    title: 'Fall Semester Start',
    description: 'Beginning of fall semester',
    eventType: AcademicEventType.SEMESTER_START,
    startDate: new Date('2024-08-26'),
    endDate: null,
    semester: AcademicSemester.FALL,
    academicYear: 2024,
    isRecurring: true,
    affectsMilestones: true,
    priority: 4,
    importSource: null,
    importedByUser: null,
    importedBy: null,
    metadata: {},
    createdAt: new Date(),
    updatedAt: new Date(),
    isActive: jest.fn().mockReturnValue(true),
    getDuration: jest.fn().mockReturnValue(1),
    isHighPriority: jest.fn().mockReturnValue(true),
    isCritical: jest.fn().mockReturnValue(false),
    conflictsWith: jest.fn().mockReturnValue(false),
    getConflictSeverity: jest.fn().mockReturnValue('high'),
    isExamPeriod: jest.fn().mockReturnValue(false),
    isHolidayOrBreak: jest.fn().mockReturnValue(false),
    isSemesterBoundary: jest.fn().mockReturnValue(true),
  } as AcademicCalendar;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      where: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockEvent], 1]),
      getMany: jest.fn().mockResolvedValue([mockEvent]),
      getOne: jest.fn().mockResolvedValue(mockEvent),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AcademicCalendarService,
        {
          provide: getRepositoryToken(AcademicCalendar),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            remove: jest.fn(),
            createQueryBuilder: jest.fn().mockReturnValue(mockQueryBuilder),
          },
        },
        {
          provide: AdminAuditService,
          useValue: {
            logAdminAction: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<AcademicCalendarService>(AcademicCalendarService);
    calendarRepository = module.get(getRepositoryToken(AcademicCalendar));
    auditService = module.get(AdminAuditService);
  });

  describe('getCalendarEvents', () => {
    it('should return paginated calendar events', async () => {
      const filters: AcademicCalendarFiltersDto = {
        academicYear: 2024,
        semester: AcademicSemester.FALL,
        page: 1,
        limit: 50,
      };

      const result = await service.getCalendarEvents(filters);

      expect(result).toEqual({
        items: [mockEvent],
        total: 1,
        page: 1,
        limit: 50,
        totalPages: 1,
      });
    });

    it('should apply filters correctly', async () => {
      const filters: AcademicCalendarFiltersDto = {
        academicYear: 2024,
        eventType: AcademicEventType.SEMESTER_START,
        affectsMilestones: true,
      };

      await service.getCalendarEvents(filters);

      expect(calendarRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getCalendarEventById', () => {
    it('should return calendar event by id', async () => {
      calendarRepository.findOne.mockResolvedValue(mockEvent);

      const result = await service.getCalendarEventById('1');

      expect(result).toEqual(mockEvent);
      expect(calendarRepository.findOne).toHaveBeenCalledWith({
        where: { id: '1' },
        relations: ['importedByUser'],
      });
    });

    it('should throw NotFoundException when event not found', async () => {
      calendarRepository.findOne.mockResolvedValue(null);

      await expect(service.getCalendarEventById('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createCalendarEvent', () => {
    const createDto: CreateAcademicEventDto = {
      title: 'New Event',
      description: 'Test event',
      eventType: AcademicEventType.HOLIDAY,
      startDate: new Date('2024-12-25'),
      endDate: new Date('2024-12-25'),
      semester: AcademicSemester.FALL,
      academicYear: 2024,
      priority: 3,
    };

    it('should create new calendar event', async () => {
      calendarRepository.create.mockReturnValue(mockEvent);
      calendarRepository.save.mockResolvedValue(mockEvent);
      // Mock checkEventConflicts method
      jest.spyOn(service as any, 'checkEventConflicts').mockResolvedValue([]);

      const result = await service.createCalendarEvent(createDto, 'admin1');

      expect(result).toEqual(mockEvent);
      expect(calendarRepository.create).toHaveBeenCalledWith({
        ...createDto,
        importedBy: 'admin1',
      });
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'create',
        'academic_calendar',
        mockEvent.id,
        null,
        mockEvent,
      );
    });

    it('should throw BadRequestException when end date is before start date', async () => {
      const invalidDto = {
        ...createDto,
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-20'),
      };

      await expect(
        service.createCalendarEvent(invalidDto, 'admin1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateCalendarEvent', () => {
    const updateDto: UpdateAcademicEventDto = {
      title: 'Updated Event',
      description: 'Updated description',
    };

    it('should update calendar event', async () => {
      calendarRepository.findOne.mockResolvedValue(mockEvent);
      const updatedEvent = Object.assign({}, mockEvent, updateDto);
      calendarRepository.save.mockResolvedValue(updatedEvent);

      const result = await service.updateCalendarEvent(
        '1',
        updateDto,
        'admin1',
      );

      expect(calendarRepository.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'update',
        'academic_calendar',
        mockEvent.id,
        expect.any(Object),
        expect.any(Object),
      );
    });

    it('should validate date range when updating dates', async () => {
      calendarRepository.findOne.mockResolvedValue(mockEvent);

      const invalidUpdateDto = {
        startDate: new Date('2024-12-25'),
        endDate: new Date('2024-12-20'),
      };

      await expect(
        service.updateCalendarEvent('1', invalidUpdateDto, 'admin1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteCalendarEvent', () => {
    it('should delete calendar event', async () => {
      calendarRepository.findOne.mockResolvedValue(mockEvent);
      calendarRepository.remove.mockResolvedValue(mockEvent);

      await service.deleteCalendarEvent('1', 'admin1');

      expect(calendarRepository.remove).toHaveBeenCalledWith(mockEvent);
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'delete',
        'academic_calendar',
        mockEvent.id,
        mockEvent,
        null,
      );
    });
  });

  describe('getAcademicYearConfig', () => {
    it('should return academic year configuration', async () => {
      calendarRepository.find.mockResolvedValue([mockEvent]);

      const result = await service.getAcademicYearConfig(2024);

      expect(result).toEqual({
        academicYear: 2024,
        semesters: {
          [AcademicSemester.FALL]: [mockEvent],
          [AcademicSemester.SPRING]: [],
          [AcademicSemester.SUMMER]: [],
        },
        holidays: [],
        breaks: [],
        examPeriods: [],
        totalEvents: 1,
        yearStart: mockEvent.startDate,
        yearEnd: undefined,
      });
    });
  });

  describe('calculateDeadlineAdjustments', () => {
    it('should return no adjustment when no conflicts', async () => {
      jest.spyOn(service, 'getConflictingEvents').mockResolvedValue([]);

      const originalDate = new Date('2024-10-15');
      const result = await service.calculateDeadlineAdjustments(
        originalDate,
        2024,
        AcademicSemester.FALL,
      );

      expect(result).toEqual({
        originalDate,
        adjustedDate: originalDate,
        adjustmentDays: 0,
        conflicts: [],
        recommendation: 'no_change',
        reason: 'No conflicts found',
      });
    });

    it('should adjust deadline when conflicts exist', async () => {
      const examEvent = Object.assign({}, mockEvent, {
        eventType: AcademicEventType.EXAM_PERIOD,
        startDate: new Date('2024-10-15'),
        priority: 5,
        isExamPeriod: jest.fn().mockReturnValue(true),
        isCritical: jest.fn().mockReturnValue(true),
      });

      jest
        .spyOn(service, 'getConflictingEvents')
        .mockResolvedValue([examEvent]);

      const originalDate = new Date('2024-10-15');
      const result = await service.calculateDeadlineAdjustments(
        originalDate,
        2024,
        AcademicSemester.FALL,
      );

      expect(result.conflicts).toHaveLength(1);
      expect(result.recommendation).toBe('move_before');
      expect(result.adjustmentDays).toBeGreaterThan(0);
    });
  });

  describe('importCalendarEvents', () => {
    const importDto: CalendarImportDto = {
      source: 'test-import',
      overwrite: false,
      events: [
        {
          title: 'Imported Event',
          eventType: AcademicEventType.HOLIDAY,
          startDate: new Date('2024-12-25'),
          semester: AcademicSemester.FALL,
          academicYear: 2024,
        },
      ],
    };

    it('should import calendar events', async () => {
      calendarRepository.findOne.mockResolvedValue(null); // No existing event
      calendarRepository.create.mockReturnValue(mockEvent);
      calendarRepository.save.mockResolvedValue(mockEvent);

      const result = await service.importCalendarEvents(importDto, 'admin1');

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(auditService.logAdminAction).toHaveBeenCalled();
    });

    it('should skip existing events when overwrite is false', async () => {
      calendarRepository.findOne.mockResolvedValue(mockEvent); // Existing event

      const result = await service.importCalendarEvents(importDto, 'admin1');

      expect(result.imported).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should overwrite existing events when overwrite is true', async () => {
      const overwriteDto = { ...importDto, overwrite: true };
      calendarRepository.findOne.mockResolvedValue(mockEvent); // Existing event
      calendarRepository.save.mockResolvedValue(mockEvent);

      const result = await service.importCalendarEvents(overwriteDto, 'admin1');

      expect(result.imported).toBe(1);
      expect(result.skipped).toBe(0);
    });
  });

  describe('getConflictingEvents', () => {
    it('should return conflicting events for a date', async () => {
      const mockQueryBuilder = calendarRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([mockEvent]);

      const result = await service.getConflictingEvents(
        new Date('2024-08-26'),
        2024,
        AcademicSemester.FALL,
      );

      expect(result).toEqual([mockEvent]);
    });
  });

  describe('getCurrentAcademicPeriod', () => {
    it('should return current academic period based on active semester', async () => {
      const mockQueryBuilder = calendarRepository.createQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(mockEvent);

      const result = await service.getCurrentAcademicPeriod();

      expect(result).toEqual({
        academicYear: mockEvent.academicYear,
        semester: mockEvent.semester,
      });
    });

    it('should fallback to date-based calculation when no active semester found', async () => {
      const mockQueryBuilder = calendarRepository.createQueryBuilder();
      mockQueryBuilder.getOne = jest.fn().mockResolvedValue(null);

      // Mock current date to be in fall semester (September)
      const mockDate = new Date('2024-09-15');
      jest.spyOn(global, 'Date').mockImplementation(() => mockDate as any);

      const result = await service.getCurrentAcademicPeriod();

      expect(result.academicYear).toBe(2024);
      expect(result.semester).toBe(AcademicSemester.FALL);

      // Restore Date
      (global.Date as any).mockRestore();
    });
  });

  describe('getUpcomingEvents', () => {
    it('should return upcoming events within specified days', async () => {
      calendarRepository.find.mockResolvedValue([mockEvent]);

      const result = await service.getUpcomingEvents(30);

      expect(result).toEqual([mockEvent]);
      expect(calendarRepository.find).toHaveBeenCalledWith({
        where: {
          startDate: expect.any(Object), // Between clause
          affectsMilestones: true,
        },
        order: { startDate: 'ASC', priority: 'DESC' },
      });
    });
  });
});
