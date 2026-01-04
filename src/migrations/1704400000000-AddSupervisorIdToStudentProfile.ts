import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSupervisorIdToStudentProfile1704400000000 implements MigrationInterface {
    name = 'AddSupervisorIdToStudentProfile1704400000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "student_profiles"
            ADD COLUMN "supervisorId" uuid
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "student_profiles"
            DROP COLUMN "supervisorId"
        `);
    }
}
