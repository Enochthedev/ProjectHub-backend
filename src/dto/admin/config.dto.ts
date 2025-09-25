import {
  IsString,
  IsOptional,
  IsBoolean,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsArray,
  ValidateNested,
  IsObject,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ConfigType } from '../../common/enums/config-type.enum';
import { ConfigCategory } from '../../common/enums/config-category.enum';

/**
 * DTO for creating a new system configuration
 */
export class CreateConfigDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(ConfigCategory)
  category: ConfigCategory;

  @IsEnum(ConfigType)
  type: ConfigType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean = true;

  @IsOptional()
  @IsBoolean()
  isReadOnly?: boolean = false;

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean = false;

  @IsOptional()
  @IsString()
  validationSchema?: string;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for updating a system configuration
 */
export class UpdateConfigDto {
  @IsOptional()
  @IsString()
  value?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ConfigCategory)
  category?: ConfigCategory;

  @IsOptional()
  @IsEnum(ConfigType)
  type?: ConfigType;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  isReadOnly?: boolean;

  @IsOptional()
  @IsBoolean()
  isSecret?: boolean;

  @IsOptional()
  @IsString()
  validationSchema?: string;

  @IsOptional()
  @IsString()
  defaultValue?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any>;
}

/**
 * DTO for filtering configurations
 */
export class ConfigFiltersDto {
  @IsOptional()
  @IsEnum(ConfigCategory)
  category?: ConfigCategory;

  @IsOptional()
  @IsEnum(ConfigType)
  type?: ConfigType;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isActive?: boolean;

  @IsOptional()
  @IsBoolean()
  @Transform(({ value }) => {
    if (value === 'true') return true;
    if (value === 'false') return false;
    return value;
  })
  isSecret?: boolean;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  sortBy?: string = 'key';

  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'ASC';

  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}

/**
 * DTO for configuration backup data
 */
export class ConfigBackupItemDto {
  @IsString()
  key: string;

  @IsString()
  value: string;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsEnum(ConfigCategory)
  category: ConfigCategory;

  @IsEnum(ConfigType)
  type: ConfigType;

  @IsBoolean()
  isActive: boolean;

  @IsBoolean()
  isReadOnly: boolean;

  @IsBoolean()
  isSecret: boolean;

  @IsOptional()
  @IsString()
  validationSchema?: string | null;

  @IsOptional()
  @IsString()
  defaultValue?: string | null;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, any> | null;
}

/**
 * DTO for configuration backup
 */
export class ConfigBackupDto {
  @IsDateString()
  timestamp: Date;

  @IsString()
  version: string;

  @IsOptional()
  @IsEnum(ConfigCategory)
  category?: ConfigCategory;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ConfigBackupItemDto)
  configurations: ConfigBackupItemDto[];
}

/**
 * DTO for configuration restore options
 */
export class ConfigRestoreOptionsDto {
  @IsOptional()
  @IsBoolean()
  overwrite?: boolean = false;

  @IsOptional()
  @IsBoolean()
  dryRun?: boolean = false;
}

/**
 * DTO for bulk configuration update
 */
export class BulkConfigUpdateItemDto {
  @IsString()
  key: string;

  @IsString()
  value: string;
}

export class BulkConfigUpdateDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => BulkConfigUpdateItemDto)
  updates: BulkConfigUpdateItemDto[];
}

/**
 * DTO for configuration validation schema
 */
export class ConfigValidationSchemaDto {
  @IsString()
  type: string;

  @IsOptional()
  @IsInt()
  min?: number;

  @IsOptional()
  @IsInt()
  max?: number;

  @IsOptional()
  @IsString()
  pattern?: string;

  @IsOptional()
  @IsArray()
  enum?: any[];

  @IsOptional()
  @IsObject()
  properties?: Record<string, any>;

  @IsOptional()
  @IsObject()
  items?: any;

  @IsOptional()
  @IsBoolean()
  required?: boolean;
}

/**
 * Response DTOs
 */
export class ConfigurationResponseDto {
  id: string;
  key: string;
  value: string;
  description?: string;
  category: ConfigCategory;
  type: ConfigType;
  isActive: boolean;
  isReadOnly: boolean;
  isSecret: boolean;
  validationSchema?: string;
  defaultValue?: string;
  metadata?: Record<string, any>;
  version?: string;
  updatedBy?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class ConfigBackupResponseDto {
  timestamp: Date;
  version: string;
  category?: ConfigCategory;
  configurationCount: number;
  size: string;
}

export class ConfigRestoreResultDto {
  restored: number;
  skipped: number;
  errors: string[];
}

export class BulkConfigUpdateResultDto {
  updated: number;
  errors: string[];
}
