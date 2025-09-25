import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateRecommendationTables1703300000000
  implements MigrationInterface
{
  name = 'CreateRecommendationTables1703300000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create recommendation_status_enum type
    await queryRunner.query(`
            CREATE TYPE "recommendation_status_enum" AS ENUM('active', 'expired', 'superseded')
        `);

    // Create feedback_type_enum type
    await queryRunner.query(`
            CREATE TYPE "feedback_type_enum" AS ENUM('like', 'dislike', 'bookmark', 'view', 'rating')
        `);

    // Create recommendations table
    await queryRunner.query(`
            CREATE TABLE "recommendations" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "student_id" uuid NOT NULL,
                "project_suggestions" jsonb NOT NULL,
                "reasoning" text NOT NULL,
                "average_similarity_score" decimal(3,2) NOT NULL,
                "profile_snapshot" jsonb NOT NULL,
                "status" "recommendation_status_enum" NOT NULL DEFAULT 'active',
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                "expires_at" TIMESTAMP,
                CONSTRAINT "PK_recommendations" PRIMARY KEY ("id")
            )
        `);

    // Create recommendation_feedback table
    await queryRunner.query(`
            CREATE TABLE "recommendation_feedback" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "recommendation_id" uuid NOT NULL,
                "project_id" uuid NOT NULL,
                "feedback_type" "feedback_type_enum" NOT NULL,
                "rating" decimal(2,1),
                "comment" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_recommendation_feedback" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "recommendations" 
            ADD CONSTRAINT "FK_recommendations_student" 
            FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "recommendation_feedback" 
            ADD CONSTRAINT "FK_recommendation_feedback_recommendation" 
            FOREIGN KEY ("recommendation_id") REFERENCES "recommendations"("id") ON DELETE CASCADE
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_recommendations_student_id" ON "recommendations" ("student_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_recommendations_status" ON "recommendations" ("status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_recommendations_created_at" ON "recommendations" ("created_at")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_recommendations_expires_at" ON "recommendations" ("expires_at")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_recommendation_feedback_recommendation_id" ON "recommendation_feedback" ("recommendation_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_recommendation_feedback_project_id" ON "recommendation_feedback" ("project_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_recommendation_feedback_feedback_type" ON "recommendation_feedback" ("feedback_type")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_recommendation_feedback_created_at" ON "recommendation_feedback" ("created_at")
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_recommendation_feedback_created_at"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_recommendation_feedback_feedback_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_recommendation_feedback_project_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_recommendation_feedback_recommendation_id"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_recommendations_expires_at"`);
    await queryRunner.query(`DROP INDEX "IDX_recommendations_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_recommendations_status"`);
    await queryRunner.query(`DROP INDEX "IDX_recommendations_student_id"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "recommendation_feedback" DROP CONSTRAINT "FK_recommendation_feedback_recommendation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "recommendations" DROP CONSTRAINT "FK_recommendations_student"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "recommendation_feedback"`);
    await queryRunner.query(`DROP TABLE "recommendations"`);

    // Drop enum types
    await queryRunner.query(`DROP TYPE "feedback_type_enum"`);
    await queryRunner.query(`DROP TYPE "recommendation_status_enum"`);
  }
}
