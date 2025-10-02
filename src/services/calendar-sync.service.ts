import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Milestone } from '../entities/milestone.entity';
import { User } from '../entities/user.entity';
import {
  CalendarSync,
  CalendarProvider,
  SyncStatus,
} from '../entities/calendar-sync.entity';
import { ICalExportService } from './ical-export.service';
import { MilestoneStatus } from '../common/enums';
import {
  CalendarSyncException,
  MilestoneNotFoundException,
  MilestonePermissionException,
} from '../common/exceptions';
import { google } from 'googleapis';
import { Client } from '@microsoft/microsoft-graph-client';
import { AuthenticationProvider } from '@microsoft/microsoft-graph-client';
import ical from 'ical-generator';
import axios from 'axios';

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

interface GoogleCalendarEvent {
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  reminders: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
}

interface OutlookCalendarEvent {
  subject: string;
  body?: {
    contentType: string;
    content: string;
  };
  start: {
    dateTime: string;
    timeZone: string;
  };
  end: {
    dateTime: string;
    timeZone: string;
  };
  isReminderOn: boolean;
  reminderMinutesBeforeStart?: number;
}

/**
 * Custom authentication provider for Microsoft Graph API
 * Note: This implementation is required to match the AuthenticationProvider interface
 * which expects getAccessToken to return Promise<string>, not string
 *
 * WARNING: DO NOT REMOVE THE ASYNC KEYWORD OR CHANGE RETURN TYPE
 * The Microsoft Graph client requires Promise<string>, not string
 */
class MicrosoftGraphAuthProvider implements AuthenticationProvider {
  constructor(private accessToken: string) {}

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // prettier-ignore
  // CRITICAL: This MUST return Promise<string> to match AuthenticationProvider interface
  async getAccessToken(authenticationProviderOptions?: any): Promise<string> {
    return Promise.resolve(this.accessToken);
  }
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
    private readonly configService: ConfigService,
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
   * Google Calendar validation
   */
  private async validateGoogleCalendarAccess(
    config: CalendarSyncConfig,
  ): Promise<void> {
    if (!config.accessToken) {
      throw new Error('Google Calendar access token is required');
    }

    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: config.accessToken });

      const calendar = google.calendar({ version: 'v3', auth });

      // Test access by trying to get calendar info
      await calendar.calendars.get({ calendarId: config.calendarId });

      this.logger.log('Google Calendar access validated successfully');
    } catch (error) {
      this.logger.error('Google Calendar validation failed:', error);
      throw new Error(`Google Calendar validation failed: ${error.message}`);
    }
  }

  /**
   * Outlook Calendar validation
   */
  private async validateOutlookCalendarAccess(
    config: CalendarSyncConfig,
  ): Promise<void> {
    if (!config.accessToken) {
      throw new Error('Outlook Calendar access token is required');
    }

    try {
      const authProvider = new MicrosoftGraphAuthProvider(config.accessToken);
      const graphClient = Client.initWithMiddleware({ authProvider });

      // Test access by trying to get calendar info
      await graphClient.api(`/me/calendars/${config.calendarId}`).get();

      this.logger.log('Outlook Calendar access validated successfully');
    } catch (error) {
      this.logger.error('Outlook Calendar validation failed:', error);
      throw new Error(`Outlook Calendar validation failed: ${error.message}`);
    }
  }

  /**
   * Apple Calendar validation
   */
  private async validateAppleCalendarAccess(
    config: CalendarSyncConfig,
  ): Promise<void> {
    if (!config.serverUrl || !config.username || !config.password) {
      throw new Error(
        'Apple Calendar requires server URL, username, and password',
      );
    }

    try {
      // Test CalDAV connection with PROPFIND request
      const response = await axios({
        method: 'PROPFIND' as any,
        url: config.serverUrl,
        auth: {
          username: config.username,
          password: config.password,
        },
        headers: {
          'Content-Type': 'application/xml',
          Depth: '0',
        },
        data: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:">
            <D:prop>
              <D:displayname />
              <D:resourcetype />
            </D:prop>
          </D:propfind>`,
        timeout: 10000,
      });

      if (response.status === 207) {
        this.logger.log('Apple Calendar access validated successfully');
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      this.logger.error('Apple Calendar validation failed:', error);
      throw new Error(`Apple Calendar validation failed: ${error.message}`);
    }
  }

  /**
   * CalDAV validation
   */
  private async validateCalDAVAccess(
    config: CalendarSyncConfig,
  ): Promise<void> {
    if (!config.serverUrl || !config.username || !config.password) {
      throw new Error('CalDAV requires server URL, username, and password');
    }

    try {
      // Test CalDAV connection with OPTIONS request first
      const optionsResponse = await axios({
        method: 'OPTIONS',
        url: config.serverUrl,
        auth: {
          username: config.username,
          password: config.password,
        },
        timeout: 10000,
      });

      // Check if CalDAV is supported
      const davHeader = optionsResponse.headers['dav'];
      if (!davHeader || !davHeader.includes('calendar-access')) {
        throw new Error('Server does not support CalDAV calendar access');
      }

      // Test with PROPFIND to verify calendar access
      const propfindResponse = await axios({
        method: 'PROPFIND' as any,
        url: `${config.serverUrl}/${config.calendarId}/`,
        auth: {
          username: config.username,
          password: config.password,
        },
        headers: {
          'Content-Type': 'application/xml',
          Depth: '1',
        },
        data: `<?xml version="1.0" encoding="utf-8" ?>
          <D:propfind xmlns:D="DAV:" xmlns:C="urn:ietf:params:xml:ns:caldav">
            <D:prop>
              <D:displayname />
              <D:resourcetype />
              <C:supported-calendar-component-set />
            </D:prop>
          </D:propfind>`,
        timeout: 10000,
      });

      if (propfindResponse.status === 207) {
        this.logger.log('CalDAV access validated successfully');
      } else {
        throw new Error(
          `Unexpected response status: ${propfindResponse.status}`,
        );
      }
    } catch (error) {
      this.logger.error('CalDAV validation failed:', error);
      throw new Error(`CalDAV validation failed: ${error.message}`);
    }
  }

  /**
   * Sync to Google Calendar
   */
  private async syncToGoogleCalendar(
    milestone: Milestone,
    calendarSync: CalendarSync,
    iCalData: string,
  ): Promise<void> {
    try {
      const auth = new google.auth.OAuth2();
      auth.setCredentials({ access_token: calendarSync.accessToken });

      const calendar = google.calendar({ version: 'v3', auth });

      // Convert milestone to Google Calendar event format
      const event: GoogleCalendarEvent = {
        summary: `[FYP] ${milestone.title}`,
        description: `${milestone.description}\n\nProject: ${milestone.project?.title || 'N/A'}\nPriority: ${milestone.priority}\n\nGenerated by FYP Platform`,
        start: {
          dateTime: milestone.dueDate.toISOString(),
          timeZone: this.configService.get('DEFAULT_TIMEZONE', 'UTC'),
        },
        end: {
          dateTime: new Date(
            milestone.dueDate.getTime() + 2 * 60 * 60 * 1000,
          ).toISOString(), // 2 hours duration
          timeZone: this.configService.get('DEFAULT_TIMEZONE', 'UTC'),
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
      };

      // Check if event already exists (stored in metadata)
      const existingEventId = milestone.metadata?.googleEventId;

      if (existingEventId) {
        // Update existing event
        await calendar.events.update({
          calendarId: calendarSync.calendarId,
          eventId: existingEventId,
          requestBody: event,
        });

        this.logger.log(
          `Updated Google Calendar event ${existingEventId} for milestone ${milestone.id}`,
        );
      } else {
        // Create new event
        const response = await calendar.events.insert({
          calendarId: calendarSync.calendarId,
          requestBody: event,
        });

        // Store event ID in milestone metadata for future updates
        await this.milestoneRepository.update(milestone.id, {
          metadata: {
            ...(milestone.metadata || {}),
            googleEventId: response.data.id,
          },
        } as any);

        this.logger.log(
          `Created Google Calendar event ${response.data.id} for milestone ${milestone.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync milestone ${milestone.id} to Google Calendar:`,
        error,
      );
      throw new Error(`Google Calendar sync failed: ${error.message}`);
    }
  }

  /**
   * Sync to Outlook Calendar
   */
  private async syncToOutlookCalendar(
    milestone: Milestone,
    calendarSync: CalendarSync,
    iCalData: string,
  ): Promise<void> {
    try {
      const authProvider = new MicrosoftGraphAuthProvider(
        calendarSync.accessToken!,
      );
      const graphClient = Client.initWithMiddleware({ authProvider });

      // Convert milestone to Outlook event format
      const event: OutlookCalendarEvent = {
        subject: `[FYP] ${milestone.title}`,
        body: {
          contentType: 'text',
          content: `${milestone.description}\n\nProject: ${milestone.project?.title || 'N/A'}\nPriority: ${milestone.priority}\n\nGenerated by FYP Platform`,
        },
        start: {
          dateTime: milestone.dueDate.toISOString(),
          timeZone: this.configService.get('DEFAULT_TIMEZONE', 'UTC'),
        },
        end: {
          dateTime: new Date(
            milestone.dueDate.getTime() + 2 * 60 * 60 * 1000,
          ).toISOString(), // 2 hours duration
          timeZone: this.configService.get('DEFAULT_TIMEZONE', 'UTC'),
        },
        isReminderOn: true,
        reminderMinutesBeforeStart: 60, // 1 hour before
      };

      // Check if event already exists (stored in metadata)
      const existingEventId = milestone.metadata?.outlookEventId;

      if (existingEventId) {
        // Update existing event
        await graphClient
          .api(
            `/me/calendars/${calendarSync.calendarId}/events/${existingEventId}`,
          )
          .patch(event);

        this.logger.log(
          `Updated Outlook Calendar event ${existingEventId} for milestone ${milestone.id}`,
        );
      } else {
        // Create new event
        const response = await graphClient
          .api(`/me/calendars/${calendarSync.calendarId}/events`)
          .post(event);

        // Store event ID in milestone metadata for future updates
        await this.milestoneRepository.update(milestone.id, {
          metadata: {
            ...(milestone.metadata || {}),
            outlookEventId: response.id,
          },
        } as any);

        this.logger.log(
          `Created Outlook Calendar event ${response.id} for milestone ${milestone.id}`,
        );
      }
    } catch (error) {
      this.logger.error(
        `Failed to sync milestone ${milestone.id} to Outlook Calendar:`,
        error,
      );
      throw new Error(`Outlook Calendar sync failed: ${error.message}`);
    }
  }

  /**
   * Sync to Apple Calendar
   */
  private async syncToAppleCalendar(
    milestone: Milestone,
    calendarSync: CalendarSync,
    iCalData: string,
  ): Promise<void> {
    try {
      // Generate iCal event for the milestone
      const calendar = ical({ name: 'FYP Milestones' });

      const eventUid =
        milestone.metadata?.appleEventUid ||
        `milestone-${milestone.id}@fyp-platform.com`;

      calendar.createEvent({
        uid: eventUid,
        start: milestone.dueDate,
        end: new Date(milestone.dueDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours duration
        summary: `[FYP] ${milestone.title}`,
        description: `${milestone.description}\n\nProject: ${milestone.project?.title || 'N/A'}\nPriority: ${milestone.priority}\n\nGenerated by FYP Platform`,
        location: 'University of Ibadan',
        alarms: [
          {
            type: 'display' as any,
            trigger: 60 * 60, // 1 hour before
          },
          {
            type: 'display' as any,
            trigger: 24 * 60 * 60, // 1 day before
          },
        ],
      });

      const iCalContent = calendar.toString();

      // Use CalDAV to sync to Apple Calendar
      const eventUrl = `${calendarSync.serverUrl}/${calendarSync.calendarId}/${eventUid}.ics`;

      await axios.put(eventUrl, iCalContent, {
        auth: {
          username: calendarSync.username!,
          password: calendarSync.password!,
        },
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
          'If-None-Match': '*', // Only create if doesn't exist
        },
        timeout: 10000,
      });

      // Store event UID in milestone metadata for future updates
      if (!milestone.metadata?.appleEventUid) {
        await this.milestoneRepository.update(milestone.id, {
          metadata: {
            ...(milestone.metadata || {}),
            appleEventUid: eventUid,
          },
        } as any);
      }

      this.logger.log(
        `Synced milestone ${milestone.id} to Apple Calendar with UID ${eventUid}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync milestone ${milestone.id} to Apple Calendar:`,
        error,
      );
      throw new Error(`Apple Calendar sync failed: ${error.message}`);
    }
  }

  /**
   * Sync to CalDAV server
   */
  private async syncToCalDAV(
    milestone: Milestone,
    calendarSync: CalendarSync,
    iCalData: string,
  ): Promise<void> {
    try {
      // Generate iCal event for the milestone
      const calendar = ical({ name: 'FYP Milestones' });

      const eventUid =
        milestone.metadata?.caldavEventUid ||
        `milestone-${milestone.id}@fyp-platform.com`;

      calendar.createEvent({
        uid: eventUid,
        start: milestone.dueDate,
        end: new Date(milestone.dueDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours duration
        summary: `[FYP] ${milestone.title}`,
        description: `${milestone.description}\n\nProject: ${milestone.project?.title || 'N/A'}\nPriority: ${milestone.priority}\n\nGenerated by FYP Platform`,
        location: 'University of Ibadan',
        alarms: [
          {
            type: 'display' as any,
            trigger: 60 * 60, // 1 hour before
          },
          {
            type: 'display' as any,
            trigger: 24 * 60 * 60, // 1 day before
          },
        ],
      });

      const iCalContent = calendar.toString();

      // Use CalDAV to sync to server
      const eventUrl = `${calendarSync.serverUrl}/${calendarSync.calendarId}/${eventUid}.ics`;

      await axios.put(eventUrl, iCalContent, {
        auth: {
          username: calendarSync.username!,
          password: calendarSync.password!,
        },
        headers: {
          'Content-Type': 'text/calendar; charset=utf-8',
        },
        timeout: 10000,
      });

      // Store event UID in milestone metadata for future updates
      if (!milestone.metadata?.caldavEventUid) {
        await this.milestoneRepository.update(milestone.id, {
          metadata: {
            ...(milestone.metadata || {}),
            caldavEventUid: eventUid,
          },
        } as any);
      }

      this.logger.log(
        `Synced milestone ${milestone.id} to CalDAV server with UID ${eventUid}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to sync milestone ${milestone.id} to CalDAV server:`,
        error,
      );
      throw new Error(`CalDAV sync failed: ${error.message}`);
    }
  }

  /**
   * Scheduled task to run automatic syncs
   */
  @Cron(CronExpression.EVERY_30_MINUTES)
  async runScheduledSyncs(): Promise<void> {
    this.logger.log('Running scheduled calendar syncs...');

    try {
      // Find all auto-sync configurations that are due for sync
      const now = new Date();
      const autoSyncConfigs = await this.calendarSyncRepository
        .createQueryBuilder('sync')
        .where('sync.autoSync = :autoSync', { autoSync: true })
        .andWhere('sync.status != :failedStatus', {
          failedStatus: SyncStatus.FAILED,
        })
        .andWhere(
          '(sync.lastSyncAt IS NULL OR sync.lastSyncAt + INTERVAL sync.syncInterval MINUTE <= :now)',
          { now },
        )
        .getMany();

      this.logger.log(
        `Found ${autoSyncConfigs.length} configurations due for sync`,
      );

      for (const config of autoSyncConfigs) {
        try {
          await this.syncMilestones(config.id, config.userId);
          this.logger.log(`Completed scheduled sync for config ${config.id}`);
        } catch (error) {
          this.logger.error(
            `Failed scheduled sync for config ${config.id}:`,
            error,
          );
        }
      }
    } catch (error) {
      this.logger.error('Error running scheduled syncs:', error);
    }
  }

  /**
   * Get calendar sync statistics for a user
   */
  async getSyncStatistics(userId: string): Promise<{
    totalConfigs: number;
    activeConfigs: number;
    healthyConfigs: number;
    configsNeedingAttention: number;
    totalSyncs: number;
    successfulSyncs: number;
    failedSyncs: number;
    successRate: number;
  }> {
    const configs = await this.calendarSyncRepository.find({
      where: { userId },
    });

    const stats = {
      totalConfigs: configs.length,
      activeConfigs: configs.filter((c) => c.autoSync).length,
      healthyConfigs: configs.filter((c) => c.isHealthy()).length,
      configsNeedingAttention: configs.filter((c) => c.needsAttention()).length,
      totalSyncs: configs.reduce((sum, c) => sum + c.totalSyncs, 0),
      successfulSyncs: configs.reduce((sum, c) => sum + c.successfulSyncs, 0),
      failedSyncs: configs.reduce((sum, c) => sum + c.failedSyncs, 0),
      successRate: 0,
    };

    stats.successRate =
      stats.totalSyncs > 0
        ? (stats.successfulSyncs / stats.totalSyncs) * 100
        : 0;

    return stats;
  }

  /**
   * Refresh access token for OAuth providers
   */
  async refreshAccessToken(
    syncId: string,
    userId: string,
  ): Promise<CalendarSync> {
    const calendarSync = await this.calendarSyncRepository.findOne({
      where: { id: syncId, userId },
    });

    if (!calendarSync) {
      throw new CalendarSyncException('Calendar sync configuration not found');
    }

    if (!calendarSync.refreshToken) {
      throw new CalendarSyncException('No refresh token available');
    }

    try {
      let newAccessToken: string;

      switch (calendarSync.provider) {
        case CalendarProvider.GOOGLE:
          newAccessToken = await this.refreshGoogleToken(
            calendarSync.refreshToken,
          );
          break;
        case CalendarProvider.OUTLOOK:
          newAccessToken = await this.refreshMicrosoftToken(
            calendarSync.refreshToken,
          );
          break;
        default:
          throw new CalendarSyncException(
            `Token refresh not supported for provider: ${calendarSync.provider}`,
          );
      }

      calendarSync.accessToken = newAccessToken;
      const updatedSync = await this.calendarSyncRepository.save(calendarSync);

      this.logger.log(`Refreshed access token for sync config ${syncId}`);
      return updatedSync;
    } catch (error) {
      this.logger.error(
        `Failed to refresh access token for sync config ${syncId}:`,
        error,
      );
      throw new CalendarSyncException(`Token refresh failed: ${error.message}`);
    }
  }

  /**
   * Refresh Google OAuth token
   */
  private async refreshGoogleToken(refreshToken: string): Promise<string> {
    const oauth2Client = new google.auth.OAuth2(
      this.configService.get('GOOGLE_CLIENT_ID'),
      this.configService.get('GOOGLE_CLIENT_SECRET'),
    );

    oauth2Client.setCredentials({ refresh_token: refreshToken });

    const { credentials } = await oauth2Client.refreshAccessToken();
    return credentials.access_token!;
  }

  /**
   * Refresh Microsoft OAuth token
   */
  private async refreshMicrosoftToken(refreshToken: string): Promise<string> {
    const response = await axios.post(
      'https://login.microsoftonline.com/common/oauth2/v2.0/token',
      {
        client_id: this.configService.get('MICROSOFT_CLIENT_ID'),
        client_secret: this.configService.get('MICROSOFT_CLIENT_SECRET'),
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      },
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
      },
    );

    return response.data.access_token;
  }

  /**
   * Test calendar sync configuration
   */
  async testSyncConfiguration(
    syncId: string,
    userId: string,
  ): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    try {
      const calendarSync = await this.calendarSyncRepository.findOne({
        where: { id: syncId, userId },
      });

      if (!calendarSync) {
        return {
          success: false,
          message: 'Calendar sync configuration not found',
        };
      }

      // Test the configuration by validating access
      await this.validateCalendarAccess({
        provider: calendarSync.provider,
        calendarId: calendarSync.calendarId,
        accessToken: calendarSync.accessToken || undefined,
        refreshToken: calendarSync.refreshToken || undefined,
        serverUrl: calendarSync.serverUrl || undefined,
        username: calendarSync.username || undefined,
        password: calendarSync.password || undefined,
        syncInterval: calendarSync.syncInterval,
        autoSync: calendarSync.autoSync,
      });

      return {
        success: true,
        message: 'Calendar sync configuration is working correctly',
        details: {
          provider: calendarSync.provider,
          lastSync: calendarSync.lastSyncAt,
          status: calendarSync.status,
          successRate: calendarSync.getSuccessRate(),
        },
      };
    } catch (error) {
      return {
        success: false,
        message: `Configuration test failed: ${error.message}`,
        details: { error: error.message },
      };
    }
  }

  /**
   * Export milestones as iCal file
   */
  async exportMilestonesAsICal(
    userId: string,
    milestoneIds?: string[],
  ): Promise<string> {
    const calendar = ical({ name: 'FYP Milestones' });

    let milestones: Milestone[];

    if (milestoneIds && milestoneIds.length > 0) {
      milestones = await this.milestoneRepository.find({
        where: {
          id: In(milestoneIds),
          studentId: userId,
        },
        relations: ['project'],
      });
    } else {
      milestones = await this.milestoneRepository.find({
        where: { studentId: userId },
        relations: ['project'],
      });
    }

    for (const milestone of milestones) {
      const event = calendar.createEvent({
        start: milestone.dueDate,
        end: new Date(milestone.dueDate.getTime() + 2 * 60 * 60 * 1000), // 2 hours duration
        summary: `[FYP] ${milestone.title}`,
        description: `${milestone.description}\n\nProject: ${milestone.project?.title || 'N/A'}\nPriority: ${milestone.priority}\n\nGenerated by FYP Platform`,
        location: 'University of Ibadan',
        alarms: [
          {
            type: 'display' as any,
            trigger: 60 * 60, // 1 hour before
          },
          {
            type: 'display' as any,
            trigger: 24 * 60 * 60, // 1 day before
          },
        ],
      });
      event.uid(`milestone-${milestone.id}@fyp-platform.com`);
    }

    return calendar.toString();
  }
}
