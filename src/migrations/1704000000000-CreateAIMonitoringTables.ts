import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAIMonitoringTables1704000000000
  implements MigrationInterface
{
  name = 'CreateAIMonitoringTables1704000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create enum types
    await queryRunner.query(`
            CREATE TYPE "metric_type_enum" AS ENUM (
                'response_time',
                'success_rate',
                'error_rate',
                'throughput',
                'token_usage',
                'cost'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "alert_severity_enum" AS ENUM (
                'low',
                'medium',
                'high',
                'critical'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "alert_condition_enum" AS ENUM (
                'greater_than',
                'less_than',
                'equals',
                'not_equals',
                'greater_than_or_equal',
                'less_than_or_equal'
            )
        `);

    await queryRunner.query(`
            CREATE TYPE "alert_status_enum" AS ENUM (
                'active',
                'resolved',
                'acknowledged',
                'suppressed'
            )
        `);

    // Create ai_alert_rules table
    await queryRunner.query(`
            CREATE TABLE "ai_alert_rules" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying(100) NOT NULL,
                "service_id" uuid NOT NULL,
                "metric_type" "metric_type_enum" NOT NULL,
                "condition" "alert_condition_enum" NOT NULL,
                "threshold" decimal(10,4) NOT NULL,
                "severity" "alert_severity_enum" NOT NULL,
                "description" text,
                "evaluation_window" integer NOT NULL DEFAULT 5,
                "cooldown_period" integer NOT NULL DEFAULT 15,
                "is_enabled" boolean NOT NULL DEFAULT true,
                "notification_channels" text array NOT NULL DEFAULT '{}',
                "last_triggered" TIMESTAMP,
                "trigger_count" integer NOT NULL DEFAULT 0,
                "metadata" jsonb,
                "created_by" uuid NOT NULL,
                "updated_by" uuid NOT NULL,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_alert_rules" PRIMARY KEY ("id"),
                CONSTRAINT "FK_ai_alert_rules_service_id" FOREIGN KEY ("service_id") REFERENCES "ai_service_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_ai_alert_rules_created_by" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
                CONSTRAINT "FK_ai_alert_rules_updated_by" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
            )
        `);

    // Create ai_alerts table
    await queryRunner.query(`
            CREATE TABLE "ai_alerts" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "rule_id" uuid NOT NULL,
                "service_id" uuid NOT NULL,
                "alert_type" character varying(100) NOT NULL,
                "severity" "alert_severity_enum" NOT NULL,
                "status" "alert_status_enum" NOT NULL DEFAULT 'active',
                "title" character varying(200) NOT NULL,
                "description" text NOT NULL,
                "threshold" decimal(10,4) NOT NULL,
                "current_value" decimal(10,4) NOT NULL,
                "metadata" jsonb,
                "triggered_at" TIMESTAMP NOT NULL,
                "resolved_at" TIMESTAMP,
                "acknowledged_at" TIMESTAMP,
                "acknowledged_by" uuid,
                "resolution_notes" text,
                "occurrence_count" integer NOT NULL DEFAULT 1,
                "last_occurrence" TIMESTAMP,
                "notifications_sent" text array NOT NULL DEFAULT '{}',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_ai_alerts" PRIMARY KEY ("id"),
                CONSTRAINT "FK_ai_alerts_rule_id" FOREIGN KEY ("rule_id") REFERENCES "ai_alert_rules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_ai_alerts_service_id" FOREIGN KEY ("service_id") REFERENCES "ai_service_configs"("id") ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT "FK_ai_alerts_acknowledged_by" FOREIGN KEY ("acknowledged_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE
            )
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_ai_alert_rules_service_id_is_enabled" 
            ON "ai_alert_rules" ("service_id", "is_enabled")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_alert_rules_metric_type_is_enabled" 
            ON "ai_alert_rules" ("metric_type", "is_enabled")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_alert_rules_severity_is_enabled" 
            ON "ai_alert_rules" ("severity", "is_enabled")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_alerts_service_id_status" 
            ON "ai_alerts" ("service_id", "status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_alerts_severity_status" 
            ON "ai_alerts" ("severity", "status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_alerts_triggered_at_status" 
            ON "ai_alerts" ("triggered_at", "status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_alerts_rule_id_status" 
            ON "ai_alerts" ("rule_id", "status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_ai_alerts_status_triggered_at" 
            ON "ai_alerts" ("status", "triggered_at")
        `);

    // Insert default alert rules for existing AI services
    await queryRunner.query(`
            INSERT INTO "ai_alert_rules" (
                "name",
                "service_id",
                "metric_type",
                "condition",
                "threshold",
                "severity",
                "description",
                "evaluation_window",
                "cooldown_period",
                "is_enabled",
                "notification_channels",
                "created_by",
                "updated_by"
            )
            SELECT 
                'High Response Time - ' || asc.name,
                asc.id,
                'response_time',
                'greater_than',
                5000,
                'high',
                'Alert when average response time exceeds 5 seconds',
                5,
                15,
                true,
                '{"email"}',
                COALESCE(asc.created_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
                COALESCE(asc.updated_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
            FROM ai_service_configs asc
            WHERE asc.is_active = true
        `);

    await queryRunner.query(`
            INSERT INTO "ai_alert_rules" (
                "name",
                "service_id",
                "metric_type",
                "condition",
                "threshold",
                "severity",
                "description",
                "evaluation_window",
                "cooldown_period",
                "is_enabled",
                "notification_channels",
                "created_by",
                "updated_by"
            )
            SELECT 
                'Low Success Rate - ' || asc.name,
                asc.id,
                'success_rate',
                'less_than',
                90,
                'critical',
                'Alert when success rate drops below 90%',
                10,
                30,
                true,
                '{"email", "slack"}',
                COALESCE(asc.created_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
                COALESCE(asc.updated_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
            FROM ai_service_configs asc
            WHERE asc.is_active = true
        `);

    await queryRunner.query(`
            INSERT INTO "ai_alert_rules" (
                "name",
                "service_id",
                "metric_type",
                "condition",
                "threshold",
                "severity",
                "description",
                "evaluation_window",
                "cooldown_period",
                "is_enabled",
                "notification_channels",
                "created_by",
                "updated_by"
            )
            SELECT 
                'High Error Rate - ' || asc.name,
                asc.id,
                'error_rate',
                'greater_than',
                10,
                'high',
                'Alert when error rate exceeds 10%',
                5,
                15,
                true,
                '{"email"}',
                COALESCE(asc.created_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1)),
                COALESCE(asc.updated_by, (SELECT id FROM users WHERE role = 'admin' LIMIT 1))
            FROM ai_service_configs asc
            WHERE asc.is_active = true
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_alerts_status_triggered_at"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_alerts_rule_id_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_alerts_triggered_at_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_alerts_severity_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_alerts_service_id_status"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_alert_rules_severity_is_enabled"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_alert_rules_metric_type_is_enabled"`,
    );
    await queryRunner.query(
      `DROP INDEX IF EXISTS "IDX_ai_alert_rules_service_id_is_enabled"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_alerts"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "ai_alert_rules"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_condition_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "alert_severity_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "metric_type_enum"`);
  }
}
