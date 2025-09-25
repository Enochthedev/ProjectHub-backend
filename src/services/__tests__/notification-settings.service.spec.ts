import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { NotificationSettingsService } from '../notification-settings.service';
import { SystemConfiguration } from '../../entities/system-configuration.entity';
import { AdminAuditService } from '../admin-audit.service';
import { ConfigCategory } from '../../common/enums/config-category.enum';
import { ConfigType } from '../../common/enums/config-type.enum';
import {
  NotificationSettingsDto,
  CreateEmailTemplateDto,
  UpdateEmailTemplateDto,
} from '../../dto/admin/notification-settings.dto';

describe('NotificationSettingsService', () => {
  let service: NotificationSettingsService;
  let configRepository: jest.Mocked<Repository<SystemConfiguration>>;
  let auditService: jest.Mocked<AdminAuditService>;

  const mockConfig: SystemConfiguration = {
    id: '1',
    key: 'notification.email.enabled',
    value: 'true',
    description: 'Enable email notifications',
    category: ConfigCategory.NOTIFICATION,
    type: ConfigType.BOOLEAN,
    isActive: true,
    isReadOnly: false,
    isSecret: false,
    validationSchema: null,
    defaultValue: 'true',
    metadata: null,
    version: 'v1',
    updatedBy: 'admin1',
    createdAt: new Date(),
    updatedAt: new Date(),
    getParsedValue: jest.fn().mockReturnValue(true),
    getDefaultParsedValue: jest.fn().mockReturnValue(true),
    isValidValue: jest.fn().mockReturnValue(true),
    isEditable: jest.fn().mockReturnValue(true),
    getMaskedValue: jest.fn().mockReturnValue('true'),
    getSummary: jest
      .fn()
      .mockReturnValue('notification.email.enabled (notification): true'),
  } as SystemConfiguration;

  beforeEach(async () => {
    const mockQueryBuilder = {
      where: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      getMany: jest.fn().mockResolvedValue([mockConfig]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationSettingsService,
        {
          provide: getRepositoryToken(SystemConfiguration),
          useValue: {
            find: jest.fn(),
            findOne: jest.fn(),
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

    service = module.get<NotificationSettingsService>(
      NotificationSettingsService,
    );
    configRepository = module.get(getRepositoryToken(SystemConfiguration));
    auditService = module.get(AdminAuditService);
  });

  describe('getNotificationSettings', () => {
    it('should return notification settings', async () => {
      const configs = [
        {
          ...mockConfig,
          key: 'notification.email.enabled',
          getParsedValue: () => true,
        },
        {
          ...mockConfig,
          key: 'notification.sms.enabled',
          getParsedValue: () => false,
        },
        {
          ...mockConfig,
          key: 'notification.email.smtp.host',
          getParsedValue: () => 'smtp.example.com',
        },
        {
          ...mockConfig,
          key: 'notification.email.smtp.port',
          getParsedValue: () => 587,
        },
      ];

      configRepository.find.mockResolvedValue(configs as SystemConfiguration[]);

      const result = await service.getNotificationSettings();

      expect(result).toEqual(
        expect.objectContaining({
          emailEnabled: true,
          smsEnabled: false,
          smtpHost: 'smtp.example.com',
          smtpPort: 587,
        }),
      );
    });
  });

  describe('updateNotificationSettings', () => {
    it('should update notification settings', async () => {
      const settings = {
        emailEnabled: false,
        smtpHost: 'new-smtp.example.com',
      };

      configRepository.findOne.mockResolvedValue(mockConfig);
      configRepository.save.mockResolvedValue(mockConfig);
      configRepository.find.mockResolvedValue([mockConfig]);

      const result = await service.updateNotificationSettings(
        settings,
        'admin1',
      );

      expect(configRepository.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'update',
        'notification_settings',
        undefined,
        null,
        expect.objectContaining({
          updatedKeys: expect.arrayContaining([
            'notification.email.enabled',
            'notification.email.smtp.host',
          ]),
        }),
      );
    });
  });

  describe('getEmailTemplates', () => {
    it('should return email templates', async () => {
      const templateConfigs = [
        {
          ...mockConfig,
          key: 'email.template.welcome.subject',
          value: 'Welcome!',
        },
        {
          ...mockConfig,
          key: 'email.template.welcome.body',
          value: 'Welcome {{name}}!',
        },
        {
          ...mockConfig,
          key: 'email.template.welcome.variables',
          value: '["name"]',
        },
        { ...mockConfig, key: 'email.template.welcome.enabled', value: 'true' },
      ];

      const mockQueryBuilder = configRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(templateConfigs);

      const result = await service.getEmailTemplates();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'welcome',
        subject: 'Welcome!',
        body: 'Welcome {{name}}!',
        variables: ['name'],
        enabled: true,
        description: undefined,
      });
    });
  });

  describe('getEmailTemplate', () => {
    it('should return email template by name', async () => {
      const templateConfigs = [
        {
          ...mockConfig,
          key: 'email.template.welcome.subject',
          value: 'Welcome!',
        },
        {
          ...mockConfig,
          key: 'email.template.welcome.body',
          value: 'Welcome {{name}}!',
        },
      ];

      const mockQueryBuilder = configRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(templateConfigs);

      const result = await service.getEmailTemplate('welcome');

      expect(result.name).toBe('welcome');
      expect(result.subject).toBe('Welcome!');
    });

    it('should throw NotFoundException when template not found', async () => {
      const mockQueryBuilder = configRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      await expect(service.getEmailTemplate('nonexistent')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('createEmailTemplate', () => {
    const createDto: CreateEmailTemplateDto = {
      name: 'new-template',
      subject: 'New Template',
      body: 'Hello {{name}}!',
      variables: ['name'],
      enabled: true,
    };

    it('should create new email template', async () => {
      // Mock template doesn't exist
      const mockQueryBuilder = configRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([]);

      configRepository.findOne.mockResolvedValue(null);
      configRepository.create.mockReturnValue(mockConfig);
      configRepository.save.mockResolvedValue(mockConfig);

      // Mock the template retrieval after creation
      mockQueryBuilder.getMany = jest
        .fn()
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([
          {
            ...mockConfig,
            key: 'email.template.new-template.subject',
            value: 'New Template',
          },
          {
            ...mockConfig,
            key: 'email.template.new-template.body',
            value: 'Hello {{name}}!',
          },
        ]);

      const result = await service.createEmailTemplate(createDto, 'admin1');

      expect(configRepository.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'create',
        'email_template',
        createDto.name,
        null,
        createDto,
      );
    });

    it('should throw BadRequestException when template already exists', async () => {
      const templateConfigs = [
        {
          ...mockConfig,
          key: 'email.template.new-template.subject',
          value: 'Existing',
        },
        {
          ...mockConfig,
          key: 'email.template.new-template.body',
          value: 'Existing body',
        },
      ];

      const mockQueryBuilder = configRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(templateConfigs);

      await expect(
        service.createEmailTemplate(createDto, 'admin1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('updateEmailTemplate', () => {
    const updateDto: UpdateEmailTemplateDto = {
      subject: 'Updated Subject',
      body: 'Updated body',
    };

    it('should update email template', async () => {
      // Mock existing template
      const templateConfigs = [
        {
          ...mockConfig,
          key: 'email.template.welcome.subject',
          value: 'Welcome!',
        },
        {
          ...mockConfig,
          key: 'email.template.welcome.body',
          value: 'Welcome {{name}}!',
        },
      ];

      const mockQueryBuilder = configRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(templateConfigs);

      configRepository.findOne.mockResolvedValue(mockConfig);
      configRepository.save.mockResolvedValue(mockConfig);

      const result = await service.updateEmailTemplate(
        'welcome',
        updateDto,
        'admin1',
      );

      expect(configRepository.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'update',
        'email_template',
        'welcome',
        expect.any(Object),
        updateDto,
      );
    });
  });

  describe('deleteEmailTemplate', () => {
    it('should delete email template', async () => {
      // Mock existing template
      const templateConfigs = [
        {
          ...mockConfig,
          key: 'email.template.welcome.subject',
          value: 'Welcome!',
        },
        {
          ...mockConfig,
          key: 'email.template.welcome.body',
          value: 'Welcome {{name}}!',
        },
      ];

      const mockQueryBuilder = configRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest
        .fn()
        .mockResolvedValueOnce(templateConfigs) // For getEmailTemplate
        .mockResolvedValueOnce(templateConfigs); // For deleteEmailTemplate

      configRepository.remove.mockResolvedValue(templateConfigs as any);

      await service.deleteEmailTemplate('welcome', 'admin1');

      expect(configRepository.remove).toHaveBeenCalledWith(templateConfigs);
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'delete',
        'email_template',
        'welcome',
        expect.any(Object),
        null,
      );
    });
  });

  describe('testEmailTemplate', () => {
    it('should test email template successfully', async () => {
      const templateConfigs = [
        {
          ...mockConfig,
          key: 'email.template.welcome.subject',
          value: 'Welcome {{name}}!',
        },
        {
          ...mockConfig,
          key: 'email.template.welcome.body',
          value: 'Hello {{name}}, welcome!',
        },
        { ...mockConfig, key: 'email.template.welcome.enabled', value: 'true' },
      ];

      const mockQueryBuilder = configRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(templateConfigs);

      const result = await service.testEmailTemplate(
        'welcome',
        { name: 'John' },
        'test@example.com',
        'admin1',
      );

      expect(result.success).toBe(true);
      expect(result.message).toContain('test@example.com');
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'test',
        'email_template',
        'welcome',
        null,
        expect.objectContaining({
          recipient: 'test@example.com',
          testData: { name: 'John' },
        }),
      );
    });

    it('should throw BadRequestException when template is disabled', async () => {
      const templateConfigs = [
        {
          ...mockConfig,
          key: 'email.template.welcome.subject',
          value: 'Welcome!',
        },
        { ...mockConfig, key: 'email.template.welcome.body', value: 'Hello!' },
        {
          ...mockConfig,
          key: 'email.template.welcome.enabled',
          value: 'false',
        },
      ];

      const mockQueryBuilder = configRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(templateConfigs);

      await expect(
        service.testEmailTemplate('welcome', {}, 'test@example.com', 'admin1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getCommunicationChannels', () => {
    it('should return communication channels', async () => {
      const channelConfigs = [
        { ...mockConfig, key: 'channel.email.type', value: 'email' },
        { ...mockConfig, key: 'channel.email.enabled', value: 'true' },
        { ...mockConfig, key: 'channel.email.priority', value: '5' },
        {
          ...mockConfig,
          key: 'channel.email.config',
          value: '{"host":"smtp.example.com"}',
        },
      ];

      const mockQueryBuilder = configRepository.createQueryBuilder();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue(channelConfigs);

      const result = await service.getCommunicationChannels();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        name: 'email',
        type: 'email',
        enabled: true,
        priority: 5,
        configuration: { host: 'smtp.example.com' },
        description: undefined,
      });
    });
  });
});
