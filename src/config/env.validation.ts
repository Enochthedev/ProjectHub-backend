import { plainToInstance, Transform } from 'class-transformer';
import { IsEnum, IsNumber, IsString, IsOptional, validateSync } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  @IsEnum(Environment)
  NODE_ENV: Environment;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  PORT: number;

  // DATABASE_URL for production (Render, Railway, etc.)
  @IsOptional()
  @IsString()
  DATABASE_URL?: string;

  // Individual database fields for development
  @IsOptional()
  @IsString()
  DATABASE_HOST?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  DATABASE_PORT?: number;

  @IsOptional()
  @IsString()
  DATABASE_USERNAME?: string;

  @IsOptional()
  @IsString()
  DATABASE_PASSWORD?: string;

  @IsOptional()
  @IsString()
  DATABASE_NAME?: string;

  @IsString()
  JWT_SECRET: string;

  @IsString()
  JWT_EXPIRES_IN: string;

  @IsString()
  JWT_REFRESH_SECRET: string;

  @IsString()
  JWT_REFRESH_EXPIRES_IN: string;

  @IsOptional()
  @IsString()
  EMAIL_HOST?: string;

  @IsOptional()
  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  EMAIL_PORT?: number;

  @IsOptional()
  @IsString()
  EMAIL_USER?: string;

  @IsOptional()
  @IsString()
  EMAIL_PASSWORD?: string;

  @IsString()
  FRONTEND_URL: string;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  THROTTLE_TTL: number;

  @IsNumber()
  @Transform(({ value }) => parseInt(value, 10))
  THROTTLE_LIMIT: number;

  @IsOptional()
  @IsString()
  HUGGING_FACE_API_KEY?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });
  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(errors.toString());
  }
  return validatedConfig;
}
