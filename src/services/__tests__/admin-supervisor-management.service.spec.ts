import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { AdminSupervisorManagementService } from '../admin-supervisor-management.service';
import { User } from '../../entities/user.entity';
import { SupervisorProfile } from '../../entities/supervisor-profile.entity';
import { StudentProfile } from '../../entities/student-profile.entity';
import { AdminAuditLog } from '../../entities/admin-audit-log.entity';
import {
  SupervisorAssignmentDto,
  AssignmentAction,
} from '../../dto/admin/supervisor-management.dto';
import { UserRole } from '../../common/enums';

describe('AdminSupervisorManagementService', () => {
  let service: AdminSupervisorManagementService;
  let userRepository: jest.Mocked<Repository<User>>;
  let supervisorProfileRepository: jest.Mocked<Repository<SupervisorProfile>>;
  let studentProfileRepository: jest.Mocked<Repository<StudentProfile>>;
  let auditRepository: jest.Mocked<Repository<AdminAuditLog>>;
  let dataSource: jest.Mocked<DataSource>;

  const mockAdmin: Partial<User> = {
    id: 'admin-1',
    email: 'admin@test.com',
    role: UserRole.ADMIN,
  };

  const mockStudent: Partial<User> = {
    id: 'student-1',
    email: 'student@test.com',
    role: UserRole.STUDENT,
  };

  const mockSupervisor: Partial<User> = {
    id: 'supervisor-1',
    email: 'supervisor@test.com',
    role: UserRole.SUPERVISOR,
  };

  const mockAssignmentDto: SupervisorAssignmentDto = {
    studentId: 'student-1',
    supervisorId: 'supervisor-1',
    action: AssignmentAction.ASSIGN,
    reason: 'Student specialization matches supervisor expertise',
    notifyParties: true,
  };

  beforeEach(async () => {
    const mockQueryRunner = {
      connect: jest.fn(),
      startTransaction: jest.fn(),
      commitTransaction: jest.fn(),
      rollbackTransaction: jest.fn(),
      release: jest.fn(),
      manager: {
        update: jest.fn(),
        create: jest.fn(),
        save: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminSupervisorManagementService,
        {
          provide: getRepositoryToken(User),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(SupervisorProfile),
          useValue: {
            findOne: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(StudentProfile),
          useValue: {
            findOne: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(AdminAuditLog),
          useValue: {
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn().mockReturnValue(mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<AdminSupervisorManagementService>(
      AdminSupervisorManagementService,
    );
    userRepository = module.get(getRepositoryToken(User));
    supervisorProfileRepository = module.get(
      getRepositoryToken(SupervisorProfile),
    );
    studentProfileRepository = module.get(getRepositoryToken(StudentProfile));
    auditRepository = module.get(getRepositoryToken(AdminAuditLog));
    dataSource = module.get(DataSource);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('assignStudent', () => {
    it('should successfully assign student to supervisor', async () => {
      // Arrange
      userRepository.findOne
        .mockResolvedValueOnce(mockAdmin as User) // admin
        .mockResolvedValueOnce(mockStudent as User) // student
        .mockResolvedValueOnce(mockSupervisor as User); // supervisor

      const mockQueryRunner = dataSource.createQueryRunner();

      // Act
      const result = await service.assignStudent(mockAssignmentDto, 'admin-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(true);
      expect(result.studentId).toBe('student-1');
      expect(result.supervisorId).toBe('supervisor-1');
      expect(result.action).toBe(AssignmentAction.ASSIGN);
      expect(result.assignedBy).toBe('admin-1');
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should handle assignment errors gracefully', async () => {
      // Arrange
      userRepository.findOne.mockRejectedValue(new Error('User not found'));

      // Act
      const result = await service.assignStudent(mockAssignmentDto, 'admin-1');

      // Assert
      expect(result).toBeDefined();
      expect(result.success).toBe(false);
      expect(result.error).toBe('User not found');
      expect(result.studentId).toBe('student-1');
      expect(result.supervisorId).toBe('supervisor-1');
    });
  });
});
