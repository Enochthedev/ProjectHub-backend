import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMilestoneTables1703450000000 implements MigrationInterface {
    name = 'CreateMilestoneTables1703450000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create enums
        await queryRunner.query(`
      CREATE TYPE "project_type_enum" AS ENUM('individual', 'group', 'research', 'industry')
    `);

        await queryRunner.query(`
      CREATE TYPE "note_type_enum" AS ENUM('progress', 'issue', 'solution', 'meeting', 'supervisor_feedback')
    `);

        await queryRunner.query(`
      CREATE TYPE "reminder_type_enum" AS ENUM('email', 'in_app', 'sms')
    `);

        // Create diff changes for milestone_templates
        await queryRunner.query(`
      CREATE TABLE "milestone_templates" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "specialization" character varying(100) NOT NULL,
        "project_type" "project_type_enum" NOT NULL,
        "milestone_items" jsonb NOT NULL,
        "configuration" jsonb,
        "estimated_duration_weeks" integer NOT NULL,
        "is_active" boolean NOT NULL DEFAULT true,
        "usage_count" integer NOT NULL DEFAULT 0,
        "average_rating" numeric(3,2) NOT NULL DEFAULT 0.0,
        "rating_count" integer NOT NULL DEFAULT 0,
        "tags" text array NOT NULL DEFAULT '{}',
        "created_by" uuid,
        "created_by_id" character varying,
        "archived_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_milestone_templates" PRIMARY KEY ("id")
      )
    `);

        // Create milestones table
        await queryRunner.query(`
      CREATE TABLE "milestones" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "title" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "due_date" date NOT NULL,
        "status" "milestone_status_enum" NOT NULL DEFAULT 'not_started',
        "priority" "priority_enum" NOT NULL DEFAULT 'medium',
        "student_id" uuid,
        "project_id" uuid,
        "completed_at" TIMESTAMP,
        "estimated_hours" integer NOT NULL DEFAULT 0,
        "actual_hours" integer NOT NULL DEFAULT 0,
        "blocking_reason" text,
        "isTemplate" boolean NOT NULL DEFAULT false,
        "templateId" uuid,
        "metadata" jsonb,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_milestones" PRIMARY KEY ("id")
      )
    `);

        // Create milestone_notes table
        await queryRunner.query(`
      CREATE TABLE "milestone_notes" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "milestone_id" uuid,
        "content" text NOT NULL,
        "type" "note_type_enum" NOT NULL DEFAULT 'progress',
        "author_id" uuid,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_milestone_notes" PRIMARY KEY ("id")
      )
    `);

        // Create milestone_reminders table
        await queryRunner.query(`
      CREATE TABLE "milestone_reminders" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "milestone_id" uuid,
        "reminder_type" "reminder_type_enum" NOT NULL,
        "days_before" integer NOT NULL,
        "sent" boolean NOT NULL DEFAULT false,
        "sent_at" TIMESTAMP,
        "error_message" text,
        "retry_count" integer NOT NULL DEFAULT 0,
        "next_retry_at" TIMESTAMP,
        "attempt_count" integer NOT NULL DEFAULT 0,
        "last_attempt_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_milestone_reminders" PRIMARY KEY ("id")
      )
    `);

        // Add Foreign Keys

        // Milestone Templates
        await queryRunner.query(`
      ALTER TABLE "milestone_templates" 
      ADD CONSTRAINT "FK_milestone_templates_created_by" 
      FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE SET NULL
    `);

        // Milestones
        await queryRunner.query(`
      ALTER TABLE "milestones" 
      ADD CONSTRAINT "FK_milestones_student" 
      FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "milestones" 
      ADD CONSTRAINT "FK_milestones_project" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE SET NULL
    `);

        // Milestone Notes
        await queryRunner.query(`
      ALTER TABLE "milestone_notes" 
      ADD CONSTRAINT "FK_milestone_notes_milestone" 
      FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE
    `);

        await queryRunner.query(`
      ALTER TABLE "milestone_notes" 
      ADD CONSTRAINT "FK_milestone_notes_author" 
      FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE SET NULL
    `);

        // Milestone Reminders
        await queryRunner.query(`
      ALTER TABLE "milestone_reminders" 
      ADD CONSTRAINT "FK_milestone_reminders_milestone" 
      FOREIGN KEY ("milestone_id") REFERENCES "milestones"("id") ON DELETE CASCADE
    `);

        // Basic Indexes (Complex ones are in OptimizeMilestoneIndexes)
        await queryRunner.query(`
      CREATE INDEX "IDX_milestone_templates_specialization_type" ON "milestone_templates" ("specialization", "project_type", "is_active")
    `);

        await queryRunner.query(`
      CREATE INDEX "IDX_milestone_notes_milestone_created" ON "milestone_notes" ("milestone_id", "created_at")
    `);

        await queryRunner.query(`
      CREATE INDEX "IDX_milestone_reminders_milestone_days" ON "milestone_reminders" ("milestone_id", "days_before", "sent")
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_milestone_reminders_milestone_days"`);
        await queryRunner.query(`DROP INDEX "IDX_milestone_notes_milestone_created"`);
        await queryRunner.query(`DROP INDEX "IDX_milestone_templates_specialization_type"`);

        // Drop FKs
        await queryRunner.query(`ALTER TABLE "milestone_reminders" DROP CONSTRAINT "FK_milestone_reminders_milestone"`);
        await queryRunner.query(`ALTER TABLE "milestone_notes" DROP CONSTRAINT "FK_milestone_notes_author"`);
        await queryRunner.query(`ALTER TABLE "milestone_notes" DROP CONSTRAINT "FK_milestone_notes_milestone"`);
        await queryRunner.query(`ALTER TABLE "milestones" DROP CONSTRAINT "FK_milestones_project"`);
        await queryRunner.query(`ALTER TABLE "milestones" DROP CONSTRAINT "FK_milestones_student"`);
        await queryRunner.query(`ALTER TABLE "milestone_templates" DROP CONSTRAINT "FK_milestone_templates_created_by"`);

        // Drop tables
        await queryRunner.query(`DROP TABLE "milestone_reminders"`);
        await queryRunner.query(`DROP TABLE "milestone_notes"`);
        await queryRunner.query(`DROP TABLE "milestones"`);
        await queryRunner.query(`DROP TABLE "milestone_templates"`);

        // Drop Enums
        await queryRunner.query(`DROP TYPE "reminder_type_enum"`);
        await queryRunner.query(`DROP TYPE "note_type_enum"`);
        await queryRunner.query(`DROP TYPE "project_type_enum"`);
    }
}
