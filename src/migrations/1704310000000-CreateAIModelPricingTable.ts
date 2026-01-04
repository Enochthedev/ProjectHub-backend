import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAIModelPricingTable1704310000000 implements MigrationInterface {
  name = 'CreateAIModelPricingTable1704310000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_model_pricing" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "model_id" character varying(200) NOT NULL,
        "name" character varying(200) NOT NULL,
        "provider" character varying(100) NOT NULL,
        "cost_per_token" numeric(12, 8) NOT NULL,
        "max_tokens" integer NOT NULL,
        "average_latency" integer NOT NULL DEFAULT 2000,
        "quality_score" numeric(3, 2) NOT NULL DEFAULT 0.5,
        "is_available" boolean NOT NULL DEFAULT true,
        "capabilities" text[] NOT NULL DEFAULT '{}',
        "description" text,
        "is_active" boolean NOT NULL DEFAULT true,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_model_pricing" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ai_model_pricing_model_id" UNIQUE ("model_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_model_pricing_model_id_active"
      ON "ai_model_pricing" ("model_id", "is_active")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_ai_model_pricing_model_id_active"`);
    await queryRunner.query(`DROP TABLE "ai_model_pricing"`);
  }
}
