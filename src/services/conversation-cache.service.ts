import { Injectable, Inject } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import type { Cache } from 'cache-manager';
import { Conversation } from '../entities/conversation.entity';
import { ConversationMessage } from '../entities/conversation-message.entity';
import { ConversationContext } from '../entities/interfaces/conversation.interface';

export interface CachedResponse {
  response: string;
  confidenceScore: number;
  sources: string[];
  metadata: any;
  timestamp: Date;
}

export interface ConversationCacheStats {
  contextHits: number;
  contextMisses: number;
  responseHits: number;
  responseMisses: number;
  totalCacheSize: number;
}

@Injectable()
export class ConversationCacheService {
  // Cache TTL configurations (in seconds)
  private readonly CONTEXT_CACHE_TTL = 1800; // 30 minutes
  private readonly RESPONSE_CACHE_TTL = 3600; // 1 hour
  private readonly CONVERSATION_CACHE_TTL = 900; // 15 minutes
  private readonly FREQUENT_RESPONSE_TTL = 7200; // 2 hours
  private readonly STATS_CACHE_TTL = 300; // 5 minutes

  // Cache key prefixes
  private readonly CONTEXT_PREFIX = 'ai:context:';
  private readonly RESPONSE_PREFIX = 'ai:response:';
  private readonly CONVERSATION_PREFIX = 'ai:conversation:';
  private readonly FREQUENT_PREFIX = 'ai:frequent:';
  private readonly STATS_PREFIX = 'ai:stats:';

  constructor(@Inject(CACHE_MANAGER) private readonly cacheManager: Cache) {}

  /**
   * Cache conversation context with TTL management
   */
  async setCachedContext(
    conversationId: string,
    context: ConversationContext,
  ): Promise<void> {
    const cacheKey = `${this.CONTEXT_PREFIX}${conversationId}`;
    await this.cacheManager.set(cacheKey, context, this.CONTEXT_CACHE_TTL);
  }

  /**
   * Retrieve cached conversation context
   */
  async getCachedContext(
    conversationId: string,
  ): Promise<ConversationContext | null> {
    const cacheKey = `${this.CONTEXT_PREFIX}${conversationId}`;
    const cached = await this.cacheManager.get<ConversationContext>(cacheKey);
    return cached || null;
  }

  /**
   * Cache AI response for frequently asked questions
   */
  async setCachedResponse(
    queryHash: string,
    response: CachedResponse,
    isFrequent: boolean = false,
  ): Promise<void> {
    const prefix = isFrequent ? this.FREQUENT_PREFIX : this.RESPONSE_PREFIX;
    const ttl = isFrequent
      ? this.FREQUENT_RESPONSE_TTL
      : this.RESPONSE_CACHE_TTL;
    const cacheKey = `${prefix}${queryHash}`;

    await this.cacheManager.set(cacheKey, response, ttl);
  }

  /**
   * Retrieve cached AI response
   */
  async getCachedResponse(queryHash: string): Promise<CachedResponse | null> {
    // Try frequent responses first (longer TTL)
    let cacheKey = `${this.FREQUENT_PREFIX}${queryHash}`;
    let cached = await this.cacheManager.get<CachedResponse>(cacheKey);

    if (cached) {
      return cached;
    }

    // Try regular responses
    cacheKey = `${this.RESPONSE_PREFIX}${queryHash}`;
    cached = await this.cacheManager.get<CachedResponse>(cacheKey);

    return cached || null;
  }

  /**
   * Cache full conversation data
   */
  async setCachedConversation(
    conversationId: string,
    conversation: Conversation,
  ): Promise<void> {
    const cacheKey = `${this.CONVERSATION_PREFIX}${conversationId}`;
    await this.cacheManager.set(
      cacheKey,
      conversation,
      this.CONVERSATION_CACHE_TTL,
    );
  }

  /**
   * Retrieve cached conversation
   */
  async getCachedConversation(
    conversationId: string,
  ): Promise<Conversation | null> {
    const cacheKey = `${this.CONVERSATION_PREFIX}${conversationId}`;
    const cached = await this.cacheManager.get<Conversation>(cacheKey);
    return cached || null;
  }

  /**
   * Cache conversation messages
   */
  async setCachedMessages(
    conversationId: string,
    messages: ConversationMessage[],
  ): Promise<void> {
    const cacheKey = `${this.CONVERSATION_PREFIX}${conversationId}:messages`;
    await this.cacheManager.set(
      cacheKey,
      messages,
      this.CONVERSATION_CACHE_TTL,
    );
  }

  /**
   * Retrieve cached conversation messages
   */
  async getCachedMessages(
    conversationId: string,
  ): Promise<ConversationMessage[] | null> {
    const cacheKey = `${this.CONVERSATION_PREFIX}${conversationId}:messages`;
    const cached = await this.cacheManager.get<ConversationMessage[]>(cacheKey);
    return cached || null;
  }

  /**
   * Generate cache key for query hash
   */
  generateQueryHash(
    query: string,
    context?: Partial<ConversationContext>,
  ): string {
    const crypto = require('crypto');
    const contextString = context ? JSON.stringify(context) : '';
    const combined = `${query.toLowerCase().trim()}:${contextString}`;
    return crypto.createHash('sha256').update(combined).digest('hex');
  }

  /**
   * Invalidate conversation-related caches
   */
  async invalidateConversationCache(conversationId: string): Promise<void> {
    const keys = [
      `${this.CONTEXT_PREFIX}${conversationId}`,
      `${this.CONVERSATION_PREFIX}${conversationId}`,
      `${this.CONVERSATION_PREFIX}${conversationId}:messages`,
    ];

    await Promise.all(keys.map((key) => this.cacheManager.del(key)));
  }

  /**
   * Invalidate response cache by pattern
   */
  async invalidateResponseCache(pattern?: string): Promise<void> {
    // Note: This is a simplified implementation
    // In production, you might want to use Redis SCAN for pattern matching
    if (pattern) {
      // For now, we'll just clear specific keys if we have them
      // A more sophisticated implementation would use Redis SCAN
      console.warn('Pattern-based cache invalidation not fully implemented');
    }
  }

  /**
   * Mark response as frequently accessed
   */
  async markAsFrequentResponse(queryHash: string): Promise<void> {
    const response = await this.getCachedResponse(queryHash);
    if (response) {
      await this.setCachedResponse(queryHash, response, true);
    }
  }

  /**
   * Get cache statistics
   */
  async getCacheStats(): Promise<ConversationCacheStats> {
    const statsKey = `${this.STATS_PREFIX}conversation`;
    let stats = await this.cacheManager.get<ConversationCacheStats>(statsKey);

    if (!stats) {
      stats = {
        contextHits: 0,
        contextMisses: 0,
        responseHits: 0,
        responseMisses: 0,
        totalCacheSize: 0,
      };
      await this.cacheManager.set(statsKey, stats, this.STATS_CACHE_TTL);
    }

    return stats;
  }

  /**
   * Update cache statistics
   */
  async updateCacheStats(
    type: 'context' | 'response',
    hit: boolean,
  ): Promise<void> {
    const stats = await this.getCacheStats();

    if (type === 'context') {
      if (hit) {
        stats.contextHits++;
      } else {
        stats.contextMisses++;
      }
    } else if (type === 'response') {
      if (hit) {
        stats.responseHits++;
      } else {
        stats.responseMisses++;
      }
    }

    const statsKey = `${this.STATS_PREFIX}conversation`;
    await this.cacheManager.set(statsKey, stats, this.STATS_CACHE_TTL);
  }

  /**
   * Warm up cache with frequently accessed data
   */
  async warmUpCache(
    conversations: Conversation[],
    contexts: Map<string, ConversationContext>,
  ): Promise<void> {
    const promises: Promise<void>[] = [];

    // Cache conversations
    for (const conversation of conversations) {
      promises.push(this.setCachedConversation(conversation.id, conversation));

      if (conversation.messages) {
        promises.push(
          this.setCachedMessages(conversation.id, conversation.messages),
        );
      }
    }

    // Cache contexts
    for (const [conversationId, context] of contexts) {
      promises.push(this.setCachedContext(conversationId, context));
    }

    await Promise.all(promises);
  }

  /**
   * Clear all conversation-related caches
   */
  async clearAllCache(): Promise<void> {
    // Note: This is a simplified implementation
    // In production, you would use Redis FLUSHDB or pattern-based deletion
    console.warn(
      'Clear all cache not fully implemented - would require Redis SCAN',
    );
  }

  /**
   * Get cache hit ratio
   */
  async getCacheHitRatio(): Promise<{
    contextHitRatio: number;
    responseHitRatio: number;
    overallHitRatio: number;
  }> {
    const stats = await this.getCacheStats();

    const contextTotal = stats.contextHits + stats.contextMisses;
    const responseTotal = stats.responseHits + stats.responseMisses;
    const overallTotal = contextTotal + responseTotal;

    return {
      contextHitRatio: contextTotal > 0 ? stats.contextHits / contextTotal : 0,
      responseHitRatio:
        responseTotal > 0 ? stats.responseHits / responseTotal : 0,
      overallHitRatio:
        overallTotal > 0
          ? (stats.contextHits + stats.responseHits) / overallTotal
          : 0,
    };
  }

  /**
   * Set cache TTL for different types
   */
  async extendCacheTTL(
    key: string,
    type: 'context' | 'response' | 'conversation',
  ): Promise<void> {
    const ttlMap = {
      context: this.CONTEXT_CACHE_TTL,
      response: this.RESPONSE_CACHE_TTL,
      conversation: this.CONVERSATION_CACHE_TTL,
    };

    const value = await this.cacheManager.get(key);
    if (value) {
      await this.cacheManager.set(key, value, ttlMap[type]);
    }
  }
}
