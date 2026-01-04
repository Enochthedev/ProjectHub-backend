import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAIChatTables1703680000000 implements MigrationInterface {
  name = 'CreateAIChatTables1703680000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enums
    await queryRunner.query(`
      CREATE TYPE "conversation_status_enum" AS ENUM('active', 'archived', 'escalated')
    `);

    await queryRunner.query(`
      CREATE TYPE "message_type_enum" AS ENUM('user_query', 'ai_response', 'template_response', 'system_message')
    `);

    await queryRunner.query(`
      CREATE TYPE "message_status_enum" AS ENUM('delivered', 'failed', 'processing')
    `);

    await queryRunner.query(`
      CREATE TYPE "content_type_enum" AS ENUM('guideline', 'template', 'example', 'faq', 'policy')
    `);

    // Create conversations table
    await queryRunner.query(`
      CREATE TABLE "conversations" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "student_id" uuid,
        "title" character varying(200) NOT NULL,
        "status" "conversation_status_enum" NOT NULL DEFAULT 'active',
        "context" jsonb,
        "project_id" uuid,
        "language" character varying(10) DEFAULT 'en',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "last_message_at" TIMESTAMP,
        CONSTRAINT "PK_conversations" PRIMARY KEY ("id")
      )
    `);

    // Create conversation_messages table
    await queryRunner.query(`
      CREATE TABLE "conversation_messages" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "conversation_id" uuid,
        "type" "message_type_enum" NOT NULL,
        "content" text NOT NULL,
        "metadata" jsonb,
        "confidence_score" decimal(3,2),
        "sources" text array DEFAULT '{}',
        "is_bookmarked" boolean DEFAULT false,
        "status" "message_status_enum" DEFAULT 'delivered',
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_conversation_messages" PRIMARY KEY ("id")
      )
    `);

    // Create knowledge_base_entries table
    await queryRunner.query(`
      CREATE TABLE "knowledge_base_entries" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying(200) NOT NULL,
        "content" text NOT NULL,
        "category" character varying(100) NOT NULL,
        "tags" text array DEFAULT '{}',
        "keywords" text array DEFAULT '{}',
        "content_type" "content_type_enum" NOT NULL,
        "language" character varying(10) DEFAULT 'en',
        "is_active" boolean DEFAULT true,
        "usage_count" integer DEFAULT 0,
        "average_rating" decimal(3,2) DEFAULT 0.0,
        "created_by" uuid,
        "created_by_id" character varying,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        "search_vector" tsvector,
        CONSTRAINT "PK_knowledge_base_entries" PRIMARY KEY ("id")
      )
    `);

    // Add Foreign Keys for conversations
    await queryRunner.query(`
      ALTER TABLE "conversations" 
      ADD CONSTRAINT "FK_conversations_student" 
      FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "conversations" 
      ADD CONSTRAINT "FK_conversations_project" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL
    `);

    // Add Foreign Keys for conversation_messages
    await queryRunner.query(`
      ALTER TABLE "conversation_messages" 
      ADD CONSTRAINT "FK_conversation_messages_conversation" 
      FOREIGN KEY ("conversation_id") REFERENCES "conversations"("id") ON DELETE CASCADE
    `);

    // Add Foreign Keys for knowledge_base_entries
    await queryRunner.query(`
      ALTER TABLE "knowledge_base_entries" 
      ADD CONSTRAINT "FK_knowledge_base_entries_created_by" 
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop FKs
    await queryRunner.query(`ALTER TABLE "knowledge_base_entries" DROP CONSTRAINT "FK_knowledge_base_entries_created_by"`);
    await queryRunner.query(`ALTER TABLE "conversation_messages" DROP CONSTRAINT "FK_conversation_messages_conversation"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_project"`);
    await queryRunner.query(`ALTER TABLE "conversations" DROP CONSTRAINT "FK_conversations_student"`);

    // Drop tables
    await queryRunner.query(`DROP TABLE "knowledge_base_entries"`);
    await queryRunner.query(`DROP TABLE "conversation_messages"`);
    await queryRunner.query(`DROP TABLE "conversations"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "content_type_enum"`);
    await queryRunner.query(`DROP TYPE "message_status_enum"`);
    await queryRunner.query(`DROP TYPE "message_type_enum"`);
    await queryRunner.query(`DROP TYPE "conversation_status_enum"`);
  }
}
