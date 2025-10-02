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
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../entities/user.entity';
import { NotificationService } from '../services/notification.service';
import {
    NotificationType,
    NotificationStatus,
} from '../entities/notification.entity';
import { NotificationChannel } from '../entities/notification-preference.entity';

class UpdatePreferenceDto {
    notificationType: NotificationType;
    channel: NotificationChannel;
    enabled: boolean;
    settings?: Record<string, any>;
}

class MarkAsReadDto {
    notificationIds: string[];
}

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
    constructor(private readonly notificationService: NotificationService) { }

    @Get()
    @ApiOperation({ summary: 'Get user notifications with pagination' })
    @ApiQuery({ name: 'page', required: false, type: Number })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiQuery({ name: 'status', required: false, enum: NotificationStatus })
    @ApiResponse({ status: 200, description: 'Notifications retrieved successfully' })
    async getNotifications(
        @GetUser() user: User,
        @Query('page') page: number = 1,
        @Query('limit') limit: number = 20,
        @Query('status') status?: NotificationStatus,
    ) {
        const result = await this.notificationService.getUserNotifications(
            user.id,
            page,
            limit,
            status,
        );

        return {
            notifications: result.notifications,
            pagination: {
                page,
                limit,
                total: result.total,
                totalPages: Math.ceil(result.total / limit),
            },
            unreadCount: result.unreadCount,
        };
    }

    @Get('preferences')
    @ApiOperation({ summary: 'Get user notification preferences' })
    @ApiResponse({ status: 200, description: 'Notification preferences retrieved' })
    async getPreferences(@GetUser() user: User) {
        const preferences = await this.notificationService.getUserNotificationPreferences(user.id);
        return { preferences };
    }

    @Put('preferences')
    @ApiOperation({ summary: 'Update notification preference' })
    @ApiResponse({ status: 200, description: 'Preference updated successfully' })
    async updatePreference(
        @GetUser() user: User,
        @Body() dto: UpdatePreferenceDto,
    ) {
        const preference = await this.notificationService.updateNotificationPreference(
            user.id,
            dto.notificationType,
            dto.channel,
            dto.enabled,
            dto.settings,
        );

        return {
            message: 'Notification preference updated successfully',
            preference,
        };
    }

    @Post(':id/read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark notification as read' })
    @ApiResponse({ status: 200, description: 'Notification marked as read' })
    async markAsRead(
        @GetUser() user: User,
        @Param('id') notificationId: string,
    ) {
        const success = await this.notificationService.markAsRead(notificationId, user.id);

        return {
            message: success ? 'Notification marked as read' : 'Notification not found',
            success,
        };
    }

    @Post('read-multiple')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Mark multiple notifications as read' })
    @ApiResponse({ status: 200, description: 'Notifications marked as read' })
    async markMultipleAsRead(
        @GetUser() user: User,
        @Body() dto: MarkAsReadDto,
    ) {
        const count = await this.notificationService.markMultipleAsRead(
            dto.notificationIds,
            user.id,
        );

        return {
            message: `${count} notifications marked as read`,
            count,
        };
    }

    @Delete(':id')
    @ApiOperation({ summary: 'Delete notification' })
    @ApiResponse({ status: 200, description: 'Notification deleted successfully' })
    async deleteNotification(
        @GetUser() user: User,
        @Param('id') notificationId: string,
    ) {
        const success = await this.notificationService.deleteNotification(notificationId, user.id);

        return {
            message: success ? 'Notification deleted successfully' : 'Notification not found',
            success,
        };
    }

    @Get('unread-count')
    @ApiOperation({ summary: 'Get unread notification count' })
    @ApiResponse({ status: 200, description: 'Unread count retrieved' })
    async getUnreadCount(@GetUser() user: User) {
        const result = await this.notificationService.getUserNotifications(user.id, 1, 1);
        return { unreadCount: result.unreadCount };
    }
}