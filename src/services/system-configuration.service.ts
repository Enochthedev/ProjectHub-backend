import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource } from 'typeorm';
import { SystemConfiguration } from '../entities/system-configuration.entity';
import { ConfigType } from '../common/enums/config-type.enum';
import { ConfigCategory } from '../common/enums/config-category.enum';
import {
  CreateConfigDto,
  UpdateConfigDto,
  ConfigFiltersDto,
  ConfigBackupDto,
} from '../dto/admin/config.dto';
import { PaginatedResponse } from '../common/interfaces/paginated-response.interface';
import { AdminAuditService } from './admin-audit.service';
import { Logger } from '@nestjs/common';
import * as Joi from 'joi';

/**
 * System Configuration Service
 *
 * Provides comprehensive configuration management with:
 * - CRUD operations with validation
 * - Configuration backup and restore
 * - Change tracking and rollback
 * - Schema validation support
 */
@Injectable()
export class SystemConfigurationService {
  private readonly logger = new Logger(SystemConfigurationService.name);

  constructor(
    @InjectRepository(SystemConfiguration)
    private readonly configRepository: Repository<SystemConfiguration>,
    private readonly dataSource: DataSource,
    private readonly auditService: AdminAuditService,
  ) {}

  /**
   * Get all configurations with optional filtering
   */
  async getConfigurations(
    filters: ConfigFiltersDto,
  ): Promise<PaginatedResponse<SystemConfiguration>> {
    const queryBuilder = this.configRepository
      .createQueryBuilder('config')
      .leftJoinAndSelect('config.updatedByUser', 'user');

    // Apply filters
    if (filters.category) {
      queryBuilder.andWhere('config.category = :category', {
        category: filters.category,
      });
    }

    if (filters.type) {
      queryBuilder.andWhere('config.type = :type', { type: filters.type });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('config.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.search) {
      queryBuilder.andWhere(
        '(config.key ILIKE :search OR config.description ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.isSecret !== undefined) {
      queryBuilder.andWhere('config.isSecret = :isSecret', {
        isSecret: filters.isSecret,
      });
    }

    // Apply sorting
    const sortField = filters.sortBy || 'key';
    const sortOrder = filters.sortOrder || 'ASC';
    queryBuilder.orderBy(`config.${sortField}`, sortOrder);

    // Apply pagination
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 20, 100);
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
   * Get configuration by key
   */
  async getConfigurationByKey(key: string): Promise<SystemConfiguration> {
    const config = await this.configRepository.findOne({
      where: { key },
      relations: ['updatedByUser'],
    });

    if (!config) {
      throw new NotFoundException(`Configuration with key '${key}' not found`);
    }

    return config;
  }

  /**
   * Get configuration value by key with type casting
   */
  async getConfigValue<T = any>(key: string): Promise<T> {
    const config = await this.getConfigurationByKey(key);
    return config.getParsedValue() as T;
  }

  /**
   * Create new configuration
   */
  async createConfiguration(
    createDto: CreateConfigDto,
    adminId: string,
  ): Promise<SystemConfiguration> {
    // Check if key already exists
    const existingConfig = await this.configRepository.findOne({
      where: { key: createDto.key },
    });

    if (existingConfig) {
      throw new ConflictException(
        `Configuration with key '${createDto.key}' already exists`,
      );
    }

    // Validate the value
    await this.validateConfigurationValue(
      createDto.value,
      createDto.type,
      createDto.validationSchema,
    );

    const config = this.configRepository.create({
      ...createDto,
      updatedBy: adminId,
    });

    const savedConfig = await this.configRepository.save(config);

    // Log the creation
    await this.auditService.logAdminAction(
      adminId,
      'create',
      'system_configuration',
      savedConfig.id,
      null,
      savedConfig,
    );

    this.logger.log(
      `Configuration '${createDto.key}' created by admin ${adminId}`,
    );

    return savedConfig;
  }

  /**
   * Update configuration
   */
  async updateConfiguration(
    key: string,
    updateDto: UpdateConfigDto,
    adminId: string,
  ): Promise<SystemConfiguration> {
    const config = await this.getConfigurationByKey(key);

    if (!config.isEditable()) {
      throw new BadRequestException(`Configuration '${key}' is not editable`);
    }

    const oldValues = { ...config };

    // Validate the new value if provided
    if (updateDto.value !== undefined) {
      await this.validateConfigurationValue(
        updateDto.value,
        updateDto.type || config.type,
        updateDto.validationSchema !== undefined
          ? updateDto.validationSchema
          : config.validationSchema,
      );
    }

    // Update fields
    Object.assign(config, updateDto, {
      updatedBy: adminId,
      version: this.generateVersion(),
    });

    const savedConfig = await this.configRepository.save(config);

    // Log the update
    await this.auditService.logAdminAction(
      adminId,
      'update',
      'system_configuration',
      savedConfig.id,
      oldValues,
      savedConfig,
    );

    this.logger.log(`Configuration '${key}' updated by admin ${adminId}`);

    return savedConfig;
  }

  /**
   * Delete configuration
   */
  async deleteConfiguration(key: string, adminId: string): Promise<void> {
    const config = await this.getConfigurationByKey(key);

    if (config.isReadOnly) {
      throw new BadRequestException(
        `Configuration '${key}' is read-only and cannot be deleted`,
      );
    }

    await this.configRepository.remove(config);

    // Log the deletion
    await this.auditService.logAdminAction(
      adminId,
      'delete',
      'system_configuration',
      config.id,
      config,
      null,
    );

    this.logger.log(`Configuration '${key}' deleted by admin ${adminId}`);
  }

  /**
   * Backup configurations
   */
  async backupConfigurations(
    category?: ConfigCategory,
    adminId?: string,
  ): Promise<ConfigBackupDto> {
    const queryBuilder = this.configRepository.createQueryBuilder('config');

    if (category) {
      queryBuilder.where('config.category = :category', { category });
    }

    const configurations = await queryBuilder.getMany();

    const backup: ConfigBackupDto = {
      timestamp: new Date(),
      version: this.generateVersion(),
      category,
      configurations: configurations.map((config) => ({
        key: config.key,
        value: config.value,
        description: config.description || undefined,
        category: config.category,
        type: config.type,
        isActive: config.isActive,
        isReadOnly: config.isReadOnly,
        isSecret: config.isSecret,
        validationSchema: config.validationSchema || undefined,
        defaultValue: config.defaultValue || undefined,
        metadata: config.metadata || undefined,
      })),
    };

    if (adminId) {
      await this.auditService.logAdminAction(
        adminId,
        'backup',
        'system_configuration',
        undefined,
        null,
        { category, count: configurations.length },
      );
    }

    this.logger.log(
      `Configuration backup created for category: ${category || 'all'}`,
    );

    return backup;
  }

  /**
   * Restore configurations from backup
   */
  async restoreConfigurations(
    backup: ConfigBackupDto,
    adminId: string,
    options: { overwrite?: boolean; dryRun?: boolean } = {},
  ): Promise<{ restored: number; skipped: number; errors: string[] }> {
    const { overwrite = false, dryRun = false } = options;
    const results: { restored: number; skipped: number; errors: string[] } = {
      restored: 0,
      skipped: 0,
      errors: [],
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const configData of backup.configurations) {
        try {
          const existingConfig = await queryRunner.manager.findOne(
            SystemConfiguration,
            {
              where: { key: configData.key },
            },
          );

          if (existingConfig && !overwrite) {
            results.skipped++;
            continue;
          }

          if (!dryRun) {
            if (existingConfig) {
              // Update existing
              Object.assign(existingConfig, configData, {
                updatedBy: adminId,
                version: this.generateVersion(),
              });
              await queryRunner.manager.save(existingConfig);
            } else {
              // Create new
              const newConfig = queryRunner.manager.create(
                SystemConfiguration,
                {
                  ...configData,
                  updatedBy: adminId,
                  version: this.generateVersion(),
                },
              );
              await queryRunner.manager.save(newConfig);
            }
          }

          results.restored++;
        } catch (error) {
          results.errors.push(
            `Failed to restore '${configData.key}': ${error.message}`,
          );
        }
      }

      if (!dryRun) {
        await queryRunner.commitTransaction();

        // Log the restore operation
        await this.auditService.logAdminAction(
          adminId,
          'restore',
          'system_configuration',
          undefined,
          null,
          { backup: backup.version, results },
        );

        this.logger.log(
          `Configuration restore completed: ${results.restored} restored, ${results.skipped} skipped`,
        );
      } else {
        await queryRunner.rollbackTransaction();
        this.logger.log(
          `Configuration restore dry run completed: ${results.restored} would be restored`,
        );
      }
    } catch (error) {
      await queryRunner.rollbackTransaction();
      this.logger.error(`Configuration restore failed: ${error.message}`);
      throw error;
    } finally {
      await queryRunner.release();
    }

    return results;
  }

  /**
   * Rollback configuration to previous version
   */
  async rollbackConfiguration(
    key: string,
    adminId: string,
  ): Promise<SystemConfiguration> {
    // This would require audit log integration to find previous values
    // For now, we'll implement a basic rollback to default value
    const config = await this.getConfigurationByKey(key);

    if (!config.defaultValue) {
      throw new BadRequestException(
        `Configuration '${key}' has no default value to rollback to`,
      );
    }

    const oldValue = config.value;
    config.value = config.defaultValue;
    config.updatedBy = adminId;
    config.version = this.generateVersion();

    const savedConfig = await this.configRepository.save(config);

    // Log the rollback
    await this.auditService.logAdminAction(
      adminId,
      'rollback',
      'system_configuration',
      savedConfig.id,
      { value: oldValue },
      { value: config.value },
    );

    this.logger.log(`Configuration '${key}' rolled back by admin ${adminId}`);

    return savedConfig;
  }

  /**
   * Validate configuration value
   */
  private async validateConfigurationValue(
    value: string,
    type: ConfigType,
    validationSchema?: string | null,
  ): Promise<void> {
    // Basic type validation
    const tempConfig = new SystemConfiguration();
    tempConfig.type = type;
    tempConfig.value = value;

    if (!tempConfig.isValidValue(value)) {
      throw new BadRequestException(`Invalid value for type '${type}'`);
    }

    // Schema validation if provided
    if (validationSchema) {
      try {
        const schema = JSON.parse(validationSchema);
        const joiSchema = this.buildJoiSchema(schema);
        const { error } = joiSchema.validate(tempConfig.getParsedValue());

        if (error) {
          throw new BadRequestException(
            `Schema validation failed: ${error.message}`,
          );
        }
      } catch (error) {
        if (error instanceof BadRequestException) {
          throw error;
        }
        throw new BadRequestException(
          `Invalid validation schema: ${error.message}`,
        );
      }
    }
  }

  /**
   * Build Joi schema from configuration schema
   */
  private buildJoiSchema(schema: any): Joi.Schema {
    // Basic schema builder - can be extended based on needs
    switch (schema.type) {
      case 'string':
        let stringSchema = Joi.string();
        if (schema.min) stringSchema = stringSchema.min(schema.min);
        if (schema.max) stringSchema = stringSchema.max(schema.max);
        if (schema.pattern)
          stringSchema = stringSchema.pattern(new RegExp(schema.pattern));
        return stringSchema;

      case 'number':
        let numberSchema = Joi.number();
        if (schema.min !== undefined)
          numberSchema = numberSchema.min(schema.min);
        if (schema.max !== undefined)
          numberSchema = numberSchema.max(schema.max);
        return numberSchema;

      case 'boolean':
        return Joi.boolean();

      case 'array':
        return Joi.array().items(this.buildJoiSchema(schema.items));

      case 'object':
        const objectSchema = Joi.object();
        if (schema.properties) {
          const keys = {};
          for (const [key, prop] of Object.entries(schema.properties)) {
            keys[key] = this.buildJoiSchema(prop);
          }
          return objectSchema.keys(keys);
        }
        return objectSchema;

      default:
        return Joi.any();
    }
  }

  /**
   * Generate version string
   */
  private generateVersion(): string {
    return `v${Date.now()}`;
  }

  /**
   * Get configurations by category
   */
  async getConfigurationsByCategory(
    category: ConfigCategory,
  ): Promise<SystemConfiguration[]> {
    return this.configRepository.find({
      where: { category, isActive: true },
      order: { key: 'ASC' },
    });
  }

  /**
   * Bulk update configurations
   */
  async bulkUpdateConfigurations(
    updates: Array<{ key: string; value: string }>,
    adminId: string,
  ): Promise<{ updated: number; errors: string[] }> {
    const results: { updated: number; errors: string[] } = {
      updated: 0,
      errors: [],
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const update of updates) {
        try {
          const config = await queryRunner.manager.findOne(
            SystemConfiguration,
            {
              where: { key: update.key },
            },
          );

          if (!config) {
            results.errors.push(`Configuration '${update.key}' not found`);
            continue;
          }

          if (!config.isEditable()) {
            results.errors.push(
              `Configuration '${update.key}' is not editable`,
            );
            continue;
          }

          // Validate the new value
          await this.validateConfigurationValue(
            update.value,
            config.type,
            config.validationSchema || undefined,
          );

          config.value = update.value;
          config.updatedBy = adminId;
          config.version = this.generateVersion();

          await queryRunner.manager.save(config);
          results.updated++;
        } catch (error) {
          results.errors.push(
            `Failed to update '${update.key}': ${error.message}`,
          );
        }
      }

      await queryRunner.commitTransaction();

      // Log the bulk update
      await this.auditService.logAdminAction(
        adminId,
        'bulk_update',
        'system_configuration',
        undefined,
        null,
        { results, count: updates.length },
      );

      this.logger.log(
        `Bulk configuration update completed: ${results.updated} updated`,
      );
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    return results;
  }
}
