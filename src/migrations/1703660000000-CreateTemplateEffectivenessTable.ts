import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplateEffectivenessTable1703660000000 implements MigrationInterface {
    name = 'CreateTemplateEffectivenessTable1703660000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create completion status enum
        await queryRunner.query(`
      CREATE TYPE "template_effectiveness_completion_status_enum" AS ENUM(
        'not_started', 'in_progress', 'completed', 'abandoned'
      )
    `);

        // Create template_effectiveness table
        await queryRunner.query(`
      CREATE TABLE "template_effectiveness" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "project_id" uuid NOT NULL,
        "student_id" uuid NOT NULL,
        "completion_status" "template_effectiveness_completion_status_enum" NOT NULL DEFAULT 'not_started',
        "total_milestones" integer NOT NULL DEFAULT 0,
        "completed_milestones" integer NOT NULL DEFAULT 0,
        "overdue_milestones" integer NOT NULL DEFAULT 0,
        "completion_percentage" decimal(5,2),
        "actual_duration_days" integer,
        "estimated_duration_days" integer,
        "duration_variance" decimal(5,2),
        "total_time_spent_hours" integer,
        "estimated_time_hours" integer,
        "time_variance" decimal(5,2),
        "milestone_completion_data" jsonb,
        "customizations" jsonb,
        "student_rating" integer,
        "student_feedback" text,
        "difficulty_ratings" jsonb,
        "improvement_suggestions" jsonb,
        "is_recommended" boolean NOT NULL DEFAULT false,
        "started_at" TIMESTAMP,
        "completed_at" TIMESTAMP,
        "last_activity_at" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_effectiveness" PRIMARY KEY ("id")
      )
    `);

        // Create unique index on template_id and project_id
        await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_template_effectiveness_unique" 
      ON "template_effectiveness" ("template_id", "project_id")
    `);

        // Create index on template_id and completion_status
        await queryRunner.query(`
      CREATE INDEX "IDX_template_effectiveness_completion" 
      ON "template_effectiveness" ("template_id", "completion_status")
    `);

        // Create index on template_id and created_at for analytics
        await queryRunner.query(`
      CREATE INDEX "IDX_template_effectiveness_created" 
      ON "template_effectiveness" ("template_id", "created_at")
    `);

        // Create index on student_id for student progress tracking
        await queryRunner.query(`
      CREATE INDEX "IDX_template_effectiveness_student" 
      ON "template_effectiveness" ("student_id", "completion_status")
    `);

        // Create index on completion_status and last_activity_at for monitoring
        await queryRunner.query(`
      CREATE INDEX "IDX_template_effectiveness_activity" 
      ON "template_effectiveness" ("completion_status", "last_activity_at")
    `);

        // Add foreign key constraint to milestone_templates
        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      ADD CONSTRAINT "FK_template_effectiveness_template" 
      FOREIGN KEY ("template_id") REFERENCES "milestone_templates"("id") 
      ON DELETE CASCADE
    `);

        // Add foreign key constraint to projects
        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      ADD CONSTRAINT "FK_template_effectiveness_project" 
      FOREIGN KEY ("project_id") REFERENCES "projects"("id") 
      ON DELETE CASCADE
    `);

        // Add foreign key constraint to users (students)
        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      ADD CONSTRAINT "FK_template_effectiveness_student" 
      FOREIGN KEY ("student_id") REFERENCES "users"("id") 
      ON DELETE RESTRICT
    `);

        // Add check constraints
        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      ADD CONSTRAINT "CHK_template_effectiveness_milestones" 
      CHECK ("total_milestones" >= 0 AND "completed_milestones" >= 0 AND "overdue_milestones" >= 0)
    `);

        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      ADD CONSTRAINT "CHK_template_effectiveness_completion" 
      CHECK ("completion_percentage" >= 0 AND "completion_percentage" <= 100)
    `);

        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      ADD CONSTRAINT "CHK_template_effectiveness_rating" 
      CHECK ("student_rating" IS NULL OR ("student_rating" >= 1 AND "student_rating" <= 5))
    `);

        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      ADD CONSTRAINT "CHK_template_effectiveness_duration" 
      CHECK ("actual_duration_days" IS NULL OR "actual_duration_days" >= 0)
    `);

        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      ADD CONSTRAINT "CHK_template_effectiveness_time" 
      CHECK ("total_time_spent_hours" IS NULL OR "total_time_spent_hours" >= 0)
    `);

        // Add trigger to update updated_at timestamp
        await queryRunner.query(`
      CREATE OR REPLACE FUNCTION update_template_effectiveness_updated_at()
      RETURNS TRIGGER AS $$
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

        await queryRunner.query(`
      CREATE TRIGGER update_template_effectiveness_updated_at
        BEFORE UPDATE ON "template_effectiveness"
        FOR EACH ROW
        EXECUTE FUNCTION update_template_effectiveness_updated_at();
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop trigger and function
        await queryRunner.query(`DROP TRIGGER IF EXISTS update_template_effectiveness_updated_at ON "template_effectiveness"`);
        await queryRunner.query(`DROP FUNCTION IF EXISTS update_template_effectiveness_updated_at()`);

        // Drop foreign key constraints
        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      DROP CONSTRAINT "FK_template_effectiveness_student"
    `);

        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      DROP CONSTRAINT "FK_template_effectiveness_project"
    `);

        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      DROP CONSTRAINT "FK_template_effectiveness_template"
    `);

        // Drop check constraints
        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      DROP CONSTRAINT "CHK_template_effectiveness_time"
    `);

        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      DROP CONSTRAINT "CHK_template_effectiveness_duration"
    `);

        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      DROP CONSTRAINT "CHK_template_effectiveness_rating"
    `);

        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      DROP CONSTRAINT "CHK_template_effectiveness_completion"
    `);

        await queryRunner.query(`
      ALTER TABLE "template_effectiveness" 
      DROP CONSTRAINT "CHK_template_effectiveness_milestones"
    `);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_template_effectiveness_activity"`);
        await queryRunner.query(`DROP INDEX "IDX_template_effectiveness_student"`);
        await queryRunner.query(`DROP INDEX "IDX_template_effectiveness_created"`);
        await queryRunner.query(`DROP INDEX "IDX_template_effectiveness_completion"`);
        await queryRunner.query(`DROP INDEX "IDX_template_effectiveness_unique"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "template_effectiveness"`);

        // Drop enum
        await queryRunner.query(`DROP TYPE "template_effectiveness_completion_status_enum"`);
    }
}
