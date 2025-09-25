import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAIApiUsageTable1703200000000 implements MigrationInterface {
  name = 'CreateAIApiUsageTable1703200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create ai_api_usage table
    await queryRunner.query(`
            CREATE TABLE "ai_api_usage" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "endpoint" character varying(100) NOT NULL,
                "model" character varying(100) NOT NULL,
                "tokens_used" integer NOT NULL,
                "response_time_ms" integer NOT NULL,
                "success" boolean NOT NULL DEFAULT true,
                "error_message" text,
                "user_id" uuid,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_api_usage" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraint to users table
    await queryRunner.query(`
            ALTER TABLE "ai_api_usage" 
            ADD CONSTRAINT "FK_ai_api_usage_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL
        `);

    // Create indexes for better query performance
    await queryRunner.query(`
            CREATE INDEX "IDX_ai_api_usage_user_id" ON "ai_api_usage" ("user_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_api_usage_created_at" ON "ai_api_usage" ("created_at")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_api_usage_endpoint" ON "ai_api_usage" ("endpoint")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_api_usage_success" ON "ai_api_usage" ("success")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_ai_api_usage_success"`);
    await queryRunner.query(`DROP INDEX "IDX_ai_api_usage_endpoint"`);
    await queryRunner.query(`DROP INDEX "IDX_ai_api_usage_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_ai_api_usage_user_id"`);

    // Drop foreign key constraint
    await queryRunner.query(
      `ALTER TABLE "ai_api_usage" DROP CONSTRAINT "FK_ai_api_usage_user"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE "ai_api_usage"`);
  }
}
