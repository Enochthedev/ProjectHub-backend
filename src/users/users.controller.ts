import {
  Controller,
  Get,
  Put,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  BadRequestException,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { StudentProfileService } from './student-profile.service';
import { SupervisorProfileService } from './supervisor-profile.service';
import { UserProfileDto } from '../dto/profile/user-profile.dto';
import { UpdateStudentProfileDto } from '../dto/profile/update-student-profile.dto';
import { UpdateSupervisorProfileDto } from '../dto/profile/update-supervisor-profile.dto';
import { UserRole } from '../common/enums/user-role.enum';

/**
 * Users Controller
 *
 * Handles user profile management endpoints for both students and supervisors.
 * Provides role-specific profile operations with proper validation and authorization.
 *
 * Features:
 * - Role-based profile retrieval and updates
 * - Automatic profile creation for new users
 * - Comprehensive validation for profile data
 * - Proper error handling and logging
 */
@ApiTags('Users')
@ApiBearerAuth('JWT-auth')
@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  private readonly logger = new Logger(UsersController.name);

  constructor(
    private readonly studentProfileService: StudentProfileService,
    private readonly supervisorProfileService: SupervisorProfileService,
  ) {}

  /**
   * Get current user's profile
   *
   * @param req - Express request object containing authenticated user
   * @returns User profile data based on role
   */
  @ApiOperation({
    summary: 'Get current user profile',
    description:
      "Retrieves the authenticated user's profile data including role-specific information.",
  })
  @ApiResponse({
    status: 200,
    description: 'Profile retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', format: 'uuid' },
            email: { type: 'string', format: 'email' },
            role: { type: 'string', enum: ['student', 'supervisor', 'admin'] },
            isEmailVerified: { type: 'boolean' },
            isActive: { type: 'boolean' },
            createdAt: { type: 'string', format: 'date-time' },
            updatedAt: { type: 'string', format: 'date-time' },
            studentProfile: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                skills: { type: 'array', items: { type: 'string' } },
                interests: { type: 'array', items: { type: 'string' } },
                preferredSpecializations: {
                  type: 'array',
                  items: { type: 'string' },
                },
                currentYear: { type: 'number', nullable: true },
                gpa: { type: 'number', nullable: true },
                profileUpdatedAt: { type: 'string', format: 'date-time' },
              },
            },
            supervisorProfile: {
              type: 'object',
              nullable: true,
              properties: {
                id: { type: 'string', format: 'uuid' },
                name: { type: 'string' },
                specializations: { type: 'array', items: { type: 'string' } },
                maxStudents: { type: 'number' },
                isAvailable: { type: 'boolean' },
                officeLocation: { type: 'string', nullable: true },
                phoneNumber: { type: 'string', nullable: true },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  async getUserProfile(@Req() req: Request): Promise<{
    success: boolean;
    data: UserProfileDto;
  }> {
    const user = req.user as any;
    this.logger.log(
      `Profile retrieval request for user: ${user.email} (${user.role})`,
    );

    try {
      const profileData: UserProfileDto = {
        id: user.id,
        email: user.email,
        role: user.role,
        isEmailVerified: user.isEmailVerified,
        isActive: user.isActive,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      // Fetch role-specific profile data
      if (user.role === UserRole.STUDENT) {
        try {
          const studentProfile =
            await this.studentProfileService.getStudentProfile(user.id);
          profileData.studentProfile = {
            id: studentProfile.id,
            name: studentProfile.name,
            skills: studentProfile.skills,
            interests: studentProfile.interests,
            preferredSpecializations: studentProfile.preferredSpecializations,
            currentYear: studentProfile.currentYear ?? undefined,
            gpa: studentProfile.gpa ?? undefined,
            profileUpdatedAt: studentProfile.profileUpdatedAt,
          };
        } catch (error) {
          // Profile doesn't exist yet - this is okay for new users
          this.logger.log(
            `Student profile not found for user ${user.id} - profile may not be created yet`,
          );
        }
      } else if (user.role === UserRole.SUPERVISOR) {
        try {
          const supervisorProfile =
            await this.supervisorProfileService.getSupervisorProfile(user.id);
          profileData.supervisorProfile = {
            id: supervisorProfile.id,
            name: supervisorProfile.name,
            specializations: supervisorProfile.specializations,
            maxStudents: supervisorProfile.maxStudents,
            isAvailable: supervisorProfile.isAvailable,
            officeLocation: supervisorProfile.officeLocation ?? undefined,
            phoneNumber: supervisorProfile.phoneNumber ?? undefined,
          };
        } catch (error) {
          // Profile doesn't exist yet - this is okay for new users
          this.logger.log(
            `Supervisor profile not found for user ${user.id} - profile may not be created yet`,
          );
        }
      }

      return {
        success: true,
        data: profileData,
      };
    } catch (error) {
      this.logger.error(`Error retrieving profile for user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * Update current user's profile
   *
   * @param req - Express request object containing authenticated user
   * @param body - Profile update data (role-specific)
   * @returns Updated profile data
   */
  @ApiOperation({
    summary: 'Update current user profile',
    description:
      "Updates the authenticated user's profile. Creates profile if it doesn't exist. Request body varies by user role.",
  })
  @ApiBody({
    description: 'Profile update data (varies by user role)',
    schema: {
      oneOf: [
        {
          title: 'Student Profile Update',
          type: 'object',
          properties: {
            name: { type: 'string', example: 'John Doe' },
            skills: {
              type: 'array',
              items: { type: 'string' },
              example: ['JavaScript', 'Python', 'React'],
            },
            interests: {
              type: 'array',
              items: { type: 'string' },
              example: ['Web Development', 'AI'],
            },
            preferredSpecializations: {
              type: 'array',
              items: { type: 'string' },
              example: ['Web Development & Full Stack'],
            },
            currentYear: { type: 'number', example: 4 },
            gpa: { type: 'number', example: 3.8 },
          },
        },
        {
          title: 'Supervisor Profile Update',
          type: 'object',
          properties: {
            name: { type: 'string', example: 'Dr. Jane Smith' },
            specializations: {
              type: 'array',
              items: { type: 'string' },
              example: ['Artificial Intelligence & Machine Learning'],
            },
            maxStudents: { type: 'number', example: 5 },
            officeLocation: {
              type: 'string',
              example: 'Room 201, CS Building',
            },
            phoneNumber: { type: 'string', example: '+234-xxx-xxx-xxxx' },
          },
        },
      ],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Profile updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Student profile updated successfully',
        },
        data: {
          type: 'object',
          properties: {
            studentProfile: {
              type: 'object',
              nullable: true,
            },
            supervisorProfile: {
              type: 'object',
              nullable: true,
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or missing required fields',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @Put('profile')
  @HttpCode(HttpStatus.OK)
  async updateUserProfile(
    @Req() req: Request,
    @Body() body: UpdateStudentProfileDto | UpdateSupervisorProfileDto,
  ): Promise<{
    success: boolean;
    message: string;
    data: any;
  }> {
    const user = req.user as any;
    this.logger.log(
      `Profile update request for user: ${user.email} (${user.role})`,
    );

    try {
      if (user.role === UserRole.STUDENT) {
        const updateDto = body as UpdateStudentProfileDto;

        // Validate that required name field is provided for new profiles
        if (!updateDto.name) {
          // Check if profile exists
          try {
            await this.studentProfileService.getStudentProfile(user.id);
          } catch (error) {
            // Profile doesn't exist, name is required
            throw new BadRequestException(
              'Name is required for creating student profile',
            );
          }
        }

        let updatedProfile;
        try {
          // Try to update existing profile
          updatedProfile =
            await this.studentProfileService.updateStudentProfile(
              user.id,
              updateDto,
            );
        } catch (error) {
          if (error.message.includes('not found')) {
            // Profile doesn't exist, create it
            if (!updateDto.name) {
              throw new BadRequestException(
                'Name is required for creating student profile',
              );
            }
            updatedProfile =
              await this.studentProfileService.createStudentProfile(
                user.id,
                updateDto,
              );
            this.logger.log(
              `Created new student profile for user: ${user.email}`,
            );
          } else {
            throw error;
          }
        }

        return {
          success: true,
          message: 'Student profile updated successfully',
          data: {
            studentProfile: {
              id: updatedProfile.id,
              name: updatedProfile.name,
              skills: updatedProfile.skills,
              interests: updatedProfile.interests,
              preferredSpecializations: updatedProfile.preferredSpecializations,
              currentYear: updatedProfile.currentYear,
              gpa: updatedProfile.gpa,
              profileUpdatedAt: updatedProfile.profileUpdatedAt,
            },
          },
        };
      } else if (user.role === UserRole.SUPERVISOR) {
        const updateDto = body as UpdateSupervisorProfileDto;

        // Validate that required fields are provided for new profiles
        if (!updateDto.name || !updateDto.specializations) {
          // Check if profile exists
          try {
            await this.supervisorProfileService.getSupervisorProfile(user.id);
          } catch (error) {
            // Profile doesn't exist, required fields are needed
            if (!updateDto.name) {
              throw new BadRequestException(
                'Name is required for creating supervisor profile',
              );
            }
            if (!updateDto.specializations) {
              throw new BadRequestException(
                'Specializations are required for creating supervisor profile',
              );
            }
          }
        }

        let updatedProfile;
        try {
          // Try to update existing profile
          updatedProfile =
            await this.supervisorProfileService.updateSupervisorProfile(
              user.id,
              updateDto,
            );
        } catch (error) {
          if (error.message.includes('not found')) {
            // Profile doesn't exist, create it
            if (!updateDto.name || !updateDto.specializations) {
              throw new BadRequestException(
                'Name and specializations are required for creating supervisor profile',
              );
            }
            updatedProfile =
              await this.supervisorProfileService.createSupervisorProfile(
                user.id,
                updateDto,
              );
            this.logger.log(
              `Created new supervisor profile for user: ${user.email}`,
            );
          } else {
            throw error;
          }
        }

        return {
          success: true,
          message: 'Supervisor profile updated successfully',
          data: {
            supervisorProfile: {
              id: updatedProfile.id,
              name: updatedProfile.name,
              specializations: updatedProfile.specializations,
              maxStudents: updatedProfile.maxStudents,
              isAvailable: updatedProfile.isAvailable,
              officeLocation: updatedProfile.officeLocation,
              phoneNumber: updatedProfile.phoneNumber,
            },
          },
        };
      } else {
        throw new BadRequestException(
          'Admin users do not have profiles to update',
        );
      }
    } catch (error) {
      this.logger.error(`Error updating profile for user ${user.id}:`, error);
      throw error;
    }
  }

  /**
   * Toggle supervisor availability (supervisors only)
   *
   * @param req - Express request object containing authenticated user
   * @returns Updated availability status
   */
  @ApiOperation({
    summary: 'Toggle supervisor availability',
    description:
      'Toggles the availability status for supervisors. Only accessible by supervisor role.',
  })
  @ApiResponse({
    status: 200,
    description: 'Availability toggled successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Availability enabled successfully',
        },
        data: {
          type: 'object',
          properties: {
            isAvailable: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Only supervisors can toggle availability',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @Put('profile/toggle-availability')
  @HttpCode(HttpStatus.OK)
  async toggleAvailability(@Req() req: Request): Promise<{
    success: boolean;
    message: string;
    data: {
      isAvailable: boolean;
    };
  }> {
    const user = req.user as any;

    if (user.role !== UserRole.SUPERVISOR) {
      throw new BadRequestException('Only supervisors can toggle availability');
    }

    this.logger.log(
      `Availability toggle request for supervisor: ${user.email}`,
    );

    try {
      const updatedProfile =
        await this.supervisorProfileService.toggleAvailability(user.id);

      return {
        success: true,
        message: `Availability ${updatedProfile.isAvailable ? 'enabled' : 'disabled'} successfully`,
        data: {
          isAvailable: updatedProfile.isAvailable,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error toggling availability for user ${user.id}:`,
        error,
      );
      throw error;
    }
  }

  /**
   * Update supervisor capacity (supervisors only)
   *
   * @param req - Express request object containing authenticated user
   * @param body - New capacity data
   * @returns Updated capacity information
   */
  @ApiOperation({
    summary: 'Update supervisor capacity',
    description:
      'Updates the maximum number of students a supervisor can handle. Only accessible by supervisor role.',
  })
  @ApiBody({
    description: 'New capacity data',
    schema: {
      type: 'object',
      properties: {
        maxStudents: { type: 'number', example: 8, minimum: 1, maximum: 20 },
      },
      required: ['maxStudents'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Capacity updated successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Capacity updated successfully' },
        data: {
          type: 'object',
          properties: {
            maxStudents: { type: 'number', example: 8 },
            isAvailable: { type: 'boolean', example: true },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description:
      'Bad request - Invalid capacity or only supervisors can update capacity',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @Put('profile/capacity')
  @HttpCode(HttpStatus.OK)
  async updateCapacity(
    @Req() req: Request,
    @Body() body: { maxStudents: number },
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      maxStudents: number;
      isAvailable: boolean;
    };
  }> {
    const user = req.user as any;

    if (user.role !== UserRole.SUPERVISOR) {
      throw new BadRequestException('Only supervisors can update capacity');
    }

    if (!body.maxStudents || typeof body.maxStudents !== 'number') {
      throw new BadRequestException('Valid maxStudents number is required');
    }

    this.logger.log(
      `Capacity update request for supervisor: ${user.email} to ${body.maxStudents}`,
    );

    try {
      const updatedProfile = await this.supervisorProfileService.updateCapacity(
        user.id,
        body.maxStudents,
      );

      return {
        success: true,
        message: 'Capacity updated successfully',
        data: {
          maxStudents: updatedProfile.maxStudents,
          isAvailable: updatedProfile.isAvailable,
        },
      };
    } catch (error) {
      this.logger.error(`Error updating capacity for user ${user.id}:`, error);
      throw error;
    }
  }
}
