import { validate } from 'class-validator';
import { IsUniversityEmail } from '../university-email.validator';

class TestDto {
  @IsUniversityEmail()
  email: string;
}

describe('IsUniversityEmail Validator', () => {
  let testDto: TestDto;

  beforeEach(() => {
    testDto = new TestDto();
  });

  describe('valid emails', () => {
    it('should pass for valid UI email', async () => {
      testDto.email = 'student@ui.edu.ng';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });

    it('should pass for valid UI email with different case', async () => {
      testDto.email = 'Student@UI.EDU.NG';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });

    it('should pass for valid UI email with subdomain', async () => {
      testDto.email = 'test.user@ui.edu.ng';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(0);
    });
  });

  describe('invalid emails', () => {
    it('should fail for non-UI email', async () => {
      testDto.email = 'student@gmail.com';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUniversityEmail).toContain(
        'University of Ibadan domain',
      );
    });

    it('should fail for empty email', async () => {
      testDto.email = '';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
    });

    it('should fail for null email', async () => {
      testDto.email = null as any;
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
    });

    it('should fail for invalid email format', async () => {
      testDto.email = 'not-an-email';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
    });

    it('should fail for wrong domain', async () => {
      testDto.email = 'student@unn.edu.ng';
      const errors = await validate(testDto);
      expect(errors).toHaveLength(1);
      expect(errors[0].constraints?.isUniversityEmail).toContain(
        'University of Ibadan domain',
      );
    });
  });
});
