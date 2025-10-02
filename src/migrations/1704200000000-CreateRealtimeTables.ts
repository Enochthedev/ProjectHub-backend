import { MigrationInterface, QueryRunner, Table, Index } from 'typeorm';

export class CreateRealtimeTables1704200000000 implements MigrationInterface {
    name = 'CreateRealtimeTables1704200000000';

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Create realtime_notifications table
        await queryRunner.createTable(
            new Table({
                name: 'realtime_notifications',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['milestone_deadline', 'project_update', 'ai_response', 'bookmark_update', 'system_alert'],
                    },
                    {
                        name: 'title',
                        type: 'varchar',
                        length: '255',
                    },
                    {
                        name: 'message',
                        type: 'text',
                    },
                    {
                        name: 'data',
                        type: 'jsonb',
                        isNullable: true,
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'priority',
                        type: 'enum',
                        enum: ['low', 'medium', 'high', 'urgent'],
                        default: "'medium'",
                    },
                    {
                        name: 'action_url',
                        type: 'varchar',
                        isNullable: true,
                    },
                    {
                        name: 'is_read',
                        type: 'boolean',
                        default: false,
                    },
                    {
                        name: 'read_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'expires_at',
                        type: 'timestamp',
                        isNullable: true,
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                    {
                        name: 'updated_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                        onUpdate: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['user_id'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );

        // Create realtime_events table
        await queryRunner.createTable(
            new Table({
                name: 'realtime_events',
                columns: [
                    {
                        name: 'id',
                        type: 'uuid',
                        isPrimary: true,
                        generationStrategy: 'uuid',
                        default: 'gen_random_uuid()',
                    },
                    {
                        name: 'type',
                        type: 'enum',
                        enum: ['project_stats', 'milestone_progress', 'ai_activity', 'user_activity', 'system_health'],
                    },
                    {
                        name: 'data',
                        type: 'jsonb',
                    },
                    {
                        name: 'user_id',
                        type: 'uuid',
                        isNullable: true,
                    },
                    {
                        name: 'role',
                        type: 'enum',
                        enum: ['student', 'supervisor', 'admin'],
                        isNullable: true,
                    },
                    {
                        name: 'timestamp',
                        type: 'timestamp',
                    },
                    {
                        name: 'created_at',
                        type: 'timestamp',
                        default: 'CURRENT_TIMESTAMP',
                    },
                ],
                foreignKeys: [
                    {
                        columnNames: ['user_id'],
                        referencedTableName: 'users',
                        referencedColumnNames: ['id'],
                        onDelete: 'CASCADE',
                    },
                ],
            }),
            true,
        );

        // Create indexes for realtime_notifications
        await queryRunner.query(`CREATE INDEX "IDX_realtime_notifications_user_read" ON "realtime_notifications" ("user_id", "is_read")`);
        await queryRunner.query(`CREATE INDEX "IDX_realtime_notifications_type_created" ON "realtime_notifications" ("type", "created_at")`);
        await queryRunner.query(`CREATE INDEX "IDX_realtime_notifications_expires" ON "realtime_notifications" ("expires_at")`);

        // Create indexes for realtime_events
        await queryRunner.query(`CREATE INDEX "IDX_realtime_events_type_timestamp" ON "realtime_events" ("type", "timestamp")`);
        await queryRunner.query(`CREATE INDEX "IDX_realtime_events_user_timestamp" ON "realtime_events" ("user_id", "timestamp")`);
        await queryRunner.query(`CREATE INDEX "IDX_realtime_events_role_timestamp" ON "realtime_events" ("role", "timestamp")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // Drop indexes
        await queryRunner.query(`DROP INDEX "IDX_realtime_events_role_timestamp"`);
        await queryRunner.query(`DROP INDEX "IDX_realtime_events_user_timestamp"`);
        await queryRunner.query(`DROP INDEX "IDX_realtime_events_type_timestamp"`);
        await queryRunner.query(`DROP INDEX "IDX_realtime_notifications_expires"`);
        await queryRunner.query(`DROP INDEX "IDX_realtime_notifications_type_created"`);
        await queryRunner.query(`DROP INDEX "IDX_realtime_notifications_user_read"`);

        // Drop tables
        await queryRunner.dropTable('realtime_events');
        await queryRunner.dropTable('realtime_notifications');
    }
}