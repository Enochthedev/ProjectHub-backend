import { MigrationInterface, QueryRunner } from 'typeorm';

export class OptimizeProjectSearchIndexes1703200000000
  implements MigrationInterface {
  name = 'OptimizeProjectSearchIndexes1703200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Simple indexes without CONCURRENTLY (causes issues in transactions)
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_projects_spec_diff_year" 
            ON "projects" ("specialization", "difficultyLevel", "year")
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_projects_approved_year" 
            ON "projects" ("approvalStatus", "year") 
            WHERE "approvalStatus" = 'approved'
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_projects_spec_approved" 
            ON "projects" ("specialization", "approvalStatus") 
            WHERE "approvalStatus" = 'approved'
        `);

    // Index for tag-based searches
    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_projects_tags_gin" 
            ON "projects" USING GIN ("tags")
        `);

    await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "idx_projects_tech_stack_gin" 
            ON "projects" USING GIN ("technologyStack")
        `);

    // Update table statistics for better query planning
    await queryRunner.query(`ANALYZE "projects"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop the indexes created in the up method
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_projects_spec_diff_year"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_projects_approved_year"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_projects_spec_approved"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_projects_tags_gin"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "idx_projects_tech_stack_gin"`,
    );
  }
}
