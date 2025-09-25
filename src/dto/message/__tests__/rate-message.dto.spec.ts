import { validate } from 'class-validator';
import { plainToClass } from 'class-transformer';
import { RateMessageDto } from '../rate-message.dto';

describe('RateMessageDto', () => {
  let dto: RateMessageDto;

  beforeEach(() => {
    dto = new RateMessageDto();
  });

  describe('Valid DTO', () => {
    it('should pass validation with valid messageId and rating', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 4.5,
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with minimum rating (1.0)', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 1.0,
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with maximum rating (5.0)', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 5.0,
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should pass validation with feedback', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 4.0,
        feedback: 'Very helpful and accurate response',
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Invalid DTO', () => {
    it('should fail validation when messageId is missing', async () => {
      const plainDto = {
        rating: 4.5,
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('messageId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should fail validation when messageId is not a valid UUID', async () => {
      const plainDto = {
        messageId: 'invalid-uuid',
        rating: 4.5,
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('messageId');
      expect(errors[0].constraints).toHaveProperty('isUuid');
    });

    it('should fail validation when rating is missing', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('rating');
    });

    it('should fail validation when rating is below minimum (1.0)', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 0.5,
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('rating');
      expect(errors[0].constraints).toHaveProperty('min');
    });

    it('should fail validation when rating is above maximum (5.0)', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 5.5,
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('rating');
      expect(errors[0].constraints).toHaveProperty('max');
    });

    it('should fail validation when rating has more than 1 decimal place', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 4.55,
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('rating');
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should fail validation when rating is not a number', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 'four',
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('rating');
      expect(errors[0].constraints).toHaveProperty('isNumber');
    });

    it('should fail validation when feedback exceeds maximum length', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 4.0,
        feedback: 'a'.repeat(1001), // Exceeds 1000 character limit
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('feedback');
      expect(errors[0].constraints).toHaveProperty('maxLength');
    });

    it('should fail validation when feedback is not a string', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 4.0,
        feedback: 123,
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(1);
      expect(errors[0].property).toBe('feedback');
      expect(errors[0].constraints).toHaveProperty('isString');
    });
  });

  describe('Optional Properties', () => {
    it('should allow undefined feedback', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 4.0,
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow feedback at maximum length (1000 characters)', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 4.0,
        feedback: 'a'.repeat(1000),
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });

    it('should allow empty feedback string', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: 4.0,
        feedback: '',
      };
      dto = plainToClass(RateMessageDto, plainDto);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('Type Transformation', () => {
    it('should transform string rating to number', async () => {
      const plainDto = {
        messageId: '123e4567-e89b-12d3-a456-426614174000',
        rating: '4.5',
      };
      dto = plainToClass(RateMessageDto, plainDto);

      expect(typeof dto.rating).toBe('number');
      expect(dto.rating).toBe(4.5);

      const errors = await validate(dto);
      expect(errors).toHaveLength(0);
    });
  });
});
