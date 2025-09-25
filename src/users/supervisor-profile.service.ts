import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupervisorProfile } from '../entities/supervisor-profile.entity';
import { User } from '../entities/user.entity';
import { UpdateSupervisorProfileDto } from '../dto/profile/update-supervisor-profile.dto';
import { UserRole } from '../common/enums/user-role.enum';
import { SPECIALIZATIONS } from '../common/constants';

@Injectable()
export class SupervisorProfileService {
  constructor(
    @InjectRepository(SupervisorProfile)
    private readonly supervisorProfileRepository: Repository<SupervisorProfile>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  /**
   * Get supervisor profile by user ID
   */
  async getSupervisorProfile(userId: string): Promise<SupervisorProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.SUPERVISOR },
      relations: ['supervisorProfile'],
    });

    if (!user) {
      throw new NotFoundException('Supervisor user not found');
    }

    if (!user.supervisorProfile) {
      throw new NotFoundException('Supervisor profile not found');
    }

    return user.supervisorProfile;
  }

  /**
   * Create a new supervisor profile
   */
  async createSupervisorProfile(
    userId: string,
    profileData: UpdateSupervisorProfileDto,
  ): Promise<SupervisorProfile> {
    const user = await this.userRepository.findOne({
      where: { id: userId, role: UserRole.SUPERVISOR },
      relations: ['supervisorProfile'],
    });

    if (!user) {
      throw new NotFoundException('Supervisor user not found');
    }

    if (user.supervisorProfile) {
      throw new BadRequestException('Supervisor profile already exists');
    }

    // Validate specializations
    if (profileData.specializations) {
      this.validateSpecializations(profileData.specializations);
    }

    // Validate phone number format if provided
    if (profileData.phoneNumber) {
      this.validatePhoneNumber(profileData.phoneNumber);
    }

    const supervisorProfile = this.supervisorProfileRepository.create({
      ...profileData,
      user,
    });

    const savedProfile =
      await this.supervisorProfileRepository.save(supervisorProfile);

    // Update availability based on capacity if maxStudents is set
    if (profileData.maxStudents !== undefined) {
      await this.updateAvailabilityBasedOnCapacity(savedProfile.id);
    }

    return savedProfile;
  }

  /**
   * Update existing supervisor profile
   */
  async updateSupervisorProfile(
    userId: string,
    profileData: UpdateSupervisorProfileDto,
  ): Promise<SupervisorProfile> {
    const existingProfile = await this.getSupervisorProfile(userId);

    // Validate specializations if provided
    if (profileData.specializations) {
      this.validateSpecializations(profileData.specializations);
    }

    // Validate phone number format if provided
    if (profileData.phoneNumber) {
      this.validatePhoneNumber(profileData.phoneNumber);
    }

    // Update profile with new data
    Object.assign(existingProfile, profileData);

    const savedProfile =
      await this.supervisorProfileRepository.save(existingProfile);

    // Update availability based on capacity if maxStudents was changed
    if (profileData.maxStudents !== undefined) {
      await this.updateAvailabilityBasedOnCapacity(savedProfile.id);
    }

    return savedProfile;
  }

  /**
   * Delete supervisor profile
   */
  async deleteSupervisorProfile(userId: string): Promise<void> {
    const profile = await this.getSupervisorProfile(userId);
    await this.supervisorProfileRepository.remove(profile);
  }

  /**
   * Get all supervisor profiles (for admin use)
   */
  async getAllSupervisorProfiles(
    page: number = 1,
    limit: number = 10,
  ): Promise<{ profiles: SupervisorProfile[]; total: number }> {
    const [profiles, total] =
      await this.supervisorProfileRepository.findAndCount({
        relations: ['user'],
        skip: (page - 1) * limit,
        take: limit,
        order: { name: 'ASC' },
      });

    return { profiles, total };
  }

  /**
   * Get available supervisors by specialization
   */
  async getAvailableSupervisorsBySpecialization(
    specialization: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ profiles: SupervisorProfile[]; total: number }> {
    if (!SPECIALIZATIONS.includes(specialization as any)) {
      throw new BadRequestException('Invalid specialization');
    }

    const [profiles, total] =
      await this.supervisorProfileRepository.findAndCount({
        where: {
          specializations: specialization as any,
          isAvailable: true,
        },
        relations: ['user'],
        skip: (page - 1) * limit,
        take: limit,
        order: { name: 'ASC' },
      });

    return { profiles, total };
  }

  /**
   * Search supervisor profiles by name or specialization
   */
  async searchSupervisorProfiles(
    searchTerm: string,
    page: number = 1,
    limit: number = 10,
  ): Promise<{ profiles: SupervisorProfile[]; total: number }> {
    const queryBuilder = this.supervisorProfileRepository
      .createQueryBuilder('profile')
      .leftJoinAndSelect('profile.user', 'user')
      .where(
        `(
                    profile.name ILIKE :searchTerm OR 
                    :searchTerm = ANY(profile.specializations)
                )`,
        { searchTerm: `%${searchTerm}%` },
      )
      .skip((page - 1) * limit)
      .take(limit)
      .orderBy('profile.name', 'ASC');

    const [profiles, total] = await queryBuilder.getManyAndCount();

    return { profiles, total };
  }

  /**
   * Toggle supervisor availability
   */
  async toggleAvailability(userId: string): Promise<SupervisorProfile> {
    const profile = await this.getSupervisorProfile(userId);
    profile.isAvailable = !profile.isAvailable;
    return await this.supervisorProfileRepository.save(profile);
  }

  /**
   * Update supervisor capacity and adjust availability
   */
  async updateCapacity(
    userId: string,
    maxStudents: number,
  ): Promise<SupervisorProfile> {
    if (maxStudents < 1 || maxStudents > 20) {
      throw new BadRequestException(
        'Maximum students must be between 1 and 20',
      );
    }

    const profile = await this.getSupervisorProfile(userId);
    profile.maxStudents = maxStudents;

    const savedProfile = await this.supervisorProfileRepository.save(profile);

    // Update availability based on new capacity
    await this.updateAvailabilityBasedOnCapacity(profile.id);

    return savedProfile;
  }

  /**
   * Get supervisor statistics (for admin dashboard)
   */
  async getSupervisorStatistics(): Promise<{
    total: number;
    available: number;
    unavailable: number;
    bySpecialization: Record<string, number>;
  }> {
    const total = await this.supervisorProfileRepository.count();
    const available = await this.supervisorProfileRepository.count({
      where: { isAvailable: true },
    });
    const unavailable = total - available;

    // Get count by specialization
    const specializationCounts: Record<string, number> = {};

    for (const specialization of SPECIALIZATIONS) {
      const count = await this.supervisorProfileRepository.count({
        where: {
          specializations: specialization as any,
        },
      });
      specializationCounts[specialization] = count;
    }

    return {
      total,
      available,
      unavailable,
      bySpecialization: specializationCounts,
    };
  }

  /**
   * Update availability based on current capacity vs assigned students
   * Note: This is a placeholder - actual student assignment tracking would be implemented
   * in a separate service/module
   */
  private async updateAvailabilityBasedOnCapacity(
    profileId: string,
  ): Promise<void> {
    const profile = await this.supervisorProfileRepository.findOne({
      where: { id: profileId },
    });

    if (!profile) {
      return;
    }

    // TODO: Implement actual student assignment counting
    // For now, we'll just ensure the profile remains available if manually set
    // In a real implementation, this would:
    // 1. Count current assigned students
    // 2. Compare with maxStudents
    // 3. Update isAvailable accordingly

    // Placeholder logic - in real implementation, replace with actual student count
    const currentAssignedStudents = 0; // This would come from student assignments

    if (currentAssignedStudents >= profile.maxStudents) {
      profile.isAvailable = false;
      await this.supervisorProfileRepository.save(profile);
    }
  }

  /**
   * Validate specializations array
   */
  private validateSpecializations(specializations: string[]): void {
    if (!Array.isArray(specializations) || specializations.length === 0) {
      throw new BadRequestException(
        'Specializations must be a non-empty array',
      );
    }

    const invalidSpecializations = specializations.filter(
      (spec) => !SPECIALIZATIONS.includes(spec as any),
    );

    if (invalidSpecializations.length > 0) {
      throw new BadRequestException(
        `Invalid specializations: ${invalidSpecializations.join(', ')}. ` +
          `Valid options are: ${SPECIALIZATIONS.join(', ')}`,
      );
    }

    // Check for duplicates
    const uniqueSpecializations = new Set(specializations);
    if (uniqueSpecializations.size !== specializations.length) {
      throw new BadRequestException(
        'Specializations cannot contain duplicates',
      );
    }

    // Limit number of specializations
    if (specializations.length > 5) {
      throw new BadRequestException('Cannot have more than 5 specializations');
    }
  }

  /**
   * Validate phone number format
   */
  private validatePhoneNumber(phoneNumber: string): void {
    // Basic phone number validation - adjust regex based on requirements
    const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/;

    if (!phoneRegex.test(phoneNumber.replace(/[\s\-\(\)]/g, ''))) {
      throw new BadRequestException('Invalid phone number format');
    }
  }
}
