import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StudentProfile } from '../entities/student-profile.entity';
import { User } from '../entities/user.entity';
import { UpdateStudentProfileDto } from '../dto/profile/update-student-profile.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { SPECIALIZATIONS } from '../common/constants';

@Injectable()
export class StudentProfileService {
  constructor(
    @InjectRepository(StudentProfile)
    private readonly studentProfileRepository: Repository<StudentProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get student profile by user ID
   */
  async getStudentProfile(userId: string): Promise<StudentProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.STUDENT },
      relations: ['studentProfile'],
    });

    if (!user) {
      throw new NotFoundException('Student user not found');
    }

    if (!user.studentProfile) {
      throw new NotFoundException('Student profile not found');
    }

    return user.studentProfile;
  }

  /**
   * Create a new student profile
   */
  async createStudentProfile(
    userId: string,
    profileData: UpdateStudentProfileDto,
  ): Promise<StudentProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.STUDENT },
      relations: ['studentProfile'],
    });

    if (!user) {
      throw new NotFoundException('Student user not found');
    }

    if (user.studentProfile) {
      throw new BadRequestException('Student profile already exists');
    }

    // Validate specializations
    if (profileData.preferredSpecializations) {
      this.validateSpecializations(profileData.preferredSpecializations);
    }

    // Validate skills and interests arrays
    if (profileData.skills) {
      this.validateStringArray(profileData.skills, 'skills');
    }

    if (profileData.interests) {
      this.validateStringArray(profileData.interests, 'interests');
    }

    const studentProfile = this.studentProfileRepository.create({
      ...profileData,
      user,
    });

    return await this.studentProfileRepository.save(studentProfile);
  }

  /**
   * Update existing student profile
   */
  async updateStudentProfile(
    userId: string,
    profileData: UpdateStudentProfileDto,
  ): Promise<StudentProfile> {
    const existingProfile = await this.getStudentProfile(userId);

    // Validate specializations if provided
    if (profileData.preferredSpecializations) {
      this.validateSpecializations(profileData.preferredSpecializations);
    }

    // Validate skills and interests arrays if provided
    if (profileData.skills) {
      this.validateStringArray(profileData.skills, 'skills');
    }

    if (profileData.interests) {
      this.validateStringArray(profileData.interests, 'interests');
    }

    // Update profile with new data
    Object.assign(existingProfile, profileData);

    return await this.studentProfileRepository.save(existingProfile);
  }

  /**
   * Delete student profile
   */
  async deleteStudentProfile(userId: string): Promise<void> {
    const profile = await this.getStudentProfile(userId);
    await this.studentProfileRepository.remove(profile);
  }

  /**
   * Get all student profiles (for admin use)
   */
  async getAllStudentProfiles(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ profiles: StudentProfile[]; total: number }> {
    const [profiles, total] = await this.studentProfileRepository.findAndCount({
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { profileUpdatedAt: 'DESC' },
    });

    return { profiles, total };
  }

  /**
   * Search student profiles by skills or interests
   */
  async searchStudentProfiles(
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ profiles: StudentProfile[]; total: number }> {
    const queryBuilder = this.studentProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .where(
        `(
                    profile.skills::text ILIKE :searchTerm OR 
                    profile.interests::text ILIKE :searchTerm OR 
                    profile.name ILIKE :searchTerm OR
                    :searchTerm = ANY(profile.preferredSpecializations)
                )`,
        { searchTerm: `%${searchTerm}%` },
      )
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('profile.profileUpdatedAt', 'DESC');

    const [profiles, total] = await queryBuilder.getManyAndCount();

    return { profiles, total };
  }

  /**
   * Get students by preferred specialization
   */
  async getStudentsBySpecialization(
    specialization: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ profiles: StudentProfile[]; total: number }> {
    if (!SPECIALIZATIONS.includes(specialization as any)) {
      throw new BadRequestException('Invalid specialization');
    }

    const [profiles, total] = await this.studentProfileRepository.findAndCount({
      where: {
        preferredSpecializations: specialization as any,
      },
      relations: ['user'],
      skip: (page - 1) * limit,
      take: limit,
      order: { profileUpdatedAt: 'DESC' },
    });

    return { profiles, total };
  }

  /**
   * Validate specializations array
   */
  private validateSpecializations(specializations: string[]): void {
    const invalidSpecializations = specializations.filter(
      (spec) => !SPECIALIZATIONS.includes(spec as any),
    );

    if (invalidSpecializations.length > 0) {
      throw new BadRequestException(
        `Invalid specializations: ${invalidSpecializations.join(', ')}. ` +
          `Valid options are: ${SPECIALIZATIONS.join(', ')}`,
      );
    }
  }

  /**
   * Validate string arrays for skills and interests
   */
  private validateStringArray(array: string[], fieldName: string): void {
    if (!Array.isArray(array)) {
      throw new BadRequestException(`${fieldName} must be an array`);
    }

    const invalidItems = array.filter(
      (item) => typeof item !== 'string' || item.trim().length === 0,
    );

    if (invalidItems.length > 0) {
      throw new BadRequestException(
        `All ${fieldName} must be non-empty strings`,
      );
    }

    // Check for duplicates
    const uniqueItems = new Set(array.map((item) => item.toLowerCase().trim()));
    if (uniqueItems.size !== array.length) {
      throw new BadRequestException(`${fieldName} cannot contain duplicates`);
    }

    // Limit array size
    if (array.length > 20) {
      throw new BadRequestException(
        `${fieldName} cannot contain more than 20 items`,
      );
    }
  }
}
