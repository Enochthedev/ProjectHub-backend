import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeAIAssistantIndexes1703800000000
  implements MigrationInterface
{
  name = 'OptimizeAIAssistantIndexes1703800000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Conversation table indexes for AI assistant queries
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conversations_student_status" 
            ON "conversations" ("student_id", "status") 
            WHERE "status" = 'active'
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conversations_project_active" 
            ON "conversations" ("project_id", "status") 
            WHERE "project_id" IS NOT NULL AND "status" = 'active'
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conversations_last_message" 
            ON "conversations" ("last_message_at" DESC) 
            WHERE "status" = 'active'
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conversations_language_status" 
            ON "conversations" ("language", "status") 
            WHERE "status" = 'active'
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conversations_context_gin" 
            ON "conversations" USING GIN ("context") 
            WHERE "context" IS NOT NULL
        `);

    // Conversation messages indexes for performance
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_conversation_created" 
            ON "conversation_messages" ("conversation_id", "created_at" ASC)
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_type_confidence" 
            ON "conversation_messages" ("type", "confidence_score" DESC) 
            WHERE "confidence_score" IS NOT NULL
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_bookmarked_user" 
            ON "conversation_messages" ("conversation_id") 
            WHERE "is_bookmarked" = true
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_ai_responses" 
            ON "conversation_messages" ("type", "created_at" DESC) 
            WHERE "type" = 'ai_response'
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_content_search" 
            ON "conversation_messages" USING GIN (to_tsvector('english', "content")) 
            WHERE "type" IN ('user_query', 'ai_response')
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_metadata_gin" 
            ON "conversation_messages" USING GIN ("metadata") 
            WHERE "metadata" IS NOT NULL
        `);

    // Knowledge base entries indexes for full-text search optimization
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_knowledge_category_active" 
            ON "knowledge_base_entries" ("category", "is_active") 
            WHERE "is_active" = true
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_knowledge_content_type_lang" 
            ON "knowledge_base_entries" ("content_type", "language", "is_active") 
            WHERE "is_active" = true
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_knowledge_usage_rating" 
            ON "knowledge_base_entries" ("usage_count" DESC, "average_rating" DESC) 
            WHERE "is_active" = true
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_knowledge_tags_gin" 
            ON "knowledge_base_entries" USING GIN ("tags") 
            WHERE "is_active" = true
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_knowledge_keywords_gin" 
            ON "knowledge_base_entries" USING GIN ("keywords") 
            WHERE "is_active" = true
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_knowledge_created_by_date" 
            ON "knowledge_base_entries" ("created_by", "created_at" DESC) 
            WHERE "is_active" = true
        `);

    // Composite index for complex AI assistant queries
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_conversations_complex_search" 
            ON "conversations" ("student_id", "status", "language", "last_message_at" DESC) 
            WHERE "status" IN ('active', 'escalated')
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_messages_ai_analysis" 
            ON "conversation_messages" ("type", "confidence_score", "average_rating", "created_at" DESC) 
            WHERE "type" = 'ai_response' AND "confidence_score" IS NOT NULL
        `);

    // Update search vector trigger for knowledge base entries
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_knowledge_search_vector()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW.search_vector := 
                    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B') ||
                    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.keywords, ' '), '')), 'C') ||
                    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'D');
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    await queryRunner.query(`
            DROP TRIGGER IF EXISTS update_knowledge_search_vector_trigger ON knowledge_base_entries;
        `);

    await queryRunner.query(`
            CREATE TRIGGER update_knowledge_search_vector_trigger
                BEFORE INSERT OR UPDATE ON knowledge_base_entries
                FOR EACH ROW EXECUTE FUNCTION update_knowledge_search_vector();
        `);

    // Optimize existing search vector index
    await queryRunner.query(`
            DROP INDEX IF EXISTS knowledge_search_idx;
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY "knowledge_search_idx" 
            ON "knowledge_base_entries" USING GIN ("search_vector") 
            WHERE "is_active" = true;
        `);

    // Create statistics for query planner optimization
    await queryRunner.query(`
            CREATE STATISTICS IF NOT EXISTS "conversations_multi_column_stats" 
            ON "student_id", "status", "language" 
            FROM "conversations";
        `);

    await queryRunner.query(`
            CREATE STATISTICS IF NOT EXISTS "messages_multi_column_stats" 
            ON "conversation_id", "type", "confidence_score" 
            FROM "conversation_messages";
        `);

    await queryRunner.query(`
            CREATE STATISTICS IF NOT EXISTS "knowledge_multi_column_stats" 
            ON "category", "content_type", "language", "is_active" 
            FROM "knowledge_base_entries";
        `);

    // Analyze tables for updated statistics
    await queryRunner.query(`ANALYZE conversations;`);
    await queryRunner.query(`ANALYZE conversation_messages;`);
    await queryRunner.query(`ANALYZE knowledge_base_entries;`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop statistics
    await queryRunner.query(
      `DROP STATISTICS IF EXISTS "conversations_multi_column_stats";`,
    );
    await queryRunner.query(
      `DROP STATISTICS IF EXISTS "messages_multi_column_stats";`,
    );
    await queryRunner.query(
      `DROP STATISTICS IF EXISTS "knowledge_multi_column_stats";`,
    );

    // Drop conversation indexes
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_conversations_student_status";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_conversations_project_active";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_conversations_last_message";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_conversations_language_status";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_conversations_context_gin";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_conversations_complex_search";`,
    );

    // Drop message indexes
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_messages_conversation_created";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_messages_type_confidence";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_messages_bookmarked_user";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_messages_ai_responses";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_messages_content_search";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_messages_metadata_gin";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_messages_ai_analysis";`,
    );

    // Drop knowledge base indexes
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_knowledge_category_active";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_knowledge_content_type_lang";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_knowledge_usage_rating";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_knowledge_tags_gin";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_knowledge_keywords_gin";`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_knowledge_created_by_date";`,
    );

    // Drop search vector trigger and function
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_knowledge_search_vector_trigger ON knowledge_base_entries;`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_knowledge_search_vector();`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "knowledge_search_idx";`,
    );
  }
}
