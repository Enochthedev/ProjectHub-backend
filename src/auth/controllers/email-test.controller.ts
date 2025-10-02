import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { EmailService } from '../services/email.service';

class SendTestEmailDto {
    email: string;
}

class ScheduleEmailDto {
    email: string;
    subject: string;
    content: string;
    scheduledAt: string; // ISO date string
}

@ApiTags('Email Testing')
@Controller('auth/email-test')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class EmailTestController {
    constructor(private readonly emailService: EmailService) { }

    @Post('send-test')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send test email (Admin only)' })
    @ApiResponse({ status: 200, description: 'Test email queued successfully' })
    async sendTestEmail(@Body() dto: SendTestEmailDto) {
        const deliveryId = await this.emailService.sendTestEmail(dto.email);
        return {
            message: 'Test email queued successfully',
            deliveryId,
        };
    }

    @Post('send-immediate-test')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Send immediate test email (Admin only)' })
    @ApiResponse({ status: 200, description: 'Test email sent immediately' })
    async sendImmediateTestEmail(@Body() dto: SendTestEmailDto) {
        const result = await this.emailService.sendImmediateTestEmail(dto.email);
        return {
            message: 'Test email sent immediately',
            messageId: result.messageId,
        };
    }

    @Post('schedule')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Schedule email for future delivery (Admin only)' })
    @ApiResponse({ status: 200, description: 'Email scheduled successfully' })
    async scheduleEmail(@Body() dto: ScheduleEmailDto) {
        const scheduledAt = new Date(dto.scheduledAt);
        const deliveryId = await this.emailService.scheduleEmail(
            {
                to: dto.email,
                subject: dto.subject,
                html: `<p>${dto.content}</p>`,
                text: dto.content,
            },
            scheduledAt,
        );

        return {
            message: 'Email scheduled successfully',
            deliveryId,
            scheduledAt: scheduledAt.toISOString(),
        };
    }

    @Get('delivery-status/:id')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get email delivery status (Admin only)' })
    @ApiResponse({ status: 200, description: 'Email delivery status retrieved' })
    async getDeliveryStatus(@Param('id') deliveryId: string) {
        const status = await this.emailService.getEmailDeliveryStatus(deliveryId);
        if (!status) {
            return { message: 'Delivery record not found' };
        }
        return status;
    }

    @Get('stats')
    @Roles(UserRole.ADMIN)
    @ApiOperation({ summary: 'Get email delivery statistics (Admin only)' })
    @ApiResponse({ status: 200, description: 'Email delivery statistics retrieved' })
    async getDeliveryStats(
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const start = startDate ? new Date(startDate) : undefined;
        const end = endDate ? new Date(endDate) : undefined;

        const stats = await this.emailService.getEmailDeliveryStats(start, end);
        return stats;
    }

    @Post('cancel/:id')
    @Roles(UserRole.ADMIN)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Cancel scheduled email (Admin only)' })
    @ApiResponse({ status: 200, description: 'Email cancellation result' })
    async cancelScheduledEmail(@Param('id') deliveryId: string) {
        const cancelled = await this.emailService.cancelScheduledEmail(deliveryId);
        return {
            message: cancelled ? 'Email cancelled successfully' : 'Email not found or already sent',
            cancelled,
        };
    }
}