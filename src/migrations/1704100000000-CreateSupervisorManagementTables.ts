import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSupervisorManagementTables1704100000000 implements MigrationInterface {
    name = 'CreateSupervisorManagementTables1704100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Enums
        await queryRunner.query(`
            CREATE TYPE "supervisor_availability_type_enum" AS ENUM ('office_hours', 'meeting_slots', 'unavailable')
        `);
        await queryRunner.query(`
            CREATE TYPE "ai_review_status_enum" AS ENUM ('pending', 'approved', 'escalated', 'flagged', 'resolved')
        `);
        await queryRunner.query(`
            CREATE TYPE "ai_review_category_enum" AS ENUM ('accuracy', 'appropriateness', 'completeness', 'safety', 'policy_violation')
        `);
        await queryRunner.query(`
            CREATE TYPE "report_type_enum" AS ENUM ('student_progress', 'milestone_summary', 'ai_interaction_summary', 'performance_analytics', 'custom')
        `);
        await queryRunner.query(`
            CREATE TYPE "report_format_enum" AS ENUM ('pdf', 'csv', 'json')
        `);
        await queryRunner.query(`
            CREATE TYPE "report_status_enum" AS ENUM ('generating', 'completed', 'failed', 'expired')
        `);

        // supervisor_analytics
        await queryRunner.query(`
            CREATE TABLE "supervisor_analytics" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "supervisorId" uuid NOT NULL,
                "metricType" character varying(50) NOT NULL,
                "value" decimal(10,2) NOT NULL,
                "periodStart" date NOT NULL,
                "periodEnd" date NOT NULL,
                "metadata" jsonb,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_supervisor_analytics" PRIMARY KEY ("id"),
                CONSTRAINT "FK_supervisor_analytics_supervisorId" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        // Index
        await queryRunner.query(`
            CREATE INDEX "IDX_supervisor_analytics_supervisor_metric_period" 
            ON "supervisor_analytics" ("supervisorId", "metricType", "periodStart")
        `);

        // supervisor_availability
        await queryRunner.query(`
            CREATE TABLE "supervisor_availability" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "supervisorId" uuid NOT NULL,
                "type" "supervisor_availability_type_enum" NOT NULL DEFAULT 'office_hours',
                "dayOfWeek" integer NOT NULL,
                "startTime" time NOT NULL,
                "endTime" time NOT NULL,
                "location" character varying(255),
                "notes" text,
                "maxCapacity" integer DEFAULT 1,
                "isActive" boolean DEFAULT true,
                "effectiveFrom" date,
                "effectiveUntil" date,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_supervisor_availability" PRIMARY KEY ("id"),
                CONSTRAINT "FK_supervisor_availability_supervisorId" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        // Index
        await queryRunner.query(`
            CREATE INDEX "IDX_supervisor_availability_supervisor_day_time" 
            ON "supervisor_availability" ("supervisorId", "dayOfWeek", "startTime")
        `);

        // ai_interaction_reviews
        await queryRunner.query(`
            CREATE TABLE "ai_interaction_reviews" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "conversationId" uuid NOT NULL,
                "supervisorId" uuid NOT NULL,
                "studentId" uuid,
                "status" "ai_review_status_enum" NOT NULL DEFAULT 'pending',
                "categories" "ai_review_category_enum"[] DEFAULT '{}',
                "confidenceScore" decimal(3,2),
                "reviewNotes" text,
                "supervisorFeedback" text,
                "aiResponseMetadata" jsonb,
                "requiresFollowUp" boolean DEFAULT false,
                "reviewedAt" TIMESTAMP,
                "resolvedAt" TIMESTAMP,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_interaction_reviews" PRIMARY KEY ("id"),
                CONSTRAINT "FK_ai_interaction_reviews_conversationId" FOREIGN KEY ("conversationId") REFERENCES "conversations"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_ai_interaction_reviews_supervisorId" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE CASCADE,
                CONSTRAINT "FK_ai_interaction_reviews_studentId" FOREIGN KEY ("studentId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        // Indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_ai_interaction_reviews_supervisor_status_created" 
            ON "ai_interaction_reviews" ("supervisorId", "status", "createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_ai_interaction_reviews_conversation_status" 
            ON "ai_interaction_reviews" ("conversationId", "status")
        `);

        // supervisor_reports
        await queryRunner.query(`
            CREATE TABLE "supervisor_reports" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "supervisorId" uuid NOT NULL,
                "type" "report_type_enum" NOT NULL DEFAULT 'student_progress',
                "format" "report_format_enum" NOT NULL DEFAULT 'pdf',
                "status" "report_status_enum" NOT NULL DEFAULT 'generating',
                "title" character varying(255) NOT NULL,
                "description" text,
                "filters" jsonb,
                "parameters" jsonb,
                "filename" character varying(255),
                "filePath" character varying(255),
                "mimeType" character varying(100),
                "fileSize" bigint,
                "generatedAt" TIMESTAMP,
                "expiresAt" TIMESTAMP,
                "downloadCount" integer DEFAULT 0,
                "lastDownloadedAt" TIMESTAMP,
                "errorMessage" text,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_supervisor_reports" PRIMARY KEY ("id"),
                CONSTRAINT "FK_supervisor_reports_supervisorId" FOREIGN KEY ("supervisorId") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);
        // Indexes
        await queryRunner.query(`
            CREATE INDEX "IDX_supervisor_reports_supervisor_type_created" 
            ON "supervisor_reports" ("supervisorId", "type", "createdAt")
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_supervisor_reports_status_created" 
            ON "supervisor_reports" ("status", "createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop tables
        await queryRunner.query('DROP TABLE IF EXISTS "supervisor_reports"');
        await queryRunner.query('DROP TABLE IF EXISTS "ai_interaction_reviews"');
        await queryRunner.query('DROP TABLE IF EXISTS "supervisor_availability"');
        await queryRunner.query('DROP TABLE IF EXISTS "supervisor_analytics"');

        // Drop enums
        await queryRunner.query('DROP TYPE IF EXISTS "report_status_enum"');
        await queryRunner.query('DROP TYPE IF EXISTS "report_format_enum"');
        await queryRunner.query('DROP TYPE IF EXISTS "report_type_enum"');
        await queryRunner.query('DROP TYPE IF EXISTS "ai_review_category_enum"');
        await queryRunner.query('DROP TYPE IF EXISTS "ai_review_status_enum"');
        await queryRunner.query('DROP TYPE IF EXISTS "supervisor_availability_type_enum"');
    }
}