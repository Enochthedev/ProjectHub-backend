import { DataSource } from 'typeorm';
import { Test, TestingModule } from '@nestjs/testing';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { User, StudentProfile, SupervisorProfile } from '../../entities';
import { DatabaseCleanupUtil } from './database-cleanup.util';

export class TestDatabaseUtil {
  private static dataSource: DataSource;
  private static module: TestingModule;

  /**
   * Setup test database connection
   */
  static async setupTestDatabase(): Promise<DataSource> {
    if (this.dataSource) {
      return this.dataSource;
    }

    this.module = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test', // Use separate test environment
        }),
        TypeOrmModule.forRootAsync({
          imports: [ConfigModule],
          useFactory: (configService: ConfigService) => ({
            type: 'postgres',
            host: configService.get('DATABASE_HOST', 'localhost'),
            port: configService.get('DATABASE_PORT', 5432),
            username: configService.get('DATABASE_USERNAME', 'test'),
            password: configService.get('DATABASE_PASSWORD', 'test'),
            database: configService.get('DATABASE_NAME', 'fyp_test'),
            entities: [User, StudentProfile, SupervisorProfile],
            synchronize: true, // Auto-create tables for tests
            dropSchema: false, // Don't drop schema automatically
            logging: false, // Disable logging in tests
          }),
          inject: [ConfigService],
        }),
      ],
    }).compile();

    this.dataSource = this.module.get<DataSource>(DataSource);
    return this.dataSource;
  }

  /**
   * Get the test database connection
   */
  static getDataSource(): DataSource {
    if (!this.dataSource) {
      throw new Error(
        'Test database not initialized. Call setupTestDatabase() first.',
      );
    }
    return this.dataSource;
  }

  /**
   * Clean database before each test
   */
  static async beforeEach(): Promise<void> {
    const dataSource = this.getDataSource();
    await DatabaseCleanupUtil.cleanAll(dataSource);
  }

  /**
   * Clean database after each test
   */
  static async afterEach(): Promise<void> {
    const dataSource = this.getDataSource();
    await DatabaseCleanupUtil.cleanTestUsers(dataSource);
  }

  /**
   * Setup database for the entire test suite
   */
  static async beforeAll(): Promise<void> {
    await this.setupTestDatabase();
    const dataSource = this.getDataSource();

    // Ensure clean state
    await DatabaseCleanupUtil.cleanAll(dataSource);
  }

  /**
   * Cleanup after the entire test suite
   */
  static async afterAll(): Promise<void> {
    if (this.dataSource) {
      await DatabaseCleanupUtil.cleanAll(this.dataSource);
      await this.dataSource.destroy();
    }

    if (this.module) {
      await this.module.close();
    }
  }

  /**
   * Create a transaction for isolated testing
   */
  static async withTransaction<T>(
    callback: (dataSource: DataSource) => Promise<T>,
  ): Promise<T> {
    const dataSource = this.getDataSource();

    return await dataSource.transaction(async (manager) => {
      // Create a temporary data source with the transaction manager
      const transactionalDataSource = {
        ...dataSource,
        manager,
        getRepository: (entity: any) => manager.getRepository(entity),
      } as DataSource;

      return await callback(transactionalDataSource);
    });
  }

  /**
   * Get repository for testing
   */
  static getRepository<T>(entity: new () => T) {
    const dataSource = this.getDataSource();
    return dataSource.getRepository(entity);
  }

  /**
   * Execute raw SQL for complex test scenarios
   */
  static async executeQuery(query: string, parameters?: any[]): Promise<any> {
    const dataSource = this.getDataSource();
    return await dataSource.query(query, parameters);
  }

  /**
   * Check if database is ready for testing
   */
  static async isReady(): Promise<boolean> {
    try {
      if (!this.dataSource) {
        return false;
      }

      await this.dataSource.query('SELECT 1');
      return true;
    } catch (error) {
      return false;
    }
  }
}
