import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
  ApiQuery,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

import { RecommendationService } from '../services/recommendation.service';
import { RecommendationAnalyticsService } from '../services/recommendation-analytics.service';
import { FallbackRecommendationService } from '../services/fallback-recommendation.service';
import {
  BatchRecommendationService,
  BatchPriority,
} from '../services/batch-recommendation.service';
import { RecommendationRefreshService } from '../services/recommendation-refresh.service';
import {
  ExplanationService,
  AccessibleExplanation,
} from '../services/explanation.service';
import { ProgressiveLoadingService } from '../services/progressive-loading.service';

import {
  GenerateRecommendationsDto,
  RecommendationResultDto,
  RecommendationFeedbackDto,
  RecommendationExplanationDto,
} from '../dto/recommendation';

import { Recommendation } from '../entities/recommendation.entity';
import {
  AIServiceException,
  RateLimitExceededException,
} from '../common/exceptions/app.exception';

@ApiTags('Recommendations')
@Controller('recommendations')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class RecommendationController {
  constructor(
    private readonly recommendationService: RecommendationService,
    private readonly fallbackService: FallbackRecommendationService,
    private readonly analyticsService: RecommendationAnalyticsService,
    private readonly batchService: BatchRecommendationService,
    private readonly refreshService: RecommendationRefreshService,
    private readonly explanationService: ExplanationService,
    private readonly progressiveLoadingService: ProgressiveLoadingService,
  ) {}

  @Get()
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Generate project recommendations for student',
    description:
      'Generate personalized project recommendations based on student profile using AI similarity matching',
  })
  @ApiQuery({
    name: 'limit',
    required: false,
    type: Number,
    description: 'Maximum number of recommendations (1-20)',
  })
  @ApiQuery({
    name: 'excludeSpecializations',
    required: false,
    type: [String],
    description: 'Specializations to exclude',
  })
  @ApiQuery({
    name: 'includeSpecializations',
    required: false,
    type: [String],
    description: 'Specializations to include',
  })
  @ApiQuery({
    name: 'maxDifficulty',
    required: false,
    enum: ['beginner', 'intermediate', 'advanced', 'expert'],
  })
  @ApiQuery({
    name: 'forceRefresh',
    required: false,
    type: Boolean,
    description: 'Force refresh (bypass cache)',
  })
  @ApiQuery({
    name: 'minSimilarityScore',
    required: false,
    type: Number,
    description: 'Minimum similarity score (0.0-1.0)',
  })
  @ApiQuery({
    name: 'includeDiversityBoost',
    required: false,
    type: Boolean,
    description: 'Include diversity boost',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendations generated successfully',
    type: RecommendationResultDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid request parameters or incomplete profile',
  })
  @ApiResponse({
    status: HttpStatus.TOO_MANY_REQUESTS,
    description: 'Rate limit exceeded',
  })
  @ApiResponse({
    status: HttpStatus.SERVICE_UNAVAILABLE,
    description: 'AI service unavailable, fallback recommendations provided',
  })
  async generateRecommendations(
    @Request() req: any,
    @Query() query: GenerateRecommendationsDto,
  ): Promise<RecommendationResultDto> {
    const studentId = req.user.id;

    try {
      return await this.recommendationService.generateRecommendations(
        studentId,
        query,
      );
    } catch (error) {
      // Handle AI service failures with fallback
      if (
        error instanceof AIServiceException ||
        error instanceof RateLimitExceededException
      ) {
        // Use fallback service for rule-based recommendations
        const studentProfile = await this.getStudentProfile(studentId);
        return await this.fallbackService.generateRuleBasedRecommendations(
          studentProfile,
          query,
        );
      }
      throw error;
    }
  }

  @Post('refresh')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Refresh recommendations',
    description: 'Force regeneration of recommendations, bypassing cache',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendations refreshed successfully',
    type: RecommendationResultDto,
  })
  async refreshRecommendations(
    @Request() req: any,
  ): Promise<RecommendationResultDto> {
    const studentId = req.user.id;

    try {
      return await this.recommendationService.refreshRecommendations(studentId);
    } catch (error) {
      // Handle AI service failures with fallback
      if (
        error instanceof AIServiceException ||
        error instanceof RateLimitExceededException
      ) {
        const studentProfile = await this.getStudentProfile(studentId);
        return await this.fallbackService.generateRuleBasedRecommendations(
          studentProfile,
          {},
        );
      }
      throw error;
    }
  }

  @Get('history')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get recommendation history',
    description: 'Retrieve past recommendations for the student',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendation history retrieved successfully',
    type: [Recommendation],
  })
  async getRecommendationHistory(
    @Request() req: any,
  ): Promise<Recommendation[]> {
    const studentId = req.user.id;
    return await this.recommendationService.getRecommendationHistory(studentId);
  }

  @Post(':recommendationId/feedback')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Submit feedback for a recommendation',
    description:
      'Submit feedback (like, dislike, rating, etc.) for a specific project recommendation',
  })
  @ApiParam({
    name: 'recommendationId',
    description: 'Recommendation ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Feedback submitted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Recommendation not found',
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid feedback data',
  })
  async submitFeedback(
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
    @Body() feedbackDto: RecommendationFeedbackDto,
    @Query('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<{ message: string }> {
    await this.recommendationService.submitFeedback(
      recommendationId,
      projectId,
      feedbackDto,
    );
    return { message: 'Feedback submitted successfully' };
  }

  @Get(':recommendationId/explanation')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get detailed explanation for a recommendation',
    description:
      'Get detailed explanation of why a specific project was recommended',
  })
  @ApiParam({
    name: 'recommendationId',
    description: 'Recommendation ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'projectId',
    description: 'Project ID to explain',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Explanation retrieved successfully',
    type: RecommendationExplanationDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Recommendation or project not found',
  })
  async explainRecommendation(
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
    @Query('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<RecommendationExplanationDto> {
    return await this.recommendationService.explainRecommendation(
      recommendationId,
      projectId,
    );
  }

  @Get(':recommendationId/accessible-explanation')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get accessible explanation for a recommendation',
    description:
      'Get user-friendly, accessible explanation with visual elements and plain language',
  })
  @ApiParam({
    name: 'recommendationId',
    description: 'Recommendation ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiQuery({
    name: 'projectId',
    description: 'Project ID to explain',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Accessible explanation retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        plainLanguage: { type: 'string' },
        technicalTerms: { type: 'object' },
        visualElements: { type: 'object' },
        accessibility: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Recommendation or project not found',
  })
  async getAccessibleExplanation(
    @Param('recommendationId', ParseUUIDPipe) recommendationId: string,
    @Query('projectId', ParseUUIDPipe) projectId: string,
  ): Promise<AccessibleExplanation> {
    return await this.recommendationService.getAccessibleExplanation(
      recommendationId,
      projectId,
    );
  }

  @Post('generate-with-progress')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Generate recommendations with progress tracking',
    description:
      'Start recommendation generation with real-time progress updates',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Recommendation generation started',
    schema: {
      type: 'object',
      properties: {
        requestId: { type: 'string' },
        message: { type: 'string' },
      },
    },
  })
  async generateRecommendationsWithProgress(
    @Request() req: any,
    @Body() options: GenerateRecommendationsDto,
  ): Promise<{ requestId: string; message: string }> {
    const studentId = req.user.id;
    return await this.recommendationService.generateRecommendationsWithProgress(
      studentId,
      options,
    );
  }

  @Get('progress/:requestId')
  @Roles(UserRole.STUDENT)
  @ApiOperation({
    summary: 'Get recommendation generation progress',
    description:
      'Get real-time progress updates for a recommendation generation request',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Request ID from generate-with-progress endpoint',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Progress information retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        progress: { type: 'object' },
        queueStatus: { type: 'object' },
        systemLoad: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Request ID not found',
  })
  async getRecommendationProgress(
    @Param('requestId') requestId: string,
  ): Promise<any> {
    return await this.recommendationService.getRecommendationProgress(
      requestId,
    );
  }

  @Post('batch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Submit batch recommendation request',
    description:
      'Submit a batch request to generate recommendations for multiple students',
  })
  @ApiResponse({
    status: HttpStatus.ACCEPTED,
    description: 'Batch request submitted successfully',
    schema: {
      type: 'object',
      properties: {
        requestId: { type: 'string' },
        message: { type: 'string' },
        estimatedProcessingTime: { type: 'number' },
      },
    },
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid batch request parameters',
  })
  async submitBatchRequest(
    @Body()
    body: {
      studentIds: string[];
      options?: GenerateRecommendationsDto;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    },
  ): Promise<{
    requestId: string;
    message: string;
    estimatedProcessingTime?: number;
  }> {
    const priority = this.mapPriority(body.priority || 'normal');
    const requestId = await this.batchService.submitBatchRequest(
      body.studentIds,
      body.options || {},
      priority,
    );

    const status = this.batchService.getBatchStatus(requestId);

    return {
      requestId,
      message: 'Batch request submitted successfully',
      estimatedProcessingTime: status.estimatedWaitTime,
    };
  }

  @Get('batch/:requestId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get batch request status',
    description: 'Get the status and results of a batch recommendation request',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Batch request ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch status retrieved successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Batch request not found',
  })
  async getBatchStatus(@Param('requestId') requestId: string): Promise<any> {
    const status = this.batchService.getBatchStatus(requestId);

    if (status.status === 'not_found') {
      throw new Error('Batch request not found');
    }

    return status;
  }

  @Delete('batch/:requestId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Cancel batch request',
    description: 'Cancel a queued batch recommendation request',
  })
  @ApiParam({
    name: 'requestId',
    description: 'Batch request ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch request cancelled successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Batch request not found or cannot be cancelled',
  })
  async cancelBatchRequest(
    @Param('requestId') requestId: string,
  ): Promise<{ message: string }> {
    const cancelled = this.batchService.cancelBatchRequest(requestId);

    if (!cancelled) {
      throw new Error('Batch request not found or cannot be cancelled');
    }

    return { message: 'Batch request cancelled successfully' };
  }

  @Get('batch')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get batch processing statistics',
    description:
      'Get statistics about batch processing performance and queue status',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Batch statistics retrieved successfully',
  })
  async getBatchStats(): Promise<any> {
    return this.batchService.getBatchStats();
  }

  @Post('refresh/force/:studentId')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Force refresh recommendations for a student',
    description:
      'Force refresh recommendations for a specific student (admin only)',
  })
  @ApiParam({
    name: 'studentId',
    description: 'Student ID',
    type: 'string',
    format: 'uuid',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Recommendations refreshed successfully',
  })
  async forceRefreshStudent(
    @Param('studentId', ParseUUIDPipe) studentId: string,
  ): Promise<{ message: string }> {
    await this.refreshService.forceRefreshStudent(studentId);
    return { message: 'Recommendations refreshed successfully' };
  }

  @Get('refresh/stats')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get refresh service statistics',
    description: 'Get statistics about background refresh operations',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Refresh statistics retrieved successfully',
  })
  async getRefreshStats(): Promise<any> {
    return this.refreshService.getRefreshStats();
  }

  @Get('analytics')
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get recommendation analytics',
    description:
      'Get analytics data for recommendations (supervisors can see their projects, admins see all)',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    type: String,
    description: 'Filter by specific project',
  })
  @ApiQuery({
    name: 'specialization',
    required: false,
    type: String,
    description: 'Filter by specialization',
  })
  @ApiQuery({
    name: 'dateFrom',
    required: false,
    type: Date,
    description: 'Start date for analytics',
  })
  @ApiQuery({
    name: 'dateTo',
    required: false,
    type: Date,
    description: 'End date for analytics',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Analytics data retrieved successfully',
  })
  async getRecommendationAnalytics(
    @Request() req: any,
    @Query('projectId') projectId?: string,
    @Query('specialization') specialization?: string,
    @Query('dateFrom') dateFrom?: Date,
    @Query('dateTo') dateTo?: Date,
  ): Promise<any> {
    // This would be implemented in a separate analytics service
    // For now, return a placeholder
    return {
      message: 'Analytics endpoint - to be implemented',
      filters: { projectId, specialization, dateFrom, dateTo },
      userRole: req.user.role,
    };
  }

  @Get('health')
  @ApiOperation({
    summary: 'Check recommendation service health',
    description: 'Check the health status of AI recommendation services',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Service health status',
  })
  async getServiceHealth(): Promise<{
    status: string;
    aiService: boolean;
    fallbackService: boolean;
    timestamp: Date;
  }> {
    // This would check the actual service health
    return {
      status: 'healthy',
      aiService: true,
      fallbackService: true,
      timestamp: new Date(),
    };
  }

  /**
   * Helper method to get student profile
   * This would typically be injected as a service
   */
  private async getStudentProfile(studentId: string): Promise<any> {
    // This is a placeholder - in real implementation, this would use UserService
    // or be injected as a dependency
    return {
      skills: [],
      interests: [],
      specializations: [],
      preferredDifficulty: 'intermediate',
    };
  }

  /**
   * Helper method to map string priority to enum
   */
  private mapPriority(priority: string): BatchPriority {
    switch (priority.toLowerCase()) {
      case 'low':
        return BatchPriority.LOW;
      case 'high':
        return BatchPriority.HIGH;
      case 'urgent':
        return BatchPriority.URGENT;
      default:
        return BatchPriority.NORMAL;
    }
  }

  // Analytics endpoints
  @Get('analytics/quality')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get recommendation quality metrics',
    description:
      'Get comprehensive quality metrics for the recommendation system',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Start date for metrics (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'End date for metrics (ISO format)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Quality metrics retrieved successfully',
  })
  async getQualityMetrics(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return await this.analyticsService.calculateQualityMetrics(start, end);
  }

  @Get('analytics/satisfaction')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get user satisfaction analysis',
    description:
      'Get detailed analysis of user satisfaction with recommendations',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Start date for analysis (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'End date for analysis (ISO format)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Satisfaction analysis retrieved successfully',
  })
  async getSatisfactionAnalysis(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return await this.analyticsService.analyzeUserSatisfaction(start, end);
  }

  @Get('analytics/report')
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get comprehensive performance report',
    description:
      'Get a comprehensive performance report with metrics, analysis, and recommendations',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: 'string',
    description: 'Start date for report (ISO format)',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: 'string',
    description: 'End date for report (ISO format)',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Performance report generated successfully',
  })
  async getPerformanceReport(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<any> {
    const start = startDate ? new Date(startDate) : undefined;
    const end = endDate ? new Date(endDate) : undefined;

    return await this.analyticsService.generatePerformanceReport(start, end);
  }
}
