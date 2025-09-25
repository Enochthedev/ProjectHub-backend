import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Req,
  UseGuards,
  Get,
  Query,
  Logger,
} from '@nestjs/common';
import type { Request } from 'express';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiQuery,
  ApiBearerAuth,
  ApiSecurity,
} from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from '../dto/auth/register.dto';
import { LoginDto } from '../dto/auth/login.dto';
import { RefreshTokenDto } from '../dto/auth/refresh-token.dto';
import { VerifyEmailDto } from '../dto/auth/verify-email.dto';
import { ForgotPasswordDto } from '../dto/auth/forgot-password.dto';
import { ResetPasswordDto } from '../dto/auth/reset-password.dto';
import { Public } from '../common/decorators/public.decorator';
import { AuthThrottlerGuard } from '../common/guards/auth-throttler.guard';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { TokenPair } from './interfaces/token.interface';
import { User } from '../entities/user.entity';

/**
 * Authentication Controller
 *
 * Handles all authentication-related endpoints including user registration,
 * login, token refresh, email verification, and password reset functionality.
 *
 * Features:
 * - Rate limiting for security-sensitive endpoints
 * - JWT-based authentication with refresh token rotation
 * - Email verification workflow
 * - Password reset functionality
 * - Comprehensive error handling and logging
 */
@ApiTags('Authentication')
@Controller('auth')
@UseGuards(AuthThrottlerGuard)
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  /**
   * Register a new user account
   *
   * @param registerDto - User registration data
   * @param req - Express request object for IP tracking
   * @returns User data and JWT tokens
   */
  @ApiOperation({
    summary: 'Register a new user account',
    description:
      'Creates a new user account with email verification. Supports student and supervisor roles.',
  })
  @ApiBody({
    type: RegisterDto,
    description:
      'User registration data including email, password, role, and profile information',
  })
  @ApiResponse({
    status: 201,
    description: 'User registered successfully. Email verification required.',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example:
            'Registration successful. Please check your email to verify your account.',
        },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                role: {
                  type: 'string',
                  enum: ['student', 'supervisor', 'admin'],
                },
                isEmailVerified: { type: 'boolean' },
                isActive: { type: 'boolean' },
                createdAt: { type: 'string', format: 'date-time' },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Validation error or email already exists',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        errorCode: { type: 'string', example: 'VALIDATION_ERROR' },
        message: { type: 'string', example: 'Email already exists' },
        timestamp: { type: 'string', format: 'date-time' },
        path: { type: 'string', example: '/auth/register' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many registration attempts',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        errorCode: { type: 'string', example: 'THROTTLE_ERROR' },
        message: { type: 'string', example: 'Too many requests' },
      },
    },
  })
  @Public()
  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
  async register(
    @Body() registerDto: RegisterDto,
    @Req() req: Request,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      user: Omit<User, 'password'>;
      tokens: TokenPair;
    };
  }> {
    this.logger.log(`Registration attempt for email: ${registerDto.email}`);

    const result = await this.authService.register(registerDto);

    return {
      success: true,
      message:
        'Registration successful. Please check your email to verify your account.',
      data: result,
    };
  }

  /**
   * Authenticate user and generate tokens
   *
   * @param loginDto - User login credentials
   * @param req - Express request object for IP and user agent tracking
   * @returns User data and JWT tokens
   */
  @ApiOperation({
    summary: 'Authenticate user and generate tokens',
    description:
      'Authenticates user credentials and returns JWT access and refresh tokens.',
  })
  @ApiBody({
    type: LoginDto,
    description: 'User login credentials',
  })
  @ApiResponse({
    status: 200,
    description: 'Login successful',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Login successful' },
        data: {
          type: 'object',
          properties: {
            user: {
              type: 'object',
              properties: {
                id: { type: 'string', format: 'uuid' },
                email: { type: 'string', format: 'email' },
                role: {
                  type: 'string',
                  enum: ['student', 'supervisor', 'admin'],
                },
                isEmailVerified: { type: 'boolean' },
                isActive: { type: 'boolean' },
              },
            },
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid credentials or email not verified',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        errorCode: { type: 'string', example: 'AUTH_ERROR' },
        message: { type: 'string', example: 'Invalid credentials' },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many login attempts',
  })
  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60000 } }) // 5 attempts per minute
  async login(
    @Body() loginDto: LoginDto,
    @Req() req: Request,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      user: Omit<User, 'password'>;
      tokens: TokenPair;
    };
  }> {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];

    this.logger.log(
      `Login attempt for email: ${loginDto.email} from IP: ${ipAddress}`,
    );

    const result = await this.authService.login(loginDto, ipAddress, userAgent);

    return {
      success: true,
      message: 'Login successful',
      data: result,
    };
  }

  /**
   * Refresh access and refresh tokens
   *
   * @param refreshTokenDto - Refresh token data
   * @param req - Express request object for IP and user agent tracking
   * @returns New token pair
   */
  @ApiOperation({
    summary: 'Refresh access and refresh tokens',
    description:
      'Exchanges a valid refresh token for new access and refresh tokens (token rotation).',
  })
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token for generating new token pair',
  })
  @ApiResponse({
    status: 200,
    description: 'Tokens refreshed successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Tokens refreshed successfully' },
        data: {
          type: 'object',
          properties: {
            tokens: {
              type: 'object',
              properties: {
                accessToken: { type: 'string' },
                refreshToken: { type: 'string' },
              },
            },
          },
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Invalid or expired refresh token',
  })
  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60000 } }) // 10 attempts per minute
  async refreshTokens(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<{
    success: boolean;
    message: string;
    data: {
      tokens: TokenPair;
    };
  }> {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];

    this.logger.log(`Token refresh attempt from IP: ${ipAddress}`);

    const tokens = await this.authService.refreshTokens(
      refreshTokenDto.refreshToken,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'Tokens refreshed successfully',
      data: { tokens },
    };
  }

  /**
   * Logout user by revoking refresh token
   *
   * @param refreshTokenDto - Refresh token to revoke
   * @param req - Express request object for IP and user agent tracking
   */
  @ApiOperation({
    summary: 'Logout user by revoking refresh token',
    description:
      'Revokes the provided refresh token and logs the logout event.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiBody({
    type: RefreshTokenDto,
    description: 'Refresh token to revoke',
  })
  @ApiResponse({
    status: 200,
    description: 'Logged out successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Logged out successfully' },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(
    @Body() refreshTokenDto: RefreshTokenDto,
    @Req() req: Request,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const user = req.user as any;
    const ipAddress = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];

    this.logger.log(`Logout attempt for user: ${user.email}`);

    await this.authService.logout(
      user.id,
      refreshTokenDto.refreshToken,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      message: 'Logged out successfully',
    };
  }

  /**
   * Logout user from all devices
   *
   * @param req - Express request object for user context and tracking
   */
  @ApiOperation({
    summary: 'Logout user from all devices',
    description:
      'Revokes all refresh tokens for the authenticated user, logging them out from all devices.',
  })
  @ApiBearerAuth('JWT-auth')
  @ApiResponse({
    status: 200,
    description: 'Logged out from all devices successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Logged out from all devices successfully',
        },
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or missing JWT token',
  })
  @UseGuards(JwtAuthGuard)
  @Post('logout-all')
  @HttpCode(HttpStatus.OK)
  async logoutFromAllDevices(@Req() req: Request): Promise<{
    success: boolean;
    message: string;
  }> {
    const user = req.user as any;
    const ipAddress = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];

    this.logger.log(`Logout from all devices for user: ${user.email}`);

    await this.authService.logoutFromAllDevices(user.id, ipAddress, userAgent);

    return {
      success: true,
      message: 'Logged out from all devices successfully',
    };
  }

  /**
   * Verify email address
   *
   * @param query - Query parameters containing verification token
   * @returns Success message
   */
  @ApiOperation({
    summary: 'Verify email address',
    description:
      'Verifies user email address using the token sent via email during registration.',
  })
  @ApiQuery({
    name: 'token',
    description: 'Email verification token',
    type: 'string',
    required: true,
  })
  @ApiResponse({
    status: 200,
    description: 'Email verified successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example:
            'Email verified successfully. You can now log in to your account.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired verification token',
  })
  @Public()
  @Get('verify-email')
  @HttpCode(HttpStatus.OK)
  async verifyEmail(@Query() query: VerifyEmailDto): Promise<{
    success: boolean;
    message: string;
  }> {
    this.logger.log(
      `Email verification attempt with token: ${query.token?.substring(0, 8)}...`,
    );

    await this.authService.verifyEmail(query.token);

    return {
      success: true,
      message:
        'Email verified successfully. You can now log in to your account.',
    };
  }

  /**
   * Request password reset
   *
   * @param forgotPasswordDto - Email address for password reset
   * @param req - Express request object for IP tracking
   * @returns Success message
   */
  @ApiOperation({
    summary: 'Request password reset',
    description:
      'Sends a password reset email to the specified address if the account exists.',
  })
  @ApiBody({
    type: ForgotPasswordDto,
    description: 'Email address for password reset',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset email sent (if account exists)',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example:
            'If an account with that email exists, a password reset link has been sent.',
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset attempts',
  })
  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 2, ttl: 600000 } }) // 2 attempts per 10 minutes
  async forgotPassword(
    @Body() forgotPasswordDto: ForgotPasswordDto,
    @Req() req: Request,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const ipAddress = this.getClientIP(req);
    const userAgent = req.headers['user-agent'];

    this.logger.log(
      `Password reset request for email: ${forgotPasswordDto.email} from IP: ${ipAddress}`,
    );

    await this.authService.requestPasswordReset(forgotPasswordDto.email);

    return {
      success: true,
      message:
        'If an account with that email exists, a password reset link has been sent.',
    };
  }

  /**
   * Reset password using reset token
   *
   * @param resetPasswordDto - Reset token and new password
   * @param req - Express request object for IP tracking
   * @returns Success message
   */
  @ApiOperation({
    summary: 'Reset password using reset token',
    description: 'Resets user password using the token received via email.',
  })
  @ApiBody({
    type: ResetPasswordDto,
    description: 'Password reset token and new password',
  })
  @ApiResponse({
    status: 200,
    description: 'Password reset successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example:
            'Password reset successfully. Please log in with your new password.',
        },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid or expired reset token',
  })
  @ApiResponse({
    status: 429,
    description: 'Too many password reset attempts',
  })
  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
  async resetPassword(
    @Body() resetPasswordDto: ResetPasswordDto,
    @Req() req: Request,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const ipAddress = this.getClientIP(req);

    this.logger.log(
      `Password reset attempt with token: ${resetPasswordDto.token?.substring(0, 8)}... from IP: ${ipAddress}`,
    );

    await this.authService.resetPassword(
      resetPasswordDto.token,
      resetPasswordDto.newPassword,
    );

    return {
      success: true,
      message:
        'Password reset successfully. Please log in with your new password.',
    };
  }

  /**
   * Resend email verification
   *
   * @param body - Email address for resending verification
   * @param req - Express request object for IP tracking
   * @returns Success message
   */
  @ApiOperation({
    summary: 'Resend email verification',
    description:
      'Resends the email verification link to the specified email address.',
  })
  @ApiBody({
    description: 'Email address for resending verification',
    schema: {
      type: 'object',
      properties: {
        email: {
          type: 'string',
          format: 'email',
          example: 'student@ui.edu.ng',
        },
      },
      required: ['email'],
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Verification email resent',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: {
          type: 'string',
          example: 'Verification email has been resent.',
        },
      },
    },
  })
  @ApiResponse({
    status: 429,
    description: 'Too many resend attempts',
  })
  @Public()
  @Post('resend-verification')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 300000 } }) // 3 attempts per 5 minutes
  async resendEmailVerification(
    @Body() body: { email: string },
    @Req() req: Request,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    const ipAddress = this.getClientIP(req);

    this.logger.log(
      `Resend verification request for email: ${body.email} from IP: ${ipAddress}`,
    );

    await this.authService.resendEmailVerification(body.email);

    return {
      success: true,
      message: 'Verification email has been resent.',
    };
  }

  /**
   * Extract client IP address from request
   *
   * @param req - Express request object
   * @returns Client IP address
   */
  private getClientIP(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      (req.headers['x-real-ip'] as string) ||
      req.connection?.remoteAddress ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }
}
