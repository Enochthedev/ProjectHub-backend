import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';

config();

const configService = new ConfigService();

// Check if DATABASE_URL is provided (production/Render)
const databaseUrl = configService.get('DATABASE_URL');

let dataSourceConfig: any;

if (databaseUrl) {
  // Production: Use DATABASE_URL (Render provides this)
  dataSourceConfig = {
    type: 'postgres',
    url: databaseUrl,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
    logging: configService.get('NODE_ENV') === 'development',
    ssl: {
      rejectUnauthorized: false, // Required for Render PostgreSQL
    },
  };
} else {
  // Development: Use individual connection parameters
  dataSourceConfig = {
    type: 'postgres',
    host: configService.get('DATABASE_HOST'),
    port: configService.get('DATABASE_PORT'),
    username: configService.get('DATABASE_USERNAME'),
    password: configService.get('DATABASE_PASSWORD'),
    database: configService.get('DATABASE_NAME'),
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/../migrations/*{.ts,.js}'],
    synchronize: false,
    logging: configService.get('NODE_ENV') === 'development',
  };
}

export default new DataSource(dataSourceConfig);
