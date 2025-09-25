import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSharedMilestoneTables1703400000000
  implements MigrationInterface
{
  name = 'CreateSharedMilestoneTables1703400000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create shared_milestones table
    await queryRunner.query(`
            CREATE TABLE "shared_milestones" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "title" character varying(200) NOT NULL,
                "description" text NOT NULL,
                "due_date" date NOT NULL,
                "status" "milestone_status_enum" NOT NULL DEFAULT 'not_started',
                "priority" "priority_enum" NOT NULL DEFAULT 'medium',
                "created_by" uuid NOT NULL,
                "project_id" uuid NOT NULL,
                "completed_at" TIMESTAMP,
                "estimated_hours" integer NOT NULL DEFAULT '0',
                "actual_hours" integer NOT NULL DEFAULT '0',
                "blocking_reason" text,
                "requires_all_approval" boolean NOT NULL DEFAULT false,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_shared_milestones" PRIMARY KEY ("id")
            )
        `);

    // Create shared_milestone_assignments table
    await queryRunner.query(`
            CREATE TABLE "shared_milestone_assignments" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "milestone_id" uuid NOT NULL,
                "assignee_id" uuid NOT NULL,
                "task_title" character varying(200) NOT NULL,
                "task_description" text,
                "status" "milestone_status_enum" NOT NULL DEFAULT 'not_started',
                "estimated_hours" integer NOT NULL DEFAULT '0',
                "actual_hours" integer NOT NULL DEFAULT '0',
                "notes" text,
                "completed_at" TIMESTAMP,
                "blocking_reason" text,
                "assigned_by" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_shared_milestone_assignments" PRIMARY KEY ("id")
            )
        `);

    // Create shared_milestone_assignees junction table
    await queryRunner.query(`
            CREATE TABLE "shared_milestone_assignees" (
                "milestone_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                CONSTRAINT "PK_shared_milestone_assignees" PRIMARY KEY ("milestone_id", "user_id")
            )
        `);

    // Add foreign key constraints for shared_milestones
    await queryRunner.query(`
            ALTER TABLE "shared_milestones" 
            ADD CONSTRAINT "FK_shared_milestones_created_by" 
            FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "shared_milestones" 
            ADD CONSTRAINT "FK_shared_milestones_project_id" 
            FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE
        `);

    // Add foreign key constraints for shared_milestone_assignments
    await queryRunner.query(`
            ALTER TABLE "shared_milestone_assignments" 
            ADD CONSTRAINT "FK_shared_milestone_assignments_milestone_id" 
            FOREIGN KEY ("milestone_id") REFERENCES "shared_milestones"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "shared_milestone_assignments" 
            ADD CONSTRAINT "FK_shared_milestone_assignments_assignee_id" 
            FOREIGN KEY ("assignee_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "shared_milestone_assignments" 
            ADD CONSTRAINT "FK_shared_milestone_assignments_assigned_by" 
            FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL
        `);

    // Add foreign key constraints for shared_milestone_assignees junction table
    await queryRunner.query(`
            ALTER TABLE "shared_milestone_assignees" 
            ADD CONSTRAINT "FK_shared_milestone_assignees_milestone_id" 
            FOREIGN KEY ("milestone_id") REFERENCES "shared_milestones"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "shared_milestone_assignees" 
            ADD CONSTRAINT "FK_shared_milestone_assignees_user_id" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestones_project_id" ON "shared_milestones" ("project_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestones_created_by" ON "shared_milestones" ("created_by")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestones_due_date" ON "shared_milestones" ("due_date")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestones_status" ON "shared_milestones" ("status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestone_assignments_milestone_id" ON "shared_milestone_assignments" ("milestone_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestone_assignments_assignee_id" ON "shared_milestone_assignments" ("assignee_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestone_assignments_status" ON "shared_milestone_assignments" ("status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestone_assignees_milestone_id" ON "shared_milestone_assignees" ("milestone_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestone_assignees_user_id" ON "shared_milestone_assignees" ("user_id")
        `);

    // Create composite indexes for common queries
    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestones_project_status" ON "shared_milestones" ("project_id", "status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_shared_milestone_assignments_assignee_status" ON "shared_milestone_assignments" ("assignee_id", "status")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_shared_milestone_assignments_assignee_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_shared_milestones_project_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_shared_milestone_assignees_user_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_shared_milestone_assignees_milestone_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_shared_milestone_assignments_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_shared_milestone_assignments_assignee_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_shared_milestone_assignments_milestone_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_shared_milestones_status"`);
    await queryRunner.query(`DROP INDEX "IDX_shared_milestones_due_date"`);
    await queryRunner.query(`DROP INDEX "IDX_shared_milestones_created_by"`);
    await queryRunner.query(`DROP INDEX "IDX_shared_milestones_project_id"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "shared_milestone_assignees" DROP CONSTRAINT "FK_shared_milestone_assignees_user_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shared_milestone_assignees" DROP CONSTRAINT "FK_shared_milestone_assignees_milestone_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shared_milestone_assignments" DROP CONSTRAINT "FK_shared_milestone_assignments_assigned_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shared_milestone_assignments" DROP CONSTRAINT "FK_shared_milestone_assignments_assignee_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shared_milestone_assignments" DROP CONSTRAINT "FK_shared_milestone_assignments_milestone_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shared_milestones" DROP CONSTRAINT "FK_shared_milestones_project_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "shared_milestones" DROP CONSTRAINT "FK_shared_milestones_created_by"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "shared_milestone_assignees"`);
    await queryRunner.query(`DROP TABLE "shared_milestone_assignments"`);
    await queryRunner.query(`DROP TABLE "shared_milestones"`);
  }
}
