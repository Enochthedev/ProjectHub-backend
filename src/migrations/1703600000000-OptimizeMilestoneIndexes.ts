import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeMilestoneIndexes1703600000000
  implements MigrationInterface
{
  name = 'OptimizeMilestoneIndexes1703600000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Composite indexes for common milestone query patterns

    // Index for student milestone queries with status filtering
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_student_status_due" 
            ON "milestones" ("student_id", "status", "due_date")
        `);

    // Index for student milestone queries with priority filtering
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_student_priority_due" 
            ON "milestones" ("student_id", "priority", "due_date")
        `);

    // Index for project-based milestone queries
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_project_status_due" 
            ON "milestones" ("project_id", "status", "due_date") 
            WHERE "project_id" IS NOT NULL
        `);

    // Partial index for active milestones (not completed or cancelled)
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_active_due_date" 
            ON "milestones" ("due_date", "priority", "student_id") 
            WHERE "status" NOT IN ('completed', 'cancelled')
        `);

    // Partial index for overdue milestones
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_overdue" 
            ON "milestones" ("student_id", "due_date", "priority") 
            WHERE "due_date" < CURRENT_DATE AND "status" NOT IN ('completed', 'cancelled')
        `);

    // Partial index for blocked milestones
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_blocked" 
            ON "milestones" ("student_id", "updated_at", "priority") 
            WHERE "status" = 'blocked'
        `);

    // Index for completion tracking and analytics
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_completed_analytics" 
            ON "milestones" ("student_id", "completed_at", "estimated_hours", "actual_hours") 
            WHERE "status" = 'completed' AND "completed_at" IS NOT NULL
        `);

    // Index for milestone reminders optimization
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestone_reminders_processing" 
            ON "milestone_reminders" ("milestone_id", "days_before", "sent") 
            WHERE NOT "sent"
        `);

    // Index for reminder scheduling by due date
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestone_reminders_due_date_lookup" 
            ON "milestone_reminders" ("milestone_id") 
            INCLUDE ("days_before", "sent", "reminder_type")
        `);

    // Composite index for milestone notes queries
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestone_notes_milestone_created" 
            ON "milestone_notes" ("milestone_id", "created_at", "type")
        `);

    // Index for milestone template usage tracking
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestone_templates_usage" 
            ON "milestone_templates" ("specialization", "project_type", "is_active", "usage_count")
        `);

    // Index for milestone search functionality
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_search" 
            ON "milestones" USING gin(to_tsvector('english', "title" || ' ' || "description"))
        `);

    // Supervisor reporting optimization indexes

    // Index for supervisor dashboard queries (assuming supervisor relationship through projects)
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_supervisor_reporting" 
            ON "milestones" ("student_id", "status", "due_date", "priority") 
            INCLUDE ("completed_at", "estimated_hours", "actual_hours")
        `);

    // Index for at-risk student identification
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_risk_analysis" 
            ON "milestones" ("student_id", "status", "due_date") 
            WHERE ("status" = 'blocked' OR "due_date" < CURRENT_DATE) 
            AND "status" NOT IN ('completed', 'cancelled')
        `);

    // Index for progress velocity calculations
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_velocity_tracking" 
            ON "milestones" ("student_id", "completed_at") 
            WHERE "status" = 'completed' AND "completed_at" IS NOT NULL
        `);

    // Performance optimization for milestone counts and aggregations
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_aggregation" 
            ON "milestones" ("student_id", "status") 
            INCLUDE ("priority", "estimated_hours", "actual_hours")
        `);

    // Index for academic calendar integration
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_academic_calendar" 
            ON "milestones" ("due_date", "created_at") 
            WHERE "status" NOT IN ('completed', 'cancelled')
        `);

    // Covering index for milestone list queries with common filters
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_milestones_list_covering" 
            ON "milestones" ("student_id", "due_date") 
            INCLUDE ("id", "title", "status", "priority", "project_id", "estimated_hours", "updated_at")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all the indexes created in the up method
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_student_status_due"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_student_priority_due"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_project_status_due"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_active_due_date"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_milestones_overdue"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_milestones_blocked"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_completed_analytics"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestone_reminders_processing"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestone_reminders_due_date_lookup"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestone_notes_milestone_created"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestone_templates_usage"`,
    );
    await queryRunner.query(`DROP INDEX IF EXISTS "idx_milestones_search"`);
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_supervisor_reporting"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_risk_analysis"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_velocity_tracking"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_aggregation"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_academic_calendar"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_milestones_list_covering"`,
    );
  }
}
