import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMessageRatingTable1703700000000
  implements MigrationInterface
{
  name = 'CreateMessageRatingTable1703700000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create message_ratings table
    await queryRunner.query(`
            CREATE TABLE "message_ratings" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "message_id" uuid NOT NULL,
                "user_id" uuid NOT NULL,
                "rating" decimal(2,1) NOT NULL,
                "feedback" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_message_ratings" PRIMARY KEY ("id"),
                CONSTRAINT "UQ_message_ratings_message_user" UNIQUE ("message_id", "user_id")
            )
        `);

    // Add foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "message_ratings" 
            ADD CONSTRAINT "FK_message_ratings_message" 
            FOREIGN KEY ("message_id") REFERENCES "conversation_messages"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    await queryRunner.query(`
            ALTER TABLE "message_ratings" 
            ADD CONSTRAINT "FK_message_ratings_user" 
            FOREIGN KEY ("user_id") REFERENCES "users"("id") 
            ON DELETE CASCADE ON UPDATE NO ACTION
        `);

    // Add rating columns to conversation_messages table
    await queryRunner.query(`
            ALTER TABLE "conversation_messages" 
            ADD COLUMN "average_rating" decimal(3,2) NOT NULL DEFAULT 0.0,
            ADD COLUMN "rating_count" integer NOT NULL DEFAULT 0
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_message_ratings_message" ON "message_ratings" ("message_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_message_ratings_user" ON "message_ratings" ("user_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_message_ratings_rating" ON "message_ratings" ("rating")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_conversation_messages_rating" ON "conversation_messages" ("average_rating")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_conversation_messages_rating_count" ON "conversation_messages" ("rating_count")
        `);

    // Add check constraint for rating values
    await queryRunner.query(`
            ALTER TABLE "message_ratings" 
            ADD CONSTRAINT "CHK_message_ratings_rating_range" 
            CHECK ("rating" >= 1.0 AND "rating" <= 5.0)
        `);

    // Add check constraint for average rating values
    await queryRunner.query(`
            ALTER TABLE "conversation_messages" 
            ADD CONSTRAINT "CHK_conversation_messages_average_rating_range" 
            CHECK ("average_rating" >= 0.0 AND "average_rating" <= 5.0)
        `);

    // Add check constraint for rating count
    await queryRunner.query(`
            ALTER TABLE "conversation_messages" 
            ADD CONSTRAINT "CHK_conversation_messages_rating_count_positive" 
            CHECK ("rating_count" >= 0)
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop check constraints
    await queryRunner.query(`
            ALTER TABLE "conversation_messages" 
            DROP CONSTRAINT "CHK_conversation_messages_rating_count_positive"
        `);

    await queryRunner.query(`
            ALTER TABLE "conversation_messages" 
            DROP CONSTRAINT "CHK_conversation_messages_average_rating_range"
        `);

    await queryRunner.query(`
            ALTER TABLE "message_ratings" 
            DROP CONSTRAINT "CHK_message_ratings_rating_range"
        `);

    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_conversation_messages_rating_count"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_conversation_messages_rating"`);
    await queryRunner.query(`DROP INDEX "IDX_message_ratings_rating"`);
    await queryRunner.query(`DROP INDEX "IDX_message_ratings_user"`);
    await queryRunner.query(`DROP INDEX "IDX_message_ratings_message"`);

    // Remove rating columns from conversation_messages table
    await queryRunner.query(`
            ALTER TABLE "conversation_messages" 
            DROP COLUMN "rating_count",
            DROP COLUMN "average_rating"
        `);

    // Drop foreign key constraints
    await queryRunner.query(`
            ALTER TABLE "message_ratings" 
            DROP CONSTRAINT "FK_message_ratings_user"
        `);

    await queryRunner.query(`
            ALTER TABLE "message_ratings" 
            DROP CONSTRAINT "FK_message_ratings_message"
        `);

    // Drop message_ratings table
    await queryRunner.query(`DROP TABLE "message_ratings"`);
  }
}
