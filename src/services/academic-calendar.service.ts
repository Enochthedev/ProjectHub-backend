import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Between, LessThanOrEqual, MoreThanOrEqual } from 'typeorm';
import {
  AcademicCalendar,
  AcademicEventType,
  AcademicSemester,
} from '../entities/academic-calendar.entity';
import { AdminAuditService } from './admin-audit.service';
import {
  CreateAcademicEventDto,
  UpdateAcademicEventDto,
  AcademicCalendarFiltersDto,
  AcademicYearConfigDto,
  MilestoneAdjustmentDto,
  CalendarImportDto,
} from '../dto/admin/academic-calendar.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { addDays, addWeeks, isWeekend, format } from 'date-fns';

/**
 * Academic Calendar Service
 *
 * Manages academic calendar events with automatic milestone adjustment
 * and deadline calculation capabilities
 */
@Injectable()
export class AcademicCalendarService {
  private readonly logger = new Logger(AcademicCalendarService.name);

  constructor(
    @InjectRepository(AcademicCalendar)
    private readonly calendarRepository: Repository<AcademicCalendar>,
    private readonly auditService: AdminAuditService,
  ) {}

  /**
   * Get academic calendar events with filtering
   */
  async getCalendarEvents(
    filters: AcademicCalendarFiltersDto,
  ): Promise<PaginatedResponse<AcademicCalendar>> {
    const queryBuilder = this.calendarRepository
      .createQueryBuilder('event')
      .leftJoinAndSelect('event.importedByUser', 'user');

    // Apply filters
    if (filters.academicYear) {
      queryBuilder.andWhere('event.academicYear = :academicYear', {
        academicYear: filters.academicYear,
      });
    }

    if (filters.semester) {
      queryBuilder.andWhere('event.semester = :semester', {
        semester: filters.semester,
      });
    }

    if (filters.eventType) {
      queryBuilder.andWhere('event.eventType = :eventType', {
        eventType: filters.eventType,
      });
    }

    if (filters.startDate) {
      queryBuilder.andWhere('event.startDate >= :startDate', {
        startDate: filters.startDate,
      });
    }

    if (filters.endDate) {
      queryBuilder.andWhere('event.startDate <= :endDate', {
        endDate: filters.endDate,
      });
    }

    if (filters.affectsMilestones !== undefined) {
      queryBuilder.andWhere('event.affectsMilestones = :affectsMilestones', {
        affectsMilestones: filters.affectsMilestones,
      });
    }

    if (filters.priority) {
      queryBuilder.andWhere('event.priority >= :priority', {
        priority: filters.priority,
      });
    }

    // Apply sorting
    const sortField = filters.sortBy || 'startDate';
    const sortOrder = filters.sortOrder || 'ASC';
    queryBuilder.orderBy(`event.${sortField}`, sortOrder);

    // Apply pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 100);
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const [items, total] = await queryBuilder.getManyAndCount();

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * Get academic calendar event by ID
   */
  async getCalendarEventById(id: string): Promise<AcademicCalendar> {
    const event = await this.calendarRepository.findOne({
      where: { id },
      relations: ['importedByUser'],
    });

    if (!event) {
      throw new NotFoundException(
        `Academic calendar event with ID '${id}' not found`,
      );
    }

    return event;
  }

  /**
   * Create new academic calendar event
   */
  async createCalendarEvent(
    createDto: CreateAcademicEventDto,
    adminId: string,
  ): Promise<AcademicCalendar> {
    // Validate date range
    if (createDto.endDate && createDto.startDate > createDto.endDate) {
      throw new BadRequestException('End date must be after start date');
    }

    // Check for conflicts with existing events
    const conflicts = await this.checkEventConflicts(
      createDto.startDate,
      createDto.endDate || createDto.startDate,
      createDto.eventType,
      createDto.academicYear,
      createDto.semester,
    );

    if (conflicts.length > 0) {
      this.logger.warn(`Creating event with ${conflicts.length} conflicts`, {
        conflicts: conflicts.map((c) => c.title),
      });
    }

    const event = this.calendarRepository.create({
      ...createDto,
      importedBy: adminId,
    });

    const savedEvent = await this.calendarRepository.save(event);

    // Log the creation
    await this.auditService.logAdminAction(
      adminId,
      'create',
      'academic_calendar',
      savedEvent.id,
      null,
      savedEvent,
    );

    this.logger.log(
      `Academic calendar event '${createDto.title}' created by admin ${adminId}`,
    );

    return savedEvent;
  }

  /**
   * Update academic calendar event
   */
  async updateCalendarEvent(
    id: string,
    updateDto: UpdateAcademicEventDto,
    adminId: string,
  ): Promise<AcademicCalendar> {
    const event = await this.getCalendarEventById(id);
    const oldValues = { ...event };

    // Validate date range if dates are being updated
    if (updateDto.startDate || updateDto.endDate) {
      const startDate = updateDto.startDate || event.startDate;
      const endDate =
        updateDto.endDate !== undefined ? updateDto.endDate : event.endDate;

      if (endDate && startDate > endDate) {
        throw new BadRequestException('End date must be after start date');
      }
    }

    // Update fields
    Object.assign(event, updateDto);

    const savedEvent = await this.calendarRepository.save(event);

    // Log the update
    await this.auditService.logAdminAction(
      adminId,
      'update',
      'academic_calendar',
      savedEvent.id,
      oldValues,
      savedEvent,
    );

    this.logger.log(
      `Academic calendar event '${event.title}' updated by admin ${adminId}`,
    );

    return savedEvent;
  }

  /**
   * Delete academic calendar event
   */
  async deleteCalendarEvent(id: string, adminId: string): Promise<void> {
    const event = await this.getCalendarEventById(id);

    await this.calendarRepository.remove(event);

    // Log the deletion
    await this.auditService.logAdminAction(
      adminId,
      'delete',
      'academic_calendar',
      event.id,
      event,
      null,
    );

    this.logger.log(
      `Academic calendar event '${event.title}' deleted by admin ${adminId}`,
    );
  }

  /**
   * Get academic year configuration
   */
  async getAcademicYearConfig(
    academicYear: number,
  ): Promise<AcademicYearConfigDto> {
    const events = await this.calendarRepository.find({
      where: { academicYear },
      order: { startDate: 'ASC' },
    });

    const semesters = {
      [AcademicSemester.FALL]: events.filter(
        (e) => e.semester === AcademicSemester.FALL,
      ),
      [AcademicSemester.SPRING]: events.filter(
        (e) => e.semester === AcademicSemester.SPRING,
      ),
      [AcademicSemester.SUMMER]: events.filter(
        (e) => e.semester === AcademicSemester.SUMMER,
      ),
    };

    const holidays = events.filter(
      (e) => e.eventType === AcademicEventType.HOLIDAY,
    );
    const breaks = events.filter(
      (e) => e.eventType === AcademicEventType.BREAK,
    );
    const examPeriods = events.filter(
      (e) => e.eventType === AcademicEventType.EXAM_PERIOD,
    );

    return {
      academicYear,
      semesters,
      holidays,
      breaks,
      examPeriods,
      totalEvents: events.length,
      yearStart: events.find(
        (e) => e.eventType === AcademicEventType.SEMESTER_START,
      )?.startDate,
      yearEnd:
        events.find((e) => e.eventType === AcademicEventType.SEMESTER_END)
          ?.endDate || undefined,
    };
  }

  /**
   * Calculate deadline adjustments based on academic calendar
   */
  async calculateDeadlineAdjustments(
    originalDate: Date,
    academicYear: number,
    semester: AcademicSemester,
  ): Promise<MilestoneAdjustmentDto> {
    const conflicts = await this.getConflictingEvents(
      originalDate,
      academicYear,
      semester,
    );

    if (conflicts.length === 0) {
      return {
        originalDate,
        adjustedDate: originalDate,
        adjustmentDays: 0,
        conflicts: [],
        recommendation: 'no_change',
        reason: 'No conflicts found',
      };
    }

    // Find the most appropriate adjustment
    let adjustedDate = new Date(originalDate);
    let adjustmentDays = 0;

    // Sort conflicts by severity
    const sortedConflicts = conflicts.sort((a, b) => b.priority - a.priority);
    const highestPriorityConflict = sortedConflicts[0];

    if (
      highestPriorityConflict.isExamPeriod() ||
      highestPriorityConflict.isCritical()
    ) {
      // Move deadline before exam period or critical event
      adjustedDate = this.findBusinessDayBefore(
        highestPriorityConflict.startDate,
        3,
      );
      adjustmentDays = Math.ceil(
        (originalDate.getTime() - adjustedDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
    } else if (highestPriorityConflict.isHolidayOrBreak()) {
      // Move deadline after holiday/break
      const endDate =
        highestPriorityConflict.endDate || highestPriorityConflict.startDate;
      adjustedDate = this.findBusinessDayAfter(endDate, 1);
      adjustmentDays = Math.ceil(
        (adjustedDate.getTime() - originalDate.getTime()) /
          (1000 * 60 * 60 * 24),
      );
    }

    return {
      originalDate,
      adjustedDate,
      adjustmentDays,
      conflicts,
      recommendation: this.getAdjustmentRecommendation(conflicts),
      reason: this.getAdjustmentReason(conflicts),
    };
  }

  /**
   * Import calendar events from external source
   */
  async importCalendarEvents(
    importDto: CalendarImportDto,
    adminId: string,
  ): Promise<{ imported: number; skipped: number; errors: string[] }> {
    const results: { imported: number; skipped: number; errors: string[] } = {
      imported: 0,
      skipped: 0,
      errors: [],
    };

    for (const eventData of importDto.events) {
      try {
        // Check if event already exists
        const existingEvent = await this.calendarRepository.findOne({
          where: {
            title: eventData.title,
            startDate: eventData.startDate,
            academicYear: eventData.academicYear,
            semester: eventData.semester,
          },
        });

        if (existingEvent && !importDto.overwrite) {
          results.skipped++;
          continue;
        }

        if (existingEvent && importDto.overwrite) {
          // Update existing event
          Object.assign(existingEvent, eventData, {
            importSource: importDto.source,
            importedBy: adminId,
          });
          await this.calendarRepository.save(existingEvent);
        } else {
          // Create new event
          const newEvent = this.calendarRepository.create({
            ...eventData,
            importSource: importDto.source,
            importedBy: adminId,
          });
          await this.calendarRepository.save(newEvent);
        }

        results.imported++;
      } catch (error) {
        results.errors.push(
          `Failed to import '${eventData.title}': ${error.message}`,
        );
      }
    }

    // Log the import operation
    await this.auditService.logAdminAction(
      adminId,
      'import',
      'academic_calendar',
      undefined,
      null,
      { source: importDto.source, results },
    );

    this.logger.log(
      `Calendar import completed: ${results.imported} imported, ${results.skipped} skipped`,
    );

    return results;
  }

  /**
   * Get events that conflict with a specific date
   */
  async getConflictingEvents(
    date: Date,
    academicYear: number,
    semester: AcademicSemester,
  ): Promise<AcademicCalendar[]> {
    return this.calendarRepository
      .createQueryBuilder('event')
      .where('event.academicYear = :academicYear', { academicYear })
      .andWhere('event.semester = :semester', { semester })
      .andWhere('event.affectsMilestones = true')
      .andWhere(
        '(event.startDate <= :date AND (event.endDate IS NULL OR event.endDate >= :date))',
        { date },
      )
      .orderBy('event.priority', 'DESC')
      .getMany();
  }

  /**
   * Check for conflicts between events
   */
  private async checkEventConflicts(
    startDate: Date,
    endDate: Date,
    eventType: AcademicEventType,
    academicYear: number,
    semester: AcademicSemester,
    excludeId?: string,
  ): Promise<AcademicCalendar[]> {
    const queryBuilder = this.calendarRepository
      .createQueryBuilder('event')
      .where('event.academicYear = :academicYear', { academicYear })
      .andWhere('event.semester = :semester', { semester })
      .andWhere(
        '(event.startDate <= :endDate AND (event.endDate IS NULL OR event.endDate >= :startDate))',
        { startDate, endDate },
      );

    if (excludeId) {
      queryBuilder.andWhere('event.id != :excludeId', { excludeId });
    }

    return queryBuilder.getMany();
  }

  /**
   * Find the nearest business day before a given date
   */
  private findBusinessDayBefore(date: Date, bufferDays: number = 1): Date {
    let adjustedDate = addDays(date, -bufferDays);

    while (isWeekend(adjustedDate)) {
      adjustedDate = addDays(adjustedDate, -1);
    }

    return adjustedDate;
  }

  /**
   * Find the nearest business day after a given date
   */
  private findBusinessDayAfter(date: Date, bufferDays: number = 1): Date {
    let adjustedDate = addDays(date, bufferDays);

    while (isWeekend(adjustedDate)) {
      adjustedDate = addDays(adjustedDate, 1);
    }

    return adjustedDate;
  }

  /**
   * Get adjustment recommendation based on conflicts
   */
  private getAdjustmentRecommendation(
    conflicts: AcademicCalendar[],
  ): 'no_change' | 'move_before' | 'move_after' | 'reschedule' {
    if (conflicts.length === 0) return 'no_change';

    const hasExamPeriod = conflicts.some((c) => c.isExamPeriod());
    const hasCriticalEvent = conflicts.some((c) => c.isCritical());
    const hasHoliday = conflicts.some((c) => c.isHolidayOrBreak());

    if (hasExamPeriod || hasCriticalEvent) {
      return 'move_before';
    } else if (hasHoliday) {
      return 'move_after';
    } else {
      return 'reschedule';
    }
  }

  /**
   * Get adjustment reason based on conflicts
   */
  private getAdjustmentReason(conflicts: AcademicCalendar[]): string {
    if (conflicts.length === 0) return 'No conflicts found';

    const conflictTypes = conflicts.map((c) => c.eventType).join(', ');
    return `Conflicts with: ${conflictTypes}`;
  }

  /**
   * Get current academic year and semester
   */
  async getCurrentAcademicPeriod(): Promise<{
    academicYear: number;
    semester: AcademicSemester;
  }> {
    const now = new Date();

    // Find the current semester based on active semester events
    const currentSemesterEvent = await this.calendarRepository
      .createQueryBuilder('event')
      .where('event.eventType IN (:...types)', {
        types: [
          AcademicEventType.SEMESTER_START,
          AcademicEventType.SEMESTER_END,
        ],
      })
      .andWhere('event.startDate <= :now', { now })
      .andWhere('(event.endDate IS NULL OR event.endDate >= :now)', { now })
      .orderBy('event.startDate', 'DESC')
      .getOne();

    if (currentSemesterEvent) {
      return {
        academicYear: currentSemesterEvent.academicYear,
        semester: currentSemesterEvent.semester,
      };
    }

    // Fallback: determine based on current date
    const currentYear = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    let academicYear: number;
    let semester: AcademicSemester;

    if (month >= 8 && month <= 12) {
      // Fall semester
      academicYear = currentYear;
      semester = AcademicSemester.FALL;
    } else if (month >= 1 && month <= 5) {
      // Spring semester
      academicYear = currentYear - 1; // Academic year starts in fall of previous calendar year
      semester = AcademicSemester.SPRING;
    } else {
      // Summer semester
      academicYear = currentYear - 1;
      semester = AcademicSemester.SUMMER;
    }

    return { academicYear, semester };
  }

  /**
   * Get upcoming deadlines and important dates
   */
  async getUpcomingEvents(days: number = 30): Promise<AcademicCalendar[]> {
    const now = new Date();
    const futureDate = addDays(now, days);

    return this.calendarRepository.find({
      where: {
        startDate: Between(now, futureDate),
        affectsMilestones: true,
      },
      order: { startDate: 'ASC', priority: 'DESC' },
    });
  }
}
