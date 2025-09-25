import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository, DataSource, QueryRunner } from 'typeorm';
import {
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { SystemConfigurationService } from '../system-configuration.service';
import { SystemConfiguration } from '../../entities/system-configuration.entity';
import { AdminAuditService } from '../admin-audit.service';
import { ConfigType } from '../../common/enums/config-type.enum';
import { ConfigCategory } from '../../common/enums/config-category.enum';
import {
  CreateConfigDto,
  UpdateConfigDto,
  ConfigFiltersDto,
} from '../../dto/admin/config.dto';

describe('SystemConfigurationService', () => {
  let service: SystemConfigurationService;
  let configRepository: jest.Mocked<Repository<SystemConfiguration>>;
  let dataSource: jest.Mocked<DataSource>;
  let auditService: jest.Mocked<AdminAuditService>;
  let queryRunner: jest.Mocked<QueryRunner>;

  const mockConfig: SystemConfiguration = {
    id: '1',
    key: 'test.setting',
    value: 'test value',
    description: 'Test setting',
    category: ConfigCategory.SYSTEM,
    type: ConfigType.STRING,
    isActive: true,
    isReadOnly: false,
    isSecret: false,
    validationSchema: null,
    defaultValue: 'default',
    metadata: null,
    version: 'v1',
    updatedBy: 'admin1',
    createdAt: new Date(),
    updatedAt: new Date(),
    getParsedValue: jest.fn().mockReturnValue('test value'),
    getDefaultParsedValue: jest.fn().mockReturnValue('default'),
    isValidValue: jest.fn().mockReturnValue(true),
    isEditable: jest.fn().mockReturnValue(true),
    getMaskedValue: jest.fn().mockReturnValue('test value'),
    getSummary: jest.fn().mockReturnValue('test.setting (system): test value'),
  } as SystemConfiguration;

  beforeEach(async () => {
    const mockQueryBuilder = {
      leftJoinAndSelect: jest.fn().mockReturnThis(),
      andWhere: jest.fn().mockReturnThis(),
      orderBy: jest.fn().mockReturnThis(),
      skip: jest.fn().mockReturnThis(),
      take: jest.fn().mockReturnThis(),
      getManyAndCount: jest.fn().mockResolvedValue([[mockConfig], 1]),
      getMany: jest.fn().mockResolvedValue([mockConfig]),
    };

    queryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        findOne: jest.fn(),
        save: jest.fn(),
        create: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SystemConfigurationService,
        {
          provide: getRepositoryToken(SystemConfiguration),
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
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(queryRunner),
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

    service = module.get<SystemConfigurationService>(
      SystemConfigurationService,
    );
    configRepository = module.get(getRepositoryToken(SystemConfiguration));
    dataSource = module.get(DataSource);
    auditService = module.get(AdminAuditService);
  });

  describe('getConfigurations', () => {
    it('should return paginated configurations', async () => {
      const filters: ConfigFiltersDto = {
        category: ConfigCategory.SYSTEM,
        page: 1,
        limit: 20,
      };

      const result = await service.getConfigurations(filters);

      expect(result).toEqual({
        items: [mockConfig],
        total: 1,
        page: 1,
        limit: 20,
        totalPages: 1,
      });
    });

    it('should apply search filter', async () => {
      const filters: ConfigFiltersDto = {
        search: 'test',
      };

      await service.getConfigurations(filters);

      expect(configRepository.createQueryBuilder).toHaveBeenCalled();
    });
  });

  describe('getConfigurationByKey', () => {
    it('should return configuration by key', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.getConfigurationByKey('test.setting');

      expect(result).toEqual(mockConfig);
      expect(configRepository.findOne).toHaveBeenCalledWith({
        where: { key: 'test.setting' },
        relations: ['updatedByUser'],
      });
    });

    it('should throw NotFoundException when configuration not found', async () => {
      configRepository.findOne.mockResolvedValue(null);

      await expect(
        service.getConfigurationByKey('nonexistent'),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('getConfigValue', () => {
    it('should return parsed configuration value', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);

      const result = await service.getConfigValue('test.setting');

      expect(result).toBe('test value');
      expect(mockConfig.getParsedValue).toHaveBeenCalled();
    });
  });

  describe('createConfiguration', () => {
    const createDto: CreateConfigDto = {
      key: 'new.setting',
      value: 'new value',
      description: 'New setting',
      category: ConfigCategory.SYSTEM,
      type: ConfigType.STRING,
    };

    it('should create new configuration', async () => {
      configRepository.findOne.mockResolvedValue(null); // No existing config
      configRepository.create.mockReturnValue(mockConfig);
      configRepository.save.mockResolvedValue(mockConfig);

      const result = await service.createConfiguration(createDto, 'admin1');

      expect(result).toEqual(mockConfig);
      expect(configRepository.create).toHaveBeenCalledWith({
        ...createDto,
        updatedBy: 'admin1',
      });
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'create',
        'system_configuration',
        mockConfig.id,
        null,
        mockConfig,
      );
    });

    it('should throw ConflictException when key already exists', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);

      await expect(
        service.createConfiguration(createDto, 'admin1'),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('updateConfiguration', () => {
    const updateDto: UpdateConfigDto = {
      value: 'updated value',
      description: 'Updated description',
    };

    it('should update configuration', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);
      const updatedConfig = {
        ...mockConfig,
        ...updateDto,
        updatedBy: 'admin1',
        version: expect.any(String),
      } as SystemConfiguration;
      configRepository.save.mockResolvedValue(updatedConfig);

      const result = await service.updateConfiguration(
        'test.setting',
        updateDto,
        'admin1',
      );

      expect(configRepository.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'update',
        'system_configuration',
        mockConfig.id,
        expect.any(Object), // Old values - the service modifies the original object
        expect.any(Object), // New values
      );
    });

    it('should throw BadRequestException when configuration is not editable', async () => {
      const readOnlyConfig = Object.assign({}, mockConfig);
      readOnlyConfig.isEditable = jest.fn().mockReturnValue(false);
      configRepository.findOne.mockResolvedValue(readOnlyConfig);

      await expect(
        service.updateConfiguration('test.setting', updateDto, 'admin1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('deleteConfiguration', () => {
    it('should delete configuration', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);
      configRepository.remove.mockResolvedValue(mockConfig);

      await service.deleteConfiguration('test.setting', 'admin1');

      expect(configRepository.remove).toHaveBeenCalledWith(mockConfig);
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'delete',
        'system_configuration',
        mockConfig.id,
        mockConfig,
        null,
      );
    });

    it('should throw BadRequestException when configuration is read-only', async () => {
      const readOnlyConfig = {
        ...mockConfig,
        isReadOnly: true,
      } as SystemConfiguration;
      configRepository.findOne.mockResolvedValue(readOnlyConfig);

      await expect(
        service.deleteConfiguration('test.setting', 'admin1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('backupConfigurations', () => {
    it('should create configuration backup', async () => {
      const mockQueryBuilder = configRepository.createQueryBuilder() as any;
      mockQueryBuilder.where = jest.fn().mockReturnThis();
      mockQueryBuilder.getMany = jest.fn().mockResolvedValue([mockConfig]);

      const result = await service.backupConfigurations(
        ConfigCategory.SYSTEM,
        'admin1',
      );

      expect(result).toEqual({
        timestamp: expect.any(Date),
        version: expect.any(String),
        category: ConfigCategory.SYSTEM,
        configurations: [
          {
            key: mockConfig.key,
            value: mockConfig.value,
            description: mockConfig.description || undefined,
            category: mockConfig.category,
            type: mockConfig.type,
            isActive: mockConfig.isActive,
            isReadOnly: mockConfig.isReadOnly,
            isSecret: mockConfig.isSecret,
            validationSchema: mockConfig.validationSchema || undefined,
            defaultValue: mockConfig.defaultValue || undefined,
            metadata: mockConfig.metadata || undefined,
          },
        ],
      });
      expect(auditService.logAdminAction).toHaveBeenCalled();
    });
  });

  describe('restoreConfigurations', () => {
    const mockBackup = {
      timestamp: new Date(),
      version: 'v1',
      category: ConfigCategory.SYSTEM,
      configurations: [
        {
          key: 'test.setting',
          value: 'restored value',
          description: 'Restored setting',
          category: ConfigCategory.SYSTEM,
          type: ConfigType.STRING,
          isActive: true,
          isReadOnly: false,
          isSecret: false,
          validationSchema: undefined,
          defaultValue: undefined,
          metadata: undefined,
        },
      ],
    };

    it('should restore configurations from backup', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null); // No existing config
      (queryRunner.manager.create as jest.Mock).mockReturnValue(mockConfig);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockConfig);

      const result = await service.restoreConfigurations(mockBackup, 'admin1');

      expect(result.restored).toBe(1);
      expect(result.skipped).toBe(0);
      expect(result.errors).toHaveLength(0);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should skip existing configurations when overwrite is false', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(mockConfig); // Existing config

      const result = await service.restoreConfigurations(mockBackup, 'admin1', {
        overwrite: false,
      });

      expect(result.restored).toBe(0);
      expect(result.skipped).toBe(1);
    });

    it('should perform dry run without saving', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.restoreConfigurations(mockBackup, 'admin1', {
        dryRun: true,
      });

      expect(result.restored).toBe(1);
      expect(queryRunner.rollbackTransaction).toHaveBeenCalled();
      expect(queryRunner.commitTransaction).not.toHaveBeenCalled();
    });
  });

  describe('rollbackConfiguration', () => {
    it('should rollback configuration to default value', async () => {
      configRepository.findOne.mockResolvedValue(mockConfig);
      const rolledBackConfig = {
        ...mockConfig,
        value: mockConfig.defaultValue || 'default',
      } as SystemConfiguration;
      configRepository.save.mockResolvedValue(rolledBackConfig);

      const result = await service.rollbackConfiguration(
        'test.setting',
        'admin1',
      );

      expect(configRepository.save).toHaveBeenCalled();
      expect(auditService.logAdminAction).toHaveBeenCalledWith(
        'admin1',
        'rollback',
        'system_configuration',
        mockConfig.id,
        expect.objectContaining({ value: expect.any(String) }),
        expect.objectContaining({ value: 'default' }),
      );
    });

    it('should throw BadRequestException when no default value exists', async () => {
      const configWithoutDefault = {
        ...mockConfig,
        defaultValue: null,
      } as SystemConfiguration;
      configRepository.findOne.mockResolvedValue(configWithoutDefault);

      await expect(
        service.rollbackConfiguration('test.setting', 'admin1'),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('bulkUpdateConfigurations', () => {
    const updates = [
      { key: 'test.setting1', value: 'new value 1' },
      { key: 'test.setting2', value: 'new value 2' },
    ];

    it('should bulk update configurations', async () => {
      (queryRunner.manager.findOne as jest.Mock).mockResolvedValue(mockConfig);
      (queryRunner.manager.save as jest.Mock).mockResolvedValue(mockConfig);

      const result = await service.bulkUpdateConfigurations(updates, 'admin1');

      expect(result.updated).toBe(2);
      expect(result.errors).toHaveLength(0);
      expect(queryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle errors in bulk update', async () => {
      (queryRunner.manager.findOne as jest.Mock)
        .mockResolvedValueOnce(mockConfig)
        .mockResolvedValueOnce(null); // Second config not found

      const result = await service.bulkUpdateConfigurations(updates, 'admin1');

      expect(result.updated).toBe(1);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]).toContain('not found');
    });
  });

  describe('validateConfigurationValue', () => {
    it('should validate boolean values', async () => {
      const mockBooleanConfig = {
        ...mockConfig,
        type: ConfigType.BOOLEAN,
        isValidValue: jest.fn().mockReturnValue(true),
        getParsedValue: jest.fn().mockReturnValue(true),
      };

      // Access private method through service instance
      await expect(
        (service as any).validateConfigurationValue('true', ConfigType.BOOLEAN),
      ).resolves.not.toThrow();
    });

    it('should throw BadRequestException for invalid values', async () => {
      await expect(
        (service as any).validateConfigurationValue(
          'invalid',
          ConfigType.BOOLEAN,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('should validate with schema when provided', async () => {
      const schema = JSON.stringify({ type: 'string', min: 10 });

      await expect(
        (service as any).validateConfigurationValue(
          'short',
          ConfigType.STRING,
          schema,
        ),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
