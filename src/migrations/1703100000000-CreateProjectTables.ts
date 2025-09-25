import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateProjectTables1703100000000 implements MigrationInterface {
  name = 'CreateProjectTables1703100000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create difficulty_level_enum type
    await queryRunner.query(`
            CREATE TYPE "difficulty_level_enum" AS ENUM('beginner', 'intermediate', 'advanced')
        `);

    // Create approval_status_enum type
    await queryRunner.query(`
            CREATE TYPE "approval_status_enum" AS ENUM('pending', 'approved', 'rejected', 'archived')
        `);

    // Create projects table
    await queryRunner.query(`
            CREATE TABLE "projects" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "title" character varying(200) NOT NULL,
                "abstract" text NOT NULL,
                "specialization" character varying(100) NOT NULL,
                "difficultyLevel" "difficulty_level_enum" NOT NULL,
                "year" integer NOT NULL,
                "tags" text array NOT NULL DEFAULT '{}',
                "technologyStack" text array NOT NULL DEFAULT '{}',
                "isGroupProject" boolean NOT NULL DEFAULT false,
                "approvalStatus" "approval_status_enum" NOT NULL DEFAULT 'pending',
                "githubUrl" character varying(500),
                "demoUrl" character varying(500),
                "notes" text,
                "supervisor_id" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                "approvedAt" TIMESTAMP,
                "approvedBy" uuid,
                "searchVector" tsvector,
                CONSTRAINT "PK_projects" PRIMARY KEY ("id")
            )
        `);

    // Create project_bookmarks table
    await queryRunner.query(`
            CREATE TABLE "project_bookmarks" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "student_id" uuid NOT NULL,
                "project_id" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_project_bookmarks" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_project_bookmarks_student_project" UNIQUE ("student_id", "project_id")
            )
        `);

    // Create project_views table
    await queryRunner.query(`
            CREATE TABLE "project_views" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "project_id" uuid NOT NULL,
                "viewerId" uuid,
                "ipAddress" inet NOT NULL,
                "userAgent" text NOT NULL,
                "viewedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_project_views" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "projects" 
            ADD CONSTRAINT "FK_projects_supervisor" 
            FOREIGN KEY ("supervisor_id") REFERENCES "users"("id") ON DELETE RESTRICT
        `);

    await queryRunner.query(`
            ALTER TABLE "projects" 
            ADD CONSTRAINT "FK_projects_approved_by" 
            FOREIGN KEY ("approvedBy") REFERENCES "users"("id") ON DELETE SET NULL
        `);

    await queryRunner.query(`
            ALTER TABLE "project_bookmarks" 
            ADD CONSTRAINT "FK_project_bookmarks_student" 
            FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "project_bookmarks" 
            ADD CONSTRAINT "FK_project_bookmarks_project" 
            FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "project_views" 
            ADD CONSTRAINT "FK_project_views_project" 
            FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "project_views" 
            ADD CONSTRAINT "FK_project_views_viewer" 
            FOREIGN KEY ("viewerId") REFERENCES "users"("id") ON DELETE SET NULL
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_projects_specialization" ON "projects" ("specialization")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_projects_difficulty" ON "projects" ("difficultyLevel")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_projects_year" ON "projects" ("year")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_projects_approval_status" ON "projects" ("approvalStatus")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_projects_supervisor" ON "projects" ("supervisor_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_projects_spec_diff_year" ON "projects" ("specialization", "difficultyLevel", "year")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_projects_approved_year" ON "projects" ("approvalStatus", "year") WHERE "approvalStatus" = 'approved'
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_projects_pending" ON "projects" ("createdAt") WHERE "approvalStatus" = 'pending'
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_project_bookmarks_student" ON "project_bookmarks" ("student_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_project_views_project" ON "project_views" ("project_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_project_views_date" ON "project_views" ("viewedAt")
        `);

    // Create full-text search index
    await queryRunner.query(`
            CREATE INDEX "project_search_idx" ON "projects" USING GIN("searchVector")
        `);

    // Create function to update search vector
    await queryRunner.query(`
            CREATE OR REPLACE FUNCTION update_project_search_vector()
            RETURNS TRIGGER AS $$
            BEGIN
                NEW."searchVector" := 
                    setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
                    setweight(to_tsvector('english', COALESCE(NEW.abstract, '')), 'B') ||
                    setweight(to_tsvector('english', COALESCE(array_to_string(NEW.tags, ' '), '')), 'C') ||
                    setweight(to_tsvector('english', COALESCE(array_to_string(NEW."technologyStack", ' '), '')), 'D');
                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        `);

    // Create trigger to automatically update search vector
    await queryRunner.query(`
            CREATE TRIGGER update_project_search_vector_trigger
                BEFORE INSERT OR UPDATE ON "projects"
                FOR EACH ROW EXECUTE FUNCTION update_project_search_vector();
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop trigger and function
    await queryRunner.query(
      `DROP TRIGGER IF EXISTS update_project_search_vector_trigger ON "projects"`,
    );
    await queryRunner.query(
      `DROP FUNCTION IF EXISTS update_project_search_vector()`,
    );

    // Drop indexes
    await queryRunner.query(`DROP INDEX "project_search_idx"`);
    await queryRunner.query(`DROP INDEX "IDX_project_views_date"`);
    await queryRunner.query(`DROP INDEX "IDX_project_views_project"`);
    await queryRunner.query(`DROP INDEX "IDX_project_bookmarks_student"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_pending"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_approved_year"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_spec_diff_year"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_supervisor"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_approval_status"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_year"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_difficulty"`);
    await queryRunner.query(`DROP INDEX "IDX_projects_specialization"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "project_views" DROP CONSTRAINT "FK_project_views_viewer"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_views" DROP CONSTRAINT "FK_project_views_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_bookmarks" DROP CONSTRAINT "FK_project_bookmarks_project"`,
    );
    await queryRunner.query(
      `ALTER TABLE "project_bookmarks" DROP CONSTRAINT "FK_project_bookmarks_student"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_approved_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_supervisor"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "project_views"`);
    await queryRunner.query(`DROP TABLE "project_bookmarks"`);
    await queryRunner.query(`DROP TABLE "projects"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "approval_status_enum"`);
    await queryRunner.query(`DROP TYPE "difficulty_level_enum"`);
  }
}
