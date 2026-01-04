import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddStudentIdToProjects1704500000000 implements MigrationInterface {
    name = 'AddStudentIdToProjects1704500000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "projects"
            ADD COLUMN "student_id" uuid
        `);

        await queryRunner.query(`
            ALTER TABLE "projects"
            ADD CONSTRAINT "FK_projects_student"
            FOREIGN KEY ("student_id") REFERENCES "users"("id") ON DELETE SET NULL
        `);

        await queryRunner.query(`
            CREATE INDEX "IDX_projects_student" ON "projects" ("student_id")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "IDX_projects_student"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP CONSTRAINT "FK_projects_student"`);
        await queryRunner.query(`ALTER TABLE "projects" DROP COLUMN "student_id"`);
    }
}
