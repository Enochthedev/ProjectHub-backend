import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import type { Request } from 'express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiParam,
  ApiQuery,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  UserListQueryDto,
  UserListResponseDto,
  UpdateUserStatusDto,
} from '../dto/admin';
import { User } from '../entities/user.entity';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Controller('admin')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UsePipes(new ValidationPipe({ transform: true }))
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  /**
   * Get paginated list of users with search and filtering
   * GET /admin/users
   */
  @ApiOperation({
    summary: 'Get paginated list of users',
    description:
      'Retrieves a paginated list of users with optional search and filtering capabilities. Admin access required.',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Items per page (default: 10)',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: ['student', 'supervisor', 'admin'],
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: 'boolean',
    description: 'Filter by active status',
  })
  @ApiQuery({
    name: 'isEmailVerified',
    required: false,
    type: 'boolean',
    description: 'Filter by email verification status',
  })
  @ApiQuery({
    name: 'search',
    required: false,
    type: 'string',
    description: 'Search term for email or name',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: UserListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Get('users')
  async getUsers(
    @Query() queryDto: UserListQueryDto,
  ): Promise<UserListResponseDto> {
    return this.adminService.getUserList(queryDto);
  }

  /**
   * Search users across all profiles
   * GET /admin/users/search
   */
  @ApiOperation({
    summary: 'Search users across all profiles',
    description:
      'Performs a comprehensive search across user profiles including names, emails, and profile data.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: 'string',
    description: 'Search term',
  })
  @ApiQuery({
    name: 'page',
    required: false,
    type: 'number',
    description: 'Page number (default: 1)',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: 'number',
    description: 'Items per page (default: 10)',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: UserListResponseDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Get('users/search')
  async searchUsers(
    @Query('q') searchTerm: string,
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
  ): Promise<UserListResponseDto> {
    return this.adminService.searchUsers(searchTerm, page, limit);
  }

  /**
   * Get detailed user information by ID
   * GET /admin/users/:id
   */
  @ApiOperation({
    summary: 'Get detailed user information by ID',
    description:
      'Retrieves comprehensive user information including profile data for a specific user.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User information retrieved successfully',
    type: User,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @Get('users/:id')
  async getUserById(@Param('id') userId: string): Promise<User> {
    return this.adminService.getUserById(userId);
  }

  /**
   * Update user account status (activate/deactivate)
   * PATCH /admin/users/:id/status
   */
  @ApiOperation({
    summary: 'Update user account status',
    description:
      'Activates or deactivates a user account. Deactivation immediately invalidates all user tokens.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiBody({
    type: UpdateUserStatusDto,
    description: 'User status update data',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    type: User,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @Patch('users/:id/status')
  @HttpCode(HttpStatus.OK)
  async updateUserStatus(
    @Param('id') userId: string,
    @Body() statusDto: UpdateUserStatusDto,
    @Req() req: Request,
  ): Promise<User> {
    const adminId = req.user?.['sub'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    return this.adminService.updateUserStatus(
      userId,
      statusDto,
      adminId,
      ipAddress,
    );
  }
  /**
   * Reset user password (admin action)
   * POST /admin/users/:id/reset-password
   */
  @ApiOperation({
    summary: 'Reset user password (admin action)',
    description:
      'Generates a new temporary password for a user and sends it via email. Admin action is logged.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example:
            'Password reset successfully. Temporary password sent to user email.',
        },
        temporaryPassword: { type: 'string', example: 'TempPass123!' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @Post('users/:id/reset-password')
  @HttpCode(HttpStatus.OK)
  async resetUserPassword(
    @Param('id') userId: string,
    @Req() req: Request,
  ): Promise<{ message: string; temporaryPassword: string }> {
    const adminId = req.user?.['sub'];
    const ipAddress = req.ip || req.connection.remoteAddress;

    const result = await this.adminService.resetUserPassword(
      userId,
      adminId,
      ipAddress,
    );

    return {
      message:
        'Password reset successfully. Temporary password sent to user email.',
      temporaryPassword: result.temporaryPassword,
    };
  }

  /**
   * Get user statistics for admin dashboard
   * GET /admin/statistics
   */
  @ApiOperation({
    summary: 'Get user statistics for admin dashboard',
    description:
      'Retrieves comprehensive statistics about users, registrations, and platform usage.',
  })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        totalUsers: { type: 'number', example: 150 },
        activeUsers: { type: 'number', example: 142 },
        verifiedUsers: { type: 'number', example: 138 },
        usersByRole: {
          type: 'object',
          properties: {
            students: { type: 'number', example: 120 },
            supervisors: { type: 'number', example: 25 },
            admins: { type: 'number', example: 5 },
          },
        },
        recentRegistrations: {
          type: 'object',
          properties: {
            today: { type: 'number', example: 3 },
            thisWeek: { type: 'number', example: 12 },
            thisMonth: { type: 'number', example: 45 },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Get('statistics')
  async getUserStatistics() {
    return this.adminService.getUserStatistics();
  }
}
