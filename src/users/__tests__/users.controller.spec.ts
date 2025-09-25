import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import request from 'supertest';
import { UsersController } from '../users.controller';
import { StudentProfileService } from '../student-profile.service';
import { SupervisorProfileService } from '../supervisor-profile.service';
import { User } from '../../entities/user.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { UserRole } from '../../common/enums/user-role.enum';
import { UpdateStudentProfileDto } from '../../dto/profile/update-student-profile.dto';
import { UpdateSupervisorProfileDto } from '../../dto/profile/update-supervisor-profile.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';

describe('UsersController (Integration)', () => {
  let app: INestApplication;
  let studentProfileService: StudentProfileService;
  let supervisorProfileService: SupervisorProfileService;

  const mockStudentUser = {
    id: 'student-user-id',
    email: 'student@ui.edu.ng',
    role: UserRole.STUDENT,
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockSupervisorUser = {
    id: 'supervisor-user-id',
    email: 'supervisor@ui.edu.ng',
    role: UserRole.SUPERVISOR,
    isEmailVerified: true,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockStudentProfile = {
    id: 'student-profile-id',
    name: 'Test Student',
    skills: ['JavaScript', 'TypeScript'],
    interests: ['Web Development', 'AI'],
    preferredSpecializations: ['Web Development & Full Stack'],
    currentYear: 4,
    gpa: 4.5,
    profileUpdatedAt: new Date(),
  };

  const mockSupervisorProfile = {
    id: 'supervisor-profile-id',
    name: 'Test Supervisor',
    specializations: [
      'Web Development & Full Stack',
      'Software Engineering & Architecture',
    ],
    maxStudents: 5,
    isAvailable: true,
    officeLocation: 'Room 101',
    phoneNumber: '+2348012345678',
  };

  const mockStudentProfileService = {
    getStudentProfile: jest.fn(),
    createStudentProfile: jest.fn(),
    updateStudentProfile: jest.fn(),
  };

  const mockSupervisorProfileService = {
    getSupervisorProfile: jest.fn(),
    createSupervisorProfile: jest.fn(),
    updateSupervisorProfile: jest.fn(),
    toggleAvailability: jest.fn(),
    updateCapacity: jest.fn(),
  };

  const mockJwtAuthGuard = {
    canActivate: jest.fn(() => true),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      imports: [
        ConfigModule.forRoot({
          isGlobal: true,
          envFilePath: '.env.test',
        }),
        TypeOrmModule.forRoot({
          type: 'sqlite',
          database: ':memory:',
          entities: [User, StudentProfile, SupervisorProfile],
          synchronize: true,
        }),
        TypeOrmModule.forFeature([User, StudentProfile, SupervisorProfile]),
        JwtModule.register({
          secret: 'test-secret',
          signOptions: { expiresIn: '1h' },
        }),
      ],
      controllers: [UsersController],
      providers: [
        {
          provide: StudentProfileService,
          useValue: mockStudentProfileService,
        },
        {
          provide: SupervisorProfileService,
          useValue: mockSupervisorProfileService,
        },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useValue(mockJwtAuthGuard)
      .compile();

    app = module.createNestApplication();
    studentProfileService = module.get<StudentProfileService>(
      StudentProfileService,
    );
    supervisorProfileService = module.get<SupervisorProfileService>(
      SupervisorProfileService,
    );
    await app.init();
  });

  afterEach(async () => {
    await app.close();
    jest.clearAllMocks();
  });

  describe('GET /users/profile', () => {
    it('should get student profile successfully', async () => {
      mockStudentProfileService.getStudentProfile.mockResolvedValue(
        mockStudentProfile,
      );

      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('user', JSON.stringify(mockStudentUser))
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockStudentUser,
          studentProfile: mockStudentProfile,
        },
      });

      expect(mockStudentProfileService.getStudentProfile).toHaveBeenCalledWith(
        mockStudentUser.id,
      );
    });

    it('should get supervisor profile successfully', async () => {
      mockSupervisorProfileService.getSupervisorProfile.mockResolvedValue(
        mockSupervisorProfile,
      );

      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('user', JSON.stringify(mockSupervisorUser))
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: {
          ...mockSupervisorUser,
          supervisorProfile: mockSupervisorProfile,
        },
      });

      expect(
        mockSupervisorProfileService.getSupervisorProfile,
      ).toHaveBeenCalledWith(mockSupervisorUser.id);
    });

    it('should handle user without profile gracefully', async () => {
      mockStudentProfileService.getStudentProfile.mockRejectedValue(
        new Error('Profile not found'),
      );

      const response = await request(app.getHttpServer())
        .get('/users/profile')
        .set('user', JSON.stringify(mockStudentUser))
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        data: mockStudentUser,
      });
    });
  });

  describe('PUT /users/profile', () => {
    it('should update existing student profile successfully', async () => {
      const updateDto: UpdateStudentProfileDto = {
        name: 'Updated Student',
        skills: ['React', 'Node.js'],
        interests: ['Machine Learning'],
      };

      mockStudentProfileService.updateStudentProfile.mockResolvedValue({
        ...mockStudentProfile,
        ...updateDto,
      });

      const response = await request(app.getHttpServer())
        .put('/users/profile')
        .set('user', JSON.stringify(mockStudentUser))
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Student profile updated successfully',
      );
      expect(response.body.data.studentProfile.name).toBe(updateDto.name);

      expect(
        mockStudentProfileService.updateStudentProfile,
      ).toHaveBeenCalledWith(mockStudentUser.id, updateDto);
    });

    it('should create new student profile when none exists', async () => {
      const updateDto: UpdateStudentProfileDto = {
        name: 'New Student',
        skills: ['Python'],
        interests: ['Data Science'],
      };

      mockStudentProfileService.updateStudentProfile.mockRejectedValue(
        new Error('Profile not found'),
      );
      mockStudentProfileService.createStudentProfile.mockResolvedValue({
        ...mockStudentProfile,
        ...updateDto,
      });

      const response = await request(app.getHttpServer())
        .put('/users/profile')
        .set('user', JSON.stringify(mockStudentUser))
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Student profile updated successfully',
      );

      expect(
        mockStudentProfileService.createStudentProfile,
      ).toHaveBeenCalledWith(mockStudentUser.id, updateDto);
    });

    it('should update existing supervisor profile successfully', async () => {
      const updateDto: UpdateSupervisorProfileDto = {
        name: 'Updated Supervisor',
        specializations: ['Artificial Intelligence & Machine Learning'],
        maxStudents: 8,
      };

      mockSupervisorProfileService.updateSupervisorProfile.mockResolvedValue({
        ...mockSupervisorProfile,
        ...updateDto,
      });

      const response = await request(app.getHttpServer())
        .put('/users/profile')
        .set('user', JSON.stringify(mockSupervisorUser))
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Supervisor profile updated successfully',
      );
      expect(response.body.data.supervisorProfile.name).toBe(updateDto.name);

      expect(
        mockSupervisorProfileService.updateSupervisorProfile,
      ).toHaveBeenCalledWith(mockSupervisorUser.id, updateDto);
    });

    it('should create new supervisor profile when none exists', async () => {
      const updateDto: UpdateSupervisorProfileDto = {
        name: 'New Supervisor',
        specializations: ['Cybersecurity & Information Security'],
        maxStudents: 3,
      };

      mockSupervisorProfileService.updateSupervisorProfile.mockRejectedValue(
        new Error('Profile not found'),
      );
      mockSupervisorProfileService.createSupervisorProfile.mockResolvedValue({
        ...mockSupervisorProfile,
        ...updateDto,
      });

      const response = await request(app.getHttpServer())
        .put('/users/profile')
        .set('user', JSON.stringify(mockSupervisorUser))
        .send(updateDto)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.message).toBe(
        'Supervisor profile updated successfully',
      );

      expect(
        mockSupervisorProfileService.createSupervisorProfile,
      ).toHaveBeenCalledWith(mockSupervisorUser.id, updateDto);
    });

    it('should reject profile update for admin users', async () => {
      const adminUser = { ...mockStudentUser, role: UserRole.ADMIN };

      await request(app.getHttpServer())
        .put('/users/profile')
        .set('user', JSON.stringify(adminUser))
        .send({ name: 'Admin' })
        .expect(400);
    });

    it('should require name for new student profile', async () => {
      const updateDto = { skills: ['JavaScript'] }; // Missing name

      mockStudentProfileService.updateStudentProfile.mockRejectedValue(
        new Error('Profile not found'),
      );

      await request(app.getHttpServer())
        .put('/users/profile')
        .set('user', JSON.stringify(mockStudentUser))
        .send(updateDto)
        .expect(400);
    });

    it('should require name and specializations for new supervisor profile', async () => {
      const updateDto = { maxStudents: 5 }; // Missing name and specializations

      mockSupervisorProfileService.updateSupervisorProfile.mockRejectedValue(
        new Error('Profile not found'),
      );

      await request(app.getHttpServer())
        .put('/users/profile')
        .set('user', JSON.stringify(mockSupervisorUser))
        .send(updateDto)
        .expect(400);
    });
  });

  describe('PUT /users/profile/toggle-availability', () => {
    it('should toggle supervisor availability successfully', async () => {
      mockSupervisorProfileService.toggleAvailability.mockResolvedValue({
        ...mockSupervisorProfile,
        isAvailable: false,
      });

      const response = await request(app.getHttpServer())
        .put('/users/profile/toggle-availability')
        .set('user', JSON.stringify(mockSupervisorUser))
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Availability disabled successfully',
        data: {
          isAvailable: false,
        },
      });

      expect(
        mockSupervisorProfileService.toggleAvailability,
      ).toHaveBeenCalledWith(mockSupervisorUser.id);
    });

    it('should reject availability toggle for non-supervisor users', async () => {
      await request(app.getHttpServer())
        .put('/users/profile/toggle-availability')
        .set('user', JSON.stringify(mockStudentUser))
        .expect(400);

      expect(
        mockSupervisorProfileService.toggleAvailability,
      ).not.toHaveBeenCalled();
    });
  });

  describe('PUT /users/profile/capacity', () => {
    it('should update supervisor capacity successfully', async () => {
      const newCapacity = { maxStudents: 10 };

      mockSupervisorProfileService.updateCapacity.mockResolvedValue({
        ...mockSupervisorProfile,
        maxStudents: newCapacity.maxStudents,
      });

      const response = await request(app.getHttpServer())
        .put('/users/profile/capacity')
        .set('user', JSON.stringify(mockSupervisorUser))
        .send(newCapacity)
        .expect(200);

      expect(response.body).toEqual({
        success: true,
        message: 'Capacity updated successfully',
        data: {
          maxStudents: newCapacity.maxStudents,
          isAvailable: mockSupervisorProfile.isAvailable,
        },
      });

      expect(mockSupervisorProfileService.updateCapacity).toHaveBeenCalledWith(
        mockSupervisorUser.id,
        newCapacity.maxStudents,
      );
    });

    it('should reject capacity update for non-supervisor users', async () => {
      await request(app.getHttpServer())
        .put('/users/profile/capacity')
        .set('user', JSON.stringify(mockStudentUser))
        .send({ maxStudents: 5 })
        .expect(400);

      expect(
        mockSupervisorProfileService.updateCapacity,
      ).not.toHaveBeenCalled();
    });

    it('should reject invalid capacity values', async () => {
      await request(app.getHttpServer())
        .put('/users/profile/capacity')
        .set('user', JSON.stringify(mockSupervisorUser))
        .send({ maxStudents: 'invalid' })
        .expect(400);

      expect(
        mockSupervisorProfileService.updateCapacity,
      ).not.toHaveBeenCalled();
    });

    it('should reject missing capacity values', async () => {
      await request(app.getHttpServer())
        .put('/users/profile/capacity')
        .set('user', JSON.stringify(mockSupervisorUser))
        .send({})
        .expect(400);

      expect(
        mockSupervisorProfileService.updateCapacity,
      ).not.toHaveBeenCalled();
    });
  });
});
