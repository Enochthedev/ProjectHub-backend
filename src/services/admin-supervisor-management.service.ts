import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { User } from '../entities/user.entity';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import { StudentProfile } from '../entities/student-profile.entity';
import { AdminAuditLog } from '../entities/admin-audit-log.entity';
import {
  SupervisorAssignmentDto,
  SupervisorAssignmentResultDto,
  AssignmentAction,
} from '../dto/admin/supervisor-management.dto';
import { UserRole } from '../common/enums';
import {
  ResourceNotFoundException,
  ProjectValidationException,
  InsufficientPermissionsException,
} from '../common/exceptions';

@Injectable()
export class AdminSupervisorManagementService {
  private readonly logger = new Logger(AdminSupervisorManagementService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(SupervisorProfile)
    private readonly supervisorProfileRepository: Repository<SupervisorProfile>,
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(AdminAuditLog)
    private readonly auditRepository: Repository<AdminAuditLog>,
    private readonly dataSource: DataSource,
  ) {}

  async assignStudent(
    assignmentDto: SupervisorAssignmentDto,
    adminId: string,
  ): Promise<SupervisorAssignmentResultDto> {
    this.logger.log(
      `Assigning student ${assignmentDto.studentId} to supervisor ${assignmentDto.supervisorId}`,
    );

    try {
      const admin = await this.findAdminById(adminId);
      const student = await this.findStudentById(assignmentDto.studentId);
      const supervisor = await this.findSupervisorById(
        assignmentDto.supervisorId,
      );

      const queryRunner = this.dataSource.createQueryRunner();
      await queryRunner.connect();
      await queryRunner.startTransaction();

      try {
        await this.validateAssignment(assignmentDto, student, supervisor);
        await this.processAssignment(
          assignmentDto,
          student,
          supervisor,
          adminId,
          queryRunner,
        );
        await this.logAssignmentAction(assignmentDto, adminId, queryRunner);
        await queryRunner.commitTransaction();

        this.logger.log(`Student assignment completed successfully`);

        return {
          studentId: assignmentDto.studentId,
          supervisorId: assignmentDto.supervisorId,
          action: assignmentDto.action,
          success: true,
          assignedAt: new Date(),
          assignedBy: adminId,
        };
      } catch (error) {
        await queryRunner.rollbackTransaction();
        throw error;
      } finally {
        await queryRunner.release();
      }
    } catch (error) {
      this.logger.error(`Failed to assign student: ${error.message}`);

      return {
        studentId: assignmentDto.studentId,
        supervisorId: assignmentDto.supervisorId,
        action: assignmentDto.action,
        success: false,
        error: error.message,
        assignedAt: new Date(),
        assignedBy: adminId,
      };
    }
  }

  private async findAdminById(id: string): Promise<User> {
    const admin = await this.userRepository.findOne({
      where: { id },
    });

    if (!admin || admin.role !== UserRole.ADMIN) {
      throw new InsufficientPermissionsException('Admin access required');
    }

    return admin;
  }

  private async findStudentById(id: string): Promise<User> {
    const student = await this.userRepository.findOne({
      where: { id, role: UserRole.STUDENT },
      relations: ['studentProfile'],
    });

    if (!student) {
      throw new ResourceNotFoundException('Student', id);
    }

    return student;
  }

  private async findSupervisorById(id: string): Promise<User> {
    const supervisor = await this.userRepository.findOne({
      where: { id, role: UserRole.SUPERVISOR },
      relations: ['supervisorProfile'],
    });

    if (!supervisor) {
      throw new ResourceNotFoundException('Supervisor', id);
    }

    return supervisor;
  }

  private async validateAssignment(
    assignmentDto: SupervisorAssignmentDto,
    student: User,
    supervisor: User,
  ): Promise<void> {
    if (!student.studentProfile) {
      throw new ProjectValidationException('Student profile not found');
    }

    // Basic validation - can be extended with more complex rules
    if (assignmentDto.action === AssignmentAction.ASSIGN) {
      if (student.studentProfile.supervisorId) {
        throw new ProjectValidationException(
          'Student is already assigned to a supervisor',
        );
      }
    }
  }

  private async processAssignment(
    assignmentDto: SupervisorAssignmentDto,
    student: User,
    supervisor: User,
    adminId: string,
    queryRunner: any,
  ): Promise<void> {
    if (!student.studentProfile) {
      throw new ProjectValidationException('Student profile not found');
    }

    switch (assignmentDto.action) {
      case AssignmentAction.ASSIGN:
        await queryRunner.manager.update(
          StudentProfile,
          student.studentProfile.id,
          {
            supervisorId: assignmentDto.supervisorId,
          },
        );
        break;
      case AssignmentAction.REASSIGN:
        await queryRunner.manager.update(
          StudentProfile,
          student.studentProfile.id,
          {
            supervisorId: assignmentDto.supervisorId,
          },
        );
        break;
      case AssignmentAction.UNASSIGN:
        await queryRunner.manager.update(
          StudentProfile,
          student.studentProfile.id,
          {
            supervisorId: null,
          },
        );
        break;
      default:
        throw new ProjectValidationException(
          `Invalid assignment action: ${assignmentDto.action}`,
        );
    }
  }

  private async logAssignmentAction(
    assignmentDto: SupervisorAssignmentDto,
    adminId: string,
    queryRunner: any,
  ): Promise<void> {
    const auditLog = queryRunner.manager.create(AdminAuditLog, {
      adminId,
      action: 'supervisor_assignment',
      resourceType: 'student',
      resourceId: assignmentDto.studentId,
      afterState: {
        action: assignmentDto.action,
        supervisorId: assignmentDto.supervisorId,
        reason: assignmentDto.reason,
      },
      ipAddress: '127.0.0.1',
      userAgent: 'Admin Panel',
      success: true,
    });

    await queryRunner.manager.save(AdminAuditLog, auditLog);
  }
}
