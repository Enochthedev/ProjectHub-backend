import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { IsString, IsEmail, MinLength } from 'class-validator';
import { CustomValidationPipe, QueryValidationPipe } from '../validation.pipe';

class TestDto {
  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;
}

describe('CustomValidationPipe', () => {
  let pipe: CustomValidationPipe;

  beforeEach(() => {
    pipe = new CustomValidationPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should transform valid data', async () => {
    const validData = {
      email: 'test@ui.edu.ng',
      password: 'SecurePass123!',
    };

    const result = await pipe.transform(validData, {
      type: 'body',
      metatype: TestDto,
    });

    expect(result).toEqual(validData);
  });

  it('should throw BadRequestException for invalid data', async () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'short',
    };

    await expect(
      pipe.transform(invalidData, {
        type: 'body',
        metatype: TestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('should format validation errors correctly', async () => {
    const invalidData = {
      email: 'invalid-email',
      password: 'short',
    };

    try {
      await pipe.transform(invalidData, {
        type: 'body',
        metatype: TestDto,
      });
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      const response = error.getResponse();
      expect(response).toHaveProperty('success', false);
      expect(response).toHaveProperty('errorCode', 'VALIDATION_ERROR');
      expect(response).toHaveProperty('message', 'Validation failed');
      expect(response).toHaveProperty('errors');
      expect(response.errors).toHaveProperty('email');
      expect(response.errors).toHaveProperty('password');
    }
  });

  it('should throw error for non-whitelisted properties', async () => {
    const dataWithExtra = {
      email: 'test@ui.edu.ng',
      password: 'SecurePass123!',
      extraField: 'should be removed',
    };

    await expect(
      pipe.transform(dataWithExtra, {
        type: 'body',
        metatype: TestDto,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});

describe('QueryValidationPipe', () => {
  let pipe: QueryValidationPipe;

  beforeEach(() => {
    pipe = new QueryValidationPipe();
  });

  it('should be defined', () => {
    expect(pipe).toBeDefined();
  });

  it('should transform boolean strings to booleans', () => {
    const queryData = {
      isActive: 'true',
      isVerified: 'false',
      page: '1',
    };

    const result = pipe.transform(queryData, {
      type: 'query',
    });

    expect(result.isActive).toBe(true);
    expect(result.isVerified).toBe(false);
    expect(result.page).toBe('1'); // Numbers remain as strings
  });

  it('should handle null and undefined strings', () => {
    const queryData = {
      optional1: 'null',
      optional2: 'undefined',
      required: 'value',
    };

    const result = pipe.transform(queryData, {
      type: 'query',
    });

    expect(result.optional1).toBeUndefined();
    expect(result.optional2).toBeUndefined();
    expect(result.required).toBe('value');
  });

  it('should not transform non-query parameters', () => {
    const bodyData = {
      isActive: 'true',
      value: 'test',
    };

    const result = pipe.transform(bodyData, {
      type: 'body',
    });

    expect(result.isActive).toBe('true'); // Should remain string
    expect(result.value).toBe('test');
  });

  it('should handle non-object values', () => {
    const stringValue = 'test';

    const result = pipe.transform(stringValue, {
      type: 'query',
    });

    expect(result).toBe('test');
  });

  it('should handle null values', () => {
    const result = pipe.transform(null, {
      type: 'query',
    });

    expect(result).toBeNull();
  });
});
