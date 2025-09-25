import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateMilestoneCollaborationTables1703500000000
  implements MigrationInterface
{
  name = 'CreateMilestoneCollaborationTables1703500000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create discussion_type_enum
    await queryRunner.query(`
            CREATE TYPE "discussion_type_enum" AS ENUM(
                'general', 'issue', 'conflict', 'suggestion', 'question'
            )
        `);

    // Create discussion_status_enum
    await queryRunner.query(`
            CREATE TYPE "discussion_status_enum" AS ENUM(
                'open', 'resolved', 'closed'
            )
        `);

    // Create notification_type_enum
    await queryRunner.query(`
            CREATE TYPE "notification_type_enum" AS ENUM(
                'milestone_created', 'milestone_updated', 'milestone_status_changed',
                'assignment_created', 'assignment_updated', 'assignment_status_changed',
                'discussion_created', 'discussion_reply', 'conflict_reported',
                'conflict_resolved', 'deadline_approaching', 'milestone_overdue'
            )
        `);

    // Create notification_priority_enum
    await queryRunner.query(`
            CREATE TYPE "notification_priority_enum" AS ENUM(
                'low', 'medium', 'high', 'urgent'
            )
        `);

    // Create milestone_discussions table
    await queryRunner.query(`
            CREATE TABLE "milestone_discussions" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "milestone_id" uuid NOT NULL,
                "title" character varying(200) NOT NULL,
                "content" text NOT NULL,
                "type" "discussion_type_enum" NOT NULL DEFAULT 'general',
                "status" "discussion_status_enum" NOT NULL DEFAULT 'open',
                "author_id" uuid NOT NULL,
                "is_pinned" boolean NOT NULL DEFAULT false,
                "is_urgent" boolean NOT NULL DEFAULT false,
                "resolved_by" uuid,
                "resolved_at" TIMESTAMP,
                "resolution_notes" text,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_milestone_discussions" PRIMARY KEY ("id")
            )
        `);

    // Create milestone_discussion_replies table
    await queryRunner.query(`
            CREATE TABLE "milestone_discussion_replies" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "discussion_id" uuid NOT NULL,
                "content" text NOT NULL,
                "author_id" uuid NOT NULL,
                "parent_reply_id" uuid,
                "is_edited" boolean NOT NULL DEFAULT false,
                "edited_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                "updated_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_milestone_discussion_replies" PRIMARY KEY ("id")
            )
        `);

    // Create milestone_team_notifications table
    await queryRunner.query(`
            CREATE TABLE "milestone_team_notifications" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "recipient_id" uuid NOT NULL,
                "milestone_id" uuid,
                "type" "notification_type_enum" NOT NULL,
                "priority" "notification_priority_enum" NOT NULL DEFAULT 'medium',
                "title" character varying(200) NOT NULL,
                "message" text NOT NULL,
                "metadata" jsonb,
                "triggered_by" uuid,
                "is_read" boolean NOT NULL DEFAULT false,
                "read_at" TIMESTAMP,
                "is_email_sent" boolean NOT NULL DEFAULT false,
                "email_sent_at" TIMESTAMP,
                "created_at" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_milestone_team_notifications" PRIMARY KEY ("id")
            )
        `);

    // Add foreign key constraints for milestone_discussions
    await queryRunner.query(`
            ALTER TABLE "milestone_discussions" 
            ADD CONSTRAINT "FK_milestone_discussions_milestone_id" 
            FOREIGN KEY ("milestone_id") REFERENCES "shared_milestones"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "milestone_discussions" 
            ADD CONSTRAINT "FK_milestone_discussions_author_id" 
            FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "milestone_discussions" 
            ADD CONSTRAINT "FK_milestone_discussions_resolved_by" 
            FOREIGN KEY ("resolved_by") REFERENCES "users"("id") ON DELETE SET NULL
        `);

    // Add foreign key constraints for milestone_discussion_replies
    await queryRunner.query(`
            ALTER TABLE "milestone_discussion_replies" 
            ADD CONSTRAINT "FK_milestone_discussion_replies_discussion_id" 
            FOREIGN KEY ("discussion_id") REFERENCES "milestone_discussions"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "milestone_discussion_replies" 
            ADD CONSTRAINT "FK_milestone_discussion_replies_author_id" 
            FOREIGN KEY ("author_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "milestone_discussion_replies" 
            ADD CONSTRAINT "FK_milestone_discussion_replies_parent_reply_id" 
            FOREIGN KEY ("parent_reply_id") REFERENCES "milestone_discussion_replies"("id") ON DELETE CASCADE
        `);

    // Add foreign key constraints for milestone_team_notifications
    await queryRunner.query(`
            ALTER TABLE "milestone_team_notifications" 
            ADD CONSTRAINT "FK_milestone_team_notifications_recipient_id" 
            FOREIGN KEY ("recipient_id") REFERENCES "users"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "milestone_team_notifications" 
            ADD CONSTRAINT "FK_milestone_team_notifications_milestone_id" 
            FOREIGN KEY ("milestone_id") REFERENCES "shared_milestones"("id") ON DELETE CASCADE
        `);

    await queryRunner.query(`
            ALTER TABLE "milestone_team_notifications" 
            ADD CONSTRAINT "FK_milestone_team_notifications_triggered_by" 
            FOREIGN KEY ("triggered_by") REFERENCES "users"("id") ON DELETE SET NULL
        `);

    // Create indexes for performance
    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_discussions_milestone_id" ON "milestone_discussions" ("milestone_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_discussions_author_id" ON "milestone_discussions" ("author_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_discussions_status" ON "milestone_discussions" ("status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_discussions_type" ON "milestone_discussions" ("type")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_discussions_pinned_urgent" ON "milestone_discussions" ("is_pinned", "is_urgent")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_discussion_replies_discussion_id" ON "milestone_discussion_replies" ("discussion_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_discussion_replies_author_id" ON "milestone_discussion_replies" ("author_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_discussion_replies_parent_reply_id" ON "milestone_discussion_replies" ("parent_reply_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_team_notifications_recipient_id" ON "milestone_team_notifications" ("recipient_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_team_notifications_milestone_id" ON "milestone_team_notifications" ("milestone_id")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_team_notifications_type" ON "milestone_team_notifications" ("type")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_team_notifications_priority" ON "milestone_team_notifications" ("priority")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_team_notifications_is_read" ON "milestone_team_notifications" ("is_read")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_team_notifications_is_email_sent" ON "milestone_team_notifications" ("is_email_sent")
        `);

    // Create composite indexes for common queries
    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_discussions_milestone_status" ON "milestone_discussions" ("milestone_id", "status")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_team_notifications_recipient_read" ON "milestone_team_notifications" ("recipient_id", "is_read")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_milestone_team_notifications_email_pending" ON "milestone_team_notifications" ("is_email_sent") WHERE "is_email_sent" = false
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_team_notifications_email_pending"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_team_notifications_recipient_read"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_discussions_milestone_status"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_team_notifications_is_email_sent"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_team_notifications_is_read"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_team_notifications_priority"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_team_notifications_type"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_team_notifications_milestone_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_team_notifications_recipient_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_discussion_replies_parent_reply_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_discussion_replies_author_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_discussion_replies_discussion_id"`,
    );
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_discussions_pinned_urgent"`,
    );
    await queryRunner.query(`DROP INDEX "IDX_milestone_discussions_type"`);
    await queryRunner.query(`DROP INDEX "IDX_milestone_discussions_status"`);
    await queryRunner.query(`DROP INDEX "IDX_milestone_discussions_author_id"`);
    await queryRunner.query(
      `DROP INDEX "IDX_milestone_discussions_milestone_id"`,
    );

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "milestone_team_notifications" DROP CONSTRAINT "FK_milestone_team_notifications_triggered_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "milestone_team_notifications" DROP CONSTRAINT "FK_milestone_team_notifications_milestone_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "milestone_team_notifications" DROP CONSTRAINT "FK_milestone_team_notifications_recipient_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "milestone_discussion_replies" DROP CONSTRAINT "FK_milestone_discussion_replies_parent_reply_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "milestone_discussion_replies" DROP CONSTRAINT "FK_milestone_discussion_replies_author_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "milestone_discussion_replies" DROP CONSTRAINT "FK_milestone_discussion_replies_discussion_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "milestone_discussions" DROP CONSTRAINT "FK_milestone_discussions_resolved_by"`,
    );
    await queryRunner.query(
      `ALTER TABLE "milestone_discussions" DROP CONSTRAINT "FK_milestone_discussions_author_id"`,
    );
    await queryRunner.query(
      `ALTER TABLE "milestone_discussions" DROP CONSTRAINT "FK_milestone_discussions_milestone_id"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "milestone_team_notifications"`);
    await queryRunner.query(`DROP TABLE "milestone_discussion_replies"`);
    await queryRunner.query(`DROP TABLE "milestone_discussions"`);

    // Drop enums
    await queryRunner.query(`DROP TYPE "notification_priority_enum"`);
    await queryRunner.query(`DROP TYPE "notification_type_enum"`);
    await queryRunner.query(`DROP TYPE "discussion_status_enum"`);
    await queryRunner.query(`DROP TYPE "discussion_type_enum"`);
  }
}
