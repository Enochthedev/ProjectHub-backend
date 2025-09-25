import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMilestoneTemplateVersionTable1703650000000 implements MigrationInterface {
    name = 'CreateMilestoneTemplateVersionTable1703650000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create milestone_template_versions table
        await queryRunner.query(`
      CREATE TABLE "milestone_template_versions" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "version" integer NOT NULL,
        "name" character varying(200) NOT NULL,
        "description" text NOT NULL,
        "specialization" character varying(100) NOT NULL,
        "project_type" character varying(50) NOT NULL,
        "milestone_items" jsonb NOT NULL,
        "configuration" jsonb,
        "estimated_duration_weeks" integer NOT NULL,
        "tags" text array NOT NULL DEFAULT '{}',
        "target_audience" text array,
        "builder_metadata" jsonb,
        "change_description" character varying(500) NOT NULL,
        "change_details" jsonb,
        "changed_by" uuid NOT NULL,
        "is_active" boolean NOT NULL DEFAULT false,
        "is_draft" boolean NOT NULL DEFAULT false,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_milestone_template_versions" PRIMARY KEY ("id")
      )
    `);

        // Create unique index on template_id and version
        await queryRunner.query(`
      CREATE UNIQUE INDEX "IDX_template_version_unique" 
      ON "milestone_template_versions" ("template_id", "version")
    `);

        // Create index on template_id and is_active
        await queryRunner.query(`
      CREATE INDEX "IDX_template_version_active" 
      ON "milestone_template_versions" ("template_id", "is_active")
    `);

        // Create index on template_id and created_at for version ordering
        await queryRunner.query(`
      CREATE INDEX "IDX_template_version_created" 
      ON "milestone_template_versions" ("template_id", "created_at")
    `);

        // Add foreign key constraint to milestone_templates
        await queryRunner.query(`
      ALTER TABLE "milestone_template_versions" 
      ADD CONSTRAINT "FK_template_version_template" 
      FOREIGN KEY ("template_id") REFERENCES "milestone_templates"("id") 
      ON DELETE CASCADE
    `);

        // Add foreign key constraint to users
        await queryRunner.query(`
      ALTER TABLE "milestone_template_versions" 
      ADD CONSTRAINT "FK_template_version_changed_by" 
      FOREIGN KEY ("changed_by") REFERENCES "users"("id") 
      ON DELETE RESTRICT
    `);

        // Add check constraint for version number
        await queryRunner.query(`
      ALTER TABLE "milestone_template_versions" 
      ADD CONSTRAINT "CHK_template_version_positive" 
      CHECK ("version" > 0)
    `);

        // Add check constraint for estimated duration
        await queryRunner.query(`
      ALTER TABLE "milestone_template_versions" 
      ADD CONSTRAINT "CHK_template_version_duration" 
      CHECK ("estimated_duration_weeks" > 0 AND "estimated_duration_weeks" <= 104)
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop foreign key constraints
        await queryRunner.query(`
      ALTER TABLE "milestone_template_versions" 
      DROP CONSTRAINT "FK_template_version_changed_by"
    `);

        await queryRunner.query(`
      ALTER TABLE "milestone_template_versions" 
      DROP CONSTRAINT "FK_template_version_template"
    `);

        // Drop check constraints
        await queryRunner.query(`
      ALTER TABLE "milestone_template_versions" 
      DROP CONSTRAINT "CHK_template_version_duration"
    `);

        await queryRunner.query(`
      ALTER TABLE "milestone_template_versions" 
      DROP CONSTRAINT "CHK_template_version_positive"
    `);

        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_template_version_created"`);
        await queryRunner.query(`DROP INDEX "IDX_template_version_active"`);
        await queryRunner.query(`DROP INDEX "IDX_template_version_unique"`);

        // Drop table
        await queryRunner.query(`DROP TABLE "milestone_template_versions"`);
    }
}
