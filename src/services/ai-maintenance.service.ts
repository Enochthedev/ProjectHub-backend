import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, MoreThan, IsNull, Not } from 'typeorm';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { KnowledgeBaseEntry } from '../entities/knowledge-base-entry.entity';
import { ResponseTemplate } from '../entities/response-template.entity';
import { ConversationStatus, MessageType } from '../common/enums';
import { ConversationCacheService } from './conversation-cache.service';

export interface MaintenanceStats {
  conversationsArchived: number;
  conversationsDeleted: number;
  knowledgeEntriesOptimized: number;
  templatesAnalyzed: number;
  cacheEntriesCleared: number;
  executionTime: number;
}

export interface ConversationCleanupConfig {
  autoArchiveDays: number;
  permanentDeleteDays: number;
  maxInactiveConversations: number;
  batchSize: number;
}

export interface KnowledgeOptimizationConfig {
  minUsageForOptimization: number;
  lowRatingThreshold: number;
  outdatedContentDays: number;
  batchSize: number;
}

export interface TemplateAnalysisConfig {
  minUsageForAnalysis: number;
  effectivenessThreshold: number;
  analysisWindowDays: number;
  batchSize: number;
}

@Injectable()
export class AIMaintenanceService {
  private readonly logger = new Logger(AIMaintenanceService.name);

  // Default configurations
  private readonly conversationConfig: ConversationCleanupConfig = {
    autoArchiveDays: 30,
    permanentDeleteDays: 90,
    maxInactiveConversations: 1000,
    batchSize: 100,
  };

  private readonly knowledgeConfig: KnowledgeOptimizationConfig = {
    minUsageForOptimization: 5,
    lowRatingThreshold: 2.0,
    outdatedContentDays: 180,
    batchSize: 50,
  };

  private readonly templateConfig: TemplateAnalysisConfig = {
    minUsageForAnalysis: 10,
    effectivenessThreshold: 0.7,
    analysisWindowDays: 30,
    batchSize: 25,
  };

  constructor(
    @InjectRepository(Conversation)
    private readonly conversationRepository: Repository<Conversation>,
    @InjectRepository(ConversationMessage)
    private readonly messageRepository: Repository<ConversationMessage>,
    @InjectRepository(KnowledgeBaseEntry)
    private readonly knowledgeRepository: Repository<KnowledgeBaseEntry>,
    @InjectRepository(ResponseTemplate)
    private readonly templateRepository: Repository<ResponseTemplate>,
    private readonly cacheService: ConversationCacheService,
  ) {}

  /**
   * Daily maintenance job - runs at 2 AM
   */
  @Cron('0 2 * * *', {
    name: 'daily-ai-maintenance',
    timeZone: 'UTC',
  })
  async runDailyMaintenance(): Promise<MaintenanceStats> {
    this.logger.log('Starting daily AI maintenance tasks');
    const startTime = Date.now();

    try {
      const [
        conversationsArchived,
        knowledgeEntriesOptimized,
        cacheEntriesCleared,
      ] = await Promise.all([
        this.archiveInactiveConversations(),
        this.optimizeKnowledgeBaseUsage(),
        this.cleanupExpiredCache(),
      ]);

      const executionTime = Date.now() - startTime;
      const stats: MaintenanceStats = {
        conversationsArchived,
        conversationsDeleted: 0,
        knowledgeEntriesOptimized,
        templatesAnalyzed: 0,
        cacheEntriesCleared,
        executionTime,
      };

      this.logger.log(
        `Daily maintenance completed in ${executionTime}ms`,
        stats,
      );
      return stats;
    } catch (error) {
      this.logger.error('Daily maintenance failed', error);
      throw error;
    }
  }

  /**
   * Weekly maintenance job - runs on Sunday at 3 AM
   */
  @Cron('0 3 * * 0', {
    name: 'weekly-ai-maintenance',
    timeZone: 'UTC',
  })
  async runWeeklyMaintenance(): Promise<MaintenanceStats> {
    this.logger.log('Starting weekly AI maintenance tasks');
    const startTime = Date.now();

    try {
      const [conversationsDeleted, templatesAnalyzed] = await Promise.all([
        this.deleteOldArchivedConversations(),
        this.analyzeTemplateEffectiveness(),
      ]);

      const executionTime = Date.now() - startTime;
      const stats: MaintenanceStats = {
        conversationsArchived: 0,
        conversationsDeleted,
        knowledgeEntriesOptimized: 0,
        templatesAnalyzed,
        cacheEntriesCleared: 0,
        executionTime,
      };

      this.logger.log(
        `Weekly maintenance completed in ${executionTime}ms`,
        stats,
      );
      return stats;
    } catch (error) {
      this.logger.error('Weekly maintenance failed', error);
      throw error;
    }
  }

  /**
   * Monthly maintenance job - runs on the 1st at 4 AM
   */
  @Cron('0 4 1 * *', {
    name: 'monthly-ai-maintenance',
    timeZone: 'UTC',
  })
  async runMonthlyMaintenance(): Promise<MaintenanceStats> {
    this.logger.log('Starting monthly AI maintenance tasks');
    const startTime = Date.now();

    try {
      await Promise.all([
        this.optimizeKnowledgeBaseContent(),
        this.generateUsageAnalytics(),
        this.updateSearchVectors(),
      ]);

      const executionTime = Date.now() - startTime;
      const stats: MaintenanceStats = {
        conversationsArchived: 0,
        conversationsDeleted: 0,
        knowledgeEntriesOptimized: 0,
        templatesAnalyzed: 0,
        cacheEntriesCleared: 0,
        executionTime,
      };

      this.logger.log(
        `Monthly maintenance completed in ${executionTime}ms`,
        stats,
      );
      return stats;
    } catch (error) {
      this.logger.error('Monthly maintenance failed', error);
      throw error;
    }
  }

  /**
   * Archive inactive conversations
   */
  async archiveInactiveConversations(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - this.conversationConfig.autoArchiveDays,
    );

    this.logger.log(
      `Archiving conversations inactive since ${cutoffDate.toISOString()}`,
    );

    const result = await this.conversationRepository
      .createQueryBuilder()
      .update(Conversation)
      .set({ status: ConversationStatus.ARCHIVED })
      .where('lastMessageAt < :cutoffDate', { cutoffDate })
      .andWhere('status = :status', { status: ConversationStatus.ACTIVE })
      .execute();

    const archivedCount = result.affected || 0;

    if (archivedCount > 0) {
      this.logger.log(`Archived ${archivedCount} inactive conversations`);

      // Invalidate cache for archived conversations
      // Note: In a real implementation, you'd want to get the IDs first
      await this.cacheService.clearAllCache();
    }

    return archivedCount;
  }

  /**
   * Delete old archived conversations permanently
   */
  async deleteOldArchivedConversations(): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(
      cutoffDate.getDate() - this.conversationConfig.permanentDeleteDays,
    );

    this.logger.log(
      `Deleting archived conversations older than ${cutoffDate.toISOString()}`,
    );

    // Get conversation IDs to delete for cache invalidation
    const conversationsToDelete = await this.conversationRepository.find({
      select: ['id'],
      where: {
        updatedAt: LessThan(cutoffDate),
        status: ConversationStatus.ARCHIVED,
      },
      take: this.conversationConfig.batchSize,
    });

    if (conversationsToDelete.length === 0) {
      return 0;
    }

    const conversationIds = conversationsToDelete.map((c) => c.id);

    // Delete in batches to avoid performance issues
    const result = await this.conversationRepository
      .createQueryBuilder()
      .delete()
      .where('id IN (:...ids)', { ids: conversationIds })
      .execute();

    const deletedCount = result.affected || 0;

    if (deletedCount > 0) {
      this.logger.log(
        `Permanently deleted ${deletedCount} old archived conversations`,
      );

      // Invalidate cache for deleted conversations
      for (const id of conversationIds) {
        await this.cacheService.invalidateConversationCache(id);
      }
    }

    return deletedCount;
  }

  /**
   * Optimize knowledge base usage statistics
   */
  async optimizeKnowledgeBaseUsage(): Promise<number> {
    this.logger.log('Optimizing knowledge base usage statistics');

    // Update usage counts based on actual message references
    const usageUpdates = await this.knowledgeRepository
      .createQueryBuilder('kb')
      .leftJoin(
        ConversationMessage,
        'msg',
        "msg.sources @> ARRAY[kb.id::text] OR msg.metadata->>'knowledgeBaseIds' LIKE '%' || kb.id || '%'",
      )
      .select('kb.id', 'id')
      .addSelect('COUNT(msg.id)', 'actualUsage')
      .groupBy('kb.id')
      .having('COUNT(msg.id) != kb.usageCount')
      .getRawMany();

    let optimizedCount = 0;

    for (const update of usageUpdates) {
      await this.knowledgeRepository.update(
        { id: update.id },
        { usageCount: parseInt(update.actualUsage) },
      );
      optimizedCount++;
    }

    if (optimizedCount > 0) {
      this.logger.log(
        `Optimized usage statistics for ${optimizedCount} knowledge base entries`,
      );
    }

    return optimizedCount;
  }

  /**
   * Analyze template effectiveness
   */
  async analyzeTemplateEffectiveness(): Promise<number> {
    this.logger.log('Analyzing template effectiveness');

    const analysisWindow = new Date();
    analysisWindow.setDate(
      analysisWindow.getDate() - this.templateConfig.analysisWindowDays,
    );

    // Get templates with usage data
    const templates = await this.templateRepository.find({
      where: {
        usageCount: MoreThan(this.templateConfig.minUsageForAnalysis - 1),
      },
    });

    let analyzedCount = 0;

    for (const template of templates) {
      // Calculate effectiveness based on message ratings when template was used
      const effectiveness = await this.messageRepository
        .createQueryBuilder('msg')
        .select('AVG(msg.averageRating)', 'avgRating')
        .addSelect('COUNT(*)', 'usageCount')
        .where('msg.type = :type', { type: MessageType.TEMPLATE_RESPONSE })
        .andWhere("msg.metadata->>'templateId' = :templateId", {
          templateId: template.id,
        })
        .andWhere('msg.createdAt >= :analysisWindow', { analysisWindow })
        .andWhere('msg.ratingCount > 0')
        .getRawOne();

      if (effectiveness && effectiveness.usageCount > 0) {
        const effectivenessScore = parseFloat(effectiveness.avgRating) / 5.0; // Normalize to 0-1

        // Log templates with low effectiveness for review
        if (effectivenessScore < this.templateConfig.effectivenessThreshold) {
          this.logger.warn(
            `Template "${template.name}" has low effectiveness: ${effectivenessScore.toFixed(2)} ` +
              `(${effectiveness.usageCount} uses, avg rating: ${effectiveness.avgRating})`,
          );
        }

        analyzedCount++;
      }
    }

    this.logger.log(`Analyzed effectiveness for ${analyzedCount} templates`);
    return analyzedCount;
  }

  /**
   * Clean up expired cache entries
   */
  async cleanupExpiredCache(): Promise<number> {
    this.logger.log('Cleaning up expired cache entries');

    // Get cache statistics before cleanup
    const statsBefore = await this.cacheService.getCacheStats();

    // Clear cache for conversations that haven't been accessed recently
    const inactiveConversations = await this.conversationRepository.find({
      select: ['id'],
      where: {
        lastMessageAt: LessThan(new Date(Date.now() - 24 * 60 * 60 * 1000)), // 24 hours ago
        status: ConversationStatus.ACTIVE,
      },
      take: 100,
    });

    let clearedCount = 0;
    for (const conversation of inactiveConversations) {
      await this.cacheService.invalidateConversationCache(conversation.id);
      clearedCount++;
    }

    this.logger.log(`Cleared cache for ${clearedCount} inactive conversations`);
    return clearedCount;
  }

  /**
   * Optimize knowledge base content
   */
  async optimizeKnowledgeBaseContent(): Promise<void> {
    this.logger.log('Optimizing knowledge base content');

    // Identify outdated content
    const outdatedDate = new Date();
    outdatedDate.setDate(
      outdatedDate.getDate() - this.knowledgeConfig.outdatedContentDays,
    );

    const outdatedEntries = await this.knowledgeRepository.find({
      where: {
        updatedAt: LessThan(outdatedDate),
        usageCount: LessThan(this.knowledgeConfig.minUsageForOptimization),
        isActive: true,
      },
      take: this.knowledgeConfig.batchSize,
    });

    for (const entry of outdatedEntries) {
      this.logger.warn(
        `Knowledge base entry "${entry.title}" may need review: ` +
          `last updated ${entry.updatedAt.toISOString()}, usage count: ${entry.usageCount}`,
      );
    }

    // Identify low-rated content
    const lowRatedEntries = await this.knowledgeRepository.find({
      where: {
        averageRating: LessThan(this.knowledgeConfig.lowRatingThreshold),
        isActive: true,
      },
      take: this.knowledgeConfig.batchSize,
    });

    for (const entry of lowRatedEntries) {
      this.logger.warn(
        `Knowledge base entry "${entry.title}" has low rating: ${entry.averageRating}`,
      );
    }
  }

  /**
   * Generate usage analytics
   */
  async generateUsageAnalytics(): Promise<void> {
    this.logger.log('Generating usage analytics');

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // AI response analytics
    const aiResponseStats = await this.messageRepository
      .createQueryBuilder('msg')
      .select([
        'COUNT(*) as total_responses',
        'AVG(msg.confidenceScore) as avg_confidence',
        'AVG(msg.averageRating) as avg_rating',
        'COUNT(CASE WHEN msg.confidenceScore >= 0.8 THEN 1 END) as high_confidence',
        'COUNT(CASE WHEN msg.confidenceScore < 0.3 THEN 1 END) as low_confidence',
      ])
      .where('msg.type = :type', { type: MessageType.AI_RESPONSE })
      .andWhere('msg.createdAt >= :thirtyDaysAgo', { thirtyDaysAgo })
      .getRawOne();

    this.logger.log('AI Response Analytics (30 days)', aiResponseStats);

    // Knowledge base usage analytics
    const knowledgeStats = await this.knowledgeRepository
      .createQueryBuilder('kb')
      .select([
        'COUNT(*) as total_entries',
        'AVG(kb.usageCount) as avg_usage',
        'AVG(kb.averageRating) as avg_rating',
        'COUNT(CASE WHEN kb.usageCount >= 10 THEN 1 END) as popular_entries',
        'COUNT(CASE WHEN kb.usageCount = 0 THEN 1 END) as unused_entries',
      ])
      .where('kb.isActive = true')
      .getRawOne();

    this.logger.log('Knowledge Base Analytics', knowledgeStats);

    // Conversation analytics
    const conversationStats = await this.conversationRepository
      .createQueryBuilder('conv')
      .select([
        'COUNT(*) as total_conversations',
        'COUNT(CASE WHEN conv.status = :active THEN 1 END) as active_conversations',
        'COUNT(CASE WHEN conv.status = :archived THEN 1 END) as archived_conversations',
        'COUNT(CASE WHEN conv.status = :escalated THEN 1 END) as escalated_conversations',
      ])
      .setParameters({
        active: ConversationStatus.ACTIVE,
        archived: ConversationStatus.ARCHIVED,
        escalated: ConversationStatus.ESCALATED,
      })
      .getRawOne();

    this.logger.log('Conversation Analytics', conversationStats);
  }

  /**
   * Update search vectors for knowledge base entries
   */
  async updateSearchVectors(): Promise<void> {
    this.logger.log('Updating search vectors for knowledge base entries');

    // Force update of search vectors for all active entries
    await this.knowledgeRepository.query(`
      UPDATE knowledge_base_entries 
      SET search_vector = 
        setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(content, '')), 'B') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(keywords, ' '), '')), 'C') ||
        setweight(to_tsvector('english', COALESCE(array_to_string(tags, ' '), '')), 'D')
      WHERE is_active = true AND (
        search_vector IS NULL OR 
        updated_at > (SELECT MAX(updated_at) FROM knowledge_base_entries WHERE search_vector IS NOT NULL)
      )
    `);

    this.logger.log('Search vectors updated successfully');
  }

  /**
   * Manual maintenance trigger for testing/admin use
   */
  async runManualMaintenance(
    tasks: ('conversations' | 'knowledge' | 'templates' | 'cache')[] = [
      'conversations',
      'knowledge',
      'templates',
      'cache',
    ],
  ): Promise<MaintenanceStats> {
    this.logger.log('Running manual maintenance tasks', { tasks });
    const startTime = Date.now();

    let conversationsArchived = 0;
    let conversationsDeleted = 0;
    let knowledgeEntriesOptimized = 0;
    let templatesAnalyzed = 0;
    let cacheEntriesCleared = 0;

    if (tasks.includes('conversations')) {
      conversationsArchived = await this.archiveInactiveConversations();
      conversationsDeleted = await this.deleteOldArchivedConversations();
    }

    if (tasks.includes('knowledge')) {
      knowledgeEntriesOptimized = await this.optimizeKnowledgeBaseUsage();
      await this.optimizeKnowledgeBaseContent();
    }

    if (tasks.includes('templates')) {
      templatesAnalyzed = await this.analyzeTemplateEffectiveness();
    }

    if (tasks.includes('cache')) {
      cacheEntriesCleared = await this.cleanupExpiredCache();
    }

    const executionTime = Date.now() - startTime;
    const stats: MaintenanceStats = {
      conversationsArchived,
      conversationsDeleted,
      knowledgeEntriesOptimized,
      templatesAnalyzed,
      cacheEntriesCleared,
      executionTime,
    };

    this.logger.log(
      `Manual maintenance completed in ${executionTime}ms`,
      stats,
    );
    return stats;
  }

  /**
   * Get maintenance configuration
   */
  getMaintenanceConfig(): {
    conversation: ConversationCleanupConfig;
    knowledge: KnowledgeOptimizationConfig;
    template: TemplateAnalysisConfig;
  } {
    return {
      conversation: { ...this.conversationConfig },
      knowledge: { ...this.knowledgeConfig },
      template: { ...this.templateConfig },
    };
  }

  /**
   * Update maintenance configuration
   */
  updateMaintenanceConfig(config: {
    conversation?: Partial<ConversationCleanupConfig>;
    knowledge?: Partial<KnowledgeOptimizationConfig>;
    template?: Partial<TemplateAnalysisConfig>;
  }): void {
    if (config.conversation) {
      Object.assign(this.conversationConfig, config.conversation);
    }
    if (config.knowledge) {
      Object.assign(this.knowledgeConfig, config.knowledge);
    }
    if (config.template) {
      Object.assign(this.templateConfig, config.template);
    }

    this.logger.log('Maintenance configuration updated', config);
  }
}
