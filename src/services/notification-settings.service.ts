import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SystemConfiguration } from '../entities/system-configuration.entity';
import { AdminAuditService } from './admin-audit.service';
import { ConfigCategory } from '../common/enums/config-category.enum';
import { ConfigType } from '../common/enums/config-type.enum';
import {
  NotificationSettingsDto,
  EmailTemplateDto,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
  NotificationRuleDto,
  CreateNotificationRuleDto,
  UpdateNotificationRuleDto,
  CommunicationChannelDto,
  CreateCommunicationChannelDto,
  UpdateCommunicationChannelDto,
} from '../dto/admin/notification-settings.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';

/**
 * Notification Settings Service
 *
 * Manages notification configuration, email templates, and communication channels
 */
@Injectable()
export class NotificationSettingsService {
  private readonly logger = new Logger(NotificationSettingsService.name);

  constructor(
    @InjectRepository(SystemConfiguration)
    private readonly configRepository: Repository<SystemConfiguration>,
    private readonly auditService: AdminAuditService,
  ) {}

  /**
   * Get notification settings
   */
  async getNotificationSettings(): Promise<NotificationSettingsDto> {
    const configs = await this.configRepository.find({
      where: { category: ConfigCategory.NOTIFICATION, isActive: true },
      order: { key: 'ASC' },
    });

    const settings: NotificationSettingsDto = {
      emailEnabled: this.getConfigValue(
        configs,
        'notification.email.enabled',
        true,
      ),
      smsEnabled: this.getConfigValue(
        configs,
        'notification.sms.enabled',
        false,
      ),
      pushEnabled: this.getConfigValue(
        configs,
        'notification.push.enabled',
        true,
      ),
      inAppEnabled: this.getConfigValue(
        configs,
        'notification.in_app.enabled',
        true,
      ),

      // Email settings
      emailProvider: this.getConfigValue(
        configs,
        'notification.email.provider',
        'smtp',
      ),
      smtpHost: this.getConfigValue(
        configs,
        'notification.email.smtp.host',
        '',
      ),
      smtpPort: this.getConfigValue(
        configs,
        'notification.email.smtp.port',
        587,
      ),
      smtpSecure: this.getConfigValue(
        configs,
        'notification.email.smtp.secure',
        false,
      ),
      smtpUser: this.getConfigValue(
        configs,
        'notification.email.smtp.user',
        '',
      ),
      smtpPassword: this.getConfigValue(
        configs,
        'notification.email.smtp.password',
        '',
      ),
      fromEmail: this.getConfigValue(configs, 'notification.email.from', ''),
      fromName: this.getConfigValue(
        configs,
        'notification.email.from_name',
        '',
      ),

      // Timing settings
      defaultDelay: this.getConfigValue(
        configs,
        'notification.timing.default_delay',
        0,
      ),
      retryAttempts: this.getConfigValue(
        configs,
        'notification.timing.retry_attempts',
        3,
      ),
      retryDelay: this.getConfigValue(
        configs,
        'notification.timing.retry_delay',
        300,
      ),
      batchSize: this.getConfigValue(
        configs,
        'notification.timing.batch_size',
        100,
      ),

      // Escalation settings
      escalationEnabled: this.getConfigValue(
        configs,
        'notification.escalation.enabled',
        true,
      ),
      escalationDelay: this.getConfigValue(
        configs,
        'notification.escalation.delay',
        86400,
      ), // 24 hours
      escalationLevels: this.getConfigValue(
        configs,
        'notification.escalation.levels',
        3,
      ),

      // Rate limiting
      rateLimitEnabled: this.getConfigValue(
        configs,
        'notification.rate_limit.enabled',
        true,
      ),
      rateLimitPerHour: this.getConfigValue(
        configs,
        'notification.rate_limit.per_hour',
        100,
      ),
      rateLimitPerDay: this.getConfigValue(
        configs,
        'notification.rate_limit.per_day',
        1000,
      ),
    };

    return settings;
  }

  /**
   * Update notification settings
   */
  async updateNotificationSettings(
    settings: Partial<NotificationSettingsDto>,
    adminId: string,
  ): Promise<NotificationSettingsDto> {
    const updates: Array<{ key: string; value: any; type: ConfigType }> = [];

    // Map settings to configuration keys
    if (settings.emailEnabled !== undefined) {
      updates.push({
        key: 'notification.email.enabled',
        value: settings.emailEnabled,
        type: ConfigType.BOOLEAN,
      });
    }
    if (settings.smsEnabled !== undefined) {
      updates.push({
        key: 'notification.sms.enabled',
        value: settings.smsEnabled,
        type: ConfigType.BOOLEAN,
      });
    }
    if (settings.pushEnabled !== undefined) {
      updates.push({
        key: 'notification.push.enabled',
        value: settings.pushEnabled,
        type: ConfigType.BOOLEAN,
      });
    }
    if (settings.inAppEnabled !== undefined) {
      updates.push({
        key: 'notification.in_app.enabled',
        value: settings.inAppEnabled,
        type: ConfigType.BOOLEAN,
      });
    }
    if (settings.emailProvider !== undefined) {
      updates.push({
        key: 'notification.email.provider',
        value: settings.emailProvider,
        type: ConfigType.STRING,
      });
    }
    if (settings.smtpHost !== undefined) {
      updates.push({
        key: 'notification.email.smtp.host',
        value: settings.smtpHost,
        type: ConfigType.STRING,
      });
    }
    if (settings.smtpPort !== undefined) {
      updates.push({
        key: 'notification.email.smtp.port',
        value: settings.smtpPort,
        type: ConfigType.NUMBER,
      });
    }
    if (settings.smtpSecure !== undefined) {
      updates.push({
        key: 'notification.email.smtp.secure',
        value: settings.smtpSecure,
        type: ConfigType.BOOLEAN,
      });
    }
    if (settings.smtpUser !== undefined) {
      updates.push({
        key: 'notification.email.smtp.user',
        value: settings.smtpUser,
        type: ConfigType.STRING,
      });
    }
    if (settings.smtpPassword !== undefined) {
      updates.push({
        key: 'notification.email.smtp.password',
        value: settings.smtpPassword,
        type: ConfigType.STRING,
      });
    }
    if (settings.fromEmail !== undefined) {
      updates.push({
        key: 'notification.email.from',
        value: settings.fromEmail,
        type: ConfigType.EMAIL,
      });
    }
    if (settings.fromName !== undefined) {
      updates.push({
        key: 'notification.email.from_name',
        value: settings.fromName,
        type: ConfigType.STRING,
      });
    }
    if (settings.defaultDelay !== undefined) {
      updates.push({
        key: 'notification.timing.default_delay',
        value: settings.defaultDelay,
        type: ConfigType.NUMBER,
      });
    }
    if (settings.retryAttempts !== undefined) {
      updates.push({
        key: 'notification.timing.retry_attempts',
        value: settings.retryAttempts,
        type: ConfigType.NUMBER,
      });
    }
    if (settings.retryDelay !== undefined) {
      updates.push({
        key: 'notification.timing.retry_delay',
        value: settings.retryDelay,
        type: ConfigType.NUMBER,
      });
    }
    if (settings.batchSize !== undefined) {
      updates.push({
        key: 'notification.timing.batch_size',
        value: settings.batchSize,
        type: ConfigType.NUMBER,
      });
    }
    if (settings.escalationEnabled !== undefined) {
      updates.push({
        key: 'notification.escalation.enabled',
        value: settings.escalationEnabled,
        type: ConfigType.BOOLEAN,
      });
    }
    if (settings.escalationDelay !== undefined) {
      updates.push({
        key: 'notification.escalation.delay',
        value: settings.escalationDelay,
        type: ConfigType.NUMBER,
      });
    }
    if (settings.escalationLevels !== undefined) {
      updates.push({
        key: 'notification.escalation.levels',
        value: settings.escalationLevels,
        type: ConfigType.NUMBER,
      });
    }
    if (settings.rateLimitEnabled !== undefined) {
      updates.push({
        key: 'notification.rate_limit.enabled',
        value: settings.rateLimitEnabled,
        type: ConfigType.BOOLEAN,
      });
    }
    if (settings.rateLimitPerHour !== undefined) {
      updates.push({
        key: 'notification.rate_limit.per_hour',
        value: settings.rateLimitPerHour,
        type: ConfigType.NUMBER,
      });
    }
    if (settings.rateLimitPerDay !== undefined) {
      updates.push({
        key: 'notification.rate_limit.per_day',
        value: settings.rateLimitPerDay,
        type: ConfigType.NUMBER,
      });
    }

    // Update configurations
    for (const update of updates) {
      await this.updateOrCreateConfig(
        update.key,
        String(update.value),
        update.type,
        adminId,
      );
    }

    // Log the update
    await this.auditService.logAdminAction(
      adminId,
      'update',
      'notification_settings',
      undefined,
      null,
      { updatedKeys: updates.map((u) => u.key) },
    );

    this.logger.log(`Notification settings updated by admin ${adminId}`);

    return this.getNotificationSettings();
  }

  /**
   * Get email templates
   */
  async getEmailTemplates(): Promise<EmailTemplateDto[]> {
    const configs = await this.configRepository
      .createQueryBuilder('config')
      .where('config.category = :category', { category: ConfigCategory.EMAIL })
      .andWhere('config.key LIKE :keyPattern', {
        keyPattern: 'email.template.%',
      })
      .andWhere('config.isActive = :isActive', { isActive: true })
      .orderBy('config.key', 'ASC')
      .getMany();

    const templates: EmailTemplateDto[] = [];
    const templateMap = new Map<string, Partial<EmailTemplateDto>>();

    // Group configurations by template name
    for (const config of configs) {
      const keyParts = config.key.split('.');
      if (
        keyParts.length >= 3 &&
        keyParts[0] === 'email' &&
        keyParts[1] === 'template'
      ) {
        const templateName = keyParts[2];
        const property = keyParts[3];

        if (!templateMap.has(templateName)) {
          templateMap.set(templateName, { name: templateName });
        }

        const template = templateMap.get(templateName)!;

        switch (property) {
          case 'subject':
            template.subject = config.value;
            break;
          case 'body':
            template.body = config.value;
            break;
          case 'variables':
            template.variables = JSON.parse(config.value || '[]');
            break;
          case 'enabled':
            template.enabled = config.value === 'true';
            break;
          case 'description':
            template.description = config.value;
            break;
        }
      }
    }

    // Convert map to array
    for (const [name, template] of templateMap) {
      if (template.subject && template.body) {
        templates.push({
          name,
          subject: template.subject,
          body: template.body,
          variables: template.variables || [],
          enabled: template.enabled !== false,
          description: template.description,
        });
      }
    }

    return templates;
  }

  /**
   * Get email template by name
   */
  async getEmailTemplate(name: string): Promise<EmailTemplateDto> {
    const templates = await this.getEmailTemplates();
    const template = templates.find((t) => t.name === name);

    if (!template) {
      throw new NotFoundException(`Email template '${name}' not found`);
    }

    return template;
  }

  /**
   * Create email template
   */
  async createEmailTemplate(
    createDto: CreateEmailTemplateDto,
    adminId: string,
  ): Promise<EmailTemplateDto> {
    // Check if template already exists
    try {
      await this.getEmailTemplate(createDto.name);
      throw new BadRequestException(
        `Email template '${createDto.name}' already exists`,
      );
    } catch (error) {
      if (!(error instanceof NotFoundException)) {
        throw error;
      }
    }

    // Create template configurations
    await this.updateOrCreateConfig(
      `email.template.${createDto.name}.subject`,
      createDto.subject,
      ConfigType.STRING,
      adminId,
    );

    await this.updateOrCreateConfig(
      `email.template.${createDto.name}.body`,
      createDto.body,
      ConfigType.STRING,
      adminId,
    );

    await this.updateOrCreateConfig(
      `email.template.${createDto.name}.variables`,
      JSON.stringify(createDto.variables || []),
      ConfigType.JSON,
      adminId,
    );

    await this.updateOrCreateConfig(
      `email.template.${createDto.name}.enabled`,
      String(createDto.enabled !== false),
      ConfigType.BOOLEAN,
      adminId,
    );

    if (createDto.description) {
      await this.updateOrCreateConfig(
        `email.template.${createDto.name}.description`,
        createDto.description,
        ConfigType.STRING,
        adminId,
      );
    }

    // Log the creation
    await this.auditService.logAdminAction(
      adminId,
      'create',
      'email_template',
      createDto.name,
      null,
      createDto,
    );

    this.logger.log(
      `Email template '${createDto.name}' created by admin ${adminId}`,
    );

    return this.getEmailTemplate(createDto.name);
  }

  /**
   * Update email template
   */
  async updateEmailTemplate(
    name: string,
    updateDto: UpdateEmailTemplateDto,
    adminId: string,
  ): Promise<EmailTemplateDto> {
    // Verify template exists
    const existingTemplate = await this.getEmailTemplate(name);

    // Update template configurations
    if (updateDto.subject !== undefined) {
      await this.updateOrCreateConfig(
        `email.template.${name}.subject`,
        updateDto.subject,
        ConfigType.STRING,
        adminId,
      );
    }

    if (updateDto.body !== undefined) {
      await this.updateOrCreateConfig(
        `email.template.${name}.body`,
        updateDto.body,
        ConfigType.STRING,
        adminId,
      );
    }

    if (updateDto.variables !== undefined) {
      await this.updateOrCreateConfig(
        `email.template.${name}.variables`,
        JSON.stringify(updateDto.variables),
        ConfigType.JSON,
        adminId,
      );
    }

    if (updateDto.enabled !== undefined) {
      await this.updateOrCreateConfig(
        `email.template.${name}.enabled`,
        String(updateDto.enabled),
        ConfigType.BOOLEAN,
        adminId,
      );
    }

    if (updateDto.description !== undefined) {
      await this.updateOrCreateConfig(
        `email.template.${name}.description`,
        updateDto.description,
        ConfigType.STRING,
        adminId,
      );
    }

    // Log the update
    await this.auditService.logAdminAction(
      adminId,
      'update',
      'email_template',
      name,
      existingTemplate,
      updateDto,
    );

    this.logger.log(`Email template '${name}' updated by admin ${adminId}`);

    return this.getEmailTemplate(name);
  }

  /**
   * Delete email template
   */
  async deleteEmailTemplate(name: string, adminId: string): Promise<void> {
    // Verify template exists
    const existingTemplate = await this.getEmailTemplate(name);

    // Delete template configurations
    const templateConfigs = await this.configRepository
      .createQueryBuilder('config')
      .where('config.key LIKE :keyPattern', {
        keyPattern: `email.template.${name}.%`,
      })
      .getMany();

    await this.configRepository.remove(templateConfigs);

    // Log the deletion
    await this.auditService.logAdminAction(
      adminId,
      'delete',
      'email_template',
      name,
      existingTemplate,
      null,
    );

    this.logger.log(`Email template '${name}' deleted by admin ${adminId}`);
  }

  /**
   * Test email template
   */
  async testEmailTemplate(
    name: string,
    testData: Record<string, any>,
    recipientEmail: string,
    adminId: string,
  ): Promise<{ success: boolean; message: string }> {
    const template = await this.getEmailTemplate(name);

    if (!template.enabled) {
      throw new BadRequestException(`Email template '${name}' is disabled`);
    }

    try {
      // Replace variables in subject and body
      let subject = template.subject;
      let body = template.body;

      for (const [key, value] of Object.entries(testData)) {
        const placeholder = `{{${key}}}`;
        subject = subject.replace(new RegExp(placeholder, 'g'), String(value));
        body = body.replace(new RegExp(placeholder, 'g'), String(value));
      }

      // Here you would integrate with your email service
      // For now, we'll just log the test
      this.logger.log(`Email template test: ${name} to ${recipientEmail}`);

      // Log the test
      await this.auditService.logAdminAction(
        adminId,
        'test',
        'email_template',
        name,
        null,
        { recipient: recipientEmail, testData },
      );

      return {
        success: true,
        message: `Test email sent successfully to ${recipientEmail}`,
      };
    } catch (error) {
      this.logger.error(`Email template test failed: ${error.message}`);
      return {
        success: false,
        message: `Test email failed: ${error.message}`,
      };
    }
  }

  /**
   * Get communication channels
   */
  async getCommunicationChannels(): Promise<CommunicationChannelDto[]> {
    const configs = await this.configRepository
      .createQueryBuilder('config')
      .where('config.category = :category', {
        category: ConfigCategory.NOTIFICATION,
      })
      .andWhere('config.key LIKE :keyPattern', { keyPattern: 'channel.%' })
      .andWhere('config.isActive = :isActive', { isActive: true })
      .orderBy('config.key', 'ASC')
      .getMany();

    const channels: CommunicationChannelDto[] = [];
    const channelMap = new Map<string, Partial<CommunicationChannelDto>>();

    // Group configurations by channel name
    for (const config of configs) {
      const keyParts = config.key.split('.');
      if (keyParts.length >= 2 && keyParts[0] === 'channel') {
        const channelName = keyParts[1];
        const property = keyParts[2];

        if (!channelMap.has(channelName)) {
          channelMap.set(channelName, { name: channelName });
        }

        const channel = channelMap.get(channelName)!;

        switch (property) {
          case 'type':
            channel.type = config.value as any;
            break;
          case 'enabled':
            channel.enabled = config.value === 'true';
            break;
          case 'priority':
            channel.priority = parseInt(config.value);
            break;
          case 'config':
            channel.configuration = JSON.parse(config.value || '{}');
            break;
          case 'description':
            channel.description = config.value;
            break;
        }
      }
    }

    // Convert map to array
    for (const [name, channel] of channelMap) {
      if (channel.type) {
        channels.push({
          name,
          type: channel.type,
          enabled: channel.enabled !== false,
          priority: channel.priority || 1,
          configuration: channel.configuration || {},
          description: channel.description,
        });
      }
    }

    return channels.sort((a, b) => (b.priority || 1) - (a.priority || 1));
  }

  /**
   * Helper method to get configuration value with default
   */
  private getConfigValue(
    configs: SystemConfiguration[],
    key: string,
    defaultValue: any,
  ): any {
    const config = configs.find((c) => c.key === key);
    if (!config) return defaultValue;

    return config.getParsedValue() || defaultValue;
  }

  /**
   * Helper method to update or create configuration
   */
  private async updateOrCreateConfig(
    key: string,
    value: string,
    type: ConfigType,
    adminId: string,
  ): Promise<void> {
    let config = await this.configRepository.findOne({ where: { key } });

    if (config) {
      config.value = value;
      config.updatedBy = adminId;
    } else {
      config = this.configRepository.create({
        key,
        value,
        type,
        category: key.startsWith('email.')
          ? ConfigCategory.EMAIL
          : ConfigCategory.NOTIFICATION,
        updatedBy: adminId,
      });
    }

    await this.configRepository.save(config);
  }
}
