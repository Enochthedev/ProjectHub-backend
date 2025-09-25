import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeProjectSearchIndexes1703200000000
  implements MigrationInterface
{
  name = 'OptimizeProjectSearchIndexes1703200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Composite indexes for common filter combinations
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_spec_diff_year" 
            ON "projects" ("specialization", "difficulty_level", "year")
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_approved_year" 
            ON "projects" ("approval_status", "year") 
            WHERE "approval_status" = 'approved'
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_spec_approved" 
            ON "projects" ("specialization", "approval_status") 
            WHERE "approval_status" = 'approved'
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_diff_approved" 
            ON "projects" ("difficulty_level", "approval_status") 
            WHERE "approval_status" = 'approved'
        `);

    // Partial indexes for better performance on filtered queries
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_pending" 
            ON "projects" ("created_at") 
            WHERE "approval_status" = 'pending'
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_group_approved" 
            ON "projects" ("is_group_project", "approval_status") 
            WHERE "approval_status" = 'approved'
        `);

    // Index for tag-based searches (GIN index for array operations)
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_tags_gin" 
            ON "projects" USING GIN ("tags")
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_tech_stack_gin" 
            ON "projects" USING GIN ("technology_stack")
        `);

    // Index for supervisor-based queries
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_supervisor_status" 
            ON "projects" ("supervisor_id", "approval_status")
        `);

    // Index for analytics queries (project views)
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_project_views_project_date" 
            ON "project_views" ("project_id", "viewed_at")
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_project_views_date_desc" 
            ON "project_views" ("viewed_at" DESC)
        `);

    // Index for bookmark queries
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_project_bookmarks_student_date" 
            ON "project_bookmarks" ("student_id", "created_at" DESC)
        `);

    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_project_bookmarks_project_count" 
            ON "project_bookmarks" ("project_id", "created_at")
        `);

    // Covering index for project list queries (includes commonly selected columns)
    await queryRunner.query(`
            CREATE INDEX CONCURRENTLY IF NOT EXISTS "idx_projects_list_covering" 
            ON "projects" ("approval_status", "year" DESC, "created_at" DESC) 
            INCLUDE ("id", "title", "specialization", "difficulty_level", "supervisor_id")
            WHERE "approval_status" = 'approved'
        `);

    // Update table statistics for better query planning
    await queryRunner.query(`ANALYZE "projects"`);
    await queryRunner.query(`ANALYZE "project_views"`);
    await queryRunner.query(`ANALYZE "project_bookmarks"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop all the indexes created in the up method
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_spec_diff_year"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_approved_year"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_spec_approved"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_diff_approved"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_pending"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_group_approved"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_tags_gin"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_tech_stack_gin"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_supervisor_status"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_project_views_project_date"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_project_views_date_desc"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_project_bookmarks_student_date"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_project_bookmarks_project_count"`,
    );
    await queryRunner.query(
      `DROP INDEX CONCURRENTLY IF EXISTS "idx_projects_list_covering"`,
    );
  }
}
