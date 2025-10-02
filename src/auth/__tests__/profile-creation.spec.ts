import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthService } from '../auth.service';
import { User } from '../../entities/user.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { PasswordService } from '../services/password.service';
import { EmailService } from '../services/email.service';
import { JwtTokenService } from '../services/jwt.service';
import { AuditService } from '../services/audit.service';
import { TokenManagementService } from '../services/token-management.service';
import { NotificationService } from '../../services/notification.service';

describe('AuthService - Profile Creation', () => {
    let service: AuthService;
    let userRepository: Repository<User>;
    let studentProfileRepository: Repository<StudentProfile>;
    let supervisorProfileRepository: Repository<SupervisorProfile>;
    let notificationService: NotificationService;

    const mockUserRepository = {
        create: jest.fn(),
        save: jest.fn(),
        findOne: jest.fn(),
    };

    const mockStudentProfileRepository = {
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockSupervisorProfileRepository = {
        create: jest.fn(),
        save: jest.fn(),
    };

    const mockPasswordService = {
        validatePasswordStrength: jest.fn(),
        hashPassword: jest.fn(),
    };

    const mockEmailService = {
        isUniversityEmail: jest.fn(),
        generateVerificationToken: jest.fn(),
        sendEmailVerification: jest.fn(),
    };

    const mockJwtTokenService = {
        generateTokenPair: jest.fn(),
    };

    const mockAuditService = {
        logRegistration: jest.fn(),
    };

    const mockTokenManagementService = {
        storeRefreshToken: jest.fn(),
    };

    const mockNotificationService = {
        initializeDefaultPreferences: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                AuthService,
                {
                    provide: getRepositoryToken(User),
                    useValue: mockUserRepository,
                },
                {
                    provide: getRepositoryToken(StudentProfile),
                    useValue: mockStudentProfileRepository,
                },
                {
                    provide: getRepositoryToken(SupervisorProfile),
                    useValue: mockSupervisorProfileRepository,
                },
                {
                    provide: PasswordService,
                    useValue: mockPasswordService,
                },
                {
                    provide: EmailService,
                    useValue: mockEmailService,
                },
                {
                    provide: JwtTokenService,
                    useValue: mockJwtTokenService,
                },
                {
                    provide: AuditService,
                    useValue: mockAuditService,
                },
                {
                    provide: TokenManagementService,
                    useValue: mockTokenManagementService,
                },
                {
                    provide: NotificationService,
                    useValue: mockNotificationService,
                },
            ],
        }).compile();

        service = module.get<AuthService>(AuthService);
        userRepository = module.get<Repository<User>>(getRepositoryToken(User));
        studentProfileRepository = module.get<Repository<StudentProfile>>(
            getRepositoryToken(StudentProfile),
        );
        supervisorProfileRepository = module.get<Repository<SupervisorProfile>>(
            getRepositoryToken(SupervisorProfile),
        );
        notificationService = module.get<NotificationService>(NotificationService);
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    describe('register with profile creation', () => {
        const mockRegisterDto = {
            email: 'student@ui.edu.ng',
            password: 'SecurePass123!',
            role: UserRole.STUDENT,
            name: 'John Doe',
            skills: ['JavaScript', 'React'],
            interests: ['Web Development', 'AI'],
        };

        const mockUser = {
            id: 'user-id',
            email: 'student@ui.edu.ng',
            role: UserRole.STUDENT,
            isEmailVerified: false,
            isActive: true,
        };

        const mockTokens = {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        };

        beforeEach(() => {
            mockUserRepository.findOne.mockResolvedValue(null); // No existing user
            mockEmailService.isUniversityEmail.mockReturnValue(true);
            mockPasswordService.validatePasswordStrength.mockReturnValue({ isValid: true, errors: [] });
            mockPasswordService.hashPassword.mockResolvedValue('hashed-password');
            mockEmailService.generateVerificationToken.mockReturnValue('verification-token');
            mockUserRepository.create.mockReturnValue(mockUser);
            mockUserRepository.save.mockResolvedValue(mockUser);
            mockJwtTokenService.generateTokenPair.mockResolvedValue(mockTokens);
            mockTokenManagementService.storeRefreshToken.mockResolvedValue(undefined);
            mockEmailService.sendEmailVerification.mockResolvedValue('email-delivery-id');
            mockAuditService.logRegistration.mockResolvedValue(undefined);
            mockNotificationService.initializeDefaultPreferences.mockResolvedValue(undefined);
        });

        it('should create student profile during registration', async () => {
            const mockStudentProfile = {
                id: 'profile-id',
                user: mockUser,
                name: 'John Doe',
                skills: ['JavaScript', 'React'],
                interests: ['Web Development', 'AI'],
                preferredSpecializations: [],
            };

            mockStudentProfileRepository.create.mockReturnValue(mockStudentProfile);
            mockStudentProfileRepository.save.mockResolvedValue(mockStudentProfile);

            // Mock getUserWithProfile to return user with profile
            const userWithProfile = { ...mockUser, studentProfile: mockStudentProfile };
            jest.spyOn(service as any, 'getUserWithProfile').mockResolvedValue(userWithProfile);

            const result = await service.register(mockRegisterDto);

            expect(mockStudentProfileRepository.create).toHaveBeenCalledWith({
                user: mockUser,
                name: 'John Doe',
                skills: ['JavaScript', 'React'],
                interests: ['Web Development', 'AI'],
                preferredSpecializations: [],
            });
            expect(mockStudentProfileRepository.save).toHaveBeenCalledWith(mockStudentProfile);
            expect(mockNotificationService.initializeDefaultPreferences).toHaveBeenCalledWith(
                'user-id',
                UserRole.STUDENT,
            );
            expect(result.user).toEqual(expect.objectContaining({
                id: 'user-id',
                email: 'student@ui.edu.ng',
                role: UserRole.STUDENT,
                studentProfile: mockStudentProfile,
            }));
        });

        it('should create supervisor profile during registration', async () => {
            const supervisorRegisterDto = {
                ...mockRegisterDto,
                email: 'supervisor@ui.edu.ng',
                role: UserRole.SUPERVISOR,
                specializations: ['Web Development', 'AI'],
            };

            const supervisorUser = {
                ...mockUser,
                email: 'supervisor@ui.edu.ng',
                role: UserRole.SUPERVISOR,
            };

            const mockSupervisorProfile = {
                id: 'profile-id',
                user: supervisorUser,
                name: 'John Doe',
                specializations: ['Web Development', 'AI'],
                isAvailable: true,
                maxStudents: 5,
            };

            mockUserRepository.create.mockReturnValue(supervisorUser);
            mockUserRepository.save.mockResolvedValue(supervisorUser);
            mockSupervisorProfileRepository.create.mockReturnValue(mockSupervisorProfile);
            mockSupervisorProfileRepository.save.mockResolvedValue(mockSupervisorProfile);

            // Mock getUserWithProfile to return user with profile
            const userWithProfile = { ...supervisorUser, supervisorProfile: mockSupervisorProfile };
            jest.spyOn(service as any, 'getUserWithProfile').mockResolvedValue(userWithProfile);

            const result = await service.register(supervisorRegisterDto);

            expect(mockSupervisorProfileRepository.create).toHaveBeenCalledWith({
                user: supervisorUser,
                name: 'John Doe',
                specializations: ['Web Development', 'AI'],
                isAvailable: true,
                maxStudents: 5,
            });
            expect(mockSupervisorProfileRepository.save).toHaveBeenCalledWith(mockSupervisorProfile);
            expect(mockNotificationService.initializeDefaultPreferences).toHaveBeenCalledWith(
                'user-id',
                UserRole.SUPERVISOR,
            );
            expect(result.user).toEqual(expect.objectContaining({
                id: 'user-id',
                email: 'supervisor@ui.edu.ng',
                role: UserRole.SUPERVISOR,
                supervisorProfile: mockSupervisorProfile,
            }));
        });

        it('should handle profile creation failure gracefully', async () => {
            mockStudentProfileRepository.create.mockReturnValue({});
            mockStudentProfileRepository.save.mockRejectedValue(new Error('Database error'));

            await expect(service.register(mockRegisterDto)).rejects.toThrow('Failed to create user profile');
        });
    });

    describe('login with profile data', () => {
        const mockLoginDto = {
            email: 'student@ui.edu.ng',
            password: 'SecurePass123!',
        };

        const mockUser = {
            id: 'user-id',
            email: 'student@ui.edu.ng',
            password: 'hashed-password',
            role: UserRole.STUDENT,
            isEmailVerified: true,
            isActive: true,
        };

        const mockStudentProfile = {
            id: 'profile-id',
            name: 'John Doe',
            skills: ['JavaScript', 'React'],
            interests: ['Web Development', 'AI'],
        };

        const mockTokens = {
            accessToken: 'access-token',
            refreshToken: 'refresh-token',
        };

        beforeEach(() => {
            mockUserRepository.findOne.mockResolvedValue(mockUser);
            mockPasswordService.comparePasswords.mockResolvedValue(true);
            mockJwtTokenService.generateTokenPair.mockResolvedValue(mockTokens);
            mockTokenManagementService.storeRefreshToken.mockResolvedValue(undefined);
            mockAuditService.logLoginSuccess.mockResolvedValue(undefined);
        });

        it('should return user with profile data on login', async () => {
            const userWithProfile = { ...mockUser, studentProfile: mockStudentProfile };
            jest.spyOn(service as any, 'getUserWithProfile').mockResolvedValue(userWithProfile);

            const result = await service.login(mockLoginDto);

            expect(result.user).toEqual(expect.objectContaining({
                id: 'user-id',
                email: 'student@ui.edu.ng',
                role: UserRole.STUDENT,
                studentProfile: mockStudentProfile,
            }));
            expect(result.user).not.toHaveProperty('password');
        });
    });
});