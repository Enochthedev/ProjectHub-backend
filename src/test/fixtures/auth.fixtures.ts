import {
  RegisterDto,
  LoginDto,
  RefreshTokenDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from '../../dto/auth';
import { UserRole } from '../../common/enums/user-role.enum';
import { SPECIALIZATIONS } from '../../common/constants/specializations';

export class AuthFixtures {
  static createValidRegisterDto(
    overrides: Partial<RegisterDto> = {},
  ): RegisterDto {
    return {
      email: 'test.register@ui.edu.ng',
      password: 'ValidPass123!',
      role: UserRole.STUDENT,
      name: 'Test User',
      ...overrides,
    } as RegisterDto;
  }

  static createValidStudentRegisterDto(
    overrides: Partial<RegisterDto> = {},
  ): RegisterDto {
    return this.createValidRegisterDto({
      email: 'student.register@ui.edu.ng',
      role: UserRole.STUDENT,
      name: 'Test Student',
      ...overrides,
    });
  }

  static createValidSupervisorRegisterDto(
    overrides: Partial<RegisterDto> = {},
  ): RegisterDto {
    return this.createValidRegisterDto({
      email: 'supervisor.register@ui.edu.ng',
      role: UserRole.SUPERVISOR,
      name: 'Test Supervisor',
      specializations: [SPECIALIZATIONS[0], SPECIALIZATIONS[1]],
      ...overrides,
    });
  }

  static createValidLoginDto(overrides: Partial<LoginDto> = {}): LoginDto {
    return {
      email: 'test.login@ui.edu.ng',
      password: 'ValidPass123!',
      ...overrides,
    };
  }

  static createValidRefreshTokenDto(
    token: string = 'valid-refresh-token',
  ): RefreshTokenDto {
    return {
      refreshToken: token,
    };
  }

  static createValidForgotPasswordDto(
    overrides: Partial<ForgotPasswordDto> = {},
  ): ForgotPasswordDto {
    return {
      email: 'test.forgot@ui.edu.ng',
      ...overrides,
    };
  }

  static createValidResetPasswordDto(
    overrides: Partial<ResetPasswordDto> = {},
  ): ResetPasswordDto {
    return {
      token: 'valid-reset-token',
      newPassword: 'NewValidPass123!',
      ...overrides,
    };
  }

  // Invalid DTOs for negative testing
  static createInvalidRegisterDto(
    type: 'email' | 'password' | 'role' | 'name',
  ): Partial<RegisterDto> {
    const base = this.createValidRegisterDto();

    switch (type) {
      case 'email':
        return { ...base, email: 'invalid-email@gmail.com' }; // Non-university domain
      case 'password':
        return { ...base, password: 'weak' }; // Weak password
      case 'role':
        return { ...base, role: 'INVALID_ROLE' as any };
      case 'name':
        return { ...base, name: '' }; // Empty name
      default:
        return base;
    }
  }

  static createInvalidLoginDto(type: 'email' | 'password'): Partial<LoginDto> {
    const base = this.createValidLoginDto();

    switch (type) {
      case 'email':
        return { ...base, email: 'invalid-email' }; // Invalid email format
      case 'password':
        return { ...base, password: '' }; // Empty password
      default:
        return base;
    }
  }

  // JWT Token fixtures
  static createMockJwtPayload(overrides: any = {}) {
    return {
      sub: 'test-user-id',
      email: 'test@ui.edu.ng',
      role: UserRole.STUDENT,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 900, // 15 minutes
      ...overrides,
    };
  }

  static createExpiredJwtPayload(overrides: any = {}) {
    return this.createMockJwtPayload({
      iat: Math.floor(Date.now() / 1000) - 1800, // 30 minutes ago
      exp: Math.floor(Date.now() / 1000) - 900, // 15 minutes ago (expired)
      ...overrides,
    });
  }
}
