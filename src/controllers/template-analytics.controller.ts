import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Query,
    UseGuards,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { GetUser } from '../common/decorators/get-user.decorator';
import { User } from '../entities/user.entity';
import { UserRole } from '../common/enums/user-role.enum';
import { ProjectType } from '../common/enums/project-type.enum';
import { TemplateAnalyticsService } from '../services/template-analytics.service';

class RecordFeedbackDto {
    projectId: string;
    rating: number; // 1-5
    feedback: string;
    isRecommended: boolean;
    difficultyRatings?: {
        overall: number;
        milestones: Array<{
            title: string;
            difficulty: number;
        }>;
    };
}

class UpdateMilestoneProgressDto {
    projectId: string;
    milestoneTitle: string;
    status: 'completed' | 'overdue' | 'pending';
    actualDays?: number;
}

@ApiTags('Template Analytics')
@Controller('template-analytics')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class TemplateAnalyticsController {
    constructor(
        private readonly templateAnalyticsService: TemplateAnalyticsService,
    ) { }

    @Get('overview')
    @ApiOperation({ summary: 'Get template analytics overview' })
    @ApiQuery({ name: 'specialization', required: false })
    @ApiQuery({ name: 'projectType', required: false, enum: ProjectType })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'Template analytics retrieved successfully' })
    async getTemplateAnalytics(
        @Query('specialization') specialization?: string,
        @Query('projectType') projectType?: ProjectType,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const dateRange = startDate && endDate ? {
            start: new Date(startDate),
            end: new Date(endDate),
        } : undefined;

        const analytics = await this.templateAnalyticsService.getTemplateAnalytics(
            specialization,
            projectType,
            dateRange,
        );

        return { analytics };
    }

    @Get('templates/:id/stats')
    @ApiOperation({ summary: 'Get usage statistics for a specific template' })
    @ApiResponse({ status: 200, description: 'Template usage statistics retrieved' })
    async getTemplateUsageStats(@Param('id') templateId: string) {
        const stats = await this.templateAnalyticsService.getTemplateUsageStats(templateId);
        return { stats };
    }

    @Get('recommendations')
    @ApiOperation({ summary: 'Get template recommendations for current user' })
    @ApiQuery({ name: 'specialization', required: true })
    @ApiQuery({ name: 'projectType', required: true, enum: ProjectType })
    @ApiQuery({ name: 'limit', required: false, type: Number })
    @ApiResponse({ status: 200, description: 'Template recommendations retrieved' })
    async getTemplateRecommendations(
        @GetUser() user: User,
        @Query('specialization') specialization: string,
        @Query('projectType') projectType: ProjectType,
        @Query('limit') limit?: number,
    ) {
        const recommendations = await this.templateAnalyticsService.getTemplateRecommendations(
            user.id,
            specialization,
            projectType,
            limit ? parseInt(limit.toString()) : 5,
        );

        return { recommendations };
    }

    @Get('optimization-suggestions')
    @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Get template optimization suggestions (Supervisor/Admin only)' })
    @ApiQuery({ name: 'templateId', required: false })
    @ApiResponse({ status: 200, description: 'Optimization suggestions retrieved' })
    async getOptimizationSuggestions(@Query('templateId') templateId?: string) {
        const suggestions = await this.templateAnalyticsService.getTemplateOptimizationSuggestions(
            templateId,
        );

        return { suggestions };
    }

    @Post('track-usage')
    @Roles(UserRole.STUDENT)
    @UseGuards(RolesGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Track template usage when starting a project (Student only)' })
    @ApiResponse({ status: 200, description: 'Template usage tracked successfully' })
    async trackTemplateUsage(
        @GetUser() user: User,
        @Body() dto: { templateId: string; projectId: string },
    ) {
        const effectiveness = await this.templateAnalyticsService.trackTemplateUsage(
            dto.templateId,
            dto.projectId,
            user.id,
        );

        return {
            message: 'Template usage tracked successfully',
            effectivenessId: effectiveness.id,
        };
    }

    @Post('milestone-progress')
    @Roles(UserRole.STUDENT, UserRole.SUPERVISOR)
    @UseGuards(RolesGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Update milestone progress for analytics (Student/Supervisor only)' })
    @ApiResponse({ status: 200, description: 'Milestone progress updated successfully' })
    async updateMilestoneProgress(@Body() dto: UpdateMilestoneProgressDto) {
        await this.templateAnalyticsService.updateMilestoneProgress(
            dto.projectId,
            dto.milestoneTitle,
            dto.status,
            dto.actualDays,
        );

        return {
            message: 'Milestone progress updated successfully',
        };
    }

    @Post('feedback')
    @Roles(UserRole.STUDENT)
    @UseGuards(RolesGuard)
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Record student feedback for a template (Student only)' })
    @ApiResponse({ status: 200, description: 'Feedback recorded successfully' })
    async recordStudentFeedback(@Body() dto: RecordFeedbackDto) {
        await this.templateAnalyticsService.recordStudentFeedback(
            dto.projectId,
            dto.rating,
            dto.feedback,
            dto.isRecommended,
            dto.difficultyRatings,
        );

        return {
            message: 'Student feedback recorded successfully',
        };
    }

    @Get('dashboard/supervisor')
    @Roles(UserRole.SUPERVISOR)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Get supervisor dashboard analytics (Supervisor only)' })
    @ApiResponse({ status: 200, description: 'Supervisor analytics retrieved' })
    async getSupervisorDashboard(@GetUser() user: User) {
        // Get analytics for templates created by this supervisor
        const analytics = await this.templateAnalyticsService.getTemplateAnalytics();

        // Filter for supervisor's templates (this would need to be implemented based on your data model)
        // For now, return general analytics

        return {
            analytics,
            message: 'Supervisor dashboard analytics retrieved',
        };
    }

    @Get('dashboard/admin')
    @Roles(UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Get admin dashboard analytics (Admin only)' })
    @ApiResponse({ status: 200, description: 'Admin analytics retrieved' })
    async getAdminDashboard() {
        const analytics = await this.templateAnalyticsService.getTemplateAnalytics();
        const suggestions = await this.templateAnalyticsService.getTemplateOptimizationSuggestions();

        return {
            analytics,
            optimizationSuggestions: suggestions.slice(0, 10), // Top 10 suggestions
            message: 'Admin dashboard analytics retrieved',
        };
    }

    @Get('performance-metrics')
    @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
    @UseGuards(RolesGuard)
    @ApiOperation({ summary: 'Get detailed performance metrics (Supervisor/Admin only)' })
    @ApiQuery({ name: 'templateId', required: false })
    @ApiQuery({ name: 'specialization', required: false })
    @ApiQuery({ name: 'startDate', required: false })
    @ApiQuery({ name: 'endDate', required: false })
    @ApiResponse({ status: 200, description: 'Performance metrics retrieved' })
    async getPerformanceMetrics(
        @Query('templateId') templateId?: string,
        @Query('specialization') specialization?: string,
        @Query('startDate') startDate?: string,
        @Query('endDate') endDate?: string,
    ) {
        const dateRange = startDate && endDate ? {
            start: new Date(startDate),
            end: new Date(endDate),
        } : undefined;

        let analytics;
        if (templateId) {
            const stats = await this.templateAnalyticsService.getTemplateUsageStats(templateId);
            analytics = { templateStats: stats };
        } else {
            analytics = await this.templateAnalyticsService.getTemplateAnalytics(
                specialization,
                undefined,
                dateRange,
            );
        }

        return { metrics: analytics };
    }

    @Get('trends')
    @ApiOperation({ summary: 'Get template usage trends' })
    @ApiQuery({ name: 'period', required: false, description: 'Period in days (default: 30)' })
    @ApiResponse({ status: 200, description: 'Usage trends retrieved' })
    async getUsageTrends(@Query('period') period?: string) {
        const days = period ? parseInt(period) : 30;
        const endDate = new Date();
        const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

        const analytics = await this.templateAnalyticsService.getTemplateAnalytics(
            undefined,
            undefined,
            { start: startDate, end: endDate },
        );

        return {
            trends: analytics.usageTrends,
            period: days,
        };
    }
}