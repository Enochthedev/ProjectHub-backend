import {
  IsString,
  IsNumber,
  IsDate,
  IsArray,
  IsOptional,
  IsEnum,
  IsBoolean,
  ValidateNested,
  Min,
  Max,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ConversationStatus, MessageType } from '../../common/enums';

export class StudentInteractionSummaryDto {
  @ApiProperty({ description: 'Student ID' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Student name' })
  @IsString()
  studentName: string;

  @ApiProperty({ description: 'Student email' })
  @IsString()
  studentEmail: string;

  @ApiProperty({ description: 'Total number of conversations' })
  @IsNumber()
  totalConversations: number;

  @ApiProperty({ description: 'Total number of messages sent' })
  @IsNumber()
  totalMessages: number;

  @ApiProperty({ description: 'Number of active conversations' })
  @IsNumber()
  activeConversations: number;

  @ApiProperty({ description: 'Number of escalated conversations' })
  @IsNumber()
  escalatedConversations: number;

  @ApiProperty({ description: 'Average AI response confidence score' })
  @IsNumber()
  @Min(0)
  @Max(1)
  averageConfidenceScore: number;

  @ApiProperty({ description: 'Number of low confidence responses' })
  @IsNumber()
  lowConfidenceResponses: number;

  @ApiProperty({ description: 'Last interaction timestamp' })
  @IsDate()
  @Type(() => Date)
  lastInteractionAt: Date;

  @ApiProperty({ description: 'Most common question categories' })
  @IsArray()
  @IsString({ each: true })
  commonCategories: string[];

  @ApiProperty({ description: 'Average response rating' })
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating: number;

  @ApiProperty({ description: 'Project ID if associated' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ description: 'Project title if associated' })
  @IsOptional()
  @IsString()
  projectTitle?: string;
}

export class StudentInteractionsOverviewDto {
  @ApiProperty({
    description: 'List of student interaction summaries',
    type: [StudentInteractionSummaryDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => StudentInteractionSummaryDto)
  students: StudentInteractionSummaryDto[];

  @ApiProperty({ description: 'Total number of supervised students' })
  @IsNumber()
  totalStudents: number;

  @ApiProperty({ description: 'Students with recent activity (last 7 days)' })
  @IsNumber()
  activeStudents: number;

  @ApiProperty({ description: 'Students with escalated conversations' })
  @IsNumber()
  studentsWithEscalations: number;

  @ApiProperty({ description: 'Overall average confidence score' })
  @IsNumber()
  @Min(0)
  @Max(1)
  overallAverageConfidence: number;

  @ApiProperty({ description: 'Total interactions across all students' })
  @IsNumber()
  totalInteractions: number;
}

export class CommonQuestionDto {
  @ApiProperty({ description: 'Question text or pattern' })
  @IsString()
  question: string;

  @ApiProperty({ description: 'Question category' })
  @IsString()
  category: string;

  @ApiProperty({ description: 'Number of times asked' })
  @IsNumber()
  frequency: number;

  @ApiProperty({ description: 'Average confidence score for responses' })
  @IsNumber()
  @Min(0)
  @Max(1)
  averageConfidence: number;

  @ApiProperty({ description: 'Average rating for responses' })
  @IsNumber()
  @Min(0)
  @Max(5)
  averageRating: number;

  @ApiProperty({ description: 'Students who asked this question' })
  @IsArray()
  @IsString({ each: true })
  studentIds: string[];

  @ApiProperty({ description: 'Indicates if this question needs attention' })
  @IsBoolean()
  needsAttention: boolean;

  @ApiProperty({ description: 'Suggested improvement action' })
  @IsOptional()
  @IsString()
  suggestedAction?: string;
}

export class CommonQuestionsAnalysisDto {
  @ApiProperty({
    description: 'List of common questions',
    type: [CommonQuestionDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CommonQuestionDto)
  questions: CommonQuestionDto[];

  @ApiProperty({ description: 'Total unique questions analyzed' })
  @IsNumber()
  totalQuestions: number;

  @ApiProperty({ description: 'Questions with low confidence responses' })
  @IsNumber()
  lowConfidenceQuestions: number;

  @ApiProperty({ description: 'Questions with low ratings' })
  @IsNumber()
  lowRatedQuestions: number;

  @ApiProperty({ description: 'Most problematic categories' })
  @IsArray()
  @IsString({ each: true })
  problematicCategories: string[];

  @ApiProperty({ description: 'Knowledge gaps identified' })
  @IsArray()
  @IsString({ each: true })
  knowledgeGaps: string[];
}

export class EscalatedConversationDto {
  @ApiProperty({ description: 'Conversation ID' })
  @IsString()
  conversationId: string;

  @ApiProperty({ description: 'Student ID' })
  @IsString()
  studentId: string;

  @ApiProperty({ description: 'Student name' })
  @IsString()
  studentName: string;

  @ApiProperty({ description: 'Student email' })
  @IsString()
  studentEmail: string;

  @ApiProperty({ description: 'Conversation title' })
  @IsString()
  title: string;

  @ApiProperty({ description: 'Escalation reason' })
  @IsString()
  escalationReason: string;

  @ApiProperty({ description: 'Escalation priority level' })
  @IsEnum(['low', 'medium', 'high', 'urgent'])
  priority: 'low' | 'medium' | 'high' | 'urgent';

  @ApiProperty({ description: 'When the conversation was escalated' })
  @IsDate()
  @Type(() => Date)
  escalatedAt: Date;

  @ApiProperty({ description: 'Last message in the conversation' })
  @IsString()
  lastMessage: string;

  @ApiProperty({ description: 'Number of messages in conversation' })
  @IsNumber()
  messageCount: number;

  @ApiProperty({ description: 'Average confidence score of AI responses' })
  @IsNumber()
  @Min(0)
  @Max(1)
  averageConfidence: number;

  @ApiProperty({ description: 'Project ID if associated' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiProperty({ description: 'Project title if associated' })
  @IsOptional()
  @IsString()
  projectTitle?: string;

  @ApiProperty({ description: 'Suggested supervisor actions' })
  @IsArray()
  @IsString({ each: true })
  suggestedActions: string[];
}

export class EscalationsOverviewDto {
  @ApiProperty({
    description: 'List of escalated conversations',
    type: [EscalatedConversationDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => EscalatedConversationDto)
  escalations: EscalatedConversationDto[];

  @ApiProperty({ description: 'Total number of escalated conversations' })
  @IsNumber()
  totalEscalations: number;

  @ApiProperty({ description: 'New escalations in the last 24 hours' })
  @IsNumber()
  newEscalations: number;

  @ApiProperty({ description: 'High priority escalations' })
  @IsNumber()
  highPriorityEscalations: number;

  @ApiProperty({
    description: 'Urgent escalations requiring immediate attention',
  })
  @IsNumber()
  urgentEscalations: number;

  @ApiProperty({ description: 'Most common escalation reasons' })
  @IsArray()
  @IsString({ each: true })
  commonReasons: string[];
}

export class SupervisorMonitoringFiltersDto {
  @ApiPropertyOptional({ description: 'Filter by student ID' })
  @IsOptional()
  @IsString()
  studentId?: string;

  @ApiPropertyOptional({ description: 'Filter by project ID' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Filter by date range start' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  startDate?: Date;

  @ApiPropertyOptional({ description: 'Filter by date range end' })
  @IsOptional()
  @IsDate()
  @Type(() => Date)
  endDate?: Date;

  @ApiPropertyOptional({
    description: 'Filter by conversation status',
    enum: ConversationStatus,
  })
  @IsOptional()
  @IsEnum(ConversationStatus)
  status?: ConversationStatus;

  @ApiPropertyOptional({ description: 'Filter by minimum confidence score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  minConfidence?: number;

  @ApiPropertyOptional({ description: 'Filter by maximum confidence score' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  maxConfidence?: number;

  @ApiPropertyOptional({ description: 'Include only escalated conversations' })
  @IsOptional()
  @IsBoolean()
  escalatedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Include only low-rated responses' })
  @IsOptional()
  @IsBoolean()
  lowRatedOnly?: boolean;

  @ApiPropertyOptional({ description: 'Limit number of results' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({ description: 'Offset for pagination' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  offset?: number;
}
