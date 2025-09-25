import { Test, TestingModule } from '@nestjs/testing';
import {
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ThrottlerException } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { GlobalExceptionFilter } from '../global-exception.filter';
import {
  AppException,
  ValidationException,
  AuthenticationException,
} from '../../exceptions';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let mockResponse: Partial<Response>;
  let mockRequest: Partial<Request>;
  let mockArgumentsHost: Partial<ArgumentsHost>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GlobalExceptionFilter],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);

    // Mock response object
    mockResponse = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
    };

    // Mock request object
    mockRequest = {
      url: '/test',
      method: 'GET',
      ip: '127.0.0.1',
      headers: {
        'user-agent': 'test-agent',
      },
    };

    // Mock ArgumentsHost
    mockArgumentsHost = {
      switchToHttp: jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => mockRequest,
      }),
    };

    // Mock Logger to prevent console output during tests
    jest.spyOn(Logger.prototype, 'error').mockImplementation();
    jest.spyOn(Logger.prototype, 'warn').mockImplementation();
    jest.spyOn(Logger.prototype, 'debug').mockImplementation();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('catch', () => {
    it('should handle AppException correctly', () => {
      // Arrange
      const exception = new ValidationException('Validation failed', {
        field: 'email',
      });

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: { field: 'email' },
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
      });
    });

    it('should handle AuthenticationException correctly', () => {
      // Arrange
      const exception = new AuthenticationException('Invalid credentials');

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.UNAUTHORIZED);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'AUTH_ERROR',
        message: 'Invalid credentials',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
      });
    });

    it('should handle ThrottlerException correctly', () => {
      // Arrange
      const exception = new ThrottlerException('Rate limit exceeded');

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.TOO_MANY_REQUESTS,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'RATE_LIMIT_EXCEEDED',
        message: 'Rate limit exceeded',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
      });
    });

    it('should handle HttpException with string response', () => {
      // Arrange
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'NOT_FOUND',
        message: 'Not found',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
      });
    });

    it('should handle HttpException with object response containing validation errors', () => {
      // Arrange
      const exception = new HttpException(
        {
          message: ['email must be an email', 'password is required'],
          error: 'Bad Request',
          statusCode: 400,
        },
        HttpStatus.BAD_REQUEST,
      );

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: {
          validationErrors: ['email must be an email', 'password is required'],
        },
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
      });
    });

    it('should handle generic Error in development', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development';
      const exception = new Error('Database connection failed');

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Database connection failed',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle generic Error in production', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      const exception = new Error('Database connection failed');

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
      });

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should handle unknown exception types', () => {
      // Arrange
      const exception = 'Unknown error';

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(mockResponse.status).toHaveBeenCalledWith(
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      expect(mockResponse.json).toHaveBeenCalledWith({
        success: false,
        errorCode: 'INTERNAL_ERROR',
        message: 'Internal server error',
        timestamp: expect.any(String),
        path: '/test',
        method: 'GET',
      });
    });
  });

  describe('logging', () => {
    it('should log server errors (5xx) as error level', () => {
      // Arrange
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'development'; // Set to development to get actual error message
      const loggerErrorSpy = jest.spyOn(Logger.prototype, 'error');
      const exception = new Error('Database connection failed');

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(loggerErrorSpy).toHaveBeenCalledWith(
        'GET /test - Database connection failed',
        expect.any(String), // stack trace
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          statusCode: 500,
          errorCode: 'INTERNAL_ERROR',
        }),
      );

      // Cleanup
      process.env.NODE_ENV = originalEnv;
    });

    it('should log client errors (4xx) as warning level', () => {
      // Arrange
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');
      const exception = new HttpException('Not found', HttpStatus.NOT_FOUND);

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'GET /test - Not found',
        expect.objectContaining({
          method: 'GET',
          url: '/test',
          ip: '127.0.0.1',
          userAgent: 'test-agent',
          statusCode: 404,
          errorCode: 'NOT_FOUND',
        }),
      );
    });

    it('should include request context in logs', () => {
      // Arrange
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn');
      const exception = new ValidationException('Invalid input');

      // Create a new mock request with different values
      const customMockRequest = {
        method: 'POST',
        url: '/auth/login',
        ip: '192.168.1.1',
        headers: { 'user-agent': 'Mozilla/5.0' },
      };

      // Update the mock ArgumentsHost to return the custom request
      mockArgumentsHost.switchToHttp = jest.fn().mockReturnValue({
        getResponse: () => mockResponse,
        getRequest: () => customMockRequest,
      });

      // Act
      filter.catch(exception, mockArgumentsHost as ArgumentsHost);

      // Assert
      expect(loggerWarnSpy).toHaveBeenCalledWith(
        'POST /auth/login - Invalid input',
        expect.objectContaining({
          method: 'POST',
          url: '/auth/login',
          ip: '192.168.1.1',
          userAgent: 'Mozilla/5.0',
          statusCode: 400,
          errorCode: 'VALIDATION_ERROR',
        }),
      );
    });
  });

  describe('error code mapping', () => {
    const testCases = [
      { status: HttpStatus.BAD_REQUEST, expectedCode: 'BAD_REQUEST' },
      { status: HttpStatus.UNAUTHORIZED, expectedCode: 'UNAUTHORIZED' },
      { status: HttpStatus.FORBIDDEN, expectedCode: 'FORBIDDEN' },
      { status: HttpStatus.NOT_FOUND, expectedCode: 'NOT_FOUND' },
      { status: HttpStatus.CONFLICT, expectedCode: 'CONFLICT' },
      {
        status: HttpStatus.UNPROCESSABLE_ENTITY,
        expectedCode: 'UNPROCESSABLE_ENTITY',
      },
      {
        status: HttpStatus.TOO_MANY_REQUESTS,
        expectedCode: 'RATE_LIMIT_EXCEEDED',
      },
      {
        status: HttpStatus.INTERNAL_SERVER_ERROR,
        expectedCode: 'INTERNAL_ERROR',
      },
      { status: 999, expectedCode: 'UNKNOWN_ERROR' }, // Unknown status code
    ];

    testCases.forEach(({ status, expectedCode }) => {
      it(`should map HTTP status ${status} to error code ${expectedCode}`, () => {
        // Arrange
        const exception = new HttpException('Test error', status);

        // Act
        filter.catch(exception, mockArgumentsHost as ArgumentsHost);

        // Assert
        expect(mockResponse.status).toHaveBeenCalledWith(status);
        expect(mockResponse.json).toHaveBeenCalledWith(
          expect.objectContaining({
            errorCode: expectedCode,
          }),
        );
      });
    });
  });
});
