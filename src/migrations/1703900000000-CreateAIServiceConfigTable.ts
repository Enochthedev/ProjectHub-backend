import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAIServiceConfigTable1703900000000
  implements MigrationInterface
{
  name = 'CreateAIServiceConfigTable1703900000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
            CREATE TYPE "ai_service_type_enum" AS ENUM (
                'hugging_face',
                'openai',
                'custom'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "ai_model_type_enum" AS ENUM (
                'embedding',
                'qa',
                'classification',
                'generation'
            )
        `);

    // Create ai_service_configs table
    await queryRunner.query(`
            CREATE TABLE "ai_service_configs" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying(100) NOT NULL,
                "service_type" "ai_service_type_enum" NOT NULL,
                "model_type" "ai_model_type_enum" NOT NULL,
                "model" character varying(200) NOT NULL,
                "api_endpoint" character varying(500),
                "api_key" character varying(500),
                "timeout" integer NOT NULL DEFAULT 15000,
                "rate_limits" jsonb NOT NULL,
                "model_parameters" jsonb NOT NULL,
                "fallback_behavior" jsonb NOT NULL,
                "circuit_breaker" jsonb NOT NULL,
                "description" text,
                "is_active" boolean NOT NULL DEFAULT true,
                "tags" text array NOT NULL DEFAULT '{}',
                "version" integer NOT NULL DEFAULT 0,
                "created_by" uuid NOT NULL,
                "updated_by" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_service_configs" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_ai_service_configs_name" UNIQUE ("name"),
                CONSTRAINT "FK_ai_service_configs_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "FK_ai_service_configs_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
            )
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_ai_service_configs_service_type_model_type" 
            ON "ai_service_configs" ("service_type", "model_type")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_service_configs_is_active_created_at" 
            ON "ai_service_configs" ("is_active", "created_at")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_service_configs_tags" 
            ON "ai_service_configs" USING GIN ("tags")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_service_configs_model" 
            ON "ai_service_configs" ("model")
        `);

    // Insert default configurations
    await queryRunner.query(`
            INSERT INTO "ai_service_configs" (
                "name",
                "service_type",
                "model_type",
                "model",
                "timeout",
                "rate_limits",
                "model_parameters",
                "fallback_behavior",
                "circuit_breaker",
                "description",
                "is_active",
                "tags",
                "version",
                "created_by",
                "updated_by"
            ) VALUES (
                'Default HuggingFace Embedding',
                'hugging_face',
                'embedding',
                'sentence-transformers/all-MiniLM-L6-v2',
                15000,
                '{"requestsPerMinute": 60, "requestsPerHour": 1000, "requestsPerDay": 10000, "monthlyLimit": 100000, "burstLimit": 10}',
                '{"temperature": 0.7, "maxTokens": 512, "confidenceThreshold": 0.3}',
                '{"enabled": true, "maxRetries": 3, "retryDelayMs": 1000, "fallbackMessage": "AI service temporarily unavailable"}',
                '{"failureThreshold": 5, "recoveryTimeout": 30000, "halfOpenMaxCalls": 2, "monitoringPeriod": 60000}',
                'Default configuration for HuggingFace embedding model',
                true,
                '{"default", "embedding", "huggingface"}',
                1,
                (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
                (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
            ) ON CONFLICT (name) DO NOTHING
        `);

    await queryRunner.query(`
            INSERT INTO "ai_service_configs" (
                "name",
                "service_type",
                "model_type",
                "model",
                "timeout",
                "rate_limits",
                "model_parameters",
                "fallback_behavior",
                "circuit_breaker",
                "description",
                "is_active",
                "tags",
                "version",
                "created_by",
                "updated_by"
            ) VALUES (
                'Default HuggingFace QA',
                'hugging_face',
                'qa',
                'distilbert-base-cased-distilled-squad',
                15000,
                '{"requestsPerMinute": 30, "requestsPerHour": 500, "requestsPerDay": 5000, "monthlyLimit": 50000, "burstLimit": 5}',
                '{"temperature": 0.3, "maxTokens": 512, "confidenceThreshold": 0.3}',
                '{"enabled": true, "maxRetries": 3, "retryDelayMs": 1000, "fallbackMessage": "AI service temporarily unavailable"}',
                '{"failureThreshold": 5, "recoveryTimeout": 30000, "halfOpenMaxCalls": 2, "monitoringPeriod": 60000}',
                'Default configuration for HuggingFace Q&A model',
                true,
                '{"default", "qa", "huggingface"}',
                1,
                (SELECT id FROM users WHERE role = 'admin' LIMIT 1),
                (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
            ) ON CONFLICT (name) DO NOTHING
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_service_configs_model"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_service_configs_tags"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_service_configs_is_active_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_service_configs_service_type_model_type"`,
    );

    // Drop table
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_service_configs"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_model_type_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "ai_service_type_enum"`);
  }
}
