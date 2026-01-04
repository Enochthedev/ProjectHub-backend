import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAIModelPerformanceTable1704320000000 implements MigrationInterface {
  name = 'CreateAIModelPerformanceTable1704320000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "ai_model_performance" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "model_id" character varying(200) NOT NULL,
        "total_requests" integer NOT NULL DEFAULT 0,
        "successful_requests" integer NOT NULL DEFAULT 0,
        "failed_requests" integer NOT NULL DEFAULT 0,
        "average_latency" numeric(10, 2) NOT NULL DEFAULT 0,
        "average_cost" numeric(10, 6) NOT NULL DEFAULT 0,
        "total_cost" numeric(12, 6) NOT NULL DEFAULT 0,
        "total_tokens" bigint NOT NULL DEFAULT 0,
        "last_used" TIMESTAMP,
        "last_success" TIMESTAMP,
        "last_failure" TIMESTAMP,
        "created_at" TIMESTAMP NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_model_performance" PRIMARY KEY ("id"),
        CONSTRAINT "UQ_ai_model_performance_model_id" UNIQUE ("model_id")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_ai_model_performance_model_id_updated"
      ON "ai_model_performance" ("model_id", "updated_at")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_ai_model_performance_model_id_updated"`);
    await queryRunner.query(`DROP TABLE "ai_model_performance"`);
  }
}
