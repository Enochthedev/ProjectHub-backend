import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import SupervisorDataSeeder from './supervisor-data.seed';

// Load environment variables
config();

async function runSupervisorSeeds() {
    const configService = new ConfigService();

    // Check if DATABASE_URL is provided (production/Render)
    const databaseUrl = configService.get('DATABASE_URL');

    let dataSourceConfig: any;

    if (databaseUrl) {
        // Production: Use DATABASE_URL
        dataSourceConfig = {
            type: 'postgres',
            url: databaseUrl,
            entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
            synchronize: false,
            logging: true,
            ssl: {
                rejectUnauthorized: false,
            },
        };
    } else {
        // Development: Use individual connection parameters
        dataSourceConfig = {
            type: 'postgres',
            host: configService.get('DATABASE_HOST') || 'localhost',
            port: configService.get('DATABASE_PORT') || 5432,
            username: configService.get('DATABASE_USERNAME') || 'postgres',
            password: configService.get('DATABASE_PASSWORD') || 'password',
            database: configService.get('DATABASE_NAME') || 'projecthub',
            entities: [__dirname + '/../../**/*.entity{.ts,.js}'],
            synchronize: false,
            logging: true,
        };
    }

    const dataSource = new DataSource(dataSourceConfig);

    try {
        console.log('🌱 Starting supervisor data seeding...');

        await dataSource.initialize();
        console.log('✅ Database connection established');

        const seeder = new SupervisorDataSeeder(dataSource);
        await seeder.seed();

        console.log('🎉 Supervisor data seeding completed successfully!');
    } catch (error) {
        console.error('❌ Error during supervisor data seeding:', error);
        process.exit(1);
    } finally {
        if (dataSource.isInitialized) {
            await dataSource.destroy();
            console.log('🔌 Database connection closed');
        }
    }
}

// Run the seeder
runSupervisorSeeds();