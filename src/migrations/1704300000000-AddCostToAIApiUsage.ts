import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCostToAIApiUsage1704300000000 implements MigrationInterface {
  name = 'AddCostToAIApiUsage1704300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Add cost column to ai_api_usage table
    await queryRunner.query(`
      ALTER TABLE "ai_api_usage"
      ADD COLUMN "cost" numeric(10, 6) DEFAULT 0 NOT NULL
    `);

    // Create index for cost column for analytics queries
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_api_usage_cost" ON "ai_api_usage" ("cost")
    `);

    // Create composite index for user budget tracking queries
    await queryRunner.query(`
      CREATE INDEX "IDX_ai_api_usage_user_created_cost"
      ON "ai_api_usage" ("user_id", "created_at", "cost")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_ai_api_usage_user_created_cost"`);
    await queryRunner.query(`DROP INDEX "IDX_ai_api_usage_cost"`);
    await queryRunner.query(`ALTER TABLE "ai_api_usage" DROP COLUMN "cost"`);
  }
}
