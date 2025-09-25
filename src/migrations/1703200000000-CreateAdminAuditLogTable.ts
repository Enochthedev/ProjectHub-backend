import {
  MigrationInterface,
  QueryRunner,
  Table,
  Index,
  ForeignKey,
} from 'typeorm';

export class CreateAdminAuditLogTable1703200000000
  implements MigrationInterface
{
  name = 'CreateAdminAuditLogTable1703200000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create admin_audit_logs table
    await queryRunner.createTable(
      new Table({
        name: 'admin_audit_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'gen_random_uuid()',
          },
          {
            name: 'adminId',
            type: 'uuid',
            isNullable: false,
          },
          {
            name: 'action',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'resourceType',
            type: 'varchar',
            length: '100',
            isNullable: false,
          },
          {
            name: 'resourceId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'description',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'beforeState',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'afterState',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'metadata',
            type: 'jsonb',
            isNullable: true,
          },
          {
            name: 'ipAddress',
            type: 'inet',
            isNullable: true,
          },
          {
            name: 'userAgent',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'sessionId',
            type: 'varchar',
            length: '255',
            isNullable: true,
          },
          {
            name: 'riskLevel',
            type: 'enum',
            enum: ['low', 'medium', 'high', 'critical'],
            default: "'medium'",
            isNullable: false,
          },
          {
            name: 'success',
            type: 'boolean',
            default: true,
            isNullable: false,
          },
          {
            name: 'errorMessage',
            type: 'text',
            isNullable: true,
          },
          {
            name: 'duration',
            type: 'integer',
            isNullable: true,
          },
          {
            name: 'createdAt',
            type: 'timestamp',
            default: 'CURRENT_TIMESTAMP',
            isNullable: false,
          },
        ],
      }),
      true,
    );

    // Create indexes for better query performance
    await queryRunner.query(`
            CREATE INDEX "IDX_admin_audit_logs_admin_action" ON "admin_audit_logs" ("adminId", "action")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_admin_audit_logs_created_at" ON "admin_audit_logs" ("createdAt")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_admin_audit_logs_risk_level" ON "admin_audit_logs" ("riskLevel")
        `);

    await queryRunner.query(`
            CREATE INDEX "IDX_admin_audit_logs_resource" ON "admin_audit_logs" ("resourceType", "resourceId")
        `);

    // Create foreign key constraint to users table
    await queryRunner.query(`
            ALTER TABLE "admin_audit_logs" 
            ADD CONSTRAINT "FK_admin_audit_logs_admin" 
            FOREIGN KEY ("adminId") REFERENCES "users"("id") ON DELETE CASCADE
        `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop foreign key constraint
    await queryRunner.query(`
            ALTER TABLE "admin_audit_logs" DROP CONSTRAINT "FK_admin_audit_logs_admin"
        `);

    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_admin_audit_logs_resource"`);
    await queryRunner.query(`DROP INDEX "IDX_admin_audit_logs_risk_level"`);
    await queryRunner.query(`DROP INDEX "IDX_admin_audit_logs_created_at"`);
    await queryRunner.query(`DROP INDEX "IDX_admin_audit_logs_admin_action"`);

    // Drop table
    await queryRunner.dropTable('admin_audit_logs');
  }
}
