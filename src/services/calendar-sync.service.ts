import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Milestone } from '../entities/milestone.entity';
import { User } from '../entities/user.entity';
import { CalendarSync } from '../entities/calendar-sync.entity';
import { ICalExportService } from './ical-export.service';
import { MilestoneStatus, UserRole } from '../common/enums';
import {
  CalendarSyncException,
  MilestoneNotFoundException,
  MilestonePermissionException,
} from '../common/exceptions';

export enum CalendarProvider {
  GOOGLE = 'google',
  OUTLOOK = 'outlook',
  APPLE = 'apple',
  CALDAV = 'caldav',
}

export enum SyncStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

export interface CalendarSyncConfig {
  provider: CalendarProvider;
  calendarId: string;
  accessToken?: string;
  refreshToken?: string;
  serverUrl?: string; // For CalDAV
  username?: string; // For CalDAV
  password?: string; // For CalDAV
  syncInterval: number; // in minutes
  autoSync: boolean;
}

export interface SyncResult {
  syncId: string;
  status: SyncStatus;
  syncedCount: number;
  failedCount: number;
  errors: string[];
  lastSyncAt: Date;
}

@Injectable()
export class CalendarSyncService {
  private readonly logger = new Logger(CalendarSyncService.name);

  constructor(
    @InjectRepository(Milestone)
    private readonly milestoneRepository: Repository<Milestone>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(CalendarSync)
    private readonly calendarSyncRepository: Repository<CalendarSync>,
    private readonly iCalExportService: ICalExportService,
  ) {}

  /**
   * Create a new calendar sync configuration
   */
  async createSyncConfig(
    userId: string,
    config: CalendarSyncConfig,
  ): Promise<CalendarSync> {
    this.logger.log(
      `Creating calendar sync config for user ${userId} with provider ${config.provider}`,
    );

    // Validate user exists
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new MilestonePermissionException('User not found');
    }

    // Validate calendar access
    await this.validateCalendarAccess(config);

    const calendarSync = this.calendarSyncRepository.create({
      userId,
      provider: config.provider,
      calendarId: config.calendarId,
      accessToken: config.accessToken,
      refreshToken: config.refreshToken,
      serverUrl: config.serverUrl,
      username: config.username,
      password: config.password,
      syncInterval: config.syncInterval,
      autoSync: config.autoSync,
      status: SyncStatus.PENDING,
      lastSyncAt: null,
      syncErrors: [],
    });

    const savedSync = await this.calendarSyncRepository.save(calendarSync);

    this.logger.log(
      `Created calendar sync config ${savedSync.id} for user ${userId}`,
    );

    return savedSync;
  }

  /**
   * Update calendar sync configuration
   */
  async updateSyncConfig(
    syncId: string,
    userId: string,
    updates: Partial<CalendarSyncConfig>,
  ): Promise<CalendarSync> {
    this.logger.log(
      `Updating calendar sync config ${syncId} for user ${userId}`,
    );

    const calendarSync = await this.calendarSyncRepository.findOne({
      where: { id: syncId, userId },
    });

    if (!calendarSync) {
      throw new CalendarSyncException('Calendar sync configuration not found');
    }

    // Validate calendar access if credentials changed
    if (updates.accessToken || updates.refreshToken || updates.serverUrl) {
      const configToValidate = { ...calendarSync, ...updates };
      await this.validateCalendarAccess(configToValidate as CalendarSyncConfig);
    }

    Object.assign(calendarSync, updates);
    const updatedSync = await this.calendarSyncRepository.save(calendarSync);

    this.logger.log(`Updated calendar sync config ${syncId}`);

    return updatedSync;
  }

  /**
   * Delete calendar sync configuration
   */
  async deleteSyncConfig(syncId: string, userId: string): Promise<void> {
    this.logger.log(
      `Deleting calendar sync config ${syncId} for user ${userId}`,
    );

    const calendarSync = await this.calendarSyncRepository.findOne({
      where: { id: syncId, userId },
    });

    if (!calendarSync) {
      throw new CalendarSyncException('Calendar sync configuration not found');
    }

    await this.calendarSyncRepository.remove(calendarSync);

    this.logger.log(`Deleted calendar sync config ${syncId}`);
  }

  /**
   * Sync milestones to external calendar
   */
  async syncMilestones(syncId: string, userId: string): Promise<SyncResult> {
    this.logger.log(`Starting milestone sync for config ${syncId}`);

    const calendarSync = await this.calendarSyncRepository.findOne({
      where: { id: syncId, userId },
    });

    if (!calendarSync) {
      throw new CalendarSyncException('Calendar sync configuration not found');
    }

    // Update status to in progress
    calendarSync.status = SyncStatus.IN_PROGRESS;
    await this.calendarSyncRepository.save(calendarSync);

    try {
      // Get user's milestones
      const milestones = await this.milestoneRepository.find({
        where: {
          studentId: userId,
          status: MilestoneStatus.NOT_STARTED || MilestoneStatus.IN_PROGRESS,
        },
        relations: ['project'],
        order: { dueDate: 'ASC' },
      });

      let syncedCount = 0;
      let failedCount = 0;
      const errors: string[] = [];

      // Sync each milestone
      for (const milestone of milestones) {
        try {
          await this.syncSingleMilestone(milestone, calendarSync);
          syncedCount++;
        } catch (error) {
          failedCount++;
          errors.push(
            `Failed to sync milestone ${milestone.id}: ${error.message}`,
          );
          this.logger.error(`Failed to sync milestone ${milestone.id}`, error);
        }
      }

      // Update sync status
      const finalStatus =
        failedCount === 0
          ? SyncStatus.COMPLETED
          : syncedCount === 0
            ? SyncStatus.FAILED
            : SyncStatus.COMPLETED;

      calendarSync.status = finalStatus;
      calendarSync.lastSyncAt = new Date();
      calendarSync.syncErrors = errors;
      await this.calendarSyncRepository.save(calendarSync);

      const result: SyncResult = {
        syncId,
        status: finalStatus,
        syncedCount,
        failedCount,
        errors,
        lastSyncAt: calendarSync.lastSyncAt,
      };

      this.logger.log(
        `Completed milestone sync for config ${syncId}: ${syncedCount} synced, ${failedCount} failed`,
      );

      return result;
    } catch (error) {
      // Update status to failed
      calendarSync.status = SyncStatus.FAILED;
      calendarSync.syncErrors = [error.message];
      await this.calendarSyncRepository.save(calendarSync);

      throw new CalendarSyncException('Sync operation failed', {
        error: error.message,
      });
    }
  }

  /**
   * Get sync status for a user
   */
  async getSyncConfigs(userId: string): Promise<CalendarSync[]> {
    return this.calendarSyncRepository.find({
      where: { userId },
      order: { createdAt: 'DESC' },
    });
  }

  /**
   * Get sync history for a configuration
   */
  async getSyncHistory(syncId: string, userId: string): Promise<CalendarSync> {
    const calendarSync = await this.calendarSyncRepository.findOne({
      where: { id: syncId, userId },
    });

    if (!calendarSync) {
      throw new CalendarSyncException('Calendar sync configuration not found');
    }

    return calendarSync;
  }

  /**
   * Handle milestone updates by triggering sync
   */
  async handleMilestoneUpdate(milestoneId: string): Promise<void> {
    this.logger.log(`Handling milestone update for ${milestoneId}`);

    const milestone = await this.milestoneRepository.findOne({
      where: { id: milestoneId },
      relations: ['student'],
    });

    if (!milestone) {
      throw new MilestoneNotFoundException(milestoneId);
    }

    // Find auto-sync configurations for the student
    const autoSyncConfigs = await this.calendarSyncRepository.find({
      where: {
        userId: milestone.studentId,
        autoSync: true,
        status: SyncStatus.COMPLETED, // Only sync from previously successful configs
      },
    });

    // Trigger sync for each auto-sync configuration
    for (const config of autoSyncConfigs) {
      try {
        await this.syncMilestones(config.id, milestone.studentId);
      } catch (error) {
        this.logger.error(
          `Failed to auto-sync milestone update for config ${config.id}`,
          error,
        );
      }
    }
  }

  /**
   * Validate calendar access
   */
  private async validateCalendarAccess(
    config: CalendarSyncConfig,
  ): Promise<void> {
    this.logger.log(
      `Validating calendar access for provider ${config.provider}`,
    );

    try {
      switch (config.provider) {
        case CalendarProvider.GOOGLE:
          await this.validateGoogleCalendarAccess(config);
          break;
        case CalendarProvider.OUTLOOK:
          await this.validateOutlookCalendarAccess(config);
          break;
        case CalendarProvider.APPLE:
          await this.validateAppleCalendarAccess(config);
          break;
        case CalendarProvider.CALDAV:
          await this.validateCalDAVAccess(config);
          break;
        default:
          throw new CalendarSyncException(
            `Unsupported calendar provider: ${config.provider}`,
          );
      }
    } catch (error) {
      throw new CalendarSyncException(
        `Calendar validation failed: ${error.message}`,
      );
    }
  }

  /**
   * Sync a single milestone to external calendar
   */
  private async syncSingleMilestone(
    milestone: Milestone,
    calendarSync: CalendarSync,
  ): Promise<void> {
    this.logger.log(
      `Syncing milestone ${milestone.id} to ${calendarSync.provider} calendar`,
    );

    // Generate iCal data for the milestone
    const iCalResult = await this.iCalExportService.exportSingleMilestone(
      milestone.id,
      milestone.studentId,
    );

    // Sync based on provider
    switch (calendarSync.provider) {
      case CalendarProvider.GOOGLE:
        await this.syncToGoogleCalendar(
          milestone,
          calendarSync,
          iCalResult.calendar,
        );
        break;
      case CalendarProvider.OUTLOOK:
        await this.syncToOutlookCalendar(
          milestone,
          calendarSync,
          iCalResult.calendar,
        );
        break;
      case CalendarProvider.APPLE:
        await this.syncToAppleCalendar(
          milestone,
          calendarSync,
          iCalResult.calendar,
        );
        break;
      case CalendarProvider.CALDAV:
        await this.syncToCalDAV(milestone, calendarSync, iCalResult.calendar);
        break;
      default:
        throw new CalendarSyncException(
          `Unsupported calendar provider: ${calendarSync.provider}`,
        );
    }
  }

  /**
   * Google Calendar validation (placeholder)
   */
  private async validateGoogleCalendarAccess(
    config: CalendarSyncConfig,
  ): Promise<void> {
    // TODO: Implement Google Calendar API validation
    // This would involve:
    // 1. Validating access token
    // 2. Checking calendar permissions
    // 3. Testing calendar access

    if (!config.accessToken) {
      throw new Error('Google Calendar access token is required');
    }

    // Placeholder validation - in real implementation, make API call to Google
    this.logger.log('Google Calendar access validated (placeholder)');
  }

  /**
   * Outlook Calendar validation (placeholder)
   */
  private async validateOutlookCalendarAccess(
    config: CalendarSyncConfig,
  ): Promise<void> {
    // TODO: Implement Microsoft Graph API validation
    // This would involve:
    // 1. Validating access token
    // 2. Checking calendar permissions
    // 3. Testing calendar access

    if (!config.accessToken) {
      throw new Error('Outlook Calendar access token is required');
    }

    // Placeholder validation - in real implementation, make API call to Microsoft Graph
    this.logger.log('Outlook Calendar access validated (placeholder)');
  }

  /**
   * Apple Calendar validation (placeholder)
   */
  private async validateAppleCalendarAccess(
    config: CalendarSyncConfig,
  ): Promise<void> {
    // TODO: Implement Apple Calendar validation
    // This would typically use CalDAV protocol

    if (!config.serverUrl || !config.username || !config.password) {
      throw new Error(
        'Apple Calendar requires server URL, username, and password',
      );
    }

    // Placeholder validation - in real implementation, test CalDAV connection
    this.logger.log('Apple Calendar access validated (placeholder)');
  }

  /**
   * CalDAV validation (placeholder)
   */
  private async validateCalDAVAccess(
    config: CalendarSyncConfig,
  ): Promise<void> {
    // TODO: Implement CalDAV validation
    // This would involve:
    // 1. Testing connection to CalDAV server
    // 2. Validating credentials
    // 3. Checking calendar access

    if (!config.serverUrl || !config.username || !config.password) {
      throw new Error('CalDAV requires server URL, username, and password');
    }

    // Placeholder validation - in real implementation, test CalDAV connection
    this.logger.log('CalDAV access validated (placeholder)');
  }

  /**
   * Sync to Google Calendar (placeholder)
   */
  private async syncToGoogleCalendar(
    milestone: Milestone,
    calendarSync: CalendarSync,
    iCalData: string,
  ): Promise<void> {
    // TODO: Implement Google Calendar API sync
    // This would involve:
    // 1. Converting iCal to Google Calendar event format
    // 2. Creating or updating event in Google Calendar
    // 3. Handling event IDs for future updates

    this.logger.log(
      `Syncing milestone ${milestone.id} to Google Calendar (placeholder)`,
    );
  }

  /**
   * Sync to Outlook Calendar (placeholder)
   */
  private async syncToOutlookCalendar(
    milestone: Milestone,
    calendarSync: CalendarSync,
    iCalData: string,
  ): Promise<void> {
    // TODO: Implement Microsoft Graph API sync
    // This would involve:
    // 1. Converting iCal to Outlook event format
    // 2. Creating or updating event in Outlook Calendar
    // 3. Handling event IDs for future updates

    this.logger.log(
      `Syncing milestone ${milestone.id} to Outlook Calendar (placeholder)`,
    );
  }

  /**
   * Sync to Apple Calendar (placeholder)
   */
  private async syncToAppleCalendar(
    milestone: Milestone,
    calendarSync: CalendarSync,
    iCalData: string,
  ): Promise<void> {
    // TODO: Implement Apple Calendar sync via CalDAV
    // This would involve:
    // 1. Using CalDAV protocol to sync iCal data
    // 2. Creating or updating events
    // 3. Handling event UIDs for future updates

    this.logger.log(
      `Syncing milestone ${milestone.id} to Apple Calendar (placeholder)`,
    );
  }

  /**
   * Sync to CalDAV server (placeholder)
   */
  private async syncToCalDAV(
    milestone: Milestone,
    calendarSync: CalendarSync,
    iCalData: string,
  ): Promise<void> {
    // TODO: Implement CalDAV sync
    // This would involve:
    // 1. Using CalDAV protocol to sync iCal data
    // 2. Creating or updating events on CalDAV server
    // 3. Handling event UIDs for future updates

    this.logger.log(
      `Syncing milestone ${milestone.id} to CalDAV server (placeholder)`,
    );
  }
}
