import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthTables1703000000000 implements MigrationInterface {
  name = 'CreateAuthTables1703000000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Create user_role_enum type
    await queryRunner.query(`
      CREATE TYPE "user_role_enum" AS ENUM('student', 'supervisor', 'admin')
    `);

    // Create users table
    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "email" character varying(255) NOT NULL,
        "password" character varying(255) NOT NULL,
        "role" "user_role_enum" NOT NULL,
        "isEmailVerified" boolean NOT NULL DEFAULT false,
        "isActive" boolean NOT NULL DEFAULT true,
        "emailVerificationToken" character varying(255),
        "passwordResetToken" character varying(255),
        "passwordResetExpires" TIMESTAMP,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        "updatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE ("email"),
        CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY ("id")
      )
    `);

    // Create student_profiles table
    await queryRunner.query(`
      CREATE TABLE "student_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "skills" jsonb NOT NULL DEFAULT '[]',
        "interests" jsonb NOT NULL DEFAULT '[]',
        "preferredSpecializations" text array NOT NULL DEFAULT '{}',
        "currentYear" integer,
        "gpa" numeric(3,2),
        "profileUpdatedAt" TIMESTAMP NOT NULL DEFAULT now(),
        "userId" uuid,
        CONSTRAINT "REL_student_profiles_user" UNIQUE ("userId"),
        CONSTRAINT "PK_student_profiles" PRIMARY KEY ("id")
      )
    `);

    // Create supervisor_profiles table
    await queryRunner.query(`
      CREATE TABLE "supervisor_profiles" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "name" character varying(255) NOT NULL,
        "specializations" text array NOT NULL,
        "maxStudents" integer NOT NULL DEFAULT 5,
        "isAvailable" boolean NOT NULL DEFAULT true,
        "officeLocation" character varying(255),
        "phoneNumber" character varying(20),
        "userId" uuid,
        CONSTRAINT "REL_supervisor_profiles_user" UNIQUE ("userId"),
        CONSTRAINT "PK_supervisor_profiles" PRIMARY KEY ("id")
      )
    `);

    // Create refresh_tokens table
    await queryRunner.query(`
      CREATE TABLE "refresh_tokens" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid NOT NULL,
        "tokenHash" character varying(255) NOT NULL,
        "expiresAt" TIMESTAMP NOT NULL,
        "isRevoked" boolean NOT NULL DEFAULT false,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_refresh_tokens" PRIMARY KEY ("id")
      )
    `);

    // Create audit_logs table
    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid NOT NULL DEFAULT gen_random_uuid(),
        "userId" uuid,
        "action" character varying(100) NOT NULL,
        "resource" character varying(100),
        "ipAddress" inet,
        "userAgent" text,
        "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
        CONSTRAINT "PK_audit_logs" PRIMARY KEY ("id")
      )
    `);

    // Add foreign key constraints
    await queryRunner.query(`
      ALTER TABLE "student_profiles" 
      ADD CONSTRAINT "FK_student_profiles_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "supervisor_profiles" 
      ADD CONSTRAINT "FK_supervisor_profiles_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "refresh_tokens" 
      ADD CONSTRAINT "FK_refresh_tokens_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`
      ALTER TABLE "audit_logs" 
      ADD CONSTRAINT "FK_audit_logs_user" 
      FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL
    `);

    // Create indexes for performance
    await queryRunner.query(`
      CREATE INDEX "IDX_refresh_tokens_userId_isRevoked" 
      ON "refresh_tokens" ("userId", "isRevoked")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_userId_action" 
      ON "audit_logs" ("userId", "action")
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_audit_logs_createdAt" 
      ON "audit_logs" ("createdAt")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Drop indexes
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_createdAt"`);
    await queryRunner.query(`DROP INDEX "IDX_audit_logs_userId_action"`);
    await queryRunner.query(`DROP INDEX "IDX_refresh_tokens_userId_isRevoked"`);

    // Drop foreign key constraints
    await queryRunner.query(
      `ALTER TABLE "audit_logs" DROP CONSTRAINT "FK_audit_logs_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_refresh_tokens_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "supervisor_profiles" DROP CONSTRAINT "FK_supervisor_profiles_user"`,
    );
    await queryRunner.query(
      `ALTER TABLE "student_profiles" DROP CONSTRAINT "FK_student_profiles_user"`,
    );

    // Drop tables
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "refresh_tokens"`);
    await queryRunner.query(`DROP TABLE "supervisor_profiles"`);
    await queryRunner.query(`DROP TABLE "student_profiles"`);
    await queryRunner.query(`DROP TABLE "users"`);

    // Drop enum type
    await queryRunner.query(`DROP TYPE "user_role_enum"`);
  }
}
