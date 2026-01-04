import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateBookmarkCategoriesAndModifyBookmarks1704600000000 implements MigrationInterface {
    name = 'CreateBookmarkCategoriesAndModifyBookmarks1704600000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create bookmark_categories
        await queryRunner.query(`
            CREATE TABLE "bookmark_categories" (
                "id" uuid NOT NULL DEFAULT gen_random_uuid(),
                "name" character varying(50) NOT NULL,
                "description" character varying(200),
                "color" character varying(7),
                "student_id" uuid NOT NULL,
                "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
                "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
                CONSTRAINT "PK_bookmark_categories" PRIMARY KEY ("id"),
                CONSTRAINT "FK_bookmark_categories_student" FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE CASCADE
            )
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_bookmark_categories_student" ON "bookmark_categories" ("student_id")
        `);

        // Add category_id to project_bookmarks
        await queryRunner.query(`
            ALTER TABLE "project_bookmarks"
            ADD COLUMN "category_id" uuid
        `);

        await queryRunner.query(`
            ALTER TABLE "project_bookmarks"
            ADD CONSTRAINT "FK_project_bookmarks_category"
            FOREIGN KEY ("category_id") REFERENCES "bookmark_categories"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_project_bookmarks_category" ON "project_bookmarks" ("category_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_project_bookmarks_category"`);
        await queryRunner.query(`ALTER TABLE "project_bookmarks" DROP CONSTRAINT "FK_project_bookmarks_category"`);
        await queryRunner.query(`ALTER TABLE "project_bookmarks" DROP COLUMN "category_id"`);

        await queryRunner.query(`DROP TABLE "bookmark_categories"`);
    }
}
