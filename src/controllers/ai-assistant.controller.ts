import {
  Controller,
  Post,
  Get,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpStatus,
  ParseUUIDPipe,
  ValidationPipe,
  UsePipes,
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
import { ConversationService } from '../services/conversation.service';
import { MessageManagementService } from '../services/message-management.service';
import { AIResponseGenerationService } from '../services/ai-response-generation.service';
import { KnowledgeBaseService } from '../services/knowledge-base.service';
import { ContextService } from '../services/context.service';
import { SupervisorAIMonitoringService } from '../services/supervisor-ai-monitoring.service';
import { AdminKnowledgeManagementService } from '../services/admin-knowledge-management.service';
import { ProjectContextIntegrationService } from '../services/project-context-integration.service';
import { MilestoneGuidanceService } from '../services/milestone-guidance.service';
import {
  CreateConversationDto,
  ConversationResponseDto,
  AskQuestionDto,
  AssistantResponseDto,
  ConversationSearchDto,
  StudentInteractionsOverviewDto,
  CommonQuestionsAnalysisDto,
  EscalationsOverviewDto,
  SupervisorMonitoringFiltersDto,
  CreateKnowledgeEntryDto,
  UpdateKnowledgeEntryDto,
  KnowledgeEntryResponseDto,
  CreateResponseTemplateDto,
  UpdateResponseTemplateDto,
  ResponseTemplateResponseDto,
  AdminContentFiltersDto,
  MilestoneDeadlineAwarenessDto,
  PriorityGuidanceDto,
  ProactiveSuggestionDto,
  TimelineAnalysisDto,
  MilestoneGuidanceQueryDto,
  MilestoneSpecificGuidanceDto,
  ComprehensiveMilestoneGuidanceDto,
} from '../dto/ai-assistant';
import { KnowledgeBaseContentAnalyticsDto } from '../dto/admin/knowledge-base.dto';
import { SearchKnowledgeDto } from '../dto/knowledge';
import {
  BookmarkMessageDto,
  RateMessageDto,
  MessageResponseDto,
  MessageSearchDto,
} from '../dto/message';
import { ConversationStatus, UserRole } from '../common/enums';

@ApiTags('AI Assistant')
@Controller('ai-assistant')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
@UsePipes(new ValidationPipe({ transform: true, whitelist: true }))
export class AIAssistantController {
  constructor(
    private readonly conversationService: ConversationService,
    private readonly messageService: MessageManagementService,
    private readonly aiResponseService: AIResponseGenerationService,
    private readonly knowledgeService: KnowledgeBaseService,
    private readonly contextService: ContextService,
    private readonly supervisorMonitoringService: SupervisorAIMonitoringService,
    private readonly adminKnowledgeService: AdminKnowledgeManagementService,
    private readonly projectContextService: ProjectContextIntegrationService,
    private readonly milestoneGuidanceService: MilestoneGuidanceService,
  ) {}

  // ===== Conversation Management Endpoints =====

  @Post('conversations')
  @ApiOperation({
    summary: 'Create a new conversation',
    description:
      'Creates a new AI assistant conversation for the authenticated student',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Conversation created successfully',
    type: ConversationResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid input or conversation limit exceeded',
  })
  async createConversation(
    @Request() req: any,
    @Body() createDto: CreateConversationDto,
  ): Promise<ConversationResponseDto> {
    const conversation = await this.conversationService.createConversation({
      studentId: req.user.id,
      title: createDto.title,
      projectId: createDto.projectId,
      language: createDto.language,
      initialQuery: createDto.initialQuery,
    });

    return this.mapConversationToDto(conversation);
  }

  @Get('conversations')
  @ApiOperation({
    summary: 'Get user conversations',
    description:
      'Retrieves all conversations for the authenticated student with optional filtering',
  })
  @ApiQuery({ name: 'status', enum: ConversationStatus, required: false })
  @ApiQuery({ name: 'projectId', type: String, required: false })
  @ApiQuery({ name: 'language', type: String, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 20 })
  @ApiQuery({ name: 'offset', type: Number, required: false, example: 0 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Conversations retrieved successfully',
    type: [ConversationResponseDto],
  })
  async getConversations(
    @Request() req: any,
    @Query('status') status?: ConversationStatus,
    @Query('projectId') projectId?: string,
    @Query('language') language?: string,
    @Query('search') search?: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{
    conversations: ConversationResponseDto[];
    total: number;
    hasMore: boolean;
  }> {
    const result = await this.conversationService.searchConversations({
      studentId: req.user.id,
      status,
      projectId,
      language,
      search,
      limit: limit || 20,
      offset: offset || 0,
      sortBy: 'lastMessageAt',
      sortOrder: 'DESC',
    });

    const conversationDtos = result.conversations.map((conv) =>
      this.mapConversationToDto(conv),
    );

    return {
      conversations: conversationDtos,
      total: result.total,
      hasMore: (offset || 0) + conversationDtos.length < result.total,
    };
  }

  @Get('conversations/:id/messages')
  @ApiOperation({
    summary: 'Get conversation messages',
    description: 'Retrieves message history for a specific conversation',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 50 })
  @ApiQuery({ name: 'offset', type: Number, required: false, example: 0 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Messages retrieved successfully',
    type: [MessageResponseDto],
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Conversation not found',
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Access denied to conversation',
  })
  async getConversationMessages(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) conversationId: string,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{
    messages: MessageResponseDto[];
    total: number;
    hasMore: boolean;
  }> {
    // Verify conversation ownership
    const conversation =
      await this.conversationService.getConversationById(conversationId);
    if (conversation.studentId !== req.user.id) {
      throw new Error('Access denied to conversation');
    }

    const searchDto: MessageSearchDto = {
      conversationId,
      limit: limit || 50,
      offset: offset || 0,
      sortBy: 'createdAt',
      sortOrder: 'ASC',
    };

    const result = await this.messageService.searchMessages(
      req.user.id,
      searchDto,
    );

    return {
      messages: result.messages,
      total: result.total,
      hasMore: result.hasMore,
    };
  }

  @Get('conversations/:id/context')
  @ApiOperation({
    summary: 'Get conversation context',
    description: 'Retrieves the current context information for a conversation',
  })
  @ApiParam({ name: 'id', description: 'Conversation ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Context retrieved successfully',
  })
  async getConversationContext(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) conversationId: string,
  ): Promise<any> {
    // Verify conversation ownership
    const conversation =
      await this.conversationService.getConversationById(conversationId);
    if (conversation.studentId !== req.user.id) {
      throw new Error('Access denied to conversation');
    }

    const context =
      await this.contextService.buildConversationContext(conversationId);
    return context;
  }

  // ===== Q&A and Interaction Endpoints =====

  @Post('ask')
  @ApiOperation({
    summary: 'Ask AI assistant a question',
    description:
      'Submits a question to the AI assistant and receives an intelligent response',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Question processed successfully',
    type: AssistantResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.BAD_REQUEST,
    description: 'Invalid question or conversation not found',
  })
  async askQuestion(
    @Request() req: any,
    @Body() askDto: AskQuestionDto,
  ): Promise<AssistantResponseDto> {
    const response = await this.aiResponseService.generateResponse({
      query: askDto.query,
      conversationId: askDto.conversationId || '',
      userId: req.user.id,
      language: askDto.language,
      includeProjectContext: askDto.includeProjectContext,
    });

    return {
      response: response.response,
      confidenceScore: response.confidenceScore,
      sources: response.sources,
      conversationId: askDto.conversationId || '',
      messageId: '', // Will be set by the service
      fromAI: true,
      suggestedFollowUps: response.suggestedFollowUps,
      escalationSuggestion: response.requiresHumanReview
        ? 'This response may benefit from human review. Consider contacting your supervisor.'
        : undefined,
      metadata: {
        processingTime: response.metadata.processingTime || 0,
        language: response.metadata.language || 'en',
        category: response.metadata.category || 'general',
        requiresHumanReview: response.metadata.requiresHumanReview,
      },
    };
  }

  @Post('messages/:id/bookmark')
  @ApiOperation({
    summary: 'Bookmark a message',
    description:
      'Saves an important AI assistant response for future reference',
  })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message bookmarked successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Message not found',
  })
  async bookmarkMessage(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) messageId: string,
    @Body() bookmarkDto: Omit<BookmarkMessageDto, 'messageId'>,
  ): Promise<MessageResponseDto> {
    return this.messageService.bookmarkMessage(req.user.id, {
      messageId,
      note: bookmarkDto.note,
    });
  }

  @Post('messages/:id/rate')
  @ApiOperation({
    summary: 'Rate a message',
    description: 'Provides quality feedback on an AI assistant response',
  })
  @ApiParam({ name: 'id', description: 'Message ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Message rated successfully',
    type: MessageResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Message not found',
  })
  async rateMessage(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) messageId: string,
    @Body() rateDto: Omit<RateMessageDto, 'messageId'>,
  ): Promise<MessageResponseDto> {
    return this.messageService.rateMessage(req.user.id, {
      messageId,
      rating: rateDto.rating,
      feedback: rateDto.feedback,
    });
  }

  // ===== Search and Knowledge Base Endpoints =====

  @Get('knowledge/search')
  @ApiOperation({
    summary: 'Search knowledge base',
    description: 'Searches the knowledge base for relevant content',
  })
  @ApiQuery({ name: 'query', type: String, required: true })
  @ApiQuery({ name: 'category', type: String, required: false })
  @ApiQuery({ name: 'language', type: String, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 10 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Knowledge base search completed',
  })
  async searchKnowledge(
    @Query('query') query: string,
    @Query('category') category?: string,
    @Query('language') language?: string,
    @Query('limit') limit?: number,
  ): Promise<any> {
    const searchDto: SearchKnowledgeDto = {
      query,
      category,
      language,
      limit: limit || 10,
      offset: 0,
    };

    return this.knowledgeService.searchKnowledge(searchDto);
  }

  @Get('messages/bookmarked')
  @ApiOperation({
    summary: 'Get bookmarked messages',
    description: 'Retrieves all bookmarked messages for the authenticated user',
  })
  @ApiQuery({ name: 'limit', type: Number, required: false, example: 50 })
  @ApiQuery({ name: 'offset', type: Number, required: false, example: 0 })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Bookmarked messages retrieved successfully',
    type: [MessageResponseDto],
  })
  async getBookmarkedMessages(
    @Request() req: any,
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
  ): Promise<{
    messages: MessageResponseDto[];
    total: number;
    hasMore: boolean;
  }> {
    const result = await this.messageService.getBookmarkedMessages(
      req.user.id,
      limit || 50,
      offset || 0,
    );

    return result;
  }

  // ===== Supervisor Monitoring Endpoints =====

  @Get('supervisor/student-interactions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get student interactions overview',
    description:
      'Provides comprehensive overview of AI assistant interactions for supervised students',
  })
  @ApiQuery({ name: 'studentId', type: String, required: false })
  @ApiQuery({ name: 'projectId', type: String, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'escalatedOnly', type: Boolean, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Student interactions overview retrieved successfully',
    type: StudentInteractionsOverviewDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only supervisors and admins can access this endpoint',
  })
  async getStudentInteractions(
    @Request() req: any,
    @Query() filters: SupervisorMonitoringFiltersDto,
  ): Promise<StudentInteractionsOverviewDto> {
    return this.supervisorMonitoringService.getStudentInteractionsOverview(
      req.user.id,
      filters,
    );
  }

  @Get('supervisor/common-questions')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get common questions analysis',
    description:
      'Analyzes common questions from supervised students to identify support needs and knowledge gaps',
  })
  @ApiQuery({ name: 'studentId', type: String, required: false })
  @ApiQuery({ name: 'projectId', type: String, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'minConfidence', type: Number, required: false })
  @ApiQuery({ name: 'maxConfidence', type: Number, required: false })
  @ApiQuery({ name: 'lowRatedOnly', type: Boolean, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Common questions analysis retrieved successfully',
    type: CommonQuestionsAnalysisDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only supervisors and admins can access this endpoint',
  })
  async getCommonQuestions(
    @Request() req: any,
    @Query() filters: SupervisorMonitoringFiltersDto,
  ): Promise<CommonQuestionsAnalysisDto> {
    return this.supervisorMonitoringService.getCommonQuestionsAnalysis(
      req.user.id,
      filters,
    );
  }

  @Get('supervisor/escalations')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPERVISOR, UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get escalated conversations',
    description:
      'Retrieves conversations that have been flagged for supervisor attention',
  })
  @ApiQuery({ name: 'studentId', type: String, required: false })
  @ApiQuery({ name: 'projectId', type: String, required: false })
  @ApiQuery({ name: 'startDate', type: String, required: false })
  @ApiQuery({ name: 'endDate', type: String, required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Escalated conversations retrieved successfully',
    type: EscalationsOverviewDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only supervisors and admins can access this endpoint',
  })
  async getEscalations(
    @Request() req: any,
    @Query() filters: SupervisorMonitoringFiltersDto,
  ): Promise<EscalationsOverviewDto> {
    return this.supervisorMonitoringService.getEscalationsOverview(
      req.user.id,
      filters,
    );
  }

  // ===== Admin Knowledge Base Management Endpoints =====

  @Post('admin/knowledge')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create knowledge base entry',
    description:
      'Creates a new knowledge base entry for AI assistant responses',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Knowledge entry created successfully',
    type: KnowledgeEntryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only admins can create knowledge entries',
  })
  async createKnowledgeEntry(
    @Request() req: any,
    @Body() createDto: CreateKnowledgeEntryDto,
  ): Promise<KnowledgeEntryResponseDto> {
    return this.adminKnowledgeService.createKnowledgeEntry(
      req.user.id,
      createDto,
    );
  }

  @Get('admin/knowledge')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get knowledge base entries',
    description:
      'Retrieves knowledge base entries with filtering and pagination',
  })
  @ApiQuery({ name: 'category', type: String, required: false })
  @ApiQuery({ name: 'language', type: String, required: false })
  @ApiQuery({
    name: 'contentType',
    enum: ['guideline', 'template', 'example', 'faq', 'policy'],
    required: false,
  })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'sortBy', type: String, required: false })
  @ApiQuery({ name: 'sortOrder', enum: ['ASC', 'DESC'], required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Knowledge entries retrieved successfully',
  })
  async getKnowledgeEntries(
    @Request() req: any,
    @Query() filters: AdminContentFiltersDto,
  ): Promise<{
    entries: KnowledgeEntryResponseDto[];
    total: number;
    hasMore: boolean;
  }> {
    return this.adminKnowledgeService.getKnowledgeEntries(req.user.id, filters);
  }

  @Get('admin/knowledge/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get knowledge base entry',
    description: 'Retrieves a specific knowledge base entry by ID',
  })
  @ApiParam({ name: 'id', description: 'Knowledge entry ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Knowledge entry retrieved successfully',
    type: KnowledgeEntryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Knowledge entry not found',
  })
  async getKnowledgeEntry(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) entryId: string,
  ): Promise<KnowledgeEntryResponseDto> {
    return this.adminKnowledgeService.getKnowledgeEntry(req.user.id, entryId);
  }

  @Put('admin/knowledge/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update knowledge base entry',
    description: 'Updates an existing knowledge base entry',
  })
  @ApiParam({ name: 'id', description: 'Knowledge entry ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Knowledge entry updated successfully',
    type: KnowledgeEntryResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Knowledge entry not found',
  })
  async updateKnowledgeEntry(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) entryId: string,
    @Body() updateDto: UpdateKnowledgeEntryDto,
  ): Promise<KnowledgeEntryResponseDto> {
    return this.adminKnowledgeService.updateKnowledgeEntry(
      req.user.id,
      entryId,
      updateDto,
    );
  }

  @Delete('admin/knowledge/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete knowledge base entry',
    description: 'Deletes a knowledge base entry',
  })
  @ApiParam({ name: 'id', description: 'Knowledge entry ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Knowledge entry deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Knowledge entry not found',
  })
  async deleteKnowledgeEntry(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) entryId: string,
  ): Promise<void> {
    return this.adminKnowledgeService.deleteKnowledgeEntry(
      req.user.id,
      entryId,
    );
  }

  @Post('admin/templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Create response template',
    description: 'Creates a new response template for fallback responses',
  })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'Response template created successfully',
    type: ResponseTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only admins can create response templates',
  })
  async createResponseTemplate(
    @Request() req: any,
    @Body() createDto: CreateResponseTemplateDto,
  ): Promise<ResponseTemplateResponseDto> {
    return this.adminKnowledgeService.createResponseTemplate(
      req.user.id,
      createDto,
    );
  }

  @Get('admin/templates')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get response templates',
    description: 'Retrieves response templates with filtering and pagination',
  })
  @ApiQuery({ name: 'category', type: String, required: false })
  @ApiQuery({ name: 'language', type: String, required: false })
  @ApiQuery({ name: 'isActive', type: Boolean, required: false })
  @ApiQuery({ name: 'search', type: String, required: false })
  @ApiQuery({ name: 'sortBy', type: String, required: false })
  @ApiQuery({ name: 'sortOrder', enum: ['ASC', 'DESC'], required: false })
  @ApiQuery({ name: 'limit', type: Number, required: false })
  @ApiQuery({ name: 'offset', type: Number, required: false })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response templates retrieved successfully',
  })
  async getResponseTemplates(
    @Request() req: any,
    @Query() filters: AdminContentFiltersDto,
  ): Promise<{
    templates: ResponseTemplateResponseDto[];
    total: number;
    hasMore: boolean;
  }> {
    return this.adminKnowledgeService.getResponseTemplates(
      req.user.id,
      filters,
    );
  }

  @Get('admin/templates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get response template',
    description: 'Retrieves a specific response template by ID',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response template retrieved successfully',
    type: ResponseTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Response template not found',
  })
  async getResponseTemplate(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) templateId: string,
  ): Promise<ResponseTemplateResponseDto> {
    return this.adminKnowledgeService.getResponseTemplate(
      req.user.id,
      templateId,
    );
  }

  @Put('admin/templates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Update response template',
    description: 'Updates an existing response template',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Response template updated successfully',
    type: ResponseTemplateResponseDto,
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Response template not found',
  })
  async updateResponseTemplate(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) templateId: string,
    @Body() updateDto: UpdateResponseTemplateDto,
  ): Promise<ResponseTemplateResponseDto> {
    return this.adminKnowledgeService.updateResponseTemplate(
      req.user.id,
      templateId,
      updateDto,
    );
  }

  @Delete('admin/templates/:id')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Delete response template',
    description: 'Deletes a response template',
  })
  @ApiParam({ name: 'id', description: 'Template ID' })
  @ApiResponse({
    status: HttpStatus.NO_CONTENT,
    description: 'Response template deleted successfully',
  })
  @ApiResponse({
    status: HttpStatus.NOT_FOUND,
    description: 'Response template not found',
  })
  async deleteResponseTemplate(
    @Request() req: any,
    @Param('id', ParseUUIDPipe) templateId: string,
  ): Promise<void> {
    return this.adminKnowledgeService.deleteResponseTemplate(
      req.user.id,
      templateId,
    );
  }

  @Get('admin/analytics')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  @ApiOperation({
    summary: 'Get content analytics',
    description:
      'Retrieves comprehensive analytics about knowledge base and template usage',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Content analytics retrieved successfully',
    type: KnowledgeBaseContentAnalyticsDto,
  })
  @ApiResponse({
    status: HttpStatus.FORBIDDEN,
    description: 'Only admins can access content analytics',
  })
  async getContentAnalytics(
    @Request() req: any,
  ): Promise<KnowledgeBaseContentAnalyticsDto> {
    return this.adminKnowledgeService.getContentAnalytics(req.user.id);
  }

  // ===== Helper Methods =====

  private mapConversationToDto(conversation: any): ConversationResponseDto {
    return {
      id: conversation.id,
      studentId: conversation.studentId,
      title: conversation.title,
      status: conversation.status,
      projectId: conversation.projectId,
      language: conversation.language,
      messageCount: conversation.messages?.length || 0,
      messages: conversation.messages?.slice(-5).map((msg: any) => ({
        id: msg.id,
        conversationId: msg.conversationId,
        type: msg.type,
        content: msg.content,
        metadata: msg.metadata,
        confidenceScore: msg.confidenceScore,
        sources: msg.sources || [],
        isBookmarked: msg.isBookmarked,
        status: msg.status,
        averageRating: msg.averageRating || 0,
        ratingCount: msg.ratingCount || 0,
        createdAt: msg.createdAt,
      })),
      context: conversation.context,
      createdAt: conversation.createdAt,
      updatedAt: conversation.updatedAt,
      lastMessageAt: conversation.lastMessageAt,
    };
  }

  // ===== Milestone Guidance Endpoints =====

  @Get('milestone-guidance/deadline-awareness')
  @ApiOperation({
    summary: 'Get milestone deadline awareness',
    description:
      'Retrieve deadline awareness and urgency guidance for upcoming milestones',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone deadline awareness retrieved successfully',
    type: [MilestoneDeadlineAwarenessDto],
  })
  async getMilestoneDeadlineAwareness(
    @Request() req: any,
  ): Promise<MilestoneDeadlineAwarenessDto[]> {
    return await this.milestoneGuidanceService.generateMilestoneDeadlineAwareness(
      req.user.id,
    );
  }

  @Get('milestone-guidance/priority-guidance')
  @ApiOperation({
    summary: 'Get priority guidance for milestones',
    description: 'Retrieve priority guidance for overdue and urgent milestones',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Priority guidance retrieved successfully',
    type: [PriorityGuidanceDto],
  })
  async getMilestonePriorityGuidance(
    @Request() req: any,
  ): Promise<PriorityGuidanceDto[]> {
    return await this.milestoneGuidanceService.generatePriorityGuidance(
      req.user.id,
    );
  }

  @Get('milestone-guidance/proactive-suggestions')
  @ApiOperation({
    summary: 'Get proactive milestone suggestions',
    description:
      'Retrieve proactive suggestions based on project timeline and milestones',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Proactive suggestions retrieved successfully',
    type: [ProactiveSuggestionDto],
  })
  async getProactiveSuggestions(
    @Request() req: any,
  ): Promise<ProactiveSuggestionDto[]> {
    return await this.milestoneGuidanceService.generateProactiveSuggestions(
      req.user.id,
    );
  }

  @Get('milestone-guidance/timeline-analysis')
  @ApiOperation({
    summary: 'Get project timeline analysis',
    description:
      'Analyze project timeline and identify critical issues and bottlenecks',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Specific project ID to analyze',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Timeline analysis retrieved successfully',
    type: TimelineAnalysisDto,
  })
  async getTimelineAnalysis(
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ): Promise<TimelineAnalysisDto> {
    return await this.milestoneGuidanceService.analyzeProjectTimeline(
      req.user.id,
      projectId,
    );
  }

  @Get('milestone-guidance/comprehensive')
  @ApiOperation({
    summary: 'Get comprehensive milestone guidance',
    description:
      'Retrieve all milestone guidance information in a single response',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Comprehensive milestone guidance retrieved successfully',
    type: ComprehensiveMilestoneGuidanceDto,
  })
  async getComprehensiveMilestoneGuidance(
    @Request() req: any,
    @Query() queryDto: MilestoneGuidanceQueryDto,
  ): Promise<ComprehensiveMilestoneGuidanceDto> {
    const userId = req.user.id;
    const results: ComprehensiveMilestoneGuidanceDto = {
      deadlineAwareness: [],
      priorityGuidance: [],
      proactiveSuggestions: [],
      timelineAnalysis: {} as TimelineAnalysisDto,
    };

    // Get deadline awareness if requested
    if (queryDto.includeDeadlineAwareness) {
      results.deadlineAwareness =
        await this.milestoneGuidanceService.generateMilestoneDeadlineAwareness(
          userId,
        );
    }

    // Get priority guidance if requested
    if (queryDto.includePriorityGuidance) {
      results.priorityGuidance =
        await this.milestoneGuidanceService.generatePriorityGuidance(userId);
    }

    // Get proactive suggestions if requested
    if (queryDto.includeProactiveSuggestions) {
      results.proactiveSuggestions =
        await this.milestoneGuidanceService.generateProactiveSuggestions(
          userId,
        );
    }

    // Get timeline analysis if requested
    if (queryDto.includeTimelineAnalysis) {
      results.timelineAnalysis =
        await this.milestoneGuidanceService.analyzeProjectTimeline(
          userId,
          queryDto.projectId,
        );
    }

    return results;
  }

  @Get('milestone-guidance/:milestoneId/specific')
  @ApiOperation({
    summary: 'Get milestone-specific guidance',
    description:
      'Retrieve specific guidance for a particular milestone based on context',
  })
  @ApiParam({
    name: 'milestoneId',
    description: 'Milestone ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone-specific guidance retrieved successfully',
    type: [String],
  })
  async getMilestoneSpecificGuidance(
    @Param('milestoneId', ParseUUIDPipe) milestoneId: string,
    @Query() contextDto: MilestoneSpecificGuidanceDto,
  ): Promise<string[]> {
    return await this.milestoneGuidanceService.getMilestoneSpecificGuidance(
      milestoneId,
      contextDto.context,
    );
  }

  @Get('project-context/enhanced')
  @ApiOperation({
    summary: 'Get enhanced project context',
    description: 'Retrieve enhanced project context with milestone integration',
  })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Specific project ID to get context for',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Enhanced project context retrieved successfully',
  })
  async getEnhancedProjectContext(
    @Request() req: any,
    @Query('projectId') projectId?: string,
  ) {
    return await this.projectContextService.getEnhancedProjectContext(
      req.user.id,
      projectId,
    );
  }

  @Get('project-context/milestone-aware-guidance')
  @ApiOperation({
    summary: 'Get milestone-aware guidance',
    description: 'Retrieve milestone-aware guidance for AI responses',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Milestone-aware guidance retrieved successfully',
  })
  async getMilestoneAwareGuidance(@Request() req: any) {
    return await this.projectContextService.generateMilestoneAwareGuidance(
      req.user.id,
    );
  }

  @Post('project-context/integrate/:conversationId')
  @ApiOperation({
    summary: 'Integrate project context into conversation',
    description:
      'Integrate enhanced project context into a specific conversation',
  })
  @ApiParam({
    name: 'conversationId',
    description: 'Conversation ID',
    type: 'string',
  })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Project context integrated successfully',
  })
  async integrateProjectContextIntoConversation(
    @Request() req: any,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
  ): Promise<{ success: boolean; message: string }> {
    await this.projectContextService.integrateProjectContextIntoConversation(
      conversationId,
      req.user.id,
    );

    return {
      success: true,
      message: 'Project context integrated successfully into conversation',
    };
  }
}
