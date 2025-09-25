import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateKnowledgeBaseVersioningTables1703950000000
  implements MigrationInterface
{
  name = 'CreateKnowledgeBaseVersioningTables1703950000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
            CREATE TYPE "content_version_enum" AS ENUM (
                'draft',
                'published',
                'archived'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "approval_status_enum" AS ENUM (
                'pending',
                'approved',
                'rejected',
                'needs_revision'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "approval_action_enum" AS ENUM (
                'submit',
                'approve',
                'reject',
                'request_changes',
                'resubmit'
            )
        `);

    // Create knowledge_base_versions table
    await queryRunner.query(`
            CREATE TABLE "knowledge_base_versions" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "entry_id" uuid NOT NULL,
                "version_number" integer NOT NULL,
                "title" character varying(200) NOT NULL,
                "content" text NOT NULL,
                "category" character varying(100) NOT NULL,
                "tags" text array NOT NULL DEFAULT '{}',
                "keywords" text array NOT NULL DEFAULT '{}',
                "content_type" "content_type_enum" NOT NULL,
                "language" character varying(10) NOT NULL DEFAULT 'en',
                "status" "content_version_enum" NOT NULL DEFAULT 'draft',
                "changes" text,
                "summary" text,
                "source" character varying(500),
                "related_entries" text array NOT NULL DEFAULT '{}',
                "created_by" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_knowledge_base_versions" PRIMARY KEY ("id"),
                CONSTRAINT "FK_knowledge_base_versions_entry_id" FOREIGN KEY ("entry_id") REFERENCES "knowledge_base_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_knowledge_base_versions_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
            )
        `);

    // Create knowledge_base_approvals table
    await queryRunner.query(`
            CREATE TABLE "knowledge_base_approvals" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "entry_id" uuid NOT NULL,
                "status" "approval_status_enum" NOT NULL DEFAULT 'pending',
                "action" "approval_action_enum" NOT NULL,
                "submitter_id" uuid NOT NULL,
                "reviewer_id" uuid,
                "comments" text,
                "suggested_changes" text array NOT NULL DEFAULT '{}',
                "reason" character varying(500),
                "priority" integer NOT NULL DEFAULT 1,
                "due_date" TIMESTAMP,
                "reviewed_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_knowledge_base_approvals" PRIMARY KEY ("id"),
                CONSTRAINT "FK_knowledge_base_approvals_entry_id" FOREIGN KEY ("entry_id") REFERENCES "knowledge_base_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_knowledge_base_approvals_submitter_id" FOREIGN KEY ("submitter_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "FK_knowledge_base_approvals_reviewer_id" FOREIGN KEY ("reviewer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
            )
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_knowledge_base_versions_entry_id_version_number" 
            ON "knowledge_base_versions" ("entry_id", "version_number")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_knowledge_base_versions_status_created_at" 
            ON "knowledge_base_versions" ("status", "created_at")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_knowledge_base_approvals_entry_id_status" 
            ON "knowledge_base_approvals" ("entry_id", "status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_knowledge_base_approvals_status_created_at" 
            ON "knowledge_base_approvals" ("status", "created_at")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_knowledge_base_approvals_reviewer_id_status" 
            ON "knowledge_base_approvals" ("reviewer_id", "status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_knowledge_base_approvals_due_date" 
            ON "knowledge_base_approvals" ("due_date")
        `);

    // Add unique constraint for entry_id and version_number
    await queryRunner.query(`
            CREATE UNIQUE INDEX "UQ_knowledge_base_versions_entry_version" 
            ON "knowledge_base_versions" ("entry_id", "version_number")
        `);

    // Create initial versions for existing knowledge base entries
    await queryRunner.query(`
            INSERT INTO "knowledge_base_versions" (
                "entry_id",
                "version_number",
                "title",
                "content",
                "category",
                "tags",
                "keywords",
                "content_type",
                "language",
                "status",
                "changes",
                "created_by"
            )
            SELECT 
                kbe.id,
                1,
                kbe.title,
                kbe.content,
                kbe.category,
                kbe.tags,
                kbe.keywords,
                kbe.content_type,
                kbe.language,
                'published',
                'Initial version from existing entry',
                COALESCE(kbe.created_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
            FROM knowledge_base_entries kbe
            WHERE NOT EXISTS (
                SELECT 1 FROM knowledge_base_versions kbv 
                WHERE kbv.entry_id = kbe.id
            )
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "UQ_knowledge_base_versions_entry_version"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_knowledge_base_approvals_due_date"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_knowledge_base_approvals_reviewer_id_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_knowledge_base_approvals_status_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_knowledge_base_approvals_entry_id_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_knowledge_base_versions_status_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_knowledge_base_versions_entry_id_version_number"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_base_approvals"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "knowledge_base_versions"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "approval_action_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "approval_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "content_version_enum"`);
  }
}
