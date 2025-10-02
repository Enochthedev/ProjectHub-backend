import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SupervisorAvailability, AvailabilityType, DayOfWeek } from '../entities/supervisor-availability.entity';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import {
    CreateAvailabilityDto,
    UpdateAvailabilityDto,
    AvailabilityResponseDto,
    SupervisorAvailabilityDto,
} from '../dto/supervisor/availability.dto';

@Injectable()
export class SupervisorAvailabilityService {
    private readonly logger = new Logger(SupervisorAvailabilityService.name);

    constructor(
        @InjectRepository(SupervisorAvailability)
        private readonly availabilityRepository: Repository<SupervisorAvailability>,
        @InjectRepository(User)
        private readonly userRepository: Repository<User>,
    ) { }

    async createAvailability(
        supervisorId: string,
        createDto: CreateAvailabilityDto,
    ): Promise<AvailabilityResponseDto> {
        this.logger.log(`Creating availability for supervisor ${supervisorId}`);

        // Verify supervisor exists
        const supervisor = await this.userRepository.findOne({
            where: { id: supervisorId, role: UserRole.SUPERVISOR },
        });

        if (!supervisor) {
            throw new NotFoundException('Supervisor not found');
        }

        // Validate time range
        this.validateTimeRange(createDto.startTime, createDto.endTime);

        // Check for conflicts
        await this.checkForConflicts(supervisorId, createDto);

        const availability = this.availabilityRepository.create({
            supervisorId,
            ...createDto,
            effectiveFrom: createDto.effectiveFrom ? new Date(createDto.effectiveFrom) : undefined,
            effectiveUntil: createDto.effectiveUntil ? new Date(createDto.effectiveUntil) : undefined,
        });

        const savedAvailability = await this.availabilityRepository.save(availability);
        return this.mapToResponseDto(savedAvailability);
    }

    async updateAvailability(
        supervisorId: string,
        availabilityId: string,
        updateDto: UpdateAvailabilityDto,
    ): Promise<AvailabilityResponseDto> {
        this.logger.log(`Updating availability ${availabilityId} for supervisor ${supervisorId}`);

        const availability = await this.availabilityRepository.findOne({
            where: { id: availabilityId, supervisorId },
        });

        if (!availability) {
            throw new NotFoundException('Availability slot not found');
        }

        // Validate time range if provided
        if (updateDto.startTime && updateDto.endTime) {
            this.validateTimeRange(updateDto.startTime, updateDto.endTime);
        }

        // Check for conflicts if time or day is being changed
        if (updateDto.dayOfWeek || updateDto.startTime || updateDto.endTime) {
            const checkDto = {
                dayOfWeek: updateDto.dayOfWeek || availability.dayOfWeek,
                startTime: updateDto.startTime || availability.startTime,
                endTime: updateDto.endTime || availability.endTime,
                type: updateDto.type || availability.type,
            };
            await this.checkForConflicts(supervisorId, checkDto, availabilityId);
        }

        // Update fields
        Object.assign(availability, {
            ...updateDto,
            effectiveFrom: updateDto.effectiveFrom ? new Date(updateDto.effectiveFrom) : availability.effectiveFrom,
            effectiveUntil: updateDto.effectiveUntil ? new Date(updateDto.effectiveUntil) : availability.effectiveUntil,
        });

        const savedAvailability = await this.availabilityRepository.save(availability);
        return this.mapToResponseDto(savedAvailability);
    }

    async deleteAvailability(supervisorId: string, availabilityId: string): Promise<void> {
        this.logger.log(`Deleting availability ${availabilityId} for supervisor ${supervisorId}`);

        const result = await this.availabilityRepository.delete({
            id: availabilityId,
            supervisorId,
        });

        if (result.affected === 0) {
            throw new NotFoundException('Availability slot not found');
        }
    }

    async getSupervisorAvailability(supervisorId: string): Promise<SupervisorAvailabilityDto> {
        this.logger.log(`Getting availability for supervisor ${supervisorId}`);

        // Verify supervisor exists
        const supervisor = await this.userRepository.findOne({
            where: { id: supervisorId, role: UserRole.SUPERVISOR },
            relations: ['supervisorProfile'],
        });

        if (!supervisor) {
            throw new NotFoundException('Supervisor not found');
        }

        const availabilitySlots = await this.availabilityRepository.find({
            where: { supervisorId, isActive: true },
            order: { dayOfWeek: 'ASC', startTime: 'ASC' },
        });

        const mappedSlots = availabilitySlots.map(slot => this.mapToResponseDto(slot));
        const totalWeeklyCapacity = this.calculateTotalWeeklyCapacity(availabilitySlots);
        const utilizationRate = await this.calculateUtilizationRate(supervisorId);
        const nextAvailableSlot = this.findNextAvailableSlot(availabilitySlots);

        return {
            supervisorId,
            supervisorName: supervisor.supervisorProfile?.name || 'Unknown Supervisor',
            availabilitySlots: mappedSlots,
            totalWeeklyCapacity,
            utilizationRate,
            nextAvailableSlot,
            lastUpdated: new Date().toISOString(),
        };
    }

    async getAvailabilityById(
        supervisorId: string,
        availabilityId: string,
    ): Promise<AvailabilityResponseDto> {
        const availability = await this.availabilityRepository.findOne({
            where: { id: availabilityId, supervisorId },
        });

        if (!availability) {
            throw new NotFoundException('Availability slot not found');
        }

        return this.mapToResponseDto(availability);
    }

    private validateTimeRange(startTime: string, endTime: string): void {
        const start = this.parseTime(startTime);
        const end = this.parseTime(endTime);

        if (start >= end) {
            throw new BadRequestException('Start time must be before end time');
        }

        // Check for reasonable time ranges (e.g., not more than 12 hours)
        const diffHours = (end - start) / (60 * 60 * 1000);
        if (diffHours > 12) {
            throw new BadRequestException('Availability slot cannot exceed 12 hours');
        }
    }

    private parseTime(timeString: string): number {
        const [hours, minutes] = timeString.split(':').map(Number);
        return hours * 60 * 60 * 1000 + minutes * 60 * 1000;
    }

    private async checkForConflicts(
        supervisorId: string,
        dto: { dayOfWeek: DayOfWeek; startTime: string; endTime: string; type: AvailabilityType },
        excludeId?: string,
    ): Promise<void> {
        const queryBuilder = this.availabilityRepository
            .createQueryBuilder('availability')
            .where('availability.supervisorId = :supervisorId', { supervisorId })
            .andWhere('availability.dayOfWeek = :dayOfWeek', { dayOfWeek: dto.dayOfWeek })
            .andWhere('availability.isActive = true')
            .andWhere(
                '(availability.startTime < :endTime AND availability.endTime > :startTime)',
                { startTime: dto.startTime, endTime: dto.endTime }
            );

        if (excludeId) {
            queryBuilder.andWhere('availability.id != :excludeId', { excludeId });
        }

        const conflictingSlots = await queryBuilder.getMany();

        if (conflictingSlots.length > 0) {
            throw new BadRequestException(
                `Availability slot conflicts with existing ${conflictingSlots[0].type} slot`
            );
        }
    }

    private calculateTotalWeeklyCapacity(slots: SupervisorAvailability[]): number {
        return slots.reduce((total, slot) => {
            const startTime = this.parseTime(slot.startTime);
            const endTime = this.parseTime(slot.endTime);
            const durationHours = (endTime - startTime) / (60 * 60 * 1000);
            return total + (durationHours * slot.maxCapacity);
        }, 0);
    }

    private async calculateUtilizationRate(supervisorId: string): Promise<number> {
        // This would typically involve checking actual bookings/meetings
        // For now, return a placeholder calculation
        return Math.random() * 100; // 0-100%
    }

    private findNextAvailableSlot(slots: SupervisorAvailability[]): {
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
        location: string | null;
    } | null {
        if (slots.length === 0) return null;

        const now = new Date();
        const currentDay = now.getDay() === 0 ? 6 : now.getDay() - 1; // Convert Sunday=0 to Sunday=6
        const currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;

        // Find next available slot starting from current time
        for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
            const targetDay = (currentDay + dayOffset) % 7;
            const daySlots = slots
                .filter(slot => slot.dayOfWeek === targetDay)
                .sort((a, b) => a.startTime.localeCompare(b.startTime));

            for (const slot of daySlots) {
                if (dayOffset === 0 && slot.startTime <= currentTime) {
                    continue; // Skip past slots for today
                }

                return {
                    dayOfWeek: slot.dayOfWeek,
                    startTime: slot.startTime,
                    endTime: slot.endTime,
                    location: slot.location,
                };
            }
        }

        return null;
    }

    private mapToResponseDto(availability: SupervisorAvailability): AvailabilityResponseDto {
        return {
            id: availability.id,
            type: availability.type,
            dayOfWeek: availability.dayOfWeek,
            startTime: availability.startTime,
            endTime: availability.endTime,
            location: availability.location,
            notes: availability.notes,
            maxCapacity: availability.maxCapacity,
            isActive: availability.isActive,
            effectiveFrom: availability.effectiveFrom?.toISOString().split('T')[0] || null,
            effectiveUntil: availability.effectiveUntil?.toISOString().split('T')[0] || null,
            createdAt: availability.createdAt.toISOString(),
            updatedAt: availability.updatedAt.toISOString(),
        };
    }
}