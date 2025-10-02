import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateSupervisorManagementTables1704100000000 implements MigrationInterface {
    name = 'CreateSupervisorManagementTables1704100000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create supervisor_analytics table
        await queryRunner.createTable(
            new Table({
                name: 'supervisor_analytics',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'supervisorId',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'metricType',
                        type: 'varchar',
                        length: '50',
                        isNullable: false,
                    },
                    {
                        name: 'value',
                        type: 'decimal',
                        precision: 10,
                        scale: 2,
                        isNullable: false,
                    },
                    {
                        name: 'periodStart',
                        type: 'date',
                        isNullable: false,
                    },
                    {
                        name: 'periodEnd',
                        type: 'date',
                        isNullable: false,
                    },
                    {
                        name: 'metadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['supervisorId'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );

        // Create index for supervisor_analytics
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_supervisor_analytics_supervisor_metric_period" 
            ON "supervisor_analytics" ("supervisorId", "metricType", "periodStart")
        `);

        // Create supervisor_availability table
        await queryRunner.createTable(
            new Table({
                name: 'supervisor_availability',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'supervisorId',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['office_hours', 'meeting_slots', 'unavailable'],
                        default: "'office_hours'",
                    },
                    {
                        name: 'dayOfWeek',
                        type: 'int',
                        isNullable: false,
                    },
                    {
                        name: 'startTime',
                        type: 'time',
                        isNullable: false,
                    },
                    {
                        name: 'endTime',
                        type: 'time',
                        isNullable: false,
                    },
                    {
                        name: 'location',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'notes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'maxCapacity',
                        type: 'int',
                        default: 1,
                    },
                    {
                        name: 'isActive',
                        type: 'boolean',
                        default: true,
                    },
                    {
                        name: 'effectiveFrom',
                        type: 'date',
                        isNullable: true,
                    },
                    {
                        name: 'effectiveUntil',
                        type: 'date',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['supervisorId'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );

        // Create index for supervisor_availability
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_supervisor_availability_supervisor_day_time" 
            ON "supervisor_availability" ("supervisorId", "dayOfWeek", "startTime")
        `);

        // Create ai_interaction_reviews table
        await queryRunner.createTable(
            new Table({
                name: 'ai_interaction_reviews',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'conversationId',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'supervisorId',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'studentId',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['pending', 'approved', 'escalated', 'flagged', 'resolved'],
                        default: "'pending'",
                    },
                    {
                        name: 'categories',
                        type: 'enum',
                        enum: ['accuracy', 'appropriateness', 'completeness', 'safety', 'policy_violation'],
                        isArray: true,
                        default: 'ARRAY[]::text[]',
                    },
                    {
                        name: 'confidenceScore',
                        type: 'decimal',
                        precision: 3,
                        scale: 2,
                        isNullable: true,
                    },
                    {
                        name: 'reviewNotes',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'supervisorFeedback',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'aiResponseMetadata',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'requiresFollowUp',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'reviewedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'resolvedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['conversationId'],
                        referencedTableName: 'conversations',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                    {
                        columnNames: ['supervisorId'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                    {
                        columnNames: ['studentId'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );

        // Create indexes for ai_interaction_reviews
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_ai_interaction_reviews_supervisor_status_created" 
            ON "ai_interaction_reviews" ("supervisorId", "status", "createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_ai_interaction_reviews_conversation_status" 
            ON "ai_interaction_reviews" ("conversationId", "status")
        `);

        // Create supervisor_reports table
        await queryRunner.createTable(
            new Table({
                name: 'supervisor_reports',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'uuid_generate_v4()',
                    },
                    {
                        name: 'supervisorId',
                        type: 'uuid',
                        isNullable: false,
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['student_progress', 'milestone_summary', 'ai_interaction_summary', 'performance_analytics', 'custom'],
                        default: "'student_progress'",
                    },
                    {
                        name: 'format',
                        type: 'enum',
                        enum: ['pdf', 'csv', 'json'],
                        default: "'pdf'",
                    },
                    {
                        name: 'status',
                        type: 'enum',
                        enum: ['generating', 'completed', 'failed', 'expired'],
                        default: "'generating'",
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '255',
                        isNullable: false,
                    },
                    {
                        name: 'description',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'filters',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'parameters',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'filename',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'filePath',
                        type: 'varchar',
                        length: '255',
                        isNullable: true,
                    },
                    {
                        name: 'mimeType',
                        type: 'varchar',
                        length: '100',
                        isNullable: true,
                    },
                    {
                        name: 'fileSize',
                        type: 'bigint',
                        isNullable: true,
                    },
                    {
                        name: 'generatedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'expiresAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'downloadCount',
                        type: 'int',
                        default: 0,
                    },
                    {
                        name: 'lastDownloadedAt',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'errorMessage',
                        type: 'text',
                        isNullable: true,
                    },
                    {
                        name: 'createdAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updatedAt',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['supervisorId'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );

        // Create indexes for supervisor_reports
        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_supervisor_reports_supervisor_type_created" 
            ON "supervisor_reports" ("supervisorId", "type", "createdAt")
        `);

        await queryRunner.query(`
            CREATE INDEX IF NOT EXISTS "IDX_supervisor_reports_status_created" 
            ON "supervisor_reports" ("status", "createdAt")
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes first
        await queryRunner.query('DROP INDEX IF EXISTS "IDX_supervisor_reports_status_created"');
        await queryRunner.query('DROP INDEX IF EXISTS "IDX_supervisor_reports_supervisor_type_created"');
        await queryRunner.query('DROP INDEX IF EXISTS "IDX_ai_interaction_reviews_conversation_status"');
        await queryRunner.query('DROP INDEX IF EXISTS "IDX_ai_interaction_reviews_supervisor_status_created"');
        await queryRunner.query('DROP INDEX IF EXISTS "IDX_supervisor_availability_supervisor_day_time"');
        await queryRunner.query('DROP INDEX IF EXISTS "IDX_supervisor_analytics_supervisor_metric_period"');

        // Drop tables
        await queryRunner.dropTable('supervisor_reports');
        await queryRunner.dropTable('ai_interaction_reviews');
        await queryRunner.dropTable('supervisor_availability');
        await queryRunner.dropTable('supervisor_analytics');
    }
}