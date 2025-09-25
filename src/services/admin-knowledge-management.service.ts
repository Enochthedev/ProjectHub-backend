import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, QueryRunner, DataSource, Like, In } from 'typeorm';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';
import {
  KnowledgeBaseVersion,
  ContentVersion,
} from '../entities/knowledge-base-version.entity';
import {
  KnowledgeBaseApproval,
  ApprovalStatus,
  ApprovalAction,
} from '../entities/knowledge-base-approval.entity';
import { AdminAuditService } from './admin-audit.service';
import { EmbeddingService } from './embedding.service';
import { SimilarityService } from './similarity.service';
import {
  CreateKnowledgeBaseEntryDto,
  UpdateKnowledgeBaseEntryDto,
  KnowledgeBaseEntryResponseDto,
  ContentApprovalDto,
  ContentVersionDto,
  BulkKnowledgeBaseOperationDto,
  KnowledgeBaseFiltersDto,
  KnowledgeBaseContentAnalyticsDto,
  ContentQualityMetricsDto,
  ContentWorkflowDto,
  ContentImportDto,
  ContentExportDto,
  PaginatedKnowledgeBaseDto,
  ContentRecommendationDto,
  ContentDuplicationCheckDto,
  ContentDuplicationResultDto,
} from '../dto/admin/knowledge-base.dto';

export interface BulkOperationResult {
  successCount: number;
  failureCount: number;
  errors: string[];
  results: Array<{
    id: string;
    success: boolean;
    error?: string;
  }>;
}

@Injectable()
export class AdminKnowledgeManagementService {
  private readonly logger = new Logger(AdminKnowledgeManagementService.name);

  constructor(
    @InjectRepository(KnowledgeBaseEntry)
    private readonly entryRepository: Repository<KnowledgeBaseEntry>,
    @InjectRepository(KnowledgeBaseVersion)
    private readonly versionRepository: Repository<KnowledgeBaseVersion>,
    @InjectRepository(KnowledgeBaseApproval)
    private readonly approvalRepository: Repository<KnowledgeBaseApproval>,
    private readonly dataSource: DataSource,
    private readonly auditService: AdminAuditService,
    private readonly embeddingService: EmbeddingService,
    private readonly similarityService: SimilarityService,
  ) {}

  /**
   * Get all knowledge base entries with filtering and pagination
   */
  async getEntries(
    filters: KnowledgeBaseFiltersDto,
  ): Promise<PaginatedKnowledgeBaseDto> {
    const queryBuilder = this.entryRepository
      .createQueryBuilder('entry')
      .leftJoinAndSelect('entry.createdBy', 'createdBy')
      .leftJoin(
        'knowledge_base_approvals',
        'approval',
        'approval.entry_id = entry.id',
      )
      .addSelect(['approval.status', 'approval.reviewedAt']);

    // Apply filters
    if (filters.search) {
      queryBuilder.andWhere(
        '(entry.title ILIKE :search OR entry.content ILIKE :search OR entry.category ILIKE :search)',
        { search: `%${filters.search}%` },
      );
    }

    if (filters.category) {
      queryBuilder.andWhere('entry.category = :category', {
        category: filters.category,
      });
    }

    if (filters.contentType) {
      queryBuilder.andWhere('entry.contentType = :contentType', {
        contentType: filters.contentType,
      });
    }

    if (filters.approvalStatus) {
      queryBuilder.andWhere('approval.status = :approvalStatus', {
        approvalStatus: filters.approvalStatus,
      });
    }

    if (filters.language) {
      queryBuilder.andWhere('entry.language = :language', {
        language: filters.language,
      });
    }

    if (filters.tags && filters.tags.length > 0) {
      queryBuilder.andWhere('entry.tags && :tags', { tags: filters.tags });
    }

    if (filters.isActive !== undefined) {
      queryBuilder.andWhere('entry.isActive = :isActive', {
        isActive: filters.isActive,
      });
    }

    if (filters.createdAfter) {
      queryBuilder.andWhere('entry.createdAt >= :createdAfter', {
        createdAfter: filters.createdAfter,
      });
    }

    if (filters.createdBefore) {
      queryBuilder.andWhere('entry.createdAt <= :createdBefore', {
        createdBefore: filters.createdBefore,
      });
    }

    // Sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder || 'DESC';
    queryBuilder.orderBy(`entry.${sortBy}`, sortOrder);

    // Pagination
    const page = filters.page || 1;
    const limit = filters.limit || 20;
    const offset = (page - 1) * limit;

    queryBuilder.skip(offset).take(limit);

    const [entries, total] = await queryBuilder.getManyAndCount();

    return {
      entries: await Promise.all(
        entries.map((entry) => this.mapToResponseDto(entry)),
      ),
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
      filters,
    };
  }

  /**
   * Get knowledge base entry by ID
   */
  async getEntryById(id: string): Promise<KnowledgeBaseEntryResponseDto> {
    const entry = await this.entryRepository.findOne({
      where: { id },
      relations: ['createdBy'],
    });

    if (!entry) {
      throw new NotFoundException(
        `Knowledge base entry with ID ${id} not found`,
      );
    }

    return this.mapToResponseDto(entry);
  }

  /**
   * Create new knowledge base entry
   */
  async createEntry(
    createDto: CreateKnowledgeBaseEntryDto,
    adminId: string,
  ): Promise<KnowledgeBaseEntryResponseDto> {
    // Check for potential duplicates
    const duplicateCheck = await this.checkForDuplicates({
      title: createDto.title,
      content: createDto.content,
      category: createDto.category,
      keywords: createDto.keywords,
    });

    if (duplicateCheck.isDuplicate && duplicateCheck.similarityScore > 0.8) {
      throw new ConflictException(
        `Similar content already exists. Similarity score: ${duplicateCheck.similarityScore.toFixed(2)}`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      // Create the entry
      const entry = this.entryRepository.create({
        ...createDto,
        createdById: adminId,
        language: createDto.language || 'en',
        isActive: createDto.isActive !== undefined ? createDto.isActive : true,
      });

      const savedEntry = await queryRunner.manager.save(entry);

      // Create initial version
      const version = this.versionRepository.create(
        KnowledgeBaseVersion.createFromEntry(
          savedEntry,
          1,
          'Initial version',
          adminId,
        ),
      );
      await queryRunner.manager.save(version);

      // Create approval workflow if needed
      if (!createDto.isActive) {
        const approval = this.approvalRepository.create(
          KnowledgeBaseApproval.createSubmission(savedEntry.id, adminId),
        );
        await queryRunner.manager.save(approval);
      }

      await queryRunner.commitTransaction();

      // Log the creation
      await this.auditService.logAdminAction(
        adminId,
        'create',
        'knowledge_base_entry',
        savedEntry.id,
        null,
        savedEntry,
      );

      this.logger.log(
        `Knowledge base entry '${savedEntry.title}' created by admin ${adminId}`,
      );

      return this.getEntryById(savedEntry.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Update knowledge base entry
   */
  async updateEntry(
    id: string,
    updateDto: UpdateKnowledgeBaseEntryDto,
    adminId: string,
  ): Promise<KnowledgeBaseEntryResponseDto> {
    const entry = await this.entryRepository.findOne({ where: { id } });

    if (!entry) {
      throw new NotFoundException(
        `Knowledge base entry with ID ${id} not found`,
      );
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const oldValues = { ...entry };

      // Update entry
      Object.assign(entry, updateDto);

      const savedEntry = await queryRunner.manager.save(entry);

      // Create new version if content changed
      if (updateDto.content || updateDto.title) {
        const latestVersion = await this.versionRepository.findOne({
          where: { entryId: id },
          order: { versionNumber: 'DESC' },
        });

        const newVersionNumber = (latestVersion?.versionNumber || 0) + 1;
        const changes = this.generateChangesSummary(oldValues, updateDto);

        const version = this.versionRepository.create(
          KnowledgeBaseVersion.createFromEntry(
            savedEntry,
            newVersionNumber,
            changes,
            adminId,
          ),
        );
        await queryRunner.manager.save(version);
      }

      await queryRunner.commitTransaction();

      // Log the update
      await this.auditService.logAdminAction(
        adminId,
        'update',
        'knowledge_base_entry',
        savedEntry.id,
        oldValues,
        savedEntry,
      );

      this.logger.log(
        `Knowledge base entry '${savedEntry.title}' updated by admin ${adminId}`,
      );

      return this.getEntryById(savedEntry.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Delete knowledge base entry
   */
  async deleteEntry(id: string, adminId: string): Promise<void> {
    const entry = await this.entryRepository.findOne({ where: { id } });

    if (!entry) {
      throw new NotFoundException(
        `Knowledge base entry with ID ${id} not found`,
      );
    }

    // Check if entry is being used
    if (entry.usageCount > 0) {
      throw new BadRequestException(
        `Cannot delete knowledge base entry '${entry.title}' as it has usage history. Consider deactivating instead.`,
      );
    }

    await this.entryRepository.remove(entry);

    // Log the deletion
    await this.auditService.logAdminAction(
      adminId,
      'delete',
      'knowledge_base_entry',
      id,
      entry,
      null,
    );

    this.logger.log(
      `Knowledge base entry '${entry.title}' deleted by admin ${adminId}`,
    );
  }

  /**
   * Approve or reject knowledge base entry
   */
  async processApproval(
    id: string,
    approvalDto: ContentApprovalDto,
    adminId: string,
  ): Promise<KnowledgeBaseEntryResponseDto> {
    const entry = await this.entryRepository.findOne({ where: { id } });

    if (!entry) {
      throw new NotFoundException(
        `Knowledge base entry with ID ${id} not found`,
      );
    }

    const approval = await this.approvalRepository.findOne({
      where: { entryId: id, status: ApprovalStatus.PENDING },
    });

    if (!approval) {
      throw new NotFoundException(`No pending approval found for entry ${id}`);
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      switch (approvalDto.status) {
        case ApprovalStatus.APPROVED:
          approval.approve(adminId, approvalDto.comments);
          entry.isActive = true;
          break;
        case ApprovalStatus.REJECTED:
          approval.reject(
            adminId,
            approvalDto.reason || 'Content rejected',
            approvalDto.comments,
          );
          entry.isActive = false;
          break;
        case ApprovalStatus.NEEDS_REVISION:
          approval.requestChanges(
            adminId,
            approvalDto.suggestedChanges || [],
            approvalDto.comments,
          );
          break;
      }

      await queryRunner.manager.save(approval);
      await queryRunner.manager.save(entry);

      await queryRunner.commitTransaction();

      // Log the approval action
      await this.auditService.logAdminAction(
        adminId,
        `approval_${approvalDto.status}`,
        'knowledge_base_entry',
        entry.id,
        null,
        { status: approvalDto.status, comments: approvalDto.comments },
      );

      this.logger.log(
        `Knowledge base entry '${entry.title}' ${approvalDto.status} by admin ${adminId}`,
      );

      return this.getEntryById(entry.id);
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  /**
   * Get entry versions
   */
  async getEntryVersions(id: string): Promise<ContentVersionDto[]> {
    const versions = await this.versionRepository.find({
      where: { entryId: id },
      relations: ['createdBy'],
      order: { versionNumber: 'DESC' },
    });

    return versions.map((version) => ({
      id: version.id,
      entryId: version.entryId,
      versionNumber: version.versionNumber,
      title: version.title,
      content: version.content,
      status: version.status,
      changes: version.changes || '',
      createdBy: version.createdBy.id,
      createdAt: version.createdAt,
    }));
  }

  /**
   * Bulk operations on knowledge base entries
   */
  async bulkOperation(
    operationDto: BulkKnowledgeBaseOperationDto,
    adminId: string,
  ): Promise<BulkOperationResult> {
    const result: BulkOperationResult = {
      successCount: 0,
      failureCount: 0,
      errors: [],
      results: [],
    };

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      for (const entryId of operationDto.entryIds) {
        try {
          const entry = await queryRunner.manager.findOne(KnowledgeBaseEntry, {
            where: { id: entryId },
          });

          if (!entry) {
            result.failureCount++;
            result.errors.push(`Entry ${entryId} not found`);
            result.results.push({
              id: entryId,
              success: false,
              error: 'Entry not found',
            });
            continue;
          }

          const oldValues = { ...entry };

          switch (operationDto.operation) {
            case 'approve':
              const approval = await queryRunner.manager.findOne(
                KnowledgeBaseApproval,
                {
                  where: { entryId, status: ApprovalStatus.PENDING },
                },
              );
              if (approval) {
                approval.approve(adminId, operationDto.comments);
                await queryRunner.manager.save(approval);
              }
              entry.isActive = true;
              break;
            case 'reject':
              const rejectionApproval = await queryRunner.manager.findOne(
                KnowledgeBaseApproval,
                {
                  where: { entryId, status: ApprovalStatus.PENDING },
                },
              );
              if (rejectionApproval) {
                rejectionApproval.reject(
                  adminId,
                  operationDto.reason || 'Bulk rejection',
                  operationDto.comments,
                );
                await queryRunner.manager.save(rejectionApproval);
              }
              entry.isActive = false;
              break;
            case 'activate':
              entry.isActive = true;
              break;
            case 'deactivate':
              entry.isActive = false;
              break;
            case 'delete':
              if (entry.usageCount > 0) {
                throw new Error('Entry has usage history');
              }
              await queryRunner.manager.remove(entry);
              break;
            case 'archive':
              entry.isActive = false;
              // Create archived version
              const latestVersion = await this.versionRepository.findOne({
                where: { entryId },
                order: { versionNumber: 'DESC' },
              });
              if (latestVersion) {
                latestVersion.archive();
                await queryRunner.manager.save(latestVersion);
              }
              break;
          }

          if (operationDto.operation !== 'delete') {
            await queryRunner.manager.save(entry);
          }

          // Log the operation
          await this.auditService.logAdminAction(
            adminId,
            `bulk_${operationDto.operation}`,
            'knowledge_base_entry',
            entryId,
            oldValues,
            operationDto.operation === 'delete' ? null : entry,
          );

          result.successCount++;
          result.results.push({
            id: entryId,
            success: true,
          });
        } catch (error) {
          result.failureCount++;
          result.errors.push(
            `Failed to ${operationDto.operation} ${entryId}: ${error.message}`,
          );
          result.results.push({
            id: entryId,
            success: false,
            error: error.message,
          });
        }
      }

      await queryRunner.commitTransaction();
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }

    this.logger.log(
      `Bulk ${operationDto.operation} completed by admin ${adminId}: ${result.successCount} successful, ${result.failureCount} failed`,
    );

    return result;
  }

  /**
   * Get content analytics for an entry
   */
  async getContentAnalytics(
    id: string,
    days: number = 30,
  ): Promise<KnowledgeBaseContentAnalyticsDto> {
    const entry = await this.entryRepository.findOne({ where: { id } });

    if (!entry) {
      throw new NotFoundException(
        `Knowledge base entry with ID ${id} not found`,
      );
    }

    const endDate = new Date();
    const startDate = new Date(endDate.getTime() - days * 24 * 60 * 60 * 1000);

    // This would typically query analytics tables
    // For now, returning mock data structure
    return {
      entryId: entry.id,
      title: entry.title,
      category: entry.category,
      contentType: entry.contentType,
      usageStats: {
        totalViews: entry.usageCount,
        uniqueUsers: Math.floor(entry.usageCount * 0.7),
        averageTimeSpent: 120, // seconds
        searchAppearances: entry.usageCount * 2,
        clickThroughRate: 0.15,
      },
      ratingStats: {
        averageRating: entry.averageRating,
        totalRatings: Math.floor(entry.usageCount * 0.3),
        ratingDistribution: {
          1: 2,
          2: 3,
          3: 8,
          4: 15,
          5: 12,
        },
      },
      performanceMetrics: {
        helpfulnessScore: entry.averageRating * 20,
        accuracyScore: 85,
        completenessScore: 90,
        clarityScore: 88,
      },
      timeRange: {
        start: startDate,
        end: endDate,
      },
    };
  }

  /**
   * Get overall content quality metrics
   */
  async getQualityMetrics(): Promise<ContentQualityMetricsDto> {
    const totalEntries = await this.entryRepository.count();

    const approvalStats = await this.approvalRepository
      .createQueryBuilder('approval')
      .select('approval.status, COUNT(*) as count')
      .groupBy('approval.status')
      .getRawMany();

    const contentByType = await this.entryRepository
      .createQueryBuilder('entry')
      .select('entry.contentType, COUNT(*) as count')
      .groupBy('entry.contentType')
      .getRawMany();

    const contentByCategory = await this.entryRepository
      .createQueryBuilder('entry')
      .select('entry.category, COUNT(*) as count')
      .groupBy('entry.category')
      .getRawMany();

    const languageDistribution = await this.entryRepository
      .createQueryBuilder('entry')
      .select('entry.language, COUNT(*) as count')
      .groupBy('entry.language')
      .getRawMany();

    const avgRating = await this.entryRepository
      .createQueryBuilder('entry')
      .select('AVG(entry.averageRating)', 'avgRating')
      .getRawOne();

    const mostViewed = await this.entryRepository.find({
      order: { usageCount: 'DESC' },
      take: 5,
    });

    const leastViewed = await this.entryRepository.find({
      order: { usageCount: 'ASC' },
      take: 5,
    });

    return {
      totalEntries,
      approvedEntries:
        approvalStats.find((s) => s.status === ApprovalStatus.APPROVED)
          ?.count || 0,
      pendingApproval:
        approvalStats.find((s) => s.status === ApprovalStatus.PENDING)?.count ||
        0,
      rejectedEntries:
        approvalStats.find((s) => s.status === ApprovalStatus.REJECTED)
          ?.count || 0,
      averageApprovalTime: 3.5, // days - would be calculated from actual data
      contentByType: contentByType.reduce((acc, item) => {
        acc[item.contentType] = parseInt(item.count);
        return acc;
      }, {}),
      contentByCategory: contentByCategory.reduce((acc, item) => {
        acc[item.category] = parseInt(item.count);
        return acc;
      }, {}),
      languageDistribution: languageDistribution.reduce((acc, item) => {
        acc[item.language] = parseInt(item.count);
        return acc;
      }, {}),
      qualityScores: {
        averageRating: parseFloat(avgRating?.avgRating || '0'),
        highQualityContent: await this.entryRepository.count({
          where: { averageRating: 4.0 },
        }),
        lowQualityContent: await this.entryRepository.count({
          where: { averageRating: 2.0 },
        }),
        outdatedContent: await this.entryRepository.count({
          where: {
            updatedAt: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000), // 1 year old
          },
        }),
      },
      usageMetrics: {
        totalViews: await this.entryRepository
          .createQueryBuilder('entry')
          .select('SUM(entry.usageCount)', 'totalViews')
          .getRawOne()
          .then((result) => parseInt(result?.totalViews || '0')),
        averageViewsPerEntry:
          totalEntries > 0
            ? await this.entryRepository
                .createQueryBuilder('entry')
                .select('AVG(entry.usageCount)', 'avgViews')
                .getRawOne()
                .then((result) => parseFloat(result?.avgViews || '0'))
            : 0,
        mostViewedEntries: mostViewed.map((entry) => ({
          id: entry.id,
          title: entry.title,
          views: entry.usageCount,
        })),
        leastViewedEntries: leastViewed.map((entry) => ({
          id: entry.id,
          title: entry.title,
          views: entry.usageCount,
        })),
      },
    };
  }

  /**
   * Check for duplicate content
   */
  async checkForDuplicates(
    checkDto: ContentDuplicationCheckDto,
  ): Promise<ContentDuplicationResultDto> {
    // Get similar entries based on title and keywords
    const similarEntries = await this.entryRepository.find({
      where: [
        { title: Like(`%${checkDto.title}%`) },
        ...(checkDto.keywords || []).map((keyword) => ({
          keywords: Like(`%${keyword}%`),
        })),
      ],
      take: 10,
    });

    if (similarEntries.length === 0) {
      return {
        isDuplicate: false,
        similarityScore: 0,
        duplicateEntries: [],
        suggestions: ['Content appears to be unique'],
      };
    }

    // Calculate similarity scores using embedding service
    const similarities = await Promise.all(
      similarEntries.map(async (entry) => {
        // For now, use a simple text similarity calculation
        // In a real implementation, you would generate embeddings first
        const similarity = this.calculateSimpleTextSimilarity(
          checkDto.content,
          entry.content,
        );
        return {
          id: entry.id,
          title: entry.title,
          similarityScore: similarity,
          category: entry.category,
        };
      }),
    );

    const maxSimilarity = Math.max(
      ...similarities.map((s) => s.similarityScore),
    );
    const isDuplicate = maxSimilarity > 0.7;

    const suggestions: string[] = [];
    if (isDuplicate) {
      suggestions.push('Consider merging with existing content');
      suggestions.push('Review similar entries before creating new content');
    } else if (maxSimilarity > 0.5) {
      suggestions.push('Similar content exists - consider referencing it');
      suggestions.push(
        'Add unique value to differentiate from existing content',
      );
    } else {
      suggestions.push('Content appears sufficiently unique');
    }

    return {
      isDuplicate,
      similarityScore: maxSimilarity,
      duplicateEntries: similarities.filter((s) => s.similarityScore > 0.5),
      suggestions,
    };
  }

  /**
   * Map entity to response DTO
   */
  private async mapToResponseDto(
    entry: KnowledgeBaseEntry,
  ): Promise<KnowledgeBaseEntryResponseDto> {
    // Get approval status
    const approval = await this.approvalRepository.findOne({
      where: { entryId: entry.id },
      order: { createdAt: 'DESC' },
      relations: ['reviewer'],
    });

    // Get latest version
    const latestVersion = await this.versionRepository.findOne({
      where: { entryId: entry.id },
      order: { versionNumber: 'DESC' },
    });

    return {
      id: entry.id,
      title: entry.title,
      content: entry.content,
      category: entry.category,
      tags: entry.tags,
      keywords: entry.keywords,
      contentType: entry.contentType,
      language: entry.language,
      relatedEntries: [], // Would be populated from relationships
      isActive: entry.isActive,
      usageCount: entry.usageCount,
      averageRating: entry.averageRating,
      approvalStatus: approval?.status || ApprovalStatus.APPROVED,
      version: latestVersion?.status || ContentVersion.PUBLISHED,
      versionNumber: latestVersion?.versionNumber || 1,
      createdBy: entry.createdBy?.id || entry.createdById || '',
      updatedBy: entry.createdBy?.id || entry.createdById || '',
      approvedBy: approval?.reviewer?.id,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      approvedAt: approval?.reviewedAt || undefined,
    };
  }

  /**
   * Generate changes summary for versioning
   */
  private generateChangesSummary(oldValues: any, newValues: any): string {
    const changes: string[] = [];

    if (newValues.title && newValues.title !== oldValues.title) {
      changes.push(
        `Title changed from "${oldValues.title}" to "${newValues.title}"`,
      );
    }

    if (newValues.content && newValues.content !== oldValues.content) {
      changes.push('Content updated');
    }

    if (newValues.category && newValues.category !== oldValues.category) {
      changes.push(
        `Category changed from "${oldValues.category}" to "${newValues.category}"`,
      );
    }

    if (
      newValues.tags &&
      JSON.stringify(newValues.tags) !== JSON.stringify(oldValues.tags)
    ) {
      changes.push('Tags updated');
    }

    if (
      newValues.keywords &&
      JSON.stringify(newValues.keywords) !== JSON.stringify(oldValues.keywords)
    ) {
      changes.push('Keywords updated');
    }

    return changes.length > 0 ? changes.join('; ') : 'Minor updates';
  }

  /**
   * Create knowledge entry (alias for createEntry)
   */
  async createKnowledgeEntry(
    adminId: string,
    createDto: CreateKnowledgeBaseEntryDto,
  ): Promise<KnowledgeBaseEntryResponseDto> {
    return this.createEntry(createDto, adminId);
  }

  /**
   * Get knowledge entries (alias for getEntries)
   */
  async getKnowledgeEntries(
    adminId: string,
    filters: KnowledgeBaseFiltersDto,
  ): Promise<{
    entries: KnowledgeBaseEntryResponseDto[];
    total: number;
    hasMore: boolean;
  }> {
    const result = await this.getEntries(filters);
    return {
      entries: result.entries,
      total: result.total,
      hasMore: result.page < result.totalPages,
    };
  }

  /**
   * Get knowledge entry (alias for getEntryById)
   */
  async getKnowledgeEntry(
    adminId: string,
    entryId: string,
  ): Promise<KnowledgeBaseEntryResponseDto> {
    return this.getEntryById(entryId);
  }

  /**
   * Update knowledge entry (alias for updateEntry)
   */
  async updateKnowledgeEntry(
    adminId: string,
    entryId: string,
    updateDto: UpdateKnowledgeBaseEntryDto,
  ): Promise<KnowledgeBaseEntryResponseDto> {
    return this.updateEntry(entryId, updateDto, adminId);
  }

  /**
   * Delete knowledge entry (alias for deleteEntry)
   */
  async deleteKnowledgeEntry(entryId: string, adminId: string): Promise<void> {
    return this.deleteEntry(entryId, adminId);
  }

  /**
   * Create response template
   */
  async createResponseTemplate(
    adminId: string,
    templateDto: any,
  ): Promise<any> {
    // This would create a response template
    // For now, return a mock response
    return {
      id: 'template-' + Date.now(),
      ...templateDto,
      createdBy: adminId,
      createdAt: new Date(),
    };
  }

  /**
   * Get response templates
   */
  async getResponseTemplates(
    adminId: string,
    filters?: any,
  ): Promise<{
    templates: any[];
    total: number;
    hasMore: boolean;
  }> {
    // This would get response templates
    // For now, return empty result
    return {
      templates: [],
      total: 0,
      hasMore: false,
    };
  }

  /**
   * Get response template
   */
  async getResponseTemplate(adminId: string, templateId: string): Promise<any> {
    // This would get a specific response template
    // For now, return a mock response
    return {
      id: templateId,
      name: 'Sample Template',
      content: 'Template content',
      createdBy: adminId,
      createdAt: new Date(),
    };
  }

  /**
   * Update response template
   */
  async updateResponseTemplate(
    adminId: string,
    templateId: string,
    templateDto: any,
  ): Promise<any> {
    // This would update a response template
    // For now, return a mock response
    return {
      id: templateId,
      ...templateDto,
      updatedBy: adminId,
      updatedAt: new Date(),
    };
  }

  /**
   * Delete response template
   */
  async deleteResponseTemplate(
    templateId: string,
    adminId: string,
  ): Promise<void> {
    // This would delete a response template
    // For now, just log the action
    this.logger.log(`Template ${templateId} deleted by admin ${adminId}`);
  }

  /**
   * Simple text similarity calculation (placeholder for actual embedding-based similarity)
   */
  private calculateSimpleTextSimilarity(text1: string, text2: string): number {
    // Simple Jaccard similarity based on words
    const words1 = new Set(text1.toLowerCase().split(/\s+/));
    const words2 = new Set(text2.toLowerCase().split(/\s+/));

    const intersection = new Set(
      [...words1].filter((word) => words2.has(word)),
    );
    const union = new Set([...words1, ...words2]);

    return union.size > 0 ? intersection.size / union.size : 0;
  }
}
