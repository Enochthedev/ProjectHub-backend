import {
    Controller,
    Get,
    Post,
    Put,
    Delete,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
    Res,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../entities/user.entity';
import { CalendarSyncService, CalendarSyncConfig } from '../services/calendar-sync.service';
import { CalendarProvider } from '../entities/calendar-sync.entity';

class CreateSyncConfigDto {
    provider: CalendarProvider;
    calendarId: string;
    accessToken?: string;
    refreshToken?: string;
    serverUrl?: string;
    username?: string;
    password?: string;
    syncInterval: number;
    autoSync: boolean;
}

class UpdateSyncConfigDto {
    calendarId?: string;
    accessToken?: string;
    refreshToken?: string;
    serverUrl?: string;
    username?: string;
    password?: string;
    syncInterval?: number;
    autoSync?: boolean;
}

@ApiTags('Calendar Sync')
@Controller('calendar-sync')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CalendarSyncController {
    constructor(private readonly calendarSyncService: CalendarSyncService) { }

    @Post('configs')
    @ApiOperation({ summary: 'Create calendar sync configuration' })
    @ApiResponse({ status: 201, description: 'Sync configuration created successfully' })
    async createSyncConfig(
        @GetUser() user: User,
        @Body() dto: CreateSyncConfigDto,
    ) {
        const config = await this.calendarSyncService.createSyncConfig(user.id, dto);
        return {
            message: 'Calendar sync configuration created successfully',
            config,
        };
    }

    @Get('configs')
    @ApiOperation({ summary: 'Get user calendar sync configurations' })
    @ApiResponse({ status: 200, description: 'Sync configurations retrieved' })
    async getSyncConfigs(@GetUser() user: User) {
        const configs = await this.calendarSyncService.getSyncConfigs(user.id);
        return { configs };
    }

    @Get('configs/:id')
    @ApiOperation({ summary: 'Get calendar sync configuration details' })
    @ApiResponse({ status: 200, description: 'Sync configuration details retrieved' })
    async getSyncConfig(
        @GetUser() user: User,
        @Param('id') syncId: string,
    ) {
        const config = await this.calendarSyncService.getSyncHistory(syncId, user.id);
        return { config };
    }

    @Put('configs/:id')
    @ApiOperation({ summary: 'Update calendar sync configuration' })
    @ApiResponse({ status: 200, description: 'Sync configuration updated successfully' })
    async updateSyncConfig(
        @GetUser() user: User,
        @Param('id') syncId: string,
        @Body() dto: UpdateSyncConfigDto,
    ) {
        const config = await this.calendarSyncService.updateSyncConfig(
            syncId,
            user.id,
            dto,
        );
        return {
            message: 'Calendar sync configuration updated successfully',
            config,
        };
    }

    @Delete('configs/:id')
    @ApiOperation({ summary: 'Delete calendar sync configuration' })
    @ApiResponse({ status: 200, description: 'Sync configuration deleted successfully' })
    async deleteSyncConfig(
        @GetUser() user: User,
        @Param('id') syncId: string,
    ) {
        await this.calendarSyncService.deleteSyncConfig(syncId, user.id);
        return {
            message: 'Calendar sync configuration deleted successfully',
        };
    }

    @Post('configs/:id/sync')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Manually trigger milestone sync' })
    @ApiResponse({ status: 200, description: 'Sync completed successfully' })
    async syncMilestones(
        @GetUser() user: User,
        @Param('id') syncId: string,
    ) {
        const result = await this.calendarSyncService.syncMilestones(syncId, user.id);
        return {
            message: 'Milestone sync completed',
            result,
        };
    }

    @Post('configs/:id/test')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Test calendar sync configuration' })
    @ApiResponse({ status: 200, description: 'Configuration test completed' })
    async testSyncConfig(
        @GetUser() user: User,
        @Param('id') syncId: string,
    ) {
        const result = await this.calendarSyncService.testSyncConfiguration(syncId, user.id);
        return result;
    }

    @Post('configs/:id/refresh-token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Refresh OAuth access token' })
    @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
    async refreshToken(
        @GetUser() user: User,
        @Param('id') syncId: string,
    ) {
        const config = await this.calendarSyncService.refreshAccessToken(syncId, user.id);
        return {
            message: 'Access token refreshed successfully',
            config: {
                id: config.id,
                provider: config.provider,
                status: config.status,
                lastSyncAt: config.lastSyncAt,
            },
        };
    }

    @Get('statistics')
    @ApiOperation({ summary: 'Get calendar sync statistics' })
    @ApiResponse({ status: 200, description: 'Sync statistics retrieved' })
    async getSyncStatistics(@GetUser() user: User) {
        const statistics = await this.calendarSyncService.getSyncStatistics(user.id);
        return { statistics };
    }

    @Get('export/ical')
    @ApiOperation({ summary: 'Export milestones as iCal file' })
    @ApiResponse({ status: 200, description: 'iCal file generated successfully' })
    async exportMilestonesAsICal(
        @GetUser() user: User,
        @Query('milestoneIds') milestoneIds?: string,
        @Res() res?: Response,
    ) {
        const milestoneIdArray = milestoneIds ? milestoneIds.split(',') : undefined;
        const iCalContent = await this.calendarSyncService.exportMilestonesAsICal(
            user.id,
            milestoneIdArray,
        );

        if (res) {
            res.setHeader('Content-Type', 'text/calendar');
            res.setHeader('Content-Disposition', 'attachment; filename="fyp-milestones.ics"');
            res.send(iCalContent);
        } else {
            return {
                message: 'iCal content generated successfully',
                content: iCalContent,
            };
        }
    }
}