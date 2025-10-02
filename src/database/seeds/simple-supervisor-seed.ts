import { DataSource } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { config } from 'dotenv';
import { User } from '../../entities/user.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { SupervisorAvailability, AvailabilityType, DayOfWeek } from '../../entities/supervisor-availability.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import * as bcrypt from 'bcrypt';

// Load environment variables
config();

async function runSimpleSupervisorSeed() {
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
        console.log('🌱 Starting simple supervisor data seeding...');

        await dataSource.initialize();
        console.log('✅ Database connection established');

        const userRepository = dataSource.getRepository(User);
        const profileRepository = dataSource.getRepository(SupervisorProfile);
        const availabilityRepository = dataSource.getRepository(SupervisorAvailability);

        // Create supervisor user
        const hashedPassword = await bcrypt.hash('supervisor123', 10);

        let supervisor = await userRepository.findOne({
            where: { email: 'dr.smith@university.edu' }
        });

        if (!supervisor) {
            supervisor = await userRepository.save({
                email: 'dr.smith@university.edu',
                password: hashedPassword,
                role: UserRole.SUPERVISOR,
                isEmailVerified: true,
                isActive: true,
                firstName: 'Jane',
                lastName: 'Smith',
            });
            console.log('✅ Created supervisor user: dr.smith@university.edu');
        } else {
            console.log('ℹ️ Supervisor user already exists: dr.smith@university.edu');
        }

        // Create supervisor profile
        let profile = await profileRepository.findOne({
            where: { user: { id: supervisor.id } }
        });

        if (!profile) {
            profile = await profileRepository.save({
                user: supervisor,
                name: 'Dr. Jane Smith',
                specializations: ['Artificial Intelligence', 'Machine Learning', 'Data Science'],
                maxStudents: 12,
                isAvailable: true,
                officeLocation: 'Building A, Room 301',
                phoneNumber: '+1-555-0101',
            });
            console.log('✅ Created supervisor profile for Dr. Jane Smith');
        } else {
            console.log('ℹ️ Supervisor profile already exists for Dr. Jane Smith');
        }

        // Create availability slots
        const availabilitySlots = [
            {
                supervisorId: supervisor.id,
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.MONDAY,
                startTime: '09:00',
                endTime: '12:00',
                location: 'Building A, Room 301',
                notes: 'General office hours for all students',
                maxCapacity: 3,
                isActive: true,
            },
            {
                supervisorId: supervisor.id,
                type: AvailabilityType.MEETING_SLOTS,
                dayOfWeek: DayOfWeek.WEDNESDAY,
                startTime: '14:00',
                endTime: '17:00',
                location: 'Building A, Room 301',
                notes: 'Individual project consultations',
                maxCapacity: 1,
                isActive: true,
            },
            {
                supervisorId: supervisor.id,
                type: AvailabilityType.OFFICE_HOURS,
                dayOfWeek: DayOfWeek.FRIDAY,
                startTime: '10:00',
                endTime: '13:00',
                location: 'Building A, Room 301',
                notes: 'AI/ML project discussions',
                maxCapacity: 4,
                isActive: true,
            },
        ];

        for (const slot of availabilitySlots) {
            const existingSlot = await availabilityRepository.findOne({
                where: {
                    supervisorId: slot.supervisorId,
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                },
            });

            if (!existingSlot) {
                await availabilityRepository.save(slot);
                console.log(`✅ Created availability slot for ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][slot.dayOfWeek]} ${slot.startTime}-${slot.endTime}`);
            } else {
                console.log(`ℹ️ Availability slot already exists for ${['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'][slot.dayOfWeek]} ${slot.startTime}-${slot.endTime}`);
            }
        }

        console.log('🎉 Simple supervisor data seeding completed successfully!');
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
runSimpleSupervisorSeed();