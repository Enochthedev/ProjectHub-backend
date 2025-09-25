import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  UsePipes,
  ValidationPipe,
  ParseUUIDPipe,
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
import { AdminUserManagementService } from '../services/admin-user-management.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import {
  UserFiltersDto,
  CreateUserDto,
  UpdateUserDto,
  BulkUserOperationDto,
  UserStatusChangeDto,
  PaginatedUsersDto,
  UserDetailDto,
  BulkOperationResultDto,
  UserActivitySummaryDto,
  PasswordResetResultDto,
} from '../dto/admin/user-management.dto';
import { User } from '../entities/user.entity';

/**
 * Admin User Management Controller
 *
 * Provides comprehensive user management capabilities for administrators including:
 * - Advanced user CRUD operations with validation and security
 * - Bulk operations with transaction safety
 * - User status management and security controls
 * - Advanced search, filtering, and pagination
 * - User activity tracking and analytics
 * - Comprehensive audit logging
 */
@ApiTags('Admin - User Management')
@ApiBearerAuth('JWT-auth')
@Controller('admin/users')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AdminUserManagementController {
  constructor(
    private readonly userManagementService: AdminUserManagementService,
  ) {}

  /**
   * Get paginated list of users with advanced filtering
   * GET /admin/users
   */
  @ApiOperation({
    summary: 'Get paginated list of users with advanced filtering',
    description:
      'Retrieves users with comprehensive filtering, search, and pagination capabilities.',
  })
  @ApiResponse({
    status: 200,
    description: 'Users retrieved successfully',
    type: PaginatedUsersDto,
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin access required',
  })
  @Get()
  async getUsers(@Query() filters: UserFiltersDto): Promise<PaginatedUsersDto> {
    // Convert string dates to Date objects
    const processedFilters = {
      ...filters,
      createdAfter: filters.createdAfter
        ? new Date(filters.createdAfter)
        : undefined,
      createdBefore: filters.createdBefore
        ? new Date(filters.createdBefore)
        : undefined,
    };

    return this.userManagementService.getUsers(processedFilters);
  }

  /**
   * Get detailed user information by ID
   * GET /admin/users/:id
   */
  @ApiOperation({
    summary: 'Get detailed user information by ID',
    description:
      'Retrieves comprehensive user information including profile data and activity summary.',
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
    type: UserDetailDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @Get(':id')
  async getUserById(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserDetailDto> {
    return this.userManagementService.getUserById(id);
  }

  /**
   * Create a new user
   * POST /admin/users
   */
  @ApiOperation({
    summary: 'Create a new user',
    description:
      'Creates a new user account with optional profile data and welcome email.',
  })
  @ApiBody({
    type: CreateUserDto,
    description: 'User creation data',
  })
  @ApiResponse({
    status: 201,
    description: 'User created successfully',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid data',
  })
  @ApiResponse({
    status: 409,
    description: 'User with email already exists',
  })
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Body() createDto: CreateUserDto,
    @Req() req: Request,
  ): Promise<User> {
    const adminId = req.user?.['sub'];
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.userManagementService.createUser(
      createDto,
      adminId,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Update user information
   * PUT /admin/users/:id
   */
  @ApiOperation({
    summary: 'Update user information',
    description:
      'Updates user account information including profile data with validation and security checks.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiBody({
    type: UpdateUserDto,
    description: 'User update data',
  })
  @ApiResponse({
    status: 200,
    description: 'User updated successfully',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or security constraint violation',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @ApiResponse({
    status: 409,
    description: 'Email already in use',
  })
  @Put(':id')
  async updateUser(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() updateDto: UpdateUserDto,
    @Req() req: Request,
  ): Promise<User> {
    const adminId = req.user?.['sub'];
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.userManagementService.updateUser(
      id,
      updateDto,
      adminId,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Change user status (activate/deactivate)
   * PATCH /admin/users/:id/status
   */
  @ApiOperation({
    summary: 'Change user status',
    description:
      'Activates or deactivates a user account with enhanced security checks and notifications.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiBody({
    type: UserStatusChangeDto,
    description: 'Status change data',
  })
  @ApiResponse({
    status: 200,
    description: 'User status updated successfully',
    type: User,
  })
  @ApiResponse({
    status: 400,
    description:
      'Security constraint violation (e.g., cannot deactivate own account)',
  })
  @ApiResponse({
    status: 403,
    description:
      'Forbidden operation (e.g., cannot deactivate other admin accounts)',
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @Patch(':id/status')
  async changeUserStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() statusDto: UserStatusChangeDto,
    @Req() req: Request,
  ): Promise<User> {
    const adminId = req.user?.['sub'];
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.userManagementService.changeUserStatus(
      id,
      statusDto,
      adminId,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Reset user password (admin action)
   * POST /admin/users/:id/reset-password
   */
  @ApiOperation({
    summary: 'Reset user password (admin action)',
    description:
      'Generates a new temporary password for a user and sends it via email. All user tokens are invalidated.',
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
    type: PasswordResetResultDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @Post(':id/reset-password')
  async resetUserPassword(
    @Param('id', ParseUUIDPipe) id: string,
    @Req() req: Request,
  ): Promise<PasswordResetResultDto> {
    const adminId = req.user?.['sub'];
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    const result = await this.userManagementService.resetUserPassword(
      id,
      adminId,
      ipAddress,
      userAgent,
    );

    return {
      temporaryPassword: result.temporaryPassword,
      message:
        'Password reset successfully. Temporary password sent to user email.',
    };
  }

  /**
   * Bulk update users
   * PATCH /admin/users/bulk
   */
  @ApiOperation({
    summary: 'Bulk update users',
    description:
      'Performs bulk updates on multiple users with transaction safety and comprehensive error handling.',
  })
  @ApiBody({
    type: BulkUserOperationDto,
    description: 'Bulk operation data',
  })
  @ApiResponse({
    status: 200,
    description: 'Bulk operation completed',
    type: BulkOperationResultDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or invalid user IDs',
  })
  @Patch('bulk')
  async bulkUpdateUsers(
    @Body() bulkDto: BulkUserOperationDto,
    @Req() req: Request,
  ): Promise<BulkOperationResultDto> {
    const adminId = req.user?.['sub'];
    const ipAddress = req.ip || req.connection?.remoteAddress;
    const userAgent = req.headers['user-agent'];

    return this.userManagementService.bulkUpdateUsers(
      bulkDto.userIds,
      bulkDto.updateData,
      adminId,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Search users with advanced capabilities
   * GET /admin/users/search
   */
  @ApiOperation({
    summary: 'Search users with advanced capabilities',
    description:
      'Performs comprehensive search across user profiles with filtering and pagination.',
  })
  @ApiQuery({
    name: 'q',
    required: true,
    type: 'string',
    description: 'Search term',
  })
  @ApiQuery({
    name: 'role',
    required: false,
    enum: UserRole,
    description: 'Filter by user role',
  })
  @ApiQuery({
    name: 'isActive',
    required: false,
    type: 'boolean',
    description: 'Filter by active status',
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
    description: 'Items per page (default: 20)',
  })
  @ApiResponse({
    status: 200,
    description: 'Search results retrieved successfully',
    type: PaginatedUsersDto,
  })
  @Get('search')
  async searchUsers(
    @Query('q') searchTerm: string,
    @Query() filters: Partial<UserFiltersDto>,
  ): Promise<PaginatedUsersDto> {
    // Convert string dates to Date objects for filters
    const processedFilters = {
      ...filters,
      createdAfter: filters.createdAfter
        ? new Date(filters.createdAfter)
        : undefined,
      createdBefore: filters.createdBefore
        ? new Date(filters.createdBefore)
        : undefined,
    };

    return this.userManagementService.searchUsers(searchTerm, processedFilters);
  }

  /**
   * Get user activity summary
   * GET /admin/users/:id/activity
   */
  @ApiOperation({
    summary: 'Get user activity summary',
    description:
      'Retrieves comprehensive activity and engagement metrics for a specific user.',
  })
  @ApiParam({
    name: 'id',
    type: 'string',
    format: 'uuid',
    description: 'User ID',
  })
  @ApiResponse({
    status: 200,
    description: 'User activity summary retrieved successfully',
    type: UserActivitySummaryDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User not found',
  })
  @Get(':id/activity')
  async getUserActivitySummary(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<UserActivitySummaryDto> {
    return this.userManagementService.getUserActivitySummary(id);
  }
}
